import React, { useState, useEffect } from "react";
import "./ExecutionTaskAssignPanel.css";
import { Row, Col, Button, Tabs, Drawer, Form, Input, Select, Upload, DatePicker, TimePicker, Alert, Radio, Tag } from "antd";
import { BiTask } from "react-icons/bi";
import { IoClose } from "react-icons/io5";
import { BsUpload, BsClock, BsSearch, BsFilter, BsCardChecklist, BsPersonPlus, BsClockHistory, BsPaperclip } from "react-icons/bs";
import { useSelector } from "react-redux";
import { selectTheme } from "../../../store/slices/themeSlice";
import { selectUserId, selectUser } from "../../../store/slices/authSlice";
import { useAddTaskAssignMutation, useGetAllUsersQuery, useLazyGetSuggestedSlotsQuery } from "../../../store/api";
import { useNotification } from "../../../contexts/NotificationContext";
import { emitTaskAdded, onTaskAdded, offTaskAdded } from "../../../utils/socket";
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
    const [availableUsers, setAvailableUsers] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDateRange, setSelectedDateRange] = useState(null);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [uploadedImageUrls, setUploadedImageUrls] = useState([]);
    const [slotStart, setSlotStart] = useState(null);
    const [slotDuration, setSlotDuration] = useState(null);
    const [slotEnd, setSlotEnd] = useState(null);
    const [slotWarning, setSlotWarning] = useState(null);
    const [slotSuggestions, setSlotSuggestions] = useState([]);
    const [conflictSuggestions, setConflictSuggestions] = useState([]);
    const [conflictMessage, setConflictMessage] = useState(null);
    const [userBookings, setUserBookings] = useState([]);

    const theme = useSelector(selectTheme);
    const userId = useSelector(selectUserId);
    const user = useSelector(selectUser);

    const [addTaskAssign, { isLoading }] = useAddTaskAssignMutation();
    const { showSuccess, showError } = useNotification();
    const [triggerSuggestedSlots, { isFetching: isFetchingSuggestedSlots }] = useLazyGetSuggestedSlotsQuery();

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
        setSlotStart(null);
        setSlotDuration(null);
        setSlotEnd(null);
        setSlotWarning(null);
        setSlotSuggestions([]);
        setConflictSuggestions([]);
        setConflictMessage(null);
        setUserBookings([]);
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

    const uploadProps = {
        fileList,
        onChange: handleFileChange,
        beforeUpload: () => false,
        multiple: true,
        listType: "text",
        accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
    };

    const applySlotSuggestion = (suggestion) => {
        if (!suggestion) return;
        const suggestedStart = suggestion.start ? dayjs(suggestion.start) : null;
        const suggestedEnd = suggestion.end ? dayjs(suggestion.end) : null;

        if (!suggestedStart || !suggestedEnd || !suggestedStart.isValid() || !suggestedEnd.isValid()) return;

        const duration = Math.max(suggestedEnd.diff(suggestedStart, 'minute'), 5);
        setSlotStart(suggestedStart);
        setSlotEnd(suggestedEnd);
        setSlotDuration(duration);
        form.setFieldsValue({
            slotStart: suggestedStart,
            slotDuration: duration
        });
        setSlotWarning(null);
        setConflictMessage(null);
        setConflictSuggestions([]);
    };

    const fetchSuggestedSlots = async (receiverId, options = {}) => {
        if (!receiverId) {
            setSlotSuggestions([]);
            return;
        }

        try {
            const params = {
                receiverUserId: receiverId
            };
            if (options.slotDate) {
                params.slotDate = options.slotDate;
            }

            const response = await triggerSuggestedSlots(params).unwrap();
            const suggestions = Array.isArray(response?.suggestions) ? response.suggestions : Array.isArray(response) ? response : [];
            const bookings = Array.isArray(response?.bookings) ? response.bookings : [];
            setSlotSuggestions(suggestions);
            setUserBookings(bookings);
            if (suggestions.length > 0) {
                applySlotSuggestion(suggestions[0]);
            } else {
                setSlotStart(null);
                setSlotDuration(null);
                setSlotEnd(null);
                form.setFieldsValue({ slotStart: null, slotDuration: null });
            }
        } catch (error) {
            console.error('Failed to fetch availability suggestions', error);
            setSlotSuggestions([]);
            setUserBookings([]);
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

        // Reset receiver selection
        setSelectedReceiverUserId(null);
        setSlotSuggestions([]);
        setConflictSuggestions([]);
        setConflictMessage(null);
        setSlotStart(null);
        setSlotDuration(null);
        setSlotEnd(null);
        form.setFieldsValue({ slotStart: null, slotDuration: null });
        setUserBookings([]);
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
        const selectedUser = availableUsers.find(u => u.userId === selectedUserId);
        console.log('✅ Selected User:', {
            userId: selectedUser?.userId,
            name: `${selectedUser?.firstName} ${selectedUser?.lastName}`,
            position: selectedUser?.position
        });
        setSlotStart(null);
        setSlotDuration(null);
        setSlotEnd(null);
        setSlotWarning(null);
        form.setFieldsValue({ slotStart: null, slotDuration: null });
        setConflictMessage(null);
        setConflictSuggestions([]);
        setUserBookings([]);
        fetchSuggestedSlots(selectedUserId);
    };

    const SLOT_DURATION_OPTIONS = [
        { label: '15 minutes', value: 15 },
        { label: '20 minutes', value: 20 },
        { label: '30 minutes', value: 30 },
        { label: '45 minutes', value: 45 },
        { label: '1 hour', value: 60 },
        { label: '2 hours', value: 120 },
        { label: '3 hours', value: 180 },
    ];

    const getDisabledStartTimes = () => {
        const now = dayjs();
        const latest = dayjs().hour(19).minute(30);

        const disabledHours = [];
        for (let hour = 0; hour < 24; hour++) {
            if (hour < now.hour() || hour > latest.hour()) {
                disabledHours.push(hour);
                continue;
            }
        }

        const uniqueHours = Array.from(new Set(disabledHours));

        const disabledMinutes = (selectedHour) => {
            const minutes = [];

            if (selectedHour === now.hour()) {
                for (let minute = 0; minute < now.minute(); minute++) {
                    minutes.push(minute);
                }
            }

            if (selectedHour === latest.hour()) {
                for (let minute = latest.minute() + 1; minute < 60; minute++) {
                    minutes.push(minute);
                }
            }

            return Array.from(new Set(minutes));
        };

        return {
            disabledHours: () => uniqueHours,
            disabledMinutes
        };
    };

    const updateSlotMeta = (startValue, durationValue) => {
        const now = dayjs();
        const latest = dayjs().hour(19).minute(30);

        setSlotWarning(null);

        if (!startValue || !durationValue) {
            setSlotEnd(null);
            return;
        }

        if (now.isAfter(latest)) {
            setSlotWarning('Task slots are unavailable after 7:30 PM today.');
            setSlotEnd(null);
            return;
        }

        const computedEnd = startValue.add(durationValue, 'minute');

        if (computedEnd.isAfter(latest)) {
            setSlotWarning('Selected duration extends beyond 7:30 PM. Choose an earlier start or shorter duration.');
            setSlotEnd(null);
            return;
        }

        setSlotEnd(computedEnd);
    };

    const handleSlotStartChange = (value) => {
        if (!value) {
            setSlotStart(null);
            setSlotDuration(null);
            setSlotEnd(null);
            setSlotWarning(null);
            form.setFieldsValue({ slotStart: null, slotDuration: null });
            return;
        }

        setSlotStart(value);
        form.setFieldsValue({ slotStart: value });

        if (slotDuration) {
            updateSlotMeta(value, slotDuration);
        } else {
            setSlotEnd(null);
            setSlotWarning(null);
        }
        setConflictMessage(null);
        setConflictSuggestions([]);
    };

    const handleSlotDurationChange = (valueOrEvent) => {
        const value = valueOrEvent && valueOrEvent.target ? valueOrEvent.target.value : valueOrEvent;

        if (value === undefined || value === null) {
            setSlotDuration(null);
            setSlotEnd(null);
            form.setFieldsValue({ slotDuration: null });
            return;
        }

        const durationValue = Number(value);
        setSlotDuration(durationValue);
        form.setFieldsValue({ slotDuration: durationValue });

        if (slotStart) {
            updateSlotMeta(slotStart, durationValue);
        } else {
            setSlotEnd(null);
        }
        setConflictMessage(null);
        setConflictSuggestions([]);
    };

    const validateSlotStart = (_, value) => {
        if (!selectedReceiverUserId) {
            return Promise.resolve();
        }

        if (!value) {
            return Promise.reject(new Error('Please select a start time'));
        }

        const now = dayjs();
        const latest = dayjs().hour(19).minute(30);

        if (now.isAfter(latest)) {
            return Promise.reject(new Error('Task slots are unavailable after 7:30 PM'));
        }

        if (value.isBefore(now)) {
            return Promise.reject(new Error('Start time must be later than the current time'));
        }

        if (value.isAfter(latest)) {
            return Promise.reject(new Error('Start time must be on or before 7:30 PM'));
        }

        return Promise.resolve();
    };

    const validateSlotDuration = (_, value) => {
        if (!selectedReceiverUserId) {
            return Promise.resolve();
        }

        if (!slotStart) {
            return Promise.reject(new Error('Select a start time first'));
        }

        if (!value) {
            return Promise.reject(new Error('Please choose a duration'));
        }

        const latest = dayjs().hour(19).minute(30);
        const computedEnd = slotStart.add(Number(value), 'minute');

        if (computedEnd.isAfter(latest)) {
            return Promise.reject(new Error('Duration pushes the task past 7:30 PM'));
        }

        return Promise.resolve();
    };

    const isDurationDisabled = (value) => {
        if (!slotStart) return false;
        const latest = dayjs().hour(19).minute(30);
        return slotStart.add(Number(value), 'minute').isAfter(latest);
    };

    const handleAddTask = async (values) => {
        try {
            const latest = dayjs().hour(19).minute(30);
            const now = dayjs();

            if (now.isAfter(latest)) {
                showError('Cannot assign slots after 7:30 PM');
                return;
            }

            const selectedStart = values.slotStart || slotStart;
            const selectedDuration = Number(values.slotDuration || slotDuration);

            if (!selectedStart || !selectedDuration) {
                showError('Please select both start time and duration');
                return;
            }

            const computedEnd = selectedStart.add(selectedDuration, 'minute');

            if (computedEnd.isAfter(latest)) {
                showError('Selected slot exceeds 7:30 PM. Adjust the start or duration.');
                return;
            }

            const slots = [{
                start: selectedStart.toISOString(),
                end: computedEnd.toISOString(),
                durationMinutes: selectedDuration,
                slotDate: selectedStart.format('YYYY-MM-DD')
            }];

            const taskData = {
                userId: userId, // Creator/Sender userId
                receiverUserId: selectedReceiverUserId, // ✅ Receiver userId (from selected position)
                taskName: values.taskName,
                clientName: values.clientName,
                category: values.category,
                priority: values.priority,
                timeSpend: values.timeSpend || '',
                description: values.description || '',
                chatMessages: [], // Empty array for new tasks
                taskImages: uploadedImageUrls, // ✅ Include uploaded Cloudinary URLs
                slots
            };

            console.log('📤 Sending Task Data with Receiver:', {
                creatorUserId: userId,
                receiverUserId: selectedReceiverUserId,
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
            setSlotStart(null);
            setSlotDuration(null);
            setSlotEnd(null);
            setSlotWarning(null);
            setSlotSuggestions([]);
            setConflictSuggestions([]);
            setConflictMessage(null);
            setSelectedReceiverUserId(null); // Reset receiver
            setSelectedPosition(null); // Reset position
            setAvailableUsers([]); // Reset users list
            setDrawerVisible(false);
        } catch (error) {
            if (error?.status === 409) {
                const message = error?.data?.message || 'Selected slot is unavailable. Please choose a different time.';
                const suggestions = error?.data?.suggestions || [];
                setConflictMessage(message);
                setConflictSuggestions(suggestions);
                showError(message);
            } else {
                showError(error?.data?.message || 'Failed to add task');
            }
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

    const formatExtensionTimestamp = (timestamp) => {
        if (!timestamp) return null;
        return dayjs(timestamp).format('MMM D, hh:mm A');
    };

    const formatSuggestionWindow = (suggestion) => {
        if (!suggestion) return '';
        const start = suggestion.start ? dayjs(suggestion.start) : null;
        const end = suggestion.end ? dayjs(suggestion.end) : null;
        if (!start || !start.isValid() || !end || !end.isValid()) return '';
        return `${start.format('hh:mm A')} - ${end.format('hh:mm A')}`;
    };

    const formatBookingWindow = (booking) => {
        if (!booking) return '';
        const start = booking.start ? dayjs(booking.start) : null;
        const end = booking.end ? dayjs(booking.end) : null;
        if (!start || !start.isValid() || !end || !end.isValid()) return '';
        const date = booking.slotDate ? dayjs(booking.slotDate) : start;
        const status = booking.status ? booking.status.replace(/^./, c => c.toUpperCase()) : undefined;
        return {
            dateLabel: date.isValid() ? date.format('ddd, MMM D') : start.format('ddd, MMM D'),
            timeLabel: `${start.format('hh:mm A')} - ${end.format('hh:mm A')}`,
            status
        };
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
                        className="task-form"
                        onFinish={handleAddTask}
                    >
                        <div className="task-form-section task-section-details">
                            <div className="task-section-header">
                                <div className="task-section-icon">
                                    <BsCardChecklist />
                                </div>
                                <div>
                                    <h3>Task Details</h3>
                                    <p>Give a clear name and client context.</p>
                                </div>
                            </div>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={24} md={12} lg={12}>
                                    <Form.Item
                                        label="Task Name"
                                        name="taskName"
                                        rules={[{ required: true, message: 'Please enter task name' }]}
                                    >
                                        <Input placeholder="Enter task name" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={24} md={12} lg={12}>
                                    <Form.Item
                                        label="Client Name"
                                        name="clientName"
                                        rules={[{ required: true, message: 'Please enter client name' }]}
                                    >
                                        <Input placeholder="Enter client name" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>

                        <div className="task-form-section task-section-assignment">
                            <div className="task-section-header">
                                <div className="task-section-icon">
                                    <BsPersonPlus />
                                </div>
                                <div>
                                    <h3>Assign To</h3>
                                    <p>Select the target position and teammate.</p>
                                </div>
                            </div>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={24} md={12} lg={12}>
                                    <Form.Item
                                        label="Assign Task Category"
                                        name="category"
                                        rules={[{ required: true, message: 'Please select a category' }]}
                                    >
                                        <Select
                                            placeholder="Select position"
                                            onChange={handlePositionChange}
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
                                        label="Select User"
                                        name="selectedUser"
                                        rules={[{ required: true, message: 'Please select a user' }]}
                                    >
                                        <Select
                                            placeholder={selectedPosition ? "Select user" : "First select a position"}
                                            disabled={!selectedPosition || availableUsers.length === 0}
                                            onChange={handleUserSelection}
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
                        </div>

                        <div className="task-form-section task-section-schedule">
                            <div className="task-section-header">
                                <div className="task-section-icon">
                                    <BsClockHistory />
                                </div>
                                <div>
                                    <h3>Schedule Slot</h3>
                                    <p>Reserve a focused window for this task.</p>
                                </div>
                            </div>

                            <div className={`slot-selector ${selectedReceiverUserId ? 'slot-selector-active' : 'slot-selector-disabled'}`}>
                                {!selectedReceiverUserId && (
                                    <div className="slot-selector-empty">
                                        Choose a teammate to unlock scheduling.
                                    </div>
                                )}

                                {selectedReceiverUserId && (
                                    <>
                                        <Row gutter={[16, 16]}>
                                            <Col xs={24} sm={12} md={12} lg={12}>
                                                <div className="slot-input-card">
                                                    <span className="slot-input-label">Task Start Time</span>
                                                    <Form.Item
                                                        name="slotStart"
                                                        rules={[
                                                            { required: true, message: 'Please select a start time' },
                                                            { validator: validateSlotStart }
                                                        ]}
                                                    >
                                                        <TimePicker
                                                            value={slotStart}
                                                            onChange={handleSlotStartChange}
                                                            use12Hours
                                                            format="hh:mm A"
                                                            minuteStep={5}
                                                            style={{ width: '100%' }}
                                                            disabledTime={getDisabledStartTimes}
                                                            showSecond={false}
                                                            placeholder="Pick a start time"
                                                        />
                                                    </Form.Item>
                                                    <p className="slot-helper-text">
                                                        Available in 5-minute intervals until 7:30 PM.
                                                    </p>
                                                </div>
                                            </Col>
                                            <Col xs={24} sm={12} md={12} lg={12}>
                                                <div className="slot-input-card">
                                                    <span className="slot-input-label">Duration</span>
                                                    <Form.Item
                                                        name="slotDuration"
                                                        rules={[
                                                            { required: true, message: 'Please choose a duration' },
                                                            { validator: validateSlotDuration }
                                                        ]}
                                                    >
                                                        <Radio.Group
                                                            className="slot-duration-group"
                                                            value={slotDuration}
                                                            onChange={handleSlotDurationChange}
                                                            disabled={!slotStart}
                                                        >
                                                            {SLOT_DURATION_OPTIONS.map(option => (
                                                                <Radio.Button
                                                                    key={option.value}
                                                                    value={option.value}
                                                                    disabled={isDurationDisabled(option.value)}
                                                                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                                                >
                                                                    {option.label}
                                                                </Radio.Button>
                                                            ))}
                                                        </Radio.Group>
                                                    </Form.Item>
                                                    <p className="slot-helper-text">
                                                        Pick a preset block that fits within the day.
                                                    </p>
                                                </div>
                                            </Col>
                                        </Row>

                                        {slotEnd && (
                                            <div style={{ color: 'var(--success-color)', fontSize: '12px', marginTop: -4 }}>
                                                Ends at {slotEnd.format('hh:mm A')}
                                            </div>
                                        )}

                                        {isFetchingSuggestedSlots && (
                                            <div className="slot-suggestions-loading">
                                                Fetching suggested windows...
                                            </div>
                                        )}
                                        {slotSuggestions.length > 0 && (
                                            <div className="slot-suggestions">
                                                <span className="slot-suggestions-label">Suggested windows</span>
                                                <div className="slot-suggestions-list">
                                                    {slotSuggestions.map((suggestion, index) => (
                                                        <Button
                                                            key={`suggestion-${index}`}
                                                            size="small"
                                                            className="slot-suggestion-chip"
                                                            onClick={() => applySlotSuggestion(suggestion)}
                                                        >
                                                            {formatSuggestionWindow(suggestion) || 'Suggestion'}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {conflictMessage && (
                                            <Alert
                                                message={conflictMessage}
                                                type="error"
                                                showIcon
                                                className="slot-conflict-alert"
                                            />
                                        )}
                                        {conflictSuggestions.length > 0 && (
                                            <div className="slot-suggestions conflict">
                                                <span className="slot-suggestions-label">Alternate windows</span>
                                                <div className="slot-suggestions-list">
                                                    {conflictSuggestions.map((suggestion, index) => (
                                                        <Button
                                                            key={`conflict-suggestion-${index}`}
                                                            size="small"
                                                            className="slot-suggestion-chip"
                                                            danger
                                                            onClick={() => applySlotSuggestion(suggestion)}
                                                        >
                                                            {formatSuggestionWindow(suggestion) || 'Alternate'}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="slot-bookings">
                                            <span className="slot-suggestions-label">Upcoming bookings</span>
                                            {userBookings.length === 0 ? (
                                                <div className="slot-bookings-empty">No existing bookings found for this teammate.</div>
                                            ) : (
                                                <div className="slot-bookings-list">
                                                    {userBookings.map((booking, index) => {
                                                        const formatted = formatBookingWindow(booking);
                                                        return (
                                                            <div key={`booking-${booking._id || index}`} className="slot-booking-item">
                                                                <div className="slot-booking-date">{formatted.dateLabel}</div>
                                                                <div className="slot-booking-time">{formatted.timeLabel}</div>
                                                                {formatted.status && (
                                                                    <Tag color={formatted.status.toLowerCase() === 'completed' ? 'green' : 'blue'}>
                                                                        {formatted.status}
                                                                    </Tag>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="slot-summary-bar">
                                            <div className="slot-summary-time">
                                                <span>Start</span>
                                                <strong>{slotStart ? slotStart.format('hh:mm A') : '--'}</strong>
                                            </div>
                                            <div className="slot-summary-duration">
                                                <span>Duration</span>
                                                <strong>{slotDuration ? `${slotDuration} mins` : '--'}</strong>
                                            </div>
                                            <div className="slot-summary-end">
                                                <span>Ends</span>
                                                <strong>{slotEnd ? slotEnd.format('hh:mm A') : '--'}</strong>
                                            </div>
                                        </div>

                                        {slotWarning && (
                                            <Alert
                                                message={slotWarning}
                                                type="warning"
                                                showIcon
                                                className="slot-warning-alert"
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="task-form-section task-section-files">
                            <div className="task-section-header">
                                <div className="task-section-icon">
                                    <BsPaperclip />
                                </div>
                                <div>
                                    <h3>Attachments & Effort</h3>
                                    <p>Share references and expected time investment.</p>
                                </div>
                            </div>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={24} md={12} lg={12}>
                                    <Form.Item
                                        label="Priority Set"
                                        name="priority"
                                        rules={[{ required: true, message: 'Please select priority' }]}
                                    >
                                        <Select placeholder="Select priority">
                                            <Select.Option value="high">High Priority</Select.Option>
                                            <Select.Option value="medium">Medium Priority</Select.Option>
                                            <Select.Option value="low">Low Priority</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                {/* <Col xs={24} sm={24} md={12} lg={12}>
                                    <Form.Item
                                        label="Time Spend on This Project"
                                        name="timeSpend"
                                    >
                                        <Input
                                            prefix={<BsClock />}
                                            placeholder="e.g., 02:30 hrs"
                                        />
                                    </Form.Item>
                                </Col> */}
                                <Col xs={24} sm={24} md={12} lg={12}>
                                    <Form.Item
                                        label="Task References"
                                        name="taskImages"
                                    >
                                        <Upload {...uploadProps}>
                                            <Button icon={<BsUpload />} loading={uploadingImages}>
                                                {uploadingImages ? 'Uploading...' : 'Upload Documents'}
                                            </Button>
                                        </Upload>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <br />
                            {/* <Row gutter={[16, 16]}>

                            </Row> */}
                        </div>

                        <div className="task-form-section task-section-description">
                            <div className="task-section-header">
                                <div className="task-section-icon">
                                    <BsCardChecklist />
                                </div>
                                <div>
                                    <h3>Detailed Brief</h3>
                                    <p>Outline deliverables, milestones, or notes.</p>
                                </div>
                            </div>
                            <Form.Item
                                name="description"
                            >
                                <TextArea
                                    rows={5}
                                    placeholder="Provide a clear description or checklist for the assignee..."
                                />
                            </Form.Item>
                        </div>

                        <Row>
                            <Col span={24} style={{ display: "flex", justifyContent: "end" }}>
                                <Form.Item>
                                    <Button
                                        style={{ maxWidth: "200px" }}
                                        type="primary"
                                        htmlType="submit"
                                        loading={isLoading}
                                        block
                                        size="large"
                                    >
                                        {isLoading ? 'Adding Task...' : 'Add Task'}
                                    </Button>
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </div>
            </Drawer>
        </div>
    );
};

export default ExecutionTaskAssignPanel;
