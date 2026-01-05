import React, { useState, useEffect } from "react";
import './ClientsSegregation.css';
import { Modal, DatePicker, Table, Switch, Tag, Button, Select, Input, Form, Row, Col, Space, ConfigProvider, Upload, Popconfirm } from 'antd';
import { EditOutlined, UploadOutlined, FilePdfOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCreateClientMutation, useGetAllClientsQuery, useUpdateClientMutation, useGetAllUsersQuery, useDeleteClientMutation } from "../../../../store/api";
import { useNotification } from "../../../../contexts/NotificationContext";
import { uploadToCloudinary } from "../../../../utils/cloudinary";
const ClientsSegregation = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [formData, setFormData] = useState({
        clientName: '',
        city: '',
        onboardDate: null,
        status: 'active',
        itsDataReceived: false,
        assignedUsers: [],
        brochureLink: ''
    });

    const [uploadingBrochure, setUploadingBrochure] = useState(false);

    // Debug: Log formData changes
    useEffect(() => {
        console.log('FormData status changed:', formData.status);
    }, [formData.status]);

    const { success, error: showError } = useNotification();
    const [createClient, { isLoading: isCreating }] = useCreateClientMutation();
    const [updateClient, { isLoading: isUpdating }] = useUpdateClientMutation();
    const [deleteClient, { isLoading: isDeleting }] = useDeleteClientMutation();
    const { data: clientsData, isLoading: isLoadingClients, refetch: refetchClients } = useGetAllClientsQuery();
    const { data: allUsersData } = useGetAllUsersQuery();
    const [searchTerm, setSearchTerm] = useState('');

    // Get all users
    const allUsers = allUsersData?.data || [];

    // Get unique positions from all users - Position based
    const getUniquePositions = () => {
        const positionsMap = new Map();

        allUsers.forEach(user => {
            const role = user.role;
            const position = user.position;

            // Map positions based on role and position
            if (role === 'Execution' && position === 'SME') {
                positionsMap.set('All SME', { label: 'All SME', role: 'Execution', position: 'SME' });
            } else if (role === 'user' && position === 'Graphics Designer') {
                positionsMap.set('All Graphics Designer', { label: 'All Graphics Designer', role: 'user', position: 'Graphics Designer' });
            } else if (role === 'user' && position === 'Video Editor') {
                positionsMap.set('All Video Editor', { label: 'All Video Editor', role: 'user', position: 'Video Editor' });
            } else if (role === 'ContentProvider' && position === 'Content Writer') {
                positionsMap.set('All Content Writer', { label: 'All Content Writer', role: 'ContentProvider', position: 'Content Writer' });
            }

            // Add "All schedulers and apis" for all Execution role users
            if (role === 'Execution') {
                positionsMap.set('All schedulers', { label: 'All schedulers', role: 'Execution', isAllExecution: true });
            }
        });

        return Array.from(positionsMap.values());
    };

    const positionOptions = getUniquePositions();

    // Track selected users for each position separately
    const [selectedUsersByPosition, setSelectedUsersByPosition] = useState({});

    // Initialize/sync selectedUsersByPosition when positionOptions are available
    useEffect(() => {
        if (positionOptions.length > 0 && Object.keys(selectedUsersByPosition).length === 0) {
            const initialState = {};
            positionOptions.forEach(pos => {
                initialState[pos.label] = [];
            });
            setSelectedUsersByPosition(initialState);
        }
    }, [positionOptions]);

    // Helper to get reset state
    const getResetSelectedUsers = () => {
        const resetState = {};
        positionOptions.forEach(pos => {
            resetState[pos.label] = [];
        });
        return resetState;
    };

    // Get users for a specific position
    const getUsersForPosition = (positionLabel) => {
        const posOption = positionOptions.find(p => p.label === positionLabel);
        if (!posOption) return [];

        return allUsers.filter(user => {
            if (posOption.isAllExecution) {
                return user.role === 'Execution';
            }
            return user.role === posOption.role && user.position === posOption.position;
        });
    };

    // Handle user selection for a specific position
    const handleUserSelectionForPosition = (positionLabel, selectedUserIds) => {
        const updatedSelection = {
            ...selectedUsersByPosition,
            [positionLabel]: selectedUserIds || []
        };

        setSelectedUsersByPosition(updatedSelection);

        // Update assignedUsers by combining all selected users from all positions
        // Allow same user in multiple positions - use userId + position as unique key
        const allSelectedUsers = [];
        Object.keys(updatedSelection).forEach(pos => {
            const users = getUsersForPosition(pos);
            users.forEach(u => {
                if (updatedSelection[pos].includes(u.userId)) {
                    allSelectedUsers.push({
                        userId: u.userId,
                        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || u.userId,
                        position: pos
                    });
                }
            });
        });

        // Allow same user in different positions - only remove duplicates if same userId AND same position
        const uniqueUsers = Array.from(
            new Map(
                allSelectedUsers.map(u => [`${u.userId}-${u.position}`, u])
            ).values()
        );

        setFormData(prev => ({
            ...prev,
            assignedUsers: uniqueUsers
        }));
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleBrochureUpload = async (info) => {
        const file = info.file.originFileObj || info.file;
        if (!file) return;

        // Set 50MB limit (User requested)
        const isLt50M = file.size / 1024 / 1024 < 50;
        if (!isLt50M) {
            showError('File must be smaller than 50MB!');
            return;
        }

        setUploadingBrochure(true);
        try {
            const result = await uploadToCloudinary(file, 'auto');
            const secureUrl = result.secure_url;
            handleInputChange('brochureLink', secureUrl);
            success('Brochure uploaded successfully!');
        } catch (err) {
            console.error('Brochure upload failed:', err);
            showError('Failed to upload brochure to Cloudinary');
        } finally {
            setUploadingBrochure(false);
        }
    };

    const handleEdit = (client) => {
        setEditingClient(client);
        const assignedUsers = client.assignedUsers || [];

        // Reconstruct selected users by position from assigned users
        const usersByPos = getResetSelectedUsers();

        if (assignedUsers.length > 0) {
            assignedUsers.forEach(au => {
                let positionToUse = au.position;

                // Backward compatibility for the temporary buggy label
                if (positionToUse === 'All schedulers and apis') {
                    positionToUse = 'All schedulers';
                }

                // If position is already stored in assignedUser and exists in our current options, use it
                if (positionToUse && usersByPos[positionToUse]) {
                    usersByPos[positionToUse].push(au.userId);
                } else {
                    // Fallback to finding user in allUsers and matching position (legacy data)
                    const user = allUsers.find(u => u.userId === au.userId);
                    if (user) {
                        const posOption = positionOptions.find(p => {
                            if (p.isAllExecution) {
                                return user.role === 'Execution';
                            }
                            return p.role === user.role && p.position === user.position;
                        });
                        if (posOption && usersByPos[posOption.label]) {
                            usersByPos[posOption.label].push(user.userId);
                        }
                    }
                }
            });
        }

        setSelectedUsersByPosition(usersByPos);

        setFormData({
            clientName: client.clientName || '',
            city: client.city || '',
            onboardDate: client.onboardDate ? dayjs(client.onboardDate).format('YYYY-MM-DD') : null,
            status: client.status || 'active',
            itsDataReceived: client.itsDataReceived || false,
            assignedUsers: assignedUsers,
            brochureLink: client.brochureLink || ''
        });
        setIsOpen(true);
    };

    const handleSubmit = async () => {
        // For edit mode, only validate if fields are provided (all optional)
        // For create mode, validate required fields
        if (!editingClient) {
            if (!formData.clientName.trim()) {
                showError('Please enter client name');
                return;
            }
            if (!formData.city.trim()) {
                showError('Please enter city');
                return;
            }
            if (!formData.onboardDate) {
                showError('Please select onboard date');
                return;
            }
        }

        try {
            const requestBody = {};

            // Only include fields that have values (all optional for update)
            if (formData.clientName.trim()) {
                requestBody.clientName = formData.clientName.trim();
            }
            if (formData.city.trim()) {
                requestBody.city = formData.city.trim();
            }
            if (formData.onboardDate) {
                requestBody.onboardDate = formData.onboardDate;
            }
            if (formData.status) {
                requestBody.status = formData.status;
            }
            if (formData.itsDataReceived !== undefined) {
                requestBody.itsDataReceived = formData.itsDataReceived;
            }
            if (formData.assignedUsers && formData.assignedUsers.length > 0) {
                requestBody.assignedUsers = formData.assignedUsers;
            }

            // Always send brochureLink (even if empty) to allow deletion
            requestBody.brochureLink = formData.brochureLink || '';

            if (editingClient) {
                // Update existing client
                const response = await updateClient({
                    clientId: editingClient._id,
                    body: requestBody
                }).unwrap();

                console.log('Client updated successfully, response:', response);

                // Reset form and close modal
                setFormData({
                    clientName: '',
                    city: '',
                    onboardDate: null,
                    status: 'active',
                    itsDataReceived: false,
                    assignedUsers: [],
                    brochureLink: ''
                });
                setSelectedUsersByPosition(getResetSelectedUsers());
                setEditingClient(null);
                setIsOpen(false);

                // Refetch clients list
                refetchClients();

                // Show success notification
                setTimeout(() => {
                    success('Client updated successfully!');
                }, 300);
            } else {
                // Create new client
                const response = await createClient(requestBody).unwrap();

                console.log('Client created successfully, response:', response);

                // Reset form first
                setFormData({
                    clientName: '',
                    city: '',
                    onboardDate: null,
                    status: 'active',
                    itsDataReceived: false,
                    assignedUsers: [],
                    brochureLink: ''
                });
                setSelectedUsersByPosition(getResetSelectedUsers());

                // Close modal immediately
                setIsOpen(false);

                // Refetch clients list
                refetchClients();

                // Show success notification after modal closes
                setTimeout(() => {
                    console.log('Showing success notification');
                    success('Client created successfully!');
                }, 300);
            }
        } catch (error) {
            console.error('Error saving client:', error);
            const errorMessage = error?.data?.message || error?.message || `Failed to ${editingClient ? 'update' : 'create'} client. Please try again.`;
            showError(errorMessage);
        }
    };

    const handleDelete = async (clientId) => {
        try {
            await deleteClient(clientId).unwrap();
            success('Client deleted successfully!');
            refetchClients();
        } catch (err) {
            console.error('Failed to delete client:', err);
            showError(err?.data?.message || 'Failed to delete client');
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setEditingClient(null);
        setSelectedUsersByPosition(getResetSelectedUsers());
        // Reset form on close
        setFormData({
            clientName: '',
            city: '',
            onboardDate: null,
            status: 'active',
            itsDataReceived: false,
            assignedUsers: [],
            brochureLink: ''
        });
    };


    return (
        <div id="ClientsSegregationContainer" className="theme-light">
            <div className="clients-segregation-header">
                <h2 className="clients-segregation-title">Client Management Panel</h2>
                <Space>
                    <Input.Search
                        placeholder="Search clients..."
                        allowClear
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: 250 }}
                        className="client-search-input"
                    />
                    <Button
                        className="global-secondary-btn"
                        size="large"
                        disabled
                        style={{
                            cursor: 'default',
                            opacity: 1,
                            backgroundColor: 'var(--secondary-bg)',
                            color: 'var(--primary-text)',
                            borderColor: 'var(--border-color)',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        Total Clients: {clientsData?.data?.length || 0}
                    </Button>
                    <Button
                        type="primary"
                        onClick={() => setIsOpen(true)}
                        className="global-action-btn"
                        size="large"
                    >
                        Add Client
                    </Button>
                </Space>
            </div>

            <Modal
                title={editingClient ? 'Edit Client' : 'Add New Client'}
                open={isOpen}
                onCancel={handleClose}
                onOk={handleSubmit}
                maskClosable={false}
                width={800}
                okText={editingClient ? 'Update Client' : 'Add Client'}
                cancelText="Cancel"
                confirmLoading={isCreating || isUpdating}
                className="add-client-modal"
                okButtonProps={{ className: 'global-action-btn' }}
                cancelButtonProps={{ className: 'global-secondary-btn' }}
            >
                <Form layout="vertical">
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12}>
                            <Form.Item label="Client Name" required={!editingClient}>
                                <Input
                                    placeholder="Enter client name"
                                    value={formData.clientName}
                                    onChange={(e) => handleInputChange('clientName', e.target.value)}
                                    className="theme-input"
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item label="City" required={!editingClient}>
                                <Input
                                    placeholder="Enter city"
                                    value={formData.city}
                                    onChange={(e) => handleInputChange('city', e.target.value)}
                                    className="theme-input"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12}>
                            <Form.Item label="Onboard Date" required={!editingClient}>
                                <DatePicker
                                    placeholder="Select onboard date"
                                    value={formData.onboardDate ? dayjs(formData.onboardDate) : null}
                                    onChange={(date) => {
                                        const dateValue = date ? date.format('YYYY-MM-DD') : null;
                                        handleInputChange('onboardDate', dateValue);
                                    }}
                                    style={{ width: '100%' }}
                                    format="YYYY-MM-DD"
                                    className="modern-date-picker"
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item label="Status">
                                <Space>
                                    <Switch
                                        checked={formData.status === 'active'}
                                        onChange={(checked) => {
                                            handleInputChange('status', checked ? 'active' : 'inactive');
                                        }}
                                        checkedChildren="Active"
                                        unCheckedChildren="Inactive"
                                    />
                                    <Tag color={formData.status === 'active' ? 'green' : 'red'}>
                                        {formData.status === 'active' ? 'Active' : 'Non-Active'}
                                    </Tag>
                                </Space>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12}>
                            <Form.Item label="ITS Data Received">
                                <Space>
                                    <Switch
                                        checked={formData.itsDataReceived}
                                        onChange={(checked) => {
                                            handleInputChange('itsDataReceived', checked);
                                        }}
                                        checkedChildren="Yes"
                                        unCheckedChildren="No"
                                    />
                                    <Tag color={formData.itsDataReceived ? 'green' : 'gray'}>
                                        {formData.itsDataReceived ? 'Data Received' : 'Data Not Received'}
                                    </Tag>
                                </Space>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item label="Company Brochure">
                                <Upload
                                    name="brochure"
                                    showUploadList={false}
                                    beforeUpload={() => false}
                                    onChange={handleBrochureUpload}
                                    disabled={uploadingBrochure}
                                >
                                    <Button
                                        icon={<UploadOutlined />}
                                        loading={uploadingBrochure}
                                        className="global-secondary-btn"
                                    >
                                        {uploadingBrochure ? 'Uploading...' : 'Upload Brochure'}
                                    </Button>
                                </Upload>
                                {formData.brochureLink && (
                                    <div style={{ marginTop: 8 }}>
                                        <Space wrap>
                                            <Tag color="blue">
                                                <FilePdfOutlined /> Brochure Attached
                                            </Tag>
                                            <Button
                                                type="link"
                                                size="small"
                                                href={formData.brochureLink}
                                                target="_blank"
                                                style={{ padding: 0 }}
                                            >
                                                View
                                            </Button>
                                            <Button
                                                type="link"
                                                size="small"
                                                danger
                                                icon={<DeleteOutlined />}
                                                onClick={() => handleInputChange('brochureLink', '')}
                                                style={{ padding: 0 }}
                                            >
                                                Remove
                                            </Button>
                                        </Space>
                                    </div>
                                )}
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col xs={24}>
                            <Form.Item label="Assign Users by Position">
                                <Row gutter={[16, 16]}>
                                    {positionOptions.map((position) => {
                                        const usersForPosition = getUsersForPosition(position.label);
                                        const selectedUserIds = selectedUsersByPosition[position.label] || [];

                                        if (usersForPosition.length === 0) return null;

                                        return (
                                            <Col xs={24} sm={12} key={position.label}>
                                                <div className="position-select-item">
                                                    <div className="position-label">{position.label}</div>
                                                    <Select
                                                        mode="multiple"
                                                        placeholder={`Select ${position.label} users`}
                                                        value={selectedUserIds}
                                                        onChange={(selectedIds) => {
                                                            handleUserSelectionForPosition(position.label, selectedIds);
                                                        }}
                                                        style={{ width: '100%' }}
                                                        className="position-users-select"
                                                        showSearch
                                                    >
                                                        {usersForPosition.map((user) => {
                                                            const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.userId;
                                                            return (
                                                                <Select.Option
                                                                    key={user.userId}
                                                                    value={user.userId}
                                                                    label={userName}
                                                                >
                                                                    {userName}
                                                                    {user.email && (
                                                                        <span style={{ color: 'var(--secondary-text)', fontSize: '12px', marginLeft: '8px' }}>
                                                                            ({user.email})
                                                                        </span>
                                                                    )}
                                                                </Select.Option>
                                                            );
                                                        })}
                                                    </Select>
                                                </div>
                                            </Col>
                                        );
                                    })}
                                </Row>
                                <div className="selected-users-info">
                                    {formData.assignedUsers.length > 0
                                        ? `${formData.assignedUsers.length} user(s) selected across all positions`
                                        : 'Select users from each position dropdown above'}
                                </div>
                                {formData.assignedUsers.length > 0 && (
                                    <div className="selected-users-tags">
                                        <div className="selected-users-title">
                                            Selected Users ({formData.assignedUsers.length}):
                                        </div>
                                        <Space wrap>
                                            {formData.assignedUsers.map((user, index) => (
                                                <Tag key={index} color="blue">
                                                    {user.name}
                                                </Tag>
                                            ))}
                                        </Space>
                                    </div>
                                )}
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* Clients Table */}
            <div className="clients-table-container">
                <ConfigProvider
                    getPopupContainer={() => document.body}
                >
                    <Table
                        columns={[
                            {
                                title: 'Client Name',
                                dataIndex: 'clientName',
                                key: 'clientName',
                                width: '25%',
                                render: (text) => <span className="client-name-text">{text}</span>
                            },
                            {
                                title: 'Client Onboard Date',
                                dataIndex: 'onboardDate',
                                key: 'onboardDate',
                                width: '25%',
                                render: (date) => {
                                    if (!date) return <span className="text-secondary">-</span>;
                                    return <span className="text-primary">{dayjs(date).format('MMM DD, YYYY')}</span>;
                                }
                            },
                            {
                                title: 'City',
                                dataIndex: 'city',
                                key: 'city',
                                width: '20%',
                                render: (text) => <span className="client-city-text">{text || '-'}</span>
                            },
                            {
                                title: 'Status',
                                dataIndex: 'status',
                                key: 'status',
                                width: '20%',
                                render: (status, record) => (
                                    <div className="status-cell">
                                        <Switch
                                            checked={status === 'active'}
                                            onChange={(checked) => {
                                                console.log('Status toggle:', record._id, checked ? 'active' : 'inactive');
                                            }}
                                            checkedChildren="Active"
                                            unCheckedChildren="Inactive"
                                        />
                                        <Tag color={status === 'active' ? 'success' : 'error'}>
                                            {status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                                        </Tag>
                                    </div>
                                )
                            },
                            {
                                title: 'Actions',
                                key: 'actions',
                                width: '20%',
                                render: (_, record) => (
                                    <Space size="middle">
                                        <Button
                                            className="global-secondary-btn"
                                            icon={<EditOutlined />}
                                            onClick={() => handleEdit(record)}
                                            size="small"
                                        >
                                            Edit
                                        </Button>
                                        {record.brochureLink && (
                                            <Button
                                                className="global-secondary-btn"
                                                icon={<FilePdfOutlined />}
                                                href={record.brochureLink}
                                                target="_blank"
                                                size="small"
                                                title="View Brochure"
                                            >
                                                Brochure
                                            </Button>
                                        )}
                                        <Popconfirm
                                            title="Delete Client"
                                            description="Are you sure you want to delete this client?"
                                            onConfirm={() => handleDelete(record._id)}
                                            okText="Yes"
                                            cancelText="No"
                                            okButtonProps={{ danger: true, className: 'global-action-btn' }}
                                        >
                                            <Button
                                                danger
                                                type="text"
                                                icon={<DeleteOutlined />}
                                                size="small"
                                                loading={isDeleting}
                                            />
                                        </Popconfirm>
                                    </Space>
                                )
                            }
                        ]}
                        dataSource={(clientsData?.data || []).filter(client =>
                            client.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            client.city?.toLowerCase().includes(searchTerm.toLowerCase())
                        )}
                        loading={isLoadingClients}
                        rowKey="_id"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} clients`,
                            position: ['bottomRight']
                        }}
                        className="clients-table"
                    />
                </ConfigProvider>
            </div>
        </div>
    );
};

export default ClientsSegregation;