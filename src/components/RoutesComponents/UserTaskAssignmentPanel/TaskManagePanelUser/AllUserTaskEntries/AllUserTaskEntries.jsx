import React, { useState, useEffect, useRef } from 'react';
import './AllUserTaskEntries.css';
import { Card, Tag, Button, Row, Col, Drawer, Spin, Popconfirm, Modal, Form, Input, Select, Dropdown } from 'antd';
import { useSelector } from 'react-redux';
import { selectTheme } from '../../../../../store/slices/themeSlice';
import { selectUserId, selectUser } from '../../../../../store/slices/authSlice';
import { useGetTaskAssignQuery, useGetAllUsersQuery, useUpdateTaskStatusMutation, useRequestTaskExtensionMutation } from '../../../../../store/api';
import { useNotification } from '../../../../../contexts/NotificationContext';
import { useTaskChatStore } from '../../../../../contexts/TaskChatContext';
import { BsClock, BsClockHistory, BsChat, BsPerson, BsPlusCircle, BsCardChecklist, BsThreeDots } from 'react-icons/bs';
import { AiOutlineEye } from 'react-icons/ai';
import { IoClose } from 'react-icons/io5';
import TaskChat from '../../../../PortalCommonComponents/TaskChat/TaskChat';
import EmptyState from '../../../../CommonComponents/EmptyState/EmptyState';
import dayjs from 'dayjs';
import {
    emitTaskExtensionRequested,
    onTaskExtensionUpdated,
    offTaskExtensionUpdated,
    onTaskAdded,
    offTaskAdded
} from '../../../../../utils/socket';

const AllUserTaskEntries = ({ activeTab = '1' }) => {
    const theme = useSelector(selectTheme);
    const userId = useSelector(selectUserId);
    const user = useSelector(selectUser);
    const [viewDrawerVisible, setViewDrawerVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [confirmTaskId, setConfirmTaskId] = useState(null);
    const [extensionModalVisible, setExtensionModalVisible] = useState(false);
    const [activeSlot, setActiveSlot] = useState(null);
    const [activeTask, setActiveTask] = useState(null);
    const [extensionForm] = Form.useForm();
    const { ensureTaskRoom } = useTaskChatStore();

    // Fetch user's assigned tasks from API
    const { data: tasksData, isLoading, error, refetch } = useGetTaskAssignQuery(userId);

    // Fetch all users to get assigner names
    const { data: allUsersData } = useGetAllUsersQuery();

    const { showSuccess, showError } = useNotification();
    const [updateTaskStatus, { isLoading: updatingStatus }] = useUpdateTaskStatusMutation();
    const [requestTaskExtension, { isLoading: requestingExtension }] = useRequestTaskExtensionMutation();
    const selectedTaskRef = useRef(null);
    const minuteOptions = [15, 20, 30, 45, 60, 90, 120, 150, 180];

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

    useEffect(() => {
        selectedTaskRef.current = selectedTask;
    }, [selectedTask]);

    // Real-time task updates via socket
    useEffect(() => {
        // Listen for new tasks added (real-time task fetching)
        const handleTaskAdded = (taskData) => {
            if (!taskData) return;

            // Check if this task is assigned to the current user
            const isForCurrentUser = taskData.receiverUserId === userId;
            
            if (isForCurrentUser) {
                console.log('✅ New task received via socket:', taskData);
                // Refetch tasks to get the latest list with the new task
                refetch();
                
                // Show success notification
                if (taskData.taskName) {
                    showSuccess(`New task assigned: ${taskData.taskName}`);
                }
            }
        };

        // Listen for extension updates
        const handleExtensionUpdate = (payload) => {
            if (!payload) return;

            const { taskId, receiverUserId, userId: assignerUserId, task: updatedTask } = payload;
            const isRelevant = receiverUserId === userId || assignerUserId === userId;

            if (isRelevant) {
                refetch();

                if (selectedTaskRef.current && selectedTaskRef.current._id === taskId && updatedTask) {
                    setSelectedTask(prev => ({
                        ...prev,
                        ...updatedTask
                    }));
                }
            }
        };

        // Set up socket listeners
        onTaskAdded(handleTaskAdded);
        onTaskExtensionUpdated(handleExtensionUpdate);

        // Cleanup listeners on unmount
        return () => {
            offTaskAdded();
            offTaskExtensionUpdated(handleExtensionUpdate);
        };
    }, [refetch, userId, showSuccess]);

    const parseTimeSlotValue = (value) => {
        if (!value) return null;

        const formats = ['HH:mm', 'HH:mm:ss', 'hh:mm A', 'h:mm A'];
        for (const fmt of formats) {
            const parsed = dayjs(value, fmt, true);
            if (parsed.isValid()) {
                return parsed;
            }
        }

        const isoParsed = dayjs(value);
        if (isoParsed.isValid()) {
            return isoParsed;
        }
        return null;
    };

    const getSlotWindow = (slot) => {
        if (!slot) return null;
        const start = parseTimeSlotValue(slot.start);
        const end = parseTimeSlotValue(slot.end);

        if (!start || !end) return null;
        return `${start.format('hh:mm A')} - ${end.format('hh:mm A')}`;
    };

    const getSlotStatusLabel = (status) => {
        if (!status) return 'Scheduled';
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const getExtensionStatusColor = (status = '') => {
        const normalized = status?.toLowerCase();
        if (normalized === 'approved' || normalized === 'accepted') return 'green';
        if (normalized === 'rejected') return 'red';
        if (normalized === 'pending') return 'orange';
        return 'blue';
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
    // Filter out archived tasks and sort latest first
    const allTasks = (tasksData?.data?.filter(task => task.isArchived !== true) || [])
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Filter tasks based on active tab from parent component
    // Tab 1: All Tasks (non-completed)
    // Tab 2: Upcoming Tasks (future slots)
    // Tab 3: In Progress (in-progress status)
    // Tab 4: Completed (completed status)
    const tasks = (() => {
        switch (activeTab) {
            case '2': // Upcoming Tasks
                const now = new Date();
                return allTasks.filter(task => {
                    const firstSlot = task.slots?.[0];
                    if (!firstSlot?.slotDate) return false;
                    const slotDate = new Date(firstSlot.slotDate);
                    return slotDate > now;
                });
            case '3': // In Progress
                return allTasks.filter(task => 
                    (task.taskStatus || 'pending').toLowerCase() === 'in-progress'
                );
            case '4': // Completed
                return allTasks.filter(task => 
                    (task.taskStatus || 'pending').toLowerCase() === 'completed'
                );
            case '1': // All Tasks (default - non-completed)
            default:
                return allTasks.filter(task => 
                    (task.taskStatus || 'pending').toLowerCase() !== 'completed'
                );
        }
    })();

    useEffect(() => {
        allTasks.forEach(task => ensureTaskRoom(task._id));
    }, [allTasks, ensureTaskRoom]);

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

    const handleViewTask = (task) => {
        setSelectedTask(task);
        setViewDrawerVisible(true);
    };

    const handleMarkCompleted = async (task) => {
        try {
            await updateTaskStatus({ taskId: task._id, status: 'completed' }).unwrap();
            showSuccess('Task marked as completed');
        } catch (e) {
            showError(e?.data?.message || 'Failed to update task status');
        }
    };

    const handleCloseDrawer = () => {
        setViewDrawerVisible(false);
        setSelectedTask(null);
    };

    const openExtensionModal = (task, slot) => {
        if (!task || !slot) return;
        setActiveTask(task);
        setActiveSlot(slot);
        setExtensionModalVisible(true);
        extensionForm.setFieldsValue({
            minutesRequested: minuteOptions[0],
            reason: ''
        });
    };

    const closeExtensionModal = () => {
        setExtensionModalVisible(false);
        setActiveSlot(null);
        setActiveTask(null);
        extensionForm.resetFields();
    };

    const handleExtensionSubmit = async (values) => {
        if (!activeTask || !activeSlot) return;

        const payload = {
            taskId: activeTask._id,
            slotId: activeSlot._id,
            body: {
                requestedBy: user?.userId || userId,
                minutesRequested: values.minutesRequested,
                reason: values.reason?.trim() || ''
            }
        };

        try {
            await requestTaskExtension(payload).unwrap();
            showSuccess('Extra time request sent to assigner.');
            emitTaskExtensionRequested({
                taskId: activeTask._id,
                slotId: activeSlot._id,
                minutesRequested: values.minutesRequested,
                requestedBy: user?.userId || userId,
                receiverUserId: activeTask.userId
            });
            closeExtensionModal();
            refetch();
        } catch (err) {
            showError(err?.data?.message || 'Unable to request extra time. Please try again.');
        }
    };

    return (
        <div className="all-user-task-entries">
            {tasks.length === 0 ? (
                <EmptyState 
                    image="/Images/NoTaskAvaible.png"
                    imageAlt="No tasks available"
                    title={
                        activeTab === '2' ? "No Upcoming Tasks" :
                        activeTab === '3' ? "No Tasks In Progress" :
                        activeTab === '4' ? "No Completed Tasks" :
                        "No Tasks Assigned"
                    }
                    description={
                        activeTab === '2' ? "You don't have any upcoming tasks scheduled. Tasks will appear here once they are assigned with future dates." :
                        activeTab === '3' ? "You don't have any tasks currently in progress. Start working on assigned tasks to see them here." :
                        activeTab === '4' ? "You haven't completed any tasks yet. Completed tasks will appear here once you mark them as done." :
                        "You don't have any tasks assigned to you yet. Tasks will appear here once they are assigned."
                    }
                    className="compact"
                />
            ) : (
                tasks.map((task) => {
                    const primarySlot = getSlotWindow(task.slots?.[0]);
                    const primarySlotStatus = task.slots?.[0]?.status ? getSlotStatusLabel(task.slots[0].status) : null;
                    const primarySlotStart = task.slots?.[0]?.start ? parseTimeSlotValue(task.slots[0].start) : null;
                    const primarySlotDate = task.slots?.[0]?.slotDate ? dayjs(task.slots[0].slotDate) : primarySlotStart;
                    const primarySlotDuration = task.slots?.[0]?.durationMinutes;
                    const taskStatus = task.taskStatus || 'pending';
                    const isCompleted = taskStatus === 'completed';

                    // Get status color for the indicator
                    const getStatusIndicatorColor = () => {
                        if (isCompleted) return '#52c41a'; // green
                        if (taskStatus === 'in-progress') return '#1890ff'; // blue
                        return '#faad14'; // orange/yellow for pending
                    };

                    // Menu items for dropdown
                    const handleMenuClick = ({ key }) => {
                        if (key === 'view') {
                            handleViewTask(task);
                        } else if (key === 'complete') {
                            setConfirmTaskId(task._id);
                        }
                    };

                    const menuItems = [
                        {
                            key: 'view',
                            label: (
                                <span>
                                    <AiOutlineEye style={{ marginRight: 8 }} />
                                    View Details
                                </span>
                            ),
                        },
                        {
                            key: 'complete',
                            label: 'Mark as Completed',
                            disabled: isCompleted || updatingStatus,
                        },
                    ];

                    return (
                        <Card
                            key={task._id}
                            className="user-task-entry-card"
                            hoverable
                        >
                            <div className="user-task-card-layout">
                                {/* Left Section: Icon, Task Name, Priority */}
                                <div className="user-task-left-section">
                                    <div className="user-task-icon-wrapper">
                                        <BsCardChecklist className="user-task-icon" />
                                        <span
                                            className="user-task-status-indicator"
                                            style={{ backgroundColor: getStatusIndicatorColor() }}
                                        />
                                    </div>
                                    <div className="user-task-content">
                                        <h3 className="user-task-title">{task.taskName}</h3>
                                        <Tag
                                            color={getPriorityColor(task.priority)}
                                            className="user-task-priority-tag"
                                        >
                                            {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1) || 'Medium'} Priority
                                        </Tag>
                                    </div>
                                </div>

                                {/* Middle Section: Slot/Delivery Info */}
                                <div className="user-task-middle-section">
                                    {primarySlot ? (
                                        <div className="user-task-delivery-info">
                                            <span className="user-delivery-label">Delivery:</span>
                                            <span className="user-delivery-value">
                                                {primarySlotDate ? `${primarySlotDate.format('MMM D')} • ` : ''}
                                                {primarySlot}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="user-task-delivery-info">
                                            <span className="user-delivery-label">Time:</span>
                                            <span className="user-delivery-value">{task.timeSpend || 'Not specified'}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Right Section: Assigned To, Status, Chat, Menu */}
                                <div className="user-task-right-section">
                                    <div className="user-task-assigner-section">
                                        <BsPerson className="user-assigner-icon" />
                                        <div className="user-assigner-info">
                                            <span className="user-assigner-name-text">
                                                {getAssignerName(task.userId)}
                                            </span>
                                            <span className="user-assigner-label-text">Assigned to</span>
                                        </div>
                                    </div>
                                    <Tag
                                        color={isCompleted ? 'green' : taskStatus === 'in-progress' ? 'blue' : 'orange'}
                                        className="user-task-status-tag"
                                    >
                                        {taskStatus.charAt(0).toUpperCase() + taskStatus.slice(1)}
                                    </Tag>
                                    <Button
                                        type="text"
                                        icon={<BsChat />}
                                        className="user-task-chat-btn"
                                        onClick={() => handleViewTask(task)}
                                    />
                                    <Dropdown
                                        menu={{ items: menuItems, onClick: handleMenuClick }}
                                        trigger={['click']}
                                        placement="bottomRight"
                                    >
                                        <Button
                                            type="text"
                                            icon={<BsThreeDots />}
                                            className="user-task-menu-btn"
                                        />
                                    </Dropdown>
                                    <Popconfirm
                                        title="Mark task as completed?"
                                        okText="Yes, complete"
                                        cancelText="Cancel"
                                        placement="topRight"
                                        open={confirmTaskId === task._id}
                                        onOpenChange={(open) => setConfirmTaskId(open ? task._id : null)}
                                        onConfirm={() => { setConfirmTaskId(null); handleMarkCompleted(task); }}
                                        onCancel={() => setConfirmTaskId(null)}
                                        disabled={isCompleted}
                                    >
                                        <span />
                                    </Popconfirm>
                                </div>
                            </div>
                        </Card>
                    );
                })
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
                destroyOnClose={false}
                forceRender
            >
                {selectedTask && (
                    <div className={`user-drawer-content theme-${theme}`}>
                        {/* Header Section - Grid Layout */}
                        <div className='user-drawer-header-grid'>
                            <div className="user-task-name-section">
                                <h2>{selectedTask.taskName}</h2>
                                <div className="user-task-assigner-drawer">
                                    <span className="user-assigner-label-drawer">Assigned by:</span>
                                    <span className="user-assigner-name-drawer">{getAssignerName(selectedTask.userId)}</span>
                                </div>
                            </div>
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

                        {/* Main Content Grid - 2 Columns */}
                        <div className='user-drawer-main-grid'>
                            {/* Left Column */}
                            <div className='user-drawer-left-column'>
                                {/* Scheduled Slots */}
                                {selectedTask.slots && selectedTask.slots.length > 0 && (
                                    <div className='user-scheduled-slots-section'>
                                        <h3 className="user-section-title">Scheduled Slots</h3>
                                        {selectedTask.slots.map((slot, index) => {
                                            const slotWindow = getSlotWindow(slot);
                                            if (!slotWindow) return null;

                                            return (
                                                <div key={`slot-${slot._id || index}`} className="user-slot-card">
                                                    <div className="user-slot-header">
                                                        <div className="user-slot-timewindow">
                                                            <BsClockHistory />
                                                            <span>{slotWindow}</span>
                                                        </div>
                                                        <Tag color="blue" className="user-slot-status-tag">{getSlotStatusLabel(slot.status)}</Tag>
                                                    </div>

                                                    <div className="user-slot-stats-grid">
                                                        <div className="user-slot-stat-item">
                                                            <span className="user-slot-stat-label">Allocated</span>
                                                            <strong className="user-slot-stat-value">{slot.durationMinutes ?? 0} mins</strong>
                                                        </div>
                                                        <div className="user-slot-stat-item">
                                                            <span className="user-slot-stat-label">Extended</span>
                                                            <strong className="user-slot-stat-value">{slot.extensionMinutes ?? 0} mins</strong>
                                                        </div>
                                                    </div>

                                                    {slot.extensionHistory && slot.extensionHistory.length > 0 && (
                                                        <div className="user-slot-history">
                                                            {slot.extensionHistory.map((entry, entryIndex) => (
                                                                <div key={`slot-history-${slot._id || index}-${entry._id || entryIndex}`} className="user-slot-history-item">
                                                                    <div className="user-slot-history-meta">
                                                                        <Tag color={getExtensionStatusColor(entry.status)} className="user-history-tag">{entry.status || 'pending'}</Tag>
                                                                        <span className="user-history-mins">{(entry.minutesApproved ?? entry.minutesRequested) || 0} mins</span>
                                                                        {entry.requestedAt && (
                                                                            <span className="user-history-date">{dayjs(entry.requestedAt).format('MMM D, hh:mm A')}</span>
                                                                        )}
                                                                    </div>
                                                                    {entry.reason && (
                                                                        <p className="user-slot-history-reason">Reason: {entry.reason}</p>
                                                                    )}
                                                                    {entry.note && (
                                                                        <p className="user-slot-history-note">Assigner note: {entry.note}</p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="user-slot-actions">
                                                        <Button
                                                            size="small"
                                                            type="default"
                                                            icon={<BsPlusCircle />}
                                                            className="user-slot-request-btn"
                                                            onClick={() => openExtensionModal(selectedTask, slot)}
                                                            disabled={selectedTask.taskStatus === 'completed' || slot.extensionHistory?.some(entry => (entry.status || 'pending').toLowerCase() === 'pending')}
                                                            title={slot.extensionHistory?.some(entry => (entry.status || 'pending').toLowerCase() === 'pending') ? 'Awaiting approval from assigner' : undefined}
                                                        >
                                                            Request Extra Time
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Time Tracking Overview */}
                                {selectedTask.timeTracking && (
                                    <div className='user-time-tracking-section'>
                                        <h3 className="user-section-title">Time Tracking Overview</h3>
                                        
                                        <br /><div className="user-time-tracking-grid">
                                            <div className="user-time-tracking-stat">
                                                <span className="user-tracking-label">Original Slot</span>
                                                <strong className="user-tracking-value">{selectedTask.timeTracking.originalSlotMinutes ?? 0} mins</strong>
                                            </div>
                                            <div className="user-time-tracking-stat">
                                                <span className="user-tracking-label">Extended</span>
                                                <strong className="user-tracking-value">{selectedTask.timeTracking.totalExtendedMinutes ?? 0} mins</strong>
                                            </div>
                                            <div className="user-time-tracking-stat">
                                                <span className="user-tracking-label">Worked</span>
                                                <strong className="user-tracking-value">{selectedTask.timeTracking.totalWorkedMinutes ?? 0} mins</strong>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                               
                            </div>

                            {/* Right Column */}
                            <div className='user-drawer-right-column'>
                                {/* Time Spent Banner */}
                                <div className="user-time-spend-card">
                                    <div className="user-time-icon-wrapper">
                                        <BsClock className="user-time-icon" />
                                    </div>
                                    <div className="user-time-content">
                                        <span className="user-time-label">Time Spent on this project</span>
                                        <div className="user-time-value-wrapper">
                                            <h2 className="user-time-value">{selectedTask.timeSpend || 'Not specified'}</h2>
                                        </div>
                                    </div>
                                </div>

                                {/* Client Information */}
                                <div className='user-client-info-section'>
                                    <h3 className="user-section-title">Client Information</h3>
                                    <div className="user-client-info-grid">
                                        <div className="user-info-row">
                                            <span className="user-info-label">Client:</span>
                                            <span className="user-info-value">{selectedTask.clientName}</span>
                                        </div>
                                        <div className="user-info-row">
                                            <span className="user-info-label">Task Assign Position:</span>
                                            <span className="user-info-value">{selectedTask.category}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Attachments Section */}
                                {selectedTask.taskImages && selectedTask.taskImages.length > 0 && (
                                    <div className='user-attachments-section'>
                                        <h3 className="user-section-title">Attachments</h3>
                                        <div className="user-attachments-list">
                                            {selectedTask.taskImages.map((image, index) => {
                                                // Truncate link to 60 characters
                                                const truncatedLink = image.length > 100 ? `${image.substring(0, 100)}...` : image;
                                                
                                                // Function to handle view (open in new tab)
                                                const handleView = () => {
                                                    window.open(image, '_blank', 'noopener,noreferrer');
                                                };
                                                
                                                // Function to handle download
                                                const handleDownload = () => {
                                                    fetch(image)
                                                        .then(response => response.blob())
                                                        .then(blob => {
                                                            const url = window.URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            // Extract filename from URL or use a default name
                                                            const urlParts = image.split('/');
                                                            const filename = urlParts[urlParts.length - 1] || `attachment-${index + 1}`;
                                                            a.download = filename;
                                                            document.body.appendChild(a);
                                                            a.click();
                                                            window.URL.revokeObjectURL(url);
                                                            document.body.removeChild(a);
                                                        })
                                                        .catch(error => {
                                                            console.error('Download failed:', error);
                                                            // Fallback: open in new tab
                                                            window.open(image, '_blank', 'noopener,noreferrer');
                                                        });
                                                };
                                                
                                                return (
                                                    <div key={index} className="user-attachment-item">
                                                        <div className="user-attachment-icon">📄</div>
                                                        <div className="user-attachment-info">
                                                            <div 
                                                                className="user-attachment-name"
                                                                title={image}
                                                                onClick={handleView}
                                                                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                            >
                                                                {truncatedLink}
                                                            </div>
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
                                                            <Button 
                                                                type="text" 
                                                                size="small" 
                                                                icon={<AiOutlineEye />}
                                                                onClick={handleView}
                                                            >
                                                                View
                                                            </Button>
                                                            <Button 
                                                                type="text" 
                                                                size="small"
                                                                onClick={handleDownload}
                                                            >
                                                                Download
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                        </div>
                        <div className='user-description-section'>
                                    <h3 className="user-section-title">Description</h3>
                                    <div className="user-description-content">
                                        <p className="user-description-text">{selectedTask.description || 'No description provided.'}</p>
                                    </div>
                                </div>
                        {/* Task Chat - Full Width */}
                        <div className="user-task-chat-wrapper">
                            <TaskChat
                                taskId={selectedTask._id}
                                receiverId={selectedTask.userId === userId ? selectedTask.receiverUserId : selectedTask.userId}
                                className="user-task-chat"
                                title="Task Related Chat"
                                placeholder="Add a comment..."
                                showTitle={true}
                                height="500px"
                            />
                        </div>
                    </div>
                )}
            </Drawer>
            <Modal
                title="Request Extra Time"
                open={extensionModalVisible}
                onCancel={closeExtensionModal}
                onOk={() => extensionForm.submit()}
                okText="Send Request"
                confirmLoading={requestingExtension}
                destroyOnClose
                className="user-extension-modal"
            >
                <div className="user-extension-modal-meta">
                    <div>
                        <span className="label">Current Slot</span>
                        <strong>{activeSlot ? getSlotWindow(activeSlot) : '--'}</strong>
                    </div>
                    <div>
                        <span className="label">Allocated</span>
                        <strong>{activeSlot?.durationMinutes ?? 0} mins</strong>
                    </div>
                    <div>
                        <span className="label">Extended</span>
                        <strong>{activeSlot?.extensionMinutes ?? 0} mins</strong>
                    </div>
                </div>
                <Form
                    layout="vertical"
                    form={extensionForm}
                    onFinish={handleExtensionSubmit}
                    className="user-extension-form"
                >
                    <Form.Item
                        label="How much extra time do you need?"
                        name="minutesRequested"
                        rules={[{ required: true, message: 'Please select an additional duration' }]}
                    >
                        <Select
                            placeholder="Select minutes"
                            options={minuteOptions.map(value => ({
                                value,
                                label: `${value} minutes`
                            }))}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Share the reason"
                        name="reason"
                        rules={[{ required: true, message: 'Please let your assigner know why you need more time' }]}
                    >
                        <Input.TextArea
                            rows={4}
                            placeholder="Add details about blockers, revisions or follow-up actions..."
                            maxLength={400}
                            showCount
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AllUserTaskEntries;
