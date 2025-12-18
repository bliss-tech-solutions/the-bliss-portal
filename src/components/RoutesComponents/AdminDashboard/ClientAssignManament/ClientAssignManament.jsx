import React, { useState } from "react";
import "./ClientAssignManament.css";
import { Select, Table, Button, Tag, Modal, AutoComplete, Input, Typography, Space, } from 'antd';
import { EditOutlined, SearchOutlined } from '@ant-design/icons';
import { useCreateTeamMutation, useUpdateTeamMutation, useGetAllTeamsQuery, useGetAllClientsQuery } from "../../../../store/api";
import { useGetAllUsersQuery } from "../../../../store/api";
import { useNotification } from "../../../../contexts/NotificationContext";

const { Title, Text } = Typography;

const ClientAssignManament = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [teamName, setTeamName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [teamLeader, setTeamLeader] = useState('');
    const [viewMoreModal, setViewMoreModal] = useState({ open: false, type: '', items: [], title: '' });
    const [userClientModal, setUserClientModal] = useState({ open: false, userClients: [], teamName: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [searchSuggestions, setSearchSuggestions] = useState([]);

    const { success, error: showError } = useNotification();
    const [createTeam, { isLoading: isCreating }] = useCreateTeamMutation();
    const [updateTeam, { isLoading: isUpdating }] = useUpdateTeamMutation();
    const { data: allUsersData, isLoading: isLoadingUsers } = useGetAllUsersQuery();
    const { data: teamsData, isLoading: isLoadingTeams, refetch: refetchTeams } = useGetAllTeamsQuery();
    const { data: clientsData } = useGetAllClientsQuery();

    // Get all users for selection
    const allUsers = allUsersData?.data || [];

    // Handle team member selection
    const handleMemberSelection = (selectedUserIds) => {
        console.log('Team members selected:', selectedUserIds);
        setSelectedMembers(selectedUserIds || []);
        // If current team leader is not in selected members, clear it
        if (teamLeader && selectedUserIds && !selectedUserIds.includes(teamLeader)) {
            setTeamLeader('');
        }
    };

    // Handle team leader selection
    const handleTeamLeaderChange = (userId) => {
        setTeamLeader(userId);
    };

    // Prepare user options for Select
    const userOptions = allUsers.map(user => ({
        value: user.userId,
        label: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.userId,
        email: user.email
    }));

    // Get selected members data
    const getSelectedMembersData = () => {
        return selectedMembers.map(userId => {
            const user = allUsers.find(u => u.userId === userId);
            return {
                userId: userId,
                name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || userId
            };
        });
    };

    const handleEdit = (team) => {
        setEditingTeam(team);
        setTeamName(team.teamName || '');
        const memberIds = (team.members || []).map(m => m.userId);
        setSelectedMembers(memberIds);
        setTeamLeader(team.teamLeader || '');
        setIsOpen(true);
    };

    const handleSubmit = async () => {
        // Validation
        if (!teamName.trim()) {
            showError('Please enter team name');
            return;
        }

        if (selectedMembers.length === 0) {
            showError('Please select at least one team member');
            return;
        }

        if (!teamLeader) {
            showError('Please select a team leader');
            return;
        }

        try {
            const requestBody = {
                teamName: teamName.trim(),
                members: getSelectedMembersData(),
                teamLeader: teamLeader
            };

            if (editingTeam) {
                // Update existing team
                await updateTeam({
                    teamId: editingTeam._id,
                    body: requestBody
                }).unwrap();

                // Reset form
                setTeamName('');
                setSelectedMembers([]);
                setTeamLeader('');
                setEditingTeam(null);
                setIsOpen(false);

                // Refetch teams list immediately for real-time update
                await refetchTeams();

                // Show success notification
                setTimeout(() => {
                    success('Team updated successfully!');
                }, 300);
            } else {
                // Create new team
                await createTeam(requestBody).unwrap();

                // Reset form
                setTeamName('');
                setSelectedMembers([]);
                setTeamLeader('');
                setIsOpen(false);

                // Refetch teams list immediately for real-time update
                await refetchTeams();

                // Show success notification
                setTimeout(() => {
                    success('Team created successfully!');
                }, 300);
            }
        } catch (error) {
            console.error(`Error ${editingTeam ? 'updating' : 'creating'} team:`, error);
            const errorMessage = error?.data?.message || error?.message || `Failed to ${editingTeam ? 'update' : 'create'} team. Please try again.`;
            showError(errorMessage);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setEditingTeam(null);
        setTeamName('');
        setSelectedMembers([]);
        setTeamLeader('');
    };

    // Process clients data to group by user - Only for specific team members
    const getUserClientsData = (teamMembers = []) => {
        const clients = clientsData?.data || [];
        const allUsers = allUsersData?.data || [];

        // Get team member user IDs from the specific team
        const teamMemberIds = new Set();
        teamMembers.forEach(member => {
            if (member.userId) {
                teamMemberIds.add(member.userId);
            }
        });

        // Create a map of userId to user info (only for team members)
        const userMap = new Map();
        allUsers.forEach(user => {
            if (teamMemberIds.has(user.userId)) {
                userMap.set(user.userId, {
                    userId: user.userId,
                    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.userId,
                    email: user.email
                });
            }
        });

        // Initialize all team members (even if they have no clients)
        const userClientsMap = new Map();
        teamMemberIds.forEach(userId => {
            const user = userMap.get(userId);
            if (user) {
                userClientsMap.set(userId, {
                    user: user,
                    clients: []
                });
            }
        });

        // Group clients by user (only for team members)
        clients.forEach(client => {
            const assignedUsers = client.assignedUsers || [];
            assignedUsers.forEach(assignedUser => {
                const userId = assignedUser.userId;
                // Only add clients for team members
                if (teamMemberIds.has(userId)) {
                    if (!userClientsMap.has(userId)) {
                        // If user is in team but not in userMap, create entry
                        userClientsMap.set(userId, {
                            user: {
                                userId: userId,
                                name: assignedUser.name || userId,
                                email: ''
                            },
                            clients: []
                        });
                    }
                    userClientsMap.get(userId).clients.push({
                        clientId: client._id,
                        clientName: client.clientName,
                        city: client.city,
                        status: client.status,
                        onboardDate: client.onboardDate
                    });
                }
            });
        });

        // Convert to array and sort by user name
        return Array.from(userClientsMap.values()).sort((a, b) =>
            a.user.name.localeCompare(b.user.name)
        );
    };

    const handleOpenUserClientModal = (team) => {
        const teamMembers = team?.members || [];
        const teamName = team?.teamName || '';
        const userClients = getUserClientsData(teamMembers);
        setUserClientModal({ open: true, userClients, teamName });
        setSearchTerm(''); // Reset search when opening modal
        setSearchSuggestions([]);
    };

    // Generate search suggestions from user names and client names
    const generateSearchSuggestions = (userClients, searchValue) => {
        if (!searchValue || searchValue.trim() === '') {
            return [];
        }

        const suggestions = [];
        const searchLower = searchValue.toLowerCase().trim();

        userClients.forEach(userClient => {
            const userName = userClient.user.name.toLowerCase();
            const userEmail = (userClient.user.email || '').toLowerCase();

            // Check if user name matches
            if (userName.includes(searchLower) || userEmail.includes(searchLower)) {
                suggestions.push({
                    value: `User: ${userClient.user.name}`,
                    label: (
                        <div>
                            <strong>{userClient.user.name}</strong>
                            {userClient.user.email && <span style={{ color: '#8c8c8c', marginLeft: '8px' }}>({userClient.user.email})</span>}
                        </div>
                    ),
                    type: 'user'
                });
            }

            // Check client names
            userClient.clients.forEach(client => {
                const clientName = client.clientName.toLowerCase();
                if (clientName.includes(searchLower) && !suggestions.some(s => s.value === `Client: ${client.clientName}`)) {
                    suggestions.push({
                        value: `Client: ${client.clientName}`,
                        label: (
                            <div>
                                <strong>{client.clientName}</strong>
                                <span style={{ color: '#8c8c8c', marginLeft: '8px' }}>({client.city || 'No city'})</span>
                            </div>
                        ),
                        type: 'client'
                    });
                }
            });
        });

        return suggestions.slice(0, 10); // Limit to 10 suggestions
    };

    // Filter user clients based on search term
    const getFilteredUserClients = () => {
        if (!searchTerm || searchTerm.trim() === '') {
            return userClientModal.userClients;
        }

        const searchLower = searchTerm.toLowerCase().trim();
        return userClientModal.userClients.filter(userClient => {
            // Check user name or email
            const userName = userClient.user.name.toLowerCase();
            const userEmail = (userClient.user.email || '').toLowerCase();
            const userMatches = userName.includes(searchLower) || userEmail.includes(searchLower);

            // Check client names
            const clientMatches = userClient.clients.some(client =>
                client.clientName.toLowerCase().includes(searchLower) ||
                (client.city || '').toLowerCase().includes(searchLower)
            );

            return userMatches || clientMatches;
        }).map(userClient => {
            // Check if search matches user name/email
            const userName = userClient.user.name.toLowerCase();
            const userEmail = (userClient.user.email || '').toLowerCase();
            const userMatches = userName.includes(searchLower) || userEmail.includes(searchLower);

            // If user matches, show all their clients
            if (userMatches) {
                return {
                    ...userClient,
                    clients: userClient.clients // Show all clients for matching users
                };
            }

            // If user doesn't match but has matching clients, show only matching clients
            const filteredClients = userClient.clients.filter(client =>
                client.clientName.toLowerCase().includes(searchLower) ||
                (client.city || '').toLowerCase().includes(searchLower)
            );

            return {
                ...userClient,
                clients: filteredClients
            };
        });
    };

    const handleSearchChange = (value) => {
        setSearchTerm(value);
        if (value && value.trim() !== '') {
            const suggestions = generateSearchSuggestions(userClientModal.userClients, value);
            setSearchSuggestions(suggestions);
        } else {
            setSearchSuggestions([]);
        }
    };

    const handleSearchSelect = (value) => {
        setSearchTerm(value);
        setSearchSuggestions([]);
    };

    return (
        <div id="ClientAssignManament">
            <div className="ClientAssignManamentContainer">
                <div
                    className="clients-segregation-header"
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '24px',
                        flexWrap: 'wrap',
                        gap: '16px'
                    }}
                >
                    <h2 className="clients-segregation-title">
                        Team Management Panel
                    </h2>


                    <Button
                        onClick={() => setIsOpen(true)}
                        className="global-action-btn"
                        size="large"
                    >
                        Create Team
                    </Button>
                </div>

                <Modal
                    title={editingTeam ? 'Edit Team' : 'Create New Team'}
                    open={isOpen}
                    onCancel={handleClose}
                    width={600}
                    className="add-team-modal"
                    okText={editingTeam ? 'Update Team' : 'Create Team'}
                    cancelText="Cancel"
                    onOk={handleSubmit}
                    confirmLoading={isCreating || isUpdating}
                    okButtonProps={{ className: 'global-action-btn', disabled: isCreating || isUpdating }}
                    cancelButtonProps={{ className: 'global-secondary-btn', disabled: isCreating }}
                >
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ marginBottom: '8px', fontWeight: 500, color: 'var(--primary-text)' }}>Team Name</div>
                        <Input
                            placeholder="Enter team name"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            className="theme-input"
                        />
                        <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px' }}>Enter a unique name for the team</div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ marginBottom: '8px', fontWeight: 500, color: 'var(--primary-text)' }}>Team Members</div>
                        <Select
                            mode="multiple"
                            placeholder="Select team members"
                            value={selectedMembers}
                            onChange={(values) => {
                                console.log('Selected members:', values);
                                handleMemberSelection(values);
                            }}
                            style={{ width: '100%' }}
                            loading={isLoadingUsers}
                            showSearch
                            filterOption={(input, option) => {
                                const label = option?.label || option?.children || '';
                                return label.toLowerCase().includes(input.toLowerCase());
                            }}
                            className="team-members-select"
                            getPopupContainer={(trigger) => trigger.parentElement}
                        >
                            {userOptions.map((user) => (
                                <Select.Option
                                    key={user.value}
                                    value={user.value}
                                    label={user.label}
                                >
                                    {user.label}
                                    {user.email && (
                                        <span style={{ color: 'var(--secondary-text)', fontSize: '12px', marginLeft: '8px' }}>
                                            ({user.email})
                                        </span>
                                    )}
                                </Select.Option>
                            ))}
                        </Select>
                        <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px' }}>Select one or more team members (minimum 1 required)</div>
                    </div>

                    {selectedMembers && selectedMembers.length > 0 ? (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ marginBottom: '8px', fontWeight: 500, color: 'var(--primary-text)' }}>Selected Team Members *</div>
                            <div
                                style={{
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    padding: '16px',
                                    backgroundColor: 'var(--secondary-bg)',
                                    maxHeight: '300px',
                                    overflowY: 'auto'
                                }}
                                className="team-leader-container"
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {selectedMembers.map((userId) => {
                                        const user = allUsers.find(u => u.userId === userId);
                                        const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || userId;
                                        const isSelected = teamLeader === userId;
                                        return (
                                            <div
                                                key={userId}
                                                onClick={() => {
                                                    console.log('Leader selection clicked:', userId);
                                                    handleTeamLeaderChange(userId);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '12px',
                                                    borderRadius: '6px',
                                                    backgroundColor: isSelected ? 'rgba(235, 178, 54, 0.15)' : 'transparent',
                                                    border: isSelected ? '2px solid var(--brand-color)' : '1px solid var(--border-color)',
                                                    transition: 'all 0.2s',
                                                    cursor: 'pointer',
                                                    width: '100%'
                                                }}
                                                className="leader-option-card"
                                            >
                                                <div
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '50%',
                                                        border: '2px solid',
                                                        borderColor: isSelected ? 'var(--brand-color)' : 'var(--border-color)',
                                                        backgroundColor: isSelected ? 'var(--brand-color)' : 'transparent',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    {isSelected && (
                                                        <div
                                                            style={{
                                                                width: '8px',
                                                                height: '8px',
                                                                borderRadius: '50%',
                                                                backgroundColor: '#000'
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span style={{ color: 'var(--primary-text)', fontWeight: isSelected ? 600 : 500, fontSize: '15px' }}>
                                                            {userName}
                                                        </span>
                                                        {user?.email && (
                                                            <span style={{ color: 'var(--secondary-text)', fontSize: '13px' }}>
                                                                ({user.email})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div
                                                        style={{
                                                            color: 'var(--brand-color)',
                                                            fontSize: '13px',
                                                            fontWeight: 600,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <span>✓</span>
                                                        <span>Leader</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px' }}>
                                {teamLeader
                                    ? 'Team leader selected. You can change it by selecting another member.'
                                    : 'Select one team member as the team leader (required)'}
                            </div>
                        </div>
                    ) : (
                        <div
                            style={{
                                padding: '16px',
                                backgroundColor: 'var(--secondary-bg)',
                                borderRadius: '6px',
                                border: '1px dashed var(--border-color)',
                                textAlign: 'center'
                            }}
                        >
                            <span style={{ color: 'var(--secondary-text)', fontSize: '14px' }}>
                                Select team members above to choose a team leader
                            </span>
                        </div>
                    )}
                </Modal>

                {/* View More Modal */}
                <Modal
                    title={viewMoreModal.title}
                    open={viewMoreModal.open}
                    onCancel={() => setViewMoreModal({ open: false, type: '', items: [], title: '' })}
                    footer={[
                        <Button
                            key="close"
                            onClick={() => setViewMoreModal({ open: false, type: '', items: [], title: '' })}
                            className="global-action-btn"
                        >
                            Close
                        </Button>
                    ]}
                    className="view-more-modal"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {viewMoreModal.items.map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    padding: '12px',
                                    borderRadius: '6px',
                                    backgroundColor: 'var(--secondary-bg)',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                <span style={{ color: 'var(--primary-text)' }}>{item}</span>
                            </div>
                        ))}
                    </div>
                </Modal>

                {/* User with Client Deviation Modal */}
                <Modal
                    title={userClientModal.teamName ? `User with Client Deviation - ${userClientModal.teamName}` : "User with Client Deviation"}
                    open={userClientModal.open}
                    onCancel={() => {
                        setUserClientModal({ open: false, userClients: [], teamName: '' });
                        setSearchTerm('');
                        setSearchSuggestions([]);
                    }}
                    footer={[
                        <Button
                            key="close"
                            className="global-action-btn"
                            onClick={() => {
                                setUserClientModal({ open: false, userClients: [], teamName: '' });
                                setSearchTerm('');
                                setSearchSuggestions([]);
                            }}
                        >
                            Close
                        </Button>
                    ]}
                    width={700}
                    className="user-client-modal"
                >
                    {/* Search Bar */}
                    <div className="search-bar-container" style={{ marginBottom: '20px' }}>
                        <AutoComplete
                            value={searchTerm}
                            options={searchSuggestions}
                            onSelect={handleSearchSelect}
                            onSearch={handleSearchChange}
                            onChange={handleSearchChange}
                            // placeholder="Search by user name, email, or client name..."
                            style={{ width: '100%' }}
                            allowClear
                            className="user-client-search"
                            filterOption={false}
                            dropdownClassName="user-client-search-dropdown"
                        >
                            <Input
                                prefix={<SearchOutlined className="search-icon" />}
                                placeholder="Search by user name, email, or client name..."
                                size="large"
                                allowClear
                                style={{ padding: "10px" }}
                            />
                        </AutoComplete>
                    </div>

                    <div className="user-client-list">
                        {getFilteredUserClients().length === 0 ? (
                            <div className="empty-state">
                                {searchTerm ? 'No results found for your search' : 'No team members with assigned clients found'}
                            </div>
                        ) : (
                            getFilteredUserClients().map((userClient, index) => (
                                <div key={userClient.user.userId || index} className="user-client-item">
                                    <div className="user-header">
                                        <div className="user-info">
                                            <span className="user-name">{userClient.user.name}</span>
                                            {userClient.user.email && (
                                                <span className="user-email">({userClient.user.email})</span>
                                            )}
                                        </div>
                                        <Tag color="blue" className="client-count-tag">
                                            {userClient.clients.length} Client{userClient.clients.length !== 1 ? 's' : ''}
                                        </Tag>
                                    </div>
                                    {userClient.clients.length === 0 ? (
                                        <div className="no-clients">No clients assigned</div>
                                    ) : (
                                        <div className="clients-table-wrapper">
                                            <Table
                                                dataSource={userClient.clients}
                                                rowKey="clientId"
                                                pagination={false}
                                                size="small"
                                                columns={[
                                                    {
                                                        title: 'Client Name',
                                                        dataIndex: 'clientName',
                                                        key: 'clientName',
                                                        width: '40%',
                                                        render: (text) => (
                                                            <span className="client-name-cell">{text}</span>
                                                        )
                                                    },
                                                    {
                                                        title: 'City',
                                                        dataIndex: 'city',
                                                        key: 'city',
                                                        width: '30%',
                                                        render: (text) => (
                                                            <span className="client-city-cell">{text || '-'}</span>
                                                        )
                                                    },
                                                    {
                                                        title: 'Status',
                                                        dataIndex: 'status',
                                                        key: 'status',
                                                        width: '30%',
                                                        render: (status) => (
                                                            <Tag
                                                                color={status === 'active' ? 'green' : 'red'}
                                                                className="status-tag"
                                                            >
                                                                {status === 'active' ? 'Active' : 'Inactive'}
                                                            </Tag>
                                                        )
                                                    }
                                                ]}
                                                className="user-client-table"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </Modal>

                {/* Teams Table */}
                <div className="clients-table-container">
                    <Table
                        columns={[
                            {
                                title: 'Team Name',
                                dataIndex: 'teamName',
                                key: 'teamName',
                                width: '18%',
                                render: (text) => <strong className="client-name-text">{text}</strong>
                            },
                            {
                                title: 'Team Leader',
                                dataIndex: 'teamLeader',
                                key: 'teamLeader',
                                width: '18%',
                                render: (leaderId, record) => {
                                    const leader = record.members?.find(m => m.userId === leaderId);
                                    const leaderName = leader?.name || leaderId || '-';
                                    return <span className="client-name-text">{leaderName}</span>;
                                }
                            },
                            {
                                title: 'Team Members',
                                dataIndex: 'members',
                                key: 'members',
                                width: '22%',
                                render: (members) => {
                                    if (!members || members.length === 0) return '-';
                                    const memberNames = members.map(m => m.name || m.userId || '-');

                                    const displayNames = memberNames.slice(0, 4);
                                    const remainingCount = memberNames.length - 4;

                                    return (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                            {displayNames.map((name, index) => (
                                                <Tag key={index} color="blue" style={{ margin: 0 }}>
                                                    {name}
                                                </Tag>
                                            ))}
                                            {remainingCount > 0 && (
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    onClick={() => setViewMoreModal({
                                                        open: true,
                                                        type: 'members',
                                                        items: memberNames,
                                                        title: 'All Team Members'
                                                    })}
                                                    style={{ padding: 0, height: 'auto', fontSize: '12px' }}
                                                >
                                                    View More ({remainingCount})
                                                </Button>
                                            )}
                                        </div>
                                    );
                                }
                            },
                            {
                                title: 'Team Clients',
                                dataIndex: 'clients',
                                key: 'clients',
                                width: '22%',
                                render: (clients) => {
                                    if (!clients || clients.length === 0) return '-';
                                    const clientNames = clients.map(c => c.clientName || c || '-');
                                    const displayNames = clientNames.slice(0, 4);
                                    const remainingCount = clientNames.length - 4;

                                    return (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                            {displayNames.map((name, index) => (
                                                <Tag key={index} color="green" style={{ margin: 0 }}>
                                                    {name}
                                                </Tag>
                                            ))}
                                            {remainingCount > 0 && (
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    onClick={() => setViewMoreModal({
                                                        open: true,
                                                        type: 'clients',
                                                        items: clientNames,
                                                        title: 'All Team Clients'
                                                    })}
                                                    style={{ padding: 0, height: 'auto', fontSize: '12px' }}
                                                >
                                                    View More ({remainingCount})
                                                </Button>
                                            )}
                                        </div>
                                    );
                                }
                            },
                            {
                                title: 'User with Client Deviation',
                                key: 'userClientDeviation',
                                width: '18%',
                                render: (_, record) => (
                                    <Button
                                        type="primary"
                                        size="small"
                                        onClick={() => handleOpenUserClientModal(record)}
                                        style={{ fontSize: '12px' }}
                                    >
                                        View Users & Clients
                                    </Button>
                                )
                            },
                            {
                                title: 'Actions',
                                key: 'actions',
                                width: '10%',
                                render: (_, record) => (
                                    <Button
                                        type="default"
                                        icon={<EditOutlined />}
                                        onClick={() => handleEdit(record)}
                                        size="small"
                                        className="global-secondary-btn"
                                    >
                                        Edit
                                    </Button>
                                )
                            }
                        ]}
                        dataSource={teamsData?.data || []}
                        loading={isLoadingTeams}
                        rowKey="_id"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} teams`
                        }}
                        className="clients-table"
                    />
                </div>
            </div>
        </div>
    );
};

export default ClientAssignManament;
