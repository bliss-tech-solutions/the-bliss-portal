import React, { useState } from "react";
import "./ProfileUpdate.css";
import {
    Row,
    Col,
    Card,
    Form,
    Input,
    Button,
    Upload,
    Avatar,
    Divider,
    Typography,
    Space,
    Switch
} from "antd";
import {
    UserOutlined,
    MailOutlined,
    PhoneOutlined,
    HomeOutlined,
    LockOutlined,
    CameraOutlined,
    EditOutlined,
    SaveOutlined,
    UploadOutlined
} from "@ant-design/icons";
import { useSelector } from "react-redux";
import { selectTheme } from "../../../store/slices/themeSlice";

const { Title, Text } = Typography;

const ProfileUpdate = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [profileImage, setProfileImage] = useState(null);
    const theme = useSelector(selectTheme);

    // Mock current user data - will be replaced with Redux data
    const currentUser = {
        firstName: "Sachin",
        lastName: "Padyar",
        email: "sachinpadyar22@gmail.com",
        userEmail: "sachin3687@blissSolution.com",
        number: "+918308063687",
        address: "Dhule\nDhule",
        pincode: "424307",
        role: "Executive",
        maritalStatus: "Single",
        birthDate: "2025-10-02",
        languages: ["English", "Marathi"],
        skills: ["React", "Node.js", "JavaScript", "Python", "UI/UX", "Project Management"]
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // API call to update profile
            console.log('Profile update data:', values);
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            setLoading(false);
        } catch (error) {
            console.error('Profile update error:', error);
            setLoading(false);
        }
    };

    const handlePasswordChange = async (values) => {
        setLoading(true);
        try {
            // API call to update password
            console.log('Password change data:', values);
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            setLoading(false);
        } catch (error) {
            console.error('Password change error:', error);
            setLoading(false);
        }
    };

    const handleImageUpload = (info) => {
        if (info.file.status === 'done') {
            setProfileImage(info.file.response?.url || URL.createObjectURL(info.file.originFileObj));
        }
    };

    return (
        <div id="ProfileUpdate" className={`profile-update-container theme-${theme}`}>
            <div className="profile-update-header MarginBottomMedium">
                <Title level={2} className="profile-update-title">
                    Profile Settings
                </Title>
                {/* <Text className="profile-update-subtitle">
                    Manage your personal information and account settings
                </Text> */}
            </div>

            <Row gutter={[24, 24]}>
                {/* Left Column - Profile Picture & Security Settings */}
                <Col xs={24} lg={8}>
                    {/* Profile Picture Section */}
                    <Card className="profile-card" title="Profile Picture">
                        <div className="profile-picture-section">
                            <div className="profile-avatar-container">
                                <Avatar
                                    size={120}
                                    src={profileImage || null}
                                    icon={<UserOutlined />}
                                    className="profile-avatar"
                                />
                                <div className="avatar-overlay">
                                    <CameraOutlined />
                                </div>
                            </div>

                            <Upload
                                name="profileImage"
                                listType="text"
                                showUploadList={false}
                                onChange={handleImageUpload}
                                className="profile-upload"
                            >
                                <Button
                                    icon={<UploadOutlined />}
                                    className="upload-button"
                                    type="primary"
                                    ghost
                                >
                                    Change Photo
                                </Button>
                            </Upload>

                            <Text className="upload-hint">
                                JPG, PNG or GIF. Max size 2MB
                            </Text>
                        </div>
                    </Card>

                    {/* Security Settings Section */}
                    <Card className="profile-card" title="Security Settings" style={{ marginTop: 24 }}>
                        <Form
                            layout="vertical"
                            onFinish={handlePasswordChange}
                            className="password-form"
                        >
                            <Form.Item
                                label="Current Password"
                                name="currentPassword"
                                rules={[{ required: true, message: 'Please enter current password' }]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="Enter current password"
                                    size="large"
                                />
                            </Form.Item>

                            <Form.Item
                                label="New Password"
                                name="newPassword"
                                rules={[
                                    { required: true, message: 'Please enter new password' },
                                    { min: 6, message: 'Password must be at least 6 characters' }
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="Enter new password"
                                    size="large"
                                />
                            </Form.Item>

                            <Form.Item
                                label="Confirm New Password"
                                name="confirmPassword"
                                dependencies={['newPassword']}
                                rules={[
                                    { required: true, message: 'Please confirm password' },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('newPassword') === value) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject(new Error('Passwords do not match'));
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="Confirm new password"
                                    size="large"
                                />
                            </Form.Item>

                            <div className="form-actions">
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    icon={<LockOutlined />}
                                    size="large"
                                    className="password-button"
                                    block
                                >
                                    Update Password
                                </Button>
                            </div>
                        </Form>
                    </Card>
                </Col>

                {/* Right Column - Personal Information */}
                <Col xs={24} lg={16}>
                    <Card className="profile-card" title="Personal Information">
                        <Form
                            form={form}
                            layout="vertical"
                            initialValues={currentUser}
                            onFinish={handleSubmit}
                            className="profile-form"
                        >
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        label="First Name"
                                        name="firstName"
                                        rules={[{ required: true, message: 'Please enter first name' }]}
                                    >
                                        <Input
                                            prefix={<UserOutlined />}
                                            placeholder="Enter first name"
                                            size="large"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        label="Last Name"
                                        name="lastName"
                                        rules={[{ required: true, message: 'Please enter last name' }]}
                                    >
                                        <Input
                                            prefix={<UserOutlined />}
                                            placeholder="Enter last name"
                                            size="large"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        label="Email Address"
                                        name="email"
                                        rules={[
                                            { required: true, message: 'Please enter email' },
                                            { type: 'email', message: 'Please enter valid email' }
                                        ]}
                                    >
                                        <Input
                                            prefix={<MailOutlined />}
                                            placeholder="Enter email address"
                                            size="large"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        label="Phone Number"
                                        name="number"
                                        rules={[{ required: true, message: 'Please enter phone number' }]}
                                    >
                                        <Input
                                            prefix={<PhoneOutlined />}
                                            placeholder="Enter phone number"
                                            size="large"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24}>
                                    <Form.Item
                                        label="Address"
                                        name="address"
                                        rules={[{ required: true, message: 'Please enter address' }]}
                                    >
                                        <Input.TextArea
                                            prefix={<HomeOutlined />}
                                            placeholder="Enter your address"
                                            rows={3}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        label="Pincode"
                                        name="pincode"
                                        rules={[{ required: true, message: 'Please enter pincode' }]}
                                    >
                                        <Input
                                            placeholder="Enter pincode"
                                            size="large"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        label="Role"
                                        name="role"
                                    >
                                        <Input
                                            placeholder="Your role"
                                            size="large"
                                            disabled
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider />

                            <div className="form-actions">
                                <Space>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={loading}
                                        icon={<SaveOutlined />}
                                        size="large"
                                        className="save-button"
                                    >
                                        Save Changes
                                    </Button>
                                    <Button
                                        size="large"
                                        onClick={() => form.resetFields()}
                                    >
                                        Reset
                                    </Button>
                                </Space>
                            </div>
                        </Form>
                    </Card>
                </Col>
            </Row>

            {/* Additional Settings - Full Width Bottom */}
            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                <Col xs={24}>
                    <Card className="profile-card" title="Additional Settings">
                        <Row gutter={[24, 24]}>
                            <Col xs={24} sm={12}>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <Title level={5}>Email Notifications</Title>
                                        <Text>Receive email updates about your account</Text>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </Col>
                            <Col xs={24} sm={12}>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <Title level={5}>SMS Notifications</Title>
                                        <Text>Receive SMS updates for important events</Text>
                                    </div>
                                    <Switch />
                                </div>
                            </Col>
                            <Col xs={24} sm={12}>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <Title level={5}>Two-Factor Authentication</Title>
                                        <Text>Add an extra layer of security to your account</Text>
                                    </div>
                                    <Switch />
                                </div>
                            </Col>
                            <Col xs={24} sm={12}>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <Title level={5}>Public Profile</Title>
                                        <Text>Allow others to view your profile information</Text>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ProfileUpdate;