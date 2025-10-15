import React, { useRef, useState } from "react";
import "./UserVerificationForm.css";
import { Row, Col, Form, Input, Button, Select, DatePicker, Checkbox, App as AntdApp } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { useAddUserDetailsMutation, useGenerateUserCredentialMutation } from "../../store/api";
import { useSelector } from "react-redux";
import { selectCurrentHeaderLogo, selectTheme } from "../../store/slices/themeSlice";

const UserVerificationForm = () => {
    const { notification, modal } = AntdApp.useApp();
    const [current, setCurrent] = useState(0);
    const [form] = Form.useForm();
    const swiperRef = useRef(null);
    const totalSlides = 4;
    const [addUserDetails, { isLoading }] = useAddUserDetailsMutation();
    const [generateUserCredential] = useGenerateUserCredentialMutation();
    
    // Theme support
    const currentLogo = useSelector(selectCurrentHeaderLogo);
    const theme = useSelector(selectTheme);

    const goPrev = () => swiperRef.current && swiperRef.current.slidePrev();
    const goNext = () => swiperRef.current && swiperRef.current.slideNext();

    return (
        <>
            <div className={`CreateNewUserContainer theme-${theme}`}>
                <div>
                    <Row>
                        <Col lg={12}>
                            <div className="CreateNewUserFormContainer">
                                <div className="CreateNewUserFormContainerInner">
                                    <div>
                                        <div className="CreateNewUserBrandLogo">
                                            <img src={currentLogo} alt="Bliss Portal Logo" />
                                        </div>
                                        <div className="MarginTopMedium">
                                            <h2>See Bliss in Action</h2>
                                            <br />
                                            <p>Lorem ipsum dolor sit amet consectetur, adipisicing elit. Tempora hic dolor nihil, sapiente quae animi porro cumque sint aliquid commodi.</p>
                                        </div>
                                        <div className="SlidesChangeLoginContainer MarginTopMedium">
                                            <Form
                                                form={form}
                                                layout="vertical"
                                                onFinish={async (values) => {
                                                    try {
                                                        const result = await addUserDetails(values).unwrap();
                                                        notification.success({ message: 'Success!', description: 'User details added successfully! Generating credentials...' });
                                                        setTimeout(async () => {
                                                            try {
                                                                const cred = await generateUserCredential({ userId: result?.data?._id }).unwrap();
                                                                const cleanEmail = String(cred?.data?.userEmail || '').replace(/\s+/g, '');
                                                                const userEmail = cleanEmail;
                                                                const userPassword = String(cred?.data?.Password || '');
                                                                modal.success({
                                                                    title: 'Your Credentials Generated',
                                                                    content: (
                                                                        <div style={{ padding: '12px 0' }}>
                                                                            <p><strong>User Email:</strong> {userEmail}</p>
                                                                            <p><strong>Password:</strong> {userPassword}</p>
                                                                            <p style={{ color: '#666', fontSize: 12 }}>Please save these credentials securely.</p>
                                                                        </div>
                                                                    ),
                                                                    width: 480,
                                                                });
                                                                form.resetFields();
                                                            } catch (e) {
                                                                notification.error({ message: 'Error', description: e?.data?.message || 'Failed to generate credentials' });
                                                            }
                                                        }, 4000);
                                                    } catch (err) {
                                                        notification.error({ message: 'Error', description: err?.data?.message || 'Failed to add user details' });
                                                    }
                                                }}
                                            >
                                                <Swiper
                                                    onSwiper={(s) => (swiperRef.current = s)}
                                                    onSlideChange={(s) => setCurrent(s.activeIndex)}
                                                    allowTouchMove={false}
                                                    simulateTouch={false}
                                                    preventClicks={false}
                                                    preventClicksPropagation={false}
                                                >
                                                    <SwiperSlide>
                                                        <>
                                                            <Form.Item label="First name" name="firstName" rules={[{ required: true, message: "Required" }]}>
                                                                <Input placeholder="First name" size="large" />
                                                            </Form.Item>
                                                            <Form.Item label="Last name" name="lastName" rules={[{ required: true, message: "Required" }]}>
                                                                <Input placeholder="Last name" size="large" />
                                                            </Form.Item>
                                                            <Form.Item label="Email" name="email" rules={[{ required: true, type: "email", message: "Valid email required" }]}>
                                                                <Input placeholder="email@example.com" size="large" />
                                                            </Form.Item>
                                                        </>
                                                    </SwiperSlide>
                                                    <SwiperSlide>
                                                        <>
                                                            <Form.Item label="Phone number" name="number" rules={[{ required: true, message: "Required" }]}>
                                                                <Input placeholder="+91 99999 99999" size="large" />
                                                            </Form.Item>
                                                            <Form.Item label="Role" name="role" rules={[{ required: true, message: "Required" }]}>
                                                                <Select placeholder="Select role" size="large">
                                                                    <Select.Option value="Executive">Executive</Select.Option>
                                                                    <Select.Option value="Employee">Employee</Select.Option>
                                                                </Select>
                                                            </Form.Item>
                                                            <Form.Item label="Marital status" name="maritalStatus">
                                                                <Select placeholder="Select status" size="large">
                                                                    <Select.Option value="Single">Single</Select.Option>
                                                                    <Select.Option value="Married">Married</Select.Option>
                                                                    <Select.Option value="Divorced">Divorced</Select.Option>
                                                                    <Select.Option value="Widowed">Widowed</Select.Option>
                                                                </Select>
                                                            </Form.Item>
                                                        </>
                                                    </SwiperSlide>
                                                    <SwiperSlide>
                                                        <>
                                                            <Form.Item label="Birth date" name="birthDate">
                                                                <DatePicker size="large" style={{ width: "100%" }} />
                                                            </Form.Item>
                                                            <Form.Item label="Address" name="address">
                                                                <Input.TextArea rows={3} placeholder="Street, City, State" />
                                                            </Form.Item>
                                                            <Form.Item label="Pincode" name="pincode">
                                                                <Input placeholder="000000" size="large" />
                                                            </Form.Item>
                                                        </>
                                                    </SwiperSlide>
                                                    <SwiperSlide>
                                                        <>
                                                            <Form.Item label="Languages" name="languages">
                                                                <Select mode="multiple" placeholder="Select languages" size="large">
                                                                    <Select.Option value="English">English</Select.Option>
                                                                    <Select.Option value="Hindi">Hindi</Select.Option>
                                                                    <Select.Option value="Marathi">Marathi</Select.Option>
                                                                    <Select.Option value="Gujarati">Gujarati</Select.Option>
                                                                </Select>
                                                            </Form.Item>
                                                            <Form.Item label="Skills" name="skills">
                                                                <Select mode="tags" placeholder="Type skills and press Enter" size="large" />
                                                            </Form.Item>
                                                            <Form.Item name="agree" valuePropName="checked" rules={[{ validator: (_, v) => v ? Promise.resolve() : Promise.reject(new Error('Please agree to continue')) }]}>
                                                                <div className="AgreeToTermsAndConditions MarginTopMedium">
                                                                    <Checkbox /><p>I agree to the terms and conditions</p>
                                                                </div>
                                                            </Form.Item>
                                                        </>
                                                    </SwiperSlide>
                                                </Swiper>
                                            </Form>
                                        </div>
                                        <div className="SlidesControlButtonsAndNavigation MarginTopMedium">
                                            <div className="PrevSlideButton">
                                                <Button onClick={goPrev} disabled={current === 0}>Previous</Button>
                                            </div>
                                            <div className="CurrentSlideNumber">
                                                <div>{current + 1} / {totalSlides}</div>
                                                <div style={{ height: 6, background: "#e5e5e5", borderRadius: 9999, width: 160 }}>
                                                    <div style={{ height: "100%", width: `${((current + 1) / totalSlides) * 100}%`, background: "#111", borderRadius: 9999 }} />
                                                </div>
                                            </div>
                                            <div className="NextSlideButton">
                                                {current === totalSlides - 1 ? (
                                                    <Button type="primary" onClick={() => form.submit()} loading={isLoading} disabled={isLoading}>Submit</Button>
                                                ) : (
                                                    <Button type="primary" onClick={goNext}>Next</Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Col>
                        <Col lg={12}>
                            <div className="UserVerificationFormImage ">
                                <div>
                                    <img src="/Images/userFormImage2.jpg" alt="" />
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>
            </div>
        </>
    );
};

export default UserVerificationForm;
