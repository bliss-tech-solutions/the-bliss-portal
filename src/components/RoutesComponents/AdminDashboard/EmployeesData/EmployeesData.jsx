import React, { useState, useMemo } from 'react';
import { Table, Input, Select, Button, Avatar, Checkbox, Space, Spin, Typography } from 'antd';
import { SearchOutlined, PlusOutlined, SortAscendingOutlined, ExportOutlined, DownOutlined, UserOutlined, EyeOutlined } from '@ant-design/icons';
import { useGetAllUsersQuery } from '../../../../store/api';
import dayjs from 'dayjs';
import './EmployeesData.css';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

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
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState(null);

    // Fetch all users from API
    const { data: usersData, isLoading, error } = useGetAllUsersQuery();

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

    // Summary statistics (calculated from real data)
    const summaryStats = useMemo(() => {
        const totalEmployees = employees.length;
        return [
            { label: 'Total Employees', value: totalEmployees.toString(), color: '#000000', bgColor: '#f5f5f5' },
            { label: 'Active', value: totalEmployees.toString(), color: '#000000', bgColor: '#FFD700' },
            { label: 'Departments', value: [...new Set(employees.map(emp => emp.department))].length.toString(), color: '#000000', bgColor: '#f5f5f5' },
            { label: 'Output', value: '14%', color: '#000000', bgColor: '#f5f5f5' },
        ];
    }, [employees]);

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
                    <Avatar icon={<UserOutlined />} src={record.avatar} />
                    <span>{text}</span>
                </Space>
            ),
        },
        {
            title: 'Job title',
            dataIndex: 'jobTitle',
            key: 'jobTitle',
            sorter: (a, b) => a.jobTitle.localeCompare(b.jobTitle),
        },
        {
            title: 'Department',
            dataIndex: 'department',
            key: 'department',
            sorter: (a, b) => a.department.localeCompare(b.department),
        },
        {
            title: 'Salary',
            dataIndex: 'salary',
            key: 'salary',
            sorter: (a, b) => parseInt(a.salary) - parseInt(b.salary),
            render: (salary) => `$${salary}`,
        },
        {
            title: 'Start date',
            dataIndex: 'startDate',
            key: 'startDate',
            sorter: (a, b) => new Date(a.startDate) - new Date(b.startDate),
            render: (date) => formatDate(date),
        },
        {
            title: 'View Details',
            key: 'viewDetails',
            width: 120,
            render: (_, record) => (
                <Space>
                    <EyeOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        {record.viewDetails?.userEmail || record.viewDetails?.email || 'N/A'}
                    </Text>
                </Space>
            ),
        },
    ];

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

    return (
        <div className="employees-data-container">
            {/* Header */}
            <div className="employees-header">
                <h1 className="employees-title">People</h1>

                {/* Top navigation buttons */}
                {/* <div className="employees-nav-buttons">
                    <Button type="text" className="nav-button">Directory</Button>
                    <Button type="text" className="nav-button">Org Chat</Button>
                    <Button type="text" className="nav-button">Insights</Button>
                </div> */}
            </div>

            {/* Summary Statistics */}
            <div className="summary-stats">
                {summaryStats.map((stat, index) => (
                    <div
                        key={index}
                        className="stat-item"
                        style={{ backgroundColor: stat.bgColor, color: stat.color }}
                    >
                        <span className="stat-label">{stat.label}</span>
                        <span className="stat-value">{stat.value}</span>
                    </div>
                ))}
            </div>

            {/* Filter and Action Bar */}
            <div className="filter-action-bar">
                {/* Filter Dropdowns */}
                <div className="filter-dropdowns">
                    <Select
                        placeholder="Department"
                        suffixIcon={<DownOutlined />}
                        className="filter-select"
                        style={{ width: 150 }}
                        value={departmentFilter}
                        onChange={setDepartmentFilter}
                        allowClear
                    >
                        {departments.map(dept => (
                            <Option key={dept} value={dept}>{dept}</Option>
                        ))}
                    </Select>
                </div>

                {/* Search and Action Buttons */}
                <div className="search-actions">
                    <Search
                        placeholder="Search"
                        prefix={<SearchOutlined />}
                        allowClear
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="employees-search"
                        style={{ width: 200 }}
                    />

                    <Space>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            className="action-button"
                        >
                            Add
                        </Button>
                        <Button
                            icon={<SortAscendingOutlined />}
                            className="action-button"
                        >
                            Sort
                        </Button>
                        <Button
                            icon={<ExportOutlined />}
                            className="action-button"
                        >
                            Export
                        </Button>
                    </Space>
                </div>
            </div>

            {/* Employee Table */}
            <div className="employees-table-container">
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <Spin size="large" />
                        <div style={{ marginTop: '16px' }}>
                            <Text>Loading employees data...</Text>
                        </div>
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <Text type="danger">Error loading employees data. Please try again.</Text>
                    </div>
                ) : (
                    <Table
                        columns={columns}
                        dataSource={filteredEmployees}
                        rowKey="id"
                        rowSelection={rowSelection}
                        pagination={{ pageSize: 10, showSizeChanger: true }}
                        className="employees-table"
                    />
                )}
            </div>
        </div>
    );
};

export default EmployeesData;

