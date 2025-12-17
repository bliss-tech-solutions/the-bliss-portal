import React, { useState, useEffect } from 'react';
import './ContentProviderPanel.css';
import { Table, Tag, Tabs, Row, Col, Button, Input, Select, DatePicker, AutoComplete, Modal, Form, Checkbox, Avatar, Tooltip, Collapse } from 'antd';
import { useSelector } from 'react-redux';
import { selectTheme } from '../../../store/slices/themeSlice';
import { selectUser, selectUserId } from '../../../store/slices/authSlice';
import { useGetClientsByUserIdQuery, useGetAllUsersQuery, useGetTaskAssignQuery, useAddClientAttachmentMutation, useGetClientAttachmentsByUserIdQuery } from '../../../store/api';
import ContentProviderTaskEntries from './TaskEntries/ContentProviderTaskEntries';
import EmptyState from '../../CommonComponents/EmptyState/EmptyState';
import { BsFilter, BsSearch, BsUpload, BsFileEarmarkText, BsLink45Deg, BsCopy, BsCheck } from 'react-icons/bs';
import dayjs from 'dayjs';
import { useSocket } from '../../../contexts/SocketContext';
import { useNotification } from '../../../contexts/NotificationContext';

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
    const [selectedClient, setSelectedClient] = useState(null);
    const [uploadForm] = Form.useForm();
    const [documentHistoryModalVisible, setDocumentHistoryModalVisible] = useState(false);
    const [selectedClientForHistory, setSelectedClientForHistory] = useState(null);
    const [copiedLinkId, setCopiedLinkId] = useState(null);

    const { socket } = useSocket();
    const { showSuccess, showError } = useNotification();
    const [addClientAttachment, { isLoading: isSubmittingAttachment }] = useAddClientAttachmentMutation();

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

    // Real-time client updates via socket - only refetch when data actually changes
    useEffect(() => {
        if (!socket || !userId) return;

        // Listen for client-related socket events
        const handleClientUpdate = () => {
            console.log('✅ Client data changed - refetching...');
            refetchClients();
        };

        // Listen to common client socket events (adjust event names based on your backend)
        socket.on('client:created', handleClientUpdate);
        socket.on('client:updated', handleClientUpdate);
        socket.on('client:deleted', handleClientUpdate);
        socket.on('client:attachment:added', handleClientUpdate);

        // Generic client update event
        socket.on('client:change', handleClientUpdate);

        // Cleanup listeners on unmount
        return () => {
            socket.off('client:created', handleClientUpdate);
            socket.off('client:updated', handleClientUpdate);
            socket.off('client:deleted', handleClientUpdate);
            socket.off('client:attachment:added', handleClientUpdate);
            socket.off('client:change', handleClientUpdate);
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

        // Sort months in reverse order (most recent first)
        const monthOrder = ['Dec', 'Nov', 'Oct', 'Sep', 'Aug', 'Jul', 'Jun', 'May', 'Apr', 'Mar', 'Feb', 'Jan'];
        const sortedGrouped = {};
        monthOrder.forEach(month => {
            if (grouped[month]) {
                sortedGrouped[month] = grouped[month].sort((a, b) =>
                    new Date(b.createdAt) - new Date(a.createdAt)
                );
            }
        });

        // Add any months not in the standard list
        Object.keys(grouped).forEach(month => {
            if (!sortedGrouped[month]) {
                sortedGrouped[month] = grouped[month].sort((a, b) =>
                    new Date(b.createdAt) - new Date(a.createdAt)
                );
            }
        });

        return sortedGrouped;
    };

    const documentsByMonth = React.useMemo(() => {
        const attachments = documentHistoryData?.data?.attachments || [];
        return groupDocumentsByMonth(attachments);
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

            showSuccess('Document uploaded successfully!');
            // Refetch clients to get updated data (socket event will also trigger refetch)
            refetchClients();
            // Refetch document history if modal is open
            if (documentHistoryModalVisible && selectedClientForHistory?._id === selectedClient._id) {
                refetchDocumentHistory();
            }
            handleUploadDocModalClose();
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
            <div className='ContentProviderPanel-container'>
                <div className="clients-segregation-header">
                    <h2 className="panel-title">{userFullName} Clients</h2>
                </div>

                <div className="clients-table-container">
                    <Table
                        columns={columns}
                        dataSource={clients}
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
                    title="Upload Document"
                    open={uploadDocModalVisible}
                    onCancel={handleUploadDocModalClose}
                    onOk={() => uploadForm.submit()}
                    okText="Submit"
                    cancelText="Cancel"
                    confirmLoading={isSubmittingAttachment}
                    destroyOnClose
                    className="upload-doc-modal"
                    width={600}
                >
                    <Form
                        form={uploadForm}
                        layout="vertical"
                        onFinish={handleUploadDocSubmit}
                    >
                        <Form.Item
                            label="Enter Link"
                            name="link"
                            rules={[{ required: true, message: 'Please enter a link' }]}
                        >
                            <Input
                                placeholder="Enter document link"
                                allowClear
                            />
                        </Form.Item>

                        <Form.Item
                            label="Enter Message"
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
                            label="Select Month"
                            name="months"
                            rules={[{ required: true, message: 'Please select at least one month' }]}
                        >
                            <Checkbox.Group className="month-checkbox-group">
                                <Row gutter={[8, 8]}>
                                    {monthOptions.map((month) => (
                                        <Col xs={6} sm={6} md={4} key={month.value}>
                                            <Checkbox value={month.value}>
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
                        <Button key="close" onClick={handleDocumentHistoryModalClose}>
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
                            description="This client doesn't have any uploaded documents yet. Upload a document to get started."
                            className="compact"
                        />
                    )}
                </Modal>

                {/* Tasks Section */}

            </div>
        </div>
    );
};

export default ContentProviderPanel;

