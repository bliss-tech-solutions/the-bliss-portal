import React, { useState } from 'react';
import { Tabs, Table, Space, Button, Typography, Card, Spin, Empty, Drawer, Form, Input, InputNumber, Select, message, Tooltip, Modal, Upload, Switch, Popconfirm } from 'antd';
import {
    ProjectOutlined, PlusOutlined, EditOutlined,
    DeleteOutlined, CheckCircleOutlined,
    StopOutlined, ReloadOutlined, HomeOutlined, EnvironmentOutlined,
    TeamOutlined, QuestionCircleOutlined,
    SearchOutlined, PictureOutlined, LayoutOutlined, SlidersOutlined, AimOutlined, BlockOutlined
} from '@ant-design/icons';
import * as FaIcons from "react-icons/fa";
import RealEstateProjectUpload, { iconToFile, buildProjectCardsPayload } from './RealEstateProjectUpload';
import { useGetAllRealEstateProjectsQuery, useUpdateRealEstateProjectMutation, useGetRealEstateAmenitiesQuery, useGetRealEstateBhksQuery, useGetRealEstateProjectTypesQuery } from '../../../../store/api';
import { uploadToCloudinary } from '../../../../utils/cloudinary';
import './RealEstateProjectUpload.css';

const { Title, Text } = Typography;
const { Option } = Select;
const OTHER_PROJECT_TYPE = "__other__";
const DEFAULT_PROJECT_TYPES = ["Plotted Development", "Villa", "Apartment"];
const OTHER_BHK = "__other_bhk__";
const DEFAULT_BHKS = ["Studio", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK", "6 BHK"];

const RealEstateProjectMain = () => {
    const { data: projectsResponse, isLoading, isFetching, refetch } = useGetAllRealEstateProjectsQuery();
    const { data: commonAmenitiesList = [] } = useGetRealEstateAmenitiesQuery();
    const commonAmenities = Array.isArray(commonAmenitiesList) ? commonAmenitiesList : [];
    const { data: projectTypesList = [], refetch: refetchProjectTypes } = useGetRealEstateProjectTypesQuery();
    const { data: bhkList = [], refetch: refetchBhks } = useGetRealEstateBhksQuery();
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
    const normalizeBhks = (list) => {
        const arr = Array.isArray(list) ? list : [];
        return arr
            .map((item) => {
                if (typeof item === "string") return item;
                if (item && typeof item === "object") return item.name || item.title || item.bhk || item.value || "";
                return "";
            })
            .filter(Boolean);
    };
    const bhkOptions = [...new Set([...DEFAULT_BHKS, ...normalizeBhks(bhkList)])];
    const [updateProject, { isLoading: isUpdating }] = useUpdateRealEstateProjectMutation();
    const [togglingStatusId, setTogglingStatusId] = useState(null);
    const [editDrawerVisible, setEditDrawerVisible] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [editedFields, setEditedFields] = useState([]);
    const [form] = Form.useForm();
    // Edit form state (same as upload form)
    const [editFileList, setEditFileList] = useState([]);
    const [editSlideHeroFileList, setEditSlideHeroFileList] = useState([]);
    const [editFloorPlanFileList, setEditFloorPlanFileList] = useState([]);
    const [editAmenities, setEditAmenities] = useState([]);
    const [editProjectCards, setEditProjectCards] = useState([]);
    const [editIconPickerTarget, setEditIconPickerTarget] = useState(null);
    const [editIconSearch, setEditIconSearch] = useState("");
    const [isEditIconUploading, setIsEditIconUploading] = useState(false);
    const [editIconUploadingTarget, setEditIconUploadingTarget] = useState(null);

    const selectedProjectType = Form.useWatch("projectType", form);
    const selectedBhk = Form.useWatch("bhk", form);

    const editIconKeys = Object.keys(FaIcons);
    const filteredEditIconKeys = editIconKeys
        .filter((k) => k.toLowerCase().includes(editIconSearch.trim().toLowerCase()))
        .slice(0, 100);

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
            projectLocation: record.projectLocation,
            groupSize: record.groupSize,
            projectType: record.projectType ?? undefined,
            newProjectType: undefined,
            bhk: record.bhk ?? undefined,
            newBhk: undefined,
            latitude: record.latitude ?? '',
            longitude: record.longitude ?? '',
            status: status === 'active' ? 'active' : 'inactive',
        });
        setEditFileList(urlsToFileList(record.projectImages));
        setEditSlideHeroFileList(urlsToFileList(record.projectSlideHeroImages));
        setEditFloorPlanFileList(urlsToFileList(record.floorPlanImages));
        setEditAmenities((record.amenities || []).map((a) => ({ ...a, enabled: true })));
        const rawCards = record.projectCards;
        const normalizedCards = Array.isArray(rawCards)
            ? rawCards.map((c) => ({
                title: String(c?.title ?? ""),
                value: String(c?.value ?? ""),
                icon: typeof c?.icon === "string" ? c.icon : "",
            }))
            : [];
        setEditProjectCards(normalizedCards);
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

    const updateEditProjectCard = (index, field, value) => {
        setEditProjectCards((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
    };
    const addEditProjectCard = () => {
        setEditProjectCards((prev) => [...prev, { title: '', value: '', icon: '' }]);
    };
    const removeEditProjectCard = (index) => {
        setEditProjectCards((prev) => prev.filter((_, i) => i !== index));
    };
    const handleEditProjectCardIconUpload = async (index, file) => {
        try {
            const result = await uploadToCloudinary(file);
            const url = result?.secure_url || '';
            updateEditProjectCard(index, 'icon', url);
        } catch {
            message.error('Icon upload failed');
        }
        return false;
    };

    const handleEditPickedIconSelect = async (iconName) => {
        if (editIconPickerTarget == null || isEditIconUploading) return;
        const target = editIconPickerTarget;
        try {
            const IconComponent = FaIcons?.[iconName];
            if (!IconComponent) return;

            setIsEditIconUploading(true);
            setEditIconUploadingTarget(target);
            const file = iconToFile(IconComponent, iconName);
            const result = await uploadToCloudinary(file);
            const url = result?.secure_url || '';
            if (!url) throw new Error('Upload failed');

            if (target.kind === 'amenity') {
                updateEditAmenity(target.index, 'icon', url);
            } else {
                updateEditProjectCard(target.index, 'icon', url);
            }
            setEditIconPickerTarget(null);
            setEditIconSearch('');
        } catch (e) {
            message.error('Failed to upload selected icon');
        } finally {
            setIsEditIconUploading(false);
            setEditIconUploadingTarget(null);
        }
    };

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
                newBhk: undefined,
                bhk:
                    values.bhk === OTHER_BHK
                        ? String(values.newBhk ?? "").trim()
                        : String(values.bhk ?? "").trim(),
                projectImages,
                projectSlideHeroImages,
                floorPlanImages,
                amenities: editAmenities.filter((a) => a.enabled).map(({ name, icon }) => ({ name, icon })),
                projectCards: buildProjectCardsPayload(editProjectCards),
            };
            delete body.tag;
            delete body.projectPrice;
            delete body.projectSize;
            delete body.possessionDate;
            delete body.projectDescriptionAndDetails;
            await updateProject({ id: editingProject._id, body }).unwrap();
            message.success('Project updated successfully!');
            refetchProjectTypes();
            refetchBhks();
            setEditDrawerVisible(false);
            setEditingProject(null);
            setEditedFields([]);
            form.resetFields();
            setEditFileList([]);
            setEditSlideHeroFileList([]);
            setEditFloorPlanFileList([]);
            setEditAmenities([]);
            setEditProjectCards([]);
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
            (String(project.projectType || '').toLowerCase()).includes(searchLower) ||
            (String(project.bhk || '').toLowerCase()).includes(searchLower)
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
            title: 'TYPE',
            dataIndex: 'projectType',
            key: 'projectType',
            render: (text) => text || '-',
        },
        {
            title: 'BHK',
            dataIndex: 'bhk',
            key: 'bhk',
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
                    setEditFileList([]);
                    setEditSlideHeroFileList([]);
                    setEditFloorPlanFileList([]);
                    setEditAmenities([]);
                    setEditProjectCards([]);
                    setEditIconPickerTarget(null);
                    setEditIconSearch('');
                }}
                open={editDrawerVisible}
                closable={false}
                styles={{ body: { padding: 0 } }}
            >
                <div className="real-estate-upload-form" style={{ border: 'none', padding: '0 20px 20px' }}>
                    {isUpdating && (
                        <div className="real-estate-upload-form__overlay">
                            <div className="real-estate-upload-form__loader">
                                <div className="real-estate-upload-form__spinner" />
                                <Text strong>Updating project…</Text>
                            </div>
                        </div>
                    )}
                    <div className="real-estate-upload-form__header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={4} className="real-estate-upload-form__title" style={{ margin: 0 }}>Edit Project</Title>
                        <Button type="text" onClick={() => { setEditDrawerVisible(false); setEditingProject(null); setEditedFields([]); form.resetFields(); setEditFileList([]); setEditSlideHeroFileList([]); setEditFloorPlanFileList([]); setEditAmenities([]); setEditProjectCards([]); setEditIconPickerTarget(null); setEditIconSearch(''); }} style={{ fontSize: '20px' }}>✕</Button>
                    </div>
                    <Form form={form} layout="vertical" onFinish={handleUpdateProject} onFieldsChange={handleFieldChange} autoComplete="off" requiredMark={false} disabled={isUpdating}>
                        <Card className="real-estate-upload-form__card" size="small">
                            <Form.Item label={editLabel('Project Name', 'Official name of the project')} name="projectName" rules={[{ required: true, message: 'Required' }]}>
                                <Input prefix={<HomeOutlined />} placeholder="e.g. Sunrise Apartments" className="real-estate-upload-form__input" />
                            </Form.Item>
                            <Form.Item label={editLabel('Location')} name="projectLocation" rules={[{ required: true, message: 'Required' }]}>
                                <Input prefix={<EnvironmentOutlined />} placeholder="e.g. Vadodara, Gujarat" className="real-estate-upload-form__input" />
                            </Form.Item>
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
                                <Form.Item label={editLabel('BHK')} name="bhk">
                                    <Select placeholder="Select BHK (optional)" className="real-estate-upload-form__input" allowClear>
                                        {bhkOptions.map((b) => (
                                            <Option key={b} value={b}>{b}</Option>
                                        ))}
                                        {form.getFieldValue('bhk') && !bhkOptions.includes(form.getFieldValue('bhk')) && form.getFieldValue('bhk') !== OTHER_BHK ? (
                                            <Option key={`current-${form.getFieldValue('bhk')}`} value={form.getFieldValue('bhk')}>{form.getFieldValue('bhk')}</Option>
                                        ) : null}
                                        <Option value={OTHER_BHK}>Other (Add new)</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item
                                    label={editLabel('New BHK')}
                                    name="newBhk"
                                    rules={[{ required: selectedBhk === OTHER_BHK, message: 'Please enter a new BHK value' }]}
                                    hidden={selectedBhk !== OTHER_BHK}
                                >
                                    <Input placeholder="Type new BHK (e.g. 7 BHK)" className="real-estate-upload-form__input" />
                                </Form.Item>
                            </div>
                            <div className="real-estate-upload-form__row real-estate-upload-form__row--2">
                                <Form.Item label={editLabel('Group Size')} name="groupSize" rules={[{ required: true, message: 'Required' }]}>
                                    <InputNumber prefix={<TeamOutlined />} placeholder="50" min={1} className="real-estate-upload-form__input real-estate-upload-form__input-number" style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item label={editLabel('Status')} name="status" valuePropName="checked" getValueFromEvent={(checked) => (checked ? 'active' : 'inactive')} getValueProps={(v) => ({ checked: v === 'active' })}>
                                    <Switch checkedChildren="Active" unCheckedChildren="Inactive" className="real-estate-upload-form__status-switch" />
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

                        <Card className="real-estate-upload-form__card" size="small" title="Project highlight cards">
                            <p className="real-estate-upload-form__dimension-hint">
                                Short stats for the project detail page (e.g. carpet area, possession). Upload or pick an icon; add as many cards as you need.
                            </p>
                            <div className="real-estate-upload-form__project-cards">
                                {editProjectCards.map((card, index) => (
                                    <div key={index} className="real-estate-upload-form__project-card">
                                        <div className="real-estate-upload-form__project-card-head">
                                            <span className="real-estate-upload-form__project-card-badge">
                                                <BlockOutlined />
                                                Card {index + 1}
                                            </span>
                                            <Button type="text" danger size="small" icon={<DeleteOutlined />} className="real-estate-upload-form__project-card-remove" onClick={() => removeEditProjectCard(index)} disabled={isUpdating} />
                                        </div>
                                        <div className="real-estate-upload-form__project-card-preview">
                                            {card.icon && typeof card.icon === 'string' && card.icon.startsWith('http') ? (
                                                <img src={card.icon} alt="" />
                                            ) : (
                                                <BlockOutlined className="real-estate-upload-form__project-card-preview-placeholder" />
                                            )}
                                            <div className="real-estate-upload-form__project-card-preview-text">
                                                <span className="real-estate-upload-form__project-card-preview-title">{(card.title || '').trim() || 'Title'}</span>
                                                <span className="real-estate-upload-form__project-card-preview-value">{(card.value || '').trim() || 'Value'}</span>
                                            </div>
                                        </div>
                                        <div className="real-estate-upload-form__project-card-fields">
                                            <Input placeholder="Title (e.g. Carpet Area)" value={card.title} onChange={(e) => updateEditProjectCard(index, 'title', e.target.value)} className="real-estate-upload-form__input" disabled={isUpdating} />
                                            <Input placeholder="Value (e.g. 1200 sq ft)" value={card.value} onChange={(e) => updateEditProjectCard(index, 'value', e.target.value)} className="real-estate-upload-form__input" disabled={isUpdating} />
                                            <div className="real-estate-upload-form__project-card-icon-row">
                                                <Upload accept="image/*" showUploadList={false} beforeUpload={(file) => { handleEditProjectCardIconUpload(index, file); return false; }} className="real-estate-upload-form__amenity-icon-upload" disabled={isUpdating}>
                                                    <div
                                                        className="real-estate-upload-form__project-card-icon-box"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (isEditIconUploading || isUpdating) return;
                                                            setEditIconPickerTarget({ kind: 'projectCard', index });
                                                        }}
                                                    >
                                                        {editIconUploadingTarget?.kind === 'projectCard' && editIconUploadingTarget.index === index ? <Spin size="small" /> : null}
                                                        {card.icon && typeof card.icon === 'string' && card.icon.startsWith('http') ? <img src={card.icon} alt="" /> : <PlusOutlined />}
                                                    </div>
                                                </Upload>
                                                <Text type="secondary" className="real-estate-upload-form__project-card-icon-hint">Icon: image upload or search</Text>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button type="dashed" icon={<PlusOutlined />} onClick={addEditProjectCard} disabled={isUpdating} className="real-estate-upload-form__add-project-card" block>
                                Add project card
                            </Button>
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
                                            <div
                                                className="real-estate-upload-form__amenity-icon-box"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (isEditIconUploading) return;
                                                    setEditIconPickerTarget({ kind: 'amenity', index });
                                                }}
                                            >
                                                {editIconUploadingTarget?.kind === 'amenity' && editIconUploadingTarget.index === index ? <Spin size="small" /> : null}
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

                        <Modal
                            title="Search icon"
                            open={editIconPickerTarget != null}
                            onCancel={() => {
                                if (isEditIconUploading) return;
                                setEditIconPickerTarget(null);
                                setEditIconSearch('');
                            }}
                            footer={null}
                            width={720}
                            destroyOnClose
                        >
                            <Input
                                value={editIconSearch}
                                onChange={(e) => setEditIconSearch(e.target.value)}
                                placeholder="Search icons (e.g. wifi, home, car...)"
                                className="real-estate-upload-form__input"
                                disabled={isEditIconUploading}
                            />
                            {isEditIconUploading ? (
                                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                                    <Spin size="small" />
                                    <span style={{ fontSize: 12, color: "var(--secondary-text)" }}>
                                        Uploading icon…
                                    </span>
                                </div>
                            ) : null}
                            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 10 }}>
                                {filteredEditIconKeys.map((key) => {
                                    const Icon = FaIcons[key];
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => handleEditPickedIconSelect(key)}
                                            disabled={isEditIconUploading}
                                            style={{
                                                border: "1px solid var(--border-color)",
                                                background: "var(--input-bg)",
                                                borderRadius: 8,
                                                height: 44,
                                                cursor: isEditIconUploading ? "not-allowed" : "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                opacity: isEditIconUploading ? 0.6 : 1,
                                            }}
                                            title={key}
                                        >
                                            {Icon ? <Icon /> : null}
                                        </button>
                                    );
                                })}
                            </div>
                        </Modal>

                        <div className="real-estate-upload-form__footer">
                            <Button onClick={() => { setEditDrawerVisible(false); setEditingProject(null); setEditedFields([]); form.resetFields(); setEditFileList([]); setEditSlideHeroFileList([]); setEditFloorPlanFileList([]); setEditAmenities([]); setEditProjectCards([]); setEditIconPickerTarget(null); setEditIconSearch(''); }} disabled={isUpdating}>Cancel</Button>
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
