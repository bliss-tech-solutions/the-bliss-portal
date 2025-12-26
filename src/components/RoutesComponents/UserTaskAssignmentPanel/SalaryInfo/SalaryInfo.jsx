import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Spin, Empty, Tag, Card } from 'antd';
import ReactApexChart from 'react-apexcharts';
import dayjs from 'dayjs';
import {
    DollarOutlined,
    RiseOutlined,
    SafetyCertificateOutlined,
    HistoryOutlined,
    CalendarOutlined
} from '@ant-design/icons';
import { useGetSalaryHistoryQuery } from '../../../../store/api';
import { selectUserId } from '../../../../store/slices/authSlice';
import './SalaryInfo.css';

const SalaryInfo = () => {
    const userId = useSelector(selectUserId);
    const { data: salaryData, isLoading } = useGetSalaryHistoryQuery(userId, { skip: !userId });

    // Process Data
    const { currentSalary, history } = salaryData?.data || {};

    // Sort history by date descending for list, ascending for chart
    const sortedHistory = useMemo(() => {
        if (!history) return [];
        return [...history].sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
    }, [history]);

    const chartData = useMemo(() => {
        if (!history) return [];
        // Add initial salary if possible or just history points
        const sorted = [...history].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));

        // Map to chart series
        return {
            series: [{
                name: 'Salary',
                data: sorted.map(h => ({
                    x: new Date(h.effectiveDate).getTime(),
                    y: h.newSalary
                }))
            }],
            options: {
                chart: {
                    type: 'area',
                    height: 350,
                    toolbar: { show: false },
                    fontFamily: 'Inter, sans-serif',
                    background: 'transparent'
                },
                theme: { mode: 'dark' }, // Assuming dark theme primarily or adaptive
                stroke: { curve: 'smooth', width: 3 },
                fill: {
                    type: 'gradient',
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.7,
                        opacityTo: 0.2,
                        stops: [0, 90, 100]
                    }
                },
                dataLabels: { enabled: false },
                xaxis: {
                    type: 'datetime',
                    labels: {
                        formatter: (val) => dayjs(val).format('MMM YYYY'),
                        style: { colors: '#8c8c8c' }
                    },
                    tooltip: { enabled: false }
                },
                yaxis: {
                    labels: {
                        formatter: (val) => `₹${(val / 1000).toFixed(0)}k`,
                        style: { colors: '#8c8c8c' }
                    }
                },
                colors: ['#1890ff'],
                grid: {
                    borderColor: '#303030', // adapt to theme variable if possible
                    strokeDashArray: 4
                },
                tooltip: {
                    theme: 'dark',
                    y: { formatter: (val) => `₹${val.toLocaleString()}` }
                }
            }
        };
    }, [history]);

    const lastHike = sortedHistory[0]?.incrementPercent || 0;

    if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Spin size="large" /></div>;

    return (
        <div className="salary-dashboard">
            <div className="salary-dashboard-header">
                <h1 className="salary-page-title">Salary Information</h1>
                <p className="salary-page-subtitle">Track your compensation growth and details</p>
            </div>

            {/* Stats Grid */}
            <div className="salary-stats-grid">
                <div className="stat-card primary">
                    <div>
                        <div className="stat-icon-wrapper"><DollarOutlined /></div>
                        <div className="stat-content">
                            <span className="stat-label">Current Salary</span>
                            <span className="stat-value">₹{currentSalary?.blissSalary?.toLocaleString() || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card success">
                    <div>
                        <div className="stat-icon-wrapper"><RiseOutlined /></div>
                        <div className="stat-content">
                            <span className="stat-label">Last Hike</span>
                            <span className="stat-value">+{lastHike}%</span>
                        </div>
                    </div>
                    <div className="stat-trend trend-up">
                        <CalendarOutlined /> <span>{sortedHistory[0] ? dayjs(sortedHistory[0].effectiveDate).format('MMM D, YYYY') : '-'}</span>
                    </div>
                </div>

                <div className="stat-card warning">
                    <div>
                        <div className="stat-icon-wrapper"><SafetyCertificateOutlined /></div>
                        <div className="stat-content">
                            <span className="stat-label">PF Fund Value</span>
                            <span className="stat-value">₹{currentSalary?.pfFund?.toLocaleString() || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card purple">
                    <div>
                        <div className="stat-icon-wrapper"><HistoryOutlined /></div>
                        <div className="stat-content">
                            <span className="stat-label">Total Revisions</span>
                            <span className="stat-value">{sortedHistory.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="salary-charts-section">
                <div className="section-header">
                    <h3 className="section-title"><RiseOutlined /> Salary Growth Trend</h3>
                </div>
                {chartData.series && chartData.series[0].data.length > 0 ? (
                    <ReactApexChart
                        options={chartData.options}
                        series={chartData.series}
                        type="area"
                        height={350}
                    />
                ) : (
                    <Empty description="No salary history available for chart" />
                )}
            </div>

            {/* History List */}
            <div className="salary-charts-section">
                <div className="section-header">
                    <h3 className="section-title"><HistoryOutlined /> Revision History</h3>
                </div>
                <div className="salary-history-list">
                    {sortedHistory.length > 0 ? sortedHistory.map((item, index) => (
                        <div key={item._id || index} className="history-item">
                            <div className="history-left">
                                <div className="history-date-box">
                                    <span className="history-month">{dayjs(item.effectiveDate).format('MMM')}</span>
                                    <span className="history-year">{dayjs(item.effectiveDate).format('YYYY')}</span>
                                </div>
                                <div className="history-details">
                                    <span className="history-title">Salary Revision</span>
                                    <span className="history-note">{item.note || 'Annual Increment'}</span>
                                    {item.oldSalary && (
                                        <span className="history-note">From ₹{item.oldSalary.toLocaleString()}</span>
                                    )}
                                </div>
                            </div>
                            <div className="history-right">
                                <div className="history-amount">
                                    +₹{item.incrementAmount?.toLocaleString() || 0}
                                </div>
                                <div className="history-percent">
                                    +{item.incrementPercent}%
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--secondary-text)', marginTop: 4 }}>
                                    New: ₹{item.newSalary.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <Empty description="No increment history found" />
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalaryInfo;