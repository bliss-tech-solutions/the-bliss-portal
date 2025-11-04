import React, { useState, useEffect } from "react";
import "./ExecutionTaskAssignPanel.css";
import { Row, Col, Button, Tabs, Drawer, Form, Input, Select, Upload, DatePicker } from "antd";
import { BiTask } from "react-icons/bi";
import { IoClose } from "react-icons/io5";
import { BsUpload, BsClock, BsSearch, BsFilter } from "react-icons/bs";
import { useSelector } from "react-redux";
import { selectTheme } from "../../../store/slices/themeSlice";
import { selectUserId, selectUser } from "../../../store/slices/authSlice";
import { useAddTaskAssignMutation, useGetAllUsersQuery } from "../../../store/api";
import { useNotification } from "../../../contexts/NotificationContext";
import { emitTaskAdded, onTaskAdded, offTaskAdded } from "../../../utils/socket";
import AllTaskEntries from "./AllTaskEntries/AllTaskEntries";

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
    };

    const handleFileChange = ({ fileList: newFileList }) => {
        setFileList(newFileList);
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
    };

    const uploadProps = {
        fileList,
        onChange: handleFileChange,
        beforeUpload: () => false,
        multiple: true,
    };

    const handleAddTask = async (values) => {
        try {
            const taskData = {
                userId: userId, // Creator/Sender userId
                receiverUserId: selectedReceiverUserId, // ✅ Receiver userId (from selected position)
                taskName: values.taskName,
                clientName: values.clientName,
                category: values.category,
                priority: values.priority,
                timeSpend: values.timeSpend || '',
                description: values.description || '',
                chatMessages: [] // Empty array for new tasks
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
            setSelectedReceiverUserId(null); // Reset receiver
            setSelectedPosition(null); // Reset position
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
                        className="task-form"
                        onFinish={handleAddTask}
                    >
                        <Row gutter={[16, 0]}>
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

                        <Row gutter={[16, 0]}>
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
                        </Row>

                        <Row gutter={[16, 0]}>
                            <Col xs={24} sm={24} md={12} lg={12}>
                                <Form.Item
                                    label="Task Images"
                                    name="taskImages"
                                >
                                    <Upload {...uploadProps} listType="picture">
                                        <Button icon={<BsUpload />} block>Upload Images</Button>
                                    </Upload>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={24} md={12} lg={12}>
                                <Form.Item
                                    label="Time Spend on This Project"
                                    name="timeSpend"
                                >
                                    <Input
                                        prefix={<BsClock />}
                                        placeholder="e.g., 12:45:00"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row>
                            <Col span={24}>
                                <Form.Item
                                    label="Description"
                                    name="description"
                                >
                                    <TextArea
                                        rows={4}
                                        placeholder="Enter task description"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

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
    )
}

export default ExecutionTaskAssignPanel;