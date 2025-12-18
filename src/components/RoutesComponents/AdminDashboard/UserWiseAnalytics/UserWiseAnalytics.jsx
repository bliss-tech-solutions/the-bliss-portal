import React, { useEffect, useMemo, useState } from 'react';
import { Spin, Typography, Button, Card, Tabs } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import {
    BsCheckCircle,
    BsClock,
    BsArrowRepeat,
    BsCalendarCheck,
    BsGraphUp,
    BsFileText
} from 'react-icons/bs';
import Chart from 'react-apexcharts';
import { useGetUserWiseAnalyticsQuery } from '../../../../store/api';
import { useSelector, useDispatch } from 'react-redux';
import { selectSelectedUserId, hideUserDetailsView } from '../../../../store/slices/adminDashboardSlice';
import { useSocket } from '../../../../contexts/SocketContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import './UserWiseAnalytics.css';

// Extend dayjs with relativeTime plugin
dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const UserWiseAnalytics = () => {
    const dispatch = useDispatch();
    const selectedUserId = useSelector(selectSelectedUserId);
    const { socket } = useSocket();
    const [activeChartTab, setActiveChartTab] = useState('performance');

    const {
        data: userAnalyticsData,
        isLoading,
        error,
        refetch
    } = useGetUserWiseAnalyticsQuery(selectedUserId, {
        skip: !selectedUserId,
    });

    // Real-time updates via socket
    useEffect(() => {
        if (!socket || !selectedUserId) return;

        const handleUserUpdate = () => {
            console.log('✅ User analytics data changed - refetching...');
            refetch();
        };

        socket.on('analytics:userwise:updated', handleUserUpdate);
        socket.on('employee:updated', handleUserUpdate);
        socket.on('checkin:created', handleUserUpdate);
        socket.on('checkout:created', handleUserUpdate);

        return () => {
            socket.off('analytics:userwise:updated', handleUserUpdate);
            socket.off('employee:updated', handleUserUpdate);
            socket.off('checkin:created', handleUserUpdate);
            socket.off('checkout:created', handleUserUpdate);
        };
    }, [socket, selectedUserId, refetch]);

    const handleBack = () => {
        dispatch(hideUserDetailsView());
    };

    const analyticsData = userAnalyticsData?.data;
    const userData = analyticsData?.user;
    const tasksData = analyticsData?.tasks || {};
    const attendanceData = analyticsData?.attendance || {};
    const periodData = analyticsData?.period;

    const completionRate = tasksData?.totalTasks > 0
        ? ((tasksData.completedTasks / tasksData.totalTasks) * 100).toFixed(1)
        : 0;

    const taskTimelineData = useMemo(() => {
        if (!tasksData?.taskList || !Array.isArray(tasksData.taskList) || tasksData.taskList.length === 0) {
            return { categories: [], completed: [], pending: [] };
        }

        const taskMap = {};
        tasksData.taskList.forEach(task => {
            if (!task || !task.createdAt) return;
            const date = dayjs(task.createdAt).format('MMM DD');
            if (!taskMap[date]) {
                taskMap[date] = { completed: 0, pending: 0, inProgress: 0 };
            }
            if (task.taskStatus === 'completed') {
                taskMap[date].completed += 1;
            } else if (task.taskStatus === 'inProgress' || task.taskStatus === 'in-progress') {
                taskMap[date].inProgress += 1;
            } else {
                taskMap[date].pending += 1;
            }
        });

        const categories = Object.keys(taskMap).sort((a, b) => {
            const dateA = dayjs(a, 'MMM DD');
            const dateB = dayjs(b, 'MMM DD');
            return dateA.unix() - dateB.unix();
        });

        const completed = categories.map(date => taskMap[date].completed);
        const pending = categories.map(date => taskMap[date].pending);

        return { categories, completed, pending };
    }, [tasksData]);

    const taskStatusBreakdown = useMemo(() => {
        if (!tasksData) return [];
        return [
            { name: 'Completed', value: tasksData.completedTasks || 0, color: '#10b981' },
            { name: 'Pending', value: tasksData.pendingTasks || 0, color: '#f59e0b' },
            { name: 'In Progress', value: tasksData.inProgressTasks || 0, color: '#3b82f6' },
            { name: 'Cancelled', value: tasksData.cancelledTasks || 0, color: '#ef4444' },
        ].filter(item => item.value > 0);
    }, [tasksData]);

    const getMiniChartOptions = (color) => ({
        chart: {
            type: 'bar',
            sparkline: { enabled: true },
            toolbar: { show: false },
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '60%',
                borderRadius: 2,
            },
        },
        dataLabels: { enabled: false },
        stroke: { width: 0 },
        fill: { colors: [color], opacity: 0.8 },
        tooltip: { enabled: false },
        grid: { show: false },
        xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { show: false } },
    });

    const getMiniLineChartOptions = (color) => ({
        chart: {
            type: 'line',
            sparkline: { enabled: true },
            toolbar: { show: false },
        },
        stroke: { curve: 'smooth', width: 2, colors: [color] },
        fill: { type: 'gradient', gradient: { shade: 'light', type: 'vertical', stops: [0, 100], opacityFrom: 0.4, opacityTo: 0 } },
        dataLabels: { enabled: false },
        tooltip: { enabled: false },
        grid: { show: false },
        xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { show: false } },
    });

    const mainChartOptions = {
        chart: {
            type: 'area',
            height: 350,
            toolbar: { show: false },
            zoom: { enabled: false },
            fontFamily: 'inherit',
        },
        stroke: {
            curve: 'smooth',
            width: [3, 2],
            dashArray: [0, 5],
        },
        colors: ['#8b5cf6', '#f59e0b'],
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.5,
                opacityTo: 0.15,
                stops: [0, 100],
            }
        },
        dataLabels: { enabled: false },
        legend: {
            show: true,
            position: 'top',
            horizontalAlign: 'right',
            fontSize: '13px',
            fontFamily: 'inherit',
            fontWeight: 500,
            markers: {
                width: 8,
                height: 8,
                radius: 4,
            },
        },
        xaxis: {
            categories: taskTimelineData.categories,
            labels: {
                style: {
                    colors: '#6b7280',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    fontWeight: 400,
                }
            },
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
        },
        yaxis: {
            labels: {
                style: {
                    colors: '#6b7280',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    fontWeight: 400,
                }
            },
        },
        grid: {
            borderColor: '#f3f4f6',
            strokeDashArray: 4,
            xaxis: {
                lines: {
                    show: false,
                }
            },
            yaxis: {
                lines: {
                    show: true,
                }
            },
            padding: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            },
        },
        tooltip: {
            theme: 'light',
            style: {
                fontSize: '12px',
                fontFamily: 'inherit',
            },
            y: { formatter: (val) => `${val} tasks` },
        },
    };

    const donutChartOptions = {
        chart: {
            type: 'donut',
            height: 300,
            fontFamily: 'inherit',
        },
        labels: taskStatusBreakdown.map(item => item.name),
        colors: taskStatusBreakdown.map(item => item.color),
        legend: {
            position: 'bottom',
            fontSize: '13px',
            fontFamily: 'inherit',
            fontWeight: 500,
            markers: {
                width: 10,
                height: 10,
                radius: 5,
            },
            itemMargin: {
                horizontal: 8,
                vertical: 4,
            },
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        name: {
                            show: false,
                        },
                        value: {
                            show: true,
                            fontSize: '20px',
                            fontWeight: 600,
                            fontFamily: 'inherit',
                            formatter: (val) => val || 0,
                        },
                        total: {
                            show: true,
                            label: 'Total Tasks',
                            fontSize: '14px',
                            fontWeight: 600,
                            fontFamily: 'inherit',
                            color: '#6b7280',
                            formatter: () => tasksData?.totalTasks || 0,
                        },
                    },
                },
            },
        },
        dataLabels: {
            enabled: true,
            formatter: (val) => `${val.toFixed(0)}%`,
            style: {
                fontSize: '12px',
                fontFamily: 'inherit',
                fontWeight: 500,
            },
        },
        tooltip: {
            style: {
                fontSize: '12px',
                fontFamily: 'inherit',
            },
            y: {
                formatter: (val) => `${val} tasks`,
            },
        },
    };

    if (!selectedUserId) {
        return (
            <div className="user-wise-analytics-container">
                <div className="error-state">
                    <Text type="danger">No user selected</Text>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="user-wise-analytics-container">
                <div className="loading-state">
                    <Spin size="large" />
                    <Text className="loading-text">Loading user analytics...</Text>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="user-wise-analytics-container">
                <div className="error-state">
                    <Text type="danger">Error loading user analytics. Please try again.</Text>
                    <Button onClick={handleBack} style={{ marginTop: 16 }}>
                        <ArrowLeftOutlined /> Back to Employees
                    </Button>
                </div>
            </div>
        );
    }

    if (!analyticsData || !userData) {
        return (
            <div className="user-wise-analytics-container">
                <div className="error-state">
                    <Text>No data available for this user</Text>
                    <Button onClick={handleBack} style={{ marginTop: 16 }}>
                        <ArrowLeftOutlined /> Back to Employees
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="user-wise-analytics-container">
            {/* Header Section */}
            <div className="user-analytics-header">
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={handleBack}
                    className="back-button"
                    size="small"
                >
                    Back to Employees
                </Button>
                <br/>
                <br/>

                <div className="header-info">
                    <Title level={2} className="user-name-title">
                        {userData.name || userData.email || 'User Analytics'}
                    </Title>
                    {periodData && (
                        <Text className="period-text">
                            Showing data for: {dayjs(periodData.from).format('DD MMM')} - {dayjs(periodData.to).format('DD MMM YYYY')}
                        </Text>
                    )}
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="kpi-cards-column">
                {/* Total Tasks */}
                <Card className="kpi-card" bordered={false}>
                    <div className="kpi-card-content">
                        <div className="kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                            <BsFileText />
                        </div>
                        <div className="kpi-info">
                            <Text className="kpi-label">Total Tasks</Text>
                            <Text className="kpi-value">{tasksData.totalTasks || 0}</Text>
                        </div>
                        <div className="kpi-mini-chart">
                            <Chart
                                options={getMiniChartOptions('#8b5cf6')}
                                series={[{
                                    data: tasksData.totalTasks > 0
                                        ? Array.from({ length: 7 }, () => Math.floor(Math.random() * tasksData.totalTasks) + 1)
                                        : [0, 0, 0, 0, 0, 0, 0]
                                }]}
                                type="bar"
                                height={32}
                                width={70}
                            />
                        </div>
                    </div>
                </Card>

                {/* Completed Tasks */}
                <Card className="kpi-card" bordered={false}>
                    <div className="kpi-card-content">
                        <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                            <BsCheckCircle />
                        </div>
                        <div className="kpi-info">
                            <Text className="kpi-label">Completed Tasks</Text>
                            <Text className="kpi-value">{tasksData.completedTasks || 0}</Text>
                        </div>
                        <div className="kpi-mini-chart">
                            <Chart
                                options={getMiniChartOptions('#10b981')}
                                series={[{
                                    data: tasksData.completedTasks > 0
                                        ? Array.from({ length: 7 }, () => Math.floor(Math.random() * tasksData.completedTasks) + 1)
                                        : [0, 0, 0, 0, 0, 0, 0]
                                }]}
                                type="bar"
                                height={32}
                                width={70}
                            />
                        </div>
                    </div>
                </Card>

                {/* Pending Tasks */}
                <Card className="kpi-card" bordered={false}>
                    <div className="kpi-card-content">
                        <div className="kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                            <BsClock />
                        </div>
                        <div className="kpi-info">
                            <Text className="kpi-label">Pending Tasks</Text>
                            <Text className="kpi-value">{tasksData.pendingTasks || 0}</Text>
                        </div>
                        <div className="kpi-mini-chart">
                            <Chart
                                options={getMiniChartOptions('#f59e0b')}
                                series={[{
                                    data: tasksData.pendingTasks > 0
                                        ? Array.from({ length: 7 }, () => Math.floor(Math.random() * tasksData.pendingTasks) + 1)
                                        : [0, 0, 0, 0, 0, 0, 0]
                                }]}
                                type="bar"
                                height={32}
                                width={70}
                            />
                        </div>
                    </div>
                </Card>

                {/* In Progress Tasks */}
                <Card className="kpi-card" bordered={false}>
                    <div className="kpi-card-content">
                        <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                            <BsArrowRepeat />
                        </div>
                        <div className="kpi-info">
                            <Text className="kpi-label">In Progress</Text>
                            <Text className="kpi-value">{tasksData.inProgressTasks || 0}</Text>
                        </div>
                        <div className="kpi-mini-chart">
                            <Chart
                                options={getMiniChartOptions('#3b82f6')}
                                series={[{
                                    data: tasksData.inProgressTasks > 0
                                        ? Array.from({ length: 7 }, () => Math.floor(Math.random() * tasksData.inProgressTasks) + 1)
                                        : [0, 0, 0, 0, 0, 0, 0]
                                }]}
                                type="bar"
                                height={32}
                                width={70}
                            />
                        </div>
                    </div>
                </Card>

                {/* Completion Rate */}
                <Card className="kpi-card" bordered={false}>
                    <div className="kpi-card-content">
                        <div className="kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                            <BsGraphUp />
                        </div>
                        <div className="kpi-info">
                            <Text className="kpi-label">Completion Rate</Text>
                            <Text className="kpi-value">{completionRate}%</Text>
                        </div>
                        <div className="kpi-mini-chart">
                            <Chart
                                options={getMiniLineChartOptions('#8b5cf6')}
                                series={[{
                                    data: parseFloat(completionRate) > 0
                                        ? Array.from({ length: 7 }, (_, i) => parseFloat(completionRate) + (Math.random() * 20 - 10))
                                        : [0, 0, 0, 0, 0, 0, 0]
                                }]}
                                type="line"
                                height={32}
                                width={70}
                            />
                        </div>
                    </div>
                </Card>

                {/* Check-in Average */}
                <Card className="kpi-card" bordered={false}>
                    <div className="kpi-card-content">
                        <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                            <BsCalendarCheck />
                        </div>
                        <div className="kpi-info">
                            <Text className="kpi-label">Check-in Avg</Text>
                            <Text className="kpi-value">{((attendanceData.checkInAverage || 0) * 100).toFixed(0)}%</Text>
                        </div>
                        <div className="kpi-mini-chart">
                            <Chart
                                options={getMiniLineChartOptions('#10b981')}
                                series={[{
                                    data: attendanceData.checkInAverage > 0
                                        ? Array.from({ length: 7 }, () => (attendanceData.checkInAverage * 100) + (Math.random() * 10 - 5))
                                        : [0, 0, 0, 0, 0, 0, 0]
                                }]}
                                type="line"
                                height={32}
                                width={70}
                            />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="analytics-dashboard-grid">
                {/* Task Performance Chart */}
                <Card className="main-chart-card" bordered={false}>
                    <div className="chart-header">
                        <div className="chart-header-left">
                            <Title level={4} className="chart-title">Task Performance Analytics</Title>
                            <Text className="chart-subtitle">
                                Completion Rate: {completionRate}% from {tasksData.totalTasks || 0} tasks
                            </Text>
                        </div>
                    </div>
                    <Tabs
                        activeKey={activeChartTab}
                        onChange={setActiveChartTab}
                        items={[
                            {
                                key: 'performance',
                                label: 'Task Performance',
                            },
                            {
                                key: 'timeline',
                                label: 'Timeline Analysis',
                            },
                        ]}
                        className="chart-tabs"
                    />
                    <div className="chart-content">
                        <Chart
                            options={mainChartOptions}
                            series={[
                                { name: 'Completed', data: taskTimelineData.completed },
                                { name: 'Pending', data: taskTimelineData.pending },
                            ]}
                            type="area"
                            height={350}
                        />
                    </div>
                </Card>

                {/* Recent Activity */}
                <Card className="history-card" bordered={false}>
                    <div className="history-header">
                        <Title level={4} className="history-title">Recent Activity</Title>
                        <Text className="history-link">Show: All History</Text>
                    </div>
                    <div className="history-list">
                        {tasksData.taskList && tasksData.taskList.length > 0 ? (
                            tasksData.taskList.slice(0, 8).map((task, index) => (
                                <div key={task._id || index} className="history-item">
                                    <div
                                        className="history-dot"
                                        style={{
                                            background: task.taskStatus === 'completed' ? '#10b981' :
                                                task.taskStatus === 'pending' ? '#f59e0b' :
                                                    task.taskStatus === 'inProgress' ? '#3b82f6' : '#ef4444'
                                        }}
                                    />
                                    <div className="history-content">
                                        <Text className="history-text">{task.taskName}</Text>
                                        <Text className="history-status">{task.taskStatus}</Text>
                                    </div>
                                    <Text className="history-time">{dayjs(task.createdAt).fromNow()}</Text>
                                </div>
                            ))
                        ) : (
                            <div className="empty-history">
                                <Text className="empty-text">No recent activity</Text>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Task Status Breakdown */}
                <Card className="recapitulation-card" bordered={false}>
                    <div className="recap-header">
                        <Title level={4} className="recap-title">Task Status Breakdown</Title>
                        <Text className="recap-period">Last 30 Days</Text>
                    </div>
                    {taskStatusBreakdown.length > 0 ? (
                        <>
                            <Chart
                                options={donutChartOptions}
                                series={taskStatusBreakdown.map(item => item.value)}
                                type="donut"
                                height={300}
                            />
                            <div className="recap-stats">
                                {taskStatusBreakdown.map((item, index) => (
                                    <div key={index} className="recap-stat-item">
                                        <div className="recap-stat-dot" style={{ background: item.color }} />
                                        <Text className="recap-stat-text">{item.value} {item.name}</Text>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="empty-recap">
                            <Text className="empty-text">No task data available</Text>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default UserWiseAnalytics;