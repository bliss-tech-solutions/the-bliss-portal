import React, { useState } from 'react';
import './UserTaskAssignmentPanel.css';
import { Row, Col, Tabs } from 'antd';
import { useSelector } from 'react-redux';
import { selectTheme } from '../../../../store/slices/themeSlice';
import { selectUser } from '../../../../store/slices/authSlice';
import AllUserTaskEntries from './AllUserTaskEntries/AllUserTaskEntries';

const UserTaskAssignmentPanel = () => {
    const [activeTab, setActiveTab] = useState('1');
    const theme = useSelector(selectTheme);
    const user = useSelector(selectUser);
    const userFullName = (user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Your').trim();

    const handleTabChange = (key) => {
        setActiveTab(key)
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case '1':
                return <AllUserTaskEntries />;
            case '2':
                return (
                    <div>
                        <p>Tasks that are scheduled for the near future.</p>
                        <p>These tasks will be available for you to work on soon.</p>
                    </div>
                );
            case '3':
                return (
                    <div>
                        <p>Tasks that you are currently working on.</p>
                        <p>Track your progress and update task status.</p>
                    </div>
                );
            case '4':
                return (
                    <div>
                        <p>Tasks that you have completed successfully.</p>
                        <p>Review your completed work and achievements.</p>
                    </div>
                );
            default:
                return <div>No content available.</div>;
        }
    };

    return (
        <div id="UserTaskAssignmentPanel" className={`theme-${theme}`}>
            <h2>{userFullName} Tasks Management</h2>
            <div className="MarginTopMedium">
                <Row>
                    <Col lg={24} md={24} sm={24} xs={24}>
                        <div className="AntdTabsNames">
                            <Tabs
                                activeKey={activeTab}
                                onChange={handleTabChange}
                                type="card"
                                items={[
                                    {
                                        key: '1',
                                        label: 'All Tasks'
                                    },
                                    {
                                        key: '2',
                                        label: 'Upcoming Tasks'
                                    },
                                    {
                                        key: '3',
                                        label: 'In Progress'
                                    },
                                    {
                                        key: '4',
                                        label: 'Completed'
                                    }
                                ]}
                            />
                        </div>
                    </Col>
                </Row>
                <div>
                    <div className="AntdTabsContent user-AntdTabsContent">
                        {renderTabContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserTaskAssignmentPanel;