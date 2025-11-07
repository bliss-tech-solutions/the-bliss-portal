import React, { useState, useEffect, useRef } from 'react';
import './AllUserTaskEntries.css';
import { Card, Tag, Button, Row, Col, Drawer, Spin, Popconfirm } from 'antd';
import { useSelector } from 'react-redux';
import { selectTheme } from '../../../../../store/slices/themeSlice';
import { selectUserId, selectUser } from '../../../../../store/slices/authSlice';
import { useGetTasksByReceiverQuery, useGetAllUsersQuery, useUpdateTaskStatusMutation } from '../../../../../store/api';
import { useNotification } from '../../../../../contexts/NotificationContext';
import { BsClock, BsChat, BsPerson } from 'react-icons/bs';
import { AiOutlineEye } from 'react-icons/ai';
import { IoClose } from 'react-icons/io5';
import TaskChat from '../../../../PortalCommonComponents/TaskChat/TaskChat';

const AllUserTaskEntries = () => {
    const theme = useSelector(selectTheme);
    const userId = useSelector(selectUserId);
    const user = useSelector(selectUser);
    const [viewDrawerVisible, setViewDrawerVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [confirmTaskId, setConfirmTaskId] = useState(null);

    // Fetch user's assigned tasks from API (tasks assigned TO this user)
    const { data: tasksData, isLoading, error } = useGetTasksByReceiverQuery(userId);

    // Fetch all users to get assigner names
    const { data: allUsersData } = useGetAllUsersQuery();

    const { showSuccess, showError } = useNotification();
    const [updateTaskStatus, { isLoading: updatingStatus }] = useUpdateTaskStatusMutation();

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

    // Function to get assigner name by userId
    const getAssignerName = (assignerUserId) => {
        if (!allUsersData?.data) return 'Unknown';

        const assigner = allUsersData.data.find(user => user.userId === assignerUserId);
        if (!assigner) return 'Unknown';

        // Return full name if available, otherwise email or userId
        if (assigner.firstName && assigner.lastName) {
            return `${assigner.firstName} ${assigner.lastName}`;
        } else if (assigner.email) {
            return assigner.email;
        } else {
            return assigner.userId;
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

    // Handle loading and error states
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

    // Normalize backend shapes:
    // - { data: [...] }
    // - { data: { tasks: [...] } }
    // - { data: [{ tasks: [...] }, ...] } (edge)
    const extractTasksArray = () => {
        const d = tasksData?.data;
        if (!d) return [];
        if (Array.isArray(d)) {
            // Either array of tasks or array of docs with tasks
            if (d.length > 0 && Array.isArray(d[0]?.tasks)) {
                return d.flatMap(doc => doc.tasks || []);
            }
            return d;
        }
        if (Array.isArray(d?.tasks)) return d.tasks;
        return [];
    };

    const tasks = extractTasksArray()
        .filter(task => task?.isArchived !== true)
        .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());

    const handleViewTask = (task) => {
        setSelectedTask(task);
        setViewDrawerVisible(true);
    };

    const handleMarkCompleted = async (task) => {
        try {
            await updateTaskStatus({
                taskId: task._id,
                status: 'completed',
                assignerId: task.assignerId || task.assignedBy || task.userId,
                receiverId: task.receiverId || task.receiverUserId || userId
            }).unwrap();
            showSuccess('Task marked as completed');
        } catch (e) {
            showError(e?.data?.message || 'Failed to update task status');
        }
    };

    const handleCloseDrawer = () => {
        setViewDrawerVisible(false);
        setSelectedTask(null);
    };

    return (
        <div className="all-user-task-entries">
            {tasks.length === 0 ? (
                <div className="user-empty-state">
                    No tasks assigned to you yet.
                </div>
            ) : (
                tasks.map((task) => (
                    <Card
                        key={task._id}
                        className="user-task-entry-card"
                        hoverable
                    >
                        <Row gutter={[16, 16]}>
                            {/* Top Section */}
                            <Col span={24}>
                                <div className="user-task-header">
                                    <div className="user-task-title-section">
                                        <h3 className="user-task-title">{task.taskName}</h3>
                                        <div className="user-task-assigner">
                                            <span className="user-assigner-label">Assigned by:</span>
                                            <span className="user-assigner-name">{getAssignerName(task.assignerId || task.assignedBy || task.userId)}</span>
                                        </div>
                                    </div>
                                    <div className="user-task-priority">
                                        <Tag color={getPriorityColor(task.priority)}>
                                            {task.priority?.toUpperCase()}
                                        </Tag>
                                    </div>
                                </div>
                            </Col>

                            {/* Bottom Section */}
                            <Col span={24}>
                                <div className="user-task-footer">
                                    <div className="user-task-info">
                                        <div className="user-task-time">
                                            <BsClock className="icon" />
                                            <span>{formatDateTime(task.createdAt)}</span>
                                        </div>
                                        <div className="user-task-time-spend">
                                            <span>Time: {task.timeSpend}</span>
                                        </div>
                                        <div className="user-task-chat">
                                            <BsChat className="icon" />
                                            <span>{task.chatCount || task.chatMessageCount || 0}</span>
                                            <BsPerson className="icon" style={{ marginLeft: 12 }} />
                                            <span style={{ color: 'var(--secondary-text)' }}>
                                                {getAssignerName(task.assignerId || task.assignedBy || task.userId)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="user-task-actions">
                                        <Button
                                            type="text"
                                            icon={<AiOutlineEye />}
                                            className="user-action-btn"
                                            onClick={() => handleViewTask(task)}
                                        >
                                            View
                                        </Button>
                                        <Popconfirm
                                            title="Mark task as completed?"
                                            okText="Yes, complete"
                                            cancelText="Cancel"
                                            placement="topRight"
                                            open={confirmTaskId === task._id}
                                            onOpenChange={(open) => setConfirmTaskId(open ? task._id : null)}
                                            onConfirm={() => { setConfirmTaskId(null); handleMarkCompleted(task); }}
                                            onCancel={() => setConfirmTaskId(null)}
                                            disabled={task.taskStatus === 'completed'}
                                        >
                                            <Button
                                                type="primary"
                                                style={{ color: 'white' }}
                                                className="user-action-btn"
                                                disabled={task.taskStatus === 'completed' || updatingStatus}
                                            >
                                                {task.taskStatus === 'completed' ? 'Completed' : 'Mark Completed'}
                                            </Button>
                                        </Popconfirm>
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
                    <div className="user-custom-drawer-header">
                        <div className="user-drawer-title">
                            <h2>Task Details</h2>
                        </div>
                        <div className="user-drawer-close-btn">
                            <Button
                                type="text"
                                icon={<IoClose />}
                                onClick={handleCloseDrawer}
                                className="user-close-button"
                            />
                        </div>
                    </div>
                }
                placement="right"
                width={1000}
                onClose={handleCloseDrawer}
                open={viewDrawerVisible}
                closable={false}
                className="user-custom-drawer"
            >
                {selectedTask && (
                    <div className={`user-drawer-content theme-${theme}`}>
                        {/* Task Name */}
                        <div className='user-task-name-and-priority-row MarginBottomSmall'>
                            <div className="user-task-name-section">
                                <h2>{selectedTask.taskName}</h2>
                                <div className="user-task-assigner-drawer">
                                    <span className="user-assigner-label-drawer">Assigned by:</span>
                                    <span className="user-assigner-name-drawer">{getAssignerName(selectedTask.assignerId || selectedTask.assignedBy || selectedTask.userId)}</span>
                                </div>
                            </div>

                            {/* Priority and Date Row */}
                            <div className="user-priority-date-row">
                                <Tag color={getPriorityColor(selectedTask.priority)} className="user-priority-tag-pill">
                                    {selectedTask.priority?.charAt(0).toUpperCase() + selectedTask.priority?.slice(1)} Priority
                                </Tag>
                                <div className="user-date-badge">
                                    <BsClock />
                                    <span>
                                        {new Date(selectedTask.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                        })} - {new Date(selectedTask.createdAt).toLocaleDateString('en-US', {
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Time Spend Banner */}
                        <div className="user-time-spend-container MarginBottomMedium">
                            <div className="user-time-icon-wrapper">
                                <BsClock className="user-time-icon" />
                            </div>
                            <span className="user-time-label">Time Spent on this project</span>
                            <div className="user-time-value-wrapper">
                                <h2>{selectedTask.timeSpend}</h2>
                                <div className="user-time-info-icon">ⓘ</div>
                            </div>
                        </div>

                        {/* Description Section */}
                        <div className='CardFlexContainer'>
                            <Card title="Description" className='user-description-card'>
                                <div>
                                    <p className="user-description-text">{selectedTask.description}</p>
                                </div>
                            </Card>

                            {/* Client Info */}
                            <Card title="Client Information" className='user-client-info-card'>
                                <div className="user-client-info">
                                    <div className="user-info-item">
                                        <span className="user-info-label">Client:</span>
                                        <span className="user-info-value">{selectedTask.clientName}</span>
                                    </div>
                                    <div className="user-info-item">
                                        <span className="user-info-label">Task Assign Position:</span>
                                        <span className="user-info-value">{selectedTask.category}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Attachments Section (if images available) */}
                        {selectedTask.taskImages && selectedTask.taskImages.length > 0 && (
                            <Card title="Attachments" className='user-attachments-card'>
                                <div className="user-attachments-list">
                                    {selectedTask.taskImages.map((image, index) => (
                                        <div key={index} className="user-attachment-item">
                                            <div className="user-attachment-icon">📄</div>
                                            <div className="user-attachment-info">
                                                <div className="user-attachment-name">{image}</div>
                                                <div className="user-attachment-date">
                                                    {new Date(selectedTask.createdAt).toLocaleString('en-US', {
                                                        hour: 'numeric',
                                                        minute: 'numeric',
                                                        hour12: true,
                                                        day: 'numeric',
                                                        month: 'long'
                                                    })}
                                                </div>
                                            </div>
                                            <div className="user-attachment-actions">
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
                                // New schema: chats on user side (receiver) should go to the assigner
                                // Use new field names: assignerId (who assigned the task)
                                selectedTask?.assignerId || selectedTask?.assignedBy || 
                                (selectedTask?.receiverId === userId ? (selectedTask?.assignerId || selectedTask?.userId) : selectedTask?.userId)
                            }
                            className="user-task-chat"
                            title="Task Related Chat"
                            placeholder="Add a comment..."
                            showTitle={true}
                            height="500px"
                        />
                    </div>
                )}
            </Drawer>
        </div>
    );
};

export default AllUserTaskEntries;
