import React, { useState, useMemo, useEffect } from 'react';
import { Table, Input, Select, Button, Avatar, Space, Spin, Typography, Card } from 'antd';
import { SearchOutlined, PlusOutlined, SortAscendingOutlined, ExportOutlined, DownOutlined, UserOutlined, EyeOutlined } from '@ant-design/icons';
import {
    BsPeople,
    BsBuilding,
    BsGraphUp,
    BsActivity,
    BsDatabase,
    BsFilter,
    BsDownload,
    BsArrowUpRight,
    BsFileEarmarkSpreadsheet,
    BsArrowDownRight
} from 'react-icons/bs';
import { useGetAllUsersQuery, useGetAnalyticsOverviewQuery } from '../../../../store/api';
import { useSocket } from '../../../../contexts/SocketContext';
import { useSelector, useDispatch } from 'react-redux';
import { selectShowUserDetails, showUserDetailsView } from '../../../../store/slices/adminDashboardSlice';
import UserWiseAnalytics from '../UserWiseAnalytics/UserWiseAnalytics';
import dayjs from 'dayjs';
import './EmployeesData.css';

const { Search } = Input;
const { Option } = Select;
const { Text, Title } = Typography;

// Map position to department (e.g., "Video Editor" -> "Video Editing")
const getDepartmentFromPosition = (position) => {
    if (!position) return 'General';

    const positionLower = position.toLowerCase();

    // Video related
    if (positionLower.includes('video') || positionLower.includes('editor')) {
        return 'Video Editing';
    }
    // Graphics related
    if (positionLower.includes('graphic') || positionLower.includes('design')) {
        return 'Graphics Design';
    }
    // Development related
    if (positionLower.includes('developer') || positionLower.includes('engineer') || positionLower.includes('programmer')) {
        return 'Development';
    }
    // Content related
    if (positionLower.includes('content') || positionLower.includes('writer') || positionLower.includes('copywriter')) {
        return 'Content Creation';
    }
    // Sales related
    if (positionLower.includes('sales') || positionLower.includes('marketing')) {
        return 'Sales & Marketing';
    }
    // HR related
    if (positionLower.includes('hr') || positionLower.includes('human resource')) {
        return 'Human Resources';
    }
    // Management
    if (positionLower.includes('manager') || positionLower.includes('lead') || positionLower.includes('head')) {
        return 'Management';
    }

    return position || 'General';
};

// Format date from ISO string to readable format
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        return dayjs(dateString).format('MMM D, YYYY');
    } catch (error) {
        return dateString;
    }
};

const EmployeesData = () => {
    const dispatch = useDispatch();
    const showUserDetails = useSelector(selectShowUserDetails);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState(null);
    const { socket } = useSocket();

    // Fetch all users from API
    const { data: usersData, isLoading, error } = useGetAllUsersQuery();

    // Fetch analytics overview from API
    const {
        data: analyticsData,
        isLoading: isLoadingAnalytics,
        error: analyticsError,
        refetch: refetchAnalytics
    } = useGetAnalyticsOverviewQuery();

    // Transform API data to table format
    const employees = useMemo(() => {
        if (!usersData?.data) return [];

        return usersData.data.map((user) => ({
            id: user.userId || user._id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.userEmail || user.email || 'N/A',
            jobTitle: user.position || user.role || 'N/A',
            department: getDepartmentFromPosition(user.position || user.role),
            salary: '0',
            startDate: user.createdAt,
            viewDetails: user, // Store full user object for view details
            avatar: null,
        }));
    }, [usersData]);

    // Real-time analytics updates via socket
    useEffect(() => {
        if (!socket) return;

        const handleAnalyticsUpdate = () => {
            console.log('✅ Analytics data changed - refetching...');
            refetchAnalytics();
        };

        // Listen for analytics update events
        socket.on('analytics:updated', handleAnalyticsUpdate);
        socket.on('analytics:overview:updated', handleAnalyticsUpdate);
        socket.on('employee:created', handleAnalyticsUpdate);
        socket.on('employee:updated', handleAnalyticsUpdate);
        socket.on('employee:deleted', handleAnalyticsUpdate);

        return () => {
            socket.off('analytics:updated', handleAnalyticsUpdate);
            socket.off('analytics:overview:updated', handleAnalyticsUpdate);
            socket.off('employee:created', handleAnalyticsUpdate);
            socket.off('employee:updated', handleAnalyticsUpdate);
            socket.off('employee:deleted', handleAnalyticsUpdate);
        };
    }, [socket, refetchAnalytics]);

    // Summary statistics with icons - using API data
    const summaryStats = useMemo(() => {
        const analytics = analyticsData?.data;

        if (!analytics) {
            // Fallback to calculated values if API data not available
            const totalEmployees = employees.length;
            const uniqueDepartments = [...new Set(employees.map(emp => emp.department))].length;
            const activeEmployees = totalEmployees;

            return [
                {
                    label: 'Total Employees',
                    value: totalEmployees.toString(),
                    icon: <BsPeople className="stat-icon" />,
                    trend: null,
                    isLoading: isLoadingAnalytics
                },
                {
                    label: 'Active Members',
                    value: activeEmployees.toString(),
                    icon: <BsActivity className="stat-icon" />,
                    trend: '100%',
                    isLoading: isLoadingAnalytics
                },
                {
                    label: 'Departments',
                    value: uniqueDepartments.toString(),
                    icon: <BsBuilding className="stat-icon" />,
                    trend: null,
                    isLoading: isLoadingAnalytics
                },
                {
                    label: 'Growth Rate',
                    value: '0%',
                    icon: <BsGraphUp className="stat-icon" />,
                    trend: null,
                    isLoading: isLoadingAnalytics
                },
            ];
        }

        // Use API data
        const totalEmployees = analytics.totalEmployees || 0;
        const activeMembers = analytics.activeMembers?.count || 0;
        const inactiveMembers = analytics.activeMembers?.inactiveCount || 0;
        const departmentsCount = analytics.departments?.count || 0;
        const growthRate = analytics.growthRate?.monthly || 0;
        const isPositiveGrowth = growthRate >= 0;

        // Calculate active percentage
        const activePercentage = totalEmployees > 0
            ? ((activeMembers / totalEmployees) * 100).toFixed(0)
            : 0;

        return [
            {
                label: 'Total Employees',
                value: totalEmployees.toString(),
                icon: <BsPeople className="stat-icon" />,
                trend: null,
                isLoading: isLoadingAnalytics
            },
            {
                label: 'Active Members',
                value: activeMembers.toString(),
                icon: <BsActivity className="stat-icon" />,
                trend: `${activePercentage}%`,
                isLoading: isLoadingAnalytics
            },
            {
                label: 'Departments',
                value: departmentsCount.toString(),
                icon: <BsBuilding className="stat-icon" />,
                trend: null,
                isLoading: isLoadingAnalytics
            },
            {
                label: 'Growth Rate',
                value: `${Math.abs(growthRate).toFixed(1)}%`,
                icon: isPositiveGrowth ? <BsGraphUp className="stat-icon" /> : <BsGraphUp className="stat-icon" />,
                trend: isPositiveGrowth ? `+${growthRate.toFixed(1)}%` : `${growthRate.toFixed(1)}%`,
                isNegative: !isPositiveGrowth,
                isLoading: isLoadingAnalytics
            },
        ];
    }, [analyticsData, employees, isLoadingAnalytics]);

    // Get unique departments for filters
    const departments = useMemo(() => {
        const depts = [...new Set(employees.map(emp => emp.department))];
        return depts.sort();
    }, [employees]);

    // Filter employees based on search and filters
    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchesSearch =
                !searchText ||
                emp.name.toLowerCase().includes(searchText.toLowerCase()) ||
                emp.jobTitle.toLowerCase().includes(searchText.toLowerCase()) ||
                emp.department.toLowerCase().includes(searchText.toLowerCase());

            const matchesDepartment = !departmentFilter || emp.department === departmentFilter;

            return matchesSearch && matchesDepartment;
        });
    }, [employees, searchText, departmentFilter]);

    // Table columns
    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (text, record) => (
                <Space>
                    <Avatar icon={<UserOutlined />} src={record.avatar} className="employee-avatar" />
                    <span className="employee-name">{text}</span>
                </Space>
            ),
        },
        {
            title: 'Job title',
            dataIndex: 'jobTitle',
            key: 'jobTitle',
            sorter: (a, b) => a.jobTitle.localeCompare(b.jobTitle),
            render: (text) => <Text className="table-cell-text">{text}</Text>,
        },
        {
            title: 'Department',
            dataIndex: 'department',
            key: 'department',
            sorter: (a, b) => a.department.localeCompare(b.department),
            render: (text) => (
                <span className="department-badge">
                    <BsBuilding className="department-icon" />
                    {text}
                </span>
            ),
        },
        {
            title: 'Salary',
            dataIndex: 'salary',
            key: 'salary',
            sorter: (a, b) => parseInt(a.salary) - parseInt(b.salary),
            render: (salary) => <Text className="table-cell-text">${salary}</Text>,
        },
        {
            title: 'Start date',
            dataIndex: 'startDate',
            key: 'startDate',
            sorter: (a, b) => new Date(a.startDate) - new Date(b.startDate),
            render: (date) => (
                <Text className="table-cell-text date-text">{formatDate(date)}</Text>
            ),
        },
        {
            title: 'View Details',
            key: 'viewDetails',
            width: 140,
            render: (_, record) => (
                <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewDetails(record.id)}
                    className="view-details-button"
                >
                    View Details
                </Button>
            ),
        },
    ];

    const handleViewDetails = (userId) => {
        dispatch(showUserDetailsView(userId));
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: (selectedKeys) => {
            setSelectedRowKeys(selectedKeys);
        },
        onSelectAll: (selected, selectedRows, changeRows) => {
            if (selected) {
                const allKeys = filteredEmployees.map(emp => emp.id);
                setSelectedRowKeys(allKeys);
            } else {
                setSelectedRowKeys([]);
            }
        },
    };

    // Show UserWiseAnalytics if user details view is enabled
    if (showUserDetails) {
        return <UserWiseAnalytics />;
    }

    return (
        <div className="employees-data-container">
            {/* Background overlay effects */}
            <div className="dashboard-overlay"></div>
            <div className="dashboard-grid-pattern"></div>

            {/* Header Section */}
            <div className="dashboard-header">
                <div className="header-content">
                    <div className="header-title-wrapper">
                        <BsDatabase className="header-icon" />
                        <div>
                            <Title level={2} className="dashboard-title">Employee Analytics</Title>
                            <Text className="dashboard-subtitle">Comprehensive workforce data analysis</Text>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Statistics Cards */}
            <div className="stats-grid">
                {summaryStats.map((stat, index) => (
                    <Card
                        key={index}
                        className="stat-card"
                        bordered={false}
                    >
                        <div className="stat-card-content">
                            <div className="stat-icon-wrapper">
                                {stat.isLoading ? (
                                    <Spin size="small" />
                                ) : (
                                    stat.icon
                                )}
                            </div>
                            <div className="stat-info">
                                <Text className="stat-label">{stat.label}</Text>
                                <div className="stat-value-wrapper">
                                    {stat.isLoading ? (
                                        <Spin size="small" />
                                    ) : (
                                        <>
                                            <Text className="stat-value">{stat.value}</Text>
                                            {stat.trend && (
                                                <span className={`stat-trend ${stat.isNegative ? 'negative' : ''}`}>
                                                    {stat.isNegative ? (
                                                        <BsArrowDownRight />
                                                    ) : (
                                                        <BsArrowUpRight />
                                                    )}
                                                    {stat.trend}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Filter and Action Bar */}
            <Card className="filter-action-card" bordered={false}>
                <div className="filter-action-content">
                    <div className="filter-section">
                        <BsFilter className="filter-section-icon" />
                        <Select
                            placeholder="Filter by Department"
                            suffixIcon={<DownOutlined />}
                            className="filter-select"
                            style={{ width: 200 }}
                            value={departmentFilter}
                            onChange={setDepartmentFilter}
                            allowClear
                        >
                            {departments.map(dept => (
                                <Option key={dept} value={dept}>{dept}</Option>
                            ))}
                        </Select>
                    </div>

                    <div className="action-section">
                        <Search
                            placeholder="Search employees..."
                            prefix={<SearchOutlined />}
                            allowClear
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="dashboard-search"
                            style={{ width: 280 }}
                        />

                        <Space size="middle">
                            <Button
                                type="default"
                                icon={<PlusOutlined />}
                                className="action-btn"
                            >
                                Add Employee
                            </Button>
                            <Button
                                icon={<SortAscendingOutlined />}
                                className="action-btn secondary"
                            >
                                Sort
                            </Button>
                            <Button
                                icon={<BsDownload />}
                                className="action-btn secondary"
                            >
                                Export
                            </Button>
                        </Space>
                    </div>
                </div>
            </Card>

            {/* Employee Table */}
            <Card className="table-card" bordered={false}>
                <div className="table-card-header">
                    <div className="table-header-info">
                        <BsFileEarmarkSpreadsheet className="table-header-icon" />
                        <div>
                            <Text className="table-header-title">Employee Database</Text>
                            <Text className="table-header-subtitle">
                                {filteredEmployees.length} {filteredEmployees.length === 1 ? 'record' : 'records'} found
                            </Text>
                        </div>
                    </div>
                </div>

                <div className="employees-table-container">
                    {isLoading ? (
                        <div className="loading-state">
                            <Spin size="large" />
                            <Text className="loading-text">Analyzing employee data...</Text>
                        </div>
                    ) : error ? (
                        <div className="error-state">
                            <Text type="danger" className="error-text">
                                Unable to load employee data. Please try again.
                            </Text>
                        </div>
                    ) : (
                        <Table
                            columns={columns}
                            dataSource={filteredEmployees}
                            rowKey="id"
                            rowSelection={rowSelection}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                showTotal: (total) => `Total ${total} employees`
                            }}
                            className="employees-table"
                        />
                    )}
                </div>
            </Card>
        </div>
    );
};

export default EmployeesData;
