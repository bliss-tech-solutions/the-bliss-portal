import React, { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import './ClientAndData.css';
import { Table, Tag, Avatar, Tooltip, Modal, Button, Collapse, Input, AutoComplete, Switch, Checkbox, Form, Row, Col, Space, DatePicker, Select } from 'antd';
import { useSelector } from 'react-redux';
import { selectTheme } from '../../../../store/slices/themeSlice';
import { selectUser, selectUserId } from '../../../../store/slices/authSlice';
import { getUserName, getUserId } from '../../../../utils/userUtils';
import { useGetClientsByUserIdQuery, useGetAllUsersQuery, useGetClientAttachmentsByUserIdQuery, useGetClientAttachmentsQuery, useAddClientAttachmentMutation, useArchiveClientAttachmentMutation, useTickDeliverableMutation, useGetDeliverablesSummaryQuery, useGetUploadTrackerQuery } from '../../../../store/api';
import { useSocket } from '../../../../contexts/SocketContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { BsFileEarmarkText, BsLink45Deg, BsCopy, BsCheck, BsSearch, BsUpload, BsCalendarCheck, BsTrash, BsCheckCircle, BsCircle, BsDownload } from 'react-icons/bs';
import dayjs from 'dayjs';
import EmptyState from '../../../CommonComponents/EmptyState/EmptyState';

const ClientAndData = () => {
    const theme = useSelector(selectTheme);
    const user = useSelector(selectUser);
    const userIdFromState = useSelector(selectUserId);
    const userName = getUserName(user);
    const userId = getUserId(user, userIdFromState);
    const isContentProvider = user?.role === 'ContentProvider';
    const isVideoEditor = user?.role === 'user' && user?.position === 'Video Editor';
    const isGraphicsDesigner = user?.role === 'user' && user?.position === 'Graphics Designer';
    const isAdmin = user?.role === 'Admin';
    const isExecution = user?.role === 'Execution';

    const { socket } = useSocket();
    const { showSuccess, showError } = useNotification();

    const [documentHistoryModalVisible, setDocumentHistoryModalVisible] = useState(false);
    const [selectedClientForHistory, setSelectedClientForHistory] = useState(null);
    const [copiedLinkId, setCopiedLinkId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // New state for Upload Tracker and Doc Upload
    const [uploadDocModalVisible, setUploadDocModalVisible] = useState(false);
    const [uploadStatusModalVisible, setUploadStatusModalVisible] = useState(false);
    const [deliverablesModalVisible, setDeliverablesModalVisible] = useState(false);
    const [trackerSearchTerm, setTrackerSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [activeDeliverableClientId, setActiveDeliverableClientId] = useState(null);
    const [uploadForm] = Form.useForm();
    const [modal, contextHolder] = Modal.useModal();
    const [dateRange, setDateRange] = useState([null, null]);

    const { RangePicker } = DatePicker;

    const [addClientAttachment, { isLoading: isSubmittingAttachment }] = useAddClientAttachmentMutation();
    const [archiveClientAttachment] = useArchiveClientAttachmentMutation();
    const [tickDeliverable] = useTickDeliverableMutation();

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

    // Fetch deliverables summary for Execution role
    const { data: deliverablesSummaryData, isLoading: isLoadingSummary, refetch: refetchSummary } = useGetDeliverablesSummaryQuery(userId, {
        skip: !isExecution,
        refetchOnMountOrArgChange: true,
    });

    const deliverablesSummary = deliverablesSummaryData?.data || [];
    const summaryMonth = deliverablesSummaryData?.month || dayjs().format('MMM YYYY');

    // Fetch all tracker data for the logged-in user in one call when modal is open
    const { data: trackerData, isLoading: isLoadingTracker, refetch: refetchTracker } = useGetUploadTrackerQuery(userId, {
        skip: !userId || !uploadStatusModalVisible,
        refetchOnMountOrArgChange: true,
    });

    const trackerList = trackerData?.data || [];

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

    // Unified data source based on role - always use clients which has full monthlyDeliverables
    const tableData = useMemo(() => {
        return clients;
    }, [clients]);

    // Filter clients based on search term
    const filteredTableData = useMemo(() => {
        if (!searchTerm) return tableData;
        const term = searchTerm.toLowerCase();
        return tableData.filter(item =>
            (item.clientName || '').toLowerCase().includes(term)
        );
    }, [tableData, searchTerm]);

    // Sorted and Filtered tracker list
    const filteredTrackerList = useMemo(() => {
        let result = [...trackerList];

        // Apply Search Filter if exists
        if (trackerSearchTerm) {
            const term = trackerSearchTerm.toLowerCase();
            result = result.filter(client =>
                client.clientName?.toLowerCase().includes(term)
            );
        }

        return result;
    }, [trackerList, trackerSearchTerm]);

    const handleExportExcel = async () => {
        try {
            const [start, end] = dateRange;
            let url = `${import.meta.env.VITE_API_BASE_URL || ''}/api/clientmanagement/deliverables/export`;

            const params = new URLSearchParams();
            if (start) params.append('startDate', start.format('YYYY-MM-DD'));
            if (end) params.append('endDate', end.format('YYYY-MM-DD'));
            if (userId) params.append('userId', userId);
            params.append('format', 'json'); // Request JSON format for client-side processing

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch export data');

            const result = await response.json();
            const exportData = result.data || result; // Handle both { data: [] } and [] formats

            if (!exportData || !Array.isArray(exportData) || exportData.length === 0) {
                showError('No data available for the selected range');
                return;
            }

            // The backend is already returning the data with the correct column names:
            // "Client Name", "City", "Onboard Date", "Reels", "Combos", etc.
            // We can directly use this for the Excel sheet.

            // Create XLSX worksheet directly from the API response
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Deliverables Summary");

            // Format columns width for readability
            const colWidths = [
                { wch: 30 }, // Client Name
                ...allDeliverableConfigs.map(() => ({ wch: 15 })) // Dynamic category columns
            ];
            ws['!cols'] = colWidths;

            // Trigger download
            XLSX.writeFile(wb, `Deliverables_${dayjs().format('YYYY-MM-DD')}.xlsx`);
            showSuccess('Excel file generated successfully');
        } catch (error) {
            console.error('Export Error:', error);
            showError('Failed to generate Excel file: ' + error.message);
        }
    };

    // Unified list of all deliverable types across all clients to generate columns
    const allDeliverableConfigs = useMemo(() => {
        const typeMap = new Map();
        clients.forEach(client => {
            (client.deliverableConfigs || []).forEach(config => {
                if (!typeMap.has(config.type)) {
                    typeMap.set(config.type, config.label);
                }
            });
        });

        // Priority order for common types if needed, otherwise alphabetical or default
        const result = Array.from(typeMap.entries()).map(([type, label]) => ({ type, label }));

        // Ensure Reels and Combos come first if they exist
        return result.sort((a, b) => {
            if (a.type === 'reels') return -1;
            if (b.type === 'reels') return 1;
            if (a.type === 'combos') return -1;
            if (b.type === 'combos') return 1;
            return a.label.localeCompare(b.label);
        });
    }, [clients]);

    // Function to check if a user can edit a specific deliverable type
    const canEditDeliverable = (type) => {
        if (isAdmin) return true;
        if (type === 'reels' && isVideoEditor) return true;
        if (type === 'combos' && isGraphicsDesigner) return true;
        // Allow execution users to edit other custom categories?
        if (!['reels', 'combos'].includes(type) && (isExecution || isVideoEditor || isGraphicsDesigner)) return true;
        return false;
    };

    // Real-time client updates via socket
    useEffect(() => {
        if (!socket || !userId) return;

        const handleClientUpdate = () => {
            console.log('✅ Client data changed - refetching...');
            refetchClients();
            if (uploadStatusModalVisible) refetchTracker();
        };

        socket.on('client:created', handleClientUpdate);
        socket.on('client:updated', handleClientUpdate);
        socket.on('client:deleted', handleClientUpdate);
        socket.on('client:attachment:added', handleClientUpdate);
        socket.on('client:change', handleClientUpdate);
        socket.on('client:deliverable:updated', () => {
            console.log('✅ Deliverable updated - refetching...');
            handleClientUpdate();
            if (isExecution) refetchSummary();
        });
        socket.on('client:summary:updated', () => {
            console.log('✅ Client summary updated - refetching...');
            handleClientUpdate();
            if (isExecution) refetchSummary();
        });

        return () => {
            socket.off('client:created', handleClientUpdate);
            socket.off('client:updated', handleClientUpdate);
            socket.off('client:deleted', handleClientUpdate);
            socket.off('client:attachment:added', handleClientUpdate);
            socket.off('client:change', handleClientUpdate);
            socket.off('client:deliverable:updated');
        };
    }, [socket, userId, refetchClients, isExecution, refetchSummary]);

    // For fetching document history
    const { data: userAttachmentsData, isLoading: isLoadingUserAttachments, refetch: refetchUserAttachments } = useGetClientAttachmentsByUserIdQuery(
        { clientId: selectedClientForHistory?._id || selectedClientForHistory?.clientId, userId },
        { skip: !selectedClientForHistory || !documentHistoryModalVisible || isExecution || isAdmin }
    );

    // New hook to fetch ALL attachments for a client (for Execution/Admin roles)
    const { data: allAttachmentsData, isLoading: isLoadingAllAttachments, refetch: refetchAllAttachments } = useGetClientAttachmentsQuery(
        selectedClientForHistory?._id || selectedClientForHistory?.clientId,
        { skip: !selectedClientForHistory || !documentHistoryModalVisible || (!isExecution && !isAdmin) }
    );

    // Decide which data to use based on role (Execution and Admin see all)
    const historyData = (isExecution || isAdmin) ? allAttachmentsData : userAttachmentsData;
    const isLoadingDocumentHistory = (isExecution || isAdmin) ? isLoadingAllAttachments : isLoadingUserAttachments;

    const refetchDocumentHistory = () => {
        if (isExecution || isAdmin) refetchAllAttachments();
        else refetchUserAttachments();
    };

    // Real-time document history updates via socket
    useEffect(() => {
        const clientHistoryId = selectedClientForHistory?._id || selectedClientForHistory?.clientId;
        if (!socket || !clientHistoryId || !documentHistoryModalVisible) return;

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
    }, [socket, selectedClientForHistory?._id, selectedClientForHistory?.clientId, documentHistoryModalVisible, refetchUserAttachments, refetchAllAttachments, isExecution]);

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
            const currentSelectedClientId = selectedClient?._id || selectedClient?.clientId;
            if (!currentSelectedClientId) {
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
                clientId: currentSelectedClientId,
                body: requestBody
            }).unwrap();

            // Close the modal first for better UX
            handleUploadDocModalClose();

            showSuccess('Document uploaded successfully!');
            // Refetch clients to get updated data (socket event will also trigger refetch)
            refetchClients();
            // Refetch document history if modal is open
            const currentHistoryId = selectedClientForHistory?._id || selectedClientForHistory?.clientId;
            if (documentHistoryModalVisible && currentHistoryId === currentSelectedClientId) {
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
                const clientHistoryId = selectedClientForHistory?._id || selectedClientForHistory?.clientId;
                return archiveClientAttachment({
                    clientId: clientHistoryId,
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

    const handleDeliverableTick = async (clientId, type, index = null, status = null) => {
        console.log(`🚀 Toggling deliverable:`, { clientId, type, index, status });
        try {
            const response = await tickDeliverable({ clientId, type, index, status }).unwrap();
            console.log(`✅ Deliverable update success:`, response);
            showSuccess(`Deliverable updated!`);
            // Explicitly refetch to ensure UI updates even if tags take a moment
            refetchClients();
        } catch (error) {
            console.error('❌ Error ticking deliverable:', error);
            showError(error?.data?.message || 'Failed to update deliverable');
        }
    };

    const handleUpdateWorkClick = (record) => {
        setActiveDeliverableClientId(record._id || record.clientId);
        setDeliverablesModalVisible(true);
    };

    const handleDeliverablesModalClose = () => {
        setDeliverablesModalVisible(false);
        setActiveDeliverableClientId(null);
    };

    // Derived active client from live data
    const activeDeliverableClient = useMemo(() => {
        return clients.find(c => (c._id || c.clientId) === activeDeliverableClientId) || null;
    }, [clients, activeDeliverableClientId]);


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
        // Handle different possible response structures
        let attachments = [];
        if (historyData?.data) {
            if (Array.isArray(historyData.data)) {
                attachments = historyData.data;
            } else if (historyData.data.attachments && Array.isArray(historyData.data.attachments)) {
                attachments = historyData.data.attachments;
            }
        } else if (Array.isArray(historyData)) {
            attachments = historyData;
        }

        // Only show documents that are not archived
        const filteredAttachments = attachments.filter(doc => doc.archived === false || doc.archived === undefined);
        return groupDocumentsByMonth(filteredAttachments);
    }, [historyData]);

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
                                {isContentProvider && (
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
                                )}
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
            ...(isExecution ? { width: 200, fixed: 'left' } : {}),
            render: (text, record) => (
                <div>
                    <div style={{ fontWeight: 600, color: 'var(--primary-text)' }}>{text}</div>
                    <div style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>{record.city || ''}</div>
                </div>
            )
        },
        {
            title: 'Deliverables',
            key: 'deliverables',
            width: '20%',
            // No fixed width for user role
            render: (_, record) => (
                <Button
                    className="global-secondary-btn"
                    size="small"
                    onClick={() => handleUpdateWorkClick(record)}
                >
                    Complete Work
                </Button>
            )
        },
        {
            title: 'Team Members',
            key: 'teamMembers',
            width: '15%',
            // Flexible width
            render: (_, record) => {
                // Try to get assignedUsers from record, or fallback to finding the client in the main list
                let assignedUsers = record.assignedUsers || [];
                if (assignedUsers.length === 0) {
                    const clientInData = clients.find(c => (c._id || c.clientId) === (record._id || record.clientId));
                    if (clientInData) {
                        assignedUsers = clientInData.assignedUsers || [];
                    }
                }

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
            width: '15%',
            // Flexible right aligned column
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
            width: '15%',
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
        },
        ...allDeliverableConfigs.map(config => ({
            title: config.label,
            key: config.type,
            width: ['reels', 'combos'].includes(config.type) ? '15%' : 150,
            render: (_, record) => {
                const currentMonth = dayjs().format('MMM YYYY');
                const monthlyDeliverables = record.monthlyDeliverables || [];
                const currentMonthData = monthlyDeliverables.find(md => md.month === currentMonth) ||
                    monthlyDeliverables[monthlyDeliverables.length - 1] ||
                    { categories: [] };

                const category = (currentMonthData.categories || []).find(c => c.type === config.type) || { items: [] };
                const clientConfig = (record.deliverableConfigs || []).find(c => c.type === config.type);
                const total = clientConfig?.targetCount || 0;
                const items = category.items || [];
                const completed = items.filter(i => i.status === true).length;

                if (total === 0) return <span style={{ color: 'var(--secondary-text)', fontSize: '11px' }}>-</span>;

                const percentage = (completed / total) * 100;
                const canEdit = canEditDeliverable(config.type);

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Space size={4}>
                                {Array.from({ length: total }).map((_, idx) => {
                                    const isDone = Boolean(items[idx]?.status);
                                    return (
                                        <span
                                            key={idx}
                                            style={{
                                                fontSize: '14px',
                                                color: isDone ? '#52c41a' : '#8c8c8c',
                                                cursor: canEdit ? 'pointer' : 'default',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            onClick={() => {
                                                if (canEdit) {
                                                    handleDeliverableTick(record._id || record.clientId, config.type, idx, !isDone);
                                                }
                                            }}
                                        >
                                            {isDone ? <BsCheckCircle /> : <BsCircle />}
                                        </span>
                                    );
                                })}
                            </Space>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary-text)' }}>
                                {completed}/{total}
                            </span>
                        </div>
                        <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: percentage === 100 ? '#52c41a' : '#EBB236', transition: 'width 0.3s ease' }} />
                        </div>
                    </div>
                );
            }
        })),
        {
            title: 'Overall Progress',
            key: 'overallProgress',
            width: '10%',
            render: (_, record) => {
                const currentMonth = dayjs().format('MMM YYYY');
                const monthlyDeliverables = record.monthlyDeliverables || [];
                const currentMonthData = monthlyDeliverables.find(md => md.month === currentMonth) ||
                    monthlyDeliverables[monthlyDeliverables.length - 1] ||
                    { categories: [] };

                const categories = currentMonthData.categories || [];
                const configs = record.deliverableConfigs || [];

                let completedItems = 0;
                let totalItems = 0;

                configs.forEach(cfg => {
                    const cat = categories.find(c => c.type === cfg.type) || { items: [] };
                    totalItems += cfg.targetCount || 0;
                    completedItems += (cat.items || []).filter(i => i.status === true).length;
                });

                if (totalItems === 0) return <span style={{ color: 'var(--secondary-text)', fontSize: '11px' }}>-</span>;

                const percentageComplete = Math.round((completedItems / totalItems) * 100);

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary-text)' }}>
                                {completedItems}/{totalItems}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: percentageComplete === 100 ? '#52c41a' : '#EBB236' }}>
                                {percentageComplete}%
                            </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentageComplete}%`, height: '100%', backgroundColor: percentageComplete === 100 ? '#52c41a' : '#EBB236', transition: 'width 0.3s ease' }} />
                        </div>
                    </div>
                );
            }
        }
    ];

    // Conditionally hide columns based on roles
    const tableColumns = columns.filter(col => {
        // 'Upload Doc' only for ContentProvider
        if (col.key === 'uploadDoc') return isContentProvider;

        // 'Deliverables' (Update Work button) is hidden for Execution
        if (col.key === 'deliverables') return !isExecution;

        // Summary metrics (Dynamic Types + Overall Progress) are ONLY for Execution
        if ([...allDeliverableConfigs.map(c => c.type), 'overallProgress', 'reels', 'combos'].includes(col.key)) {
            return isExecution || isAdmin;
        }

        return true;
    });

    return (
        <div id="ClientAndData" className={`theme-${theme}`}>
            {contextHolder}
            <div className="client-and-data-container">

                <div className="client-and-data-header-row">
                    <h2 className='Capitalize'>{userName} Client & Data</h2>
                    <div className='header-actions-right' style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {isExecution && (
                            <>
                                <RangePicker
                                    onChange={(dates) => setDateRange(dates || [null, null])}
                                    style={{ height: '42px', borderRadius: '8px' }}
                                />
                                <Button
                                    icon={<BsDownload />}
                                    onClick={handleExportExcel}
                                    className="global-primary-btn"
                                    style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    Download Excel
                                </Button>
                            </>
                        )}
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

                {/* Original Clients Table */}
                <div className="clients-table-container">
                    <Table
                        columns={tableColumns}
                        dataSource={filteredTableData}
                        loading={isLoadingClients || isLoadingSummary}
                        rowKey={(record) => record._id || record.clientId}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} clients`
                        }}
                        className="clients-table"
                        {...(isExecution ? { scroll: { x: 1400 } } : {})}
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
                                    {isLoadingTracker ? (
                                        <tr>
                                            <td colSpan={monthOptions.length + 2} style={{ textAlign: 'center', padding: '40px' }}>
                                                Loading tracker data...
                                            </td>
                                        </tr>
                                    ) : filteredTrackerList.length === 0 ? (
                                        <tr>
                                            <td colSpan={monthOptions.length + 2} style={{ textAlign: 'center', padding: '40px' }}>
                                                {trackerSearchTerm ? 'No matching clients found.' : 'No clients assigned to track.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTrackerList.map(client => {
                                            const monthlyStatus = client.monthlyStatus || {};
                                            const uploadedCount = Object.values(monthlyStatus).filter(status => status).length;

                                            return (
                                                <tr key={client._id || client.clientId}>
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
                                                        const isUploaded = monthlyStatus[month.shortCode] || false;
                                                        return (
                                                            <td key={month.value} className="tracker-month-cell">
                                                                <Checkbox checked={isUploaded} disabled />
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="tracker-status-summary">
                                                        <Tag color={uploadedCount > 0 ? 'green' : 'orange'}>
                                                            {uploadedCount} / 12
                                                        </Tag>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Modal>

                </div>

                {/* Deliverables Update Modal */}
                <Modal
                    title={`Update Work - ${activeDeliverableClient?.clientName || ''}`}
                    open={deliverablesModalVisible}
                    onCancel={handleDeliverablesModalClose}
                    footer={null}
                    width={800}
                    className="upload-tracker-modal" // Reusing tracker modal styles for consistency
                >
                    {activeDeliverableClient && (() => {
                        const currentMonth = dayjs().format('MMM YYYY');
                        const monthlyDeliverables = activeDeliverableClient.monthlyDeliverables || [];
                        const currentMonthData = monthlyDeliverables.find(md => md.month === currentMonth) ||
                            monthlyDeliverables[monthlyDeliverables.length - 1] ||
                            { categories: [] };

                        const configs = activeDeliverableClient.deliverableConfigs || [];
                        const categories = currentMonthData.categories || [];

                        return (
                            <div className="tracker-table-container">
                                <table className="tracker-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '30%' }}>Category</th>
                                            <th style={{ width: '20%', textAlign: 'center' }}>Progress</th>
                                            <th style={{ textAlign: 'center' }}>Checkboxes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {configs.map((config, idx) => {
                                            const category = categories.find(c => c.type === config.type) || { items: [] };
                                            const total = config.targetCount || 0;
                                            const items = category.items || [];
                                            const completed = items.filter(item => item.status === true).length;

                                            // Determine permissions based on type
                                            const canEdit = isAdmin ||
                                                (config.type === 'reels' && isVideoEditor) ||
                                                (config.type === 'combos' && isGraphicsDesigner) ||
                                                (!['reels', 'combos'].includes(config.type));

                                            return (
                                                <tr key={config.type || idx}>
                                                    <td className="tracker-client-name">
                                                        <strong>{config.label || config.type}</strong>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <Tag color={completed === total && total > 0 ? 'green' : 'blue'}>
                                                            {completed} / {total}
                                                        </Tag>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <Space size={8} wrap justify="center">
                                                            {Array.from({ length: total }).map((_, i) => (
                                                                <Checkbox
                                                                    key={i}
                                                                    checked={Boolean(items[i]?.status)}
                                                                    disabled={!canEdit}
                                                                    onChange={(e) => handleDeliverableTick(activeDeliverableClient._id, config.type, i, e.target.checked)}
                                                                    className="deliverable-checkbox"
                                                                />
                                                            ))}
                                                        </Space>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {configs.length === 0 && (
                                            <tr>
                                                <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: 'var(--secondary-text)' }}>
                                                    No deliverables configured for this client.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })()}
                </Modal>

            </div>
        </div >
    );
};

export default ClientAndData;

