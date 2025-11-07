import React, { useState, useEffect, useMemo } from "react";
import "./ExecutionTaskAssignPanel.css";
import { Row, Col, Button, Tabs, Drawer, Form, Input, Select, Upload, DatePicker, Avatar, Badge, Tag } from "antd";
import { BiTask } from "react-icons/bi";
import { IoClose } from "react-icons/io5";
import { BsUpload, BsClock, BsSearch, BsFilter, BsCalendarDate, BsCheckCircle } from "react-icons/bs";
import { FiUser } from "react-icons/fi";
import { HiOutlineClock } from "react-icons/hi";
import { useSelector } from "react-redux";
import { selectTheme } from "../../../store/slices/themeSlice";
import { selectUserId, selectUser } from "../../../store/slices/authSlice";
import { useAddTaskAssignMutation, useGetAllUsersQuery, useGetSlotTemplatesQuery, useGetUserSlotsAvailabilityQuery } from "../../../store/api";
import { useNotification } from "../../../contexts/NotificationContext";
import { emitTaskAdded, onTaskAdded, offTaskAdded, onSlotAvailabilityChanged, offSlotAvailabilityChanged, joinSlotRoom, leaveSlotRoom } from "../../../utils/socket";
import AllTaskEntries from "./AllTaskEntries/AllTaskEntries";
import { uploadToCloudinary } from "../../../utils/cloudinary";
import dayjs from "dayjs";

const { TextArea } = Input;

// TabPane is deprecated, using items prop instead

const ExecutionTaskAssignPanel = () => {
    const [activeTab, setActiveTab] = useState('1');
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState([]);
    const [selectedReceiverUserId, setSelectedReceiverUserId] = useState(null);
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [selectedUserSlot, setSelectedUserSlot] = useState(null);
    const [selectedSlotDate, setSelectedSlotDate] = useState(null);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDateRange, setSelectedDateRange] = useState(null);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [uploadedImageUrls, setUploadedImageUrls] = useState([]);

    const theme = useSelector(selectTheme);
    const userId = useSelector(selectUserId);
    const user = useSelector(selectUser);

    const [addTaskAssign, { isLoading }] = useAddTaskAssignMutation();
    const { showSuccess, showError } = useNotification();

    // Fetch all users from API
    const { data: allUsersData, isLoading: isLoadingUsers } = useGetAllUsersQuery();

    // Socket.io listener for real-time task updates
    useEffect(() => {
        // Listen for task added events
        onTaskAdded((data) => {
            console.log('✅ New task received:', data);
            showSuccess(`New task added: ${data.taskName}`);
            // You can refetch tasks here or update state
        });

        // Cleanup on unmount
        return () => {
            offTaskAdded();
        };
    }, [showSuccess]);

    const handleTabChange = (key) => {
        setActiveTab(key);
    };

    const showDrawer = () => {
        setDrawerVisible(true);
    };

    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleDateRangeChange = (dates) => {
        setSelectedDateRange(dates);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedDateRange(null);
    };

    const onClose = () => {
        setDrawerVisible(false);
        form.resetFields();
        setFileList([]);
        setUploadedImageUrls([]);
        setSelectedSlotDate(null);
        setSelectedReceiverUserId(null);
        setSelectedPosition(null);
        setSelectedUserSlot(null);
        setAvailableUsers([]);
    };

    const handleFileChange = async ({ fileList: newFileList, file }) => {
        // If a new file is being added
        if (file && file.status === undefined) {
            // Get the actual file object - Ant Design Upload structure
            const fileToUpload = file.originFileObj || file;

            // Validate file object
            if (!fileToUpload) {
                showError('Invalid file selected');
                setFileList(prev => prev.filter(f => f.uid !== file.uid));
                return;
            }

            // Check if it's a File instance
            if (!(fileToUpload instanceof File)) {
                console.error('File object is not a File instance:', fileToUpload);
                showError('Invalid file format');
                setFileList(prev => prev.filter(f => f.uid !== file.uid));
                return;
            }

            // Set uploading status
            file.status = 'uploading';
            const updatedList = [...newFileList];
            setFileList(updatedList);

            try {
                setUploadingImages(true);
                console.log('Uploading file:', fileToUpload.name, fileToUpload.type);

                // Upload to Cloudinary as raw document
                const result = await uploadToCloudinary(fileToUpload, 'raw');

                if (!result || !result.secure_url) {
                    throw new Error('Invalid response from Cloudinary');
                }

                const documentUrl = result.secure_url;
                console.log('Upload successful:', documentUrl);

                // Update file list with uploaded URL
                const finalFileList = updatedList.map(f => {
                    if (f.uid === file.uid) {
                        return {
                            ...f,
                            status: 'done',
                            url: documentUrl,
                            response: { secure_url: documentUrl }
                        };
                    }
                    return f;
                });

                setFileList(finalFileList);
                setUploadedImageUrls(prev => [...prev, documentUrl]);
                setUploadingImages(false);
            } catch (error) {
                console.error('Error uploading document:', error);
                showError('Failed to upload document: ' + (error.message || 'Unknown error'));
                setUploadingImages(false);
                // Remove failed file from list
                setFileList(prev => prev.filter(f => f.uid !== file.uid));
            }
        } else if (file && file.status === 'removed') {
            // Remove URL from uploadedImageUrls when file is removed
            const removedUrl = file.url || file.response?.secure_url;
            if (removedUrl) {
                setUploadedImageUrls(prev => prev.filter(url => url !== removedUrl));
            }
            setFileList(newFileList);
        } else {
            setFileList(newFileList);
        }
    };

    // Dynamic positions based on ALL users from API - show OTHER roles' positions
    const getAvailablePositions = () => {
        const currentUserRole = user?.role; // Logged-in user's role
        const allUsers = allUsersData?.data || [];

        console.log('🔍 Current User Role:', currentUserRole);
        console.log('👥 All Users from API:', allUsers);

        if (isLoadingUsers || allUsers.length === 0) {
            return []; // Return empty if still loading or no users
        }

        // Filter users with DIFFERENT roles (not same as logged-in user)
        const otherRoleUsers = allUsers.filter(u => u.role !== currentUserRole);

        console.log('✅ Users with OTHER roles:', otherRoleUsers);

        // Extract unique positions from other role users
        const uniquePositions = [...new Set(
            otherRoleUsers
                .filter(u => u.position) // Only users with positions
                .map(u => u.position) // Get position
        )];

        console.log('📋 Unique Positions from OTHER roles:', uniquePositions);

        // Convert to dropdown format (just positions, no userId yet)
        const positionOptions = uniquePositions.map(position => ({
            value: position.toLowerCase().replace(/\s+/g, '-'), // "Graphics Designer" -> "graphics-designer"
            label: position // "Graphics Designer"
        }));

        console.log('🎯 Position Dropdown Options:', positionOptions);

        return positionOptions;
    };

    // Handle position selection - populate users list for that position
    const handlePositionChange = (selectedPosition) => {
        const allUsers = allUsersData?.data || [];
        const currentUserRole = user?.role;

        console.log('🎯 Position Selected:', selectedPosition);

        // Filter other role users
        const otherRoleUsers = allUsers.filter(u => u.role !== currentUserRole);

        // Find ALL users with the selected position
        const usersWithPosition = otherRoleUsers.filter(u =>
            u.position?.toLowerCase().replace(/\s+/g, '-') === selectedPosition
        );

        console.log('👥 Users with selected position:', usersWithPosition);

        // Set the selected position and available users
        setSelectedPosition(selectedPosition);
        setAvailableUsers(usersWithPosition);

        // Reset receiver selection, slot, and date
        setSelectedReceiverUserId(null);
        setSelectedUserSlot(null);
        setSelectedSlotDate(null);
    };

    // Get users for the selected position
    const getUsersForPosition = () => {
        if (!selectedPosition || availableUsers.length === 0) {
            return [];
        }

        return availableUsers.map(user => ({
            value: user.userId,
            label: `${user.firstName} ${user.lastName} (${user.email})`
        }));
    };

    // Handle user selection from the users list
    const handleUserSelection = (selectedUserId) => {
        setSelectedReceiverUserId(selectedUserId);
        setSelectedUserSlot(null);
        setSelectedSlotDate(null);
        const selectedUser = availableUsers.find(u => u.userId === selectedUserId);
        console.log('✅ Selected User:', {
            userId: selectedUser?.userId,
            name: `${selectedUser?.firstName} ${selectedUser?.lastName}`,
            position: selectedUser?.position
        });
    };

    // Slots availability via RTK Query
    // Normalize selectedSlotDate to a dayjs instance and always derive YYYY-MM-DD for API
    const selectedDateStr = selectedSlotDate && typeof selectedSlotDate?.format === 'function'
        ? selectedSlotDate.format('YYYY-MM-DD')
        : null;

    const uploadProps = {
        fileList,
        onChange: handleFileChange,
        beforeUpload: () => false,
        multiple: true,
        listType: "text",
        accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
    };

    // Map our internal position key to API expected value (e.g., graphics-designer -> GraphicsDesigner)
    const mapPositionToApi = (pos) => {
        if (!pos) return '';
        const noHyphen = pos.replace(/-+/g, ' ');
        return noHyphen.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    };

    const apiPosition = mapPositionToApi(selectedPosition);
    const { data: slotTemplatesData, isFetching: loadingSlots, refetch: refetchSlotTemplates } = useGetSlotTemplatesQuery(apiPosition, { skip: !apiPosition });

    // Determine which slots to show:
    // 1. If date is selected + user selected: show availability slots (with booked status)
    // 2. If only position selected: show template slots (all available)
    const shouldShowAvailabilitySlots = selectedSlotDate && selectedReceiverUserId;
    const { data: availabilityData, isFetching: loadingAvailability, refetch: refetchAvailability } = useGetUserSlotsAvailabilityQuery(
        { userId: selectedReceiverUserId, date: selectedDateStr },
        { skip: !selectedReceiverUserId || !selectedDateStr }
    );

    const baseSlots = shouldShowAvailabilitySlots
        ? (availabilityData?.data?.slots || [])
        : (slotTemplatesData?.data?.slots || []);

    const slotOptions = baseSlots.map((s) => ({
        value: `${s.startTime}-${s.endTime}`,
        label: `${s.startTime} - ${s.endTime} (${s.status || 'free'})`,
        disabled: shouldShowAvailabilitySlots && s.status === 'booked', // Only disable if showing availability slots
        slotObj: s
    }));

    // Socket.io listener for real-time slot availability updates
    useEffect(() => {
        if (!selectedPosition) return;

        const handleSlotAvailabilityChange = (data) => {
            console.log('🔄 Slot availability changed:', data);

            // Map position for comparison
            const currentApiPosition = mapPositionToApi(selectedPosition);

            // Check if the update is relevant to current selections
            const matchesPosition = !selectedPosition || data.position === currentApiPosition ||
                data.position === mapPositionToApi(selectedPosition);
            const matchesUser = !selectedReceiverUserId || data.userId === selectedReceiverUserId;
            const matchesDate = !selectedDateStr || data.date === selectedDateStr;

            if (matchesPosition && refetchSlotTemplates) {
                // Refetch slot templates if position matches
                refetchSlotTemplates();
            }

            if (matchesUser && matchesDate && shouldShowAvailabilitySlots && refetchAvailability) {
                // Refetch availability if user and date match
                refetchAvailability();
            }

            // Show notification if slot was booked/freed
            if (data.action === 'booked') {
                showSuccess(`Slot ${data.startTime}-${data.endTime} has been booked`);
            } else if (data.action === 'freed') {
                showSuccess(`Slot ${data.startTime}-${data.endTime} is now available`);
            }
        };

        // Listen for slot availability changes
        onSlotAvailabilityChanged(handleSlotAvailabilityChange);

        // Cleanup on unmount
        return () => {
            offSlotAvailabilityChanged();
        };
    }, [selectedPosition, selectedReceiverUserId, selectedDateStr, shouldShowAvailabilitySlots, refetchSlotTemplates, refetchAvailability, showSuccess]);

    // Join/Leave slot room for real-time updates
    useEffect(() => {
        if (selectedPosition && apiPosition) {
            // Join room for position-based slot updates
            joinSlotRoom(apiPosition, selectedReceiverUserId || null, selectedDateStr || null);

            return () => {
                // Leave room when component unmounts or selection changes
                leaveSlotRoom(apiPosition, selectedReceiverUserId || null, selectedDateStr || null);
            };
        }
    }, [selectedPosition, apiPosition, selectedReceiverUserId, selectedDateStr]);

    // Calendar Row Component - Generate next 14 days
    const generateDateOptions = () => {
        const dates = [];
        const today = dayjs();
        for (let i = 0; i < 14; i++) {
            const date = today.add(i, 'day');
            dates.push({
                key: date.format('YYYY-MM-DD'),
                day: date.format('ddd'),
                date: date.format('MMM D'),
                dayjs: date
            });
        }
        return dates;
    };

    const dateOptions = useMemo(() => generateDateOptions(), []);

    const handleDateSelect = (dateOption) => {
        // Always store the selected date as a dayjs instance to avoid format mismatches
        setSelectedSlotDate(dateOption?.dayjs || dateOption);
        setSelectedUserSlot(null);
    };

    // Get selected user details
    const selectedUserDetails = useMemo(() => {
        return availableUsers.find(u => u.userId === selectedReceiverUserId);
    }, [availableUsers, selectedReceiverUserId]);

    // Get user initials for avatar
    const getUserInitials = (user) => {
        if (!user) return '';
        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

    const handleAddTask = async (values) => {
        try {
            // Ensure date is selected as backend requires it (YYYY-MM-DD)
            const dateForApi = selectedDateStr;
            if (!dateForApi) {
                showError('Please choose a date before adding the task.');
                return;
            }
            // Derive selected user's position and slot details
            const selectedUser = availableUsers.find(u => u.userId === selectedReceiverUserId);
            const selectedUserPosition = selectedUser?.position || mapPositionToApi(selectedPosition);
            const chosenSlotObj = (baseSlots || []).find(s => `${s.startTime}-${s.endTime}` === selectedUserSlot);
            const taskSlotsTimes = selectedUserSlot ? [{
                startTime: chosenSlotObj?.startTime || selectedUserSlot?.split('-')?.[0],
                endTime: chosenSlotObj?.endTime || selectedUserSlot?.split('-')?.[1],
                bufferAfterMinutes: typeof chosenSlotObj?.bufferAfterMinutes === 'number' ? chosenSlotObj.bufferAfterMinutes : undefined
            }] : [];
            // For backward compatibility with the current backend, include BOTH
            // legacy keys (assignedBy, receiverUserId) and new keys (assignerId, receiverId).
            const taskData = {
                // New schema
                assignerId: userId, // Creator/Sender userId (who assigns the task)
                receiverId: selectedReceiverUserId, // ✅ Receiver userId (who receives the task)
                // Legacy schema (required by current backend validation)
                assignedBy: userId,
                receiverUserId: selectedReceiverUserId,
                // Common fields
                position: selectedUserPosition,
                taskName: values.taskName,
                clientName: values.clientName,
                category: values.category,
                priority: values.priority,
                timeSpend: values.timeSpend || '',
                description: values.description || '',
                taskImages: uploadedImageUrls, // ✅ Include uploaded Cloudinary URLs
                date: dateForApi,
                taskSlotsTimes
            };

            console.log('📤 Sending Task Data with Receiver:', {
                assignerId: userId,
                receiverId: selectedReceiverUserId,
                taskData
            });

            // Send to API
            await addTaskAssign(taskData).unwrap();

            // Emit socket event for real-time update
            emitTaskAdded(taskData);

            showSuccess('Task added successfully!');
            form.resetFields();
            setFileList([]);
            setUploadedImageUrls([]);
            setSelectedReceiverUserId(null); // Reset receiver
            setSelectedPosition(null); // Reset position
            setSelectedUserSlot(null);
            setAvailableUsers([]); // Reset users list
            setDrawerVisible(false);
        } catch (error) {
            showError(error?.data?.message || 'Failed to add task');
            console.error('Error adding task:', error);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case '1':
                return (
                    <AllTaskEntries
                        searchTerm={searchTerm}
                        selectedDateRange={selectedDateRange}
                    />
                );
            case '2':
                return (
                    <AllTaskEntries
                        searchTerm={searchTerm}
                        selectedDateRange={selectedDateRange}
                        statusFilter="pending"
                    />
                );
            case '3':
                return (
                    <AllTaskEntries
                        searchTerm={searchTerm}
                        selectedDateRange={selectedDateRange}
                        statusFilter="pending"
                    />
                );
            case '4':
                return (
                    <AllTaskEntries
                        searchTerm={searchTerm}
                        selectedDateRange={selectedDateRange}
                        statusFilter="completed"
                    />
                );
            default:
                return <div>No content available.</div>;
        }
    };

    return (
        <div id="ExecutionTaskAssignPanel" className={`theme-${theme}`}>
            <h2>Execution Task Assign Panel</h2>
            <div className="MarginTopMedium">
                <Row>
                    <Col lg={18} md={18} sm={24} xs={24}>
                        <div className="AntdTabsNames">
                            <Tabs
                                activeKey={activeTab}
                                onChange={handleTabChange}
                                type="card"
                                items={[
                                    {
                                        key: '1',
                                        label: 'All Tasks'
                                    },
                                    {
                                        key: '2',
                                        label: 'Upcoming Changes'
                                    },
                                    {
                                        key: '3',
                                        label: 'In Progress'
                                    },
                                    {
                                        key: '4',
                                        label: 'Completed'
                                    }
                                ]}
                            />
                        </div>
                    </Col>
                    <Col lg={6} md={6} sm={24} xs={24}>
                        <div className="AddNewTaskButton" style={{ display: 'flex', gap: '8px' }}>
                            <Button type="primary" icon={<BiTask />} onClick={showDrawer}>Add New Task</Button>
                            <Button
                                icon={<BsFilter />}
                                onClick={toggleFilters}
                                className={showFilters ? 'filter-active' : ''}
                            >
                                Filters
                            </Button>
                        </div>
                    </Col>
                </Row>

                {/* Filter Section */}
                {showFilters && (
                    <div className="filters-section MarginBottomSmall" style={{
                        padding: '16px',
                        backgroundColor: 'var(--secondary-bg)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <Row gutter={[16, 16]} align="middle">
                            <Col xs={24} sm={24} md={12} lg={12}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BsSearch style={{ color: 'var(--secondary-text)' }} />
                                    <Input
                                        placeholder="Search by task name or client name..."
                                        value={searchTerm}
                                        onChange={handleSearchChange}
                                        style={{ flex: 1 }}
                                        allowClear
                                    />
                                </div>
                            </Col>
                            <Col xs={24} sm={24} md={8} lg={8}>
                                <DatePicker.RangePicker
                                    placeholder={['Start Date', 'End Date']}
                                    value={selectedDateRange}
                                    onChange={handleDateRangeChange}
                                    style={{ width: '100%' }}
                                />
                            </Col>
                            <Col xs={24} sm={24} md={4} lg={4}>
                                <Button
                                    onClick={clearFilters}
                                    style={{ width: '100%' }}
                                >
                                    Clear Filters
                                </Button>
                            </Col>
                        </Row>
                    </div>
                )}

                <div>
                    <div className="AntdTabsContent">
                        {renderTabContent()}
                    </div>
                </div>
            </div>

            <Drawer
                title={
                    <div className="custom-drawer-header">
                        <div className="drawer-title">
                            <h2>Add New Task</h2>
                        </div>
                        <div className="drawer-close-btn">
                            <Button
                                type="text"
                                icon={<IoClose />}
                                onClick={onClose}
                                className="close-button"
                            />
                        </div>
                    </div>
                }
                placement="right"
                width={1000}
                onClose={onClose}
                open={drawerVisible}
                closable={false}
                className="custom-drawer"
            >
                <div className={`drawer-content theme-${theme}`}>
                    <Form
                        form={form}
                        layout="vertical"
                        className="task-form-drawer"
                        onFinish={handleAddTask}
                    >
                        {/* Task Basic Info Section */}
                        <div className="task-form-section">
                            <div className="task-form-section-title">Task Details</div>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={24} md={12} lg={12}>
                                    <Form.Item
                                        label={<span className="form-label">Task Name</span>}
                                        name="taskName"
                                        rules={[{ required: true, message: 'Please enter task name' }]}
                                    >
                                        <Input
                                            placeholder="Enter task name"
                                            className="task-form-input"
                                            size="large"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={24} md={12} lg={12}>
                                    <Form.Item
                                        label={<span className="form-label">Client Name</span>}
                                        name="clientName"
                                        rules={[{ required: true, message: 'Please enter client name' }]}
                                    >
                                        <Input
                                            placeholder="Enter client name"
                                            className="task-form-input"
                                            size="large"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>

                        {/* Category & User Selection Section */}
                        <div className="task-form-section">
                            <div className="task-form-section-title">Assignment</div>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={24} md={12} lg={12}>
                                    <Form.Item
                                        label={<span className="form-label">Task Category</span>}
                                        name="category"
                                        rules={[{ required: true, message: 'Please select a category' }]}
                                    >
                                        <Select
                                            placeholder="Select category"
                                            onChange={handlePositionChange}
                                            className="task-form-select"
                                            size="large"
                                        >
                                            {getAvailablePositions().map((position) => (
                                                <Select.Option key={position.value} value={position.value}>
                                                    {position.label}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={24} md={12} lg={12}>
                                    <Form.Item
                                        label={<span className="form-label">Select User</span>}
                                        name="selectedUser"
                                        rules={[{ required: true, message: 'Please select a user' }]}
                                    >
                                        <Select
                                            placeholder={selectedPosition ? "Select user" : "First select a category"}
                                            disabled={!selectedPosition || availableUsers.length === 0}
                                            onChange={handleUserSelection}
                                            className="task-form-select"
                                            size="large"
                                            showSearch
                                            filterOption={(input, option) =>
                                                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                                            }
                                        >
                                            {getUsersForPosition().map((user) => (
                                                <Select.Option key={user.value} value={user.value}>
                                                    {user.label}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>

                            {/* Selected User Display */}
                            {selectedUserDetails && (
                                <div className="selected-user-display">
                                    <Avatar
                                        size={48}
                                        className="user-avatar"
                                        style={{ backgroundColor: 'var(--brand-color)', color: '#000' }}
                                    >
                                        {getUserInitials(selectedUserDetails)}
                                    </Avatar>
                                    <div className="user-info">
                                        <div className="user-name">
                                            {selectedUserDetails.firstName} {selectedUserDetails.lastName}
                                        </div>
                                        <div className="user-position">{selectedUserDetails.position}</div>
                                        <div className="user-email">{selectedUserDetails.email}</div>
                                    </div>
                                    <Badge
                                        status="success"
                                        text={<span className="selected-badge">Selected</span>}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Date Selection Section - Show when user is selected */}
                        {selectedReceiverUserId && (
                            <div className="task-form-section">
                                <div className="task-form-section-title">
                                    <BsCalendarDate className="section-icon" />
                                    Choose Date
                                    <span className="slot-info-text"> (select to see availability)</span>
                                </div>
                                <div className="calendar-row-container">
                                    <div className="calendar-row">
                                        {dateOptions.map((dateOption) => {
                                            const isSelected = selectedSlotDate && typeof selectedSlotDate?.isSame === 'function'
                                                ? selectedSlotDate.isSame(dateOption.dayjs, 'day')
                                                : false;
                                            return (
                                                <div
                                                    key={dateOption.key}
                                                    className={`calendar-date-box ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => handleDateSelect(dateOption)}
                                                >
                                                    <div className="date-day">{dateOption.day}</div>
                                                    <div className="date-value">{dateOption.date}</div>
                                                    {isSelected && <BsCheckCircle className="selected-icon" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Slot Selection Section - Show when user is selected */}
                        {selectedReceiverUserId && (
                            <div className="task-form-section">
                                <div className="task-form-section-title">
                                    <HiOutlineClock className="section-icon" />
                                    {shouldShowAvailabilitySlots ? 'Available Time Slots' : 'Time Slot Templates'}
                                    {shouldShowAvailabilitySlots && <span className="slot-info-text"> (for selected date)</span>}
                                </div>
                                {shouldShowAvailabilitySlots && loadingAvailability ? (
                                    <div className="slots-loading">Loading availability...</div>
                                ) : loadingSlots && !shouldShowAvailabilitySlots ? (
                                    <div className="slots-loading">Loading slots...</div>
                                ) : slotOptions.length === 0 ? (
                                    <div className="slots-empty">
                                        {shouldShowAvailabilitySlots
                                            ? 'No slots available for this date'
                                            : 'No slots available for this position'}
                                    </div>
                                ) : (
                                    <div className="slots-grid">
                                        {slotOptions.map((opt) => {
                                            const isSelected = selectedUserSlot === opt.value;
                                            const isBooked = opt.disabled;
                                            return (
                                                <div
                                                    key={opt.value}
                                                    className={`slot-card ${isSelected ? 'selected' : ''} ${isBooked ? 'booked' : ''}`}
                                                    onClick={() => !isBooked && setSelectedUserSlot(opt.value)}
                                                >
                                                    <div className="slot-time">
                                                        {opt.slotObj?.startTime || opt.value.split('-')[0]} - {opt.slotObj?.endTime || opt.value.split('-')[1]}
                                                    </div>
                                                    <div className="slot-status">
                                                        {isBooked ? (
                                                            <Tag color="red">Booked</Tag>
                                                        ) : isSelected ? (
                                                            <Tag color="green">Selected</Tag>
                                                        ) : (
                                                            <Tag color="blue">Available</Tag>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Priority & Other Fields */}
                        <div className="task-form-section">
                            <div className="task-form-section-title">Additional Information</div>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={24} md={12} lg={12}>
                                    <Form.Item
                                        label={<span className="form-label">Priority</span>}
                                        name="priority"
                                        rules={[{ required: true, message: 'Please select priority' }]}
                                    >
                                        <Select
                                            placeholder="Select priority"
                                            className="task-form-select"
                                            size="large"
                                        >
                                            <Select.Option value="high">
                                                <Tag color="red">High Priority</Tag>
                                            </Select.Option>
                                            <Select.Option value="medium">
                                                <Tag color="orange">Medium Priority</Tag>
                                            </Select.Option>
                                            <Select.Option value="low">
                                                <Tag color="blue">Low Priority</Tag>
                                            </Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={24} md={12} lg={12}>
                                    <Form.Item
                                        label={<span className="form-label">Time Spend</span>}
                                        name="timeSpend"
                                    >
                                        <Input
                                            prefix={<BsClock />}
                                            placeholder="e.g., 02:00:00"
                                            className="task-form-input"
                                            size="large"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>

                        {/* Documents Section */}
                        <div className="task-form-section">
                            <div className="task-form-section-title">Attachments</div>
                            <Form.Item
                                label={<span className="form-label">Task Documents</span>}
                                name="taskImages"
                            >
                                <Upload {...uploadProps}>
                                    <Button
                                        icon={<BsUpload />}
                                        loading={uploadingImages}
                                        className="upload-button"
                                        size="large"
                                    >
                                        {uploadingImages ? 'Uploading...' : 'Upload Documents'}
                                    </Button>
                                </Upload>
                            </Form.Item>
                        </div>

                        {/* Description Section */}
                        <div className="task-form-section">
                            <div className="task-form-section-title">Description</div>
                            <Form.Item
                                name="description"
                            >
                                <TextArea
                                    rows={4}
                                    placeholder="Enter task description..."
                                    className="task-form-textarea"
                                />
                            </Form.Item>
                        </div>

                        {/* Submit Button */}
                        <div className="task-form-footer">
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={isLoading}
                                size="large"
                                className="submit-button"
                                icon={<BiTask />}
                            >
                                {isLoading ? 'Adding Task...' : 'Create Task'}
                            </Button>
                        </div>
                    </Form>
                </div>
            </Drawer>
        </div>
    )
}

export default ExecutionTaskAssignPanel;