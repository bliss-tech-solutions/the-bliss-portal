import React, { useState, useEffect } from "react";
import "./PortalHeader.css";
import { Row, Col, Dropdown, Badge, Avatar, Space, Button, Spin } from "antd";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectCurrentHeaderLogo, toggleTheme, selectTheme } from "../../../store/slices/themeSlice";
import { logout } from "../../../store/slices/authSlice";
import { useNotification } from "../../../contexts/NotificationContext";
import { SunOutlined, MoonOutlined, BellOutlined, UserOutlined, SettingOutlined, LogoutOutlined, CalendarOutlined, ClockCircleOutlined, LoadingOutlined } from "@ant-design/icons";

const PortalHeader = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const currentHeaderLogo = useSelector(selectCurrentHeaderLogo);
    const theme = useSelector(selectTheme);
    const { success } = useNotification();
    const [greeting, setGreeting] = useState('Good Morning');
    const [currentDate, setCurrentDate] = useState({
        date: '',
        day: ''
    });
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const isDarkMode = theme === 'dark';

    const handleThemeToggle = () => {
        dispatch(toggleTheme());
    };

    // Handle logout with loading state
    const handleLogout = async () => {
        setIsLoggingOut(true);

        // Show loading for 1.5-2 seconds
        setTimeout(() => {
            // Dispatch logout action to clear Redux state and localStorage
            dispatch(logout());

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

    // Notification dropdown items
    const notificationItems = [
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
        {
            key: '3',
            label: (
                <div className="notification-item">
                    <div className="notification-title">System Update</div>
                    <div className="notification-time">3 hours ago</div>
                </div>
            ),
        },
    ];

    // Profile dropdown items
    const profileItems = [
        {
            key: 'profile-header',
            label: (
                <div className="profile-dropdown-header">
                    <div className="profile-avatar-section">
                        <Avatar size={64} icon={<UserOutlined />} className="profile-main-avatar" />
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
            icon: isLoggingOut ? <LoadingOutlined spin /> : <LogoutOutlined />,
            label: isLoggingOut ? 'Logging out...' : 'Logout',
            danger: true,
            disabled: isLoggingOut,
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
        <div id="PortalHeader" className="portal-header">
            <div className="PortalContainer h-100">
                <div className="h-100">
                    <Row className="h-100">
                        <Col lg={18}>
                            <div className="PortalGreetingsContainer">
                                <div className="PortalGreetingsText">
                                    <div>
                                        <p>{greeting},&nbsp;<span className="PortalGreetingsName">{fullName}</span></p>
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
                                            <Badge count={3} size="small">
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
                                            <Avatar size="small" icon={<UserOutlined />} />
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
    )
}

export default PortalHeader;
