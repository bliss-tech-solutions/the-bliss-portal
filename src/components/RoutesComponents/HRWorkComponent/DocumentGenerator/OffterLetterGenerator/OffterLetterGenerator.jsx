import React, { useState, useRef } from 'react';
import { Form, Input, DatePicker, Select, Button, Row, Col, Card, Tabs, message } from 'antd';
import OfferLetterTemplate from './offerLetterTemplate';
import './OffterLetterGenerator.css';
import './offerLetterTemplate.css';
const { TextArea } = Input;

// Dynamic import for html2pdf to avoid module issues
let html2pdf;


const OffterLetterGenerator = () => {
    const [form] = Form.useForm();
    const [formData, setFormData] = useState({});
    const [generating, setGenerating] = useState(false);
    const templateRef = useRef(null);

    const handleFormChange = () => {
        const values = form.getFieldsValue();
        setFormData(values);
    };

    const handleGeneratePDF = async () => {
        try {
            // Validate form
            await form.validateFields();

            setGenerating(true);
            message.loading({ content: 'Generating PDF...', key: 'pdf-generation', duration: 0 });

            // Dynamically import html2pdf
            if (!html2pdf) {
                try {
                    const html2pdfModule = await import('html2pdf.js');
                    // Try different export formats
                    html2pdf = html2pdfModule.default ||
                        html2pdfModule.html2pdf ||
                        html2pdfModule ||
                        window.html2pdf;

                    if (!html2pdf && window.html2pdf) {
                        html2pdf = window.html2pdf;
                    }

                    if (!html2pdf) {
                        throw new Error('html2pdf.js module not found');
                    }
                } catch (importError) {
                    console.error('Failed to import html2pdf:', importError);
                    message.error({
                        content: 'Failed to load PDF library. Please refresh the page and try again.',
                        key: 'pdf-generation',
                        duration: 5
                    });
                    setGenerating(false);
                    return;
                }
            }

            // Wait a bit to ensure template is rendered
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get the template element from ref
            const element = templateRef.current;

            console.log('Template element:', element);

            if (!element) {
                message.error({
                    content: 'Template not found. Please try again.',
                    key: 'pdf-generation',
                    duration: 5
                });
                setGenerating(false);
                return;
            }

            // Get the inner page element for better PDF generation
            const pageElement = element.querySelector('.offer-letter-page') || element;

            // Wait for images to load
            await new Promise(resolve => {
                const images = pageElement.querySelectorAll('img');
                let loadedCount = 0;
                const totalImages = images.length;

                if (totalImages === 0) {
                    resolve();
                    return;
                }

                images.forEach(img => {
                    if (img.complete) {
                        loadedCount++;
                        if (loadedCount === totalImages) resolve();
                    } else {
                        img.onload = () => {
                            loadedCount++;
                            if (loadedCount === totalImages) resolve();
                        };
                        img.onerror = () => {
                            loadedCount++;
                            if (loadedCount === totalImages) resolve();
                        };
                    }
                });

                // Timeout after 5 seconds
                setTimeout(resolve, 5000);
            });

            // Configure PDF options
            // Set margins to match CSS padding for consistent spacing on all pages
            // Margin format: [top, right, bottom, left] in mm
            // CSS padding is: 30px top/left/right (≈10.6mm), 60px bottom (≈21.2mm) for footer space
            const topMarginMM = 10.6; // 30px in mm
            const bottomMarginMM = 21.2; // 60px in mm (footer space)
            const opt = {
                margin: [topMarginMM, topMarginMM, bottomMarginMM, topMarginMM], // Match CSS padding
                filename: `Offer_Letter_${(formData.candidateName || 'Candidate').replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    logging: true,
                    letterRendering: true,
                    backgroundColor: '#ffffff', // White background color
                    // Fixed A4 width: 210mm = 794px at 96dpi (standard browser DPI)
                    // This ensures PDF is consistent across all devices
                    windowWidth: 794,
                    // Don't restrict windowHeight - let html2pdf handle page breaks automatically
                    // windowHeight: pageElement.scrollHeight || 1123
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait',
                    compress: true
                },
                pagebreak: {
                    mode: ['avoid-all', 'css', 'legacy'], // Use all modes for better page break detection
                    before: '.page-break-before',
                    after: '.page-break-after',
                    avoid: ['.offer-letter-header', '.candidate-acceptance'], // Only avoid breaking header and acceptance
                    // Allow lists and list items to break naturally
                    // html2pdf will automatically move content to next page if it doesn't fit
                }
            };

            console.log('Starting PDF generation with options:', opt);
            console.log('Element dimensions:', {
                width: pageElement.scrollWidth,
                height: pageElement.scrollHeight,
                offsetWidth: pageElement.offsetWidth,
                offsetHeight: pageElement.offsetHeight
            });
            console.log('html2pdf function:', typeof html2pdf, html2pdf);

            // Footer removed - no footer processing needed

            // Generate PDF using the page element
            // html2pdf can be a function or an object with a default function
            let worker;
            if (typeof html2pdf === 'function') {
                worker = html2pdf();
            } else if (html2pdf && typeof html2pdf.default === 'function') {
                worker = html2pdf.default();
            } else {
                throw new Error('html2pdf is not a valid function');
            }

            console.log('Starting PDF generation with html2pdf...');

            // Get footer content from form data
            const footerPhone = '87348 63549 | 6355 611 632';
            const footerEmail = formData.companyEmail || 'hr@theblisssolution.in';
            const footerAddress = formData.companyAddress || '109, 502 Arista Business Space, Opp. Stellar, Sindhubhavan Road, Ahmedabad';

            // Generate PDF using html2pdf
            const pdfBlob = await worker.set(opt).from(pageElement).output('blob');

            if (!pdfBlob) {
                throw new Error('Failed to generate PDF blob');
            }

            console.log('PDF blob generated, size:', pdfBlob.size);

            // Load PDF in pdf-lib to add footer to every page
            const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
            const pdfArrayBuffer = await pdfBlob.arrayBuffer();
            const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
            console.log('PDF loaded in pdf-lib');

            // Get all pages
            const pages = pdfDoc.getPages();
            const numPages = pages.length;
            console.log(`Found ${numPages} pages in PDF`);

            // Import standard fonts
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

            // Define colors
            const redColor = rgb(220 / 255, 53 / 255, 69 / 255); // Red color for line
            const textColor = rgb(51 / 255, 51 / 255, 51 / 255); // Dark gray for text

            // A4 dimensions in points
            const pageWidth = 595.28; // A4 width in points
            const pageHeight = 841.89; // A4 height in points

            // Footer configuration - fixed at bottom of every page
            const footerY = 20; // 20 points from bottom for footer content
            const footerMargin = 30; // 30 points margin from edges
            const footerLineY = footerY + 12; // Line positioned above footer text

            // Add footer to each page
            pages.forEach((page, index) => {
                const { width, height } = page.getSize();

                // Footer text configuration
                const fontSize = 8;
                const smallFontSize = 7;
                const textY = footerY;

                // Email text (needed for width calculation)
                const emailText = footerEmail;
                const emailTextWidth = font.widthOfTextAtSize(emailText, fontSize);

                // Address text (needed for splitting)
                const addressText = footerAddress;
                const maxWidth = width - (footerMargin * 2);
                const addressTextWidth = font.widthOfTextAtSize(addressText, smallFontSize);

                // Split address if too long
                let addressLines = [addressText];
                if (addressTextWidth > maxWidth) {
                    const words = addressText.split(' ');
                    const midPoint = Math.ceil(words.length / 2);
                    addressLines = [
                        words.slice(0, midPoint).join(' '),
                        words.slice(midPoint).join(' ')
                    ];
                }

                // Draw red line above footer text
                page.drawLine({
                    start: { x: footerMargin, y: footerLineY },
                    end: { x: width - footerMargin, y: footerLineY },
                    thickness: 1,
                    color: redColor,
                });

                // Phone number (left)
                page.drawText('87348 63549 | 6355 611 632', {
                    x: footerMargin,
                    y: textY,
                    size: fontSize,
                    font: font,
                    color: textColor,
                });

                // Email (right aligned)
                page.drawText(emailText, {
                    x: width - footerMargin - emailTextWidth,
                    y: textY,
                    size: fontSize,
                    font: font,
                    color: textColor,
                });

                // Address lines (below)
                addressLines.forEach((line, lineIndex) => {
                    page.drawText(line, {
                        x: footerMargin,
                        y: textY - 8 - (lineIndex * 8),
                        size: smallFontSize,
                        font: font,
                        color: textColor,
                    });
                });
            });

            // Save the modified PDF with footers
            const finalPdfBytes = await pdfDoc.save();
            const modifiedBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });

            // Download the PDF
            const url = URL.createObjectURL(modifiedBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Offer_Letter_${(formData.candidateName || 'Candidate').replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log(`PDF generation completed successfully with footers on all ${numPages} pages`);

            message.success({
                content: 'PDF generated successfully!',
                key: 'pdf-generation',
                duration: 3
            });
        } catch (error) {
            console.error('PDF Generation Error:', error);
            console.error('Error stack:', error.stack);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);

            if (error.errorFields) {
                message.error({
                    content: 'Please fill all required fields',
                    key: 'pdf-generation',
                    duration: 3
                });
            } else {
                const errorMsg = error.message || error.toString() || 'Unknown error';
                message.error({
                    content: `Failed to generate PDF: ${errorMsg}. Please check browser console for details.`,
                    key: 'pdf-generation',
                    duration: 6
                });
            }
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="offer-letter-generator">
            {/* Hidden template for PDF generation - always rendered */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden' }}>
                <OfferLetterTemplate ref={templateRef} data={formData} />
            </div>

            <Tabs
                defaultActiveKey="form"
                items={[
                    {
                        key: 'form',
                        label: 'Fill Details',
                        children: (
                            <Card>
                                <Form form={form} layout="vertical" onValuesChange={handleFormChange}>
                                    {/* Candidate Details */}
                                    <Row gutter={[16, 16]}>
                                        <Col xs={24} md={12}>
                                            <Form.Item label="Candidate Name" name="candidateName" rules={[{ required: true, message: 'Required' }]} initialValue="Sachin Paadyar">
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
                                            <Form.Item label="Yearly CTC" name="ctc" rules={[{ required: true, message: 'Required' }]} initialValue="₹3.60 LPA">
                                                <Input placeholder="e.g., ₹3.60 LPA" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={24}>
                                            <Form.Item label="Office Timing" name="officeTiming" rules={[{ required: true, message: 'Required' }]} initialValue="Monday to Saturday, 10:00 AM to 7:00 PM">
                                                <Input placeholder="e.g., Monday to Saturday, 10:00 AM to 7:00 PM" />
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

                                    {/* Company Details */}
                                    <Row gutter={[16, 16]}>
                                        <Col xs={24} md={12}>
                                            <Form.Item label="Company Name" name="companyName" initialValue="The Bliss Group">
                                                <Input placeholder="Company name shown in letter" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={12}>
                                            <Form.Item label="Company Address" name="companyAddress" initialValue="109, 502 Arista Business Space, Opp. Stellar, Sindhubhavan Road, Ahmedabad">
                                                <Input placeholder="Full company address" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={12}>
                                            <Form.Item label="Company Email" name="companyEmail" initialValue="hr@theblisssolution.in">
                                                <Input placeholder="Company email address" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={12}>
                                            <Form.Item label="Company Phone" name="companyPhone" initialValue="+91 87348 63549">
                                                <Input placeholder="Company phone number" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={12}>
                                            <Form.Item label="HR Manager Name" name="hrManager" initialValue="Grishma Patel">
                                                <Input placeholder="HR signatory name" />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                                        <Button
                                            type="primary"
                                            onClick={handleGeneratePDF}
                                            loading={generating}
                                            size="large"
                                        >
                                            {generating ? 'Generating PDF...' : 'Generate PDF'}
                                        </Button>
                                    </div>
                                </Form>
                            </Card>
                        )
                    },
                    {
                        key: 'preview',
                        label: 'Preview Template',
                        children: (
                            <div>
                                <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button
                                        type="primary"
                                        onClick={handleGeneratePDF}
                                        loading={generating}
                                        size="large"
                                    >
                                        {generating ? 'Generating PDF...' : 'Generate PDF'}
                                    </Button>
                                </div>
                                <OfferLetterTemplate data={formData} />
                            </div>
                        )
                    }
                ]}
            />
        </div>
    );
};

export default OffterLetterGenerator;


