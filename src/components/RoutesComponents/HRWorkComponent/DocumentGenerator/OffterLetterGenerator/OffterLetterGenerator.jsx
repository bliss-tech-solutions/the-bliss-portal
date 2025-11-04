import React from 'react';
import { Form, Input, DatePicker, Select, Button, Row, Col, Card } from 'antd';
import './OffterLetterGenerator.css';
import './OffterLetterGenerator.css';
const { TextArea } = Input;


const OffterLetterGenerator = () => {
    const [form] = Form.useForm();

    return (
        <div className="offer-letter-generator">
            <Card>
                <Form form={form} layout="vertical">
                    {/* Candidate Details */}
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                            <Form.Item label="Candidate Name" name="candidateName" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="Enter candidate full name" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Offer Date" name="offerDate" rules={[{ required: true, message: 'Required' }]}>
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Employment Terms */}
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                            <Form.Item label="Designation" name="designation" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="e.g., Full Stack Developer" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Location" name="location" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="e.g., Ahmedabad" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Date of Joining" name="dateOfJoining" rules={[{ required: true, message: 'Required' }]}>
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Yearly CTC" name="ctc" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="e.g., 3.60 LPA" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={24}>
                            <Form.Item label="Office Timing" name="officeTiming" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="e.g., Monday to Saturday, 10:00 AM to 7:00 PM (3rd Saturday off)" />
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Contact & Acceptance Section (from template footer) */}
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                            <Form.Item label="Emergency Contact No" name="emergencyContact">
                                <Input placeholder="Optional" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Current Address" name="currentAddress">
                                <Input placeholder="Optional" />
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* HR Signatory */}
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                            <Form.Item label="HR Manager Name" name="hrManager" initialValue="Grishma Patel">
                                <Input placeholder="HR signatory name" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Company Name" name="companyName" initialValue="Bliss Group">
                                <Input placeholder="Company name shown in letter" />
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Additional Notes (maps to bullet sections if needed later) */}
                    <Row gutter={[16, 16]}>
                        <Col xs={24}>
                            <Form.Item label="Additional Notes (optional)" name="notes">
                                <TextArea rows={3} placeholder="Any extra lines to merge in the template later" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="primary" disabled>
                            Generate (coming soon)
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default OffterLetterGenerator;


