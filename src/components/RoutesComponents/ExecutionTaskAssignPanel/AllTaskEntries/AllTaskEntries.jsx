import React, { useState, useEffect, useEffect, useRef } from 'react';
import './AllTaskEntries.css';
import { Card, Spin, Tag, Button, Row, Col, Drawer, Image, Modal, Form, Input } from 'antd';
import { useSelector } from 'react-redux';
import { selectUserId } from '../../../../store/slices/authSlice';
import { selectTheme } from '../../../../store/slices/themeSlice';
import { selectUser } from '../../../../store/slices/authSlice';
import { useGetTaskAssignQuery, useArchiveTaskMutation, useRespondTaskExtensionMutation } from '../../../../store/api';
import { useNotification } from '../../../../contexts/NotificationContext';
import { useTaskChatStore } from '../../../../contexts/TaskChatContext';
import { BsClock, BsClockHistory, BsChat, BsPerson } from 'react-icons/bs';
import { AiOutlineEye, AiOutlineEdit, AiOutlineDelete, AiOutlineExclamationCircle } from 'react-icons/ai';
import { IoClose } from 'react-icons/io5';
import TaskChat from '../../../PortalCommonComponents/TaskChat/TaskChat';
import dayjs from 'dayjs';
import { emitTaskExtensionResponded, onTaskExtensionUpdated, offTaskExtensionUpdated } from '../../../../utils/socket';

const AllTaskEntries = ({ searchTerm = '', selectedDateRange = null, statusFilter = 'all' }) => {
    const userId = useSelector(selectUserId);
    const user = useSelector(selectUser);
    const theme = useSelector(selectTheme);
    const { data: tasksData, isLoading, error, refetch } = useGetTaskAssignQuery(userId);

    const [viewDrawerVisible, setViewDrawerVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [archiveModalVisible, setArchiveModalVisible] = useState(false);
    const [taskToArchive, setTaskToArchive] = useState(null);
    const { ensureTaskRoom } = useTaskChatStore();

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
    const [respondTaskExtension, { isLoading: respondingExtension }] = useRespondTaskExtensionMutation();

    const [extensionResponseModal, setExtensionResponseModal] = useState({
        visible: false,
        action: 'approved',
        slot: null,
        extension: null,
        task: null
    });
    const [responseForm] = Form.useForm();
    const selectedTaskRef = useRef(null);

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
        if (task.userId === userId && task.receiverUserId) return task.receiverUserId;
        if (task.userId && task.userId !== userId) return task.userId;

        return 'Unknown';
    };

    const parseTimeSlotValue = (value) => {
        if (!value) return null;

        const formats = ['HH:mm', 'HH:mm:ss', 'hh:mm A', 'h:mm A'];
        for (const fmt of formats) {
            const parsed = dayjs(value, fmt, true);
            if (parsed.isValid()) {
                return parsed;
            }
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

    const getPendingExtensionCount = (task) => {
        if (!task?.slots) return 0;
        return task.slots.reduce((count, slot) => {
            const history = slot?.extensionHistory || [];
            return count + history.filter(entry => (entry.status || 'pending').toLowerCase() === 'pending').length;
        }, 0);
    };

    const getTotalExtendedMinutes = (task) => {
        if (!task?.slots) return 0;
        return task.slots.reduce((sum, slot) => sum + (slot.extensionMinutes || 0), 0);
    };

    const formatExtensionTimestamp = (timestamp) => {
        if (!timestamp) return null;
        return dayjs(timestamp).format('MMM D, hh:mm A');
    };

    useEffect(() => {
        selectedTaskRef.current = selectedTask;
    }, [selectedTask]);

    useEffect(() => {
        if (selectedTaskRef.current && tasksData?.data) {
            const updatedTask = tasksData.data.find(task => task._id === selectedTaskRef.current._id);
            if (updatedTask) {
                setSelectedTask(prev => {
                    if (!prev) return updatedTask;
                    if (prev.updatedAt === updatedTask.updatedAt && prev.timeTracking?.totalExtendedMinutes === updatedTask.timeTracking?.totalExtendedMinutes) {
                        return prev;
                    }
                    return updatedTask;
                });
            }
        }
    }, [tasksData]);

    useEffect(() => {
        const handleExtensionUpdate = (payload) => {
            if (!payload) return;
            const { receiverUserId, userId: creatorUserId } = payload;
            if (receiverUserId === userId || creatorUserId === userId) {
                refetch();
            }
        };

        onTaskExtensionUpdated(handleExtensionUpdate);
        return () => {
            offTaskExtensionUpdated(handleExtensionUpdate);
        };
    }, [refetch, userId]);

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
            const taskDate = new Date(task.createdAt);
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

    useEffect(() => {
        sortedTasks.forEach(task => ensureTaskRoom(task._id));
    }, [sortedTasks, ensureTaskRoom]);

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

    const openExtensionResponseModal = (action, slot, extension, task) => {
        if (!slot || !extension || !task) return;
        setExtensionResponseModal({
            visible: true,
            action,
            slot,
            extension,
            task
        });
        responseForm.setFieldsValue({ note: '' });
    };

    const closeExtensionResponseModal = () => {
        setExtensionResponseModal({
            visible: false,
            action: 'approved',
            slot: null,
            extension: null,
            task: null
        });
        responseForm.resetFields();
    };

    const handleExtensionResponseSubmit = async (values) => {
        const { action, slot, extension, task } = extensionResponseModal;
        if (!slot || !extension || !task) return;

        const payload = {
            taskId: task._id,
            slotId: slot._id,
            extensionId: extension._id,
            body: {
                decision: action,
                respondedBy: user?.userId || userId,
                note: values.note?.trim() || undefined
            }
        };

        try {
            await respondTaskExtension(payload).unwrap();
            showSuccess(`Extension request ${action === 'approved' ? 'approved' : 'rejected'} successfully.`);
            emitTaskExtensionResponded({
                taskId: task._id,
                slotId: slot._id,
                extensionId: extension._id,
                status: action,
                receiverUserId: task.receiverUserId,
                userId: user?.userId || userId
            });
            closeExtensionResponseModal();
            await refetch();
        } catch (err) {
            showError(err?.data?.message || 'Failed to respond to extension request');
        }
    };

    return (
        <div className="all-task-entries">
            {sortedTasks.length === 0 ? (
                <div className="empty-state">
                    {searchTerm || selectedDateRange ? 'No tasks match your filters.' : 'No tasks found. Create your first task!'}
                </div>
            ) : (
                sortedTasks.map((task) => {
                    const primarySlot = getSlotWindow(task.slots?.[0]);
                    const primarySlotStatus = task.slots?.[0]?.status ? getSlotStatusLabel(task.slots[0].status) : null;
                    const pendingExtensionCount = getPendingExtensionCount(task);
                    const totalExtendedMinutes = getTotalExtendedMinutes(task);

                    return (
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
                                            {primarySlot && (
                                                <div className="task-slot">
                                                    <BsClockHistory className="icon" />
                                                    <span>
                                                        Slot: {primarySlot}
                                                        {primarySlotStatus ? ` (${primarySlotStatus})` : ''}
                                                    </span>
                                                </div>
                                            )}
                                            {totalExtendedMinutes > 0 && (
                                                <div className="task-extension-summary">
                                                    <BsClockHistory className="icon" />
                                                    <span>Extended: {totalExtendedMinutes} mins</span>
                                                </div>
                                            )}
                                            {pendingExtensionCount > 0 && (
                                                <div className="task-extension-alert">
                                                    <Tag color="orange">
                                                        {pendingExtensionCount} pending extension{pendingExtensionCount > 1 ? 's' : ''}
                                                    </Tag>
                                                </div>
                                            )}
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
                    );
                })
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
                destroyOnClose={false}
                forceRender
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
                                <Tag color={getStatusColor(selectedTask.taskStatus)} className="priority-tag-pill" style={{ marginLeft: 8 }}>
                                    {(selectedTask.taskStatus || 'pending').replace(/^./, c => c.toUpperCase())}
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
                        {selectedTask.slots && selectedTask.slots.length > 0 && (
                            <Card title="Scheduled Slots" className='scheduled-slots-card MarginBottomMedium'>
                                {selectedTask.slots.map((slot, index) => {
                                    const slotWindow = getSlotWindow(slot);
                                    if (!slotWindow) return null;
                                    const slotPendingCount = (slot.extensionHistory || []).filter(entry => (entry.status || 'pending').toLowerCase() === 'pending').length;
                                    return (
                                        <div key={`slot-${slot._id || index}`} className="manager-slot-row">
                                            <div className="manager-slot-time">
                                                <div className="manager-slot-timewindow">
                                                    <BsClockHistory style={{ color: 'var(--brand-color)' }} />
                                                    <span>{slotWindow}</span>
                                                </div>
                                                <Tag color="blue">{getSlotStatusLabel(slot.status)}</Tag>
                                            </div>
                                            <div className="manager-slot-stats">
                                                <div>
                                                    <span>Allocated</span>
                                                    <strong>{slot.durationMinutes ?? 0} mins</strong>
                                                </div>
                                                <div>
                                                    <span>Extended</span>
                                                    <strong>{slot.extensionMinutes ?? 0} mins</strong>
                                                </div>
                                                {slotPendingCount > 0 && (
                                                    <div>
                                                        <span>Pending</span>
                                                        <strong>{slotPendingCount} request{slotPendingCount > 1 ? 's' : ''}</strong>
                                                    </div>
                                                )}
                                            </div>
                                            {slot.extensionHistory && slot.extensionHistory.length > 0 && (
                                                <div className="manager-slot-history">
                                                    {slot.extensionHistory.map((entry, entryIndex) => {
                                                        const status = (entry.status || 'pending').toLowerCase();
                                                        const minutes = entry.minutesApproved ?? entry.minutesRequested ?? 0;
                                                        return (
                                                            <div key={`slot-history-${slot._id || index}-${entry._id || entryIndex}`} className={`manager-slot-history-item status-${status}`}>
                                                                <div className="manager-slot-history-meta">
                                                                    <Tag color={getExtensionStatusColor(entry.status)}>{(entry.status || 'pending').replace(/^./, c => c.toUpperCase())}</Tag>
                                                                    <span>{minutes} mins</span>
                                                                    {entry.requestedAt && <span>{formatExtensionTimestamp(entry.requestedAt)}</span>}
                                                                    {entry.requestedBy && <span>By: {entry.requestedBy}</span>}
                                                                </div>
                                                                {entry.reason && (
                                                                    <p className="manager-slot-history-reason">Reason: {entry.reason}</p>
                                                                )}
                                                                {entry.note && (
                                                                    <p className="manager-slot-history-note">Assigner note: {entry.note}</p>
                                                                )}
                                                                {status === 'pending' && (
                                                                    <div className="manager-slot-history-actions">
                                                                        <Button
                                                                            type="primary"
                                                                            size="small"
                                                                            onClick={() => openExtensionResponseModal('approved', slot, entry, selectedTask)}
                                                                        >
                                                                            Approve
                                                                        </Button>
                                                                        <Button
                                                                            danger
                                                                            size="small"
                                                                            onClick={() => openExtensionResponseModal('rejected', slot, entry, selectedTask)}
                                                                        >
                                                                            Reject
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </Card>
                        )}

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
                        />
                    </div>
                )}
            </Drawer>
            <Modal
                title={`${extensionResponseModal.action === 'approved' ? 'Approve' : 'Reject'} Extension Request`}
                open={extensionResponseModal.visible}
                onCancel={closeExtensionResponseModal}
                onOk={() => responseForm.submit()}
                okText={extensionResponseModal.action === 'approved' ? 'Approve' : 'Reject'}
                okButtonProps={{ danger: extensionResponseModal.action === 'rejected' }}
                confirmLoading={respondingExtension}
                destroyOnClose
                className="manager-extension-modal"
            >
                <div className="manager-extension-modal-meta">
                    <div>
                        <span className="label">Requested</span>
                        <strong>{extensionResponseModal.extension ? (extensionResponseModal.extension.minutesApproved ?? extensionResponseModal.extension.minutesRequested ?? 0) : 0} mins</strong>
                    </div>
                    <div>
                        <span className="label">Slot</span>
                        <strong>{extensionResponseModal.slot ? getSlotWindow(extensionResponseModal.slot) : '--'}</strong>
                    </div>
                    <div>
                        <span className="label">From</span>
                        <strong>{extensionResponseModal.extension?.requestedBy || 'Unknown'}</strong>
                    </div>
                </div>
                {extensionResponseModal.extension?.reason && (
                    <div className="manager-extension-reason">
                        <span className="label">Reason</span>
                        <p>{extensionResponseModal.extension.reason}</p>
                    </div>
                )}
                <Form
                    layout="vertical"
                    form={responseForm}
                    onFinish={handleExtensionResponseSubmit}
                    className="manager-extension-form"
                >
                    <Form.Item label="Add a note (optional)" name="note">
                        <Input.TextArea
                            rows={3}
                            maxLength={300}
                            placeholder="Share context with the assignee..."
                        />
                    </Form.Item>
                </Form>
            </Modal>

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