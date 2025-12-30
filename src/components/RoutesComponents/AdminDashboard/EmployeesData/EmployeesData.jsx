import React, { useState, useMemo, useEffect } from 'react';
import { Table, Input, Select, Button, Avatar, Space, Spin, Typography, Card, Modal, List, Tag } from 'antd';
import { SearchOutlined, PlusOutlined, SortAscendingOutlined, ExportOutlined, DownOutlined, UserOutlined, EyeOutlined, ProjectOutlined, ClockCircleOutlined } from '@ant-design/icons';
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
import { useGetAllUsersQuery, useGetAnalyticsOverviewQuery, useGetAllClientsQuery } from '../../../../store/api';
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
    const [searchText, setSearchText] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalFilter, setModalFilter] = useState(['All']);
    const [modalConfig, setModalConfig] = useState({ title: '', data: [] });
    const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
    const [comingSoonTitle, setComingSoonTitle] = useState('');
    const { socket } = useSocket();

    // Fetch all users from API
    const { data: usersData, isLoading, error } = useGetAllUsersQuery();

    // Fetch all clients from API
    const { data: clientsData, isLoading: isLoadingClients } = useGetAllClientsQuery();

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

        // Filter out admin users
        const nonAdminUsers = usersData.data.filter(user =>
            (user.position || user.role || '').toLowerCase() !== 'admin'
        );

        return nonAdminUsers.map((user) => ({
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
        const rawUsers = usersData?.data || [];
        const nonAdminUsers = rawUsers.filter(u => (u.position || u.role || '').toLowerCase() !== 'admin');
        const clients = clientsData?.data || [];

        // Calculate counts
        const totalEmployeesCount = nonAdminUsers.length;
        const totalDepartmentsCount = [...new Set(nonAdminUsers.map(u => getDepartmentFromPosition(u.position || u.role)))].length;
        const totalClientsCount = clients.length;

        const stats = [
            {
                label: 'Total Employee',
                value: totalEmployeesCount.toString(),
                icon: <BsPeople className="stat-icon" />,
                isLoading: isLoading,
                data: nonAdminUsers.map(u => ({
                    name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.userEmail || u.email || 'N/A',
                    position: u.position || u.role || 'N/A',
                    category: getDepartmentFromPosition(u.position || u.role)
                }))
            },
            {
                label: 'Total Department',
                value: totalDepartmentsCount.toString(),
                icon: <BsBuilding className="stat-icon" />,
                isLoading: isLoading,
                data: [...new Set(nonAdminUsers.map(u => getDepartmentFromPosition(u.position || u.role)))].map(dept => ({
                    name: dept,
                    position: 'Department'
                }))
            },
            {
                label: 'Total Client',
                value: totalClientsCount.toString(),
                icon: <ProjectOutlined className="stat-icon" />,
                isLoading: isLoadingClients,
                data: clients.map(c => ({
                    name: c.clientName || 'N/A',
                    position: c.clientEmail || 'Client'
                }))
            },
        ];

        return stats;
    }, [usersData, clientsData, isLoading, isLoadingClients]);

    const handleStatClick = (stat) => {
        setModalConfig({
            title: stat.label,
            data: stat.data
        });
        setModalFilter(['All']);
        setIsModalOpen(true);
    };

    const handleModalFilterChange = (tag, checked) => {
        const nextSelectedTags = checked
            ? (tag === 'All' ? ['All'] : [...modalFilter.filter(t => t !== 'All'), tag])
            : modalFilter.filter((t) => t !== tag);

        const finalTags = nextSelectedTags.length === 0 ? ['All'] : nextSelectedTags;
        setModalFilter(finalTags);
    };

    const filteredModalData = useMemo(() => {
        if (!modalConfig.data) return [];
        if (modalFilter.includes('All')) return modalConfig.data;
        return modalConfig.data.filter(item => modalFilter.includes(item.category));
    }, [modalConfig.data, modalFilter]);

    const modalCategories = useMemo(() => {
        if (modalConfig.title !== 'Total Employee') return [];
        const cats = [...new Set(modalConfig.data.map(item => item.category))];
        return ['All', ...cats];
    }, [modalConfig.title, modalConfig.data]);

    const handleActionClick = (title) => {
        setComingSoonTitle(title);
        setIsComingSoonOpen(true);
    };

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
                    className="global-action-btn"
                >
                    View Details
                </Button>
            ),
        },
    ];

    const handleViewDetails = (userId) => {
        dispatch(showUserDetailsView(userId));
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
                        className="stat-card clickable-card"
                        bordered={false}
                        onClick={() => handleStatClick(stat)}
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

            {/* Detail Modal */}
            <Modal
                title={modalConfig.title}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={600}
                className="analytics-detail-modal"
            >
                {modalConfig.title === 'Total Employee' && (
                    <div className="modal-filter-section" style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
                        <Text type="secondary" style={{ marginRight: 12, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Filter Categories:</Text>
                        <Space wrap>
                            {modalCategories.map(tag => (
                                <Tag.CheckableTag
                                    key={tag}
                                    checked={modalFilter.includes(tag)}
                                    onChange={(checked) => handleModalFilterChange(tag, checked)}
                                    style={{
                                        borderRadius: '16px',
                                        padding: '2px 12px',
                                        fontSize: '13px'
                                    }}
                                >
                                    {tag}
                                </Tag.CheckableTag>
                            ))}
                        </Space>
                    </div>
                )}
                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    <List
                        itemLayout="horizontal"
                        dataSource={filteredModalData}
                        renderItem={(item) => (
                            <List.Item>
                                <List.Item.Meta
                                    avatar={<Avatar icon={<UserOutlined />} />}
                                    title={<Text strong>{item.name}</Text>}
                                    description={
                                        <Space>
                                            <Tag color="#EBB236" style={{ color: '#000' }}>{item.position}</Tag>
                                            {/* {item.category && item.category !== item.position && (
                                                <Tag color="#2db7f5">{item.category}</Tag>
                                            )} */}
                                        </Space>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                </div>
            </Modal>

            {/* Coming Soon Modal */}
            <Modal
                title={null}
                open={isComingSoonOpen}
                onCancel={() => setIsComingSoonOpen(false)}
                footer={null}
                centered
                width={400}
                className="coming-soon-modal"
            >
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                    <div style={{
                        fontSize: '48px',
                        marginBottom: '16px',
                        color: 'var(--brand-color)'
                    }}>
                        <ClockCircleOutlined />
                    </div>
                    <Title level={4} style={{ marginBottom: '8px' }}>{comingSoonTitle}</Title>
                    <Text type="secondary">This feature is currently under development. Stay tuned for updates!</Text>
                    <div style={{ marginTop: '24px', display: "flex", justifyContent: "center" }}>
                        <Button
                            type="primary"
                            className="global-action-btn"
                            onClick={() => setIsComingSoonOpen(false)}
                            style={{ minWidth: '120px' }}
                        >
                            Got it
                        </Button>
                    </div>
                </div>
            </Modal>

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
                                type="primary"
                                icon={<PlusOutlined />}
                                className="global-action-btn"
                                onClick={() => handleActionClick('Add Employee')}
                            >
                                Add Employee
                            </Button>
                            <Button
                                type="default"
                                icon={<SortAscendingOutlined />}
                                className="global-action-btn"
                                onClick={() => handleActionClick('Sort')}
                            >
                                Sort
                            </Button>
                            <Button
                                type="default"
                                icon={<BsDownload />}
                                className="global-action-btn"
                                onClick={() => handleActionClick('Export')}
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
