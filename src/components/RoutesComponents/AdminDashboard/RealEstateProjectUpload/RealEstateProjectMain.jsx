import React, { useState } from 'react';
import { Tabs, Table, Tag, Space, Button, Typography, Card, Spin, Empty, Drawer, Form, Input, InputNumber, Select, message, Tooltip, Modal, Radio } from 'antd';
import {
    ProjectOutlined, PlusOutlined, EditOutlined,
    DeleteOutlined, CheckCircleOutlined,
    StopOutlined, ReloadOutlined, HomeOutlined, EnvironmentOutlined,
    DollarOutlined, TeamOutlined, TagOutlined, QuestionCircleOutlined,
    SearchOutlined
} from '@ant-design/icons';
import RealEstateProjectUpload from './RealEstateProjectUpload';
import { useGetAllRealEstateProjectsQuery, useUpdateRealEstateProjectMutation } from '../../../../store/api';
import './RealEstateProjectUpload.css';

const { Title, Text } = Typography;
const { Option } = Select;

const RealEstateProjectMain = () => {
    const { data: projectsResponse, isLoading, isFetching, refetch } = useGetAllRealEstateProjectsQuery();
    const [updateProject, { isLoading: isUpdating }] = useUpdateRealEstateProjectMutation();
    const [editDrawerVisible, setEditDrawerVisible] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [editedFields, setEditedFields] = useState([]);
    const [form] = Form.useForm();

    // Extract projects from response
    const projects = projectsResponse?.data || [];

    // Handle opening edit drawer
    const handleEdit = (record) => {
        setEditingProject(record);
        setEditedFields([]); // Reset edited fields
        form.setFieldsValue({
            projectName: record.projectName,
            tag: record.tag,
            projectLocation: record.projectLocation,
            groupSize: record.groupSize,
            projectPrice: record.projectPrice,
        });
        setEditDrawerVisible(true);
    };

    // Track field changes
    const handleFieldChange = (changedFields, allFields) => {
        const changedFieldNames = Object.keys(changedFields);
        setEditedFields(prev => {
            const newEditedFields = [...new Set([...prev, ...changedFieldNames])];
            return newEditedFields;
        });
    };

    // Handle form submission
    const handleUpdateProject = async (values) => {
        try {
            console.log('Updated Project ID:', editingProject._id);
            console.log('All Values:', values);
            console.log('Edited Fields:', editedFields);

            // Call the update API with all form values
            await updateProject({
                id: editingProject._id,
                body: values
            }).unwrap();

            message.success('Project updated successfully!');

            // Close drawer and reset
            setEditDrawerVisible(false);
            setEditingProject(null);
            setEditedFields([]);
            form.resetFields();
        } catch (error) {
            console.error('Update Error:', error);
            message.error(error?.data?.message || 'Failed to update project');
        }
    };

    // Search state
    const [searchTerm, setSearchTerm] = useState('');

    // Delete Modal State
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);

    const showDeleteConfirm = (record) => {
        setProjectToDelete(record);
        setDeleteModalVisible(true);
    };

    const handleDeleteConfirm = () => {
        // Dummy delete logic
        message.success('Project deleted successfully (Dummy Action)');
        console.log('Deleting project:', projectToDelete?._id);
        setDeleteModalVisible(false);
        setProjectToDelete(null);
    };

    const handleDeleteCancel = () => {
        setDeleteModalVisible(false);
        setProjectToDelete(null);
    };

    // Filter projects based on search
    const filteredProjects = projects.filter(project => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (project.projectName?.toLowerCase() || '').includes(searchLower) ||
            (project.projectLocation?.toLowerCase() || '').includes(searchLower) ||
            (project.tag?.toLowerCase() || '').includes(searchLower)
        );
    });

    const columns = [
        {
            title: 'PROJECT NAME',
            dataIndex: 'projectName',
            key: 'projectName',
            render: (text) => <Text strong style={{ color: 'var(--primary-text)' }}>{text || 'N/A'}</Text>,
        },
        {
            title: 'LOCATION',
            dataIndex: 'projectLocation',
            key: 'projectLocation',
            render: (text) => text || '-',
        },
        {
            title: 'PRICE',
            dataIndex: 'projectPrice',
            key: 'projectPrice',
            render: (text) => text || '-',
        },
        {
            title: 'STATUS',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const color = status === 'Active' ? 'green' : 'default';
                const text = status || 'Inactive';
                return <Tag color={color}>{text}</Tag>;
            },
        },
        {
            title: 'TAG',
            dataIndex: 'tag',
            key: 'tag',
            render: (tag) => tag ? <Tag color="blue">{tag}</Tag> : '-',
        },
        {
            title: 'ACTIONS',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        className="action-icon-btn edit"
                        onClick={() => handleEdit(record)}
                    />
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        className="action-icon-btn delete"
                        onClick={() => showDeleteConfirm(record)}
                    />
                </Space>
            ),
        },
    ];

    const items = [
        {
            key: '1',
            label: (
                <span>
                    <ProjectOutlined />
                    Projects List
                </span>
            ),
            children: (
                <div className="tab-pane-content new-project-panel">
                    <div className="table-header-row">
                        <Space>
                            <Title level={4} style={{ margin: 0 }}>Project Listings</Title>
                        </Space>

                        {/* Search Bar */}


                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <div className="search-bar-container">
                                <Input
                                    placeholder="Search projects..."
                                    prefix={<SearchOutlined style={{ color: 'var(--secondary-text)' }} />}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="styled-input full-width"
                                    style={{ height: '40px' }}
                                />
                            </div>
                            <button
                                type="text"
                                icon={<ReloadOutlined spin={isFetching} />}
                                onClick={refetch}
                                className='global-action-btn'
                            // title="Refresh"
                            >
                                <ReloadOutlined />&nbsp; Refresh
                            </button>
                            <button type="primary" className='global-action-btn'>
                                <PlusOutlined />&nbsp; Export List
                            </button>
                        </div>
                    </div>
                    <Card className="dashboard-table-card" bodyStyle={{ padding: '0px' }}>
                        <Table
                            columns={columns}
                            dataSource={filteredProjects}
                            rowKey="_id"
                            loading={isLoading}
                            pagination={{ pageSize: 8, showSizeChanger: true }}
                            className="custom-styled-table"
                            locale={{
                                emptyText: isLoading ? <Spin tip="Loading Projects..." /> : <Empty description="No Projects Found" />
                            }}
                        />
                    </Card>
                </div>
            ),
        },
        {
            key: '2',
            label: (
                <span>
                    <PlusOutlined />
                    Add New Project
                </span>
            ),
            children: <RealEstateProjectUpload />,
        },
    ];

    return (
        <div className="real-estate-main-container ">
            <div className="dashboard-header-simple">
                <Title level={2}>Real Estate Projects</Title>
                <Typography.Text type="secondary">Manage all your property listings and updates in one place.</Typography.Text>
            </div>

            <Tabs
                defaultActiveKey="1"
                items={items}
                className="custom-dashboard-tabs"
                animated={{ inkBar: true, tabs: true }}
            />

            {/* Edit Drawer */}
            <Drawer
                title={null}
                placement="right"
                width={720}
                onClose={() => {
                    setEditDrawerVisible(false);
                    setEditingProject(null);
                    setEditedFields([]);
                    form.resetFields();
                }}
                open={editDrawerVisible}
                closable={false}
                styles={{ body: { padding: 0 } }}
            >
                <div className="new-project-panel">
                    {/* Top Navigation Bar */}
                    <div className="panel-top-nav">
                        <div className="nav-left">
                            <Title level={4} className="m-0">Edit Project</Title>
                        </div>
                        <Button
                            type="text"
                            onClick={() => {
                                setEditDrawerVisible(false);
                                setEditingProject(null);
                                setEditedFields([]);
                                form.resetFields();
                            }}
                            style={{ fontSize: '20px' }}
                        >
                            ✕
                        </Button>
                    </div>

                    <div className="panel-content">
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleUpdateProject}
                            onFieldsChange={handleFieldChange}
                            autoComplete="off"
                            requiredMark={false}
                            disabled={isUpdating}

                        >
                            {/* Project Name */}
                            <div className="input-row-section" style={{ marginBottom: '24px' }}>
                                <div className="mini-label">
                                    * PROJECT NAME <Tooltip title="The official name of the project"><QuestionCircleOutlined /></Tooltip>
                                </div>
                                <Form.Item
                                    name="projectName"
                                    rules={[{ required: true, message: "Required" }]}
                                >
                                    <Input
                                        prefix={<HomeOutlined />}
                                        placeholder="e.g. Bliss Heights"
                                        className="styled-input full-width"
                                    />
                                </Form.Item>
                            </div>

                            <div className="property-grid">
                                <Form.Item
                                    label={<span className="mini-label">* TAG</span>}
                                    name="tag"
                                    rules={[{ required: true, message: "Required" }]}
                                >
                                    <Select
                                        prefix={<TagOutlined />}
                                        placeholder="Select Tag"
                                        className="styled-select"
                                    >
                                        <Option value="Exclusive deal">Exclusive deal</Option>
                                        <Option value="Limited time offer">Limited time offer</Option>
                                    </Select>
                                </Form.Item>

                                <Form.Item
                                    label={<span className="mini-label">* LOCATION</span>}
                                    name="projectLocation"
                                    rules={[{ required: true, message: "Required" }]}
                                >
                                    <Input
                                        prefix={<EnvironmentOutlined />}
                                        placeholder="e.g. Mumbai, BKC"
                                        className="styled-input"
                                    />
                                </Form.Item>

                                <Form.Item
                                    label={<span className="mini-label">* GROUP SIZE</span>}
                                    name="groupSize"
                                    rules={[{ required: true, message: "Required" }]}
                                >
                                    <InputNumber
                                        prefix={<TeamOutlined />}
                                        placeholder="Size"
                                        className="styled-input-number"
                                        style={{ width: '100%' }}
                                        min={1}
                                    />
                                </Form.Item>
                            </div>

                            {/* Price Section */}
                            <div className="input-row-section" style={{ marginBottom: '20px', marginTop: '20px' }}>
                                <Form.Item
                                    label={<span className="mini-label">* PRICE</span>}
                                    name="projectPrice"
                                    rules={[{ required: true, message: "Required" }]}
                                >
                                    <Input
                                        prefix={<DollarOutlined />}
                                        placeholder="e.g. ₹50 Lakhs onwards"
                                        className="styled-input"
                                    />
                                </Form.Item>
                            </div>

                            {/* Status Section */}
                            <div className="input-row-section" style={{ marginBottom: '20px' }}>
                                <Form.Item
                                    label={<span className="mini-label">* STATUS</span>}
                                    name="status"
                                    initialValue="Active"
                                    rules={[{ required: true, message: "Required" }]}
                                >
                                    <Radio.Group className="status-radio-group">
                                        <Radio.Button value="Active" className="status-radio-btn active">Active</Radio.Button>
                                        <Radio.Button value="Inactive" className="status-radio-btn inactive">Inactive</Radio.Button>
                                    </Radio.Group>
                                </Form.Item>
                            </div>

                            <div className="panel-footer">
                                <Button
                                    className="cancel-footer-btn"
                                    onClick={() => {
                                        setEditDrawerVisible(false);
                                        setEditingProject(null);
                                        setEditedFields([]);
                                        form.resetFields();
                                    }}
                                    disabled={isUpdating}
                                >
                                    Cancel
                                </Button>
                                <div className="footer-right">
                                    <Button
                                        type="primary"
                                        className="continue-footer-btn"
                                        onClick={() => form.submit()}
                                        loading={isUpdating}
                                    >
                                        {isUpdating ? "Updating..." : "Update Project"}
                                    </Button>
                                </div>
                            </div>
                        </Form>
                    </div>
                </div>
            </Drawer>

            {/* Custom Styled Delete Modal */}
            <Modal
                title={null}
                open={deleteModalVisible}
                onCancel={handleDeleteCancel}
                footer={null}
                centered
                className="custom-delete-modal"
                width={400}
                styles={{ content: { borderRadius: '16px', padding: '32px', textAlign: 'center' } }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'rgba(255, 77, 79, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '8px'
                    }}>
                        <DeleteOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
                    </div>

                    <Typography.Title level={4} style={{ margin: 0, color: 'var(--primary-text)' }}>
                        Delete Project?
                    </Typography.Title>

                    <Typography.Text type="secondary" style={{ textAlign: 'center', maxWidth: '280px' }}>
                        Are you sure you want to delete <strong>{projectToDelete?.projectName}</strong>? This action cannot be undone.
                    </Typography.Text>

                    <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '16px' }}>
                        <Button
                            block
                            size="large"
                            onClick={handleDeleteCancel}
                            style={{
                                borderRadius: '8px',
                                height: '44px',
                                fontWeight: 600,
                                border: '1px solid var(--border-color)',
                                color: 'var(--primary-text)',
                                background: 'transparent'
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            block
                            danger
                            type="primary"
                            size="large"
                            onClick={handleDeleteConfirm}
                            style={{
                                borderRadius: '8px',
                                height: '44px',
                                fontWeight: 600,
                                boxShadow: '0 4px 12px rgba(255, 77, 79, 0.2)'
                            }}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default RealEstateProjectMain;
