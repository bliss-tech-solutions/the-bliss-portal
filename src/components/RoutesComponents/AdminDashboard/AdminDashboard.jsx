import React from 'react';
import './AdminDashboard.css';
import { Card, Row, Col, Statistic, Typography } from 'antd';
import { UserOutlined, TeamOutlined, BarChartOutlined, DollarOutlined } from '@ant-design/icons';

const { Title } = Typography;

const AdminDashboard = () => {
    return (
        <div className="admin-dashboard-container">
            <div className="admin-dashboard-header">
                <Title level={2} className="admin-dashboard-title">
                    Admin Dashboard
                </Title>
            </div>

            <div className="admin-dashboard-content">
                <Row gutter={[16, 16]} className="stats-row">
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="stat-card">
                            <Statistic
                                title="Total Users"
                                value={1128}
                                prefix={<UserOutlined className="stat-icon" />}
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="stat-card">
                            <Statistic
                                title="Active Sessions"
                                value={93}
                                prefix={<TeamOutlined className="stat-icon" />}
                                valueStyle={{ color: '#cf1322' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="stat-card">
                            <Statistic
                                title="Revenue"
                                value={11280}
                                prefix={<DollarOutlined className="stat-icon" />}
                                precision={2}
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="stat-card">
                            <Statistic
                                title="Reports"
                                value={28}
                                prefix={<BarChartOutlined className="stat-icon" />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[16, 16]} className="content-row">
                    <Col xs={24} lg={12}>
                        <Card title="Recent Activities" className="activity-card">
                            <div className="activity-content">
                                <p>Admin dashboard content goes here...</p>
                                <p>This route is only accessible to users with 'admin' role.</p>
                                <ul>
                                    <li>System monitoring</li>
                                    <li>User management</li>
                                    <li>Security alerts</li>
                                    <li>Performance metrics</li>
                                </ul>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title="System Status" className="status-card">
                            <div className="status-content">
                                <p>System monitoring content goes here...</p>
                                <p>Real-time data and analytics for administrators.</p>
                                <div className="status-indicators">
                                    <div className="status-item">
                                        <span className="status-dot online"></span>
                                        <span>Server Status: Online</span>
                                    </div>
                                    <div className="status-item">
                                        <span className="status-dot online"></span>
                                        <span>Database: Connected</span>
                                    </div>
                                    <div className="status-item">
                                        <span className="status-dot warning"></span>
                                        <span>Cache: Warning</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>
        </div>
    );
};

export default AdminDashboard;
