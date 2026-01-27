import React, { useState } from "react";
import { Form, Input, InputNumber, DatePicker, Select, Upload, Button, message, Typography, Tooltip } from "antd";
import {
    UploadOutlined, HomeOutlined, EnvironmentOutlined,
    DollarOutlined, TeamOutlined,
    TagOutlined, EyeOutlined, QuestionCircleOutlined,
    PictureOutlined
} from "@ant-design/icons";
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.bubble.css';
import { useCreateRealEstateProjectMutation } from "../../../../store/api";
import { uploadToCloudinary } from "../../../../utils/cloudinary";
import "./RealEstateProjectUpload.css";

const { Title, Text } = Typography;
const { Option } = Select;

const RealEstateProjectUpload = () => {
    const [form] = Form.useForm();
    const [description, setDescription] = useState('Write something amazing...');
    const [fileList, setFileList] = useState([]); // Array of { uid, name, status, url, previewUrl }
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishStatus, setPublishStatus] = useState(""); // "Uploading Images...", "Creating Project..."

    const [createProject] = useCreateRealEstateProjectMutation();

    const onFinish = async (values) => {
        try {
            // Check if any images are still uploading
            const stillUploading = fileList.some(file => file.status === 'uploading');
            if (stillUploading) {
                message.warning("Please wait for all images to finish uploading.");
                return;
            }

            // Collect only successfully uploaded image URLs
            const uploadedImageUrls = fileList
                .filter(file => file.status === 'done')
                .map(file => file.url);

            if (uploadedImageUrls.length === 0 && fileList.length > 0) {
                message.error("No images were successfully uploaded. Please try again.");
                return;
            }

            setIsPublishing(true);
            setPublishStatus("Creating Project...");

            const payload = {
                ...values,
                projectDescriptionAndDetails: description,
                projectImages: uploadedImageUrls
            };

            await createProject(payload).unwrap();

            message.success("Real Estate Project Published Successfully!");
            form.resetFields();
            setFileList([]);
            setDescription("");
        } catch (error) {
            console.error("Publish Error:", error);
            message.error(error?.data?.message || "Failed to publish project. Please try again.");
        } finally {
            setIsPublishing(false);
            setPublishStatus("");
        }
    };

    const handleFileUpload = async (file) => {
        const uid = Date.now() + Math.random();
        const previewUrl = URL.createObjectURL(file);

        // Add placeholder to fileList
        const newFile = {
            uid,
            name: file.name,
            status: 'uploading',
            previewUrl
        };
        setFileList(prev => [...prev, newFile]);

        try {
            const result = await uploadToCloudinary(file);
            const imageUrl = result.secure_url;

            if (imageUrl) {
                setFileList(prev => prev.map(f =>
                    f.uid === uid ? { ...f, status: 'done', url: imageUrl } : f
                ));
            } else {
                throw new Error("Upload failed");
            }
        } catch (error) {
            console.error("Cloudinary Upload Error:", error);
            setFileList(prev => prev.map(f =>
                f.uid === uid ? { ...f, status: 'error' } : f
            ));
            message.error(`Failed to upload ${file.name}`);
        }
    };

    const uploadProps = {
        onRemove: (file) => {
            const newFileList = fileList.filter(f => f.uid !== (file.uid || file));
            setFileList(newFileList);
        },
        beforeUpload: (file) => {
            handleFileUpload(file);
            return false;
        },
        fileList,
        multiple: true,
        accept: "image/*"
    };

    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link'],
            ['clean']
        ],
    };

    const quillFormats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list', 'bullet',
        'link'
    ];

    return (
        <div className="new-project-panel">
            {/* Global Publishing Overlay */}
            {isPublishing && (
                <div className="publishing-overlay">
                    <div className="loader-box">
                        <div className="spinner"></div>
                        <Text className="mt-2" strong>{publishStatus}</Text>
                    </div>
                </div>
            )}

            {/* Top Navigation Bar */}
            <div className="panel-top-nav">
                <div className="nav-left">
                    <Title level={4} className="m-0">Create New Project</Title>
                </div>
                <button
                    type="button"
                    className="global-action-btn"
                    onClick={() => message.info("Preview Mode Enabled")}
                    disabled={isPublishing}
                >
                    <EyeOutlined />&nbsp;Preview
                </button>
            </div>

            <div className="panel-content">
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    autoComplete="off"
                    requiredMark={false}
                    disabled={isPublishing}
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
                            <Input prefix={<HomeOutlined />} placeholder="e.g. Bliss Heights" className="styled-input full-width" />
                        </Form.Item>
                    </div>

                    <div className="property-grid">
                        <Form.Item
                            label={<span className="mini-label">* TAG</span>}
                            name="tag"
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <Select prefix={<TagOutlined />} placeholder="Select Tag" className="styled-select">
                                <Option value="Exclusive deal">Exclusive deal</Option>
                                <Option value="Limited time offer">Limited time offer</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label={<span className="mini-label">* LOCATION</span>}
                            name="projectLocation"
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <Input prefix={<EnvironmentOutlined />} placeholder="e.g. Mumbai, BKC" className="styled-input" />
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

                        <Form.Item
                            label={<span className="mini-label">* PRICE</span>}
                            name="projectPrice"
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <Input prefix={<DollarOutlined />} placeholder="e.g. ₹50 Lakhs onwards" className="styled-input" />
                        </Form.Item>

                        <Form.Item
                            label={<span className="mini-label">* STATUS</span>}
                            name="status"
                            initialValue="Active"
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <Select placeholder="Select Status" className="styled-select">
                                <Option value="Active">Active</Option>
                                <Option value="Inactive">Inactive</Option>
                            </Select>
                        </Form.Item>
                    </div>

                    <div className="description-section">
                        <div className="mini-label">PROJECT DESCRIPTION & DETAILS</div>
                        <div className="quill-wrapper">
                            <ReactQuill
                                theme="bubble"
                                value={description}
                                onChange={setDescription}
                                modules={quillModules}
                                formats={quillFormats}
                                placeholder="Describe the project features and benefits..."
                                readOnly={isPublishing}
                            />
                        </div>
                    </div>

                    <div className="upload-container-split" style={{ marginTop: '20px' }}>
                        <div className="mini-label">* PROJECT IMAGES <Tooltip title="Main project gallery"><QuestionCircleOutlined /></Tooltip></div>
                        <div className="upload-flex-box">
                            <Upload.Dragger {...uploadProps} className="media-dragger-compact" showUploadList={false} disabled={isPublishing}>
                                <div className="dragger-content-compact">
                                    <p className="dragger-icon-small"><PictureOutlined /></p>
                                    <p className="dragger-text-small">Drop images or <span className="blue-link">Browse</span></p>
                                </div>
                            </Upload.Dragger>

                            <div className="preview-grid-side">
                                {fileList.map((file) => (
                                    <div key={file.uid} className={`preview-card ${file.status}`}>
                                        <img
                                            src={file.previewUrl}
                                            alt="preview"
                                        />
                                        {file.status === 'uploading' && (
                                            <div className="card-upload-overlay">
                                                <div className="shimmer"></div>
                                            </div>
                                        )}
                                        {file.status === 'error' && (
                                            <div className="card-error-overlay">
                                                <Typography.Text type="danger" style={{ fontSize: '10px' }}>Fail</Typography.Text>
                                            </div>
                                        )}
                                        <div className="preview-overlay">
                                            <Button
                                                type="text"
                                                danger
                                                icon={<UploadOutlined rotate={45} style={{ transform: 'rotate(0)' }} />}
                                                className="delete-icon-btn"
                                                onClick={() => {
                                                    setFileList(prev => prev.filter(f => f.uid !== file.uid));
                                                }}
                                                disabled={isPublishing}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {fileList.length === 0 && (
                                    <div className="empty-preview-state">
                                        No images uploaded
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="panel-footer">
                        <Button
                            className="cancel-footer-btn"
                            onClick={() => form.resetFields()}
                            disabled={isPublishing}
                        >
                            Reset Form
                        </Button>
                        <div className="footer-right">
                            <Button
                                className="draft-footer-btn"
                                onClick={() => message.info("Saved as Draft")}
                                disabled={isPublishing}
                            >
                                Save as Draft
                            </Button>
                            <Button
                                type="primary"
                                className="continue-footer-btn"
                                onClick={() => form.submit()}
                                loading={isPublishing}
                            >
                                {isPublishing ? "Publishing..." : "Publish Project"}
                            </Button>
                        </div>
                    </div>
                </Form>
            </div>
        </div>
    );
};

export default RealEstateProjectUpload;