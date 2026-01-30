import React, { useEffect, useState, useMemo } from 'react';
import './ClientAndData.css';
import { Table, Tag, Avatar, Tooltip, Modal, Button, Collapse, Input, AutoComplete, Checkbox, Form, Row, Col } from 'antd';
import { useSelector } from 'react-redux';
import { selectTheme } from '../../../../store/slices/themeSlice';
import { selectUser, selectUserId } from '../../../../store/slices/authSlice';
import { getUserName, getUserId } from '../../../../utils/userUtils';
import { useGetClientsByUserIdQuery, useGetAllUsersQuery, useGetClientAttachmentsByUserIdQuery, useAddClientAttachmentMutation, useArchiveClientAttachmentMutation } from '../../../../store/api';
import { useSocket } from '../../../../contexts/SocketContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { BsFileEarmarkText, BsLink45Deg, BsCopy, BsCheck, BsSearch, BsUpload, BsCalendarCheck, BsTrash } from 'react-icons/bs';
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

    // New state for Upload Tracker and Doc Upload
    const [uploadDocModalVisible, setUploadDocModalVisible] = useState(false);
    const [uploadStatusModalVisible, setUploadStatusModalVisible] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [uploadForm] = Form.useForm();
    const [modal, contextHolder] = Modal.useModal();

    const [addClientAttachment, { isLoading: isSubmittingAttachment }] = useAddClientAttachmentMutation();
    const [archiveClientAttachment] = useArchiveClientAttachmentMutation();

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
        // Only show documents that are not archived
        const filteredAttachments = attachments.filter(doc => doc.archived === false || doc.archived === undefined);
        return groupDocumentsByMonth(filteredAttachments);
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

    // Table columns - Client Name, Team Members, and Document History, now with Upload Doc
    const columns = [
        {
            title: 'Client Name',
            dataIndex: 'clientName',
            key: 'clientName',
            width: '30%',
            render: (text) => <strong style={{ color: 'var(--primary-text)' }}>{text}</strong>
        },
        {
            title: 'Team Members',
            key: 'teamMembers',
            width: '30%',
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
        },
        {
            title: 'Upload Doc',
            key: 'uploadDoc',
            width: '20%',
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

    return (
        <div id="ClientAndData" className={`theme-${theme}`}>
            {contextHolder}
            <div className="client-and-data-container">
                <div className="client-and-data-header-row">
                    <h2 className='Capitalize'>{userName} Client & Data</h2>
                    <div className='header-actions-right' style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                                    {clients.length === 0 ? (
                                        <tr>
                                            <td colSpan={monthOptions.length + 2} style={{ textAlign: 'center', padding: '40px' }}>
                                                No clients assigned to track.
                                            </td>
                                        </tr>
                                    ) : (
                                        clients.map(client => (
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

                </div>
            </div>
        </div>
    );
};

export default ClientAndData;

