import React, { useState, useEffect } from "react";
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
    Switch,
    message
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
import { useSelector, useDispatch } from "react-redux";
import { selectTheme } from "../../../store/slices/themeSlice";
import { selectUser, selectUserId, updateUserProfile } from "../../../store/slices/authSlice";
import { useUpdateUserDetailsMutation } from "../../../store/api";
import { uploadToCloudinary } from "../../../utils/cloudinary";

const { Title, Text } = Typography;

const ProfileUpdate = () => {
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [previewImage, setPreviewImage] = useState(null); // Preview URL for selected image
    const [selectedFile, setSelectedFile] = useState(null); // Selected file to upload
    const dispatch = useDispatch();
    const theme = useSelector(selectTheme);
    const authUser = useSelector((state) => state.auth?.user || {});
    const userId = useSelector(selectUserId) || authUser?._id || authUser?.id;
    const [updateUserDetails] = useUpdateUserDetailsMutation();

    // Initialize profile image from getUserDetails API response - profilePhoto field
    // Initialize state with profilePhoto from authUser if available
    const [profileImage, setProfileImage] = useState(() => {
        const photo = authUser?.profilePhoto || authUser?.profileImage;
        return photo && photo.trim() !== '' ? photo : null;
    });

    // Update profile image when authUser changes (e.g., after API refresh)
    useEffect(() => {
        const photo = authUser?.profilePhoto || authUser?.profileImage;
        if (photo && photo.trim() !== '') {
            setProfileImage(photo);
        } else {
            // Reset to null if no photo available
            setProfileImage(null);
        }
    }, [authUser?.profilePhoto, authUser?.profileImage]);

    const initialValues = {
        firstName: authUser?.firstName || "",
        lastName: authUser?.lastName || "",
        email: authUser?.email || authUser?.userEmail || "",
        userEmail: authUser?.userEmail || "",
        number: authUser?.number || "",
        address: authUser?.address || "",
        pincode: authUser?.pincode || "",
        role: authUser?.role || "",
        maritalStatus: authUser?.maritalStatus || "",
        birthDate: authUser?.birthDate || "",
        languages: authUser?.languages || [],
        skills: authUser?.skills || [],
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
        if (!userId) {
            message.error('User ID not found. Please log in again.');
            return;
        }

        setPasswordLoading(true);
        try {
            const { confirmPassword } = values;
            const currentProfilePhoto = profileImage || authUser?.profilePhoto || '';

            await updateUserDetails({
                userId,
                body: {
                    profilePhoto: currentProfilePhoto,
                    Password: confirmPassword
                }
            }).unwrap();

            message.success('Password updated successfully!');
            passwordForm.resetFields();
        } catch (error) {
            console.error('Password change error:', error);
            message.error(error?.data?.message || error?.message || 'Failed to update password. Please try again.');
        } finally {
            setPasswordLoading(false);
        }
    };

    // Handle file selection - just preview, don't upload yet
    const handleImageSelect = (info) => {
        const file = info.file.originFileObj || info.file;

        if (!file) {
            message.error('No file selected');
            return;
        }

        // Validate file size (2MB max)
        const maxSize = 2 * 1024 * 1024; // 2MB in bytes
        if (file.size > maxSize) {
            message.error('Image size must be less than 2MB');
            return;
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            message.error('Please upload a valid image file (JPG, PNG, or GIF)');
            return;
        }

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setPreviewImage(previewUrl);
        setSelectedFile(file);
    };

    // Handle actual upload when user clicks "Update" button
    const handleUpdateProfilePicture = async () => {
        if (!userId) {
            message.error('User ID not found. Please log in again.');
            return;
        }

        if (!selectedFile) {
            message.error('No file selected');
            return;
        }

        setUploadingImage(true);

        try {
            // Upload to Cloudinary
            const uploadResult = await uploadToCloudinary(selectedFile, 'image');
            const imageUrl = uploadResult.secure_url;

            // Update user profile with the new image URL
            await updateUserDetails({
                userId,
                body: {
                    profilePhoto: imageUrl
                }
            }).unwrap();

            // Update Redux auth state with new profilePhoto so it persists after reload
            dispatch(updateUserProfile({ profilePhoto: imageUrl }));

            // Update profile image state
            setProfileImage(imageUrl);

            // Clear preview and selected file
            if (previewImage) {
                URL.revokeObjectURL(previewImage);
            }
            setPreviewImage(null);
            setSelectedFile(null);

            message.success('Profile picture updated successfully!');
        } catch (error) {
            console.error('Image upload error:', error);
            message.error(error?.data?.message || error?.message || 'Failed to upload profile picture. Please try again.');
        } finally {
            setUploadingImage(false);
        }
    };

    // Handle cancel - remove preview
    const handleCancelPreview = () => {
        if (previewImage) {
            URL.revokeObjectURL(previewImage);
        }
        setPreviewImage(null);
        setSelectedFile(null);
    };

    // Get the current profile photo URL to display
    // Priority: 1. previewImage (selected but not uploaded), 2. profileImage state (uploaded), 3. authUser.profilePhoto (from GET API), 4. authUser.profileImage (fallback)
    const currentProfilePhotoUrl = React.useMemo(() => {
        // First priority: preview image (selected but not yet uploaded)
        if (previewImage) {
            return previewImage;
        }
        // Second priority: newly uploaded image in state
        if (profileImage && profileImage.trim() !== '') {
            return profileImage;
        }
        // Third priority: profilePhoto from authUser (same API response as firstName, lastName)
        if (authUser?.profilePhoto && typeof authUser.profilePhoto === 'string' && authUser.profilePhoto.trim() !== '') {
            return authUser.profilePhoto;
        }
        // Fallback: profileImage for backward compatibility
        if (authUser?.profileImage && typeof authUser.profileImage === 'string' && authUser.profileImage.trim() !== '') {
            return authUser.profileImage;
        }
        return null;
    }, [previewImage, profileImage, authUser?.profilePhoto, authUser?.profileImage]);

    // Cleanup preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewImage) {
                URL.revokeObjectURL(previewImage);
            }
        };
    }, [previewImage]);

    // Debug: Log to verify profilePhoto is in authUser (same as firstName, lastName which work)
    useEffect(() => {
        if (authUser && Object.keys(authUser).length > 0) {
            console.log('ProfileUpdate - Checking authUser data:', {
                'firstName (works)': authUser.firstName,
                'lastName (works)': authUser.lastName,
                'email (works)': authUser.email,
                'profilePhoto exists': !!authUser.profilePhoto,
                'profilePhoto value': authUser.profilePhoto,
                'profileImage state': profileImage,
                'currentProfilePhotoUrl': currentProfilePhotoUrl,
                'All authUser keys': Object.keys(authUser)
            });
        }
    }, [authUser, profileImage, currentProfilePhotoUrl]);

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
                    <Card className="profile-card" title="Profile Picture" bodyStyle={{ padding: '20px' }}>
                        <div className="profile-picture-section">
                            <div className="profile-avatar-container">
                                <Avatar
                                    size={80}
                                    src={currentProfilePhotoUrl}
                                    icon={<UserOutlined />}
                                    className="profile-avatar"
                                    key={currentProfilePhotoUrl || 'default-avatar'}
                                />
                                <div className="avatar-overlay">
                                    <CameraOutlined />
                                </div>
                            </div>

                            <Upload
                                name="profileImage"
                                listType="text"
                                showUploadList={false}
                                onChange={handleImageSelect}
                                beforeUpload={() => false}
                                accept="image/jpeg,image/jpg,image/png,image/gif"
                                className="profile-upload"
                            >
                                <Button
                                    icon={<UploadOutlined />}
                                    className="upload-button"
                                    type="primary"
                                    ghost
                                    size="small"
                                    disabled={uploadingImage || !!previewImage}
                                >
                                    Change Photo
                                </Button>
                            </Upload>

                            <Text className="upload-hint">
                                JPG, PNG or GIF. Max 2MB
                            </Text>

                            {/* Show Update and Cancel buttons when image is selected */}
                            {previewImage && (
                                <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                                    <Button
                                        type="primary"
                                        icon={<SaveOutlined />}
                                        onClick={handleUpdateProfilePicture}
                                        loading={uploadingImage}
                                        disabled={uploadingImage}
                                        // size="small"
                                        className="global-secondary-btn"
                                    >
                                        {uploadingImage ? 'Updating...' : 'Update'}
                                    </Button>
                                    <Button
                                        onClick={handleCancelPreview}
                                        disabled={uploadingImage}
                                        size="small"
                                        className="global-secondary-btn"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Security Settings Section */}
                    <Card className="profile-card" title="Security Settings" style={{ marginTop: 24 }}>
                        <Form
                            form={passwordForm}
                            layout="vertical"
                            onFinish={handlePasswordChange}
                            className="password-form"
                        >
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

                            <Form.Item shouldUpdate>
                                {({ getFieldsValue, getFieldsError }) => {
                                    const values = getFieldsValue();
                                    const errors = getFieldsError(['newPassword', 'confirmPassword']);
                                    const hasErrors = errors.some(field => field.errors.length > 0);
                                    const allFieldsFilled = values.newPassword && values.confirmPassword;
                                    const isFormValid = allFieldsFilled && !hasErrors;

                                    return (
                                        <div className="form-actions">
                                            <Button
                                                type="primary"
                                                htmlType="submit"
                                                loading={passwordLoading}
                                                icon={<LockOutlined />}
                                                size="large"
                                                className="global-secondary-btn"
                                                block
                                                disabled={!isFormValid || passwordLoading}
                                            >
                                                Update Password
                                            </Button>
                                        </div>
                                    );
                                }}
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>

                {/* Right Column - Personal Information */}
                <Col xs={24} lg={16}>
                    <Card className="profile-card" title="Personal Information">
                        <Form
                            form={form}
                            layout="vertical"
                            initialValues={initialValues}
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
                                            disabled
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
                                            disabled
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
                                            disabled
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
                                            disabled
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
                                            disabled
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
                                            disabled
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

                            {/* <div className="form-actions">
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
                            </div> */}
                        </Form>
                    </Card>
                </Col>
            </Row>

            {/* Additional Settings - Full Width Bottom */}
            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                <Col xs={24}>
                    <Card className="profile-card" title="Additional Settings (Coming Soon)">
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