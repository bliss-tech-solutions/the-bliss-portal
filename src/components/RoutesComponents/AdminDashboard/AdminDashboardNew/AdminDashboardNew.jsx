import React, { useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { DatePicker, Button, Modal, Table, Tabs, Tag, Input, Spin, Select } from "antd";
import Chart from "react-apexcharts";
import {
    PlusOutlined,
    CalendarOutlined,
    TeamOutlined,
    UserOutlined,
    CheckCircleOutlined,
    ArrowRightOutlined,
    SearchOutlined,
    ProjectOutlined,
    ReloadOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { selectUser } from "../../../../store/slices/authSlice";
import { useGetDashboardAnalysisQuery, useClearDashboardCacheMutation } from "../../../../store/api";
import { showUserDetailsView } from "../../../../store/slices/adminDashboardSlice";
import "./AdminDashboardNew.css";

const { RangePicker } = DatePicker;

const AdminDashboardNew = () => {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const [dateRange, setDateRange] = useState([
        dayjs().startOf('month'),
        dayjs()
    ]);

    // Modal States
    const [isEmployeeModalVisible, setIsEmployeeModalVisible] = useState(false);
    const [isClientModalVisible, setIsClientModalVisible] = useState(false);
    const [isTasksModalVisible, setIsTasksModalVisible] = useState(false);

    // Filter States
    const [clientSearchText, setClientSearchText] = useState('');
    const [chartRole, setChartRole] = useState('Execution');

    // Fetch Dashboard Analysis Data
    const { data: dashboardData, isLoading, refetch } = useGetDashboardAnalysisQuery();
    const [clearCache, { isLoading: isRefreshing }] = useClearDashboardCacheMutation();

    const handleRefresh = async () => {
        try {
            await clearCache().unwrap();
            refetch();
        } catch (error) {
            console.error("Failed to refresh dashboard cache:", error);
        }
    };

    // Normalize data to handle both array (find summary) and single object responses
    const rawData = dashboardData?.data || dashboardData;
    const analysisData = Array.isArray(rawData)
        ? rawData.find(item => item.type === 'summary') || {}
        : rawData || {};

    // --- Debugging Logs ---
    console.log("📊 Dashboard Analysis Data (Raw):", rawData);
    console.log("� Extracted Summary Data:", analysisData);

    // --- Employee Modal Columns ---
    const employeeColumns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Position',
            dataIndex: 'position',
            key: 'position',
            filters: [
                { text: 'SME', value: 'SME' },
                { text: 'Graphics Designer', value: 'Graphics Designer' },
                { text: 'Video Editor', value: 'Video Editor' },
                { text: 'Content Writer', value: 'Content Writer' },
            ],
            onFilter: (value, record) => record.position.indexOf(value) === 0,
            filterDropdownClassName: 'dashboard-theme-filter-dropdown',
        },
        {
            title: 'Role',
            dataIndex: 'arole',
            key: 'arole',
            render: (role) => <Tag color={role === 'Execution' ? 'blue' : 'green'}>{role}</Tag>
        }
    ];

    // --- Client Modal Constants ---
    const activeClients = analysisData.clientsList?.active || [];
    const inactiveClients = analysisData.clientsList?.inactive || [];

    const getFilteredClients = (clients) => {
        if (!clientSearchText) return clients;
        return clients.filter(client =>
            client.toLowerCase().includes(clientSearchText.toLowerCase())
        );
    };

    const clientColumns = [
        {
            title: 'Client Name',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>
        }
    ];

    // Handle name display dynamically with fallbacks
    const displayName = (user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User').trim();

    // --- Chart Data Processing ---
    const chartData = useMemo(() => {
        const users = analysisData.usersLinks || [];
        const filteredUsers = users.filter(u => u.arole === chartRole).slice(0, 10); // Show top 10 for clarity

        const names = filteredUsers.map(u => u.name || 'Unknown');

        let series = [];
        if (chartRole === 'Execution') {
            series = [
                { name: 'Total Added', data: filteredUsers.map(u => u.totalTaskAdded || 0) },
                { name: 'Completed', data: filteredUsers.map(u => u.totalCompleted || 0) }
            ];
        } else if (chartRole === 'user') {
            series = [
                { name: 'Allocated', data: filteredUsers.map(u => u.totalAllocated || 0) },
                { name: 'Completed', data: filteredUsers.map(u => u.totalCompleted || 0) }
            ];
        } else if (chartRole === 'ContentProvider') {
            series = [
                { name: 'Uploaded', data: filteredUsers.map(u => u.totalUploadedContent || 0) },
                { name: 'Pending', data: filteredUsers.map(u => u.uploadPendingCount || 0) }
            ];
        }

        return { names, series };
    }, [analysisData.usersLinks, chartRole]);

    const chartOptions = {
        chart: {
            id: "performance-chart",
            toolbar: { show: false },
            zoom: { enabled: false },
            background: 'transparent',
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
                animateOnRender: true
            }
        },
        stroke: {
            curve: 'smooth',
            width: 3,
            lineCap: 'round'
        },
        colors: ['#ebb236', '#00f2ff'], // Gold and Neon Cyan
        xaxis: {
            categories: chartData.names,
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                style: {
                    colors: 'var(--secondary-text)',
                    fontSize: '11px',
                    fontWeight: 500
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: 'var(--secondary-text)',
                    fontSize: '11px'
                }
            }
        },
        grid: {
            borderColor: 'var(--border-color)',
            strokeDashArray: 4,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            fontSize: '13px',
            fontWeight: 600,
            labels: { colors: 'var(--primary-text)' },
            markers: { radius: 12 }
        },
        tooltip: {
            theme: 'dark',
            x: { show: true },
            y: {
                formatter: (val) => val
            }
        },
        markers: {
            size: 4,
            colors: ['#ebb236', '#00f2ff'],
            strokeColors: 'var(--card-bg)',
            strokeWidth: 2,
            hover: { size: 6 }
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'dark',
                type: "vertical",
                shadeIntensity: 0.5,
                gradientToColors: ['#f39c12', '#0097ff'],
                inverseColors: true,
                opacityFrom: 0.8,
                opacityTo: 0.2,
                stops: [0, 100]
            }
        }
    };

    return (
        <div id="AdminDashboardNew" className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1 className="welcome-text">
                        Welcome Back, {displayName} <span className="wave">👋</span>
                    </h1>
                    <p className="sub-text">
                        Your Team's Success Starts Here. Let's Make Progress Together!
                    </p>
                </div>

                <div className="header-right">
                    <div className="date-picker-wrapper">
                        <RangePicker
                            value={dateRange}
                            onChange={(dates) => setDateRange(dates)}
                            suffixIcon={<CalendarOutlined />}
                            format="D MMM YYYY"
                            className="theme-range-picker"
                            separator="-"
                        />
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        className="global-action-btn add-new-btn"
                    >
                        Add New
                    </Button>
                    <Button
                        icon={<ReloadOutlined spin={isRefreshing || isLoading} />}
                        onClick={handleRefresh}
                        className="refresh-btn"
                        loading={isRefreshing}
                    >
                        Refresh
                    </Button>
                </div>
            </header>

            <main className="dashboard-content">
                <div className="dashboard-grid">
                    {/* Left Section: Stats & Main Analysis */}
                    <div className="section-left">
                        {/* Top Stats Row - 3 Functional Cards */}
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="card-top">
                                    <div className="stat-icon-wrapper employees-icon">
                                        <TeamOutlined />
                                    </div>
                                    <div className="stat-trend positive">+12%</div>
                                </div>
                                <div className="stat-info">
                                    <h3 className="stat-value">
                                        {isLoading ? <Spin size="small" /> : (analysisData.users || 0)}
                                    </h3>
                                    <p className="stat-label">Total Employees</p>
                                </div>
                                <div className="card-footer" onClick={() => setIsEmployeeModalVisible(true)} style={{ cursor: 'pointer' }}>
                                    <span>View details</span>
                                    <ArrowRightOutlined />
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="card-top">
                                    <div className="stat-icon-wrapper clients-icon">
                                        <UserOutlined />
                                    </div>
                                    <div className="stat-trend positive">+5.4%</div>
                                </div>
                                <div className="stat-info">
                                    <h3 className="stat-value">
                                        {isLoading ? <Spin size="small" /> : (analysisData.totalSystemClients || 0)}
                                    </h3>
                                    <p className="stat-label">Total Clients</p>
                                </div>
                                <div className="card-footer" onClick={() => setIsClientModalVisible(true)} style={{ cursor: 'pointer' }}>
                                    <span>View details</span>
                                    <ArrowRightOutlined />
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="card-top">
                                    <div className="stat-icon-wrapper attendance-icon">
                                        <ProjectOutlined />
                                    </div>
                                    <div className="stat-trend neutral">Active</div>
                                </div>
                                <div className="stat-info">
                                    <h3 className="stat-value">
                                        {isLoading ? <Spin size="small" /> : (analysisData.tasks?.totalTaskAdded || 0)}
                                    </h3>
                                    <p className="stat-label">Tasks & Deliverables</p>
                                    {!isLoading && analysisData.tasks && (
                                        <div className="stat-sub-info">
                                            <span className="sub-item completed">
                                                {analysisData.tasks.totalCompleted || 0} Done
                                            </span>
                                            <span className="sub-separator">•</span>
                                            <span className="sub-item pending">
                                                {analysisData.tasks.totalPending || 0} Pending
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="card-footer" onClick={() => setIsTasksModalVisible(true)} style={{ cursor: 'pointer' }}>
                                    <span>View details</span>
                                    <ArrowRightOutlined />
                                </div>
                            </div>
                        </div>

                        {/* Bottom Analysis Area */}
                        <div className="blank-card analysis-area-card">
                            <div className="analysis-card-header">
                                <div className="header-info">
                                    <h3>Performance Analytics</h3>
                                    <p>Detailed breakdown of team productivity</p>
                                </div>
                                <div className="header-actions">
                                    <Select
                                        value={chartRole}
                                        onChange={setChartRole}
                                        className="chart-role-select"
                                        popupClassName="dashboard-theme-filter-dropdown"
                                        options={[
                                            { label: 'Execution', value: 'Execution' },
                                            { label: 'Team Members', value: 'user' },
                                            { label: 'Content Providers', value: 'ContentProvider' }
                                        ]}
                                    />
                                </div>
                            </div>
                            <div className="analysis-card-body">
                                {isLoading ? (
                                    <div className="chart-loading">
                                        <Spin tip="Generating analytics..." size="large" />
                                    </div>
                                ) : (
                                    <Chart
                                        options={chartOptions}
                                        series={chartData.series}
                                        type="area" // Using area for a more futuristic look with gradients
                                        height={380}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Section: Sidebar */}
                    <div className="section-right">
                        <div className="blank-card sidebar-card-placeholder">
                            <div className="card-skeleton-inner"></div>
                        </div>
                    </div>
                </div>


                {/* --- Employee Details Modal --- */}
                <Modal
                    title="Employee Details"
                    open={isEmployeeModalVisible}
                    onCancel={() => setIsEmployeeModalVisible(false)}
                    footer={null}
                    width={800}
                    className="dashboard-modal"
                >
                    <Table
                        dataSource={analysisData.usersLinks || []}
                        columns={employeeColumns}
                        rowKey="userId"
                        pagination={{ pageSize: 10 }}
                        scroll={{ y: 400 }}
                        onRow={(record) => ({
                            onClick: () => {
                                dispatch(showUserDetailsView(record.userId));
                                setIsEmployeeModalVisible(false);
                            },
                            style: { cursor: 'pointer' }
                        })}
                    />
                </Modal>

                {/* --- Client Details Modal --- */}
                <Modal
                    title="Client Details"
                    open={isClientModalVisible}
                    onCancel={() => {
                        setIsClientModalVisible(false);
                        setClientSearchText('');
                    }}
                    footer={null}
                    width={700}
                    className="dashboard-modal"
                >
                    <div style={{ marginBottom: 16 }}>
                        <Input
                            placeholder="Search clients..."
                            prefix={<SearchOutlined />}
                            value={clientSearchText}
                            onChange={e => setClientSearchText(e.target.value)}
                            allowClear
                            className="modal-search-input"
                        />
                    </div>
                    <Tabs
                        defaultActiveKey="1"
                        items={[
                            {
                                key: '1',
                                label: `Active (${activeClients.length})`,
                                children: (
                                    <Table
                                        dataSource={getFilteredClients(activeClients).map(name => ({ name }))}
                                        columns={clientColumns}
                                        rowKey="name"
                                        pagination={{ pageSize: 10 }}
                                        scroll={{ y: 400 }}
                                        size="small"
                                    />
                                )
                            },
                            {
                                key: '2',
                                label: `Inactive (${inactiveClients.length})`,
                                children: (
                                    <Table
                                        dataSource={getFilteredClients(inactiveClients).map(name => ({ name }))}
                                        columns={clientColumns}
                                        rowKey="name"
                                        pagination={{ pageSize: 10 }}
                                        scroll={{ y: 400 }}
                                        size="small"
                                    />
                                )
                            }
                        ]}
                    />
                </Modal>

                {/* --- Tasks & Deliverables Details Modal --- */}
                <Modal
                    title="Tasks & Deliverables Analysis"
                    open={isTasksModalVisible}
                    onCancel={() => setIsTasksModalVisible(false)}
                    footer={null}
                    width={800}
                    className="dashboard-modal"
                >
                    <div className="tasks-modal-section">
                        <h3 className="tasks-modal-title">Tasks Overview</h3>
                        <div className="tasks-overview-grid">
                            <div className="task-stat-item">
                                <div className="label">Total Added</div>
                                <div className="value">{analysisData.tasks?.totalTaskAdded || 0}</div>
                            </div>
                            <div className="task-stat-item">
                                <div className="label">Completed</div>
                                <div className="value completed">{analysisData.tasks?.totalCompleted || 0}</div>
                            </div>
                            <div className="task-stat-item">
                                <div className="label">Pending</div>
                                <div className="value pending">{analysisData.tasks?.totalPending || 0}</div>
                            </div>
                            <div className="task-stat-item">
                                <div className="label">Client Allocation</div>
                                <div className="value">{analysisData.tasks?.TotalTaskAllocationClients || 0}</div>
                            </div>
                        </div>
                    </div>

                    <div className="tasks-modal-section">
                        <h3 className="tasks-modal-title">Deliverables Overview</h3>
                        <div className="deliverables-grid">
                            <div className="deliverable-card reels">
                                <h4>Reels</h4>
                                <div className="deliverable-stat-row">
                                    <span>Total:</span>
                                    <strong>{analysisData.deliverables?.reelsTotal || 0}</strong>
                                </div>
                                <div className="deliverable-stat-row">
                                    <span>Completed:</span>
                                    <strong className="highlight">{analysisData.deliverables?.reelsCompleted || 0}</strong>
                                </div>
                            </div>
                            <div className="deliverable-card combos">
                                <h4>Combos</h4>
                                <div className="deliverable-stat-row">
                                    <span>Total:</span>
                                    <strong>{analysisData.deliverables?.combosTotal || 0}</strong>
                                </div>
                                <div className="deliverable-stat-row">
                                    <span>Completed:</span>
                                    <strong className="highlight">{analysisData.deliverables?.combosCompleted || 0}</strong>
                                </div>
                            </div>
                            <div className="deliverable-card clients">
                                <h4>Clients Count</h4>
                                <div className="deliverable-stat-row">
                                    <span>Total Clients:</span>
                                    <strong>{analysisData.deliverables?.clientsCount || analysisData.totalSystemClients || 0}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* User Breakdown by Role */}
                    <div className="tasks-modal-section">
                        <h3 className="tasks-modal-title">User Breakdown</h3>
                        {(() => {
                            const usersLinks = analysisData.usersLinks || [];

                            // Group users by role
                            const executionUsers = usersLinks.filter(u => u.arole === 'Execution');
                            const regularUsers = usersLinks.filter(u => u.arole === 'user');
                            const contentProviders = usersLinks.filter(u => u.arole === 'ContentProvider');

                            // Prepare columns based on role
                            const executionColumns = [
                                { title: 'Name', dataIndex: 'name', key: 'name', width: '40%' },
                                { title: 'Position', dataIndex: 'position', key: 'position', width: '25%', render: (text) => <Tag color="blue">{text}</Tag>, filterDropdownClassName: 'dashboard-theme-filter-dropdown' },
                                { title: 'Total Added', dataIndex: 'totalTaskAdded', key: 'totalTaskAdded', width: '17.5%', align: 'center', render: (val) => <span style={{ fontWeight: 600 }}>{val || 0}</span> },
                                { title: 'Completed', dataIndex: 'totalCompleted', key: 'totalCompleted', width: '17.5%', align: 'center', render: (val) => <span style={{ color: '#52c41a', fontWeight: 600 }}>{val || 0}</span> }
                            ];

                            const userColumns = [
                                { title: 'Name', dataIndex: 'name', key: 'name', width: '40%' },
                                { title: 'Position', dataIndex: 'position', key: 'position', width: '25%', render: (text) => <Tag color="green">{text}</Tag>, filterDropdownClassName: 'dashboard-theme-filter-dropdown' },
                                { title: 'Allocated', dataIndex: 'totalAllocated', key: 'totalAllocated', width: '17.5%', align: 'center', render: (val) => <span style={{ fontWeight: 600 }}>{val || 0}</span> },
                                { title: 'Completed', dataIndex: 'totalCompleted', key: 'totalCompleted', width: '17.5%', align: 'center', render: (val) => <span style={{ color: '#52c41a', fontWeight: 600 }}>{val || 0}</span> }
                            ];

                            const contentProviderColumns = [
                                { title: 'Name', dataIndex: 'name', key: 'name', width: '40%' },
                                { title: 'Position', dataIndex: 'position', key: 'position', width: '25%', render: (text) => <Tag color="purple">{text}</Tag>, filterDropdownClassName: 'dashboard-theme-filter-dropdown' },
                                { title: 'Uploaded', dataIndex: 'totalUploadedContent', key: 'totalUploadedContent', width: '17.5%', align: 'center', render: (val) => <span style={{ fontWeight: 600 }}>{val || 0}</span> },
                                { title: 'Pending', dataIndex: 'uploadPendingCount', key: 'uploadPendingCount', width: '17.5%', align: 'center', render: (val) => <span style={{ color: '#faad14', fontWeight: 600 }}>{val || 0}</span> }
                            ];

                            return (
                                <Tabs
                                    defaultActiveKey="1"
                                    items={[
                                        {
                                            key: '1',
                                            label: `Execution (${executionUsers.length})`,
                                            children: (
                                                <Table
                                                    dataSource={executionUsers}
                                                    columns={executionColumns}
                                                    rowKey="userId"
                                                    pagination={false}
                                                    size="small"
                                                    scroll={{ y: 300 }}
                                                />
                                            )
                                        },
                                        {
                                            key: '2',
                                            label: `Team Members (${regularUsers.length})`,
                                            children: (
                                                <Table
                                                    dataSource={regularUsers}
                                                    columns={userColumns}
                                                    rowKey="userId"
                                                    pagination={false}
                                                    size="small"
                                                    scroll={{ y: 300 }}
                                                />
                                            )
                                        },
                                        {
                                            key: '3',
                                            label: `Content Providers (${contentProviders.length})`,
                                            children: (
                                                <Table
                                                    dataSource={contentProviders}
                                                    columns={contentProviderColumns}
                                                    rowKey="userId"
                                                    pagination={false}
                                                    size="small"
                                                    scroll={{ y: 300 }}
                                                />
                                            )
                                        }
                                    ]}
                                />
                            );
                        })()}
                    </div>
                </Modal>
            </main >
        </div >
    );
};

export default AdminDashboardNew;