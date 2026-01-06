import React, { useState, useMemo } from 'react';
import { Table, Input, Typography, Tag, Space, Card, Spin, Empty } from 'antd';
import { SearchOutlined, UserOutlined, DatabaseOutlined, RightOutlined, DownOutlined, EyeOutlined } from '@ant-design/icons';
import { useGetAllUsersQuery, useGetAllClientsQuery } from '../../../../store/api';
import './UserWiseClientView.css';

const { Title, Text } = Typography;

const UserWiseClientView = () => {
    const [searchText, setSearchText] = useState('');

    const { data: usersResponse, isLoading: isLoadingUsers } = useGetAllUsersQuery();
    const { data: clientsResponse, isLoading: isLoadingClients } = useGetAllClientsQuery();

    const users = usersResponse?.data || [];
    const clients = clientsResponse?.data || [];

    // Process data to group clients by user
    const userWiseData = useMemo(() => {
        if (!users.length) return [];

        // Filter out admin and HR roles
        const filteredUsers = users.filter(user =>
            user.role !== 'admin' && user.role !== 'HR'
        );

        return filteredUsers.map(user => {
            const userClients = clients.filter(client =>
                client.assignedUsers?.some(assignedUser => assignedUser.userId === user.userId)
            );

            return {
                ...user,
                key: user.userId,
                clientCount: userClients.length,
                clients: userClients.map(c => ({
                    ...c,
                    key: c._id
                }))
            };
        });
    }, [users, clients]);

    // Filter data based on search text
    const filteredData = useMemo(() => {
        if (!searchText) return userWiseData;

        const lowerSearchText = searchText.toLowerCase();
        return userWiseData.filter(item => {
            const userName = `${item.firstName || ''} ${item.lastName || ''}`.toLowerCase();
            const userEmail = (item.email || '').toLowerCase();
            const userId = (item.userId || '').toLowerCase();

            // Check if user matches
            const userMatches = userName.includes(lowerSearchText) ||
                userEmail.includes(lowerSearchText) ||
                userId.includes(lowerSearchText);

            // Check if any of their clients match
            const clientMatches = item.clients.some(client =>
                (client.clientName || '').toLowerCase().includes(lowerSearchText) ||
                (client.city || '').toLowerCase().includes(lowerSearchText)
            );

            return userMatches || clientMatches;
        });
    }, [userWiseData, searchText]);

    const expandedRowRender = (record) => {
        const columns = [
            {
                title: 'Client Name',
                dataIndex: 'clientName',
                key: 'clientName',
                render: (text) => <Text strong>{text}</Text>,
            },
            {
                title: 'City',
                dataIndex: 'city',
                key: 'city',
                render: (text) => text || '-',
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (status) => (
                    <Tag className="status-tag" color={status === 'active' ? 'green' : 'red'}>
                        {status ? status.toUpperCase() : 'N/A'}
                    </Tag>
                ),
            },
            {
                title: 'Onboard Date',
                dataIndex: 'onboardDate',
                key: 'onboardDate',
                render: (date) => date ? new Date(date).toLocaleDateString() : '-',
            },
        ];

        return (
            <div className="client-nested-table">
                {record.clients.length > 0 ? (
                    <Table
                        columns={columns}
                        dataSource={record.clients}
                        pagination={false}
                        size="small"
                    />
                ) : (
                    <div className="empty-clients">No clients assigned to this user</div>
                )}
            </div>
        );
    };

    const columns = [
        {
            title: 'User',
            dataIndex: 'name',
            key: 'name',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text className="user-name-cell">
                        {`${record.firstName || ''} ${record.lastName || ''}`.trim() || record.userId}
                    </Text>
                    <Text className="user-email-cell">{record.email}</Text>
                </Space>
            ),
        },
        {
            title: 'User ID',
            dataIndex: 'userId',
            key: 'userId',
            responsive: ['md'],
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role) => (
                <Tag color="blue" className="status-tag">
                    {role ? role.toUpperCase() : 'USER'}
                </Tag>
            ),
        },
        {
            title: 'Assigned Clients',
            dataIndex: 'clientCount',
            key: 'clientCount',
            sorter: (a, b) => a.clientCount - b.clientCount,
            render: (count) => (
                <Tag color={count > 0 ? 'cyan' : 'default'} style={{ fontWeight: 600 }}>
                    {count} {count === 1 ? 'Client' : 'Clients'}
                </Tag>
            ),
        },
    ];

    if (isLoadingUsers || isLoadingClients) {
        return (
            <div className="user-wise-client-container">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                    <Spin size="large" tip="Loading data..." />
                </div>
            </div>
        );
    }

    return (
        <div className="user-wise-client-container">
            <div className="user-wise-client-header">
                <Title level={3} className="user-wise-client-title">
                    <UserOutlined /> User Wise Client List
                </Title>
                <Input
                    placeholder="Search by user or client name..."
                    prefix={<SearchOutlined />}
                    className="search-input"
                    style={{ width: 300 }}
                    onChange={e => setSearchText(e.target.value)}
                    allowClear
                />
            </div>

            <Card className="user-wise-client-card">
                <Table
                    className="user-wise-client-table"
                    columns={columns}
                    expandable={{
                        expandedRowRender,
                        rowExpandable: (record) => true,
                        expandIcon: ({ expanded, onExpand, record }) => (
                            <div
                                className={`custom-expand-icon ${expanded ? 'expanded' : ''}`}
                                onClick={e => onExpand(record, e)}
                            >
                                {expanded ? <DownOutlined /> : <RightOutlined />}
                            </div>
                        )
                    }}
                    dataSource={filteredData}
                    pagination={false}
                />
            </Card>
        </div>
    );
};

export default UserWiseClientView;
