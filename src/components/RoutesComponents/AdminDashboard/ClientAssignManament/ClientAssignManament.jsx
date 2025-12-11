import React, { useState } from "react";
import "./ClientAssignManament.css";
import {
    Box,
    Heading,
    Button,
    Dialog,
    Input,
    Field,
    Stack,
    Checkbox,
    RadioGroup,
    RadioGroupRoot,
    RadioGroupItem
} from "@chakra-ui/react";
import { Select, Table, Button as AntButton, Tag, Modal, AutoComplete } from 'antd';
import { EditOutlined, SearchOutlined } from '@ant-design/icons';
import { useCreateTeamMutation, useUpdateTeamMutation, useGetAllTeamsQuery, useGetAllClientsQuery } from "../../../../store/api";
import { useGetAllUsersQuery } from "../../../../store/api";
import { useNotification } from "../../../../contexts/NotificationContext";

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
                <Box
                    className="clients-segregation-header"
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap={{ base: 'wrap', md: 'nowrap' }}
                    gap={4}
                    mb={6}
                >
                    <Heading size="lg" className="clients-segregation-title">
                        Team Management Panel
                    </Heading>
                    <Button
                        onClick={() => setIsOpen(true)}
                        className="add-client-button"
                        size="lg"
                    >
                        Create Team
                    </Button>
                </Box>

                <Dialog.Root open={isOpen} onOpenChange={(details) => {
                    if (!details.open) {
                        handleClose();
                    }
                }}>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content maxW={{ base: '90vw', md: '600px' }} className="add-team-modal">
                            <Dialog.Header>
                                <Dialog.Title>{editingTeam ? 'Edit Team' : 'Create New Team'}</Dialog.Title>
                                <Dialog.Description>
                                    {editingTeam ? 'Update the team information below' : 'Fill in the team information below'}
                                </Dialog.Description>
                            </Dialog.Header>

                            <Dialog.Body>
                                <Stack gap={4}>
                                    <Field.Root>
                                        <Field.Label>Team Name</Field.Label>
                                        <Input
                                            placeholder="Enter team name"
                                            value={teamName}
                                            onChange={(e) => setTeamName(e.target.value)}
                                            className="theme-input"
                                        />
                                        <Field.HelperText>Enter a unique name for the team</Field.HelperText>
                                    </Field.Root>

                                    <Field.Root>
                                        <Field.Label>Team Members</Field.Label>
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
                                        <Field.HelperText>Select one or more team members (minimum 1 required)</Field.HelperText>
                                    </Field.Root>

                                    {selectedMembers && selectedMembers.length > 0 ? (
                                        <Field.Root>
                                            <Field.Label>Selected Team Members *</Field.Label>
                                            <Box
                                                border="1px solid"
                                                borderColor="var(--border-color)"
                                                borderRadius="6px"
                                                p={4}
                                                bg="var(--secondary-bg)"
                                                maxH="300px"
                                                overflowY="auto"
                                                className="team-leader-container"
                                            >
                                                <RadioGroupRoot
                                                    value={teamLeader || ''}
                                                    onValueChange={(details) => {
                                                        console.log('Team leader change event:', details);
                                                        let selectedValue = '';

                                                        // Handle different possible structures from Chakra UI
                                                        if (details && typeof details === 'object') {
                                                            if (Array.isArray(details.value) && details.value.length > 0) {
                                                                selectedValue = details.value[0];
                                                            } else if (details.value && typeof details.value === 'string') {
                                                                selectedValue = details.value;
                                                            } else if (details.valueAsString) {
                                                                selectedValue = details.valueAsString;
                                                            }
                                                        } else if (typeof details === 'string') {
                                                            selectedValue = details;
                                                        }

                                                        console.log('Extracted team leader value:', selectedValue);
                                                        if (selectedValue) {
                                                            handleTeamLeaderChange(selectedValue);
                                                        }
                                                    }}
                                                >
                                                    <Stack gap={3}>
                                                        {selectedMembers.map((userId) => {
                                                            const user = allUsers.find(u => u.userId === userId);
                                                            const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || userId;
                                                            const isSelected = teamLeader === userId;
                                                            return (
                                                                <RadioGroupItem
                                                                    key={userId}
                                                                    value={userId}
                                                                    onClick={() => {
                                                                        console.log('Radio item clicked:', userId);
                                                                        handleTeamLeaderChange(userId);
                                                                    }}
                                                                >
                                                                    <Box
                                                                        display="flex"
                                                                        alignItems="center"
                                                                        gap={3}
                                                                        p={3}
                                                                        borderRadius="6px"
                                                                        bg={isSelected ? 'rgba(235, 178, 54, 0.15)' : 'transparent'}
                                                                        border={isSelected ? '2px solid var(--brand-color)' : '1px solid var(--border-color)'}
                                                                        transition="all 0.2s"
                                                                        cursor="pointer"
                                                                        _hover={{
                                                                            bg: isSelected ? 'rgba(235, 178, 54, 0.2)' : 'var(--hover-bg)',
                                                                            borderColor: 'var(--brand-color)'
                                                                        }}
                                                                        width="100%"
                                                                    >
                                                                        <Box
                                                                            width="20px"
                                                                            height="20px"
                                                                            borderRadius="50%"
                                                                            border="2px solid"
                                                                            borderColor={isSelected ? 'var(--brand-color)' : 'var(--border-color)'}
                                                                            bg={isSelected ? 'var(--brand-color)' : 'transparent'}
                                                                            display="flex"
                                                                            alignItems="center"
                                                                            justifyContent="center"
                                                                            flexShrink={0}
                                                                        >
                                                                            {isSelected && (
                                                                                <Box
                                                                                    width="8px"
                                                                                    height="8px"
                                                                                    borderRadius="50%"
                                                                                    bg="#000"
                                                                                />
                                                                            )}
                                                                        </Box>
                                                                        <Box flex="1">
                                                                            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                                                                                <span style={{ color: 'var(--primary-text)', fontWeight: isSelected ? 600 : 500, fontSize: '15px' }}>
                                                                                    {userName}
                                                                                </span>
                                                                                {user?.email && (
                                                                                    <span style={{ color: 'var(--secondary-text)', fontSize: '13px' }}>
                                                                                        ({user.email})
                                                                                    </span>
                                                                                )}
                                                                            </Box>
                                                                        </Box>
                                                                        {isSelected && (
                                                                            <Box
                                                                                color="var(--brand-color)"
                                                                                fontSize="13px"
                                                                                fontWeight={600}
                                                                                display="flex"
                                                                                alignItems="center"
                                                                                gap={1}
                                                                            >
                                                                                <span>✓</span>
                                                                                <span>Leader</span>
                                                                            </Box>
                                                                        )}
                                                                    </Box>
                                                                </RadioGroupItem>
                                                            );
                                                        })}
                                                    </Stack>
                                                </RadioGroupRoot>
                                            </Box>
                                            <Field.HelperText>
                                                {teamLeader
                                                    ? 'Team leader selected. You can change it by selecting another member.'
                                                    : 'Select one team member as the team leader (required)'}
                                            </Field.HelperText>
                                        </Field.Root>
                                    ) : (
                                        <Box
                                            p={4}
                                            bg="var(--secondary-bg)"
                                            borderRadius="6px"
                                            border="1px dashed var(--border-color)"
                                            textAlign="center"
                                        >
                                            <span style={{ color: 'var(--secondary-text)', fontSize: '14px' }}>
                                                Select team members above to choose a team leader
                                            </span>
                                        </Box>
                                    )}
                                </Stack>
                            </Dialog.Body>

                            <Dialog.Footer>
                                <Button
                                    variant="outline"
                                    onClick={handleClose}
                                    className="theme-button"
                                    disabled={isCreating}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    className="theme-button-primary"
                                    disabled={isCreating || isUpdating}
                                >
                                    {(isCreating || isUpdating) ? (editingTeam ? 'Updating...' : 'Creating...') : (editingTeam ? 'Update Team' : 'Create Team')}
                                </Button>
                            </Dialog.Footer>
                            <Dialog.CloseTrigger />
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Dialog.Root>

                {/* View More Modal */}
                <Dialog.Root open={viewMoreModal.open} onOpenChange={(details) => {
                    if (!details.open) {
                        setViewMoreModal({ open: false, type: '', items: [], title: '' });
                    }
                }}>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content maxW={{ base: '90vw', md: '500px' }} className="view-more-modal">
                            <Dialog.Header>
                                <Dialog.Title>{viewMoreModal.title}</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body>
                                <Stack gap={2}>
                                    {viewMoreModal.items.map((item, index) => (
                                        <Box
                                            key={index}
                                            p={3}
                                            borderRadius="6px"
                                            bg="var(--secondary-bg)"
                                            border="1px solid var(--border-color)"
                                        >
                                            <span style={{ color: 'var(--primary-text)' }}>{item}</span>
                                        </Box>
                                    ))}
                                </Stack>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Button
                                    onClick={() => setViewMoreModal({ open: false, type: '', items: [], title: '' })}
                                    className="theme-button-primary"
                                >
                                    Close
                                </Button>
                            </Dialog.Footer>
                            <Dialog.CloseTrigger />
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Dialog.Root>

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
                        <AntButton
                            key="close"
                            type="primary"
                            onClick={() => {
                                setUserClientModal({ open: false, userClients: [], teamName: '' });
                                setSearchTerm('');
                                setSearchSuggestions([]);
                            }}
                        >
                            Close
                        </AntButton>
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
                <Box className="teams-table-container" mt={6}>
                    <Table
                        columns={[
                            {
                                title: 'Team Name',
                                dataIndex: 'teamName',
                                key: 'teamName',
                                width: '18%',
                                render: (text) => <strong style={{ color: 'var(--primary-text)' }}>{text}</strong>
                            },
                            {
                                title: 'Team Leader',
                                dataIndex: 'teamLeader',
                                key: 'teamLeader',
                                width: '18%',
                                render: (leaderId, record) => {
                                    const leader = record.members?.find(m => m.userId === leaderId);
                                    const leaderName = leader?.name || leaderId || '-';
                                    return <span style={{ color: 'var(--primary-text)' }}>{leaderName}</span>;
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
                                                <AntButton
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
                                                </AntButton>
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
                                                <AntButton
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
                                                </AntButton>
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
                                    <AntButton
                                        type="primary"
                                        size="small"
                                        onClick={() => handleOpenUserClientModal(record)}
                                        style={{ fontSize: '12px' }}
                                    >
                                        View Users & Clients
                                    </AntButton>
                                )
                            },
                            {
                                title: 'Actions',
                                key: 'actions',
                                width: '10%',
                                render: (_, record) => (
                                    <AntButton
                                        type="default"
                                        icon={<EditOutlined />}
                                        onClick={() => handleEdit(record)}
                                        size="small"
                                    >
                                        Edit
                                    </AntButton>
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
                        className="teams-table"
                    />
                </Box>
            </div>
        </div>
    );
};

export default ClientAssignManament;
