import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Table, Button, Space, Drawer, DatePicker, Tag, Typography, Divider, Input, Select, Dropdown } from 'antd';
import './UserAttendanceData.css';
import { useGetAllUsersQuery, useGetAllCheckinsQuery, useGetUniqueRolesQuery, useLazyGetCheckinAnalysisQuery } from '../../../../store/api';
import { useNotification } from '../../../../contexts/NotificationContext';
import dayjs from 'dayjs';
import { UserOutlined, ClockCircleOutlined, LogoutOutlined, InfoCircleOutlined, CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

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

    const [downloadRange, setDownloadRange] = useState(null);

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

    const [triggerAnalysis] = useLazyGetCheckinAnalysisQuery();

    const handleDownloadAttendance = useCallback(async () => {
        if (!downloadRange || !downloadRange[0] || !downloadRange[1]) {
            warning('Please select a date range first');
            return;
        }

        try {
            const startDate = downloadRange[0].format('YYYY-MM-DD');
            const endDate = downloadRange[1].format('YYYY-MM-DD');

            // Fetch data from API
            const response = await triggerAnalysis({
                startDate,
                endDate
            }).unwrap();

            if (!response.success || !response.data) {
                showError('Failed to fetch attendance analysis data');
                return;
            }

            // Map API response to Excel format
            const excelData = response.data.map(item => {
                const summary = item.summary || {};

                // Find user details from existing users list for name/position if needed
                // The API response seems to have userId but might not have name/position directly in the top level
                // We'll try to find it in our local users list
                const userDetails = usersResp?.data?.find(u =>
                    (u.userId === item.userId || u._id === item.userId)
                );

                const userName = userDetails
                    ? [userDetails.firstName, userDetails.lastName].filter(Boolean).join(' ')
                    : item.userId;

                const position = userDetails?.position || userDetails?.role || '-';

                // Format working hours
                const totalHours = Math.floor(summary.totalWorkingHours || 0);
                const totalMins = Math.round(((summary.totalWorkingHours || 0) % 1) * 60);
                const workingHoursStr = `${totalHours}h ${totalMins}m`;

                return {
                    'UserName': userName,
                    'UserId': item.userId,
                    'Working Hours': workingHoursStr,
                    'Position': position,
                    'Total Full Days': summary.fullDays || 0,
                    'Total Half Days': summary.halfDays || 0,
                    'Total Days Present': summary.totalDaysPresent || 0
                };
            });

            // Sort by Total Half Days descending
            excelData.sort((a, b) => b['Total Half Days'] - a['Total Half Days']);

            // Create worksheet
            const worksheet = XLSX.utils.json_to_sheet(excelData);

            // Set column widths
            worksheet['!cols'] = [
                { wch: 25 }, // UserName
                { wch: 20 }, // UserId
                { wch: 15 }, // Working Hours
                { wch: 20 }, // Position
                { wch: 15 }, // Total Full Days
                { wch: 15 }, // Total Half Days
                { wch: 18 }  // Total Days Present
            ];

            // Create workbook
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Data');

            // Generate filename based on range
            const fileName = `Attendance_${startDate}_to_${endDate}.xlsx`;

            // Download file
            XLSX.writeFile(workbook, fileName);
            success(`Attendance data downloaded successfully!`);
        } catch (error) {
            console.error('Error downloading attendance:', error);
            showError('Failed to download attendance data. Please try again.');
        }
    }, [downloadRange, triggerAnalysis, usersResp, success, warning, showError]);

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
                    <RangePicker
                        value={downloadRange}
                        onChange={(dates) => setDownloadRange(dates)}
                        placeholder={['Start Date', 'End Date']}
                        style={{ width: 240 }}
                    />
                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleDownloadAttendance}
                        disabled={!downloadRange}
                        style={{
                            backgroundColor: !downloadRange ? '#d9d9d9' : '#28a745',
                            borderColor: !downloadRange ? '#d9d9d9' : '#28a745',
                            cursor: !downloadRange ? 'not-allowed' : 'pointer'
                        }}
                        title={!downloadRange ? "Select a date range to download" : "Download Attendance Report"}
                    >
                        Download Excel
                    </Button>
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