import React, { useState, useEffect, useMemo } from "react";
import "./PortalHeader.css";
import { Row, Col, Dropdown, Badge, Avatar, Space, Button, Spin, Modal, Input } from "antd";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectCurrentHeaderLogo, toggleTheme, selectTheme } from "../../../store/slices/themeSlice";
import { logout } from "../../../store/slices/authSlice";
import { useNotification } from "../../../contexts/NotificationContext";
import { SunOutlined, MoonOutlined, BellOutlined, UserOutlined, SettingOutlined, LogoutOutlined, CalendarOutlined, ClockCircleOutlined, LoadingOutlined, ExportOutlined, WarningOutlined } from "@ant-design/icons";
import { useCheckoutMutation, useGetTaskAssignQuery, useGetAllUsersQuery, useCheckInStatusQuery } from '../../../store/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const PortalHeader = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const currentHeaderLogo = useSelector(selectCurrentHeaderLogo);
    const theme = useSelector(selectTheme);
    const { success, info, setTabCount } = useNotification();
    const [greeting, setGreeting] = useState('Good Morning');
    const [currentDate, setCurrentDate] = useState({
        date: '',
        day: ''
    });
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const isDarkMode = theme === 'dark';
    const userId = useSelector((state) => state.auth?.userId || state.auth?.user?._id || state.auth?.user?.id);
    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
    const [checkoutReason, setCheckoutReason] = useState('');
    const [checkout, { isLoading: isCheckoutLoading }] = useCheckoutMutation();
    const { data: checkInStatus } = useCheckInStatusQuery({ userId }, {
        skip: !userId
    });

    // Fetch user tasks for notifications (only for user role)
    const userRole = user?.role?.toLowerCase();
    const { data: tasksData } = useGetTaskAssignQuery(userId, {
        skip: !userId || (userRole !== 'user' && userRole !== 'execution'),
    });

    // Fetch all users to get assigner/receiver names
    const { data: allUsersData } = useGetAllUsersQuery(undefined, {
        skip: userRole !== 'user' && userRole !== 'execution',
    });

    const handleThemeToggle = () => {
        dispatch(toggleTheme());
    };

    // Handle logout with loading state
    const handleLogout = async () => {
        setIsLoggingOut(true);

        // Show loading notification immediately so user knows logout is processing
        info('Logging out... Please wait', 2000);

        // Show loading for 1.5-2 seconds
        setTimeout(() => {
            // Dispatch logout action to clear Redux state and localStorage
            dispatch(logout());
            // Reset RTK Query API state to clear all cached data
            dispatch(api.util.resetApiState());

            // Show success notification using MUI Snackbar
            success('Logged out successfully from Bliss Portal');

            // Navigate to login page
            navigate('/');

            // Reset loading state
            setIsLoggingOut(false);
        }, 1800); // 1.8 seconds delay
    };

    // Get user's first name and last name from API response
    const firstName = user?.firstName || '';
    const lastName = user?.lastName || '';

    // Combine first name and last name
    const fullName = (firstName && lastName) ? `${firstName} ${lastName}` :
        firstName ? firstName :
            lastName ? lastName :
                'User';

    // Get profile photo URL (same as ProfileUpdate component)
    const profilePhotoUrl = user?.profilePhoto || user?.profileImage || null;

    // Function to get assigner/receiver name by userId
    const getUserName = (targetUserId) => {
        if (!allUsersData?.data || !targetUserId) return 'Unknown';

        const targetUser = allUsersData.data.find(u => u.userId === targetUserId || u._id === targetUserId);
        if (!targetUser) return 'Unknown';

        // Return full name if available, otherwise email or userId
        if (targetUser.firstName && targetUser.lastName) {
            return `${targetUser.firstName} ${targetUser.lastName}`;
        } else if (targetUser.firstName) {
            return targetUser.firstName;
        } else if (targetUser.email || targetUser.userEmail) {
            return targetUser.email || targetUser.userEmail;
        } else {
            return targetUser.userId || 'Unknown';
        }
    };

    // Notification dropdown items - Show pending tasks for user role, user counts for execution role
    const notificationItems = useMemo(() => {
        // For user role, show pending tasks
        if (userRole === 'user' && tasksData?.data && Array.isArray(tasksData.data)) {
            // Filter only pending tasks and sort by creation date (newest first)
            const pendingTasks = tasksData.data
                .filter(task => task.taskStatus === 'pending' || task.taskStatus === 'Pending')
                .sort((a, b) => {
                    const dateA = new Date(a.createdAt || a.updatedAt || 0);
                    const dateB = new Date(b.createdAt || b.updatedAt || 0);
                    return dateB - dateA; // Newest first
                })
                .slice(0, 5); // Show max 5 notifications

            if (pendingTasks.length === 0) {
                return [
                    {
                        key: 'no-tasks',
                        label: (
                            <div className="notification-item">
                                <div className="notification-title">No Pending Tasks</div>
                                <div className="notification-time">All tasks are completed</div>
                            </div>
                        ),
                        disabled: true,
                    },
                ];
            }

            return pendingTasks.map((task, index) => {
                const assignDate = task.createdAt || task.updatedAt || new Date();
                const assignerName = getUserName(task.userId);
                const relativeTime = dayjs(assignDate).fromNow();

                return {
                    key: task._id || `task-${index}`,
                    label: (
                        <div className="notification-item task-notification">
                            <div className="notification-task-header">
                                <div className="notification-title task-name">{task.taskName || 'Untitled Task'}</div>
                                <div className="notification-time">{relativeTime}</div>
                            </div>
                            <div className="notification-task-details">
                                <div className="notification-assigner">
                                    <span className="assigner-label">Assigned by:</span>
                                    <span className="assigner-name">{assignerName}</span>
                                </div>
                                <div className="notification-assign-date">
                                    <ClockCircleOutlined className="date-icon" />
                                    <span>{dayjs(assignDate).format('MMM DD, YYYY')}</span>
                                </div>
                            </div>
                        </div>
                    ),
                };
            });
        }

        // For execution role, show users with pending task counts
        if (userRole === 'execution' && tasksData?.data && Array.isArray(tasksData.data)) {
            // Filter only pending tasks
            const pendingTasks = tasksData.data.filter(
                task => (task.taskStatus === 'pending' || task.taskStatus === 'Pending') && !task.isArchived
            );

            if (pendingTasks.length === 0) {
                return [
                    {
                        key: 'no-pending-tasks',
                        label: (
                            <div className="notification-item">
                                <div className="notification-title">No Pending Tasks</div>
                                <div className="notification-time">All tasks are completed</div>
                            </div>
                        ),
                        disabled: true,
                    },
                ];
            }

            // Group tasks by receiverUserId and count
            const userTaskCounts = {};
            pendingTasks.forEach(task => {
                const receiverId = task.receiverUserId;
                if (receiverId) {
                    if (!userTaskCounts[receiverId]) {
                        userTaskCounts[receiverId] = {
                            count: 0,
                            latestTaskDate: null,
                        };
                    }
                    userTaskCounts[receiverId].count++;
                    const taskDate = new Date(task.createdAt || task.updatedAt || 0);
                    if (!userTaskCounts[receiverId].latestTaskDate || taskDate > userTaskCounts[receiverId].latestTaskDate) {
                        userTaskCounts[receiverId].latestTaskDate = taskDate;
                    }
                }
            });

            // Convert to array and sort by count (descending), then by date (newest first)
            const userCountsArray = Object.entries(userTaskCounts)
                .map(([receiverId, data]) => ({
                    receiverId,
                    count: data.count,
                    latestTaskDate: data.latestTaskDate,
                }))
                .sort((a, b) => {
                    // First sort by count (more tasks first)
                    if (b.count !== a.count) {
                        return b.count - a.count;
                    }
                    // If counts are equal, sort by latest task date (newer first)
                    return new Date(b.latestTaskDate) - new Date(a.latestTaskDate);
                })
                .slice(0, 8); // Show max 8 users

            if (userCountsArray.length === 0) {
                return [
                    {
                        key: 'no-users',
                        label: (
                            <div className="notification-item">
                                <div className="notification-title">No Pending Tasks</div>
                                <div className="notification-time">All tasks are completed</div>
                            </div>
                        ),
                        disabled: true,
                    },
                ];
            }

            return userCountsArray.map((userData, index) => {
                const userName = getUserName(userData.receiverId);
                const relativeTime = userData.latestTaskDate ? dayjs(userData.latestTaskDate).fromNow() : '';

                return {
                    key: `user-${userData.receiverId}-${index}`,
                    label: (
                        <div className="notification-item execution-notification">
                            <div className="notification-task-header">
                                <div className="notification-title task-name">{userName}</div>
                                {relativeTime && (
                                    <div className="notification-time">{relativeTime}</div>
                                )}
                            </div>
                            <div className="notification-task-details">
                                <div className="notification-assigner">
                                    <span className="assigner-label">Pending Tasks:</span>
                                    <span className="assigner-name count-badge">{userData.count}</span>
                                </div>
                            </div>
                        </div>
                    ),
                };
            });
        }

        // Default notifications for other roles (or fallback)
        return [
            {
                key: '1',
                label: (
                    <div className="notification-item">
                        <div className="notification-title">New Task Assigned</div>
                        <div className="notification-time">2 minutes ago</div>
                    </div>
                ),
            },
            {
                key: '2',
                label: (
                    <div className="notification-item">
                        <div className="notification-title">Meeting Reminder</div>
                        <div className="notification-time">1 hour ago</div>
                    </div>
                ),
            },
        ];
    }, [tasksData, allUsersData, userRole]);

    // Count of pending tasks for badge
    const pendingTasksCount = useMemo(() => {
        if (!tasksData?.data || !Array.isArray(tasksData.data)) return 0;

        if (userRole === 'user') {
            // For user role, count their pending tasks
            const count = tasksData.data.filter(
                task => (task.taskStatus === 'pending' || task.taskStatus === 'Pending') && !task.isArchived
            ).length;
            return count > 0 ? count : 0;
        }

        if (userRole === 'execution') {
            // For execution role, count unique users with pending tasks
            const pendingTasks = tasksData.data.filter(
                task => (task.taskStatus === 'pending' || task.taskStatus === 'Pending') && !task.isArchived && task.receiverUserId
            );
            const uniqueUsers = new Set(pendingTasks.map(task => task.receiverUserId));
            return uniqueUsers.size;
        }

    }, [tasksData, userRole]);

    // Update tab title with pending tasks count
    useEffect(() => {
        if (setTabCount) {
            setTabCount(pendingTasksCount);
        }
    }, [pendingTasksCount, setTabCount]);

    // Filter pending tasks for checkout modal (only for user role)
    const checkoutPendingTasks = useMemo(() => {
        if (userRole !== 'user' || !tasksData?.data || !Array.isArray(tasksData.data)) return [];
        return tasksData.data.filter(
            task => (task.taskStatus === 'pending' || task.taskStatus === 'Pending') && !task.isArchived
        );
    }, [tasksData, userRole]);

    // Profile dropdown items
    const profileItems = [
        {
            key: 'profile-header',
            label: (
                <div className="profile-dropdown-header">
                    <div className="profile-avatar-section">
                        <Avatar
                            size={64}
                            src={profilePhotoUrl}
                            icon={<UserOutlined />}
                            className="profile-main-avatar"
                        />
                        <div className="profile-info">
                            <div className="profile-name">{fullName}</div>
                            <div className="profile-role">{user?.role || 'User'} • ({user?.position || 'Position'})</div>
                            <div className="profile-email">{user?.email || user?.userEmail || ''}</div>
                        </div>
                    </div>
                </div>
            ),
            disabled: true,
        },
        {
            type: 'divider',
        },
        {
            key: 'edit-profile',
            icon: "",
            label: (
                <div className="edit-profile-button-container">
                    <Button
                        type="primary"
                        size="small"
                        className="edit-profile-button"
                        icon={<UserOutlined />}
                        onClick={() => navigate('/profile-settings')}
                    >
                        Edit Profile
                    </Button>
                </div>
            ),
        },
        {
            type: 'divider',
        },
        {
            key: 'settings',
            icon: <SettingOutlined />,
            label: 'Settings',
        },
        {
            key: 'logout',
            icon: isLoggingOut ? <LoadingOutlined spin style={{ color: '#ff4d4f' }} /> : <LogoutOutlined />,
            label: isLoggingOut ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LoadingOutlined spin style={{ fontSize: '14px' }} />
                    Logging out...
                </span>
            ) : 'Logout',
            danger: true,
            disabled: isLoggingOut,
            style: isLoggingOut ? {
                opacity: 1,
                cursor: 'wait',
                backgroundColor: 'rgba(255, 77, 79, 0.05)'
            } : {},
        },
    ];

    // Set greeting and date/time based on Indian time
    useEffect(() => {
        // Update date function (no time)
        const updateDate = () => {
            const now = new Date();
            const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

            // Format date
            const dateOptions = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            const date = istTime.toLocaleDateString('en-IN', dateOptions);

            // Get day name
            const dayOptions = { weekday: 'long' };
            const day = istTime.toLocaleDateString('en-IN', dayOptions);

            setCurrentDate({
                date,
                day
            });
        };

        const updateGreeting = () => {
            const now = new Date();
            // Convert to Indian Standard Time (IST)
            const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
            const hour = istTime.getHours();

            if (hour >= 5 && hour < 12) {
                setGreeting('Good Morning');
            } else if (hour >= 12 && hour < 17) {
                setGreeting('Good Afternoon');
            } else if (hour >= 17 && hour < 21) {
                setGreeting('Good Evening');
            } else {
                setGreeting('Good Night');
            }
        };

        // Update greeting and date immediately
        updateGreeting();
        updateDate();

        // Update greeting every minute to handle hour changes
        const greetingInterval = setInterval(updateGreeting, 60000);

        // Update date once (no need for continuous updates)
        // Date only changes at midnight

        return () => {
            clearInterval(greetingInterval);
        };
    }, []);

    return (
        <>


            <div id="PortalHeader" className="portal-header">
                {/* Makar Sankranti Festival Decorations */}


                <div className="PortalContainer h-100">
                    <div className="h-100">
                        <Row className="h-100">
                            <Col lg={18}>
                                <div className="PortalGreetingsContainer">
                                    <div className="PortalGreetingsText">
                                        <div>
                                            <p>{greeting},&nbsp;<span className="PortalGreetingsName">{fullName}</span>&nbsp; 👋</p>
                                        </div>
                                        <div className="ShowCurrentDateAndTime">
                                            <div className="date-container">
                                                <div className="date-info">
                                                    <CalendarOutlined className="date-icon" />
                                                    <span className="date-text">
                                                        {currentDate.date}
                                                    </span>
                                                </div>

                                            </div>
                                        </div>
                                        {user?.role?.toLowerCase() !== 'admin' && user?.position?.toLowerCase() !== 'admin' && (
                                            <div className="portal-attendance-actions">
                                                <Button
                                                    size="small"
                                                    icon={<ExportOutlined />}
                                                    onClick={() => setCheckoutModalOpen(true)}
                                                    className="portal-checkout-button"
                                                >
                                                    Check Out
                                                </Button>
                                                {checkInStatus?.checkedIn && (checkInStatus?.timestamp || checkInStatus?.checkInAt) && (
                                                    <div className="portal-checkin-time">
                                                        <ClockCircleOutlined />
                                                        <span>In: {dayjs(checkInStatus.timestamp || checkInStatus.checkInAt).format('hh:mm A')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Col>
                            <Col lg={6}>
                                <div className="PortalProfileDetailsContainer">
                                    <Space size="middle" className="portal-header-actions">
                                        {/* Theme Toggle */}
                                        <Button
                                            type="text"
                                            icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                                            onClick={handleThemeToggle}
                                            className="portal-theme-button"
                                        >
                                            {isDarkMode ? 'Light' : 'Dark'}
                                        </Button>

                                        {/* Notification Icon */}
                                        <Dropdown
                                            menu={{ items: notificationItems }}
                                            placement="bottomRight"
                                            trigger={['click']}
                                            overlayClassName="portal-notification-dropdown"
                                        >
                                            <Button type="text" className="portal-notification-button">
                                                <Badge count={pendingTasksCount > 0 ? pendingTasksCount : 0} size="small">
                                                    <BellOutlined className="portal-header-icon" />
                                                </Badge>
                                            </Button>
                                        </Dropdown>

                                        {/* Profile Dropdown */}
                                        <Dropdown
                                            menu={{
                                                items: profileItems,
                                                onClick: ({ key }) => {
                                                    if (key === 'logout') {
                                                        handleLogout();
                                                    } else if (key === 'edit-profile') {
                                                        navigate('/profile-settings');
                                                    }
                                                }
                                            }}
                                            placement="bottomRight"
                                            trigger={['click']}
                                            overlayClassName="portal-profile-dropdown"
                                        >
                                            <Button type="text" className="portal-profile-button">
                                                <Avatar
                                                    size="small"
                                                    src={profilePhotoUrl}
                                                    icon={<UserOutlined />}
                                                />
                                                <span className="portal-profile-name">{firstName}</span>
                                            </Button>
                                        </Dropdown>
                                    </Space>
                                </div>
                            </Col>
                        </Row>
                    </div>
                </div>
            </div>
            <Modal
                title="Confirm Check-Out"
                open={checkoutModalOpen}
                onOk={async () => {
                    try {
                        await checkout({ userId, checkOutReason: checkoutReason || '' }).unwrap();
                        setCheckoutModalOpen(false);
                        setCheckoutReason('');
                        success('Checked out successfully');
                        // Immediately log the user out
                        dispatch(logout());
                        navigate('/');
                    } catch (e) {
                        // Optional: surface error via notification
                    }
                }}
                onCancel={() => setCheckoutModalOpen(false)}
                okText="Check Out"
                confirmLoading={isCheckoutLoading}
                cancelText="Cancel"
                className="checkout-modal"
            >

                {userRole === 'user' && checkoutPendingTasks.length > 0 && (
                    <div className="checkout-pending-warning" style={{
                        marginBottom: '16px',
                        padding: '12px',
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px'
                    }}>
                        <div style={{ color: '#cf1322', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <WarningOutlined />
                            Pending Tasks Alert
                        </div>
                        <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-color)', opacity: 0.85 }}>You have {checkoutPendingTasks.length} pending task(s). Please complete them if possible before checking out.</p>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                            gap: '12px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            padding: '4px'
                        }}>
                            {checkoutPendingTasks.map((task, index) => (
                                <div key={task._id || index} style={{
                                    backgroundColor: 'var(--card-bg)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    padding: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}>
                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: 'var(--text-color)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {task.taskName || 'Untitled Task'}
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        color: 'var(--text-color)',
                                        opacity: 0.7,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <UserOutlined style={{ fontSize: '10px' }} />
                                        <span>{getUserName(task.userId)}</span>
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        color: 'var(--text-color)',
                                        opacity: 0.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        marginTop: 'auto'
                                    }}>
                                        <ClockCircleOutlined style={{ fontSize: '10px' }} />
                                        <span>{dayjs(task.createdAt || task.updatedAt).fromNow()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <p>You can optionally add a reason for checking out.</p>
                <Input.TextArea
                    rows={3}
                    placeholder="Reason (optional)"
                    value={checkoutReason}
                    onChange={(e) => setCheckoutReason(e.target.value)}
                />
            </Modal>
        </>
    )
}

export default PortalHeader;
