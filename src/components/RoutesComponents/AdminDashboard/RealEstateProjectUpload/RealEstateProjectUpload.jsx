import React, { useState } from "react";
import {
    Form,
    Input,
    InputNumber,
    Select,
    Upload,
    Button,
    message,
    Typography,
    Tooltip,
    Switch,
    Card,
    Space,
    Modal,
    Spin,
} from "antd";
import {
    PlusOutlined,
    DeleteOutlined,
    HomeOutlined,
    EnvironmentOutlined,
    DollarOutlined,
    TeamOutlined,
    TagOutlined,
    PictureOutlined,
    AimOutlined,
    QuestionCircleOutlined,
    LayoutOutlined,
    SlidersOutlined,
} from "@ant-design/icons";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.bubble.css";
import * as FaIcons from "react-icons/fa";
import { renderToString } from "react-dom/server";
import { useCreateRealEstateProjectMutation, useGetRealEstateAmenitiesQuery, useGetRealEstateProjectTypesQuery } from "../../../../store/api";
import { uploadToCloudinary } from "../../../../utils/cloudinary";
import "./RealEstateProjectUpload.css";

const { Title, Text } = Typography;
const { Option } = Select;
const OTHER_PROJECT_TYPE = "__other__";
const DEFAULT_PROJECT_TYPES = ["Plotted Development", "Villa", "Apartment"];

export const iconToFile = (IconComponent, iconName = "icon") => {
    const svgString = renderToString(<IconComponent />);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    return new File([blob], `${iconName}.svg`, { type: "image/svg+xml" });
};

// Dummy data matching req.body (for later dynamic implementation)
const DUMMY_INITIAL = {
    projectName: "Sunrise Apartments",
    projectLocation: "Mumbai, Maharashtra",
    projectPrice: "1.2 Cr",
    projectType: undefined,
    newProjectType: undefined,
    projectSize: "",
    groupSize: 50,
    tag: "Exclusive deal",
    latitude: "19.0760",
    longitude: "72.8777",
    status: "active",
    possessionDate: "",
    projectDescriptionAndDetails:
        "Luxury 2BHK and 3BHK apartments with modern amenities.",
    amenities: [
        { name: "Swimming Pool", icon: "pool", enabled: true },
        { name: "Gym", icon: "gym", enabled: true },
        { name: "Parking", icon: "parking", enabled: true },
    ],
};

const RealEstateProjectUpload = () => {
    const [form] = Form.useForm();
    const [description, setDescription] = useState(
        DUMMY_INITIAL.projectDescriptionAndDetails
    );
    const [fileList, setFileList] = useState([]);
    const [slideHeroFileList, setSlideHeroFileList] = useState([]);
    const [floorPlanFileList, setFloorPlanFileList] = useState([]);
    const [amenities, setAmenities] = useState(DUMMY_INITIAL.amenities);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishStatus, setPublishStatus] = useState("");
    const [iconPickerOpenForIndex, setIconPickerOpenForIndex] = useState(null);
    const [iconSearch, setIconSearch] = useState("");
    const [isIconUploading, setIsIconUploading] = useState(false);
    const [iconUploadingIndex, setIconUploadingIndex] = useState(null);

    const [createProject] = useCreateRealEstateProjectMutation();
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
    const selectedProjectType = Form.useWatch("projectType", form);

    const iconKeys = Object.keys(FaIcons);
    const filteredIconKeys = iconKeys
        .filter((k) => k.toLowerCase().includes(iconSearch.trim().toLowerCase()))
        .slice(0, 100);

    const onFinish = async (values) => {
        try {
            const stillUploading = fileList.some((f) => f.status === "uploading");
            const stillUploadingSlideHero = slideHeroFileList.some((f) => f.status === "uploading");
            const stillUploadingFloorPlan = floorPlanFileList.some((f) => f.status === "uploading");
            if (stillUploading || stillUploadingSlideHero || stillUploadingFloorPlan) {
                message.warning("Please wait for all images to finish uploading.");
                return;
            }

            const uploadedImageUrls = fileList
                .filter((f) => f.status === "done")
                .map((f) => f.url);
            const uploadedSlideHeroUrls = slideHeroFileList
                .filter((f) => f.status === "done")
                .map((f) => f.url);
            const uploadedFloorPlanUrls = floorPlanFileList
                .filter((f) => f.status === "done")
                .map((f) => f.url);

            const payload = {
                ...values,
                // projectType: dropdown value or custom input when "Other" selected
                newProjectType: undefined,
                projectType:
                    values.projectType === OTHER_PROJECT_TYPE
                        ? String(values.newProjectType ?? "").trim()
                        : String(values.projectType ?? "").trim(),
                possessionDate: values.possessionDate?.trim?.() ?? '',
                projectDescriptionAndDetails: description,
                projectImages: uploadedImageUrls,
                projectSlideHeroImages: uploadedSlideHeroUrls,
                floorPlanImages: uploadedFloorPlanUrls,
                amenities: amenities
                    .filter((a) => a.enabled)
                    .map(({ name, icon }) => ({ name, icon })),
            };

            setIsPublishing(true);
            setPublishStatus("Creating Project...");
            await createProject(payload).unwrap();
            refetchProjectTypes();

            message.success("Real Estate Project Published Successfully!");
            form.resetFields();
            setFileList([]);
            setSlideHeroFileList([]);
            setFloorPlanFileList([]);
            setDescription("");
            setAmenities(DUMMY_INITIAL.amenities.map((a) => ({ ...a })));
        } catch (error) {
            console.error("Publish Error:", error);
            message.error(
                error?.data?.message || "Failed to publish project. Please try again."
            );
        } finally {
            setIsPublishing(false);
            setPublishStatus("");
        }
    };

    const handleImageUpload = async (file) => {
        const uid = Date.now() + Math.random();
        const previewUrl = URL.createObjectURL(file);
        const newFile = {
            uid,
            name: file.name,
            status: "uploading",
            previewUrl,
        };
        setFileList((prev) => [...prev, newFile]);

        try {
            const result = await uploadToCloudinary(file);
            const imageUrl = result?.secure_url;
            if (imageUrl) {
                setFileList((prev) =>
                    prev.map((f) =>
                        f.uid === uid ? { ...f, status: "done", url: imageUrl } : f
                    )
                );
            } else throw new Error("Upload failed");
        } catch (err) {
            setFileList((prev) =>
                prev.map((f) => (f.uid === uid ? { ...f, status: "error" } : f))
            );
            message.error(`Failed to upload ${file.name}`);
        }
    };

    const removeImage = (uid) => {
        setFileList((prev) => prev.filter((f) => f.uid !== uid));
    };

    const handleFloorPlanUpload = async (file) => {
        const uid = Date.now() + Math.random();
        const previewUrl = URL.createObjectURL(file);
        const newFile = {
            uid,
            name: file.name,
            status: "uploading",
            previewUrl,
        };
        setFloorPlanFileList((prev) => [...prev, newFile]);

        try {
            const result = await uploadToCloudinary(file);
            const imageUrl = result?.secure_url;
            if (imageUrl) {
                setFloorPlanFileList((prev) =>
                    prev.map((f) =>
                        f.uid === uid ? { ...f, status: "done", url: imageUrl } : f
                    )
                );
            } else throw new Error("Upload failed");
        } catch (err) {
            setFloorPlanFileList((prev) =>
                prev.map((f) => (f.uid === uid ? { ...f, status: "error" } : f))
            );
            message.error(`Failed to upload ${file.name}`);
        }
    };

    const removeFloorPlanImage = (uid) => {
        setFloorPlanFileList((prev) => prev.filter((f) => f.uid !== uid));
    };

    const handleSlideHeroUpload = async (file) => {
        const uid = Date.now() + Math.random();
        const previewUrl = URL.createObjectURL(file);
        const newFile = {
            uid,
            name: file.name,
            status: "uploading",
            previewUrl,
        };
        setSlideHeroFileList((prev) => [...prev, newFile]);

        try {
            const result = await uploadToCloudinary(file);
            const imageUrl = result?.secure_url;
            if (imageUrl) {
                setSlideHeroFileList((prev) =>
                    prev.map((f) =>
                        f.uid === uid ? { ...f, status: "done", url: imageUrl } : f
                    )
                );
            } else throw new Error("Upload failed");
        } catch (err) {
            setSlideHeroFileList((prev) =>
                prev.map((f) => (f.uid === uid ? { ...f, status: "error" } : f))
            );
            message.error(`Failed to upload ${file.name}`);
        }
    };

    const removeSlideHeroImage = (uid) => {
        setSlideHeroFileList((prev) => prev.filter((f) => f.uid !== uid));
    };

    const addAmenity = () => {
        setAmenities((prev) => [
            ...prev,
            { name: "", icon: "", enabled: true },
        ]);
    };

    const addCommonAmenity = (item) => {
        const name = item?.name || item?.title || "";
        const icon = item?.icon || "";
        if (!name) return;
        const alreadyAdded = amenities.some((a) => (a.name || "").trim().toLowerCase() === name.trim().toLowerCase());
        if (alreadyAdded) return;
        setAmenities((prev) => [...prev, { name, icon, enabled: true }]);
    };

    const updateAmenity = (index, field, value) => {
        setAmenities((prev) =>
            prev.map((a, i) =>
                i === index ? { ...a, [field]: value } : a
            )
        );
    };

    const removeAmenity = (index) => {
        setAmenities((prev) => prev.filter((_, i) => i !== index));
    };

    const handleAmenityIconUpload = async (index, file) => {
        try {
            const result = await uploadToCloudinary(file);
            const url = result?.secure_url || "";
            updateAmenity(index, "icon", url);
        } catch {
            message.error("Icon upload failed");
        }
        return false;
    };

    const handleAmenityIconSelect = async (index, iconName) => {
        if (isIconUploading) return;
        try {
            const IconComponent = FaIcons?.[iconName];
            if (!IconComponent) return;

            // Convert icon SVG -> File -> Upload -> URL
            setIsIconUploading(true);
            setIconUploadingIndex(index);
            const file = iconToFile(IconComponent, iconName);
            const result = await uploadToCloudinary(file);
            const url = result?.secure_url || "";
            if (!url) throw new Error("Upload failed");

            updateAmenity(index, "icon", url);
            setIconPickerOpenForIndex(null);
            setIconSearch("");
        } catch (e) {
            message.error("Failed to upload selected icon");
        } finally {
            setIsIconUploading(false);
            setIconUploadingIndex(null);
        }
    };

    const quillModules = {
        toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ color: [] }, { background: [] }],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link"],
            ["clean"],
        ],
    };
    const quillFormats = [
        "header",
        "bold", "italic", "underline", "strike",
        "color", "background",
        "list", "bullet",
        "link",
    ];

    const label = (text, tip) => (
        <span className="real-estate-upload-form__label">
            {text}
            {tip && (
                <Tooltip title={tip}>
                    <QuestionCircleOutlined className="real-estate-upload-form__label-icon" />
                </Tooltip>
            )}
        </span>
    );

    return (
        <div className="real-estate-upload-form">
            {isPublishing && (
                <div className="real-estate-upload-form__overlay">
                    <div className="real-estate-upload-form__loader">
                        <div className="real-estate-upload-form__spinner" />
                        <Text strong>{publishStatus}</Text>
                    </div>
                </div>
            )}

            <div className="real-estate-upload-form__header">
                <Title level={4} className="real-estate-upload-form__title">
                    Create New Project
                </Title>
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                autoComplete="off"
                requiredMark={false}
                disabled={isPublishing}
                initialValues={{
                    projectName: DUMMY_INITIAL.projectName,
                    projectLocation: DUMMY_INITIAL.projectLocation,
                    projectPrice: DUMMY_INITIAL.projectPrice,
                    projectSize: DUMMY_INITIAL.projectSize,
                    groupSize: DUMMY_INITIAL.groupSize,
                    tag: DUMMY_INITIAL.tag,
                    latitude: DUMMY_INITIAL.latitude,
                    longitude: DUMMY_INITIAL.longitude,
                    status: DUMMY_INITIAL.status,
                    possessionDate: DUMMY_INITIAL.possessionDate,
                }}
            >
                <Card className="real-estate-upload-form__card" size="small">
                    <Form.Item
                        label={label("Project Name", "Official name of the project")}
                        name="projectName"
                        rules={[{ required: true, message: "Required" }]}
                    >
                        <Input
                            prefix={<HomeOutlined />}
                            placeholder="e.g. Sunrise Apartments"
                            className="real-estate-upload-form__input"
                        />
                    </Form.Item>

                    <div className="real-estate-upload-form__row real-estate-upload-form__row--3">
                        <Form.Item
                            label={label("Tag")}
                            name="tag"
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <Select
                                placeholder="Select tag"
                                className="real-estate-upload-form__input"
                            >
                                <Option value="Exclusive deal">Exclusive deal</Option>
                                <Option value="Limited time offer">Limited time offer</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            label={label("Location")}
                            name="projectLocation"
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <Input
                                prefix={<EnvironmentOutlined />}
                                placeholder="e.g. Mumbai, Maharashtra"
                                className="real-estate-upload-form__input"
                            />
                        </Form.Item>
                        <Form.Item
                            label={label("Price")}
                            name="projectPrice"
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <Input
                                prefix={<DollarOutlined />}
                                placeholder="e.g. 1.2 Cr"
                                className="real-estate-upload-form__input"
                            />
                        </Form.Item>
                    </div>

                    <div className="real-estate-upload-form__row real-estate-upload-form__row--2">
                        <Form.Item label={label("Project Type")} name="projectType">
                            <Select
                                placeholder="Select project type (optional)"
                                className="real-estate-upload-form__input"
                                allowClear
                            >
                                {[...new Set(projectTypes.filter(Boolean))].map((t) => (
                                    <Option key={t} value={t}>
                                        {t}
                                    </Option>
                                ))}
                                <Option value={OTHER_PROJECT_TYPE}>Other (Add new)</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            label={label("New Project Type")}
                            name="newProjectType"
                            rules={[
                                {
                                    required: selectedProjectType === OTHER_PROJECT_TYPE,
                                    message: "Please enter a new project type",
                                },
                            ]}
                            hidden={selectedProjectType !== OTHER_PROJECT_TYPE}
                        >
                            <Input
                                placeholder="Type new project type (e.g. Farm House)"
                                className="real-estate-upload-form__input"
                            />
                        </Form.Item>
                    </div>

                    <div className="real-estate-upload-form__row real-estate-upload-form__row--2">
                        <Form.Item
                            label={label("Group Size")}
                            name="groupSize"
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <InputNumber
                                prefix={<TeamOutlined />}
                                placeholder="50"
                                min={1}
                                className="real-estate-upload-form__input real-estate-upload-form__input-number"
                                style={{ width: "100%" }}
                            />
                        </Form.Item>
                        <Form.Item
                            label={label("Project Size")}
                            name="projectSize"
                        >
                            <Input
                                placeholder="e.g. 1200 sq ft"
                                className="real-estate-upload-form__input"
                            />
                        </Form.Item>
                    </div>
                    <div className="real-estate-upload-form__row real-estate-upload-form__row--2">
                        <Form.Item
                            label={label("Latitude")}
                            name="latitude"
                        >
                            <Input
                                prefix={<AimOutlined />}
                                placeholder="19.0760"
                                className="real-estate-upload-form__input"
                            />
                        </Form.Item>
                        <Form.Item
                            label={label("Longitude")}
                            name="longitude"
                        >
                            <Input
                                prefix={<AimOutlined />}
                                placeholder="72.8777"
                                className="real-estate-upload-form__input"
                            />
                        </Form.Item>
                    </div>
                    <div className="real-estate-upload-form__row real-estate-upload-form__row--2">
                        <Form.Item
                            label={label("Possession Date")}
                            name="possessionDate"
                        >
                            <Input
                                placeholder="e.g. Dec 2025"
                                className="real-estate-upload-form__input"
                            />
                        </Form.Item>
                        <Form.Item
                            label={label("Status")}
                            name="status"
                            valuePropName="checked"
                            getValueFromEvent={(checked) => (checked ? "active" : "inactive")}
                            getValueProps={(v) => ({ checked: v === "active" })}
                        >
                            <Switch
                                checkedChildren="Active"
                                unCheckedChildren="Inactive"
                                className="real-estate-upload-form__status-switch"
                            />
                        </Form.Item>
                    </div>
                </Card>

                <Card className="real-estate-upload-form__card" size="small" title="Project Description & Details">
                    <div className="real-estate-upload-form__quill-wrap">
                        <ReactQuill
                            theme="bubble"
                            value={description}
                            onChange={setDescription}
                            modules={quillModules}
                            formats={quillFormats}
                            placeholder="Describe the project..."
                            readOnly={isPublishing}
                        />
                    </div>
                </Card>

                <Card className="real-estate-upload-form__card" size="small" title="Project Images">
                    <p className="real-estate-upload-form__dimension-hint">
                        Project gallery: <strong>560 × 440</strong> px • same for all
                    </p>
                    <div className="real-estate-upload-form__images">
                        <Upload.Dragger
                            multiple
                            accept="image/*"
                            showUploadList={false}
                            beforeUpload={(file) => {
                                handleImageUpload(file);
                                return false;
                            }}
                            disabled={isPublishing}
                            className="real-estate-upload-form__dropzone"
                        >
                            <PictureOutlined className="real-estate-upload-form__dropzone-icon" />
                            <p className="real-estate-upload-form__dropzone-text">
                                Drop images or <span>Browse</span>
                            </p>
                        </Upload.Dragger>
                        <div className="real-estate-upload-form__preview-grid">
                            {fileList.map((file) => (
                                <div
                                    key={file.uid}
                                    className={`real-estate-upload-form__preview-card real-estate-upload-form__preview-card--${file.status}`}
                                >
                                    <img src={file.previewUrl} alt="" />
                                    <span className="real-estate-upload-form__preview-status">
                                        {file.status === "uploading" && "Uploading..."}
                                        {file.status === "done" && "Done"}
                                        {file.status === "error" && "Failed"}
                                    </span>
                                    <Button
                                        type="text"
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        className="real-estate-upload-form__preview-remove"
                                        onClick={() => removeImage(file.uid)}
                                        disabled={isPublishing}
                                    />
                                </div>
                            ))}
                            {fileList.length === 0 && (
                                <div className="real-estate-upload-form__preview-empty">
                                    No images uploaded
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <Card className="real-estate-upload-form__card" size="small" title="Slider Images (project open)">
                    <p className="real-estate-upload-form__dimension-hint">
                        Hero (project open): <strong>1920 × 1080</strong> px • 16:9
                    </p>
                    <div className="real-estate-upload-form__images">
                        <Upload.Dragger
                            multiple
                            accept="image/*"
                            showUploadList={false}
                            beforeUpload={(file) => {
                                handleSlideHeroUpload(file);
                                return false;
                            }}
                            disabled={isPublishing}
                            className="real-estate-upload-form__dropzone"
                        >
                            <SlidersOutlined className="real-estate-upload-form__dropzone-icon" />
                            <p className="real-estate-upload-form__dropzone-text">
                                Drop slider images or <span>Browse</span>
                            </p>
                        </Upload.Dragger>
                        <div className="real-estate-upload-form__preview-grid">
                            {slideHeroFileList.map((file) => (
                                <div
                                    key={file.uid}
                                    className={`real-estate-upload-form__preview-card real-estate-upload-form__preview-card--${file.status}`}
                                >
                                    <img src={file.previewUrl} alt="" />
                                    <span className="real-estate-upload-form__preview-status">
                                        {file.status === "uploading" && "Uploading..."}
                                        {file.status === "done" && "Done"}
                                        {file.status === "error" && "Failed"}
                                    </span>
                                    <Button
                                        type="text"
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        className="real-estate-upload-form__preview-remove"
                                        onClick={() => removeSlideHeroImage(file.uid)}
                                        disabled={isPublishing}
                                    />
                                </div>
                            ))}
                            {slideHeroFileList.length === 0 && (
                                <div className="real-estate-upload-form__preview-empty">
                                    No slider images uploaded
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <Card className="real-estate-upload-form__card" size="small" title="Floor Plan Images">
                    <p className="real-estate-upload-form__dimension-hint">
                        Recommended: <strong>800 × 480</strong> px • ~5:4 aspect ratio • full plan
                    </p>
                    <div className="real-estate-upload-form__images">
                        <Upload.Dragger
                            multiple
                            accept="image/*"
                            showUploadList={false}
                            beforeUpload={(file) => {
                                handleFloorPlanUpload(file);
                                return false;
                            }}
                            disabled={isPublishing}
                            className="real-estate-upload-form__dropzone"
                        >
                            <LayoutOutlined className="real-estate-upload-form__dropzone-icon" />
                            <p className="real-estate-upload-form__dropzone-text">
                                Drop floor plans or <span>Browse</span>
                            </p>
                        </Upload.Dragger>
                        <div className="real-estate-upload-form__preview-grid">
                            {floorPlanFileList.map((file) => (
                                <div
                                    key={file.uid}
                                    className={`real-estate-upload-form__preview-card real-estate-upload-form__preview-card--${file.status}`}
                                >
                                    <img src={file.previewUrl} alt="" />
                                    <span className="real-estate-upload-form__preview-status">
                                        {file.status === "uploading" && "Uploading..."}
                                        {file.status === "done" && "Done"}
                                        {file.status === "error" && "Failed"}
                                    </span>
                                    <Button
                                        type="text"
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        className="real-estate-upload-form__preview-remove"
                                        onClick={() => removeFloorPlanImage(file.uid)}
                                        disabled={isPublishing}
                                    />
                                </div>
                            ))}
                            {floorPlanFileList.length === 0 && (
                                <div className="real-estate-upload-form__preview-empty">
                                    No floor plan images uploaded
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <Card className="real-estate-upload-form__card" size="small" title="Amenities">
                    {commonAmenities.length > 0 && (
                        <div className="real-estate-upload-form__common-amenities">
                            <span className="real-estate-upload-form__common-amenities-label">Add from common:</span>
                            <div className="real-estate-upload-form__common-amenities-tags">
                                {commonAmenities.map((item) => {
                                    const name = item?.name || item?.title || "";
                                    const icon = item?.icon;
                                    const alreadyAdded = amenities.some((a) => (a.name || "").trim().toLowerCase() === name.trim().toLowerCase());
                                    return (
                                        <button
                                            key={item?._id || name || Math.random()}
                                            type="button"
                                            className="real-estate-upload-form__common-amenity-tag"
                                            onClick={() => addCommonAmenity(item)}
                                            disabled={alreadyAdded || !name}
                                            title={alreadyAdded ? "Already added" : `Add ${name}`}
                                        >
                                            {typeof icon === "string" && icon.startsWith("http") ? (
                                                <img src={icon} alt="" className="real-estate-upload-form__common-amenity-tag-icon" />
                                            ) : null}
                                            <span>{name}</span>
                                            {alreadyAdded ? " ✓" : " +"}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <div className="real-estate-upload-form__amenities">
                        {amenities.map((amenity, index) => (
                            <div
                                key={index}
                                className="real-estate-upload-form__amenity-card"
                            >
                                <div className="real-estate-upload-form__amenity-card-head">
                                    <Switch
                                        checked={amenity.enabled}
                                        onChange={(checked) =>
                                            updateAmenity(index, "enabled", checked)
                                        }
                                        size="small"
                                    />
                                    <Button
                                        type="text"
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        onClick={() => removeAmenity(index)}
                                        className="real-estate-upload-form__amenity-delete"
                                    />
                                </div>
                                <Upload
                                    accept="image/*"
                                    showUploadList={false}
                                    beforeUpload={(file) => {
                                        handleAmenityIconUpload(index, file);
                                        return false;
                                    }}
                                    className="real-estate-upload-form__amenity-icon-upload"
                                >
                                    <div
                                        className="real-estate-upload-form__amenity-icon-box"
                                        onClick={(e) => {
                                            // keep existing UI but allow icon search flow
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (isIconUploading) return;
                                            setIconPickerOpenForIndex(index);
                                        }}
                                    >
                                        {iconUploadingIndex === index ? (
                                            <Spin size="small" />
                                        ) : null}
                                        {amenity.icon ? (
                                            typeof amenity.icon === "string" &&
                                            (amenity.icon.startsWith("http") ? (
                                                <img
                                                    src={amenity.icon}
                                                    alt=""
                                                    className="real-estate-upload-form__amenity-icon-img"
                                                />
                                            ) : (
                                                <span className="real-estate-upload-form__amenity-icon-text">
                                                    {amenity.icon}
                                                </span>
                                            ))
                                        ) : (
                                            <PlusOutlined />
                                        )}
                                    </div>
                                </Upload>
                                <Input
                                    placeholder="Amenity name"
                                    value={amenity.name}
                                    onChange={(e) =>
                                        updateAmenity(index, "name", e.target.value)
                                    }
                                    className="real-estate-upload-form__input real-estate-upload-form__amenity-name"
                                />
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addAmenity}
                            className="real-estate-upload-form__add-amenity"
                        >
                            <PlusOutlined />
                            <span>Add custom amenity</span>
                        </button>
                    </div>
                </Card>

                <Modal
                    title="Search icon"
                    open={iconPickerOpenForIndex != null}
                    onCancel={() => {
                        if (isIconUploading) return;
                        setIconPickerOpenForIndex(null);
                        setIconSearch("");
                    }}
                    footer={null}
                    width={720}
                    destroyOnClose
                >
                    <Input
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        placeholder="Search icons (e.g. wifi, home, car...)"
                        className="real-estate-upload-form__input"
                        disabled={isIconUploading}
                    />
                    {isIconUploading ? (
                        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                            <Spin size="small" />
                            <span style={{ fontSize: 12, color: "var(--secondary-text)" }}>
                                Uploading icon…
                            </span>
                        </div>
                    ) : null}
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 10 }}>
                        {filteredIconKeys.map((key) => {
                            const Icon = FaIcons[key];
                            const isThisUploading = isIconUploading && iconPickerOpenForIndex === iconUploadingIndex;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleAmenityIconSelect(iconPickerOpenForIndex, key)}
                                    disabled={isIconUploading}
                                    style={{
                                        border: "1px solid var(--border-color)",
                                        background: "var(--input-bg)",
                                        borderRadius: 8,
                                        height: 44,
                                        cursor: isIconUploading ? "not-allowed" : "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        opacity: isIconUploading ? 0.6 : 1,
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
                    <Button
                        onClick={() => {
                            form.resetFields();
                            setDescription(DUMMY_INITIAL.projectDescriptionAndDetails);
                            setFileList([]);
                            setSlideHeroFileList([]);
                            setFloorPlanFileList([]);
                            setAmenities(DUMMY_INITIAL.amenities.map((a) => ({ ...a })));
                        }}
                        disabled={isPublishing}
                    >
                        Reset
                    </Button>
                    <Space>
                        <Button
                            onClick={() => message.info("Saved as Draft")}
                            disabled={isPublishing}
                        >
                            Save as Draft
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={isPublishing}
                        >
                            Publish Project
                        </Button>
                    </Space>
                </div>
            </Form>
        </div>
    );
};

export default RealEstateProjectUpload;
