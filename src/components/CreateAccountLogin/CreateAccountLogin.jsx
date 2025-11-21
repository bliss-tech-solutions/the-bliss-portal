import React, { useState, useEffect } from "react";
import { Row, Col, Form, Input, Button, Card, Space } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { UserOutlined, LockOutlined, LeftOutlined, SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { selectTheme, toggleTheme } from "../../store/slices/themeSlice";
import { useSignInCreateAccountMutation } from "../../store/api";
import { useNotification } from "../../contexts/NotificationContext";
import { setCreateAccountAuth } from "../../utils/authUtils";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import "./CreateAccountLogin.css";

const CORRECT_SEQUENCE = ['B', 'M', 'M', 'P', 'K'];

const CreateAccountLogin = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [form] = Form.useForm();
    const [letters, setLetters] = useState([]);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const theme = useSelector(selectTheme);
    const isDarkMode = theme === 'dark';

    const [signInCreateAccount, { isLoading: isSigningIn }] = useSignInCreateAccountMutation();
    const { success, error: showError } = useNotification();

    // Initialize letters in random order
    useEffect(() => {
        const shuffled = [...CORRECT_SEQUENCE].sort(() => Math.random() - 0.5);
        setLetters(shuffled);
    }, []);

    const handleThemeToggle = () => {
        dispatch(toggleTheme());
    };

    // Check if letters are in correct sequence
    const isSequenceCorrect = (letterArray = letters) => {
        return letterArray.every((letter, index) => letter === CORRECT_SEQUENCE[index]);
    };

    // Drag and Drop Handlers
    const handleDragStart = (index) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (dropIndex) => {
        if (draggedIndex === null || draggedIndex === dropIndex) return;

        const newLetters = [...letters];
        const [draggedLetter] = newLetters.splice(draggedIndex, 1);
        newLetters.splice(dropIndex, 0, draggedLetter);

        setLetters(newLetters);
        setDraggedIndex(null);

        // Check if correct after rearrangement
        if (isSequenceCorrect(newLetters)) {
            success('Correct sequence!');
        }
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleLogin = async (values) => {
        // Validate quiz sequence
        if (!isSequenceCorrect()) {
            showError('Please arrange the letters in the correct sequence');
            return;
        }

        try {
            const { email, password } = values;

            // Check if credentials are provided
            if (!email || !password) {
                showError('Please enter both email and password');
                return;
            }

            // Convert arranged letters array to string (e.g., "BMMPK")
            const codeNo = letters.join('');

            // Sign in with credentials and code (POST request)
            const signInResponse = await signInCreateAccount({
                CodeNo: codeNo,
                Email: email,
                Password: password
            }).unwrap();

            // Check if credentials are correct
            if (signInResponse.success || signInResponse) {
                // Set create account auth state to allow access to CreateNewUser
                setCreateAccountAuth();
                
                success('Credentials verified successfully! Redirecting...');
                
                // Redirect to CreateNewUser after successful verification
                setTimeout(() => {
                    navigate('/CreateNewUser', { replace: true });
                }, 500);
            } else {
                showError(signInResponse.message || 'Invalid credentials. Please check your email and password.');
            }
        } catch (error) {
            console.error('Create account login error:', error);
            
            if (error.status === 401) {
                showError('Invalid credentials. Please check your email and password.');
            } else if (error.data?.message) {
                showError(error.data.message);
            } else {
                showError('Failed to verify credentials. Please try again.');
            }
        }
    };

    const shuffleLetters = () => {
        const shuffled = [...CORRECT_SEQUENCE].sort(() => Math.random() - 0.5);
        setLetters(shuffled);
    };

    return (
        <div id="CreateAccountLogin" className={`theme-${theme}`}>
            <div>
                <div className="CreateAccountLoginBackgroundOverlay">
                    <img src="/Images/BackgroundOverlay.jpg" alt="" />
                </div>
                <Row>
                    <Col lg={12}>
                        <div className="CreateAccountLoginImage">
                            <div>
                                <DotLottieReact
                                    src="https://lottie.host/54bb85f1-eb2e-4c52-95b9-f9548e173ffb/unkVxXzT9W.lottie"
                                    loop
                                    autoplay
                                />
                            </div>
                        </div>
                    </Col>
                    <Col lg={12}>
                        <div className="CreateAccountLoginForm">
                            <div className="CreateAccountLoginFormInner">
                                {/* Theme Toggle and Back Button */}
                                <div className="create-account-login-header">
                                    {/* <Link to="/" className="create-account-back-button">
                                        <LeftOutlined />
                                        <span>Back to Login</span>
                                    </Link> */}
                                    {/* <Button
                                        type="text"
                                        icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                                        onClick={handleThemeToggle}
                                        className="create-account-theme-button"
                                    >
                                        {isDarkMode ? 'Light' : 'Dark'}
                                    </Button> */}
                                </div>

                                <div className="CreateAccountLoginFormInnerLogo MarginBottomMedium">
                                    <img
                                        src={theme === 'dark'
                                            ? "https://the-bliss-solution.vercel.app/Images/BlissLogo/BlissWhiteLogo.png"
                                            : "https://the-bliss-solution.vercel.app/Images/BlissLogo/BlissBlacklogo.png"
                                        }
                                        alt="Bliss Solution Logo"
                                    />
                                </div>

                                <Form layout="vertical" onFinish={handleLogin} form={form}>
                                    <Form.Item
                                        label="Email"
                                        name="email"
                                        rules={[
                                            { required: true, message: 'Please enter your email' },
                                            { type: 'email', message: 'Please enter a valid email' }
                                        ]}
                                    >
                                        <Input
                                            prefix={<UserOutlined />}
                                            placeholder="Enter your email address"
                                            size="large"
                                            className="create-account-input"
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        label="Password"
                                        name="password"
                                        rules={[
                                            { required: true, message: 'Please enter your password' },
                                            { min: 6, message: 'Password must be at least 6 characters' }
                                        ]}
                                    >
                                        <Input.Password
                                            prefix={<LockOutlined />}
                                            placeholder="Enter your password"
                                            size="large"
                                            className="create-account-input"
                                        />
                                    </Form.Item>

                                    {/* Letter Rearrangement Quiz */}
                                    <Form.Item
                                        label="Security Quiz"
                                        required
                                        help="Rearrange the letters in the correct sequence"
                                    >
                                        <Card className="create-account-quiz-card">
                                            <div className="create-account-quiz-container">
                                                <div className="create-account-quiz-instructions">
                                                    <p>Bliss leads; others follow in a non-sequential dance of four.</p>
                                                </div>
                                                <div className="create-account-quiz-letters">
                                                    {letters.map((letter, index) => {
                                                        const isCorrect = letter === CORRECT_SEQUENCE[index];
                                                        return (
                                                            <div
                                                                key={`${letter}-${index}`}
                                                                className={`create-account-letter-box ${draggedIndex === index ? 'dragging' : ''} ${isCorrect ? 'correct' : ''}`}
                                                                draggable
                                                                onDragStart={() => handleDragStart(index)}
                                                                onDragOver={handleDragOver}
                                                                onDrop={() => handleDrop(index)}
                                                                onDragEnd={handleDragEnd}
                                                            >
                                                                {letter}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <Button
                                                    type="link"
                                                    onClick={shuffleLetters}
                                                    className="create-account-shuffle-button"
                                                >
                                                    Shuffle Letters
                                                </Button>
                                            </div>
                                        </Card>
                                    </Form.Item>

                                    <Form.Item>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            className="create-account-submit-btn"
                                            size="large"
                                            block
                                            loading={isSigningIn}
                                            disabled={isSigningIn || !isSequenceCorrect()}
                                        >
                                            {isSigningIn ? 'Verifying...' : 'Continue to Create Account'}
                                        </Button>
                                    </Form.Item>

                                    <div className="create-account-login-alt-action">
                                        <span>Already have an account? </span>
                                        <Link to="/">Sign in here</Link>
                                    </div>
                                </Form>
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>
        </div>
    );
};

export default CreateAccountLogin;
