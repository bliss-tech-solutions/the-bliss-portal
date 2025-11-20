import React, { useState } from 'react';
import './UserTaskAssignmentPanel.css';
import { Row, Col, Tabs } from 'antd';
import { useSelector } from 'react-redux';
import { selectTheme } from '../../../../store/slices/themeSlice';
import { selectUser } from '../../../../store/slices/authSlice';
import AllUserTaskEntries from './AllUserTaskEntries/AllUserTaskEntries';
import EmptyState from '../../../CommonComponents/EmptyState/EmptyState';

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
            case '2':
            case '3':
            case '4':
                return <AllUserTaskEntries activeTab={activeTab} />;
            default:
                return <AllUserTaskEntries activeTab="1" />;
        }
    };

    return (
        <div id="UserTaskAssignmentPanel" className={`theme-${theme}`}>
            <h2 style={{ textTransform: 'capitalize' }}>{userFullName} Tasks Management</h2>
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