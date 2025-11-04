import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Row, Col, Card, List, Input, Button, Modal, Space, Tag, Typography, message, Popover } from 'antd';
import CalenderModule from '../../../PortalCommonComponents/CalenderModule/CalenderModule';
import "./TaskAndLeaveCalender.css";
import { useSelector } from 'react-redux';
import { selectUserId, selectUser } from '../../../../store/slices/authSlice';
import { useCreateLeaveMutation, useGetUserLeavesQuery } from '../../../../store/api';
import { useNotification } from '../../../../contexts/NotificationContext';
import { useSocket } from '../../../../contexts/SocketContext';
const { TextArea } = Input;
const { Title, Text } = Typography;

const TaskAndLeaveCalender = () => {
    const [selectedDatesSet, setSelectedDatesSet] = useState(() => new Set());
    const [leaveReason, setLeaveReason] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);

    const selectedDates = useMemo(() => Array.from(selectedDatesSet).sort(), [selectedDatesSet]);
    const userId = useSelector(selectUserId);
    const user = useSelector(selectUser);
    const [createLeave, { isLoading: isCreating }] = useCreateLeaveMutation();

    // Get user's display name
    const userName = useMemo(() => {
        if (user?.firstName && user?.lastName) {
            return `${user.firstName} ${user.lastName}`;
        }
        return user?.firstName || user?.lastName || user?.email || user?.userEmail || 'User';
    }, [user]);
    const { error: showError, success: showSuccess } = useNotification();
    const { data: leavesData, isLoading: isLoadingLeaves, refetch: refetchLeaves } = useGetUserLeavesQuery(userId, { skip: !userId });

    // Transform API response to leave history format
    const leaveHistory = useMemo(() => {
        if (!leavesData?.data?.months) return [];
        const allLeaves = [];
        leavesData.data.months.forEach(monthData => {
            monthData.leaves.forEach(leave => {
                // Generate date range array
                const startDate = dayjs(leave.startDate);
                const endDate = dayjs(leave.endDate);
                const dates = [];
                let currentDate = startDate;
                while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
                    dates.push(currentDate.format('YYYY-MM-DD'));
                    currentDate = currentDate.add(1, 'day');
                }
                allLeaves.push({
                    id: leave._id,
                    dates: dates,
                    reason: monthData.reason || '',
                    createdAt: leave.createdAt || leave.updatedAt,
                    status: leave.status || 'pending',
                    month: monthData.month,
                    approvedDates: Array.isArray(leave.approvedDates) ? leave.approvedDates.map(d => dayjs(d).format('YYYY-MM-DD')) : [],
                    rejectedDates: Array.isArray(leave.rejectedDates) ? leave.rejectedDates.map(d => dayjs(d).format('YYYY-MM-DD')) : []
                });
            });
        });
        // Sort by createdAt descending (newest first)
        return allLeaves.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [leavesData]);

    // Socket.IO listeners for real-time updates
    const { socket } = useSocket();
    useEffect(() => {
        if (!socket || !userId) return;

        const handleLeaveRequested = ({ userId: eventUserId, month, reason }) => {
            if (eventUserId === userId) {
                refetchLeaves();
            }
        };

        const handleLeaveUpdated = ({ userId: eventUserId, month, leaveId }) => {
            if (eventUserId === userId) {
                refetchLeaves();
            }
        };

        const handleLeaveDeleted = ({ userId: eventUserId, month, leaveId }) => {
            if (eventUserId === userId) {
                refetchLeaves();
            }
        };

        socket.on('leave:requested', handleLeaveRequested);
        socket.on('leave:updated', handleLeaveUpdated);
        socket.on('leave:deleted', handleLeaveDeleted);

        return () => {
            socket.off('leave:requested', handleLeaveRequested);
            socket.off('leave:updated', handleLeaveUpdated);
            socket.off('leave:deleted', handleLeaveDeleted);
        };
    }, [socket, userId, refetchLeaves]);

    // Group consecutive dates into ranges
    const groupDatesIntoRanges = (dates) => {
        if (dates.length === 0) return [];
        const sorted = [...dates].sort();
        const ranges = [];
        let start = sorted[0];
        let end = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            const current = dayjs(sorted[i]);
            const prev = dayjs(sorted[i - 1]);
            if (current.diff(prev, 'day') === 1) {
                end = sorted[i];
            } else {
                ranges.push({ startDate: start, endDate: end });
                start = sorted[i];
                end = sorted[i];
            }
        }
        ranges.push({ startDate: start, endDate: end });
        return ranges;
    };

    // Local storage keys
    const LS_DATES_KEY = 'leaveSelectedDates';
    const LS_REASON_KEY = 'leaveReasonDraft';

    // Hydrate from localStorage on mount
    useEffect(() => {
        try {
            const storedDates = JSON.parse(localStorage.getItem(LS_DATES_KEY) || '[]');
            if (Array.isArray(storedDates) && storedDates.length) {
                setSelectedDatesSet(new Set(storedDates));
            }
        } catch { }
        const storedReason = localStorage.getItem(LS_REASON_KEY);
        if (typeof storedReason === 'string') {
            setLeaveReason(storedReason);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist dates
    useEffect(() => {
        try {
            localStorage.setItem(LS_DATES_KEY, JSON.stringify(selectedDates));
        } catch { }
    }, [selectedDates]);

    // Persist reason
    useEffect(() => {
        try {
            localStorage.setItem(LS_REASON_KEY, leaveReason);
        } catch { }
    }, [leaveReason]);

    const toggleDate = (date, info) => {
        // Only toggle when a day cell is clicked, not when month/year changes
        if (info && info.source && info.source !== 'date') return;
        const ds = dayjs(date).format('YYYY-MM-DD');
        setSelectedDatesSet(prev => {
            const next = new Set(prev);
            if (next.has(ds)) next.delete(ds); else next.add(ds);
            return next;
        });
    };

    const getTasksForDate = (date) => {
        const ds = dayjs(date).format('YYYY-MM-DD');
        if (selectedDatesSet.has(ds)) {
            return [{ id: `sel-${ds}`, title: 'Leave Selected', color: '#722ed1', description: '' }];
        }
        return [];
    };

    const handleSubmit = () => {
        if (selectedDates.length === 0) {
            message.warning('Please select at least one date.');
            return;
        }
        if (!leaveReason.trim()) {
            message.warning('Please enter a leave reason.');
            return;
        }
        setConfirmOpen(true);
    };

    const handleConfirmOk = async () => {
        try {
            // Group dates into ranges
            const ranges = groupDatesIntoRanges(selectedDates);

            // Get month abbreviation from first selected date
            const monthAbbr = dayjs(selectedDates[0]).format('MMM').toUpperCase();

            // Format ranges with date strings (YYYY-MM-DD format)
            const formattedLeaves = ranges.map(range => ({
                startDate: dayjs(range.startDate).format('YYYY-MM-DD'),
                endDate: dayjs(range.endDate).format('YYYY-MM-DD')
            }));

            const body = {
                userId,
                month: monthAbbr,
                reason: leaveReason.trim(),
                leaves: formattedLeaves
            };

            await createLeave(body).unwrap();
            await refetchLeaves();
            setSelectedDatesSet(new Set());
            setLeaveReason('');
            try {
                localStorage.removeItem(LS_DATES_KEY);
                localStorage.removeItem(LS_REASON_KEY);
            } catch { }
            setConfirmOpen(false);
            showSuccess('Leave request submitted');
        } catch (e) {
            const errorMessage = e?.data?.message || e?.message || 'Failed to submit leave';
            showError(errorMessage);
        }
    };

    const handleConfirmCancel = () => setConfirmOpen(false);

    return (
        <div className="task-leave-calendar">
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Card title={<Title level={4} style={{ margin: 0 }}>Task & Leave Calendar</Title>}>
                        <CalenderModule
                            title=""
                            showActions={false}
                            getTasksForDate={getTasksForDate}
                            onDateSelect={toggleDate}
                            maxTasksPerDate={8}
                        />
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card
                        title={<Title level={5} style={{ margin: 0 }}>Selected Dates</Title>}
                        style={{ marginBottom: 16 }}
                        extra={
                            <Button size="small" onClick={() => { setSelectedDatesSet(new Set()); try { localStorage.removeItem(LS_DATES_KEY); } catch { } }} disabled={selectedDates.length === 0}>
                                Clear
                            </Button>
                        }
                    >
                        {selectedDates.length === 0 ? (
                            <Text type="secondary">No dates selected. Click on the calendar dates to select.</Text>
                        ) : (
                            <Space wrap>
                                {selectedDates.map(d => (
                                    <Tag key={d} color="purple">{dayjs(d).format('MMM DD, YYYY')}</Tag>
                                ))}
                            </Space>
                        )}
                    </Card>

                    <Card title={<Title level={5} style={{ margin: 0 }}>Leave Reason</Title>} style={{ marginBottom: 16 }}>
                        <TextArea
                            rows={4}
                            placeholder="Write your leave reason..."
                            value={leaveReason}
                            onChange={(e) => setLeaveReason(e.target.value)}
                        />
                        <div style={{ marginTop: 12, textAlign: 'right' }}>
                            <Button type="primary" onClick={handleSubmit} disabled={selectedDates.length === 0 || !leaveReason.trim()}>
                                Submit Leave Request
                            </Button>
                        </div>
                    </Card>

                    <Card
                        title={<Title level={5} style={{ margin: 0 }}>Leave History</Title>}
                        extra={
                            <Space>
                                <Tag color="green">Approved</Tag>
                                <Tag color="red">Rejected</Tag>
                                <Tag color="orange">Pending</Tag>
                            </Space>
                        }
                    >
                        <List
                            loading={isLoadingLeaves}
                            dataSource={leaveHistory}
                            renderItem={(item) => (
                                <List.Item
                                    actions={() => {
                                        const approvedSet = new Set(item.approvedDates || []);
                                        const rejectedSet = new Set(item.rejectedDates || []);
                                        const approvedCount = item.dates.filter(d => approvedSet.has(d)).length;
                                        const rejectedCount = item.dates.filter(d => rejectedSet.has(d)).length;
                                        const pendingCount = item.dates.length - approvedCount - rejectedCount;
                                        return [
                                            <Space key="summary" wrap>
                                                <Tag color="green">Approved: {approvedCount}</Tag>
                                                <Tag color="red">Rejected: {rejectedCount}</Tag>
                                                <Tag color="orange">Pending: {pendingCount}</Tag>
                                            </Space>
                                        ];
                                    }}
                                >
                                    <List.Item.Meta
                                        title={
                                            <Space direction="vertical" size={2}>
                                                <Text strong>{userName}</Text>
                                                <Space wrap>
                                                    {item.dates.map(d => {
                                                        const color = item.approvedDates?.includes(d)
                                                            ? 'green'
                                                            : item.rejectedDates?.includes(d)
                                                                ? 'red'
                                                                : 'geekblue';
                                                        return (
                                                            <Tag key={`${item.id}-${d}`} color={color}>{dayjs(d).format('MMM DD')}</Tag>
                                                        );
                                                    })}
                                                </Space>
                                            </Space>
                                        }
                                        description={
                                            <>
                                                <Text type="secondary">Reason: </Text>
                                                <Text>{item.reason}</Text>
                                            </>
                                        }
                                    />
                                    {/* <div>
                                        <Text type="secondary">{dayjs(item.createdAt).format('MMM DD, YYYY HH:mm')}</Text>
                                    </div> */}
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>

            <Modal
                title="Confirm Leave Request"
                open={confirmOpen}
                onOk={handleConfirmOk}
                onCancel={handleConfirmCancel}
                confirmLoading={isCreating}
                okText="Confirm"
                cancelText="Cancel"
                centered
            >
                <Space direction="vertical" size={8}>
                    <Text>Selected Dates:</Text>
                    <Space wrap>
                        {selectedDates.map(d => (
                            <Tag key={`confirm-${d}`} color="purple">{dayjs(d).format('MMM DD, YYYY')}</Tag>
                        ))}
                    </Space>
                    <div>
                        <Text>Reason:</Text>
                        <div style={{ marginTop: 4 }}>
                            <Text>{leaveReason.trim() || '(No reason provided)'}</Text>
                        </div>
                    </div>
                </Space>
            </Modal>
        </div>
    );
};

export default TaskAndLeaveCalender;