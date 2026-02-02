import React, { useState, useEffect } from 'react';
import './ContentProviderPanel.css';
import { Table, Tag, Tabs, Row, Col, Button, Input, Select, DatePicker, AutoComplete, Modal, Form, Checkbox, Avatar, Tooltip, Collapse } from 'antd';
import { useSelector } from 'react-redux';
import { selectTheme } from '../../../store/slices/themeSlice';
import { selectUser, selectUserId } from '../../../store/slices/authSlice';
import { useGetClientsByUserIdQuery, useGetAllUsersQuery, useGetTaskAssignQuery, useAddClientAttachmentMutation, useGetClientAttachmentsByUserIdQuery, useDeleteClientAttachmentMutation, useArchiveClientAttachmentMutation } from '../../../store/api';
import ContentProviderTaskEntries from './TaskEntries/ContentProviderTaskEntries';
import EmptyState from '../../CommonComponents/EmptyState/EmptyState';
import { BsFilter, BsSearch, BsUpload, BsFileEarmarkText, BsLink45Deg, BsCopy, BsCheck, BsTrash, BsCalendarCheck } from 'react-icons/bs';
import dayjs from 'dayjs';
import { useSocket } from '../../../contexts/SocketContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { onClientAttachmentUpdated, offClientAttachmentUpdated } from '../../../utils/socket';

const ContentProviderPanel = () => {
    const theme = useSelector(selectTheme);
    const user = useSelector(selectUser);
    const userId = useSelector(selectUserId);
    const userFullName = (user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Your').trim();

    const [activeTab, setActiveTab] = useState('1');
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDateRange, setSelectedDateRange] = useState(null);
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [assignerFilter, setAssignerFilter] = useState('all');
    const [uploadDocModalVisible, setUploadDocModalVisible] = useState(false);
    const [uploadStatusModalVisible, setUploadStatusModalVisible] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [uploadForm] = Form.useForm();
    const [documentHistoryModalVisible, setDocumentHistoryModalVisible] = useState(false);
    const [selectedClientForHistory, setSelectedClientForHistory] = useState(null);
    const [trackerSearchTerm, setTrackerSearchTerm] = useState('');
    const [copiedLinkId, setCopiedLinkId] = useState(null);
    const [modal, contextHolder] = Modal.useModal();

    const { socket } = useSocket();
    const { showSuccess, showError } = useNotification();
    const [addClientAttachment, { isLoading: isSubmittingAttachment }] = useAddClientAttachmentMutation();
    const [archiveClientAttachment] = useArchiveClientAttachmentMutation();

    // Fetch clients for the logged-in user - NO POLLING, using sockets for real-time updates
    const { data: clientsData, isLoading: isLoadingClients, refetch: refetchClients } = useGetClientsByUserIdQuery(userId, {
        skip: !userId, // Skip query if userId is not available
        refetchOnMountOrArgChange: true, // Only refetch on mount or when userId changes
        refetchOnFocus: false, // Disabled - we'll use sockets
        refetchOnReconnect: true, // Keep this for network reconnection
    });

    // Fetch all users to populate assigner filter
    const { data: allUsersData } = useGetAllUsersQuery();

    // Fetch tasks to get suggestions for search
    const { data: tasksData } = useGetTaskAssignQuery(userId);

    const clients = clientsData?.data || [];

    // Real-time client updates via socket
    useEffect(() => {
        if (!socket || !userId) return;

        // Listen for client-related socket events using centralized helper
        const handleClientUpdate = () => {
            console.log('✅ Client data changed - refetching...');
            refetchClients();
        };

        onClientAttachmentUpdated(handleClientUpdate);

        // Generic client update events not covered by handleClientUpdate
        socket.on('client:created', handleClientUpdate);
        socket.on('client:updated', handleClientUpdate);
        socket.on('client:deleted', handleClientUpdate);

        return () => {
            offClientAttachmentUpdated(handleClientUpdate);
            socket.off('client:created', handleClientUpdate);
            socket.off('client:updated', handleClientUpdate);
            socket.off('client:deleted', handleClientUpdate);
        };
    }, [socket, userId, refetchClients]);

    // Generate search suggestions from tasks
    const searchSuggestions = React.useMemo(() => {
        if (!tasksData?.data || !searchTerm) return [];

        const term = searchTerm.toLowerCase();
        const suggestions = new Set();

        tasksData.data.forEach(task => {
            // Task name suggestions
            if (task.taskName && task.taskName.toLowerCase().includes(term)) {
                suggestions.add(task.taskName);
            }
            // Client name suggestions
            if (task.clientName && task.clientName.toLowerCase().includes(term)) {
                suggestions.add(task.clientName);
            }
            // Category suggestions
            if (task.category && task.category.toLowerCase().includes(term)) {
                suggestions.add(task.category);
            }
        });

        return Array.from(suggestions).slice(0, 5).map(suggestion => ({
            value: suggestion,
            label: suggestion
        }));
    }, [tasksData, searchTerm]);

    // Filter clients based on search term
    const filteredClients = React.useMemo(() => {
        if (!searchTerm) return clients;
        const term = searchTerm.toLowerCase();
        return clients.filter(client =>
            client.clientName?.toLowerCase().includes(term)
        );
    }, [clients, searchTerm]);

    // Sorted and Filtered clients for the Upload Tracker Modal
    const sortedAndFilteredTrackerClients = React.useMemo(() => {
        let result = [...clients];

        // Apply Alphabetical Sort by default
        result.sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''));

        // Apply Search Filter if exists
        if (trackerSearchTerm) {
            const term = trackerSearchTerm.toLowerCase();
            result = result.filter(client =>
                client.clientName?.toLowerCase().includes(term)
            );
        }

        return result;
    }, [clients, trackerSearchTerm]);

    // Generate search suggestions for clients
    const clientSearchOptions = React.useMemo(() => {
        if (!clients || clients.length === 0) return [];

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

    // Date range presets
    const rangePresets = [
        { label: 'Today', value: [dayjs(), dayjs()] },
        { label: 'This Week', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
        { label: 'This Month', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
        { label: 'Last 7 Days', value: [dayjs().subtract(7, 'day'), dayjs()] },
        { label: 'Last 30 Days', value: [dayjs().subtract(30, 'day'), dayjs()] },
    ];

    // Get assigner options for filter
    const assignerOptions = React.useMemo(() => {
        if (!allUsersData?.data) return [];

        const assigners = new Set();
        tasksData?.data?.forEach(task => {
            if (task.userId) assigners.add(task.userId);
        });

        return Array.from(assigners).map(assignerId => {
            const assigner = allUsersData.data.find(u => u.userId === assignerId);
            const name = assigner
                ? `${assigner.firstName || ''} ${assigner.lastName || ''}`.trim() || assigner.email || assignerId
                : assignerId;
            return { value: assignerId, label: name };
        });
    }, [allUsersData, tasksData]);

    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedDateRange(null);
        setPriorityFilter('all');
        setAssignerFilter('all');
    };

    // Month options for the checkbox selection - mapping full names to short codes
    const monthOptions = [
        { label: 'Jan', value: 'January', shortCode: 'Jan' },
        { label: 'Feb', value: 'February', shortCode: 'Feb' },
        { label: 'Mar', value: 'March', shortCode: 'Mar' },
        { label: 'Apr', value: 'April', shortCode: 'Apr' },
        { label: 'May', value: 'May', shortCode: 'May' },
        { label: 'Jun', value: 'June', shortCode: 'Jun' },
        { label: 'Jul', value: 'July', shortCode: 'Jul' },
        { label: 'Aug', value: 'August', shortCode: 'Aug' },
        { label: 'Sep', value: 'September', shortCode: 'Sep' },
        { label: 'Oct', value: 'October', shortCode: 'Oct' },
        { label: 'Nov', value: 'November', shortCode: 'Nov' },
        { label: 'Dec', value: 'December', shortCode: 'Dec' }
    ];

    const handleUploadDocClick = (record) => {
        setSelectedClient(record);
        setUploadDocModalVisible(true);
        uploadForm.resetFields();
    };

    const handleUploadDocModalClose = () => {
        setUploadDocModalVisible(false);
        setSelectedClient(null);
        uploadForm.resetFields();
    };

    const handleDocumentHistoryClick = (record) => {
        setSelectedClientForHistory(record);
        setDocumentHistoryModalVisible(true);
    };

    const handleDocumentHistoryModalClose = () => {
        setDocumentHistoryModalVisible(false);
        setSelectedClientForHistory(null);
    };

    // --- Content Upload Tracker Logic ---

    // A small sub-component to fetch and display status for ONE client
    const UploadStatusRow = ({ client, userId, monthOptions }) => {
        const { data: history, isLoading } = useGetClientAttachmentsByUserIdQuery(
            { clientId: client._id, userId },
            { skip: !client._id || !userId }
        );

        const attachments = history?.data?.attachments || [];
        const uploadedMonths = attachments
            .filter(doc => doc.archived === false || doc.archived === undefined)
            .map(doc => doc.month);

        return (
            <tr key={client._id}>
                <td className="tracker-client-name">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>{client.clientName}</strong>
                        <Tooltip title="Copy Client Name">
                            <Button
                                type="text"
                                size="small"
                                icon={<BsCopy style={{ fontSize: '12px', color: 'var(--secondary-text)' }} />}
                                onClick={() => {
                                    navigator.clipboard.writeText(client.clientName);
                                    showSuccess('Client name copied!');
                                }}
                                className="copy-client-btn"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            />
                        </Tooltip>
                    </div>
                </td>
                {monthOptions.map(month => {
                    const isUploaded = uploadedMonths.includes(month.shortCode);
                    return (
                        <td key={month.value} className="tracker-month-cell">
                            <Checkbox checked={isUploaded} disabled />
                        </td>
                    );
                })}
                <td className="tracker-status-summary">
                    {isLoading ? (
                        <span className="tracker-loading">Loading...</span>
                    ) : (
                        <Tag color={uploadedMonths.length > 0 ? 'green' : 'orange'}>
                            {uploadedMonths.length} / 12
                        </Tag>
                    )}
                </td>
            </tr>
        );
    };

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

    // Real-time document history updates via socket
    // NOTE: This is now also handled automatically by RTK Query's onCacheEntryAdded in api.js
    // but we keep this as a local override to ensure immediate refresh of the history modal
    useEffect(() => {
        if (!socket || !selectedClientForHistory?._id || !documentHistoryModalVisible) return;

        const handleDocumentUpdate = () => {
            console.log('✅ Document history changed - refetching...');
            refetchDocumentHistory();
        };

        onClientAttachmentUpdated(handleDocumentUpdate);

        return () => {
            offClientAttachmentUpdated(handleDocumentUpdate);
        };
    }, [socket, selectedClientForHistory?._id, documentHistoryModalVisible, refetchDocumentHistory]);

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

    const documentsByMonth = React.useMemo(() => {
        const attachments = documentHistoryData?.data?.attachments || [];
        // Only show documents that are not archived
        const filteredAttachments = attachments.filter(doc => doc.archived === false || doc.archived === undefined);
        return groupDocumentsByMonth(filteredAttachments);
    }, [documentHistoryData]);

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

    // Handle archive attachment
    const handleDeleteAttachment = (attachmentId) => {
        modal.confirm({
            title: 'Archive Attachment',
            content: 'Are you sure you want to archive this attachment?',
            okText: 'Yes, Archive',
            okType: 'danger',
            cancelText: 'No',
            centered: true,
            onOk: () => {
                return archiveClientAttachment({
                    clientId: selectedClientForHistory?._id,
                    attachmentId
                }).unwrap()
                    .then(() => {
                        showSuccess('Attachment archived successfully');
                        refetchDocumentHistory();
                    })
                    .catch((error) => {
                        console.error('Failed to archive attachment:', error);
                        showError(error?.data?.message || 'Failed to archive attachment');
                    });
            }
        });
    };

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
                                <button
                                    className="archive-doc-btn"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeleteAttachment(doc._id);
                                    }}
                                    title="Archive attachment"
                                    type="button"
                                >
                                    <BsTrash />
                                </button>
                            </div>

                            <div className="document-link-container">
                                <div className="link-info">
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

    const handleUploadDocSubmit = async (values) => {
        try {
            if (!selectedClient?._id) {
                showError('No client selected');
                return;
            }

            // Get the first selected month and convert to short code
            const selectedMonths = values.months || [];
            if (selectedMonths.length === 0) {
                showError('Please select at least one month');
                return;
            }

            // Take the first selected month and get its short code
            const firstMonth = selectedMonths[0];
            const monthOption = monthOptions.find(opt => opt.value === firstMonth);
            const monthShortCode = monthOption?.shortCode || firstMonth.substring(0, 3);

            // Get user's full name
            const userName = user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email || user?.name || 'Unknown User';

            // Prepare the request body
            const requestBody = {
                link: values.link,
                notes: values.message,
                month: monthShortCode,
                uploadedBy: {
                    userId: userId,
                    name: userName
                }
            };

            // Call the API
            await addClientAttachment({
                clientId: selectedClient._id,
                body: requestBody
            }).unwrap();

            // Close the modal first for better UX
            handleUploadDocModalClose();

            showSuccess('Document uploaded successfully!');
            // Refetch clients to get updated data (socket event will also trigger refetch)
            refetchClients();
            // Refetch document history if modal is open
            if (documentHistoryModalVisible && selectedClientForHistory?._id === selectedClient._id) {
                refetchDocumentHistory();
            }

        } catch (error) {
            console.error('Error uploading document:', error);
            showError(error?.data?.message || error?.message || 'Failed to upload document');
        }
    };

    // Helper function to get user name
    const getUserName = (assignedUser) => {
        if (assignedUser.name) return assignedUser.name;
        if (assignedUser.userId) {
            const user = allUsersData?.data?.find(u => u.userId === assignedUser.userId);
            if (user) {
                return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || assignedUser.userId;
            }
        }
        return assignedUser.userId || 'Unknown';
    };

    // Table columns
    const columns = [
        {
            title: 'Client Name',
            dataIndex: 'clientName',
            key: 'clientName',
            width: '22%',
            render: (text) => <strong style={{ color: 'var(--primary-text)' }}>{text}</strong>
        },
        {
            title: 'Team Members',
            key: 'teamMembers',
            width: '25%',
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
                        {visibleMembers.map((user, index) => {
                            const userName = getUserName(user);
                            const initials = userName
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2) || '?';

                            return (
                                <Tooltip key={user.userId || index} title={userName}>
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
                                        {assignedUsers.slice(3).map((user, idx) => (
                                            <div key={user.userId || idx} style={{ marginBottom: '4px' }}>
                                                {getUserName(user)}
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
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: '12%',
            render: (status) => (
                <Tag color={status === 'active' ? 'green' : 'red'}>
                    {status === 'active' ? 'Active' : 'Inactive'}
                </Tag>
            )
        },
        {
            title: 'Onboard Date',
            dataIndex: 'onboardDate',
            key: 'onboardDate',
            width: '15%',
            render: (date) => {
                if (!date) return '-';
                return <span style={{ color: 'var(--primary-text)' }}>{dayjs(date).format('MMM DD, YYYY')}</span>;
            }
        },
        {
            title: 'Document History',
            key: 'documentHistory',
            width: '13%',
            render: (_, record) => (
                <Button
                    className='global-secondary-btn'
                    type="default"
                    icon={<BsFileEarmarkText />}
                    onClick={() => handleDocumentHistoryClick(record)}
                    size="small"
                >
                    History
                </Button>
            )
        },
        {
            title: 'Upload Doc',
            key: 'uploadDoc',
            width: '13%',
            render: (_, record) => (
                <Button
                    className='global-secondary-btn'
                    type="primary"
                    icon={<BsUpload />}
                    onClick={() => handleUploadDocClick(record)}
                    size="small"
                >
                    Upload Doc
                </Button>
            )
        }
    ];

    const handleTabChange = (key) => {
        setActiveTab(key);
    };

    return (
        <div id="ContentProviderPanel" className={`theme-${theme}`}>
            {contextHolder}
            <div className='ContentProviderPanel-container'>
                <div className="clients-segregation-header">
                    <h2 className="panel-title">{userFullName} Clients</h2>
                    <div className="header-actions-right" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Button
                            icon={<BsCalendarCheck />}
                            onClick={() => setUploadStatusModalVisible(true)}
                            className="global-secondary-btn"
                            style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            Upload Tracker
                        </Button>
                        <div className="client-search-wrapper">
                            <AutoComplete
                                options={clientSearchOptions}
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
                </div>

                {/* Upload Doc Modal */}
                <Modal
                    title={<div className="modal-custom-title">Upload Document</div>}
                    open={uploadDocModalVisible}
                    onCancel={handleUploadDocModalClose}
                    footer={[
                        <Button
                            key="cancel"
                            className="global-secondary-btn"
                            onClick={handleUploadDocModalClose}
                        >
                            Cancel
                        </Button>,
                        <Button
                            key="submit"
                            className="global-action-btn"
                            loading={isSubmittingAttachment}
                            onClick={() => uploadForm.submit()}
                        >
                            Submit
                        </Button>
                    ]}
                    destroyOnClose
                    className="upload-doc-modal"
                    width={600}
                    centered
                    maskClosable={false}
                >
                    <Form
                        form={uploadForm}
                        layout="vertical"
                        onFinish={handleUploadDocSubmit}
                        className="custom-upload-form"
                    >
                        <Form.Item
                            label={<span className="form-label-text">Enter Link</span>}
                            name="link"
                            rules={[{ required: true, message: 'Please enter a link' }]}
                        >
                            <Input
                                placeholder="Enter document link"
                                allowClear
                                prefix={<BsLink45Deg className="input-prefix-icon" />}
                            />
                        </Form.Item>

                        <Form.Item
                            label={<span className="form-label-text">Enter Message</span>}
                            name="message"
                            rules={[{ required: true, message: 'Please enter a message' }]}
                        >
                            <Input.TextArea
                                rows={4}
                                placeholder="Enter your message"
                                maxLength={500}
                                showCount
                            />
                        </Form.Item>

                        <Form.Item
                            label={<span className="form-label-text">Select Month</span>}
                            name="months"
                            rules={[{ required: true, message: 'Please select at least one month' }]}
                            style={{ marginBottom: 0 }}
                        >
                            <Checkbox.Group className="month-checkbox-group">
                                <Row gutter={[8, 12]}>
                                    {monthOptions.map((month) => (
                                        <Col xs={8} sm={6} md={4} key={month.value}>
                                            <Checkbox value={month.value} className="custom-checkbox">
                                                {month.label}
                                            </Checkbox>
                                        </Col>
                                    ))}
                                </Row>
                            </Checkbox.Group>
                        </Form.Item>
                    </Form>
                </Modal>

                {/* Document History Modal */}
                <Modal
                    title={`Document History - ${selectedClientForHistory?.clientName || ''}`}
                    open={documentHistoryModalVisible}
                    onCancel={handleDocumentHistoryModalClose}
                    footer={[
                        <Button key="close" className='history-close-btn' onClick={handleDocumentHistoryModalClose}>
                            CLOSE
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
                            description="This client doesn't have any uploaded documents yet. Upload a document to get started."
                            className="compact"
                        />
                    )}
                </Modal>

                {/* Upload Status Tracker Modal */}
                <Modal
                    title={<div className="modal-custom-title">Monthly Upload Tracker</div>}
                    open={uploadStatusModalVisible}
                    onCancel={() => setUploadStatusModalVisible(false)}
                    footer={[
                        <Button
                            key="close"
                            className="global-secondary-btn"
                            onClick={() => setUploadStatusModalVisible(false)}
                        >
                            Close
                        </Button>
                    ]}
                    width={1100}
                    className="upload-tracker-modal"
                    centered
                >
                    <div className="tracker-modal-header-actions" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                        <div className="tracker-search-wrapper" style={{ width: '300px' }}>
                            <Input
                                placeholder="Search client in tracker..."
                                prefix={<BsSearch className="search-icon" />}
                                allowClear
                                value={trackerSearchTerm}
                                onChange={(e) => setTrackerSearchTerm(e.target.value)}
                                className="client-panel-search"
                            />
                        </div>
                    </div>
                    <div className="tracker-table-container">
                        <table className="tracker-table">
                            <thead>
                                <tr>
                                    <th>Client Name</th>
                                    {monthOptions.map(month => (
                                        <th key={month.value}>{month.shortCode}</th>
                                    ))}
                                    <th>Summary</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAndFilteredTrackerClients.length === 0 ? (
                                    <tr>
                                        <td colSpan={monthOptions.length + 2} style={{ textAlign: 'center', padding: '40px' }}>
                                            {trackerSearchTerm ? 'No matching clients found.' : 'No clients assigned to track.'}
                                        </td>
                                    </tr>
                                ) : (
                                    sortedAndFilteredTrackerClients.map(client => (
                                        <UploadStatusRow
                                            key={client._id}
                                            client={client}
                                            userId={userId}
                                            monthOptions={monthOptions}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Modal>

                {/* Tasks Section */}

            </div>
        </div >
    );
};

export default ContentProviderPanel;

