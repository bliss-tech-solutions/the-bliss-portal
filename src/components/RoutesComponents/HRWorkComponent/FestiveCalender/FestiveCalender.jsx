import React, { useState, useMemo, useEffect } from 'react';
import { Form, message, Row, Col, Card, List, Typography, Tag, Space, Empty, Button, Drawer, Tabs, Table, Modal, Input } from 'antd';
import dayjs from 'dayjs';
import CalenderModule from '../../../PortalCommonComponents/CalenderModule/CalenderModule';
import { useAddFestiveNoteMutation, useGetFestiveNotesByUserQuery, useUpdateFestiveMutation, useGetAllLeavesQuery, useGetAllUsersQuery, useRejectLeaveMutation } from '../../../../store/api';
import { useSelector } from 'react-redux';
import { useSocket } from '../../../../contexts/SocketContext';
import './FestiveCalender.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

// Task color palette
const TASK_COLORS = [
    { id: 1, color: '#1890ff', label: 'Blue' },
    { id: 2, color: '#52c41a', label: 'Green' },
    { id: 3, color: '#faad14', label: 'Orange' },
    { id: 4, color: '#f5222d', label: 'Red' },
    { id: 5, color: '#722ed1', label: 'Purple' },
    { id: 6, color: '#13c2c2', label: 'Cyan' },
];

// Fixed holidays
const FIXED_HOLIDAYS = {
    '01-01': { name: 'New Year', emoji: '🎉' },
    '01-26': { name: 'Republic Day', emoji: '🏵️' },
    '08-15': { name: 'Independence Day', emoji: '🇮🇳' },
    '10-02': { name: 'Gandhi Jayanti', emoji: '🕊️' },
    '12-25': { name: 'Christmas', emoji: '🎄' },
};

const FestiveCalender = () => {
    const [selectedDate, setSelectedDate] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedColor, setSelectedColor] = useState(TASK_COLORS[0].color);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [form] = Form.useForm();
    const userId = useSelector((state) => state.auth?.userId || state.auth?.user?._id || state.auth?.user?.id);
    const [addFestiveNote] = useAddFestiveNoteMutation();
    const [updateFestive] = useUpdateFestiveMutation();
    const { data: festiveNotesData, refetch } = useGetFestiveNotesByUserQuery(userId, { skip: !userId });

    // Get tasks for a specific date
    const getTasksForDate = (date) => {
        const dateStr = dayjs(date).format('YYYY-MM-DD');
        const buckets = festiveNotesData?.data || [];
        const bucket = buckets.find(b => (b.date === dateStr));
        const notes = (bucket?.notes || []).filter(n => n?.archive !== true);
        const seen = new Map();
        notes.forEach(n => {
            const title = (n.note || '').trim();
            if (!title) return;
            const key = title.toLowerCase() + (n.color || '');
            if (!seen.has(key)) {
                seen.set(key, {
                    id: n._id || `${dateStr}-${title}`,
                    title,
                    color: n.color || '#1890ff',
                    noteId: n._id,
                    description: n.description || '',
                });
            }
        });
        return Array.from(seen.values());
    };

    // Get all tasks with their dates for the task container
    const allTasksWithDates = useMemo(() => {
        const buckets = festiveNotesData?.data || [];
        const tasksList = [];
        buckets.forEach(bucket => {
            const dateStr = bucket.date;
            const notes = (bucket.notes || []).filter(n => n?.archive !== true);
            notes.forEach(n => {
                const title = (n.note || '').trim();
                if (!title) return;
                tasksList.push({
                    id: n._id || `${dateStr}-${title}`,
                    title,
                    color: n.color || '#1890ff',
                    date: dateStr,
                    description: n.description || '',
                    noteId: n._id,
                });
            });
        });
        // Sort by date descending (newest first)
        return tasksList.sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));
    }, [festiveNotesData]);

    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [dateModalVisible, setDateModalVisible] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [selectedDates, setSelectedDates] = useState(new Map()); // Map of leaveId -> Set of selected dates with actions
    const [dateActions, setDateActions] = useState(new Map()); // Map of "leaveId-date" -> 'approve' | 'reject'
    const [pendingSelections, setPendingSelections] = useState(new Map()); // Map userId -> { approved:Set, rejected:Set }
    const [modalContextUserId, setModalContextUserId] = useState(null); // userId when opening modal from all-users table
    const [modalInstructions, setModalInstructions] = useState('');

    // Fetch all leaves and users
    const { data: allLeavesData, refetch: refetchAllLeaves } = useGetAllLeavesQuery();
    const { data: allUsersData } = useGetAllUsersQuery();
    const { socket } = useSocket();
    const [rejectLeave] = useRejectLeaveMutation();

    // Submit helper for a single user row
    const submitUserSelections = async (userRecord) => {
        const saved = pendingSelections.get(userRecord.id);
        if (!saved) return;
        const user = usersWithLeaves.find(u => u.id === userRecord.id);
        if (!user) return;
        const selectionsByLeave = new Map();
        const addToMap = (dateStr, type) => {
            const leave = user.leaves.find(l => l.dates.includes(dateStr));
            if (!leave) return;
            const key = leave.id;
            const entry = selectionsByLeave.get(key) || { approved: new Set(), rejected: new Set(), month: leave.monthData?.month, leaveId: leave.id };
            entry[type].add(dateStr);
            selectionsByLeave.set(key, entry);
        };
        saved.approved?.forEach(d => addToMap(d, 'approved'));
        saved.rejected?.forEach(d => addToMap(d, 'rejected'));

        for (const [_, entry] of selectionsByLeave) {
            const fallbackDate = Array.from(entry.approved)[0] || Array.from(entry.rejected)[0];
            const monthCode = entry.month || (fallbackDate ? dayjs(fallbackDate).format('MMM').toUpperCase() : undefined);
            const body = {
                approverId: userId,
                instructions: saved?.instructions || '',
                approvedDates: Array.from(entry.approved),
                rejectedDates: Array.from(entry.rejected),
            };
            await rejectLeave({ userId: userRecord.id, month: monthCode, leaveId: entry.leaveId, body }).unwrap();
        }
        setPendingSelections(prev => {
            const next = new Map(prev);
            next.delete(userRecord.id);
            return next;
        });
        refetchAllLeaves();
    };

    // Transform API data to user format with leaves
    const usersWithLeaves = useMemo(() => {
        if (!allLeavesData?.data || !Array.isArray(allLeavesData.data)) return [];
        if (!allUsersData?.data || !Array.isArray(allUsersData.data)) return [];

        const usersMap = new Map();

        // Create user map from all users
        allUsersData.data.forEach(user => {
            usersMap.set(user.userId || user._id, {
                id: user.userId || user._id,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.userId || 'Unknown',
                email: user.email || user.userEmail || '',
                position: user.position || user.role || '',
                leaves: []
            });
        });

        // Process leaves data
        allLeavesData.data.forEach(userLeaveData => {
            const userId = userLeaveData.userId;
            const user = usersMap.get(userId);

            if (!user) {
                // If user not found, create a placeholder
                usersMap.set(userId, {
                    id: userId,
                    name: userId,
                    email: '',
                    position: '',
                    leaves: []
                });
            }

            const userForLeaves = usersMap.get(userId);
            const leaves = [];

            // Process months array
            if (userLeaveData.months && Array.isArray(userLeaveData.months)) {
                userLeaveData.months.forEach(monthData => {
                    if (monthData.leaves && Array.isArray(monthData.leaves)) {
                        monthData.leaves.forEach(leave => {
                            // Generate dates from startDate to endDate
                            const startDate = dayjs(leave.startDate);
                            const endDate = dayjs(leave.endDate);
                            const dates = [];
                            let currentDate = startDate;
                            while (currentDate.isBefore(endDate) || currentDate.isSame(endDate)) {
                                dates.push(currentDate.format('YYYY-MM-DD'));
                                currentDate = currentDate.add(1, 'day');
                            }

                            leaves.push({
                                id: leave._id,
                                dates: dates,
                                reason: monthData.reason || leave.reason || 'No reason provided',
                                status: leave.status || 'pending',
                                createdAt: leave.createdAt || leave.updatedAt || new Date().toISOString(),
                                leaveData: leave,
                                monthData: monthData,
                                approvedDates: Array.isArray(leave.approvedDates) ? leave.approvedDates.map(d => dayjs(d).format('YYYY-MM-DD')) : [],
                                rejectedDates: Array.isArray(leave.rejectedDates) ? leave.rejectedDates.map(d => dayjs(d).format('YYYY-MM-DD')) : []
                            });
                        });
                    }
                });
            }

            userForLeaves.leaves = leaves;
        });

        return Array.from(usersMap.values()).filter(user => user.leaves.length > 0);
    }, [allLeavesData, allUsersData]);

    // Socket listener for real-time leave updates
    useEffect(() => {
        if (!socket) return;

        const handleLeaveUpdate = (data) => {
            console.log('✅ Leave update received:', data);
            refetchAllLeaves();
        };

        const handleLeaveRequest = (data) => {
            console.log('✅ New leave request received:', data);
            refetchAllLeaves();
        };

        socket.on('leave-updated', handleLeaveUpdate);
        socket.on('leave-requested', handleLeaveRequest);

        return () => {
            socket.off('leave-updated', handleLeaveUpdate);
            socket.off('leave-requested', handleLeaveRequest);
        };
    }, [socket, refetchAllLeaves]);

    // Get leaves by status for selected user
    const getUserLeavesByStatus = useMemo(() => {
        if (!selectedUser) return { approved: [], pending: [], cancelled: [], all: [] };

        const user = usersWithLeaves.find(u => u.id === selectedUser);
        if (!user) return { approved: [], pending: [], cancelled: [], all: [] };

        const approved = user.leaves.filter(l => l.status === 'approved');
        const pending = user.leaves.filter(l => l.status === 'pending');
        const cancelled = user.leaves.filter(l => l.status === 'cancelled');
        const all = user.leaves.sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)));

        return { approved, pending, cancelled, all };
    }, [selectedUser, usersWithLeaves]);

    // Handle view user leaves
    const handleViewUserLeaves = (userId) => {
        setSelectedUser(userId);
        setDrawerVisible(true);
    };

    // Handle drawer close
    const handleDrawerClose = () => {
        setDrawerVisible(false);
        setSelectedUser(null);
        setDateModalVisible(false);
        setSelectedLeave(null);
        setSelectedDates(new Map());
        setDateActions(new Map());
    };

    // Get selected user data
    const currentUser = useMemo(() => {
        if (!selectedUser) return null;
        return usersWithLeaves.find(u => u.id === selectedUser);
    }, [selectedUser, usersWithLeaves]);

    // Handle open date modal
    const handleOpenDateModal = (leave, userIdForContext = null) => {
        setSelectedLeave(leave);
        setModalContextUserId(userIdForContext);
        if (userIdForContext) {
            const saved = pendingSelections.get(userIdForContext);
            setModalInstructions(saved?.instructions || '');
        } else {
            setModalInstructions('');
        }
        setDateModalVisible(true);
    };

    // Build user-level flattened leave object (for all-users table → Total Leaves click)
    const buildUserFlattenedLeave = (user) => {
        if (!user) return null;
        // Only include dates that are not already approved/rejected
        const flatDates = Array.from(new Set(user.leaves.flatMap(l => {
            const approved = new Set(l.approvedDates || []);
            const rejected = new Set(l.rejectedDates || []);
            return (l.dates || []).filter(d => !approved.has(d) && !rejected.has(d));
        })));
        return {
            id: `${user.id}__bulk`,
            dates: flatDates.sort((a, b) => dayjs(a).diff(dayjs(b))),
            reason: user.leaves[0]?.reason || 'User Leaves',
            createdAt: user.leaves[0]?.createdAt || new Date().toISOString(),
        };
    };

    // Handle date selection in modal
    const handleDateSelect = (dateStr, leaveId) => {
        setSelectedDates(prevDates => {
            const nextDates = new Map(prevDates);
            const dates = nextDates.get(leaveId) || new Set();
            if (dates.has(dateStr)) {
                // Deselect
                dates.delete(dateStr);
                if (dates.size === 0) {
                    nextDates.delete(leaveId);
                } else {
                    nextDates.set(leaveId, dates);
                }
                // Remove action
                const key = `${leaveId}-${dateStr}`;
                setDateActions(prev => {
                    const next = new Map(prev);
                    next.delete(key);
                    return next;
                });
            } else {
                // Select
                dates.add(dateStr);
                nextDates.set(leaveId, dates);
            }
            return nextDates;
        });
    };

    // Handle approve/reject action
    const handleDateAction = (dateStr, leaveId, action) => {
        const key = `${leaveId}-${dateStr}`;

        // First ensure the date is selected
        setSelectedDates(prevDates => {
            const nextDates = new Map(prevDates);
            const dates = nextDates.get(leaveId) || new Set();
            if (!dates.has(dateStr)) {
                dates.add(dateStr);
                nextDates.set(leaveId, dates);
            }
            return nextDates;
        });

        // Then set or toggle the action
        setDateActions(prev => {
            const next = new Map(prev);
            const currentAction = prev.get(key);

            // If clicking the same action, remove it (but keep date selected)
            // If clicking different action, switch to that action
            if (currentAction === action) {
                next.delete(key); // Remove action but keep date selected
            } else {
                next.set(key, action); // Set new action
            }
            return next;
        });
    };

    // Handle submit for a leave
    const handleSubmitLeave = (leaveId) => {
        const dates = selectedDates.get(leaveId);
        if (!dates || dates.size === 0) {
            message.warning('Please select at least one date');
            return;
        }

        const updates = Array.from(dates).map(dateStr => ({
            date: dateStr,
            action: dateActions.get(`${leaveId}-${dateStr}`) || 'approve'
        }));

        console.log('Updating leave:', leaveId, updates);
        message.success(`${updates.length} date(s) updated successfully`);

        // Reset selections for this leave
        setSelectedDates(prev => {
            const next = new Map(prev);
            next.delete(leaveId);
            return next;
        });

        // Remove date actions for this leave
        setDateActions(prev => {
            const next = new Map(prev);
            Array.from(dates).forEach(dateStr => {
                next.delete(`${leaveId}-${dateStr}`);
            });
            return next;
        });
    };

    // Get selected dates display for a leave
    const getSelectedDatesDisplay = (leaveId) => {
        const dates = selectedDates.get(leaveId);
        if (!dates || dates.size === 0) return 'No dates selected';

        return Array.from(dates).map(dateStr => {
            const action = dateActions.get(`${leaveId}-${dateStr}`);
            const color = action === 'approve' ? 'green' : 'red';
            return (
                <Tag key={dateStr} color={color} style={{ marginBottom: 4 }}>
                    {dayjs(dateStr).format('MMM DD')} ({action === 'approve' ? 'Approved' : 'Rejected'})
                </Tag>
            );
        });
    };

    // Handle approve for individual date
    const handleApproveDate = (dateStr, leaveId) => {
        handleDateAction(dateStr, leaveId, 'approve');
    };

    // Handle reject for individual date
    const handleRejectDate = (dateStr, leaveId) => {
        handleDateAction(dateStr, leaveId, 'reject');
    };

    // Get date status text
    const getDateStatus = (dateStr, leaveId) => {
        const action = dateActions.get(`${leaveId}-${dateStr}`);
        if (action === 'approve') return 'Leave is Approved';
        if (action === 'reject') return 'Leave is Rejected';
        return null;
    };

    // Get holiday for date
    const getHolidayForDate = (date) => {
        const md = dayjs(date).format('MM-DD');
        return FIXED_HOLIDAYS[md] || null;
    };

    // Handle date click
    const handleDateClick = (date, info) => {
        // Only handle if it's an actual date click, not month/year change
        if (info && info.source && info.source !== 'date') return;
        setSelectedDate(date);
        setIsModalVisible(true);
        setSelectedColor(TASK_COLORS[0].color);
        setEditingNoteId(null);
        form.resetFields();
        form.setFieldsValue({ color: TASK_COLORS[0].color });
    };

    // Handle save task
    const handleSaveTask = async (date, values, editingId) => {
        try {
            const dateStr = dayjs(date).format('YYYY-MM-DD');
            const dateTasks = getTasksForDate(date);

            if (!editingId && dateTasks.length >= 4) {
                message.warning('Maximum 4 tasks allowed per date!');
                return;
            }

            if (editingId) {
                await updateFestive({
                    date: dateStr,
                    noteId: editingId,
                    note: values.title,
                    description: values.description || '',
                    color: values.color || selectedColor,
                    archive: false
                }).unwrap();
                message.success('Task updated successfully!');
            } else {
                await addFestiveNote({
                    date: dateStr,
                    note: values.title,
                    description: values.description || '',
                    userId,
                    color: values.color || selectedColor
                }).unwrap();
                message.success('Task added successfully!');
            }
            await refetch();
            form.resetFields();
            setSelectedColor(TASK_COLORS[0].color);
            setEditingNoteId(null);
            setIsModalVisible(false);
        } catch (e) {
            message.error(e?.data?.message || e?.message || 'Failed to save task');
            throw e; // Re-throw so CalenderModule knows validation failed
        }
    };

    // Handle archive task
    const handleArchiveTask = async (date, task) => {
        try {
            await updateFestive({
                date: dayjs(date).format('YYYY-MM-DD'),
                noteId: task.noteId,
                note: task.title,
                color: task.color,
                description: task.description || '',
                archive: true
            }).unwrap();
            await refetch();
            message.success('Archived successfully');
            setIsModalVisible(false);
        } catch (e) {
            message.error(e?.data?.message || 'Failed to archive');
        }
    };

    // Handle edit task
    const handleEditTask = (task) => {
        setSelectedColor(task.color);
        setEditingNoteId(task.noteId);
        form.setFieldsValue({ title: task.title, description: task.description, color: task.color });
    };

    // Handle modal cancel
    const handleModalCancel = () => {
        setIsModalVisible(false);
        setSelectedColor(TASK_COLORS[0].color);
        setEditingNoteId(null);
        form.resetFields();
    };

    return (
        <div className="festive-calendar-page">
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Card title={<Title level={4} style={{ margin: 0 }}>Festive Calendar</Title>}>
                        <CalenderModule
                            title=""
                            maxTasksPerDate={4}
                            holidays={FIXED_HOLIDAYS}
                            showActions={true}
                            getTasksForDate={getTasksForDate}
                            getHolidayForDate={getHolidayForDate}
                            onDateSelect={handleDateClick}
                            onSaveTask={handleSaveTask}
                            onArchiveTask={handleArchiveTask}
                            onEditTask={handleEditTask}
                            onModalCancel={handleModalCancel}
                            selectedDate={selectedDate}
                            isModalVisible={isModalVisible}
                            setIsModalVisible={setIsModalVisible}
                            editingNoteId={editingNoteId}
                            form={form}
                            selectedColor={selectedColor}
                            setSelectedColor={setSelectedColor}
                            taskColors={TASK_COLORS}
                        />
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card
                        title={<Title level={5} style={{ margin: 0 }}>Tasks</Title>}
                        style={{ marginBottom: 16 }}
                        className="festive-tasks-container"
                    >
                        <div className="festive-tasks-list">
                            {allTasksWithDates.length === 0 ? (
                                <Empty description="No tasks added yet" />
                            ) : (
                                <List
                                    dataSource={allTasksWithDates}
                                    renderItem={(item) => (
                                        <List.Item className="festive-task-item">
                                            <List.Item.Meta
                                                title={
                                                    <Space>
                                                        <span
                                                            className="festive-task-color-dot"
                                                            style={{ backgroundColor: item.color }}
                                                        />
                                                        <Text strong>{item.title}</Text>
                                                    </Space>
                                                }
                                                description={
                                                    <Space direction="vertical" size={4}>
                                                        <Tag color="blue">{dayjs(item.date).format('MMM DD, YYYY')}</Tag>
                                                        {item.description && (
                                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                                {item.description}
                                                            </Text>
                                                        )}
                                                    </Space>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            )}
                        </div>
                    </Card>

                    <Card
                        title={<Title level={5} style={{ margin: 0 }}>Latest Leaves</Title>}
                        className="festive-leaves-container"
                    >
                        <div className="festive-leaves-list">
                            {usersWithLeaves.length === 0 ? (
                                <Empty description="No leaves found" />
                            ) : (
                                <List
                                    dataSource={usersWithLeaves.slice(0, 5)}
                                    renderItem={(user) => (
                                        <List.Item
                                            className="festive-leave-item"
                                        >
                                            <List.Item.Meta
                                                title={
                                                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                                        <Text strong>{user.name}</Text>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            {user.position}
                                                        </Text>
                                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                                            {user.email}
                                                        </Text>
                                                        <div style={{ marginTop: 4 }}>
                                                            <Tag color="blue">
                                                                {user.leaves.length} Leave{user.leaves.length !== 1 ? 's' : ''}
                                                            </Tag>
                                                        </div>
                                                    </Space>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            )}
                        </div>
                        <div className="festive-leaves-view-button">
                            <Button
                                type="default"
                                block
                                onClick={() => {
                                    setSelectedUser(null);
                                    setDrawerVisible(true);
                                }}
                                disabled={usersWithLeaves.length === 0}
                            >
                                View Leaves
                            </Button>
                        </div>
                    </Card>

                    <Drawer
                        title={
                            selectedUser ? (
                                <Space direction="vertical" size={0}>
                                    <Text strong style={{ fontSize: 16 }}>
                                        {currentUser?.name || 'User'} Leaves
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {currentUser?.email || ''}
                                    </Text>
                                </Space>
                            ) : 'All Users Leaves'
                        }
                        placement="right"
                        onClose={handleDrawerClose}
                        open={drawerVisible}
                        width={1000}
                        className="festive-leaves-drawer"
                    >
                        {!selectedUser ? (
                            // Show all users table
                            <Table
                                dataSource={usersWithLeaves}
                                rowKey="id"
                                pagination={{ pageSize: 10 }}
                                className="festive-leaves-table"
                                columns={[
                                    {
                                        title: 'User Name',
                                        key: 'userName',
                                        dataIndex: 'name',
                                        render: (name) => <Text strong>{name}</Text>,
                                        width: 200,
                                    },
                                    {
                                        title: 'Email',
                                        key: 'email',
                                        dataIndex: 'email',
                                        render: (email) => <Text type="secondary">{email || '-'}</Text>,
                                        width: 200,
                                    },
                                    {
                                        title: 'Position',
                                        key: 'position',
                                        dataIndex: 'position',
                                        render: (position) => <Tag>{position || '-'}</Tag>,
                                        width: 150,
                                    },
                                    {
                                        title: 'Leaves status',
                                        key: 'leavesStatus',
                                        render: (_, record) => {
                                            const saved = pendingSelections.get(record.id);
                                            const approvedCount = saved?.approved?.size || 0;
                                            const rejectedCount = saved?.rejected?.size || 0;
                                            return (
                                                <Space size={8}>
                                                    <Tag color="green">Approved: {approvedCount}</Tag>
                                                    <Tag color="red">Rejected: {rejectedCount}</Tag>
                                                </Space>
                                            );
                                        },
                                        width: 220,
                                    },
                                    {
                                        title: 'Total Leaves',
                                        key: 'totalLeaves',
                                        render: (_, record) => {
                                            // count only remaining (unprocessed) dates across all leaves
                                            const totalDates = record.leaves.reduce((acc, l) => {
                                                const approved = new Set(l.approvedDates || []);
                                                const rejected = new Set(l.rejectedDates || []);
                                                const remaining = (l.dates || []).filter(d => !approved.has(d) && !rejected.has(d));
                                                return acc + remaining.length;
                                            }, 0);
                                            return (
                                                <Button type="link" onClick={() => {
                                                    const leave = buildUserFlattenedLeave(record);
                                                    handleOpenDateModal(leave, record.id);
                                                }}>
                                                    {totalDates} date{totalDates !== 1 ? 's' : ''}
                                                </Button>
                                            );
                                        },
                                        width: 150,
                                    },
                                    {
                                        title: 'Action',
                                        key: 'action',
                                        render: (_, record) => {
                                            const saved = pendingSelections.get(record.id);
                                            const totalDates = record.leaves.reduce((acc, l) => acc + (l.dates?.length || 0), 0);
                                            const approvedCount = saved?.approved?.size || 0;
                                            const rejectedCount = saved?.rejected?.size || 0;
                                            // Enable submit when at least one date has been assigned
                                            const isReady = (approvedCount + rejectedCount) > 0;
                                            return (
                                                <Button
                                                    type="primary"
                                                    disabled={!isReady}
                                                    onClick={async () => {
                                                        try {
                                                            await submitUserSelections(record);
                                                            message.success('Submitted successfully');
                                                        } catch (e) {
                                                            message.error(e?.data?.message || e?.message || 'Failed to submit');
                                                        }
                                                    }}
                                                >
                                                    Submit
                                                </Button>
                                            );
                                        },
                                        width: 120,
                                    },
                                ]}
                            />
                        ) : selectedUser && currentUser ? (
                            <div>
                                <Button
                                    type="default"
                                    onClick={() => setSelectedUser(null)}
                                    style={{ marginBottom: 16 }}
                                >
                                    ← Back to All Users
                                </Button>
                                <Tabs defaultActiveKey="all">
                                    <TabPane tab={`All (${getUserLeavesByStatus.all.length})`} key="all">
                                        <Table
                                            dataSource={getUserLeavesByStatus.all}
                                            rowKey="id"
                                            pagination={{ pageSize: 10 }}
                                            className="festive-leaves-table"
                                            columns={[
                                                {
                                                    title: 'User Name',
                                                    key: 'userName',
                                                    dataIndex: 'id',
                                                    render: () => (
                                                        <Text strong>{currentUser.name}</Text>
                                                    ),
                                                    width: 150,
                                                },
                                                {
                                                    title: 'Leaves Dates',
                                                    key: 'leavesDates',
                                                    dataIndex: 'dates',
                                                    render: (dates, record) => {
                                                        const approved = new Set(record.approvedDates || []);
                                                        const rejected = new Set(record.rejectedDates || []);
                                                        const remaining = (dates || []).filter(d => !approved.has(d) && !rejected.has(d));
                                                        return (
                                                            <Button
                                                                type="link"
                                                                disabled={remaining.length === 0}
                                                                onClick={() => handleOpenDateModal({ ...record, dates: remaining })}
                                                            >
                                                                {remaining.length} date{remaining.length !== 1 ? 's' : ''}
                                                            </Button>
                                                        );
                                                    },
                                                    width: 150,
                                                },
                                                {
                                                    title: 'Reason',
                                                    key: 'reason',
                                                    dataIndex: 'reason',
                                                    render: (reason) => (
                                                        <Text ellipsis={{ tooltip: reason }} style={{ maxWidth: 200 }}>
                                                            {reason}
                                                        </Text>
                                                    ),
                                                    width: 200,
                                                },
                                                {
                                                    title: 'Status',
                                                    key: 'status',
                                                    dataIndex: 'status',
                                                    render: (status) => {
                                                        const colorMap = {
                                                            approved: 'green',
                                                            pending: 'orange',
                                                            cancelled: 'red',
                                                        };
                                                        return (
                                                            <Tag color={colorMap[status] || 'default'}>
                                                                {status?.toUpperCase() || 'PENDING'}
                                                            </Tag>
                                                        );
                                                    },
                                                    width: 120,
                                                },
                                                {
                                                    title: 'Requested Date',
                                                    key: 'createdAt',
                                                    dataIndex: 'createdAt',
                                                    render: (createdAt) => (
                                                        <Text type="secondary">
                                                            {dayjs(createdAt).format('MMM DD, YYYY')}
                                                        </Text>
                                                    ),
                                                    width: 150,
                                                },
                                            ]}
                                        />
                                    </TabPane>
                                    <TabPane tab={`Approved (${getUserLeavesByStatus.approved.length})`} key="approved">
                                        <Empty description="Content coming soon" />
                                    </TabPane>
                                    <TabPane tab={`Pending (${getUserLeavesByStatus.pending.length})`} key="pending">
                                        <Empty description="Content coming soon" />
                                    </TabPane>
                                    <TabPane tab={`Cancelled (${getUserLeavesByStatus.cancelled.length})`} key="cancelled">
                                        <Empty description="Content coming soon" />
                                    </TabPane>
                                </Tabs>
                            </div>
                        ) : (
                            <Empty description="No user selected" />
                        )}

                        {/* Date Selection Modal */}
                        <Modal
                            title={<Text strong>Select Dates for Leave</Text>}
                            open={dateModalVisible}
                            onCancel={() => {
                                setDateModalVisible(false);
                                setSelectedLeave(null);
                                setModalContextUserId(null);
                                setModalInstructions('');
                            }}
                            footer={[
                                <Button key="cancel" onClick={() => {
                                    setDateModalVisible(false);
                                    setSelectedLeave(null);
                                    setModalContextUserId(null);
                                    setModalInstructions('');
                                }}>Cancel</Button>,
                                <Button key="ok" type="primary" onClick={() => {
                                    if (!selectedLeave) return;
                                    // Save selections into pendingSelections when opened from all-users table
                                    if (modalContextUserId) {
                                        const datesSelected = selectedDates.get(selectedLeave.id);
                                        const approved = new Set();
                                        const rejected = new Set();
                                        if (datesSelected && datesSelected.size) {
                                            Array.from(datesSelected).forEach(dateStr => {
                                                const action = dateActions.get(`${selectedLeave.id}-${dateStr}`);
                                                if (action === 'approve') approved.add(dateStr);
                                                else if (action === 'reject') rejected.add(dateStr);
                                            });
                                        }
                                        setPendingSelections(prev => {
                                            const next = new Map(prev);
                                            const existing = next.get(modalContextUserId) || { approved: new Set(), rejected: new Set(), instructions: '' };
                                            // merge
                                            approved.forEach(d => existing.approved.add(d));
                                            rejected.forEach(d => existing.rejected.add(d));
                                            existing.instructions = modalInstructions;
                                            next.set(modalContextUserId, existing);
                                            return next;
                                        });
                                    }
                                    setDateModalVisible(false);
                                    setSelectedLeave(null);
                                    setModalContextUserId(null);
                                    setModalInstructions('');
                                }}>OK</Button>
                            ]}
                            width={700}
                            className="festive-date-modal"
                        >
                            {selectedLeave && (
                                <div className="festive-date-modal-content">
                                    {modalContextUserId && (
                                        <div style={{ marginBottom: 12 }}>
                                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Instructions (optional)</Text>
                                            <Input.TextArea
                                                value={modalInstructions}
                                                onChange={(e) => setModalInstructions(e.target.value)}
                                                rows={2}
                                                placeholder="Add approver instructions..."
                                            />
                                        </div>
                                    )}
                                    <div style={{ marginBottom: 16 }}>
                                        <Text type="secondary">Select dates and choose approve or reject:</Text>
                                    </div>
                                    <div className="festive-modal-dates-list">
                                        <Row gutter={[16, 16]}>
                                            {selectedLeave.dates.map(dateStr => {
                                                const key = `${selectedLeave.id}-${dateStr}`;
                                                const isSelected = selectedDates.get(selectedLeave.id)?.has(dateStr);
                                                const action = dateActions.get(key);
                                                const status = getDateStatus(dateStr, selectedLeave.id);
                                                return (
                                                    <Col xs={24} key={dateStr}>
                                                        <Card
                                                            className={`festive-leave-reason-card ${isSelected ? 'selected' : ''} ${action ? `action-${action}` : ''}`}
                                                            bodyStyle={{ padding: 16 }}
                                                        >
                                                            <div className='Leave-Reason-Content'>
                                                                <div>
                                                                    <div className="festive-reason-header">
                                                                        <Button
                                                                            size="middle"
                                                                            type={isSelected ? 'primary' : 'default'}
                                                                            onClick={() => handleDateSelect(dateStr, selectedLeave.id)}
                                                                            className="festive-date-btn"
                                                                            icon={isSelected ? <span className="festive-check-icon">✓</span> : null}
                                                                            style={{ marginBottom: 8 }}
                                                                        >
                                                                            {dayjs(dateStr).format('MMMM DD, YYYY')}
                                                                        </Button>
                                                                    </div>
                                                                    <div className="festive-reason-content">
                                                                        <Text>{selectedLeave.reason}</Text>
                                                                    </div>
                                                                </div>
                                                                <div className='Approved-Rejected-Buttons'>
                                                                    <Button
                                                                        type={action === 'approve' ? 'primary' : 'default'}
                                                                        className={`festive-action-btn approve ${action === 'approve' ? 'active' : ''}`}
                                                                        onClick={() => handleApproveDate(dateStr, selectedLeave.id)}
                                                                    >
                                                                        Approve
                                                                    </Button>
                                                                    <Button
                                                                        danger={action === 'reject'}
                                                                        type={action === 'reject' ? 'primary' : 'default'}
                                                                        className={`festive-action-btn reject ${action === 'reject' ? 'active' : ''}`}
                                                                        onClick={() => handleRejectDate(dateStr, selectedLeave.id)}
                                                                    >
                                                                        Reject
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                                                                <div className='Leave-Reason-Content'>
                                                                    <div>
                                                                        <Space direction="vertical" size={4}>
                                                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                                                Requested Date:
                                                                            </Text>
                                                                            <Text style={{ fontSize: 13 }}>
                                                                                {dayjs(selectedLeave.createdAt).format('MMM DD, YYYY')}
                                                                            </Text>
                                                                        </Space>
                                                                    </div>
                                                                    {status && (
                                                                        <div className='ButtonClickStatus'>
                                                                            <Tag color={action === 'approve' ? 'green' : 'red'} style={{ margin: 0 }}>
                                                                                {status}
                                                                            </Tag>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    </Col>
                                                );
                                            })}
                                        </Row>
                                    </div>
                                    <div className="festive-selection-summary">
                                        <Space>
                                            <Text type="secondary">Selected: </Text>
                                            <Text strong style={{ fontSize: 16 }}>
                                                {selectedDates.get(selectedLeave.id)?.size || 0}
                                            </Text>
                                            <Text type="secondary">date(s)</Text>
                                        </Space>
                                    </div>
                                </div>
                            )}
                        </Modal>
                    </Drawer>
                </Col>
            </Row>
        </div>
    );
};

export default FestiveCalender;
