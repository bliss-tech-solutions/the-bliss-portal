import React, { useState, useEffect, useRef } from 'react';
import './AllUserTaskEntries.css';
import { Card, Tag, Button, Row, Col, Drawer, Spin, Popconfirm, Modal, Form, Input, Select } from 'antd';
import { useSelector } from 'react-redux';
import { selectTheme } from '../../../../../store/slices/themeSlice';
import { selectUserId, selectUser } from '../../../../../store/slices/authSlice';
import { useGetTaskAssignQuery, useGetAllUsersQuery, useUpdateTaskStatusMutation, useRequestTaskExtensionMutation } from '../../../../../store/api';
import { useNotification } from '../../../../../contexts/NotificationContext';
import { BsClock, BsClockHistory, BsChat, BsPerson, BsPlusCircle } from 'react-icons/bs';
import { AiOutlineEye } from 'react-icons/ai';
import { IoClose } from 'react-icons/io5';
import TaskChat from '../../../../PortalCommonComponents/TaskChat/TaskChat';
import dayjs from 'dayjs';
import {
    emitTaskExtensionRequested,
    onTaskExtensionUpdated,
    offTaskExtensionUpdated
} from '../../../../../utils/socket';

const AllUserTaskEntries = () => {
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

    useEffect(() => {
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

        onTaskExtensionUpdated(handleExtensionUpdate);

        return () => {
            offTaskExtensionUpdated(handleExtensionUpdate);
        };
    }, [refetch, userId]);

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

    // Filter out archived tasks and sort latest first
    const tasks = (tasksData?.data?.filter(task => task.isArchived !== true) || [])
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
                <div className="user-empty-state">
                    No tasks assigned to you yet.
                </div>
            ) : (
                tasks.map((task) => {
                    const primarySlot = getSlotWindow(task.slots?.[0]);
                    const primarySlotStatus = task.slots?.[0]?.status ? getSlotStatusLabel(task.slots[0].status) : null;
                    const primarySlotStart = task.slots?.[0]?.start ? parseTimeSlotValue(task.slots[0].start) : null;
                    const primarySlotDate = task.slots?.[0]?.slotDate ? dayjs(task.slots[0].slotDate) : primarySlotStart;
                    const primarySlotDuration = task.slots?.[0]?.durationMinutes;

                    return (
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
                                                <span className="user-assigner-name">{getAssignerName(task.userId)}</span>
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
                                                    {getAssignerName(task.userId)}
                                                </span>
                                            </div>
                                            {primarySlot && (
                                                <div className="user-task-slot">
                                                    <BsClockHistory className="icon" />
                                                    <span>
                                                        Slot: {primarySlotDate ? `${primarySlotDate.format('MMM D')} • ` : ''}{primarySlot}
                                                        {primarySlotStatus ? ` (${primarySlotStatus})` : ''}
                                                        {primarySlotDuration ? ` · ${primarySlotDuration} mins` : ''}
                                                        {task.slots?.[0]?.extensionMinutes ? ` (+${task.slots[0].extensionMinutes} mins)` : ''}
                                                    </span>
                                                </div>
                                            )}
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
            >
                {selectedTask && (
                    <div className={`user-drawer-content theme-${theme}`}>
                        {/* Task Name */}
                        <div className='user-task-name-and-priority-row MarginBottomSmall'>
                            <div className="user-task-name-section">
                                <h2>{selectedTask.taskName}</h2>
                                <div className="user-task-assigner-drawer">
                                    <span className="user-assigner-label-drawer">Assigned by:</span>
                                    <span className="user-assigner-name-drawer">{getAssignerName(selectedTask.userId)}</span>
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
                        {selectedTask.slots && selectedTask.slots.length > 0 && (
                            <Card title="Scheduled Slots" className='user-scheduled-slots-card MarginBottomMedium'>
                                {selectedTask.slots.map((slot, index) => {
                                    const slotWindow = getSlotWindow(slot);
                                    if (!slotWindow) return null;

                                    return (
                                        <div key={`slot-${slot._id || index}`} className="user-slot-row">
                                            <div className="user-slot-time">
                                                <div className="user-slot-timewindow">
                                                    <BsClockHistory style={{ color: 'var(--brand-color)' }} />
                                                    <span>{slotWindow}</span>
                                                </div>
                                                <Tag color="blue">{getSlotStatusLabel(slot.status)}</Tag>
                                            </div>

                                            <div className="user-slot-stats">
                                                <div>
                                                    <span>Allocated</span>
                                                    <strong>{slot.durationMinutes ?? 0} mins</strong>
                                                </div>
                                                <div>
                                                    <span>Extended</span>
                                                    <strong>{slot.extensionMinutes ?? 0} mins</strong>
                                                </div>
                                            </div>

                                            {slot.extensionHistory && slot.extensionHistory.length > 0 && (
                                                <div className="user-slot-history">
                                                    {slot.extensionHistory.map((entry, entryIndex) => (
                                                        <div key={`slot-history-${slot._id || index}-${entry._id || entryIndex}`} className="user-slot-history-item">
                                                            <div className="user-slot-history-meta">
                                                                <Tag color={getExtensionStatusColor(entry.status)}>{entry.status || 'pending'}</Tag>
                                                                <span>{(entry.minutesApproved ?? entry.minutesRequested) || 0} mins</span>
                                                                {entry.requestedAt && (
                                                                    <span>{dayjs(entry.requestedAt).format('MMM D, hh:mm A')}</span>
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
                            </Card>
                        )}

                        {selectedTask.timeTracking && (
                            <Card title="Time Tracking Overview" className='user-time-tracking-card MarginBottomMedium'>
                                <div className="user-time-tracking-grid">
                                    <div className="user-time-tracking-stat">
                                        <span>Original Slot</span>
                                        <strong>{selectedTask.timeTracking.originalSlotMinutes ?? 0} mins</strong>
                                    </div>
                                    <div className="user-time-tracking-stat">
                                        <span>Extended</span>
                                        <strong>{selectedTask.timeTracking.totalExtendedMinutes ?? 0} mins</strong>
                                    </div>
                                    <div className="user-time-tracking-stat">
                                        <span>Worked</span>
                                        <strong>{selectedTask.timeTracking.totalWorkedMinutes ?? 0} mins</strong>
                                    </div>
                                </div>
                            </Card>
                        )}

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
                            receiverId={selectedTask.userId === userId ? selectedTask.receiverUserId : selectedTask.userId}
                            className="user-task-chat"
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
