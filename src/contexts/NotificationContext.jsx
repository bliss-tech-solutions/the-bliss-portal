import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Snackbar, Alert } from '@mui/material';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState({
        open: false,
        message: '',
        type: 'success', // 'success', 'error', 'warning', 'info'
        duration: 4000
    });

    const [tabCount, setTabCount] = useState(0);
    const originalTitleRef = useRef(document.title);

    useEffect(() => {
        if (tabCount > 0) {
            document.title = `(${tabCount}) ${originalTitleRef.current}`;
        } else {
            document.title = originalTitleRef.current;
        }
    }, [tabCount]);

    const showNotification = (message, type = 'success', duration = 4000) => {
        setNotification({
            open: true,
            message,
            type,
            duration
        });
    };

    const hideNotification = () => {
        setNotification(prev => ({
            ...prev,
            open: false
        }));
    };

    const success = (message, duration = 4000) => showNotification(message, 'success', duration);
    const error = (message, duration = 4000) => showNotification(message, 'error', duration);
    const warning = (message, duration = 4000) => showNotification(message, 'warning', duration);
    const info = (message, duration = 4000) => showNotification(message, 'info', duration);

    // Theme-aware styles for notifications
    const getNotificationStyles = () => {
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

        return {
            '& .MuiAlert-root': {
                borderRadius: '8px',
                fontWeight: '500',
                fontSize: '14px',
                boxShadow: isDarkMode ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
                border: 'none',
            },
            '& .MuiAlert-filledSuccess': {
                backgroundColor: isDarkMode ? 'var(--success-color)' : 'var(--success-color)',
                color: isDarkMode ? '#000000' : '#ffffff',
            },
            '& .MuiAlert-filledError': {
                backgroundColor: isDarkMode ? 'var(--danger-color)' : 'var(--danger-color)',
                color: isDarkMode ? '#000000' : '#ffffff',
            },
            '& .MuiAlert-filledWarning': {
                backgroundColor: isDarkMode ? 'var(--warning-color)' : 'var(--warning-color)',
                color: isDarkMode ? '#000000' : '#ffffff',
            },
            '& .MuiAlert-filledInfo': {
                backgroundColor: isDarkMode ? 'var(--info-color)' : 'var(--info-color)',
                color: isDarkMode ? '#000000' : '#ffffff',
            },
            '& .MuiAlert-icon': {
                fontSize: '20px',
            },
            '& .MuiAlert-message': {
                padding: '8px 0',
            },
            '& .MuiIconButton-root': {
                color: isDarkMode ? '#000000' : '#ffffff',
                '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                },
            },
        };
    };

    return (
        <NotificationContext.Provider value={{ success, error, warning, info, hideNotification, setTabCount }}>
            {children}
            <Snackbar
                open={notification.open}
                autoHideDuration={notification.duration}
                onClose={hideNotification}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                sx={{
                    top: '24px !important',
                    right: '24px !important',
                    zIndex: 9999,
                }}
            >
                <Alert
                    onClose={hideNotification}
                    severity={notification.type}
                    variant="filled"
                    sx={getNotificationStyles()}
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </NotificationContext.Provider>
    );
};
