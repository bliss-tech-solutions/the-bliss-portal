import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Space, Typography, message, Input } from 'antd';
import { LoginOutlined, FieldTimeOutlined } from '@ant-design/icons';
import './CheckInOutReminder.css';
import { useSelector } from 'react-redux';
import { useCheckInMutation, useCheckInStatusQuery } from '../../../store/api';

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

    // Query server for today's check-in status (no localStorage gating)
    const { data: statusData, isFetching } = useCheckInStatusQuery(
        { userId },
        { skip: !userId }
    );

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
            await checkIn({ userId, checkInReason: reason || '' }).unwrap();
            message.success('Checked in successfully');
            closeModal();
            setReason('');
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
            width={480}
            className="checkin-reminder-modal"
            maskClosable={false}
            keyboard={false}
        >
            <div className="checkin-reminder-content">
                <div className="checkin-icon-wrap">
                    <FieldTimeOutlined className="checkin-main-icon" />
                </div>

                <div className="checkin-text">
                    <Title level={4} className="checkin-title">Daily Check-In</Title>
                    <Paragraph className="checkin-subtext">
                        Welcome back! Please check in to start your work day.
                    </Paragraph>
                </div>

                <div className="checkin-reason" style={{ marginBottom: 16 }}>
                    <Input.TextArea
                        rows={3}
                        placeholder="Reason (optional)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>
                <div className="checkin-actions">
                    <Space size="middle">
                        <Button type="primary" size="large" icon={<LoginOutlined />} onClick={handleCheckIn} loading={isLoading} disabled={isLoading}>
                            Check In
                        </Button>
                    </Space>
                </div>

                <div className="checkin-hint">
                    <Text type="secondary">Check-Out will be available in the Attendance panel.</Text>
                </div>
            </div>
        </Modal>
    );
};

export default CheckInOutReminder;


