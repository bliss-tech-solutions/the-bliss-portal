import React, { useState, useMemo } from "react";
import { Tabs, Form, Input, Select, DatePicker, Row, Col, Upload, Button, Card, Space, Divider, Spin, Tag, Empty, Modal, Table } from "antd";
import {
    UserOutlined,
    BankOutlined,
    FileTextOutlined,
    IdcardOutlined,
    PictureOutlined,
    EnvironmentOutlined,
    DollarOutlined,
    CalendarOutlined,
    UploadOutlined,
    CheckCircleOutlined,
    TeamOutlined,
    EyeOutlined,
    DownloadOutlined,
    LinkOutlined,
    EditOutlined,
} from "@ant-design/icons";
import { uploadToCloudinary } from "../../../../utils/cloudinary";
import { useCreateUserVerificationDocumentMutation, useGetAllUserVerificationDocumentsQuery, useUpdateUserVerificationDocumentMutation, useIncrementSalaryMutation, useGetSalaryHistoryQuery } from "../../../../store/api";
import { useNotification } from "../../../../contexts/NotificationContext";
import dayjs from "dayjs";
import "./UserDocumentVerification.css";

const { Option } = Select;
const { TextArea } = Input;

const UserDocumentVerification = () => {
    const [activeTab, setActiveTab] = useState("1");
    const [form] = Form.useForm();
    const [aadharFileList, setAadharFileList] = useState([]);
    const [passportFileList, setPassportFileList] = useState([]);
    const [offerLetterFileList, setOfferLetterFileList] = useState([]);
    const [aadharUrl, setAadharUrl] = useState("");
    const [passportUrl, setPassportUrl] = useState("");
    const [offerLetterUrl, setOfferLetterUrl] = useState("");
    const [uploadingAadhar, setUploadingAadhar] = useState(false);
    const [uploadingPassport, setUploadingPassport] = useState(false);
    const [uploadingOffer, setUploadingOffer] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [createUserVerificationDocument] = useCreateUserVerificationDocumentMutation();
    const { data: documentsData, isLoading: isLoadingDocuments, refetch: refetchDocuments } = useGetAllUserVerificationDocumentsQuery();

    const documentsList = useMemo(() => {
        return Array.isArray(documentsData?.data) ? documentsData.data : [];
    }, [documentsData]);
    const { success, error: showError } = useNotification();

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingDoc, setEditingDoc] = useState(null);
    const [editForm] = Form.useForm();
    const [updateUserVerificationDocument] = useUpdateUserVerificationDocumentMutation();
    const [isUpdating, setIsUpdating] = useState(false);

    // Edit File States
    const [editAadharFileList, setEditAadharFileList] = useState([]);
    const [editPassportFileList, setEditPassportFileList] = useState([]);
    const [editOfferLetterFileList, setEditOfferLetterFileList] = useState([]);
    const [editAadharUrl, setEditAadharUrl] = useState("");
    const [editPassportUrl, setEditPassportUrl] = useState("");
    const [editOfferLetterUrl, setEditOfferLetterUrl] = useState("");
    const [editUploadingAadhar, setEditUploadingAadhar] = useState(false);
    const [editUploadingPassport, setEditUploadingPassport] = useState(false);
    const [editUploadingOffer, setEditUploadingOffer] = useState(false);

    const handleEditClick = (document) => {
        setEditingDoc(document);
        setEditModalVisible(true);

        setEditAadharUrl(document.aadharCardImage || "");
        setEditPassportUrl(document.passportPhoto || "");
        setEditOfferLetterUrl(document.offerLetter || "");

        if (document.aadharCardImage) {
            setEditAadharFileList([{ uid: '-1', name: 'Aadhar Card', status: 'done', url: document.aadharCardImage }]);
        } else setEditAadharFileList([]);

        if (document.passportPhoto) {
            setEditPassportFileList([{ uid: '-1', name: 'Passport Photo', status: 'done', url: document.passportPhoto }]);
        } else setEditPassportFileList([]);

        if (document.offerLetter) {
            setEditOfferLetterFileList([{ uid: '-1', name: 'Offer Letter', status: 'done', url: document.offerLetter }]);
        } else setEditOfferLetterFileList([]);

        editForm.setFieldsValue({
            ...document,
            joiningDate: document.joiningDate ? dayjs(document.joiningDate) : null,
            aadharCardImage: document.aadharCardImage,
            passportPhoto: document.passportPhoto,
            offerLetter: document.offerLetter
        });
    };

    const handleEditClose = () => {
        setEditModalVisible(false);
        setEditingDoc(null);
        editForm.resetFields();
    };

    const handleEditUpdate = async (values) => {
        setIsUpdating(true);
        try {
            const submitData = {
                ...values,
                beforeBlissSalary: Number(values.beforeBlissSalary),
                blissSalary: Number(values.blissSalary),
                joiningDate: values.joiningDate ? dayjs(values.joiningDate).format('YYYY-MM-DD') : null,
                aadharCardImage: editAadharUrl,
                passportPhoto: editPassportUrl,
                offerLetter: editOfferLetterUrl,
            };

            const response = await updateUserVerificationDocument({
                userId: editingDoc.userId,
                body: submitData
            }).unwrap();

            if (response.success || response) {
                success('Document details updated successfully!');
                handleEditClose();
                refetchDocuments();
            } else {
                showError(response.message || 'Failed to update document');
            }
        } catch (error) {
            console.error('Update error:', error);
            showError(error?.data?.message || 'Failed to update. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleEditAadharUpload = async ({ file, fileList }) => {
        if (file.status === 'removed') {
            setEditAadharFileList([]);
            setEditAadharUrl("");
            editForm.setFieldsValue({ aadharCardImage: undefined });
            return;
        }
        const fileToUpload = file.originFileObj || file;
        if (!fileToUpload || !(fileToUpload instanceof File)) return;

        file.status = 'uploading';
        setEditAadharFileList([...fileList]);
        setEditUploadingAadhar(true);

        try {
            const result = await uploadToCloudinary(fileToUpload, 'image');
            if (result?.secure_url) {
                const url = result.secure_url;
                const updatedList = fileList.map(f => f.uid === file.uid ? { ...f, status: 'done', url } : f);
                setEditAadharFileList(updatedList);
                setEditAadharUrl(url);
                editForm.setFieldsValue({ aadharCardImage: url });
                success('Aadhar uploaded');
            }
        } catch (e) {
            showError('Upload failed');
            setEditAadharFileList(fileList.filter(f => f.uid !== file.uid));
        } finally { setEditUploadingAadhar(false); }
    };

    const handleEditPassportUpload = async ({ file, fileList }) => {
        if (file.status === 'removed') {
            setEditPassportFileList([]);
            setEditPassportUrl("");
            editForm.setFieldsValue({ passportPhoto: undefined });
            return;
        }
        const fileToUpload = file.originFileObj || file;
        if (!fileToUpload || !(fileToUpload instanceof File)) return;

        file.status = 'uploading';
        setEditPassportFileList([...fileList]);
        setEditUploadingPassport(true);

        try {
            const result = await uploadToCloudinary(fileToUpload, 'image');
            if (result?.secure_url) {
                const url = result.secure_url;
                const updatedList = fileList.map(f => f.uid === file.uid ? { ...f, status: 'done', url } : f);
                setEditPassportFileList(updatedList);
                setEditPassportUrl(url);
                editForm.setFieldsValue({ passportPhoto: url });
                success('Passport uploaded');
            }
        } catch (e) {
            showError('Upload failed');
            setEditPassportFileList(fileList.filter(f => f.uid !== file.uid));
        } finally { setEditUploadingPassport(false); }
    };

    const handleEditOfferLetterUpload = async ({ file, fileList }) => {
        if (file.status === 'removed') {
            setEditOfferLetterFileList([]);
            setEditOfferLetterUrl("");
            editForm.setFieldsValue({ offerLetter: undefined });
            return;
        }
        const fileToUpload = file.originFileObj || file;
        if (!fileToUpload || !(fileToUpload instanceof File)) return;

        file.status = 'uploading';
        setEditOfferLetterFileList([...fileList]);
        setEditUploadingOffer(true);

        try {
            const result = await uploadToCloudinary(fileToUpload, 'raw');
            if (result?.secure_url) {
                const url = result.secure_url;
                const updatedList = fileList.map(f => f.uid === file.uid ? { ...f, status: 'done', url } : f);
                setEditOfferLetterFileList(updatedList);
                setEditOfferLetterUrl(url);
                editForm.setFieldsValue({ offerLetter: url });
                success('Offer letter uploaded');
            }
        } catch (e) {
            showError('Upload failed');
            setEditOfferLetterFileList(fileList.filter(f => f.uid !== file.uid));
        } finally { setEditUploadingOffer(false); }
    };

    // Salary Discussion States
    const [salaryModalVisible, setSalaryModalVisible] = useState(false);
    const [salaryModalUser, setSalaryModalUser] = useState(null);
    const [incrementForm] = Form.useForm();
    const [previewPercent, setPreviewPercent] = useState(0);
    const [incrementSalary, { isLoading: isIncrementing }] = useIncrementSalaryMutation();
    const { data: salaryHistoryData, isLoading: isLoadingHistory, refetch: refetchHistory } = useGetSalaryHistoryQuery(salaryModalUser?.userId, {
        skip: !salaryModalUser?.userId
    });

    const salaryHistoryList = useMemo(() => {
        if (salaryHistoryData?.data && Array.isArray(salaryHistoryData.data.history)) {
            return salaryHistoryData.data.history;
        }
        return [];
    }, [salaryHistoryData]);

    const handleSalaryClick = (record) => {
        setSalaryModalUser(record);
        setSalaryModalVisible(true);
    };

    const handleSalaryClose = () => {
        setSalaryModalVisible(false);
        setSalaryModalUser(null);
        incrementForm.resetFields();
        setPreviewPercent(0);
    };

    const handleIncrementSalary = async (values) => {
        try {
            const response = await incrementSalary({
                userId: salaryModalUser.userId,
                body: {
                    incrementPercent: Number(values.incrementPercent),
                    effectiveFrom: values.effectiveFrom ? dayjs(values.effectiveFrom).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
                    note: values.note
                }
            }).unwrap();

            if (response.success || response) {
                success('Salary incremented successfully!');
                incrementForm.resetFields();
                refetchHistory();
                refetchDocuments();
            } else {
                showError(response.message || 'Failed to increment salary');
            }
        } catch (error) {
            console.error('Increment error:', error);
            showError(error?.data?.message || 'Failed to increment salary');
        }
    };

    const handleTabChange = (key) => {
        setActiveTab(key);
    };

    const handleAadharUpload = async ({ file, fileList }) => {
        // Handle file removal
        if (file.status === 'removed') {
            setAadharFileList([]);
            setAadharUrl("");
            form.setFieldsValue({ aadharCardImage: undefined });
            return;
        }

        // Handle new file upload
        const fileToUpload = file.originFileObj || file;
        if (!fileToUpload || !(fileToUpload instanceof File)) {
            showError('Invalid file selected');
            return;
        }

        // Update file list with uploading status
        file.status = 'uploading';
        setAadharFileList([...fileList]);
        setUploadingAadhar(true);

        try {
            // Upload to Cloudinary as image
            const result = await uploadToCloudinary(fileToUpload, 'image');

            if (!result || !result.secure_url) {
                throw new Error('Invalid response from Cloudinary');
            }

            const documentUrl = result.secure_url;

            // Update file list with success status and URL
            const updatedFileList = fileList.map(f => {
                if (f.uid === file.uid) {
                    return {
                        ...f,
                        status: 'done',
                        url: documentUrl,
                        response: { secure_url: documentUrl }
                    };
                }
                return f;
            });

            setAadharFileList(updatedFileList);
            setAadharUrl(documentUrl);
            form.setFieldsValue({ aadharCardImage: documentUrl });
            success('Aadhar card uploaded successfully');
        } catch (error) {
            console.error('Aadhar upload error:', error);
            showError('Failed to upload Aadhar card: ' + (error.message || 'Unknown error'));
            // Remove failed file from list
            setAadharFileList(fileList.filter(f => f.uid !== file.uid));
        } finally {
            setUploadingAadhar(false);
        }
    };

    const handlePassportUpload = async ({ file, fileList }) => {
        // Handle file removal
        if (file.status === 'removed') {
            setPassportFileList([]);
            setPassportUrl("");
            form.setFieldsValue({ passportPhoto: undefined });
            return;
        }

        // Handle new file upload
        const fileToUpload = file.originFileObj || file;
        if (!fileToUpload || !(fileToUpload instanceof File)) {
            showError('Invalid file selected');
            return;
        }

        // Update file list with uploading status
        file.status = 'uploading';
        setPassportFileList([...fileList]);
        setUploadingPassport(true);

        try {
            // Upload to Cloudinary as image
            const result = await uploadToCloudinary(fileToUpload, 'image');

            if (!result || !result.secure_url) {
                throw new Error('Invalid response from Cloudinary');
            }

            const documentUrl = result.secure_url;

            // Update file list with success status and URL
            const updatedFileList = fileList.map(f => {
                if (f.uid === file.uid) {
                    return {
                        ...f,
                        status: 'done',
                        url: documentUrl,
                        response: { secure_url: documentUrl }
                    };
                }
                return f;
            });

            setPassportFileList(updatedFileList);
            setPassportUrl(documentUrl);
            form.setFieldsValue({ passportPhoto: documentUrl });
            success('Passport photo uploaded successfully');
        } catch (error) {
            console.error('Passport upload error:', error);
            showError('Failed to upload passport photo: ' + (error.message || 'Unknown error'));
            // Remove failed file from list
            setPassportFileList(fileList.filter(f => f.uid !== file.uid));
        } finally {
            setUploadingPassport(false);
        }
    };

    const handleOfferLetterUpload = async ({ file, fileList }) => {
        // Handle file removal
        if (file.status === 'removed') {
            setOfferLetterFileList([]);
            setOfferLetterUrl("");
            form.setFieldsValue({ offerLetter: undefined });
            return;
        }

        // Handle new file upload
        const fileToUpload = file.originFileObj || file;
        if (!fileToUpload || !(fileToUpload instanceof File)) {
            showError('Invalid file selected');
            return;
        }

        // Update file list with uploading status
        file.status = 'uploading';
        setOfferLetterFileList([...fileList]);
        setUploadingOffer(true);

        try {
            // Upload to Cloudinary as raw (for PDF/DOC files)
            const result = await uploadToCloudinary(fileToUpload, 'raw');

            if (!result || !result.secure_url) {
                throw new Error('Invalid response from Cloudinary');
            }

            const documentUrl = result.secure_url;

            // Update file list with success status and URL
            const updatedFileList = fileList.map(f => {
                if (f.uid === file.uid) {
                    return {
                        ...f,
                        status: 'done',
                        url: documentUrl,
                        response: { secure_url: documentUrl }
                    };
                }
                return f;
            });

            setOfferLetterFileList(updatedFileList);
            setOfferLetterUrl(documentUrl);
            form.setFieldsValue({ offerLetter: documentUrl });
            success('Offer letter uploaded successfully');
        } catch (error) {
            console.error('Offer letter upload error:', error);
            showError('Failed to upload offer letter: ' + (error.message || 'Unknown error'));
            // Remove failed file from list
            setOfferLetterFileList(fileList.filter(f => f.uid !== file.uid));
        } finally {
            setUploadingOffer(false);
        }
    };

    const handleSubmit = async (values) => {
        // Validate that all documents are uploaded
        if (!aadharUrl || !passportUrl || !offerLetterUrl) {
            showError('Please upload all required documents before submitting');
            return;
        }

        setIsSubmitting(true);

        try {
            // Format the data according to the schema
            const submitData = {
                userId: values.userId,
                name: values.name,
                department: values.department,
                position: values.position,
                jobType: values.jobType,
                beforeBlissSalary: Number(values.beforeBlissSalary),
                blissSalary: Number(values.blissSalary),
                joiningDate: values.joiningDate ? dayjs(values.joiningDate).format('YYYY-MM-DD') : null,
                currentAddress: values.currentAddress,
                permanentAddress: values.permanentAddress,
                experience: values.experience,
                bankDetails: {
                    accountHolderName: values.bankDetails?.accountHolderName,
                    accountNumber: values.bankDetails?.accountNumber,
                    bankName: values.bankDetails?.bankName,
                    ifscCode: values.bankDetails?.ifscCode,
                    branchName: values.bankDetails?.branchName,
                    accountType: values.bankDetails?.accountType,
                },
                aadharCardImage: aadharUrl,
                passportPhoto: passportUrl,
                offerLetter: offerLetterUrl,
            };

            // Call API to create document
            const response = await createUserVerificationDocument(submitData).unwrap();

            if (response.success || response) {
                success('Document verification submitted successfully!');
                // Reset form and file lists
                handleReset();
                // Refetch documents list
                refetchDocuments();
                // Switch to documents tab
                setActiveTab("2");
            } else {
                showError(response.message || 'Failed to submit document');
            }
        } catch (error) {
            console.error('Submit error:', error);
            showError(error?.data?.message || error?.message || 'Failed to submit document. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        form.resetFields();
        setAadharFileList([]);
        setPassportFileList([]);
        setOfferLetterFileList([]);
        setAadharUrl("");
        setPassportUrl("");
        setOfferLetterUrl("");
        // Clear form validation
        form.setFieldsValue({
            aadharCardImage: undefined,
            passportPhoto: undefined,
            offerLetter: undefined
        });
    };

    const salaryColumns = [
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Department', dataIndex: 'department', key: 'department', render: (text) => <Tag>{text}</Tag> },
        { title: 'Position', dataIndex: 'position', key: 'position' },
        { title: 'Current Salary', dataIndex: 'blissSalary', key: 'blissSalary', render: (val) => val ? `₹${Number(val).toLocaleString()}` : 'N/A' },
        { title: 'Joining Date', dataIndex: 'joiningDate', key: 'joiningDate', render: (date) => date ? dayjs(date).format('MMM D, YYYY') : '-' },
        { title: 'Experience', dataIndex: 'experience', key: 'experience' },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="primary"
                    icon={<DollarOutlined />}
                    onClick={() => handleSalaryClick(record)}
                    className="global-secondary-btn"
                >
                    Salary Discussion
                </Button>
            ),
        }
    ];

    const tabItems = [
        {
            key: "1",
            label: (
                <Space>
                    <FileTextOutlined />
                    <span>Add Document</span>
                </Space>
            ),
            children: (
                <div className="udv-form-container">
                    <Card className="udv-form-card">
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSubmit}
                            className="udv-form"
                        >
                            {/* Basic Information Section */}
                            <div className="udv-form-section">
                                <h3 className="udv-section-title">
                                    <UserOutlined className="udv-section-icon" />
                                    Basic Information
                                </h3>
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} sm={12} md={8}>
                                        <Form.Item
                                            label="User ID"
                                            name="userId"
                                            rules={[{ required: true, message: "Please enter User ID" }]}
                                        >
                                            <Input
                                                prefix={<UserOutlined />}
                                                placeholder="e.g., user-bliss-1234"
                                                className="udv-input"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <Form.Item
                                            label="Full Name"
                                            name="name"
                                            rules={[{ required: true, message: "Please enter full name" }]}
                                        >
                                            <Input
                                                prefix={<UserOutlined />}
                                                placeholder="e.g., John Doe"
                                                className="udv-input"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <Form.Item
                                            label="Department"
                                            name="department"
                                            rules={[{ required: true, message: "Please select department" }]}
                                        >
                                            <Select
                                                placeholder="Select Department"
                                                className="udv-select"
                                                suffixIcon={<TeamOutlined />}
                                            >
                                                <Option value="Engineering">Engineering</Option>
                                                <Option value="Design">Design</Option>
                                                <Option value="Marketing">Marketing</Option>
                                                <Option value="HR">HR</Option>
                                                <Option value="Finance">Finance</Option>
                                                <Option value="Sales">Sales</Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <Form.Item
                                            label="Position"
                                            name="position"
                                            rules={[{ required: true, message: "Please enter position" }]}
                                        >
                                            <Input
                                                prefix={<FileTextOutlined />}
                                                placeholder="e.g., Senior Developer"
                                                className="udv-input"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <Form.Item
                                            label="Job Type"
                                            name="jobType"
                                            rules={[{ required: true, message: "Please select job type" }]}
                                        >
                                            <Select
                                                placeholder="Select Job Type"
                                                className="udv-select"
                                            >
                                                <Option value="full-time">Full Time</Option>
                                                <Option value="part-time">Part Time</Option>
                                                <Option value="contract">Contract</Option>
                                                <Option value="intern">Intern</Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <Form.Item
                                            label="Experience"
                                            name="experience"
                                            rules={[{ required: true, message: "Please enter experience" }]}
                                        >
                                            <Input
                                                prefix={<FileTextOutlined />}
                                                placeholder="e.g., 5 years"
                                                className="udv-input"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <Form.Item
                                            label="Joining Date"
                                            name="joiningDate"
                                            rules={[{ required: true, message: "Please select joining date" }]}
                                        >
                                            <DatePicker
                                                className="udv-date-picker"
                                                style={{ width: "100%" }}
                                                placeholder="Select joining date"
                                                suffixIcon={<CalendarOutlined />}
                                                format="YYYY-MM-DD"
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </div>

                            <Divider className="udv-divider" />

                            {/* Address Information Section */}
                            <div className="udv-form-section">
                                <h3 className="udv-section-title">
                                    <EnvironmentOutlined className="udv-section-icon" />
                                    Address Information
                                </h3>
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} md={12}>
                                        <Form.Item
                                            label="Current Address"
                                            name="currentAddress"
                                            rules={[{ required: true, message: "Please enter current address" }]}
                                        >
                                            <TextArea
                                                rows={3}
                                                placeholder="Enter current address"
                                                className="udv-textarea"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item
                                            label="Permanent Address"
                                            name="permanentAddress"
                                            rules={[{ required: true, message: "Please enter permanent address" }]}
                                        >
                                            <TextArea
                                                rows={3}
                                                placeholder="Enter permanent address"
                                                className="udv-textarea"
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </div>

                            <Divider className="udv-divider" />

                            {/* Salary Information Section */}
                            <div className="udv-form-section">
                                <h3 className="udv-section-title">
                                    <DollarOutlined className="udv-section-icon" />
                                    Salary Information
                                </h3>
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} sm={12} md={12}>
                                        <Form.Item
                                            label="Previous Salary"
                                            name="beforeBlissSalary"
                                            rules={[{ required: true, message: "Please enter previous salary" }]}
                                        >
                                            <Input
                                                prefix={<DollarOutlined />}
                                                type="number"
                                                placeholder="e.g., 50000"
                                                className="udv-input"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12} md={12}>
                                        <Form.Item
                                            label="Current Salary"
                                            name="blissSalary"
                                            rules={[{ required: true, message: "Please enter current salary" }]}
                                        >
                                            <Input
                                                prefix={<DollarOutlined />}
                                                type="number"
                                                placeholder="e.g., 60000"
                                                className="udv-input"
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </div>

                            <Divider className="udv-divider" />

                            {/* Bank Details Section */}
                            <div className="udv-form-section">
                                <h3 className="udv-section-title">
                                    <BankOutlined className="udv-section-icon" />
                                    Bank Details
                                </h3>
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} sm={12} md={8}>
                                        <Form.Item
                                            label="Account Holder Name"
                                            name={["bankDetails", "accountHolderName"]}
                                            rules={[{ required: true, message: "Please enter account holder name" }]}
                                        >
                                            <Input
                                                prefix={<UserOutlined />}
                                                placeholder="Account holder name"
                                                className="udv-input"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <Form.Item
                                            label="Account Number"
                                            name={["bankDetails", "accountNumber"]}
                                            rules={[{ required: true, message: "Please enter account number" }]}
                                        >
                                            <Input
                                                prefix={<BankOutlined />}
                                                placeholder="Account number"
                                                className="udv-input"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <Form.Item
                                            label="Bank Name"
                                            name={["bankDetails", "bankName"]}
                                            rules={[{ required: true, message: "Please enter bank name" }]}
                                        >
                                            <Input
                                                prefix={<BankOutlined />}
                                                placeholder="Bank name"
                                                className="udv-input"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <Form.Item
                                            label="IFSC Code"
                                            name={["bankDetails", "ifscCode"]}
                                            rules={[{ required: true, message: "Please enter IFSC code" }]}
                                        >
                                            <Input
                                                prefix={<BankOutlined />}
                                                placeholder="e.g., ABCD0123456"
                                                className="udv-input"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <Form.Item
                                            label="Branch Name"
                                            name={["bankDetails", "branchName"]}
                                            rules={[{ required: true, message: "Please enter branch name" }]}
                                        >
                                            <Input
                                                prefix={<BankOutlined />}
                                                placeholder="Branch name"
                                                className="udv-input"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <Form.Item
                                            label="Account Type"
                                            name={["bankDetails", "accountType"]}
                                            rules={[{ required: true, message: "Please select account type" }]}
                                        >
                                            <Select
                                                placeholder="Select Account Type"
                                                className="udv-select"
                                            >
                                                <Option value="savings">Savings</Option>
                                                <Option value="current">Current</Option>
                                                <Option value="salary">Salary</Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </div>

                            <Divider className="udv-divider" />

                            {/* Document Upload Section */}
                            <div className="udv-form-section">
                                <h3 className="udv-section-title">
                                    <PictureOutlined className="udv-section-icon" />
                                    Document Uploads
                                </h3>
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} md={8}>
                                        <Form.Item
                                            label="Aadhar Card"
                                            name="aadharCardImage"
                                            validateStatus={uploadingAadhar ? "validating" : ""}
                                            help={uploadingAadhar ? "Uploading..." : ""}
                                            rules={[
                                                {
                                                    validator: async () => {
                                                        if (uploadingAadhar) {
                                                            // Don't show error while uploading
                                                            return Promise.resolve();
                                                        }
                                                        if (!aadharUrl) {
                                                            return Promise.reject(new Error('Please upload Aadhar card'));
                                                        }
                                                        return Promise.resolve();
                                                    }
                                                }
                                            ]}
                                        >
                                            <Upload
                                                name="aadharCard"
                                                listType="picture-card"
                                                fileList={aadharFileList}
                                                onChange={handleAadharUpload}
                                                beforeUpload={() => false}
                                                accept="image/*"
                                                maxCount={1}
                                                className="udv-upload"
                                            >
                                                {aadharFileList.length < 1 && (
                                                    <div className="udv-upload-button">
                                                        {uploadingAadhar ? (
                                                            <Spin size="small" />
                                                        ) : (
                                                            <>
                                                                <UploadOutlined className="udv-upload-icon" />
                                                                <div className="udv-upload-text">Upload Aadhar</div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </Upload>
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <Form.Item
                                            label="Passport Photo"
                                            name="passportPhoto"
                                            validateStatus={uploadingPassport ? "validating" : ""}
                                            help={uploadingPassport ? "Uploading..." : ""}
                                            rules={[
                                                {
                                                    validator: async () => {
                                                        if (uploadingPassport) {
                                                            // Don't show error while uploading
                                                            return Promise.resolve();
                                                        }
                                                        if (!passportUrl) {
                                                            return Promise.reject(new Error('Please upload passport photo'));
                                                        }
                                                        return Promise.resolve();
                                                    }
                                                }
                                            ]}
                                        >
                                            <Upload
                                                name="passportPhoto"
                                                listType="picture-card"
                                                fileList={passportFileList}
                                                onChange={handlePassportUpload}
                                                beforeUpload={() => false}
                                                accept="image/*"
                                                maxCount={1}
                                                className="udv-upload"
                                            >
                                                {passportFileList.length < 1 && (
                                                    <div className="udv-upload-button">
                                                        {uploadingPassport ? (
                                                            <Spin size="small" />
                                                        ) : (
                                                            <>
                                                                <IdcardOutlined className="udv-upload-icon" />
                                                                <div className="udv-upload-text">Upload Photo</div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </Upload>
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <Form.Item
                                            label="Offer Letter"
                                            name="offerLetter"
                                            validateStatus={uploadingOffer ? "validating" : ""}
                                            help={uploadingOffer ? "Uploading..." : ""}
                                            rules={[
                                                {
                                                    validator: async () => {
                                                        if (uploadingOffer) {
                                                            // Don't show error while uploading
                                                            return Promise.resolve();
                                                        }
                                                        if (!offerLetterUrl) {
                                                            return Promise.reject(new Error('Please upload offer letter'));
                                                        }
                                                        return Promise.resolve();
                                                    }
                                                }
                                            ]}
                                        >
                                            <Upload
                                                name="offerLetter"
                                                listType="picture-card"
                                                fileList={offerLetterFileList}
                                                onChange={handleOfferLetterUpload}
                                                beforeUpload={() => false}
                                                accept=".pdf,.doc,.docx"
                                                maxCount={1}
                                                className="udv-upload"
                                            >
                                                {offerLetterFileList.length < 1 && (
                                                    <div className="udv-upload-button">
                                                        {uploadingOffer ? (
                                                            <Spin size="small" />
                                                        ) : (
                                                            <>
                                                                <FileTextOutlined className="udv-upload-icon" />
                                                                <div className="udv-upload-text">Upload Letter</div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </Upload>
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </div>

                            {/* Submit Button */}
                            <div className="udv-form-actions">
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    icon={<CheckCircleOutlined />}
                                    className="udv-submit-button"
                                    loading={isSubmitting}
                                    disabled={uploadingAadhar || uploadingPassport || uploadingOffer || isSubmitting}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Document'}
                                </Button>
                                <Button
                                    size="large"
                                    onClick={handleReset}
                                    className="udv-reset-button"
                                    disabled={isSubmitting}
                                >
                                    Reset Form
                                </Button>
                            </div>
                        </Form>
                    </Card>
                </div>
            ),
        },
        {
            key: "2",
            label: (
                <Space>
                    <FileTextOutlined />
                    <span>All Documents Data</span>
                </Space>
            ),
            children: (
                <div className="udv-documents-container">
                    {isLoadingDocuments ? (
                        <div className="udv-documents-loading">
                            <Spin size="large" />
                        </div>
                    ) : !documentsData?.data || documentsData?.data?.length === 0 ? (
                        <Card className="udv-documents-card">
                            <Empty
                                description={
                                    <div className="udv-empty-state">
                                        <FileTextOutlined className="udv-empty-icon" />
                                        <h3>No Documents Found</h3>
                                        <p>No verification documents have been submitted yet.</p>
                                    </div>
                                }
                            />
                        </Card>
                    ) : (
                        <div className="udv-documents-grid">
                            {documentsData.data.map((document, index) => {
                                const joiningDateFormatted = document.joiningDate
                                    ? dayjs(document.joiningDate).format('MMM D, YYYY')
                                    : 'Not specified';

                                return (
                                    <Card key={document._id || index} className="udv-document-card">
                                        {/* Header Section */}
                                        <div className="udv-document-card-header">
                                            <div className="udv-document-header-left">
                                                <div className="udv-document-avatar">
                                                    <UserOutlined />
                                                </div>
                                                <div className="udv-document-user-info">
                                                    <h3 className="udv-document-name">{document.name || 'N/A'}</h3>
                                                    <span className="udv-document-user-id">{document.userId || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div className="udv-document-header-right">
                                                <Tag className="udv-department-tag">
                                                    <TeamOutlined /> {document.department || 'N/A'}
                                                </Tag>
                                            </div>
                                        </div>

                                        {/* Info Grid Section */}
                                        <div className="udv-document-info-grid">
                                            <div className="udv-info-item">
                                                <div className="udv-info-label">
                                                    <FileTextOutlined className="udv-info-icon" />
                                                    Position
                                                </div>
                                                <div className="udv-info-value">{document.position || 'N/A'}</div>
                                            </div>

                                            <div className="udv-info-item">
                                                <div className="udv-info-label">
                                                    <CalendarOutlined className="udv-info-icon" />
                                                    Joining Date
                                                </div>
                                                <div className="udv-info-value">{joiningDateFormatted}</div>
                                            </div>

                                            <div className="udv-info-item">
                                                <div className="udv-info-label">
                                                    <FileTextOutlined className="udv-info-icon" />
                                                    Job Type
                                                </div>
                                                <div className="udv-info-value">
                                                    <Tag className="udv-job-type-tag">{document.jobType || 'N/A'}</Tag>
                                                </div>
                                            </div>

                                            <div className="udv-info-item">
                                                <div className="udv-info-label">
                                                    <FileTextOutlined className="udv-info-icon" />
                                                    Experience
                                                </div>
                                                <div className="udv-info-value">{document.experience || 'N/A'}</div>
                                            </div>
                                        </div>

                                        {/* Salary Section */}
                                        <div className="udv-salary-section">
                                            <div className="udv-salary-item">
                                                <span className="udv-salary-label">Previous Salary</span>
                                                <span className="udv-salary-value">₹{document.beforeBlissSalary ? document.beforeBlissSalary.toLocaleString() : 'N/A'}</span>
                                            </div>
                                            <div className="udv-salary-arrow">→</div>
                                            <div className="udv-salary-item udv-salary-current">
                                                <span className="udv-salary-label">Current Salary</span>
                                                <span className="udv-salary-value udv-salary-highlight">₹{document.blissSalary ? document.blissSalary.toLocaleString() : 'N/A'}</span>
                                            </div>
                                        </div>

                                        {/* Bank Details Section */}
                                        <div className="udv-bank-section">
                                            <div className="udv-bank-header">
                                                <BankOutlined className="udv-bank-icon" />
                                                <span className="udv-bank-title">Bank Details</span>
                                            </div>
                                            <div className="udv-bank-info">
                                                <div className="udv-bank-item">
                                                    <span className="udv-bank-label">Bank Name:</span>
                                                    <span className="udv-bank-value">{document.bankDetails?.bankName || 'N/A'}</span>
                                                </div>
                                                <div className="udv-bank-item">
                                                    <span className="udv-bank-label">Account Type:</span>
                                                    <span className="udv-bank-value">{document.bankDetails?.accountType || 'N/A'}</span>
                                                </div>
                                                <div className="udv-bank-item">
                                                    <span className="udv-bank-label">Account Number:</span>
                                                    <span className="udv-bank-value">{document.bankDetails?.accountNumber || 'N/A'}</span>
                                                </div>
                                                <div className="udv-bank-item">
                                                    <span className="udv-bank-label">IFSC Code:</span>
                                                    <span className="udv-bank-value">{document.bankDetails?.ifscCode || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Documents Footer */}
                                        <div className="udv-document-footer">
                                            <div className="udv-footer-label">
                                                <LinkOutlined /> Documents
                                            </div>
                                            <div className="udv-document-actions">
                                                {document.aadharCardImage && (
                                                    <Button
                                                        size="small"
                                                        icon={<EyeOutlined />}
                                                        href={document.aadharCardImage}
                                                        target="_blank"
                                                        className="global-secondary-btn"
                                                    >
                                                        Aadhar
                                                    </Button>
                                                )}
                                                {/* {document.passportPhoto && (
                                                    <Button
                                                        size="small"
                                                        icon={<EyeOutlined />}
                                                        href={document.passportPhoto}
                                                        target="_blank"
                                                        className="global-secondary-btn"
                                                    >
                                                        Passport
                                                    </Button>
                                                )} */}
                                                {document.offerLetter && (
                                                    <Button
                                                        size="small"
                                                        icon={<DownloadOutlined />}
                                                        href={document.offerLetter}
                                                        target="_blank"
                                                        className="global-secondary-btn"
                                                    >
                                                        Offer Letter
                                                    </Button>
                                                )}
                                                <Button
                                                    size="small"
                                                    icon={<EditOutlined />}
                                                    onClick={() => handleEditClick(document)}
                                                    className="global-secondary-btn"
                                                >
                                                    Edit
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: "3",
            label: (
                <Space>
                    <DollarOutlined />
                    <span>Salary Discussion</span>
                </Space>
            ),
            children: (
                <div className="udv-documents-container">
                    <Card className="udv-form-card">
                        <Table
                            dataSource={documentsList}
                            columns={salaryColumns}
                            rowKey="_id"
                            loading={isLoadingDocuments}
                            pagination={{ pageSize: 10 }}
                            scroll={{ x: true }}
                            className="udv-table"
                        />
                    </Card>
                </div>
            )
        }
    ];

    return (
        <div className="udv-container">
            <div className="udv-header">
                <h2 className="udv-title">User Document Verification / Salary Management</h2>
            </div>
            <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                type="card"
                items={tabItems}
                className="udv-tabs"
            />

            <Modal
                title="Edit Document Details"
                open={editModalVisible}
                onCancel={handleEditClose}
                footer={null}
                width={800}
                className="udv-modal"
                destroyOnClose
            >
                <Form
                    form={editForm}
                    layout="vertical"
                    onFinish={handleEditUpdate}
                    className="udv-form"
                >
                    <div className="udv-form-section">
                        <h3 className="udv-section-title"><UserOutlined className="udv-section-icon" /> Basic Information</h3>
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item label="User ID" name="userId" rules={[{ required: true }]}>
                                    <Input prefix={<UserOutlined />} className="udv-input" disabled />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item label="Full Name" name="name" rules={[{ required: true }]}>
                                    <Input prefix={<UserOutlined />} className="udv-input" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item label="Department" name="department" rules={[{ required: true }]}>
                                    <Select className="udv-select">
                                        <Option value="Engineering">Engineering</Option>
                                        <Option value="Design">Design</Option>
                                        <Option value="Marketing">Marketing</Option>
                                        <Option value="HR">HR</Option>
                                        <Option value="Finance">Finance</Option>
                                        <Option value="Sales">Sales</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item label="Position" name="position" rules={[{ required: true }]}>
                                    <Input prefix={<FileTextOutlined />} className="udv-input" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item label="Job Type" name="jobType" rules={[{ required: true }]}>
                                    <Select className="udv-select">
                                        <Option value="full-time">Full Time</Option>
                                        <Option value="part-time">Part Time</Option>
                                        <Option value="contract">Contract</Option>
                                        <Option value="intern">Intern</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item label="Experience" name="experience" rules={[{ required: true }]}>
                                    <Input prefix={<FileTextOutlined />} className="udv-input" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item label="Joining Date" name="joiningDate" rules={[{ required: true }]}>
                                    <DatePicker className="udv-date-picker" style={{ width: "100%" }} format="YYYY-MM-DD" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    <Divider className="udv-divider" />

                    <div className="udv-form-section">
                        <h3 className="udv-section-title"><EnvironmentOutlined className="udv-section-icon" /> Address Information</h3>
                        <Row gutter={[16, 16]}>
                            <Col xs={24} md={12}>
                                <Form.Item label="Current Address" name="currentAddress" rules={[{ required: true }]}>
                                    <TextArea rows={3} className="udv-textarea" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Permanent Address" name="permanentAddress" rules={[{ required: true }]}>
                                    <TextArea rows={3} className="udv-textarea" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    <Divider className="udv-divider" />

                    <div className="udv-form-section">
                        <h3 className="udv-section-title"><DollarOutlined className="udv-section-icon" /> Salary Information</h3>
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} md={12}>
                                <Form.Item label="Previous Salary" name="beforeBlissSalary" rules={[{ required: true }]}>
                                    <Input prefix={<DollarOutlined />} type="number" className="udv-input" disabled />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={12}>
                                <Form.Item label="Current Salary" name="blissSalary" rules={[{ required: true }]}>
                                    <Input prefix={<DollarOutlined />} type="number" className="udv-input" disabled />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    <Divider className="udv-divider" />

                    <div className="udv-form-section">
                        <h3 className="udv-section-title"><BankOutlined className="udv-section-icon" /> Bank Details</h3>
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item label="Account Holder Name" name={["bankDetails", "accountHolderName"]} rules={[{ required: true }]}>
                                    <Input prefix={<UserOutlined />} className="udv-input" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item label="Account Number" name={["bankDetails", "accountNumber"]} rules={[{ required: true }]}>
                                    <Input prefix={<BankOutlined />} className="udv-input" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item label="Bank Name" name={["bankDetails", "bankName"]} rules={[{ required: true }]}>
                                    <Input prefix={<BankOutlined />} className="udv-input" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item label="IFSC Code" name={["bankDetails", "ifscCode"]} rules={[{ required: true }]}>
                                    <Input prefix={<BankOutlined />} className="udv-input" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item label="Branch Name" name={["bankDetails", "branchName"]} rules={[{ required: true }]}>
                                    <Input prefix={<BankOutlined />} className="udv-input" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item label="Account Type" name={["bankDetails", "accountType"]} rules={[{ required: true }]}>
                                    <Select className="udv-select">
                                        <Option value="savings">Savings</Option>
                                        <Option value="current">Current</Option>
                                        <Option value="salary">Salary</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    <Divider className="udv-divider" />

                    <div className="udv-form-section">
                        <h3 className="udv-section-title"><PictureOutlined className="udv-section-icon" /> Document Uploads</h3>
                        <Row gutter={[16, 16]}>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    label="Aadhar Card"
                                    name="aadharCardImage"
                                    validateStatus={editUploadingAadhar ? "validating" : ""}
                                    help={editUploadingAadhar ? "Uploading..." : ""}
                                >
                                    <Upload
                                        name="aadharCard"
                                        listType="picture-card"
                                        fileList={editAadharFileList}
                                        onChange={handleEditAadharUpload}
                                        beforeUpload={() => false}
                                        accept="image/*"
                                        maxCount={1}
                                        className="udv-upload"
                                    >
                                        {editAadharFileList.length < 1 && (
                                            <div className="udv-upload-button">
                                                {editUploadingAadhar ? <Spin size="small" /> : <><UploadOutlined className="udv-upload-icon" /><div className="udv-upload-text">Upload Aadhar</div></>}
                                            </div>
                                        )}
                                    </Upload>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    label="Passport Photo"
                                    name="passportPhoto"
                                    validateStatus={editUploadingPassport ? "validating" : ""}
                                    help={editUploadingPassport ? "Uploading..." : ""}
                                >
                                    <Upload
                                        name="passportPhoto"
                                        listType="picture-card"
                                        fileList={editPassportFileList}
                                        onChange={handleEditPassportUpload}
                                        beforeUpload={() => false}
                                        accept="image/*"
                                        maxCount={1}
                                        className="udv-upload"
                                    >
                                        {editPassportFileList.length < 1 && (
                                            <div className="udv-upload-button">
                                                {editUploadingPassport ? <Spin size="small" /> : <><UploadOutlined className="udv-upload-icon" /><div className="udv-upload-text">Upload Photo</div></>}
                                            </div>
                                        )}
                                    </Upload>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    label="Offer Letter"
                                    name="offerLetter"
                                    validateStatus={editUploadingOffer ? "validating" : ""}
                                    help={editUploadingOffer ? "Uploading..." : ""}
                                >
                                    <Upload
                                        name="offerLetter"
                                        listType="picture-card"
                                        fileList={editOfferLetterFileList}
                                        onChange={handleEditOfferLetterUpload}
                                        beforeUpload={() => false}
                                        accept=".pdf,.doc,.docx"
                                        maxCount={1}
                                        className="udv-upload"
                                    >
                                        {editOfferLetterFileList.length < 1 && (
                                            <div className="udv-upload-button">
                                                {editUploadingOffer ? <Spin size="small" /> : <><FileTextOutlined className="udv-upload-icon" /><div className="udv-upload-text">Upload Letter</div></>}
                                            </div>
                                        )}
                                    </Upload>
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    <div className="udv-form-actions">
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            icon={<CheckCircleOutlined />}
                            className="udv-submit-button"
                            loading={isUpdating}
                            disabled={editUploadingAadhar || editUploadingPassport || editUploadingOffer || isUpdating}
                        >
                            {isUpdating ? 'Updating...' : 'Update Document'}
                        </Button>
                        <Button
                            size="large"
                            onClick={handleEditClose}
                            className="udv-reset-button"
                            disabled={isUpdating}
                        >
                            Cancel
                        </Button>
                    </div>
                </Form>
            </Modal>

            <Modal
                title="Salary Discussion Panel"
                open={salaryModalVisible}
                onCancel={handleSalaryClose}
                footer={null}
                width={800}
                className="udv-modal"
                destroyOnClose
            >
                <div className="udv-salary-discussion-container">
                    {/* User Summary Header */}
                    <div className="udv-salary-summary-card">
                        <Row gutter={[24, 16]} align="middle">
                            <Col xs={24} sm={8}>
                                <div className="udv-summary-stat">
                                    <span className="udv-summary-label">Current Salary</span>
                                    <span className="udv-summary-value large highlight">
                                        ₹{salaryModalUser?.blissSalary?.toLocaleString() || '0'}
                                    </span>
                                </div>
                            </Col>
                            <Col xs={12} sm={8}>
                                <div className="udv-summary-stat">
                                    <span className="udv-summary-label">Department</span>
                                    <span className="udv-summary-value">{salaryModalUser?.department}</span>
                                </div>
                            </Col>
                            <Col xs={12} sm={8}>
                                <div className="udv-summary-stat">
                                    <span className="udv-summary-label">Position</span>
                                    <span className="udv-summary-value">{salaryModalUser?.position}</span>
                                </div>
                            </Col>
                        </Row>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div>
                            <h3 className="udv-section-title small-margin"><CalendarOutlined className="udv-section-icon" /> Salary History</h3>
                            <div className="udv-compact-table-wrapper">
                                <Table
                                    className="udv-table udv-table-small"
                                    dataSource={salaryHistoryList}
                                    columns={[
                                        { title: 'Effective Date', dataIndex: 'effectiveDate', key: 'effectiveDate', render: d => d ? dayjs(d).format('MMM D, YYYY') : '-' },
                                        { title: 'Old Salary', dataIndex: 'oldSalary', key: 'oldSalary', render: v => v ? `₹${Number(v).toLocaleString()}` : '-' },
                                        { title: 'Increment %', dataIndex: 'incrementPercent', key: 'incrementPercent', render: v => v ? <Tag color="blue">{v}%</Tag> : '-' },
                                        { title: 'Amount', dataIndex: 'incrementAmount', key: 'incrementAmount', render: v => v ? <span style={{ color: 'var(--brand-color)', fontWeight: 'bold' }}>+₹{Number(v).toLocaleString()}</span> : '-' },
                                        { title: 'New Salary', dataIndex: 'newSalary', key: 'newSalary', render: v => v ? `₹${Number(v).toLocaleString()}` : '-' },
                                        { title: 'Note', dataIndex: 'note', key: 'note', ellipsis: true }
                                    ]}
                                    rowKey="_id"
                                    pagination={false}
                                    loading={isLoadingHistory}
                                    size="small"
                                    // className="udv-table-small"
                                    scroll={{ x: true }}
                                />
                            </div>
                        </div>

                        <div className="udv-increment-panel">
                            <h3 className="udv-section-title small-margin"><DollarOutlined className="udv-section-icon" /> Increment Salary</h3>
                            <Form
                                form={incrementForm}
                                layout="vertical"
                                onFinish={handleIncrementSalary}
                                onValuesChange={(changed) => {
                                    if (changed.incrementPercent !== undefined) setPreviewPercent(changed.incrementPercent);
                                }}
                                className="udv-form"
                            >
                                {previewPercent > 0 && salaryModalUser?.blissSalary && (
                                    <div className="udv-salary-preview-card">
                                        <div className="preview-row">
                                            <span>New Salary:</span>
                                            <span className="preview-value">₹{(Number(salaryModalUser.blissSalary) * (1 + Number(previewPercent) / 100)).toLocaleString()}</span>
                                        </div>
                                        <div className="preview-row increase">
                                            <span>Increase:</span>
                                            <span>+₹{(Number(salaryModalUser.blissSalary) * (Number(previewPercent) / 100)).toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item label="Increment Percentage (%)" name="incrementPercent" rules={[{ required: true, message: 'Enter %' }]}>
                                            <Input type="number" prefix={<b>%</b>} className="udv-input" placeholder="e.g. 10" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="Effective Date" name="effectiveFrom" rules={[{ required: true, message: 'Select date' }]}>
                                            <DatePicker className="udv-date-picker" style={{ width: '100%' }} />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Form.Item label="Reason / Notes" name="note">
                                    <TextArea rows={3} className="udv-textarea" placeholder="Note..." />
                                </Form.Item>
                                <div style={{ marginTop: 16 }}>
                                    <Button type="primary" htmlType="submit" loading={isIncrementing} block className="udv-submit-button">
                                        Apply Increment
                                    </Button>
                                </div>
                            </Form>
                        </div>
                    </div>
                </div>
            </Modal >
        </div >
    );
};

export default UserDocumentVerification;
