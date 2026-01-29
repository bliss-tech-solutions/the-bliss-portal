import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Table, Button, Space, Drawer, DatePicker, Tag, Typography, Divider, Input, Select } from 'antd';
import './UserAttendanceData.css';
import { useGetAllUsersQuery, useGetAllCheckinsQuery, useGetUniqueRolesQuery } from '../../../../store/api';
import { useNotification } from '../../../../contexts/NotificationContext';
import dayjs from 'dayjs';
import { UserOutlined, ClockCircleOutlined, LogoutOutlined, InfoCircleOutlined, CopyOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

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
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [orderedColumns, setOrderedColumns] = useState(initialColumns);
    const [columnWidths, setColumnWidths] = useState(() => Object.fromEntries(initialColumns.map(c => [c.key, c.width])));
    const dragFromIndexRef = useRef(null);
    const resizingRef = useRef({ key: null, startX: 0, startWidth: 0 });

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [dateRange, setDateRange] = useState(null);

    const { success, warning, error: showError } = useNotification();
    const { data: usersResp, isLoading } = useGetAllUsersQuery();
    // Fetch with a high limit to try and get all recent records
    const { data: allCheckinsResp, isLoading: isCheckinsLoading } = useGetAllCheckinsQuery({ limit: 1000 });
    const { data: uniqueRolesResp } = useGetUniqueRolesQuery();

    const positions = useMemo(() => {
        return (uniqueRolesResp?.data?.positions || []).filter(pos => pos.toLowerCase() !== 'admin');
    }, [uniqueRolesResp]);

    const userCheckinMap = useMemo(() => {
        const map = new Map();
        const checkinData = allCheckinsResp?.data || [];

        checkinData.forEach(record => {
            if (record.userId) {
                if (!map.has(record.userId)) {
                    map.set(record.userId, []);
                }
                map.get(record.userId).push(record);
            }
        });
        return map;
    }, [allCheckinsResp]);

    const todayDateStr = dayjs().format('YYYY-MM-DD');

    const dataSource = useMemo(() => {
        const users = usersResp?.data || [];
        return users
            .filter(u => {
                const role = (u.role || '').toLowerCase();
                const position = (u.position || '').toLowerCase();
                if (role === 'admin' || position === 'admin') return false;

                // Filter by selected position
                if (selectedPosition && u.position !== selectedPosition) return false;

                if (!searchTerm) return true;
                const searchLower = searchTerm.toLowerCase();
                const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').toLowerCase();
                const email = (u.userEmail || u.email || '').toLowerCase();
                const userId = (u.userId || u._id || '').toString().toLowerCase();

                return fullName.includes(searchLower) ||
                    email.includes(searchLower) ||
                    userId.includes(searchLower);
            })
            .map((u, idx) => {
                const userId = u.userId || u._id;
                const userHistory = userCheckinMap.get(userId) || [];
                // Find today's record
                const todayRec = userHistory.find(r => r.date === todayDateStr);

                let todayIn = '-';
                let leaveTime = '-';
                let avgHours = '-';

                if (todayRec) {
                    const inTime = todayRec.checkInAt || todayRec.checkinAt;
                    const outTime = todayRec.checkOutAt || todayRec.checkOutAt;

                    if (inTime) {
                        todayIn = new Date(inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                    if (outTime) {
                        leaveTime = new Date(outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }

                    if (inTime && outTime) {
                        const ms = new Date(outTime) - new Date(inTime);
                        if (ms > 0) {
                            const hrs = Math.floor(ms / 3600000);
                            const mins = Math.floor((ms % 3600000) / 60000);
                            avgHours = `${hrs}h ${String(mins).padStart(2, '0')}m`;
                        }
                    }
                }

                return {
                    key: userId || idx,
                    userId: userId || '-',
                    userName: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.userEmail || u.email || '-',
                    todayIn,
                    leaveTime,
                    avgHours,
                    position: u.position || u.role || '-',
                    details: u,
                    index: idx + 1,
                };
            });
    }, [usersResp, searchTerm, selectedPosition, userCheckinMap, todayDateStr]);

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


    // Helper to get history for the selected user from the new nested API structure
    const getSelectedUserHistory = () => {
        if (!selectedUser) return [];
        const userId = selectedUser.userId || selectedUser._id;
        return userCheckinMap.get(userId) || [];
    };

    return (
        <div className="ua-container">
            <div className="ua-title-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0 }}>Employee Attendance</h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Select
                        placeholder="Filter by Department"
                        style={{ width: 220 }}
                        allowClear
                        onChange={setSelectedPosition}
                        options={positions.map(pos => ({ label: pos, value: pos }))}
                    />
                    <Input.Search
                        placeholder="Search User..."
                        allowClear
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: 260 }}
                    />
                </div>
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
                                getSelectedUserHistory()
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