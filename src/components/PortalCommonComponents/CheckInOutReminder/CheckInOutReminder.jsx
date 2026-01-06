import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Modal, Button, Space, Typography, message, Input } from 'antd';
import { LoginOutlined, FieldTimeOutlined, TeamOutlined, ToolOutlined, WarningOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import './CheckInOutReminder.css';
import { useSelector } from 'react-redux';
import { useCheckInMutation, useCheckInStatusQuery, useGetTaskAssignQuery, useGetAllUsersQuery } from '../../../store/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;

const STORAGE_KEY = 'bliss_checkin_popup_last_shown_date';

const getTodayKey = () => {
    const now = new Date();
    // Use local date string as a stable daily key
    return now.toLocaleDateString('en-CA'); // YYYY-MM-DD
};

const isAfterMidnight = () => {
    const now = new Date();
    return now.getHours() > 0 || (now.getHours() === 0 && now.getMinutes() >= 1);
};

const CheckInOutReminder = () => {
    const [open, setOpen] = useState(false);
    const timerRef = useRef(null);
    const user = useSelector((state) => state.auth?.user);
    const userId = useSelector((state) => state.auth?.userId || state.auth?.user?._id || state.auth?.user?.id);
    const role = user?.role || user?.position || 'user';
    const [checkIn, { isLoading }] = useCheckInMutation();
    const [reason, setReason] = useState('');
    const [checkInType, setCheckInType] = useState('OFFICE');

    const greeting = useMemo(() => {
        const now = new Date();
        const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const hour = istTime.getHours();

        if (hour >= 5 && hour < 12) return 'Good Morning';
        if (hour >= 12 && hour < 17) return 'Good Afternoon';
        if (hour >= 17 && hour < 21) return 'Good Evening';
        return 'Good Night';
    }, []);

    // Hide check-in/check-out for admin role
    const isAdmin = role?.toLowerCase() === 'admin';
    if (isAdmin) {
        return null;
    }

    // Query server for today's check-in status (no localStorage gating)
    const { data: statusData, isFetching } = useCheckInStatusQuery(
        { userId },
        { skip: !userId }
    );

    // Fetch user tasks for reminders
    const { data: tasksData } = useGetTaskAssignQuery(userId, {
        skip: !userId || (role?.toLowerCase() !== 'user' && role?.toLowerCase() !== 'execution'),
    });

    // Fetch all users to get assigner names
    const { data: allUsersData } = useGetAllUsersQuery(undefined, {
        skip: role?.toLowerCase() !== 'user' && role?.toLowerCase() !== 'execution',
    });

    // Function to get assigner name by userId
    const getUserName = (targetUserId) => {
        if (!allUsersData?.data || !targetUserId) return 'Unknown';
        const targetUser = allUsersData.data.find(u => u.userId === targetUserId || u._id === targetUserId);
        if (!targetUser) return 'Unknown';
        return targetUser.firstName && targetUser.lastName
            ? `${targetUser.firstName} ${targetUser.lastName}`
            : (targetUser.firstName || targetUser.email || targetUser.userId || 'Unknown');
    };

    // Filter pending tasks for check-in modal
    const pendingTasks = useMemo(() => {
        if ((role?.toLowerCase() !== 'user' && role?.toLowerCase() !== 'execution') || !tasksData?.data || !Array.isArray(tasksData.data)) return [];
        return tasksData.data.filter(
            task => (task.taskStatus === 'pending' || task.taskStatus === 'Pending') && !task.isArchived
        );
    }, [tasksData, role]);

    useEffect(() => {
        if (!userId) return;
        if (isFetching) return;
        if (!isAfterMidnight()) return;

        const alreadyCheckedIn = Boolean(statusData?.checkedIn);
        if (!alreadyCheckedIn) {
            timerRef.current = setTimeout(() => setOpen(true), 3000);
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, isFetching, statusData?.checkedIn]);

    const closeModal = () => setOpen(false);

    const handleCheckIn = async () => {
        try {
            await checkIn({
                userId,
                checkInReason: reason || '',
                checkInType
            }).unwrap();

            const typeMessage = checkInType === 'WORK'
                ? 'Checked in successfully (External Work - No time restrictions)'
                : 'Checked in successfully';

            message.success(typeMessage);
            closeModal();
            setReason('');
            setCheckInType('OFFICE');
        } catch (err) {
            message.error(err?.data?.message || 'Failed to check in');
        }
    };

    return (
        <Modal
            open={open}
            onCancel={closeModal}
            footer={null}
            closable={false}
            centered
            width={440}
            className="checkin-reminder-modal"
            maskClosable={false}
            keyboard={false}
        >
            <div className="checkin-reminder-content">
                <div className="checkin-header">
                    <div className="checkin-icon-wrap">
                        <FieldTimeOutlined className="checkin-main-icon" />
                    </div>
                    <div className="checkin-title-group">
                        <Title level={3} className="checkin-title">{greeting}!</Title>
                        <Text className="checkin-subtext">
                            It's time to start your productive day.
                        </Text>
                    </div>
                </div>

                <div className="checkin-body">
                    {pendingTasks.length > 0 && (
                        <div className="checkout-pending-warning" style={{
                            marginBottom: '16px',
                            padding: '12px',
                            backgroundColor: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px'
                        }}>
                            <div style={{ color: '#cf1322', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <WarningOutlined />
                                Pending Tasks from Last Session
                            </div>
                            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-color)', opacity: 0.85 }}>
                                You have {pendingTasks.length} task(s) waiting for you.
                            </p>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                gap: '10px',
                                maxHeight: '150px',
                                overflowY: 'auto',
                                padding: '2px'
                            }}>
                                {pendingTasks.map((task, index) => (
                                    <div key={task._id || index} style={{
                                        backgroundColor: 'rgba(0,0,0,0.02)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        padding: '8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                    }}>
                                        <div style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: 'var(--text-color)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {task.taskName || 'Untitled Task'}
                                        </div>
                                        <div style={{
                                            fontSize: '10px',
                                            color: 'var(--text-color)',
                                            opacity: 0.7,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <UserOutlined style={{ fontSize: '9px' }} />
                                            <span>{getUserName(task.userId)}</span>
                                        </div>
                                        <div style={{
                                            fontSize: '10px',
                                            color: 'var(--text-color)',
                                            opacity: 0.5,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <ClockCircleOutlined style={{ fontSize: '9px' }} />
                                            <span>{dayjs(task.createdAt || task.updatedAt).fromNow()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <Paragraph className="checkin-instruction">
                        Please provide a brief update or reason for checking in today.
                    </Paragraph>
                    <div className="checkin-reason-wrap">
                        <Input.TextArea
                            rows={3}
                            placeholder="Working on... (optional)"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="checkin-textarea"
                        />
                    </div>

                    {/* Work Type Toggle */}
                    <div className="checkin-work-toggle">
                        <Button
                            type={checkInType === 'WORK' ? 'primary' : 'default'}
                            icon={<ToolOutlined />}
                            onClick={() => setCheckInType(checkInType === 'WORK' ? 'OFFICE' : 'WORK')}
                            className={`work-toggle-btn ${checkInType === 'WORK' ? 'active' : ''}`}
                        >
                            {checkInType === 'WORK' ? 'External Work ✓' : 'Mark as External Work'}
                        </Button>
                        {checkInType === 'WORK' && (
                            <Text className="work-hint">
                                <TeamOutlined /> No time restrictions for external work
                            </Text>
                        )}
                    </div>
                </div>

                <div className="checkin-footer">
                    <Button
                        type="primary"
                        size="large"
                        icon={<LoginOutlined />}
                        onClick={handleCheckIn}
                        loading={isLoading}
                        disabled={isLoading}
                        className="global-button"
                    >
                        Check In Now
                    </Button>
                    <div className="checkin-hint">
                        <Text type="secondary">Attendance tracking will begin immediately.</Text>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default CheckInOutReminder;


