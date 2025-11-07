import React, { useState } from 'react';
import './AllTaskEntries.css';
import { Card, Spin, Tag, Button, Row, Col, Drawer, Image, Modal } from 'antd';
import { useSelector } from 'react-redux';
import { selectUserId } from '../../../../store/slices/authSlice';
import { selectTheme } from '../../../../store/slices/themeSlice';
import { selectUser } from '../../../../store/slices/authSlice';
import { useGetTasksByAssignerQuery, useArchiveTaskMutation } from '../../../../store/api';
import { useNotification } from '../../../../contexts/NotificationContext';
import { BsClock, BsChat, BsPerson, BsCalendarDate } from 'react-icons/bs';
import { AiOutlineEye, AiOutlineEdit, AiOutlineDelete, AiOutlineExclamationCircle } from 'react-icons/ai';
import { IoClose } from 'react-icons/io5';
import { HiOutlineClock } from 'react-icons/hi';
import TaskChat from '../../../PortalCommonComponents/TaskChat/TaskChat';

const AllTaskEntries = ({ searchTerm = '', selectedDateRange = null, statusFilter = 'all' }) => {
    const userId = useSelector(selectUserId);
    const user = useSelector(selectUser);
    const theme = useSelector(selectTheme);
    const { data: tasksData, isLoading, error } = useGetTasksByAssignerQuery(userId);

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

    // Derive a best-effort assignee display name from task object
    const getAssigneeDisplay = (task) => {
        // Preferred fields if backend provides explicit names
        if (task.assignedToName) return task.assignedToName;
        if (task.receiverUserName) return task.receiverUserName;
        if (task.receiverName) return task.receiverName;
        if (task.assignedTo) return task.assignedTo; // could already be a name
        if (task.userName) return task.userName; // creator name (fallback)

        // Fallback to inferred user id fields when names are absent
        // If current user created it, show receiver id; otherwise show creator id
        // Use new field names: receiverId (instead of receiverUserId)
        if (task.assignerId === userId && task.receiverId) return task.receiverId;
        if (task.assignerId && task.assignerId !== userId) return task.assignerId;
        // Legacy support for old field names
        if (task.userId === userId && task.receiverUserId) return task.receiverUserId;
        if (task.userId && task.userId !== userId) return task.userId;

        return 'Unknown';
    };

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

    // Normalize shapes and extract tasks
    const extractTasksArray = () => {
        const d = tasksData?.data;
        if (!d) return [];
        if (Array.isArray(d)) {
            if (d.length > 0 && Array.isArray(d[0]?.tasks)) {
                return d.flatMap(doc => doc.tasks || []);
            }
            return d;
        }
        if (Array.isArray(d?.tasks)) return d.tasks;
        return [];
    };

    // Filter out archived tasks and apply search/date filters
    const filteredTasks = extractTasksArray()?.filter(task => {
        // First filter out archived tasks
        if (task?.isArchived === true) return false;

        // Status filter: 'completed' or 'pending' or 'all'
        if (statusFilter && statusFilter !== 'all') {
            const status = (task.taskStatus || 'pending').toLowerCase();
            if (statusFilter === 'completed' && status !== 'completed') return false;
            if ((statusFilter === 'pending' || statusFilter === 'in-progress') && status === 'completed') return false;
        }

        // Apply search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const matchesTaskName = task.taskName?.toLowerCase().includes(searchLower);
            const matchesClientName = task.clientName?.toLowerCase().includes(searchLower);

            if (!matchesTaskName && !matchesClientName) return false;
        }

        // Apply date filter (dummy for now)
        if (selectedDateRange && selectedDateRange[0] && selectedDateRange[1]) {
            const taskDate = new Date(task?.createdAt || task?.date || 0);
            const startDate = selectedDateRange[0].toDate();
            const endDate = selectedDateRange[1].toDate();

            if (taskDate < startDate || taskDate > endDate) return false;
        }

        return true;
    }) || [];

    // Sort latest first (by createdAt desc)
    const sortedTasks = [...filteredTasks].sort((a, b) => {
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return db - da;
    });

    // Debug: Log filtered tasks (remove in production)
    console.log('📋 Filtered tasks loaded:', filteredTasks.length);
    if (filteredTasks.length > 0) {
        console.log('📋 First filtered task receiverId:', filteredTasks[0].receiverId || filteredTasks[0].receiverUserId);
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

    const getStatusColor = (status) => {
        const s = (status || 'pending').toLowerCase();
        if (s === 'completed' || s === 'complete') return 'green';
        return 'default';
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

    // Extract slots from slotsBook structure
    const extractTaskSlots = (task) => {
        if (!task?.slotsBook || !Array.isArray(task.slotsBook) || task.slotsBook.length === 0) {
            return [];
        }

        const slots = [];
        task.slotsBook.forEach(yearData => {
            yearData.months?.forEach(monthData => {
                monthData.monthDates?.forEach(dateData => {
                    dateData.slotTime?.forEach(slot => {
                        slots.push({
                            ...slot,
                            date: `${yearData.year}-${String(monthData.month).padStart(2, '0')}-${String(dateData.monthDate).padStart(2, '0')}`
                        });
                    });
                });
            });
        });

        return slots;
    };

    // Format date display
    const formatTaskDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="all-task-entries">
            {sortedTasks.length === 0 ? (
                <div className="empty-state">
                    {searchTerm || selectedDateRange ? 'No tasks match your filters.' : 'No tasks found. Create your first task!'}
                </div>
            ) : (
                sortedTasks.map((task) => (
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
                                        <Tag color={getStatusColor(task.taskStatus)} style={{ marginLeft: 8 }}>
                                            {(task.taskStatus || 'pending').toUpperCase()}
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
                                            <BsPerson className="icon" style={{ marginLeft: 12 }} />
                                            <span style={{ marginLeft: 0, color: 'var(--secondary-text)' }}>
                                                {getAssigneeDisplay(task)}
                                            </span>
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
                {selectedTask && (() => {
                    const taskSlots = extractTaskSlots(selectedTask);
                    return (
                        <div className={`drawer-content theme-${theme}`}>
                            {/* Task Header Section - Redesigned */}
                            <div className="task-detail-header-section">
                                <div className="task-header-main">
                                    <div className="task-title-with-icon">
                                        <div className="task-title-icon-wrapper">
                                            <BsChat className="task-title-icon" />
                                        </div>
                                        <div className="task-title-content">
                                            <h1 className="task-detail-title">{selectedTask.taskName}</h1>
                                            <div className="task-meta-info">
                                                <span className="client-name">
                                                    <BsPerson className="meta-icon" />
                                                    {selectedTask.clientName}
                                                </span>
                                                {selectedTask.position && (
                                                    <span className="position-badge">
                                                        {selectedTask.position}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="task-status-tags">
                                        <Tag color={getPriorityColor(selectedTask.priority)} className="task-priority-tag">
                                            {selectedTask.priority?.charAt(0).toUpperCase() + selectedTask.priority?.slice(1)}
                                        </Tag>
                                        <Tag color={getStatusColor(selectedTask.taskStatus)} className="task-status-tag">
                                            {(selectedTask.taskStatus || 'pending').replace(/^./, c => c.toUpperCase())}
                                        </Tag>
                                    </div>
                                </div>

                                {/* Task Date and Time Info */}
                                <div className="task-info-bar">
                                    <div className="info-item">
                                        <BsCalendarDate className="info-icon" />
                                        <span className="info-label">Task Date:</span>
                                        <span className="info-value">{formatTaskDate(selectedTask.date)}</span>
                                    </div>
                                    <div className="info-item">
                                        <BsClock className="info-icon" />
                                        <span className="info-label">Created:</span>
                                        <span className="info-value">{formatDateTime(selectedTask.createdAt)}</span>
                                    </div>
                                    {selectedTask.timeSpend && (
                                        <div className="info-item">
                                            <HiOutlineClock className="info-icon" />
                                            <span className="info-label">Time Spent:</span>
                                            <span className="info-value">{selectedTask.timeSpend}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Slots Section - Show booked slots */}
                            {taskSlots.length > 0 && (
                                <div className="task-slots-section">
                                    <div className="slots-section-header">
                                        <HiOutlineClock className="section-header-icon" />
                                        <h3 className="slots-section-title">Booked Time Slots</h3>
                                    </div>
                                    <div className="task-slots-grid">
                                        {taskSlots.map((slot, index) => (
                                            <div
                                                key={slot._id || index}
                                                className={`task-slot-card ${slot.status === 'booked' ? 'booked' : 'free'}`}
                                            >
                                                <div className="slot-card-header">
                                                    <div className="slot-time-display">
                                                        {slot.startTime} - {slot.endTime}
                                                    </div>
                                                    <Tag
                                                        color={slot.status === 'booked' ? 'red' : 'green'}
                                                        className="slot-status-tag"
                                                    >
                                                        {slot.status === 'booked' ? 'Booked' : 'Free'}
                                                    </Tag>
                                                </div>
                                                <div className="slot-card-footer">
                                                    <span className="slot-date">{formatTaskDate(slot.date)}</span>
                                                    {slot.bufferAfterMinutes && (
                                                        <span className="slot-buffer">Buffer: {slot.bufferAfterMinutes}m</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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
                                receiverId={
                                    selectedTask.assignerId === userId 
                                        ? (selectedTask.receiverId || selectedTask.receiverUserId) 
                                        : (selectedTask.assignerId || selectedTask.userId)
                                }
                                className="task-chat-component"
                                title="Task Related Chat"
                                placeholder="Add a comment..."
                                showTitle={true}
                                height="500px"
                            />
                        </div>
                    );
                })()}
            </Drawer>

            {/* Archive Confirmation Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AiOutlineExclamationCircle style={{ color: '#ff4d4f', fontSize: '20px' }} />
                        <span>Delete Task</span>
                    </div>
                }
                open={archiveModalVisible}
                onOk={handleConfirmArchive}
                onCancel={handleCancelArchive}
                okText="Delete"
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