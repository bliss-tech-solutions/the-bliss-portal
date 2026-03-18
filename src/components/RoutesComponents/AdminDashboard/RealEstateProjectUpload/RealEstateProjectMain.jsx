import React, { useState } from 'react';
import { Tabs, Table, Tag, Space, Button, Typography, Card, Spin, Empty, Drawer, Form, Input, InputNumber, Select, message, Tooltip, Modal, Upload, Switch, Popconfirm } from 'antd';
import {
    ProjectOutlined, PlusOutlined, EditOutlined,
    DeleteOutlined, CheckCircleOutlined,
    StopOutlined, ReloadOutlined, HomeOutlined, EnvironmentOutlined,
    DollarOutlined, TeamOutlined, TagOutlined, QuestionCircleOutlined,
    SearchOutlined, PictureOutlined, LayoutOutlined, SlidersOutlined, AimOutlined
} from '@ant-design/icons';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.bubble.css';
import RealEstateProjectUpload from './RealEstateProjectUpload';
import { useGetAllRealEstateProjectsQuery, useUpdateRealEstateProjectMutation, useGetRealEstateAmenitiesQuery, useGetRealEstateProjectTypesQuery } from '../../../../store/api';
import { uploadToCloudinary } from '../../../../utils/cloudinary';
import './RealEstateProjectUpload.css';

const { Title, Text } = Typography;
const { Option } = Select;
const OTHER_PROJECT_TYPE = "__other__";
const DEFAULT_PROJECT_TYPES = ["Plotted Development", "Villa", "Apartment"];

const RealEstateProjectMain = () => {
    const { data: projectsResponse, isLoading, isFetching, refetch } = useGetAllRealEstateProjectsQuery();
    const { data: commonAmenitiesList = [] } = useGetRealEstateAmenitiesQuery();
    const commonAmenities = Array.isArray(commonAmenitiesList) ? commonAmenitiesList : [];
    const { data: projectTypesList = [], refetch: refetchProjectTypes } = useGetRealEstateProjectTypesQuery();
    const normalizeProjectTypes = (list) => {
        const arr = Array.isArray(list) ? list : [];
        return arr
            .map((item) => {
                if (typeof item === "string") return item;
                if (item && typeof item === "object") return item.name || item.title || item.type || "";
                return "";
            })
            .filter(Boolean);
    };
    const projectTypes = [
        ...new Set([...DEFAULT_PROJECT_TYPES, ...normalizeProjectTypes(projectTypesList)]),
    ];
    const [updateProject, { isLoading: isUpdating }] = useUpdateRealEstateProjectMutation();
    const [togglingStatusId, setTogglingStatusId] = useState(null);
    const [editDrawerVisible, setEditDrawerVisible] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [editedFields, setEditedFields] = useState([]);
    const [form] = Form.useForm();
    // Edit form state (same as upload form)
    const [editDescription, setEditDescription] = useState('');
    const [editFileList, setEditFileList] = useState([]);
    const [editSlideHeroFileList, setEditSlideHeroFileList] = useState([]);
    const [editFloorPlanFileList, setEditFloorPlanFileList] = useState([]);
    const [editAmenities, setEditAmenities] = useState([]);

    const selectedProjectType = Form.useWatch("projectType", form);

    // Extract projects from response
    const projects = projectsResponse?.data || [];

    // Helpers: existing URLs to file list shape
    const urlsToFileList = (urls) => (urls || []).map((url, i) => ({
        uid: `existing-${i}-${url}`,
        name: `image-${i}`,
        status: 'done',
        url,
        previewUrl: url,
    }));

    // Handle opening edit drawer
    const handleEdit = (record) => {
        setEditingProject(record);
        setEditedFields([]);
        const status = (record.status || 'active').toLowerCase();
        form.setFieldsValue({
            projectName: record.projectName,
            tag: record.tag,
            projectLocation: record.projectLocation,
            groupSize: record.groupSize,
            projectPrice: record.projectPrice,
            projectType: record.projectType ?? undefined,
            newProjectType: undefined,
            projectSize: record.projectSize ?? '',
            latitude: record.latitude ?? '',
            longitude: record.longitude ?? '',
            possessionDate: record.possessionDate ?? '',
            status: status === 'active' ? 'active' : 'inactive',
        });
        setEditDescription(record.projectDescriptionAndDetails || '');
        setEditFileList(urlsToFileList(record.projectImages));
        setEditSlideHeroFileList(urlsToFileList(record.projectSlideHeroImages));
        setEditFloorPlanFileList(urlsToFileList(record.floorPlanImages));
        setEditAmenities((record.amenities || []).map((a) => ({ ...a, enabled: true })));
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

    // Edit form: upload handlers (same pattern as RealEstateProjectUpload)
    const handleEditImageUpload = async (file) => {
        const uid = Date.now() + Math.random();
        const previewUrl = URL.createObjectURL(file);
        setEditFileList((prev) => [...prev, { uid, name: file.name, status: 'uploading', previewUrl }]);
        try {
            const result = await uploadToCloudinary(file);
            const imageUrl = result?.secure_url;
            if (imageUrl) {
                setEditFileList((prev) => prev.map((f) => (f.uid === uid ? { ...f, status: 'done', url: imageUrl } : f)));
            } else throw new Error('Upload failed');
        } catch (err) {
            setEditFileList((prev) => prev.map((f) => (f.uid === uid ? { ...f, status: 'error' } : f)));
            message.error(`Failed to upload ${file.name}`);
        }
    };
    const handleEditSlideHeroUpload = async (file) => {
        const uid = Date.now() + Math.random();
        const previewUrl = URL.createObjectURL(file);
        setEditSlideHeroFileList((prev) => [...prev, { uid, name: file.name, status: 'uploading', previewUrl }]);
        try {
            const result = await uploadToCloudinary(file);
            const imageUrl = result?.secure_url;
            if (imageUrl) {
                setEditSlideHeroFileList((prev) => prev.map((f) => (f.uid === uid ? { ...f, status: 'done', url: imageUrl } : f)));
            } else throw new Error('Upload failed');
        } catch (err) {
            setEditSlideHeroFileList((prev) => prev.map((f) => (f.uid === uid ? { ...f, status: 'error' } : f)));
            message.error(`Failed to upload ${file.name}`);
        }
    };
    const handleEditFloorPlanUpload = async (file) => {
        const uid = Date.now() + Math.random();
        const previewUrl = URL.createObjectURL(file);
        setEditFloorPlanFileList((prev) => [...prev, { uid, name: file.name, status: 'uploading', previewUrl }]);
        try {
            const result = await uploadToCloudinary(file);
            const imageUrl = result?.secure_url;
            if (imageUrl) {
                setEditFloorPlanFileList((prev) => prev.map((f) => (f.uid === uid ? { ...f, status: 'done', url: imageUrl } : f)));
            } else throw new Error('Upload failed');
        } catch (err) {
            setEditFloorPlanFileList((prev) => prev.map((f) => (f.uid === uid ? { ...f, status: 'error' } : f)));
            message.error(`Failed to upload ${file.name}`);
        }
    };
    const updateEditAmenity = (index, field, value) => {
        setEditAmenities((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
    };
    const addCommonAmenityToEdit = (item) => {
        const name = item?.name || item?.title || '';
        const icon = item?.icon || '';
        if (!name) return;
        const alreadyAdded = editAmenities.some((a) => (a.name || '').trim().toLowerCase() === name.trim().toLowerCase());
        if (alreadyAdded) return;
        setEditAmenities((prev) => [...prev, { name, icon, enabled: true }]);
    };
    const handleEditAmenityIconUpload = async (index, file) => {
        try {
            const result = await uploadToCloudinary(file);
            const url = result?.secure_url || '';
            updateEditAmenity(index, 'icon', url);
        } catch {
            message.error('Icon upload failed');
        }
        return false;
    };

    const quillModules = {
        toolbar: [[{ header: [1, 2, 3, false] }], ['bold', 'italic', 'underline', 'strike'], [{ color: [] }, { background: [] }], [{ list: 'ordered' }, { list: 'bullet' }], ['link'], ['clean']],
    };
    const quillFormats = ['header', 'bold', 'italic', 'underline', 'strike', 'color', 'background', 'list', 'bullet', 'link'];

    const editLabel = (text, tip) => (
        <span className="real-estate-upload-form__label">
            {text}
            {tip && <Tooltip title={tip}><QuestionCircleOutlined className="real-estate-upload-form__label-icon" /></Tooltip>}
        </span>
    );

    // Handle form submission
    const handleUpdateProject = async (values) => {
        try {
            const stillUploading = editFileList.some((f) => f.status === 'uploading') ||
                editSlideHeroFileList.some((f) => f.status === 'uploading') ||
                editFloorPlanFileList.some((f) => f.status === 'uploading');
            if (stillUploading) {
                message.warning('Please wait for all images to finish uploading.');
                return;
            }
            const projectImages = editFileList.filter((f) => f.status === 'done').map((f) => f.url);
            const projectSlideHeroImages = editSlideHeroFileList.filter((f) => f.status === 'done').map((f) => f.url);
            const floorPlanImages = editFloorPlanFileList.filter((f) => f.status === 'done').map((f) => f.url);
            const body = {
                ...values,
                newProjectType: undefined,
                projectType:
                    values.projectType === OTHER_PROJECT_TYPE
                        ? String(values.newProjectType ?? "").trim()
                        : String(values.projectType ?? "").trim(),
                possessionDate: values.possessionDate?.trim?.() ?? '',
                projectDescriptionAndDetails: editDescription,
                projectImages,
                projectSlideHeroImages,
                floorPlanImages,
                amenities: editAmenities.filter((a) => a.enabled).map(({ name, icon }) => ({ name, icon })),
            };
            await updateProject({ id: editingProject._id, body }).unwrap();
            message.success('Project updated successfully!');
            refetchProjectTypes();
            setEditDrawerVisible(false);
            setEditingProject(null);
            setEditedFields([]);
            form.resetFields();
            setEditDescription('');
            setEditFileList([]);
            setEditSlideHeroFileList([]);
            setEditFloorPlanFileList([]);
            setEditAmenities([]);
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

    const handleToggleStatus = async (record) => {
        const current = (record.status || '').toLowerCase();
        const newStatus = current === 'active' ? 'inactive' : 'active';
        setTogglingStatusId(record._id);
        try {
            await updateProject({ id: record._id, body: { status: newStatus } }).unwrap();
            message.success(`Status set to ${newStatus === 'active' ? 'Active' : 'Inactive'}`);
        } catch (err) {
            message.error(err?.data?.message || 'Failed to update status');
        } finally {
            setTogglingStatusId(null);
        }
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
            render: (status, record) => {
                const isActive = (status || '').toLowerCase() === 'active';
                const newStatusLabel = isActive ? 'Inactive' : 'Active';
                const isToggling = togglingStatusId === record._id;
                return (
                    <Popconfirm
                        title={`Set status to ${newStatusLabel}?`}
                        onConfirm={() => handleToggleStatus(record)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Switch
                            size="small"
                            checked={isActive}
                            checkedChildren="Active"
                            unCheckedChildren="Inactive"
                            loading={isToggling}
                            disabled={isToggling}
                        />
                    </Popconfirm>
                );
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

            {/* Edit Drawer - same fields as upload form */}
            <Drawer
                title={null}
                placement="right"
                width={720}
                onClose={() => {
                    setEditDrawerVisible(false);
                    setEditingProject(null);
                    setEditedFields([]);
                    form.resetFields();
                    setEditDescription('');
                    setEditFileList([]);
                    setEditSlideHeroFileList([]);
                    setEditFloorPlanFileList([]);
                    setEditAmenities([]);
                }}
                open={editDrawerVisible}
                closable={false}
                styles={{ body: { padding: 0 } }}
            >
                <div className="real-estate-upload-form" style={{ border: 'none', padding: '0 20px 20px' }}>
                    <div className="real-estate-upload-form__header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={4} className="real-estate-upload-form__title" style={{ margin: 0 }}>Edit Project</Title>
                        <Button type="text" onClick={() => { setEditDrawerVisible(false); setEditingProject(null); setEditedFields([]); form.resetFields(); setEditDescription(''); setEditFileList([]); setEditSlideHeroFileList([]); setEditFloorPlanFileList([]); setEditAmenities([]); }} style={{ fontSize: '20px' }}>✕</Button>
                    </div>
                    <Form form={form} layout="vertical" onFinish={handleUpdateProject} onFieldsChange={handleFieldChange} autoComplete="off" requiredMark={false} disabled={isUpdating}>
                        <Card className="real-estate-upload-form__card" size="small">
                            <Form.Item label={editLabel('Project Name', 'Official name of the project')} name="projectName" rules={[{ required: true, message: 'Required' }]}>
                                <Input prefix={<HomeOutlined />} placeholder="e.g. Sunrise Apartments" className="real-estate-upload-form__input" />
                            </Form.Item>
                            <div className="real-estate-upload-form__row real-estate-upload-form__row--3">
                                <Form.Item label={editLabel('Tag')} name="tag" rules={[{ required: true, message: 'Required' }]}>
                                    <Select placeholder="Select tag" className="real-estate-upload-form__input">
                                        <Option value="Exclusive deal">Exclusive deal</Option>
                                        <Option value="Limited time offer">Limited time offer</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item label={editLabel('Location')} name="projectLocation" rules={[{ required: true, message: 'Required' }]}>
                                    <Input prefix={<EnvironmentOutlined />} placeholder="e.g. Mumbai, Maharashtra" className="real-estate-upload-form__input" />
                                </Form.Item>
                                <Form.Item label={editLabel('Price')} name="projectPrice" rules={[{ required: true, message: 'Required' }]}>
                                    <Input prefix={<DollarOutlined />} placeholder="e.g. 1.2 Cr" className="real-estate-upload-form__input" />
                                </Form.Item>
                            </div>
                            <div className="real-estate-upload-form__row real-estate-upload-form__row--2">
                                <Form.Item label={editLabel('Project Type')} name="projectType">
                                    <Select placeholder="Select project type (optional)" className="real-estate-upload-form__input" allowClear>
                                        {[...new Set(projectTypes.filter(Boolean))].map((t) => (
                                            <Option key={t} value={t}>{t}</Option>
                                        ))}
                                        {form.getFieldValue('projectType') && !projectTypes.includes(form.getFieldValue('projectType')) && form.getFieldValue('projectType') !== OTHER_PROJECT_TYPE ? (
                                            <Option key={`current-${form.getFieldValue('projectType')}`} value={form.getFieldValue('projectType')}>{form.getFieldValue('projectType')}</Option>
                                        ) : null}
                                        <Option value={OTHER_PROJECT_TYPE}>Other (Add new)</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item
                                    label={editLabel('New Project Type')}
                                    name="newProjectType"
                                    rules={[{ required: selectedProjectType === OTHER_PROJECT_TYPE, message: 'Please enter a new project type' }]}
                                    hidden={selectedProjectType !== OTHER_PROJECT_TYPE}
                                >
                                    <Input placeholder="Type new project type (e.g. Farm House)" className="real-estate-upload-form__input" />
                                </Form.Item>
                            </div>
                            <div className="real-estate-upload-form__row real-estate-upload-form__row--2">
                                <Form.Item label={editLabel('Group Size')} name="groupSize" rules={[{ required: true, message: 'Required' }]}>
                                    <InputNumber prefix={<TeamOutlined />} placeholder="50" min={1} className="real-estate-upload-form__input real-estate-upload-form__input-number" style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item label={editLabel('Project Size')} name="projectSize">
                                    <Input placeholder="e.g. 1200 sq ft" className="real-estate-upload-form__input" />
                                </Form.Item>
                            </div>
                            <div className="real-estate-upload-form__row real-estate-upload-form__row--2">
                                <Form.Item label={editLabel('Latitude')} name="latitude">
                                    <Input prefix={<AimOutlined />} placeholder="19.0760" className="real-estate-upload-form__input" />
                                </Form.Item>
                                <Form.Item label={editLabel('Longitude')} name="longitude">
                                    <Input prefix={<AimOutlined />} placeholder="72.8777" className="real-estate-upload-form__input" />
                                </Form.Item>
                            </div>
                            <div className="real-estate-upload-form__row real-estate-upload-form__row--2">
                                <Form.Item label={editLabel('Possession Date')} name="possessionDate">
                                    <Input placeholder="e.g. Dec 2025" className="real-estate-upload-form__input" />
                                </Form.Item>
                                <Form.Item label={editLabel('Status')} name="status" valuePropName="checked" getValueFromEvent={(checked) => (checked ? 'active' : 'inactive')} getValueProps={(v) => ({ checked: v === 'active' })}>
                                <Switch checkedChildren="Active" unCheckedChildren="Inactive" className="real-estate-upload-form__status-switch" />
                                </Form.Item>
                            </div>
                        </Card>

                        <Card className="real-estate-upload-form__card" size="small" title="Project Description & Details">
                            <div className="real-estate-upload-form__quill-wrap">
                                <ReactQuill theme="bubble" value={editDescription} onChange={setEditDescription} modules={quillModules} formats={quillFormats} placeholder="Describe the project..." readOnly={isUpdating} />
                            </div>
                        </Card>

                        <Card className="real-estate-upload-form__card" size="small" title="Project Images">
                            <p className="real-estate-upload-form__dimension-hint">Project gallery: <strong>560 × 440</strong> px • same for all</p>
                            <div className="real-estate-upload-form__images">
                                <Upload.Dragger multiple accept="image/*" showUploadList={false} beforeUpload={(file) => { handleEditImageUpload(file); return false; }} disabled={isUpdating} className="real-estate-upload-form__dropzone">
                                    <PictureOutlined className="real-estate-upload-form__dropzone-icon" />
                                    <p className="real-estate-upload-form__dropzone-text">Drop images or <span>Browse</span></p>
                                </Upload.Dragger>
                                <div className="real-estate-upload-form__preview-grid">
                                    {editFileList.map((file) => (
                                        <div key={file.uid} className={`real-estate-upload-form__preview-card real-estate-upload-form__preview-card--${file.status}`}>
                                            <img src={file.previewUrl} alt="" />
                                            <span className="real-estate-upload-form__preview-status">{file.status === 'uploading' ? 'Uploading...' : file.status === 'done' ? 'Done' : 'Failed'}</span>
                                            <Button type="text" danger size="small" icon={<DeleteOutlined />} className="real-estate-upload-form__preview-remove" onClick={() => setEditFileList((prev) => prev.filter((f) => f.uid !== file.uid))} disabled={isUpdating} />
                                        </div>
                                    ))}
                                    {editFileList.length === 0 && <div className="real-estate-upload-form__preview-empty">No images uploaded</div>}
                                </div>
                            </div>
                        </Card>

                        <Card className="real-estate-upload-form__card" size="small" title="Slider Images (project open)">
                            <p className="real-estate-upload-form__dimension-hint">Hero (project open): <strong>1920 × 1080</strong> px • 16:9</p>
                            <div className="real-estate-upload-form__images">
                                <Upload.Dragger multiple accept="image/*" showUploadList={false} beforeUpload={(file) => { handleEditSlideHeroUpload(file); return false; }} disabled={isUpdating} className="real-estate-upload-form__dropzone">
                                    <SlidersOutlined className="real-estate-upload-form__dropzone-icon" />
                                    <p className="real-estate-upload-form__dropzone-text">Drop slider images or <span>Browse</span></p>
                                </Upload.Dragger>
                                <div className="real-estate-upload-form__preview-grid">
                                    {editSlideHeroFileList.map((file) => (
                                        <div key={file.uid} className={`real-estate-upload-form__preview-card real-estate-upload-form__preview-card--${file.status}`}>
                                            <img src={file.previewUrl} alt="" />
                                            <span className="real-estate-upload-form__preview-status">{file.status === 'uploading' ? 'Uploading...' : file.status === 'done' ? 'Done' : 'Failed'}</span>
                                            <Button type="text" danger size="small" icon={<DeleteOutlined />} className="real-estate-upload-form__preview-remove" onClick={() => setEditSlideHeroFileList((prev) => prev.filter((f) => f.uid !== file.uid))} disabled={isUpdating} />
                                        </div>
                                    ))}
                                    {editSlideHeroFileList.length === 0 && <div className="real-estate-upload-form__preview-empty">No slider images uploaded</div>}
                                </div>
                            </div>
                        </Card>

                        <Card className="real-estate-upload-form__card" size="small" title="Floor Plan Images">
                            <p className="real-estate-upload-form__dimension-hint">Recommended: <strong>800 × 480</strong> px • ~5:4 aspect ratio • full plan</p>
                            <div className="real-estate-upload-form__images">
                                <Upload.Dragger multiple accept="image/*" showUploadList={false} beforeUpload={(file) => { handleEditFloorPlanUpload(file); return false; }} disabled={isUpdating} className="real-estate-upload-form__dropzone">
                                    <LayoutOutlined className="real-estate-upload-form__dropzone-icon" />
                                    <p className="real-estate-upload-form__dropzone-text">Drop floor plans or <span>Browse</span></p>
                                </Upload.Dragger>
                                <div className="real-estate-upload-form__preview-grid">
                                    {editFloorPlanFileList.map((file) => (
                                        <div key={file.uid} className={`real-estate-upload-form__preview-card real-estate-upload-form__preview-card--${file.status}`}>
                                            <img src={file.previewUrl} alt="" />
                                            <span className="real-estate-upload-form__preview-status">{file.status === 'uploading' ? 'Uploading...' : file.status === 'done' ? 'Done' : 'Failed'}</span>
                                            <Button type="text" danger size="small" icon={<DeleteOutlined />} className="real-estate-upload-form__preview-remove" onClick={() => setEditFloorPlanFileList((prev) => prev.filter((f) => f.uid !== file.uid))} disabled={isUpdating} />
                                        </div>
                                    ))}
                                    {editFloorPlanFileList.length === 0 && <div className="real-estate-upload-form__preview-empty">No floor plan images uploaded</div>}
                                </div>
                            </div>
                        </Card>

                        <Card className="real-estate-upload-form__card" size="small" title="Amenities">
                            {commonAmenities.length > 0 && (
                                <div className="real-estate-upload-form__common-amenities">
                                    <span className="real-estate-upload-form__common-amenities-label">Add from common:</span>
                                    <div className="real-estate-upload-form__common-amenities-tags">
                                        {commonAmenities.map((item) => {
                                            const name = item?.name || item?.title || '';
                                            const icon = item?.icon;
                                            const alreadyAdded = editAmenities.some((a) => (a.name || '').trim().toLowerCase() === name.trim().toLowerCase());
                                            return (
                                                <button
                                                    key={item?._id || name || Math.random()}
                                                    type="button"
                                                    className="real-estate-upload-form__common-amenity-tag"
                                                    onClick={() => addCommonAmenityToEdit(item)}
                                                    disabled={alreadyAdded || !name}
                                                    title={alreadyAdded ? 'Already added' : `Add ${name}`}
                                                >
                                                    {typeof icon === 'string' && icon.startsWith('http') ? (
                                                        <img src={icon} alt="" className="real-estate-upload-form__common-amenity-tag-icon" />
                                                    ) : null}
                                                    <span>{name}</span>
                                                    {alreadyAdded ? ' ✓' : ' +'}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <div className="real-estate-upload-form__amenities">
                                {editAmenities.map((amenity, index) => (
                                    <div key={index} className="real-estate-upload-form__amenity-card">
                                        <div className="real-estate-upload-form__amenity-card-head">
                                            <Switch checked={amenity.enabled} onChange={(checked) => updateEditAmenity(index, 'enabled', checked)} size="small" />
                                            <Button type="text" danger size="small" icon={<DeleteOutlined />} className="real-estate-upload-form__amenity-delete" onClick={() => setEditAmenities((prev) => prev.filter((_, i) => i !== index))} />
                                        </div>
                                        <Upload accept="image/*" showUploadList={false} beforeUpload={(file) => { handleEditAmenityIconUpload(index, file); return false; }} className="real-estate-upload-form__amenity-icon-upload">
                                            <div className="real-estate-upload-form__amenity-icon-box">
                                                {amenity.icon ? (typeof amenity.icon === 'string' && amenity.icon.startsWith('http') ? <img src={amenity.icon} alt="" className="real-estate-upload-form__amenity-icon-img" /> : <span className="real-estate-upload-form__amenity-icon-text">{amenity.icon}</span>) : <PlusOutlined />}
                                            </div>
                                        </Upload>
                                        <Input placeholder="Amenity name" value={amenity.name} onChange={(e) => updateEditAmenity(index, 'name', e.target.value)} className="real-estate-upload-form__input real-estate-upload-form__amenity-name" />
                                    </div>
                                ))}
                                <button type="button" onClick={() => setEditAmenities((prev) => [...prev, { name: '', icon: '', enabled: true }])} className="real-estate-upload-form__add-amenity">
                                    <PlusOutlined /><span>Add custom amenity</span>
                                </button>
                            </div>
                        </Card>

                        <div className="real-estate-upload-form__footer">
                            <Button onClick={() => { setEditDrawerVisible(false); setEditingProject(null); setEditedFields([]); form.resetFields(); setEditDescription(''); setEditFileList([]); setEditSlideHeroFileList([]); setEditFloorPlanFileList([]); setEditAmenities([]); }} disabled={isUpdating}>Cancel</Button>
                            <Space>
                                <Button type="primary" htmlType="submit" loading={isUpdating}>{isUpdating ? 'Updating...' : 'Update Project'}</Button>
                            </Space>
                        </div>
                    </Form>
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
