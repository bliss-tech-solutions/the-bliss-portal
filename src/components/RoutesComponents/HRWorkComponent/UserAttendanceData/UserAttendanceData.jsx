import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Table, Button, Space, Drawer, DatePicker, Tag, Typography, Divider } from 'antd';
import { UserOutlined, ClockCircleOutlined, LogoutOutlined, InfoCircleOutlined, CopyOutlined } from '@ant-design/icons';
import './UserAttendanceData.css';
import { useGetAllUsersQuery, useGetTodayCheckinQuery, useGetAllCheckinsQuery } from '../../../../store/api';
import { useNotification } from '../../../../contexts/NotificationContext';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const TodayTime = ({ userId, type }) => {
    const { data } = useGetTodayCheckinQuery(userId, { skip: !userId });
    const rec = data?.data || null;
    const val = type === 'in' ? (rec?.checkInAt || rec?.checkinAt) : (rec?.checkOutAt || rec?.checkoutAt);
    if (!val) return '-';
    const t = new Date(val);
    return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const TodayDur = ({ userId }) => {
    const { data } = useGetTodayCheckinQuery(userId, { skip: !userId });
    const rec = data?.data || null;
    const inVal = rec?.checkInAt || rec?.checkinAt;
    const outVal = rec?.checkOutAt || rec?.checkoutAt;
    if (!inVal || !outVal) return '-';
    const ms = new Date(outVal) - new Date(inVal);
    if (ms <= 0) return '-';
    const hrs = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hrs}h ${String(mins).padStart(2, '0')}m`;
};

const initialColumns = [
    { key: 'userId', title: 'User ID', dataIndex: 'userId', width: 100 },
    { key: 'userName', title: 'User Name', dataIndex: 'userName', width: 220 },
    { key: 'todayIn', title: 'Today Punch-In', dataIndex: 'todayIn', width: 160 },
    { key: 'leaveTime', title: 'Leave Time', dataIndex: 'leaveTime', width: 140 },
    { key: 'avgHours', title: 'Average Working Hours', dataIndex: 'avgHours', width: 200 },
    { key: 'position', title: 'Position', dataIndex: 'position', width: 160 },
    { key: 'details', title: 'Details', dataIndex: 'details', width: 120 },
];

const UserAttendanceData = () => {
    const [orderedColumns, setOrderedColumns] = useState(initialColumns);
    const [columnWidths, setColumnWidths] = useState(() => Object.fromEntries(initialColumns.map(c => [c.key, c.width])));
    const dragFromIndexRef = useRef(null);
    const resizingRef = useRef({ key: null, startX: 0, startWidth: 0 });

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [dateRange, setDateRange] = useState(null);

    const { success, warning, error: showError } = useNotification();
    const { data: usersResp, isLoading } = useGetAllUsersQuery();
    const { data: allCheckinsResp, isLoading: isCheckinsLoading } = useGetAllCheckinsQuery();

    const dataSource = useMemo(() => {
        const users = usersResp?.data || [];
        return users
            .filter(u => {
                const role = (u.role || '').toLowerCase();
                const position = (u.position || '').toLowerCase();
                return role !== 'admin' && position !== 'admin';
            })
            .map((u, idx) => ({
                key: u.userId || u._id || idx,
                userId: u.userId || u._id || '-',
                userName: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.userEmail || u.email || '-',
                todayIn: <TodayTime userId={u.userId} type="in" />,
                leaveTime: <TodayTime userId={u.userId} type="out" />,
                avgHours: <TodayDur userId={u.userId} />,
                position: u.position || u.role || '-',
                details: u,
                index: idx + 1,
            }));
    }, [usersResp]);

    const handleCopyUserId = useCallback(async (userId) => {
        if (!userId || userId === '-') {
            warning('No User ID available to copy');
            return;
        }

        try {
            await navigator.clipboard.writeText(userId);
            success(`User ID "${userId}" copied to clipboard!`, 3000);
        } catch (error) {
            // Fallback for older browsers
            try {
                const textArea = document.createElement('textarea');
                textArea.value = userId;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                success(`User ID "${userId}" copied to clipboard!`, 3000);
            } catch (fallbackError) {
                showError(`Failed to copy User ID: ${userId}`);
                console.error('Copy error:', fallbackError);
            }
        }
    }, [success, warning, showError]);

    const onHeaderDragStart = useCallback((index) => () => {
        dragFromIndexRef.current = index;
    }, []);

    const onHeaderDragOver = useCallback((e) => {
        e.preventDefault();
    }, []);

    const onHeaderDrop = useCallback((toIndex) => (e) => {
        e.preventDefault();
        const fromIndex = dragFromIndexRef.current;
        if (fromIndex === null || fromIndex === toIndex) return;
        const next = orderedColumns.slice();
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        setOrderedColumns(next);
        dragFromIndexRef.current = null;
    }, [orderedColumns]);

    const startResize = useCallback((key, currentWidth) => (e) => {
        e.preventDefault();
        e.stopPropagation();
        resizingRef.current = { key, startX: e.clientX, startWidth: currentWidth };
        const handleMove = (me) => {
            const delta = me.clientX - resizingRef.current.startX;
            const nextWidth = Math.max(100, resizingRef.current.startWidth + delta);
            setColumnWidths(prev => ({ ...prev, [key]: nextWidth }));
        };
        const handleUp = () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            resizingRef.current = { key: null, startX: 0, startWidth: 0 };
        };
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    }, []);

    const columns = useMemo(() => {
        return orderedColumns.map((col, index) => {
            if (col.key === 'details') {
                return {
                    ...col,
                    width: columnWidths[col.key],
                    align: 'center',
                    render: (_, record) => (
                        <Space>
                            <Button size="small" type="link" icon={<InfoCircleOutlined />} onClick={() => {
                                setSelectedUser(record.details);
                                setDateRange(null);
                                setIsDrawerOpen(true);
                            }}>
                                Details
                            </Button>
                        </Space>
                    ),
                    onHeaderCell: () => ({
                        draggable: true,
                        onDragStart: onHeaderDragStart(index),
                        onDragOver: onHeaderDragOver,
                        onDrop: onHeaderDrop(index),
                        style: { width: columnWidths[col.key] },
                    }),
                    title: (
                        <div className="ua-header">
                            <span>Details</span>
                            <span className="ua-resizer" onMouseDown={startResize(col.key, columnWidths[col.key])} />
                        </div>
                    ),
                };
            }

            if (col.key === 'userId') {
                return {
                    ...col,
                    width: columnWidths[col.key],
                    align: 'center',
                    render: (_, record) => (
                        <Button
                            size="small"
                            type="text"
                            icon={<CopyOutlined />}
                            onClick={() => handleCopyUserId(record.userId)}
                            title={`Copy User ID: ${record.userId}`}
                            className="ua-copy-button"
                        />
                    ),
                    onHeaderCell: () => ({
                        draggable: true,
                        onDragStart: onHeaderDragStart(index),
                        onDragOver: onHeaderDragOver,
                        onDrop: onHeaderDrop(index),
                        style: { width: columnWidths[col.key] },
                    }),
                    title: (
                        <div className="ua-header">
                            <span className="ua-title">User ID</span>
                            <span className="ua-resizer" onMouseDown={startResize(col.key, columnWidths[col.key])} />
                        </div>
                    ),
                };
            }

            const icon = col.key === 'userName' ? <UserOutlined className="ua-col-icon" />
                : col.key === 'todayIn' ? <ClockCircleOutlined className="ua-col-icon" />
                    : col.key === 'leaveTime' ? <LogoutOutlined className="ua-col-icon" />
                        : null;

            return {
                ...col,
                width: columnWidths[col.key],
                onHeaderCell: () => ({
                    draggable: true,
                    onDragStart: onHeaderDragStart(index),
                    onDragOver: onHeaderDragOver,
                    onDrop: onHeaderDrop(index),
                    style: { width: columnWidths[col.key] },
                }),
                title: (
                    <div className="ua-header">
                        <span className="ua-title">{icon}{col.title}</span>
                        <span className="ua-resizer" onMouseDown={startResize(col.key, columnWidths[col.key])} />
                    </div>
                ),
            };
        });
    }, [orderedColumns, columnWidths, onHeaderDragStart, onHeaderDragOver, onHeaderDrop, startResize, handleCopyUserId]);

    return (
        <div className="ua-container">
            <div className="ua-title-bar">
                <h2>Employee Attendance</h2>
            </div>
            <br />
            <Table
                dataSource={dataSource}
                columns={columns}
                loading={isLoading}
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                scroll={{ x: Object.values(columnWidths).reduce((a, b) => a + b, 0) + 100 }}
                bordered
                size="middle"
            />

            <Drawer
                title={<span className="ua-drawer-title">Attendance Details</span>}
                placement="right"
                onClose={() => setIsDrawerOpen(false)}
                open={isDrawerOpen}
                width={1000}
                className="ua-details-drawer"
            >
                {selectedUser && (
                    <div className="ua-drawer-content">
                        <div className="ua-user-info-card">
                            <div className="ua-info-header">
                                <Title level={4}>{[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') || selectedUser.email}</Title>
                                <Tag color="blue">{selectedUser.position || selectedUser.role || 'Employee'}</Tag>
                            </div>
                            <Text type="secondary">User ID: {selectedUser.userId || selectedUser._id}</Text>
                        </div>

                        <Divider />

                        <div className="ua-filters-bar">
                            <Text strong>Filter by Date Range: </Text>
                            <RangePicker
                                onChange={(val) => setDateRange(val)}
                                value={dateRange}
                                style={{ marginLeft: 12 }}
                            />
                        </div>

                        <Table
                            className="ua-history-table"
                            loading={isCheckinsLoading}
                            dataSource={
                                (allCheckinsResp?.data || [])
                                    .filter(c => c.userId === selectedUser.userId)
                                    .filter(c => {
                                        if (!dateRange || !dateRange[0] || !dateRange[1]) return true;
                                        const checkDate = dayjs(c.checkInAt || c.checkinAt);
                                        return checkDate.isAfter(dateRange[0].startOf('day')) &&
                                            checkDate.isBefore(dateRange[1].endOf('day'));
                                    })
                                    .map((c, i) => ({
                                        key: c._id || i,
                                        date: dayjs(c.checkInAt || c.checkinAt).format('DD MMM YYYY'),
                                        checkIn: dayjs(c.checkInAt || c.checkinAt).format('hh:mm A'),
                                        checkOut: (c.checkOutAt || c.checkoutAt) ? dayjs(c.checkOutAt || c.checkoutAt).format('hh:mm A') : '-',
                                        workingHours: (() => {
                                            const inT = new Date(c.checkInAt || c.checkinAt);
                                            const outT = (c.checkOutAt || c.checkoutAt) ? new Date(c.checkOutAt || c.checkoutAt) : null;
                                            if (!outT || isNaN(outT.getTime())) return '-';
                                            const ms = outT - inT;
                                            if (ms <= 0) return '-';
                                            const hrs = Math.floor(ms / 3600000);
                                            const mins = Math.floor((ms % 3600000) / 60000);
                                            return `${hrs}h ${String(mins).padStart(2, '0')}m`;
                                        })(),
                                        position: selectedUser.position || selectedUser.role || '-',
                                        name: [selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') || selectedUser.email
                                    }))
                                    .reverse()
                            }
                            columns={[
                                { title: 'Date', dataIndex: 'date', key: 'date' },
                                { title: 'Name', dataIndex: 'name', key: 'name' },
                                { title: 'Position', dataIndex: 'position', key: 'position' },
                                { title: 'Check In', dataIndex: 'checkIn', key: 'checkIn' },
                                { title: 'Check Out', dataIndex: 'checkOut', key: 'checkOut' },
                                { title: 'Working Hours', dataIndex: 'workingHours', key: 'workingHours' },
                            ]}
                            pagination={{ pageSize: 12 }}
                            size="small"
                        />
                    </div>
                )}
            </Drawer>
        </div>
    );
};

export default UserAttendanceData;