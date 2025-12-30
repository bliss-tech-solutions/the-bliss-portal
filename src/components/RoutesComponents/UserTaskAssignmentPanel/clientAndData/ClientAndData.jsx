import React, { useEffect, useState, useMemo } from 'react';
import './ClientAndData.css';
import { Table, Tag, Avatar, Tooltip, Modal, Button, Collapse, Input, AutoComplete } from 'antd';
import { useSelector } from 'react-redux';
import { selectTheme } from '../../../../store/slices/themeSlice';
import { selectUser, selectUserId } from '../../../../store/slices/authSlice';
import { getUserName, getUserId } from '../../../../utils/userUtils';
import { useGetClientsByUserIdQuery, useGetAllUsersQuery, useGetClientAttachmentsByUserIdQuery } from '../../../../store/api';
import { useSocket } from '../../../../contexts/SocketContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { BsFileEarmarkText, BsLink45Deg, BsCopy, BsCheck, BsSearch } from 'react-icons/bs';
import dayjs from 'dayjs';
import EmptyState from '../../../CommonComponents/EmptyState/EmptyState';

const ClientAndData = () => {
    const theme = useSelector(selectTheme);
    const user = useSelector(selectUser);
    const userIdFromState = useSelector(selectUserId);
    const userName = getUserName(user);
    const userId = getUserId(user, userIdFromState);

    const { socket } = useSocket();
    const { showSuccess, showError } = useNotification();

    const [documentHistoryModalVisible, setDocumentHistoryModalVisible] = useState(false);
    const [selectedClientForHistory, setSelectedClientForHistory] = useState(null);
    const [copiedLinkId, setCopiedLinkId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch clients for the logged-in user - NO POLLING, using sockets for real-time updates
    const { data: clientsData, isLoading: isLoadingClients, refetch: refetchClients } = useGetClientsByUserIdQuery(userId, {
        skip: !userId,
        refetchOnMountOrArgChange: true,
        refetchOnFocus: false, // Disabled - we'll use sockets
        refetchOnReconnect: true,
    });

    // Fetch all users for team member names
    const { data: allUsersData } = useGetAllUsersQuery();

    const clients = clientsData?.data || [];

    // Generate search suggestions based on client names
    const searchOptions = useMemo(() => {
        if (!clients || clients.length === 0) return [];

        // Filter out duplicates and format for AutoComplete
        const uniqueNames = [...new Set(clients.map(c => c.clientName).filter(Boolean))];
        return uniqueNames.map(name => ({
            value: name,
            label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BsSearch style={{ fontSize: '12px', color: 'var(--secondary-text)' }} />
                    <span>{name}</span>
                </div>
            )
        }));
    }, [clients]);

    // Filter clients based on search term
    const filteredClients = useMemo(() => {
        if (!searchTerm) return clients;
        const term = searchTerm.toLowerCase();
        return clients.filter(client =>
            client.clientName?.toLowerCase().includes(term)
        );
    }, [clients, searchTerm]);

    // Fetch document history when modal is open
    const { data: documentHistoryData, isLoading: isLoadingDocumentHistory, refetch: refetchDocumentHistory } = useGetClientAttachmentsByUserIdQuery(
        {
            clientId: selectedClientForHistory?._id,
            userId: userId
        },
        {
            skip: !selectedClientForHistory?._id || !userId || !documentHistoryModalVisible,
            refetchOnMountOrArgChange: true,
        }
    );

    // Real-time client updates via socket
    useEffect(() => {
        if (!socket || !userId) return;

        const handleClientUpdate = () => {
            console.log('✅ Client data changed - refetching...');
            refetchClients();
        };

        socket.on('client:created', handleClientUpdate);
        socket.on('client:updated', handleClientUpdate);
        socket.on('client:deleted', handleClientUpdate);
        socket.on('client:attachment:added', handleClientUpdate);
        socket.on('client:change', handleClientUpdate);

        return () => {
            socket.off('client:created', handleClientUpdate);
            socket.off('client:updated', handleClientUpdate);
            socket.off('client:deleted', handleClientUpdate);
            socket.off('client:attachment:added', handleClientUpdate);
            socket.off('client:change', handleClientUpdate);
        };
    }, [socket, userId, refetchClients]);

    // Real-time document history updates via socket
    useEffect(() => {
        if (!socket || !selectedClientForHistory?._id || !documentHistoryModalVisible) return;

        const handleDocumentUpdate = () => {
            console.log('✅ Document history changed - refetching...');
            refetchDocumentHistory();
        };

        socket.on('client:attachment:added', handleDocumentUpdate);
        socket.on('client:attachment:updated', handleDocumentUpdate);
        socket.on('client:attachment:deleted', handleDocumentUpdate);

        return () => {
            socket.off('client:attachment:added', handleDocumentUpdate);
            socket.off('client:attachment:updated', handleDocumentUpdate);
            socket.off('client:attachment:deleted', handleDocumentUpdate);
        };
    }, [socket, selectedClientForHistory?._id, documentHistoryModalVisible, refetchDocumentHistory]);

    // Helper function to get user name for team members
    const getTeamMemberName = (assignedUser) => {
        if (assignedUser.name) return assignedUser.name;
        if (assignedUser.userId) {
            const user = allUsersData?.data?.find(u => u.userId === assignedUser.userId);
            if (user) {
                return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || assignedUser.userId;
            }
        }
        return assignedUser.userId || 'Unknown';
    };

    const handleDocumentHistoryClick = (record) => {
        setSelectedClientForHistory(record);
        setDocumentHistoryModalVisible(true);
    };

    const handleDocumentHistoryModalClose = () => {
        setDocumentHistoryModalVisible(false);
        setSelectedClientForHistory(null);
    };

    // Handle copy to clipboard
    const handleCopyLink = async (link, docId) => {
        try {
            await navigator.clipboard.writeText(link);
            setCopiedLinkId(docId);
            showSuccess('Link copied to clipboard!');
            setTimeout(() => setCopiedLinkId(null), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
            showError('Failed to copy link');
        }
    };

    // Group documents by month
    const groupDocumentsByMonth = (attachments) => {
        if (!attachments || attachments.length === 0) return {};

        const grouped = {};
        attachments.forEach(doc => {
            const month = doc.month || 'Unknown';
            if (!grouped[month]) {
                grouped[month] = [];
            }
            grouped[month].push(doc);
        });

        // Sort documents within each month and determine the latest date for each month
        const monthDetails = [];
        Object.keys(grouped).forEach(month => {
            const sortedDocs = grouped[month].sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );
            const latestDate = new Date(sortedDocs[0].createdAt);
            monthDetails.push({ month, docs: sortedDocs, latestDate });
        });

        // Sort months based on their latest document date (descending)
        monthDetails.sort((a, b) => b.latestDate - a.latestDate);

        // Convert back to structured object
        const sortedGrouped = {};
        monthDetails.forEach(detail => {
            sortedGrouped[detail.month] = detail.docs;
        });

        return sortedGrouped;
    };

    const documentsByMonth = useMemo(() => {
        const attachments = documentHistoryData?.data?.attachments || [];
        return groupDocumentsByMonth(attachments);
    }, [documentHistoryData]);

    // Prepare collapse panels for month-wise display with compact card design
    const collapsePanels = Object.keys(documentsByMonth).map(month => {
        const documents = documentsByMonth[month];

        return {
            key: month,
            label: `${month} (${documents.length} document${documents.length !== 1 ? 's' : ''})`,
            children: (
                <div className="document-cards-grid">
                    {documents.map((doc) => (
                        <div key={doc._id} className="document-card">
                            <div className="document-card-header">
                                <div className="document-date">
                                    {dayjs(doc.createdAt).format('MMM DD, YYYY')}
                                </div>
                                <div className="document-time">
                                    {dayjs(doc.createdAt).format('hh:mm A')}
                                </div>
                            </div>

                            <div className="document-link-section">
                                <div className="document-link-container">
                                    <BsLink45Deg className="link-icon" />
                                    <span className="document-link-text">
                                        {doc.link.length > 20 ? `${doc.link.substring(0, 20)}...` : doc.link}
                                    </span>
                                    <button
                                        className="copy-link-btn"
                                        onClick={() => handleCopyLink(doc.link, doc._id)}
                                        title="Copy link"
                                    >
                                        {copiedLinkId === doc._id ? (
                                            <BsCheck className="copy-icon copied" />
                                        ) : (
                                            <BsCopy className="copy-icon" />
                                        )}
                                    </button>
                                </div>
                                <a
                                    href={doc.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="open-link-btn"
                                    title="Open link"
                                >
                                    Open
                                </a>
                            </div>

                            {doc.notes && (
                                <div className="document-notes">
                                    {doc.notes}
                                </div>
                            )}

                            <div className="document-footer">
                                <span className="document-uploaded-by">
                                    {doc.uploadedBy?.name || 'Unknown'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )
        };
    });

    // Table columns - Client Name, Team Members, and Document History (no upload options)
    const columns = [
        {
            title: 'Client Name',
            dataIndex: 'clientName',
            key: 'clientName',
            width: '40%',
            render: (text) => <strong style={{ color: 'var(--primary-text)' }}>{text}</strong>
        },
        {
            title: 'Team Members',
            key: 'teamMembers',
            width: '40%',
            render: (_, record) => {
                const assignedUsers = record.assignedUsers || [];

                if (assignedUsers.length === 0) {
                    return <span style={{ color: 'var(--secondary-text)' }}>-</span>;
                }

                // Show first 3 members with avatars, and "+X more" if there are more
                const visibleMembers = assignedUsers.slice(0, 3);
                const remainingCount = assignedUsers.length - 3;

                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {visibleMembers.map((member, index) => {
                            const memberName = getTeamMemberName(member);
                            const initials = memberName
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2) || '?';

                            return (
                                <Tooltip key={member.userId || index} title={memberName}>
                                    <Avatar
                                        size="small"
                                        style={{
                                            backgroundColor: `var(--brand-color)`,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {initials}
                                    </Avatar>
                                </Tooltip>
                            );
                        })}
                        {remainingCount > 0 && (
                            <Tooltip
                                title={
                                    <div>
                                        {assignedUsers.slice(3).map((member, idx) => (
                                            <div key={member.userId || idx} style={{ marginBottom: '4px' }}>
                                                {getTeamMemberName(member)}
                                            </div>
                                        ))}
                                    </div>
                                }
                            >
                                <Avatar
                                    size="small"
                                    style={{
                                        backgroundColor: 'var(--secondary-bg)',
                                        color: 'var(--primary-text)',
                                        cursor: 'pointer',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    +{remainingCount}
                                </Avatar>
                            </Tooltip>
                        )}
                    </div>
                );
            }
        },
        {
            title: 'Document History',
            key: 'documentHistory',
            width: '20%',
            render: (_, record) => (
                <Button
                    type="default"
                    icon={<BsFileEarmarkText />}
                    onClick={() => handleDocumentHistoryClick(record)}
                    size="small"
                    className='global-secondary-btn'
                >
                    History
                </Button>
            )
        }
    ];

    return (
        <div id="ClientAndData" className={`theme-${theme}`}>
            <div className="client-and-data-container">
                <div className="client-and-data-header-row">
                    <h2 className='Capitalize'>{userName} Client & Data</h2>
                    <div className="client-search-wrapper">
                        <AutoComplete
                            options={searchOptions}
                            value={searchTerm}
                            onChange={(value) => setSearchTerm(value)}
                            onSelect={(value) => setSearchTerm(value)}
                            style={{ width: '100%' }}
                            filterOption={(inputValue, option) =>
                                option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                            }
                        >
                            <Input
                                placeholder="Search client by name..."
                                prefix={<BsSearch className="search-icon" />}
                                allowClear
                                className="client-panel-search"
                            />
                        </AutoComplete>
                    </div>
                </div>

                <div className="clients-table-container">
                    <Table
                        columns={columns}
                        dataSource={filteredClients}
                        loading={isLoadingClients}
                        rowKey="_id"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} clients`
                        }}
                        className="clients-table"
                    />

                    {/* Document History Modal */}
                    <Modal
                        title={`Document History - ${selectedClientForHistory?.clientName || ''}`}
                        open={documentHistoryModalVisible}
                        onCancel={handleDocumentHistoryModalClose}
                        footer={[
                            <Button key="close" className='global-secondary-btn' onClick={handleDocumentHistoryModalClose}>
                                Close
                            </Button>
                        ]}
                        width={1000}
                        className="document-history-modal"
                        destroyOnClose
                    >
                        {isLoadingDocumentHistory ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                Loading document history...
                            </div>
                        ) : documentsByMonth && Object.keys(documentsByMonth).length > 0 ? (
                            <Collapse
                                items={collapsePanels}
                                defaultActiveKey={Object.keys(documentsByMonth)}
                            />
                        ) : (
                            <EmptyState
                                image="/Images/NoTaskAvaible.png"
                                imageAlt="No documents available"
                                title="No documents found"
                                description="This client doesn't have any uploaded documents yet."
                                className="compact"
                            />
                        )}
                    </Modal>
                </div>
            </div>
        </div>
    );
};

export default ClientAndData;

