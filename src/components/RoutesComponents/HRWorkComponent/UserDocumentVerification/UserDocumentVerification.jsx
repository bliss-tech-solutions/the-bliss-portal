import React, { useState } from "react";
import { Tabs, Form, Input, Select, DatePicker, Row, Col, Upload, Button, Card, Space, Divider, Spin, Tag, Empty } from "antd";
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
    LinkOutlined
} from "@ant-design/icons";
import { uploadToCloudinary } from "../../../../utils/cloudinary";
import { useCreateUserVerificationDocumentMutation, useGetAllUserVerificationDocumentsQuery } from "../../../../store/api";
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
    const { success, error: showError } = useNotification();

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
                                        <div className="udv-document-card-header">
                                            <div className="udv-document-card-title">
                                                <UserOutlined className="udv-document-card-icon" />
                                                <div>
                                                    <h3>{document.name || 'N/A'}</h3>
                                                    <p className="udv-document-user-id">{document.userId || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <Tag color="blue" className="udv-document-badge">
                                                {document.department || 'N/A'}
                                            </Tag>
                                        </div>

                                        <Divider className="udv-document-divider" />

                                        <div className="udv-document-card-body">
                                            <div className="udv-document-info-row">
                                                <Space>
                                                    <FileTextOutlined className="udv-document-info-icon" />
                                                    <span className="udv-document-info-label">Position:</span>
                                                    <span className="udv-document-info-value">{document.position || 'N/A'}</span>
                                                </Space>
                                            </div>
                                            <div className="udv-document-info-row">
                                                <Space>
                                                    <CalendarOutlined className="udv-document-info-icon" />
                                                    <span className="udv-document-info-label">Joining Date:</span>
                                                    <span className="udv-document-info-value">{joiningDateFormatted}</span>
                                                </Space>
                                            </div>
                                            <div className="udv-document-info-row">
                                                <Space>
                                                    <FileTextOutlined className="udv-document-info-icon" />
                                                    <span className="udv-document-info-label">Job Type:</span>
                                                    <span className="udv-document-info-value">{document.jobType || 'N/A'}</span>
                                                </Space>
                                            </div>
                                            <div className="udv-document-info-row">
                                                <Space>
                                                    <DollarOutlined className="udv-document-info-icon" />
                                                    <span className="udv-document-info-label">Salary:</span>
                                                    <span className="udv-document-info-value">
                                                        ₹{document.beforeBlissSalary ? document.beforeBlissSalary.toLocaleString() : 'N/A'} → ₹{document.blissSalary ? document.blissSalary.toLocaleString() : 'N/A'}
                                                    </span>
                                                </Space>
                                            </div>
                                            <div className="udv-document-info-row">
                                                <Space>
                                                    <BankOutlined className="udv-document-info-icon" />
                                                    <span className="udv-document-info-label">Bank:</span>
                                                    <span className="udv-document-info-value">
                                                        {document.bankDetails?.bankName || 'N/A'} ({document.bankDetails?.accountType || 'N/A'})
                                                    </span>
                                                </Space>
                                            </div>
                                        </div>

                                        <Divider className="udv-document-divider" />

                                        <div className="udv-document-card-footer">
                                            <div className="udv-document-links">
                                                {document.aadharCardImage && (
                                                    <Button
                                                        type="link"
                                                        icon={<EyeOutlined />}
                                                        href={document.aadharCardImage}
                                                        target="_blank"
                                                        className="udv-document-link-button"
                                                    >
                                                        Aadhar
                                                    </Button>
                                                )}
                                                {document.passportPhoto && (
                                                    <Button
                                                        type="link"
                                                        icon={<EyeOutlined />}
                                                        href={document.passportPhoto}
                                                        target="_blank"
                                                        className="udv-document-link-button"
                                                    >
                                                        Passport
                                                    </Button>
                                                )}
                                                {document.offerLetter && (
                                                    <Button
                                                        type="link"
                                                        icon={<EyeOutlined />}
                                                        href={document.offerLetter}
                                                        target="_blank"
                                                        className="udv-document-link-button"
                                                    >
                                                        Offer Letter
                                                    </Button>
                                                )}
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
    ];

    return (
        <div className="udv-container">
            <div className="udv-header">
                <h2 className="udv-title">User Document Verification</h2>
            </div>
            <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                items={tabItems}
                className="udv-tabs"
            />
        </div>
    );
};

export default UserDocumentVerification;