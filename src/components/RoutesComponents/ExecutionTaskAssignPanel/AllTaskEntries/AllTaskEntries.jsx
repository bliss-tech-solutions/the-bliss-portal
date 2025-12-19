import React, { useState, useEffect, useRef } from 'react';
import './AllTaskEntries.css';
import { Card, Tag, Button, Row, Col, Drawer, Image, Modal, Form, Input } from 'antd';
import { useSelector } from 'react-redux';
import { selectUserId } from '../../../../store/slices/authSlice';
import { selectTheme } from '../../../../store/slices/themeSlice';
import { selectUser } from '../../../../store/slices/authSlice';
import { useGetTaskAssignQuery, useArchiveTaskMutation, useRespondTaskExtensionMutation } from '../../../../store/api';
import { useNotification } from '../../../../contexts/NotificationContext';
import { useTaskChatStore } from '../../../../contexts/TaskChatContext';
import {
    BsClock,
    BsClockHistory,
    BsChat,
    BsPerson,
    BsCalendar4Week,
    BsBriefcase,
    BsCalendar3,
    BsChatSquareDots
} from 'react-icons/bs';
import { AiOutlineEye, AiOutlineEdit, AiOutlineDelete, AiOutlineExclamationCircle } from 'react-icons/ai';
import { IoClose } from 'react-icons/io5';
import TaskChat from '../../../PortalCommonComponents/TaskChat/TaskChat';
import dayjs from 'dayjs';
import { emitTaskExtensionResponded, onTaskExtensionUpdated, offTaskExtensionUpdated, onTaskAdded, offTaskAdded, onTaskUpdated, offTaskUpdated } from '../../../../utils/socket';
import EmptyState from '../../../CommonComponents/EmptyState/EmptyState';
import InlineLoader from '../../../CommonComponents/InlineLoader/InlineLoader';

const AllTaskEntries = ({
    searchTerm = '',
    selectedDateRange = null,
    statusFilter = 'all',
    userFilter = 'all',
    categoryFilter = 'all',
    // When true → show ONLY archived tasks; when false → hide archived tasks
    showArchivedOnly = false
}) => {
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

        // First, try to parse as ISO datetime string (e.g., "2025-11-21T07:00:00.000Z")
        let parsed = dayjs(value);
        if (parsed.isValid()) {
            // If it's a full datetime, we'll extract the time portion when formatting
            return parsed;
        }

        // Fall back to time-only formats
        const formats = ['HH:mm', 'HH:mm:ss', 'hh:mm A', 'h:mm A'];
        for (const fmt of formats) {
            parsed = dayjs(value, fmt, true);
            if (parsed.isValid()) {
                return parsed;
            }
        }
        return null;
    };

    const getSlotWindow = (slot) => {
        if (!slot) return null;
        let start = parseTimeSlotValue(slot.start);
        let end = parseTimeSlotValue(slot.end);

        // If parsing failed, try direct ISO datetime parsing
        if (!start && slot.start) {
            start = dayjs(slot.start);
        }
        if (!end && slot.end) {
            end = dayjs(slot.end);
        }

        if (!start || !end || !start.isValid() || !end.isValid()) return null;

        // Indian 12-hour format: h:mm A (e.g., "9:30 AM" instead of "09:30 AM")
        return `${start.format('h:mm A')} - ${end.format('h:mm A')}`;
    };

    const getSlotStatusLabel = (status) => {
        if (!status) return 'Scheduled';
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const getSlotStatusColor = (status) => {
        const normalized = (status || '').toLowerCase();
        if (normalized === 'completed') return 'green';
        if (normalized === 'in-progress') return 'blue';
        if (normalized === 'pending') return 'gold';
        return 'default';
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
        // Indian 12-hour format: h:mm A (e.g., "9:30 AM" instead of "09:30 AM")
        return dayjs(timestamp).format('MMM D, h:mm A');
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

    // Real-time task updates via socket
    useEffect(() => {
        // Handle task creation events
        const handleTaskAdded = (taskData) => {
            if (!taskData) return;

            // Check if this task is created by current user (execution role)
            const isCreatedByCurrentUser = taskData.userId === userId;

            if (isCreatedByCurrentUser) {
                console.log('✅ New task created via socket:', taskData);
                // Refetch tasks to show the new task in the list
                refetch();
            }
        };

        // Handle task update events
        const handleTaskUpdated = (taskData) => {
            if (!taskData) return;

            console.log('✅ Task updated via socket:', taskData);
            // Refetch tasks to get updated task data
            refetch();

            // Update selected task if it's the one that was updated
            if (selectedTaskRef.current && selectedTaskRef.current._id === taskData._id) {
                setSelectedTask(taskData);
            }
        };

        // Handle extension updates
        const handleExtensionUpdate = (payload) => {
            if (!payload) return;
            const { receiverUserId, userId: creatorUserId, requestedBy } = payload;
            // Refetch if current user is the assigner (receiverUserId) or the requester (requestedBy or creatorUserId)
            if (receiverUserId === userId || creatorUserId === userId || requestedBy === userId) {
                refetch();
            }
        };

        // Set up all socket listeners
        onTaskAdded(handleTaskAdded);
        onTaskUpdated(handleTaskUpdated);
        onTaskExtensionUpdated(handleExtensionUpdate);

        // Cleanup listeners on unmount
        return () => {
            offTaskAdded(handleTaskAdded);
            offTaskUpdated(handleTaskUpdated);
            offTaskExtensionUpdated(handleExtensionUpdate);
        };
    }, [refetch, userId]);

    const filteredTasks = (tasksData?.data || []).filter(task => {
        // Normalize archived flag in case backend sends boolean, string, or number
        const isArchivedFlag =
            task.isArchived === true ||
            task.isArchived === 'true' ||
            task.isArchived === 1;

        // Archived filter handling
        if (showArchivedOnly) {
            // In "Deleted" tab → only show archived tasks
            if (!isArchivedFlag) return false;
        } else {
            // In normal tabs → hide archived tasks
            if (isArchivedFlag) return false;
        }

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

        // User filter
        if (userFilter && userFilter !== 'all') {
            if (task.receiverUserId !== userFilter && task.userId !== userFilter) {
                return false;
            }
        }

        // Category filter (match against task category or position)
        if (categoryFilter && categoryFilter !== 'all') {
            const category = task.category || task.position || '';
            if (!category || category.toLowerCase() !== categoryFilter.toLowerCase()) {
                return false;
            }
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
            <div className="execution-task-loading">
                <InlineLoader text="Fetching assigned tasks…" color="var(--brand-color)" />
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
                <EmptyState
                    image="/Images/NoTaskAvaible.png"
                    imageAlt="No execution tasks"
                    title={searchTerm || selectedDateRange ? 'No tasks match your filters' : 'No execution tasks'}
                    description={searchTerm || selectedDateRange ? 'Try adjusting your filters to see more tasks.' : 'Create a task to get started.'}
                    className="compact"
                />
            ) : (
                <div className="execution-task-grid">
                    {sortedTasks.map((task) => {
                        const primarySlot = getSlotWindow(task.slots?.[0]);
                        const primarySlotStatus = task.slots?.[0]?.status ? getSlotStatusLabel(task.slots[0].status) : null;
                        const pendingExtensionCount = getPendingExtensionCount(task);
                        const totalExtendedMinutes = getTotalExtendedMinutes(task);
                        const createdDateFormatted = dayjs(task.createdAt).format('MMM D, YYYY');
                        const assignedDateFormatted = task.slots?.[0]?.slotDate
                            ? dayjs(task.slots[0].slotDate).format('MMM D, YYYY')
                            : '--';

                        return (
                            <div
                                key={task._id}
                                className="execution-task-card"
                            >
                                <div className="execution-task-card__header">
                                    <div>
                                        <h3 className="execution-task-title">{task.taskName}</h3>
                                        <p className="execution-task-client">{task.clientName || '—'}</p>
                                    </div>
                                    <div className="execution-task-tags">
                                        <Tag color={getPriorityColor(task.priority)}>
                                            {(task.priority || 'medium').toUpperCase()}
                                        </Tag>
                                        <Tag color={getStatusColor(task.taskStatus)}>
                                            {(task.taskStatus || 'pending').toUpperCase()}
                                        </Tag>
                                    </div>
                                </div>

                                <div className="execution-task-meta">
                                    <div className="meta-chip">
                                        <BsClock />
                                        <span>{formatDateTime(task.createdAt)}</span>
                                    </div>
                                    <div className="meta-chip">
                                        <BsPerson />
                                        <span>{getAssigneeDisplay(task)}</span>
                                    </div>
                                    <div className="meta-chip">
                                        <BsChat />
                                        <span>{task.chatCount || task.chatMessageCount || 0} chats</span>
                                    </div>
                                    {primarySlot && (
                                        <div className="meta-chip">
                                            <BsClockHistory />
                                            <span>
                                                {primarySlot}
                                                {primarySlotStatus ? ` • ${primarySlotStatus}` : ''}
                                            </span>
                                        </div>
                                    )}
                                    <div className="meta-chip">
                                        <BsCalendar4Week />
                                        <span>Created: {createdDateFormatted}</span>
                                    </div>
                                    <div className="meta-chip">
                                        <BsCalendar4Week />
                                        <span>Assigned: {assignedDateFormatted}</span>
                                    </div>
                                </div>

                                <div className="execution-task-stats">
                                    <div>
                                        <span className="label">Time Spend</span>
                                        <strong>{task.timeSpend || '--'}</strong>
                                    </div>
                                    <div>
                                        <span className="label">Extended</span>
                                        <strong>{totalExtendedMinutes} mins</strong>
                                    </div>
                                    <div>
                                        <span className="label">Pending extensions</span>
                                        <strong>{pendingExtensionCount}</strong>
                                    </div>
                                </div>

                                <div className="execution-task-actions">
                                    <Button
                                        icon={<AiOutlineEye />}
                                        onClick={() => handleViewTask(task)}
                                        className="global-secondary-btn"
                                        style={{ flex: 1 }}
                                    >
                                        View
                                    </Button>
                                    <Button
                                        icon={<AiOutlineEdit />}
                                        className="global-secondary-btn"
                                        style={{ flex: 1 }}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        danger
                                        icon={<AiOutlineDelete />}
                                        loading={isArchiving}
                                        onClick={() => handleShowArchiveModal(task)}
                                        className="global-secondary-btn"
                                        style={{ flex: 1, borderColor: '#ff4d4f', color: '#ff4d4f' }}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
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
                        {(() => {
                            const createdLabel = dayjs(selectedTask.createdAt).format('MMM D, YYYY');
                            const updatedLabel = dayjs(selectedTask.updatedAt).format('MMM D, YYYY');
                            const firstSlotDate = selectedTask.slots?.[0]?.slotDate
                                ? dayjs(selectedTask.slots[0].slotDate).format('MMM D, YYYY')
                                : '--';
                            const totalSlots = selectedTask.slots?.length || 0;
                            const pendingExtensions = getPendingExtensionCount(selectedTask);
                            const totalChats = selectedTask.chatCount || selectedTask.chatMessageCount || 0;
                            const assigneeName = getAssigneeDisplay(selectedTask);

                            // Debug: Log task slots data
                            console.log('📋 Task Slots Data:', {
                                totalSlots,
                                slots: selectedTask.slots,
                                hasSlots: !!selectedTask.slots && selectedTask.slots.length > 0
                            });

                            return (
                                <div className="task-details-layout">
                                    <section className="details-hero">
                                        <div>
                                            {/* <p className="details-hero-label">Task</p> */}
                                            <h2>{selectedTask.taskName}</h2>
                                            <div className="details-hero-meta">
                                                <span>Assigned to • {getAssigneeDisplay(selectedTask)}</span>
                                                <span>Last updated {updatedLabel}</span>
                                            </div>
                                        </div>
                                        <div className="details-hero-tags">
                                            <Tag color={getPriorityColor(selectedTask.priority)}>
                                                {(selectedTask.priority || 'medium').toUpperCase()}
                                            </Tag>
                                            <Tag color={getStatusColor(selectedTask.taskStatus)}>
                                                {(selectedTask.taskStatus || 'pending').toUpperCase()}
                                            </Tag>
                                        </div>
                                    </section>

                                    {(() => {
                                        // Collect all pending extension requests
                                        const pendingExtensionRequests = [];
                                        if (selectedTask.slots) {
                                            selectedTask.slots.forEach((slot, slotIndex) => {
                                                if (slot.extensionHistory) {
                                                    slot.extensionHistory.forEach((entry) => {
                                                        const status = (entry.status || 'pending').toLowerCase();
                                                        if (status === 'pending') {
                                                            pendingExtensionRequests.push({
                                                                slot,
                                                                slotIndex: slotIndex + 1,
                                                                extension: entry,
                                                                slotWindow: getSlotWindow(slot)
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }

                                        const overviewItems = [
                                            {
                                                label: 'Client',
                                                value: selectedTask.clientName || '--',
                                                icon: <BsBriefcase />
                                            },
                                            {
                                                label: 'Assigned to',
                                                value: assigneeName,
                                                icon: <BsPerson />
                                            },
                                            {
                                                label: 'Created on',
                                                value: createdLabel,
                                                icon: <BsCalendar3 />
                                            },
                                            {
                                                label: 'slot date',
                                                value: firstSlotDate,
                                                icon: <BsCalendar4Week />
                                            },
                                            {
                                                label: 'Pending extensions',
                                                value: pendingExtensions,
                                                icon: <BsClockHistory />
                                            },
                                            {
                                                label: 'Chats',
                                                value: totalChats,
                                                icon: <BsChatSquareDots />
                                            }
                                        ];

                                        const isAssigner = selectedTask.userId === userId;

                                        return (
                                            <>
                                                {/* Pending Extensions Alert Section */}
                                                {pendingExtensionRequests.length > 0 && isAssigner && (
                                                    <section className="details-section" style={{
                                                        borderColor: 'rgba(255, 193, 7, 0.3)',
                                                        backgroundColor: 'rgba(255, 193, 7, 0.05)'
                                                    }}>
                                                        <div className="details-section-header">
                                                            <h3 style={{ color: 'var(--brand-color)' }}>
                                                                ⚠️ Pending Extension Requests ({pendingExtensionRequests.length})
                                                            </h3>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            {pendingExtensionRequests.map((item, idx) => {
                                                                const minutes = item.extension.minutesApproved ?? item.extension.minutesRequested ?? 0;
                                                                return (
                                                                    <div key={`pending-ext-${idx}`} style={{
                                                                        padding: '12px',
                                                                        borderRadius: '8px',
                                                                        border: '1px solid rgba(255, 193, 7, 0.3)',
                                                                        backgroundColor: 'rgba(255, 255, 255, 0.02)'
                                                                    }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                                            <div>
                                                                                {/* <strong style={{ color: 'var(--primary-text)' }}>
                                                                                    Slot {item.slotIndex}: {item.slotWindow}
                                                                                </strong> */}
                                                                                <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px' }}>
                                                                                    Requested: <strong>{minutes} mins</strong> • {item.extension.requestedBy ? `By: ${item.extension.requestedBy}` : ''} • {formatExtensionTimestamp(item.extension.requestedAt)}
                                                                                </div>
                                                                            </div>
                                                                            <Tag color="orange">Pending</Tag>
                                                                        </div>
                                                                        {item.extension.reason && (
                                                                            <p style={{ margin: '8px 0', fontSize: '13px', color: 'var(--primary-text)' }}>
                                                                                <strong>Reason:</strong> {item.extension.reason}
                                                                            </p>
                                                                        )}
                                                                        <div className="details-slot-history-actions" style={{ marginTop: '8px' }}>
                                                                            <Button
                                                                                type="primary"
                                                                                size="small"
                                                                                onClick={() => openExtensionResponseModal('approved', item.slot, item.extension, selectedTask)}
                                                                            >
                                                                                Approve
                                                                            </Button>
                                                                            <Button
                                                                                danger
                                                                                size="small"
                                                                                onClick={() => openExtensionResponseModal('rejected', item.slot, item.extension, selectedTask)}
                                                                            >
                                                                                Reject
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </section>
                                                )}

                                                <section className="details-overview-grid">
                                                    {overviewItems.map((item, idx) => (
                                                        <div key={`${item.label}-${idx}`} className="details-overview-card">
                                                            <div className="details-overview-card__icon">
                                                                {item.icon}
                                                            </div>
                                                            <div className="details-overview-card__content">
                                                                <span>{item.label}</span>
                                                                <strong>{item.value}</strong>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </section>
                                            </>
                                        );
                                    })()}

                                    <div className="details-main-grid">
                                        <div className="details-column">
                                            <section className="details-section">
                                                <div className="details-section-header">
                                                    <h3>Scheduled Slots</h3>
                                                    <span>{totalSlots} {totalSlots === 1 ? 'slot' : 'slots'}</span>
                                                </div>
                                                {selectedTask.slots && selectedTask.slots.length > 0 ? (
                                                    <div className="details-slot-grid">
                                                        {selectedTask.slots.map((slot, index) => {
                                                            // Debug: Log slot data
                                                            console.log(`Slot ${index + 1}:`, {
                                                                start: slot.start,
                                                                end: slot.end,
                                                                slotDate: slot.slotDate,
                                                                status: slot.status,
                                                                durationMinutes: slot.durationMinutes
                                                            });
                                                            const slotWindow = getSlotWindow(slot);
                                                            const slotPendingCount = (slot.extensionHistory || []).filter(entry => (entry.status || 'pending').toLowerCase() === 'pending').length;
                                                            const slotDate = slot.slotDate ? dayjs(slot.slotDate).format('MMM D, YYYY') : '--';
                                                            const isAssigner = selectedTask.userId === userId;

                                                            // Parse start and end times separately for better display
                                                            // Indian 12-hour format: h:mm A (e.g., "9:30 AM" instead of "09:30 AM")
                                                            const startTime = parseTimeSlotValue(slot.start);
                                                            const endTime = parseTimeSlotValue(slot.end);

                                                            // Format times in Indian 12-hour format
                                                            let startTimeFormatted = 'Not set';
                                                            let endTimeFormatted = 'Not set';

                                                            if (startTime && startTime.isValid()) {
                                                                startTimeFormatted = startTime.format('h:mm A');
                                                            } else if (slot.start) {
                                                                // Try to extract time from ISO string as fallback
                                                                const isoStart = dayjs(slot.start);
                                                                if (isoStart.isValid()) {
                                                                    startTimeFormatted = isoStart.format('h:mm A');
                                                                } else {
                                                                    startTimeFormatted = slot.start;
                                                                }
                                                            }

                                                            if (endTime && endTime.isValid()) {
                                                                endTimeFormatted = endTime.format('h:mm A');
                                                            } else if (slot.end) {
                                                                // Try to extract time from ISO string as fallback
                                                                const isoEnd = dayjs(slot.end);
                                                                if (isoEnd.isValid()) {
                                                                    endTimeFormatted = isoEnd.format('h:mm A');
                                                                } else {
                                                                    endTimeFormatted = slot.end;
                                                                }
                                                            }

                                                            const hasValidTiming = (startTime && startTime.isValid()) && (endTime && endTime.isValid()) ||
                                                                (slot.start && dayjs(slot.start).isValid() && slot.end && dayjs(slot.end).isValid());

                                                            return (
                                                                <div key={`slot-${slot._id || index}`} className="details-slot-card-compact">
                                                                    {/* Header Row: Slot Number and Status */}
                                                                    <div className="details-slot-header">
                                                                        <span className="details-slot-chip">Slot {index + 1}</span>
                                                                        <Tag color={getSlotStatusColor(slot.status)} className="details-slot-status-tag">
                                                                            {getSlotStatusLabel(slot.status)}
                                                                        </Tag>
                                                                    </div>

                                                                    {/* Main Info Grid: Timing and Date side by side */}
                                                                    <div className="details-slot-info-grid">
                                                                        {/* Time Slot */}
                                                                        <div className="details-slot-info-item details-slot-time">
                                                                            <BsClock className="details-slot-icon" style={{ color: hasValidTiming ? 'var(--brand-color)' : 'var(--secondary-text)' }} />
                                                                            <div className="details-slot-info-content">
                                                                                <span className="details-slot-label">Time Slot</span>
                                                                                <strong className="details-slot-value">
                                                                                    {(startTimeFormatted !== 'Not set' && endTimeFormatted !== 'Not set')
                                                                                        ? `${startTimeFormatted} - ${endTimeFormatted}`
                                                                                        : slotWindow
                                                                                            ? slotWindow
                                                                                            : (slot.start && slot.end)
                                                                                                ? (() => {
                                                                                                    const tryStart = dayjs(slot.start);
                                                                                                    const tryEnd = dayjs(slot.end);
                                                                                                    if (tryStart.isValid() && tryEnd.isValid()) {
                                                                                                        return `${tryStart.format('h:mm A')} - ${tryEnd.format('h:mm A')}`;
                                                                                                    }
                                                                                                    return `${slot.start} - ${slot.end}`;
                                                                                                })()
                                                                                                : 'Timing not available'}
                                                                                </strong>
                                                                            </div>
                                                                        </div>

                                                                        {/* Booked Date */}
                                                                        <div className="details-slot-info-item details-slot-date">
                                                                            <BsCalendar4Week className="details-slot-icon" />
                                                                            <div className="details-slot-info-content">
                                                                                <span className="details-slot-label">Booked Date</span>
                                                                                <span className="details-slot-value">{slotDate !== '--' ? slotDate : 'Date not available'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Stats Grid: 4 columns */}
                                                                    <div className="details-slot-stats-compact">
                                                                        <div className="details-slot-stat-item">
                                                                            <span className="details-slot-stat-label">Allocated</span>
                                                                            <strong className="details-slot-stat-value">{slot.durationMinutes ?? 0} mins</strong>
                                                                        </div>
                                                                        <div className="details-slot-stat-item">
                                                                            <span className="details-slot-stat-label">Extended</span>
                                                                            <strong className="details-slot-stat-value">{slot.extensionMinutes ?? 0} mins</strong>
                                                                        </div>
                                                                        <div className="details-slot-stat-item">
                                                                            <span className="details-slot-stat-label">Pending</span>
                                                                            <strong className="details-slot-stat-value">{slotPendingCount}</strong>
                                                                        </div>
                                                                        <div className="details-slot-stat-item">
                                                                            <span className="details-slot-stat-label">Extensions</span>
                                                                            <strong className="details-slot-stat-value">{slot.extensionHistory?.length || 0}</strong>
                                                                        </div>
                                                                    </div>

                                                                    {slot.extensionHistory && slot.extensionHistory.length > 0 && (
                                                                        <div className="details-slot-history-compact">
                                                                            <div style={{
                                                                                marginBottom: '6px',
                                                                                fontSize: '12px',
                                                                                fontWeight: '600',
                                                                                color: 'var(--primary-text)',
                                                                                textTransform: 'uppercase',
                                                                                letterSpacing: '0.5px'
                                                                            }}>
                                                                                Extension Requests:
                                                                            </div>
                                                                            <div id='details-slot-extension-item'>
                                                                                {slot.extensionHistory.map((entry, entryIndex) => {
                                                                                    const status = (entry.status || 'pending').toLowerCase();
                                                                                    const minutes = entry.minutesApproved ?? entry.minutesRequested ?? 0;
                                                                                    const statusColor = getExtensionStatusColor(entry.status);
                                                                                    return (
                                                                                        <div key={`slot-history-${slot._id || index}-${entry._id || entryIndex}`} className="details-slot-extension-item">
                                                                                            {/* Extension Header: Status, Time, Date */}
                                                                                            <div className="details-slot-extension-header">
                                                                                                <Tag color={statusColor} className="details-slot-extension-status">
                                                                                                    {(entry.status || 'pending').replace(/^./, c => c.toUpperCase())}
                                                                                                </Tag>
                                                                                                <div className="details-slot-extension-meta">
                                                                                                    <span className="details-slot-extension-time">{minutes} mins</span>
                                                                                                    {entry.requestedAt && (
                                                                                                        <span className="details-slot-extension-date">{formatExtensionTimestamp(entry.requestedAt)}</span>
                                                                                                    )}
                                                                                                    {entry.requestedBy && (
                                                                                                        <span className="details-slot-extension-user">By: {entry.requestedBy}</span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* Extension Details: Reason and Note */}
                                                                                            {(entry.reason || entry.note) && (
                                                                                                <div className="details-slot-extension-details">
                                                                                                    {entry.reason && (
                                                                                                        <div className="details-slot-extension-detail-item">
                                                                                                            <span className="details-slot-extension-detail-label">Reason:</span>
                                                                                                            <span className="details-slot-extension-detail-text">{entry.reason}</span>
                                                                                                        </div>
                                                                                                    )}
                                                                                                    {entry.note && (
                                                                                                        <div className="details-slot-extension-detail-item">
                                                                                                            <span className="details-slot-extension-detail-label">Assigner note:</span>
                                                                                                            <span className="details-slot-extension-detail-text">{entry.note}</span>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Extension Actions */}
                                                                                            {status === 'pending' && isAssigner && (
                                                                                                <div className="details-slot-extension-actions">
                                                                                                    <Button
                                                                                                        type="primary"
                                                                                                        size="small"
                                                                                                        onClick={() => openExtensionResponseModal('approved', slot, entry, selectedTask)}
                                                                                                        className="details-slot-extension-btn"
                                                                                                    >
                                                                                                        Approve
                                                                                                    </Button>
                                                                                                    <Button
                                                                                                        danger
                                                                                                        size="small"
                                                                                                        onClick={() => openExtensionResponseModal('rejected', slot, entry, selectedTask)}
                                                                                                        className="details-slot-extension-btn"
                                                                                                    >
                                                                                                        Reject
                                                                                                    </Button>
                                                                                                </div>
                                                                                            )}
                                                                                            {status === 'pending' && !isAssigner && (
                                                                                                <div className="details-slot-extension-waiting">
                                                                                                    Waiting for assigner approval...
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="details-slot-empty">
                                                        <p>No slots scheduled yet</p>
                                                        <span>Add a slot to see its timing and status here.</span>
                                                    </div>
                                                )}
                                            </section>

                                            {/* {selectedTask.taskImages && selectedTask.taskImages.length > 0 && (
                                                <section className="details-section">
                                                    <div className="details-section-header">
                                                        <h3>Attachments</h3>
                                                        <span>{selectedTask.taskImages.length} file{selectedTask.taskImages.length === 1 ? '' : 's'}</span>
                                                    </div>
                                                    <div className="details-attachments-grid">
                                                        {selectedTask.taskImages.map((image, index) => (
                                                            <div key={index} className="details-attachment-card">
                                                                <Image src={image} alt="Attachment" />
                                                                <div className="details-attachment-actions">
                                                                    <Button type="text" icon={<AiOutlineEye />}>View</Button>
                                                                    <Button type="text">Download</Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </section>
                                            )} */}
                                        </div>

                                        {/* <div className="details-column">
                                            <section className="details-summary-card">
                                                <div>
                                                    <span>Time spent</span>
                                                    <strong>{selectedTask.timeSpend || '--'}</strong>
                                                </div>
                                                <p>Total duration of all tracked work on this task.</p>
                                            </section>

                                            <section className="details-section">
                                                <div className="details-section-header">
                                                    <h3>Description</h3>
                                                </div>
                                                <p className="details-description">{selectedTask.description || 'No description provided.'}</p>
                                            </section>
                                        </div> */}
                                    </div>
                                    <section className="details-section">
                                        <div className="details-section-header">
                                            <h3>Description</h3>
                                        </div>
                                        <p className="details-description">{selectedTask.description || 'No description provided.'}</p>
                                    </section>
                                    <section className="details-section">
                                        <div className="details-section-header">
                                            <h3>Task Chat</h3>
                                        </div>
                                        <TaskChat
                                            key={selectedTask._id}
                                            taskId={selectedTask._id}
                                            receiverId={selectedTask.userId === userId ? selectedTask.receiverUserId : selectedTask.userId}
                                            className="task-chat-component"
                                            title="Task Related Chat"
                                            placeholder="Add a comment..."
                                            showTitle={false}
                                            height="500px"
                                        />
                                    </section>
                                </div>
                            );
                        })()}
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
                    <div className="archive-modal-title">
                        <AiOutlineExclamationCircle />
                        <span>Delete Task</span>
                        <br />   <br />
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
                    className: 'archive-confirm-btn'
                }}
                cancelButtonProps={{

                    className: 'global-secondary-btn'
                }}
                className="archive-confirmation-modal"
                centered
                width={480}
            >
                <div className="archive-modal-body">
                    <p className="archive-warning">
                        Are you sure you want to archive this task?
                    </p>

                    {taskToArchive && (
                        <div className="archive-task-summary">
                            <div className="archive-task-row">
                                <strong>Task Name:</strong>
                                <span>{taskToArchive.taskName}</span>
                            </div>
                            <div className="archive-task-row">
                                <strong>Client:</strong>
                                <span>{taskToArchive.clientName}</span>
                            </div>
                            <div className="archive-task-row">
                                <strong>Priority:</strong>
                                <span>{taskToArchive.priority?.charAt(0).toUpperCase() + taskToArchive.priority?.slice(1)}</span>
                            </div>
                        </div>
                    )}

                    <p className="archive-footer-text">
                        This action will move the task to archived status. You can restore it later if needed.
                    </p>
                </div>
            </Modal>
        </div>
    );
};

export default AllTaskEntries;