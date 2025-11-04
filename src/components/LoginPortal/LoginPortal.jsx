import React, { useState } from "react";
import "./LoginPortal.css";
import { Row, Col, Form, Input, Button, Checkbox, Spin } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useSignInUserMutation, useLazyCheckoutStatusQuery } from "../../store/api";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "../../store/slices/authSlice";
import { selectTheme, toggleTheme } from "../../store/slices/themeSlice";
import { useNotification } from "../../contexts/NotificationContext";
import { SunOutlined, MoonOutlined } from "@ant-design/icons";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const LoginPortal = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [signInUser, { isLoading }] = useSignInUserMutation();
    const [triggerCheckoutStatus] = useLazyCheckoutStatusQuery();
    const [loading, setLoading] = useState(false);
    const { success, error } = useNotification();
    const theme = useSelector(selectTheme);
    const isDarkMode = theme === 'dark';

    const handleThemeToggle = () => {
        dispatch(toggleTheme());
    };

    const handleLogin = async (values) => {
        setLoading(true);

        try {
            const { email, password } = values;

            // Check if credentials are provided
            if (!email || !password) {
                error('User credentials not found. Please contact administrator.');
                setLoading(false);
                return;
            }

            const response = await signInUser({
                userEmail: email,
                Password: password
            }).unwrap();

            if (response.success) {
                // After successful sign-in, check today's checkout status
                const userIdFromResponse = response.data?.userId || response.data?._id || response.data?.id;
                if (userIdFromResponse) {
                    try {
                        const status = await triggerCheckoutStatus({ userId: userIdFromResponse }).unwrap();
                        if (status?.checkedOut) {
                            error('You have already checked out today. Please contact the administrator if you need access.');
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                        // If status endpoint fails, allow login (non-blocking)
                    }
                }

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
                    userId: userIdFromResponse,
                    token: response.token || 'authenticated'
                }));

                success('Welcome back! Redirecting to dashboard...');

                setTimeout(() => {
                    navigate('/Dashboard', { replace: true });
                }, 1500);
            } else {
                error(response.message || 'Invalid credentials. Please check your email and password.');
            }
        } catch (error) {
            console.error('Login error:', error);

            if (error.status === 401) {
                error('User credentials not found. Please contact administrator.');
            } else if (error.data?.message) {
                error(error.data.message);
            } else {
                error('An unexpected error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div id="LoginPortal" className={`page-transition theme-${theme} ${loading ? 'fade-out' : ''}`}>
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
                                {/* Theme Toggle Button */}
                                <div className="login-theme-toggle">
                                    <Button
                                        type="text"
                                        icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                                        onClick={handleThemeToggle}
                                        className="login-theme-button"
                                        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                                    >
                                        {isDarkMode ? 'Light' : 'Dark'}
                                    </Button>
                                </div>

                                <div className="LoginPortalFormInnerLogo MarginBottomMedium">
                                    <img src={theme === 'dark' ? "https://the-bliss-solution.vercel.app/Images/BlissLogo/BlissWhiteLogo.png" : "https://the-bliss-solution.vercel.app/Images/BlissLogo/BlissBlacklogo.png"} alt="Bliss Solution Logo" />
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

export default LoginPortal;