import React, { useState } from "react";
import "./LoginPortal.css";
import { Row, Col, Form, Input, Button, Checkbox, Spin, App } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useSignInUserMutation } from "../../store/api";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../../store/slices/authSlice";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const LoginPortal = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [signInUser, { isLoading }] = useSignInUserMutation();
    const [loading, setLoading] = useState(false);
    const { notification } = App.useApp();

    const handleLogin = async (values) => {
        setLoading(true);

        try {
            const { email, password } = values;

            // Check if credentials are provided
            if (!email || !password) {
                notification.error({
                    message: 'Authentication Failed',
                    description: 'User credentials not found. Please contact administrator.',
                    placement: 'topRight',
                    duration: 4.5,
                });
                setLoading(false);
                return;
            }

            const response = await signInUser({
                userEmail: email,
                Password: password
            }).unwrap();

            if (response.success) {
                // Dispatch login success action to update auth state
                dispatch(loginSuccess({
                    user: response.data || { 
                        email: email, 
                        id: response.data?._id,
                        name: response.data?.name || '',
                        firstName: response.data?.firstName || '',
                        lastName: response.data?.lastName || '',
                        role: response.data?.role || '',
                        userEmail: response.data?.userEmail || email
                    },
                    userId: response.data?._id,
                    token: response.token || 'authenticated'
                }));

                notification.success({
                    message: 'Login Successful',
                    description: 'Welcome back! Redirecting to dashboard...',
                    placement: 'topRight',
                    duration: 3,
                });

                // Add a smooth delay before redirect with fade effect
                setTimeout(() => {
                    navigate('/Dashboard', { replace: true });
                }, 1500);
            } else {
                notification.error({
                    message: 'Login Failed',
                    description: response.message || 'Invalid credentials. Please check your email and password.',
                    placement: 'topRight',
                    duration: 4.5,
                });
            }
        } catch (error) {
            console.error('Login error:', error);

            if (error.status === 401) {
                notification.error({
                    message: 'Authentication Failed',
                    description: 'User credentials not found. Please contact administrator.',
                    placement: 'topRight',
                    duration: 4.5,
                });
            } else if (error.data?.message) {
                notification.error({
                    message: 'Login Failed',
                    description: error.data.message,
                    placement: 'topRight',
                    duration: 4.5,
                });
            } else {
                notification.error({
                    message: 'Login Failed',
                    description: 'An unexpected error occurred. Please try again.',
                    placement: 'topRight',
                    duration: 4.5,
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div id="LoginPortal" className={`page-transition ${loading ? 'fade-out' : ''}`}>
            <div>
                <div className="LoginPortalBackgroundOverlay">
                    <img src="/Images/BackgroundOverlay.jpg" alt="" />

                </div>
                <Row>
                    <Col lg={12}>
                        <div className="LoginPortalImage">
                            <div>
                                {/* <img src="/Images/NewImage.jpg" alt="" /> */}
                                <DotLottieReact
                                    src="https://lottie.host/54bb85f1-eb2e-4c52-95b9-f9548e173ffb/unkVxXzT9W.lottie"
                                    loop
                                    autoplay
                                />
                            </div>
                        </div>
                    </Col>
                    <Col lg={12}>
                        <div className="LoginPortalForm">
                            <div className="LoginPortalFormInner">
                                <div className="LoginPortalFormInnerLogo MarginBottomMedium">
                                    <img src="https://the-bliss-solution.vercel.app/Images/BlissLogo/BlissBlacklogo.png" alt="Bliss Solution Logo" />
                                </div>
                                <Form layout="vertical" onFinish={handleLogin}>
                                    <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Enter valid email' }]}>
                                        <Input placeholder="Enter your email address" size="large" />
                                    </Form.Item>
                                    <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Enter password' }]}>
                                        <Input.Password placeholder="Enter password" size="large" />
                                    </Form.Item>
                                    <Form.Item name="agree" valuePropName="checked">
                                        <Checkbox>I acknowledge that I have read and accept the <a href="#">Terms and conditions</a>.</Checkbox>
                                    </Form.Item>
                                    <Form.Item>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            className="LoginSubmitBtn"
                                            size="large"
                                            block
                                            loading={loading || isLoading}
                                            disabled={loading || isLoading}
                                        >
                                            {loading || isLoading ? (
                                                <>
                                                    <Spin size="small" style={{ marginRight: 8 }} />
                                                    Signing in...
                                                </>
                                            ) : (
                                                'Sign in'
                                            )}
                                        </Button>
                                    </Form.Item>
                                    <div className="LoginAltAction">
                                        <span>Don't have an account? </span>
                                        <Link to="/CreateNewUser">Create new account</Link>
                                    </div>
                                </Form>
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>
        </div>
    )
}

// Create the component with App provider
const LoginPortalWithApp = () => {
    return (
        <App>
            <LoginPortal />
        </App>
    );
};

export default LoginPortalWithApp;