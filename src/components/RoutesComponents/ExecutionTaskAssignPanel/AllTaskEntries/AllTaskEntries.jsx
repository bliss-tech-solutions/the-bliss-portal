import React, { useState } from 'react';
import './AllTaskEntries.css';
import { Card, Spin, Tag, Button, Row, Col, Drawer, Image, Modal } from 'antd';
import { useSelector } from 'react-redux';
import { selectUserId } from '../../../../store/slices/authSlice';
import { selectTheme } from '../../../../store/slices/themeSlice';
import { selectUser } from '../../../../store/slices/authSlice';
import { useGetTaskAssignQuery, useArchiveTaskMutation } from '../../../../store/api';
import { useNotification } from '../../../../contexts/NotificationContext';
import { BsClock, BsChat } from 'react-icons/bs';
import { AiOutlineEye, AiOutlineEdit, AiOutlineDelete, AiOutlineExclamationCircle } from 'react-icons/ai';
import { IoClose } from 'react-icons/io5';
import TaskChat from '../../../PortalCommonComponents/TaskChat/TaskChat';

const AllTaskEntries = ({ searchTerm = '', selectedDateRange = null }) => {
    const userId = useSelector(selectUserId);
    const user = useSelector(selectUser);
    const theme = useSelector(selectTheme);
    const { data: tasksData, isLoading, error } = useGetTaskAssignQuery(userId);

    const [viewDrawerVisible, setViewDrawerVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [archiveModalVisible, setArchiveModalVisible] = useState(false);
    const [taskToArchive, setTaskToArchive] = useState(null);

    // Get notification functions with fallbacks
    let showSuccess, showError;
    try {
        const notification = useNotification();
        showSuccess = notification?.success || ((message) => console.log('Success:', message));
        showError = notification?.error || ((message) => console.error('Error:', message));
    } catch (error) {
        showSuccess = (message) => console.log('Success:', message);
        showError = (message) => console.error('Error:', message);
    }

    // Archive task mutation
    const [archiveTask, { isLoading: isArchiving }] = useArchiveTaskMutation();

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '20px', color: 'red' }}>
                Error loading tasks: {error?.data?.message || 'Failed to fetch tasks'}
            </div>
        );
    }

    // Filter out archived tasks and apply search/date filters
    const filteredTasks = tasksData?.data?.filter(task => {
        // First filter out archived tasks
        if (task.isArchived === true) return false;
        
        // Apply search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const matchesTaskName = task.taskName?.toLowerCase().includes(searchLower);
            const matchesClientName = task.clientName?.toLowerCase().includes(searchLower);
            
            if (!matchesTaskName && !matchesClientName) return false;
        }
        
        // Apply date filter (dummy for now)
        if (selectedDateRange && selectedDateRange[0] && selectedDateRange[1]) {
            const taskDate = new Date(task.createdAt);
            const startDate = selectedDateRange[0].toDate();
            const endDate = selectedDateRange[1].toDate();
            
            if (taskDate < startDate || taskDate > endDate) return false;
        }
        
        return true;
    }) || [];

    // Debug: Log filtered tasks (remove in production)
    console.log('📋 Filtered tasks loaded:', filteredTasks.length);
    if (filteredTasks.length > 0) {
        console.log('📋 First filtered task receiverUserId:', filteredTasks[0].receiverUserId);
    }

    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'high':
                return 'red';
            case 'medium':
                return 'orange';
            case 'low':
                return 'green';
            default:
                return 'default';
        }
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const handleViewTask = (task) => {
        setSelectedTask(task);
        setViewDrawerVisible(true);
    };

    const handleCloseDrawer = () => {
        setViewDrawerVisible(false);
        setSelectedTask(null);
    };

    const handleShowArchiveModal = (task) => {
        setTaskToArchive(task);
        setArchiveModalVisible(true);
    };

    const handleConfirmArchive = async () => {
        if (!taskToArchive) return;

        try {
            await archiveTask(taskToArchive._id).unwrap();
            showSuccess(`Task "${taskToArchive.taskName}" has been archived successfully!`);
            setArchiveModalVisible(false);
            setTaskToArchive(null);
        } catch (error) {
            showError(error?.data?.message || error?.message || 'Failed to archive task');
            console.error('Error archiving task:', error);
        }
    };

    const handleCancelArchive = () => {
        setArchiveModalVisible(false);
        setTaskToArchive(null);
    };

    return (
        <div className="all-task-entries">
            {filteredTasks.length === 0 ? (
                <div className="empty-state">
                    {searchTerm || selectedDateRange ? 'No tasks match your filters.' : 'No tasks found. Create your first task!'}
                </div>
            ) : (
                filteredTasks.map((task) => (
                    <Card
                        key={task._id}
                        className="task-entry-card"
                        hoverable
                    >
                        <Row gutter={[16, 16]}>
                            {/* Top Section */}
                            <Col span={24}>
                                <div className="task-header">
                                    <div className="task-title-section">
                                        <h3 className="task-title">{task.taskName}</h3>
                                    </div>
                                    <div className="task-priority">
                                        <Tag color={getPriorityColor(task.priority)}>
                                            {task.priority?.toUpperCase()}
                                        </Tag>
                                    </div>
                                </div>
                            </Col>

                            {/* Bottom Section */}
                            <Col span={24}>
                                <div className="task-footer">
                                    <div className="task-info">
                                        <div className="task-time">
                                            <BsClock className="icon" />
                                            <span>{formatDateTime(task.createdAt)}</span>
                                        </div>
                                        <div className="task-time-spend">
                                            <span>Time: {task.timeSpend}</span>
                                        </div>
                                        <div className="task-chat">
                                            <BsChat className="icon" />
                                            <span>{task.chatCount || task.chatMessageCount || 0}</span>
                                        </div>
                                    </div>
                                    <div className="task-actions">
                                        <Button
                                            type="text"
                                            icon={<AiOutlineEye />}
                                            className="action-btn"
                                            onClick={() => handleViewTask(task)}
                                        >
                                            View
                                        </Button>
                                        <Button
                                            type="text"
                                            icon={<AiOutlineEdit />}
                                            className="action-btn"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            type="text"
                                            icon={<AiOutlineDelete />}
                                            className="action-btn archive-btn"
                                            loading={isArchiving}
                                            onClick={() => handleShowArchiveModal(task)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </Card>
                ))
            )}

            {/* View Task Drawer */}
            <Drawer
                title={
                    <div className="custom-drawer-header">
                        <div className="drawer-title">
                            <h2>Task Details</h2>
                        </div>
                        <div className="drawer-close-btn">
                            <Button
                                type="text"
                                icon={<IoClose />}
                                onClick={handleCloseDrawer}
                                className="close-button"
                            />
                        </div>
                    </div>
                }
                placement="right"
                width={1000}
                onClose={handleCloseDrawer}
                open={viewDrawerVisible}
                closable={false}
                className="custom-drawer"
            >
                {selectedTask && (
                    <div className={`drawer-content theme-${theme}`}>
                        {/* Task Name */}
                        <div className='user-task-name-and-priority-row MarginBottomSmall'>
                            <div className="task-name-section">
                                <h2>{selectedTask.taskName}</h2>
                            </div>

                            {/* Priority and Date Row */}
                            <div className="priority-date-row">
                                <Tag color={getPriorityColor(selectedTask.priority)} className="priority-tag-pill">
                                    {selectedTask.priority?.charAt(0).toUpperCase() + selectedTask.priority?.slice(1)} Priority
                                </Tag>
                                <div className="date-badge">
                                    <BsClock />
                                    <span>
                                        {new Date(selectedTask.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                        })} - {new Date(selectedTask.updatedAt).toLocaleDateString('en-US', {
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Time Spend Banner */}
                        <div className="time-spend-container MarginBottomMedium">
                            <div className="time-icon-wrapper">
                                <BsClock className="time-icon" />
                            </div>
                            <span className="time-label">Time Spent on this project</span>
                            <div className="time-value-wrapper">
                                <h2 className="time-value">{selectedTask.timeSpend}</h2>
                                <div className="time-info-icon">ⓘ</div>
                            </div>
                        </div>

                        {/* Description Section */}
                        <Card title="Description" className='description-card'>
                            <p className="description-text">{selectedTask.description || 'No description provided.'}</p>
                        </Card>

                        {/* Attachments Section (if images available) */}
                        {selectedTask.taskImages && selectedTask.taskImages.length > 0 && (
                            <Card title="Attachments" className='attachments-card'>
                                <div className="attachments-list">
                                    {selectedTask.taskImages.map((image, index) => (
                                        <div key={index} className="attachment-item">
                                            <Image src={image} alt="Attachment" />
                                            <div className="attachment-actions">
                                                <Button type="text" icon={<AiOutlineEye />}>View</Button>
                                                <Button type="text">Download</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Comments Section - Using Reusable TaskChat Component */}
                        <TaskChat
                            taskId={selectedTask._id}
                            receiverId={selectedTask.userId === userId ? selectedTask.receiverUserId : selectedTask.userId}
                            className="task-chat-component"
                            title="Task Related Chat"
                            placeholder="Add a comment..."
                            showTitle={true}
                            height="500px"
                        // onMessageSent={(messageData) => {
                        //     console.log('Message sent:', messageData);
                        // }}
                        />
                    </div>
                )}
            </Drawer>

            {/* Archive Confirmation Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AiOutlineExclamationCircle style={{ color: '#ff4d4f', fontSize: '20px' }} />
                        <span>Archive Task</span>
                    </div>
                }
                open={archiveModalVisible}
                onOk={handleConfirmArchive}
                onCancel={handleCancelArchive}
                okText="Archive"
                cancelText="Cancel"
                okButtonProps={{
                    danger: true,
                    loading: isArchiving,
                    style: { backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' }
                }}
                cancelButtonProps={{
                    style: { borderColor: 'var(--border-color)' }
                }}
                className="archive-confirmation-modal"
                centered
                width={480}
            >
                <div style={{ padding: '16px 0' }}>
                    <p style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--primary-text)' }}>
                        Are you sure you want to archive this task?
                    </p>

                    {taskToArchive && (
                        <div style={{
                            backgroundColor: 'var(--secondary-bg)',
                            padding: '16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{ marginBottom: '8px' }}>
                                <strong style={{ color: 'var(--primary-text)' }}>Task Name:</strong>
                                <span style={{ color: 'var(--secondary-text)', marginLeft: '8px' }}>
                                    {taskToArchive.taskName}
                                </span>
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                                <strong style={{ color: 'var(--primary-text)' }}>Client:</strong>
                                <span style={{ color: 'var(--secondary-text)', marginLeft: '8px' }}>
                                    {taskToArchive.clientName}
                                </span>
                            </div>
                            <div>
                                <strong style={{ color: 'var(--primary-text)' }}>Priority:</strong>
                                <span style={{ color: 'var(--secondary-text)', marginLeft: '8px' }}>
                                    {taskToArchive.priority?.charAt(0).toUpperCase() + taskToArchive.priority?.slice(1)}
                                </span>
                            </div>
                        </div>
                    )}

                    <p style={{
                        marginTop: '16px',
                        fontSize: '14px',
                        color: 'var(--secondary-text)',
                        fontStyle: 'italic'
                    }}>
                        This action will move the task to archived status. You can restore it later if needed.
                    </p>
                </div>
            </Modal>
        </div>
    );
};

export default AllTaskEntries;