import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Space, Typography } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import './OfficeClosingReminder.css';

const { Title, Text, Paragraph } = Typography;

const OfficeClosingReminder = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const remindTimeoutRef = useRef(null);
    const checkIntervalRef = useRef(null);
    const lastShownDateRef = useRef(null);

    // Check if current time matches office closing time (7:05 PM = 19:05)
    // Temporarily hidden as per user request
    return null;

    const checkClosingTime = () => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const today = now.toDateString();

        // Check if time is 7:05 PM (19:05) and not already shown today
        if (hours === 19 && minutes === 5) {
            if (lastShownDateRef.current !== today) {
                setIsModalVisible(true);
                lastShownDateRef.current = today;
            }
        }
    };

    useEffect(() => {
        // Check every 10 seconds for more accurate timing
        checkIntervalRef.current = setInterval(() => {
            checkClosingTime();
        }, 10000); // Check every 10 seconds

        // Initial check
        checkClosingTime();

        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
            if (remindTimeoutRef.current) {
                clearTimeout(remindTimeoutRef.current);
            }
        };
    }, []);

    const handleClose = () => {
        setIsModalVisible(false);
        // Clear any existing reminder
        if (remindTimeoutRef.current) {
            clearTimeout(remindTimeoutRef.current);
            remindTimeoutRef.current = null;
        }
    };

    const handleRemindMe = () => {
        setIsModalVisible(false);

        // Clear existing timeout if any
        if (remindTimeoutRef.current) {
            clearTimeout(remindTimeoutRef.current);
        }

        // Set reminder for 10 minutes (600000 milliseconds)
        remindTimeoutRef.current = setTimeout(() => {
            setIsModalVisible(true);
            remindTimeoutRef.current = null;
        }, 10 * 60 * 1000); // 10 minutes
    };

    return (
        <Modal
            open={isModalVisible}
            onCancel={handleClose}
            footer={null}
            closable={false}
            maskClosable={false}
            keyboard={false}
            centered
            width={480}
            className="office-closing-reminder-modal"
        >
            <div className="office-closing-content">
                {/* Icon Section */}
                <div className="reminder-icon-container">
                    <ClockCircleOutlined className="clock-icon" />
                </div>

                {/* Message Content */}
                <div className="reminder-message">
                    <Title level={4} className="reminder-title">
                        Office Hours Closing Time
                    </Title>
                    <Paragraph className="reminder-text">
                        It's <Text strong>7:05 PM</Text> - time to wrap up and head home.
                    </Paragraph>
                    <Paragraph className="reminder-subtext" type="secondary">
                        You've done amazing work today. Time to relax, recharge, and enjoy your evening.
                        Remember, work-life balance is important to Bliss Solutions.
                    </Paragraph>
                </div>

                {/* Action Buttons */}
                <div className="reminder-actions">
                    <Space size="middle">
                        <Button
                            size="large"
                            onClick={handleRemindMe}
                        >
                            Remind Me in 10 Minutes
                        </Button>
                        <Button
                            type="primary"
                            size="large"
                            onClick={handleClose}
                            icon={<CheckCircleOutlined />}
                        >
                            Close
                        </Button>
                    </Space>
                </div>
            </div>
        </Modal>
    );
};

export default OfficeClosingReminder;

