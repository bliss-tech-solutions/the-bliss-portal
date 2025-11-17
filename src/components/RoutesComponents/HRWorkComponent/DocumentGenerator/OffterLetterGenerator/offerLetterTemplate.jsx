import React from 'react';
import dayjs from 'dayjs';
import './offerLetterTemplate.css';

const OfferLetterTemplate = React.forwardRef(({ data = {} }, ref) => {
    // Helper function to format date in DD/MM/YYYY format
    const formatDate = (dateValue, defaultDate) => {
        if (!dateValue) return defaultDate;
        if (dayjs.isDayjs(dateValue)) {
            return dateValue.format('DD/MM/YYYY');
        }
        if (typeof dateValue === 'string' && dateValue) {
            const parsed = dayjs(dateValue);
            return parsed.isValid() ? parsed.format('DD/MM/YYYY') : dateValue;
        }
        return defaultDate;
    };

    // Default data for template preview
    const templateData = {
        offerDate: formatDate(data.offerDate, '01/09/2025'),
        candidateName: data.candidateName || 'Sachin Paadyar',
        designation: data.designation || 'Full Stack Developer',
        location: data.location || 'Ahmedabad',
        dateOfJoining: formatDate(data.dateOfJoining, '01/09/2025'),
        ctc: data.ctc || '₹3.60 LPA',
        officeTiming: data.officeTiming || 'Monday to Saturday, 10:00 AM to 7:00 PM',
        emergencyContact: data.emergencyContact || '',
        currentAddress: data.currentAddress || '',
        hrManager: data.hrManager || 'Grishma Patel',
        companyName: data.companyName || 'The Bliss Group',
        companyAddress: data.companyAddress || '109, 502 Arista Business Space, Opp. Stellar, Sindhubhavan Road, Ahmedabad',
        companyEmail: data.companyEmail || 'hr@theblisssolution.in',
        companyPhone: data.companyPhone || '+91 87348 63549',
    };

    return (
        <div className="offer-letter-template" ref={ref}>
            <div className="offer-letter-page">
                {/* Header Section with Logo and Company Info */}
                <div className="offer-letter-header">
                    <div className="offer-letter-logo">
                        <img
                            src="/Images/TheBlissLogo.png"
                            alt="Bliss Group Logo"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    </div>
                    <div className="offer-letter-company-info">
                        <h1 className="company-name">{templateData.companyName}</h1>
                        <p className="company-address">{templateData.companyAddress}</p>
                        <p className="company-contact">
                            Email: {templateData.companyEmail} | Phone: {templateData.companyPhone}
                        </p>
                    </div>
                </div>

                {/* Date Section */}
                <div className="offer-letter-date">
                    <p><strong>Date:</strong> {templateData.offerDate}</p>
                </div>

                {/* Candidate Name Section */}
                <div className="offer-letter-candidate-name">
                    <p><strong>Candidate Name:</strong> {templateData.candidateName}</p>
                </div>

                {/* Subject */}
                <div className="offer-letter-subject">
                    <p><strong>Subject:</strong> Offer of Employment</p>
                </div>

                {/* Salutation */}
                <div className="offer-letter-salutation">
                    <p>Dear <strong>{templateData.candidateName}</strong>,</p>
                </div>

                {/* Main Content */}
                <div className="offer-letter-content">
                    <p>
                        We are pleased to extend to you an offer of employment with <strong>{templateData.companyName}</strong> for
                        the position of <strong>{templateData.designation}</strong> at our {templateData.location} office. We were
                        impressed with your qualifications and believe you will be a valuable asset to our team.
                    </p>

                    {/* Section 1: Employment Terms */}
                    <div className="offer-letter-section">
                        <h3 className="section-number">1. Employment Terms</h3>
                        <div className="section-content">
                            <p><strong>Date of Joining:</strong> {templateData.dateOfJoining}</p>
                            <p><strong>Designation:</strong> {templateData.designation}</p>
                            <p><strong>Location:</strong> {templateData.location}</p>
                            <p><strong>Yearly CTC:</strong> {templateData.ctc}</p>
                            <p><strong>Office Timing:</strong> {templateData.officeTiming}</p>
                            <p><strong>Work Holiday:</strong> Every 3rd Saturday of the month is a non-working day</p>
                        </div>
                    </div>

                    {/* Section 2: Joining Formalities */}
                    <div className="offer-letter-section">
                        <h3 className="section-number">2. Joining Formalities</h3>
                        <div className="section-content">
                            <p>At the time of joining, please submit the following documents:</p>
                            <ul>
                                <li>Two (2) Xerox copies of Aadhar Card</li>
                                <li>Two (2) Xerox copies of PAN Card</li>
                                <li>Three (3) passport-size photographs</li>
                                <li>One cheque equivalent to 6 months' gross salary as security deposit (not to be encashed unless terms are breached)</li>
                            </ul>
                        </div>
                    </div>

                    {/* Section 3: Resignation & Notice Period */}
                    <div className="offer-letter-section">
                        <h3 className="section-number">3. Resignation & Notice Period</h3>
                        <div className="section-content">
                            <p>After confirmation, the official notice period is 2 months.</p>
                            <p>
                                Resignation must be sent to <strong>{templateData.companyEmail}</strong>. The notice period starts
                                upon official acknowledgment.
                            </p>
                            <p>
                                The security deposit is released only after successful completion of a minimum of one (1) year of
                                continuous service.
                            </p>
                            <p>Employees resigning or terminated before one year are not eligible for security deposit refund.</p>
                            <p>Failure to serve the notice period will result in:</p>
                            <ul>
                                <li>Forfeiture of the security cheque</li>
                                <li>No disbursal of final month's salary</li>
                                <li>No security reimbursement</li>
                            </ul>
                        </div>
                    </div>

                    {/* Section 4: Salary & Benefits */}
                    <div className="offer-letter-section">
                        <h3 className="section-number">4. Salary & Benefits</h3>
                        <div className="section-content">
                            <p>Salary will be credited to your registered bank account on or before the 5th of every month.</p>
                            <p>
                                Security amount will be deducted monthly and returned with 6% annual interest upon resignation.
                            </p>
                            <p>Annual increment approximately 12%, subject to performance.</p>
                            <p>
                                Health insurance cover of ₹1.5 lakhs provided, with spouse coverage available upon submission of
                                required documents.
                            </p>
                            <p>
                                Electronic gadgets (Laptop, Desktop, Mobile) provided by the company must be used strictly for
                                official purposes.
                            </p>
                        </div>
                    </div>

                    {/* Section 5: Leave Policy */}
                    <div className="offer-letter-section">
                        <h3 className="section-number">5. Leave Policy</h3>
                        <div className="section-content">
                            <p>12 paid leaves annually.</p>
                            <p>No sandwich leaves allowed (e.g., before or after public holidays).</p>
                            <p>
                                Apply one week in advance for full-day or multi-day leave; inform at least 3 days prior for
                                half-day leave.
                            </p>
                            <p>Uninformed or short-notice absences will not be considered paid leave.</p>
                        </div>
                    </div>

                    {/* Section 6: Disciplinary Policy */}
                    <div className="offer-letter-section">
                        <h3 className="section-number">6. Disciplinary Policy</h3>
                        <div className="section-content">
                            <p>Unauthorized leave will lead to deduction of double the per-day salary.</p>
                            <p>
                                Absence for 3 consecutive days without intimation may result in immediate termination and
                                forfeiture of final salary and PF.
                            </p>
                            <p>
                                Commitment to clients and team coordination is mandatory for efficient execution of duties.
                            </p>
                        </div>
                    </div>

                    {/* Section 7: Confidentiality & Exclusivity */}
                    <div className="offer-letter-section">
                        <h3 className="section-number">7. Confidentiality & Exclusivity</h3>
                        <div className="section-content">
                            <p>
                                After acceptance, you may not accept another employment offer without completing due resignation
                                formalities.
                            </p>
                            <p>All company information must be treated as strictly confidential.</p>
                            <p>
                                Breach of confidentiality or dual employment is grounds for immediate termination and legal action.
                            </p>
                        </div>
                    </div>

                    {/* Section 8: Acceptance */}
                    <div className="offer-letter-section">
                        <h3 className="section-number">8. Acceptance</h3>
                        <div className="section-content">
                            <p>
                                Please sign and return a copy of this letter as acknowledgment and acceptance of the terms herein.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Closing with Signature */}
                <div className="offer-letter-closing">
                    <p>Warm Regards,</p>
                    <div className="offer-letter-signature">
                        <div className="signature-line"></div>
                        <p className="signature-name">{templateData.hrManager}</p>
                        <p className="signature-title">HR Manager</p>
                        <p className="signature-company">{templateData.companyName}</p>
                    </div>
                </div>

                {/* Candidate Acceptance Section */}
                <div className="candidate-acceptance">
                    <h3 className="acceptance-title">Candidate Acceptance:</h3>
                    <p className="acceptance-statement">
                        I, <strong>{templateData.candidateName}</strong>, accept the offer and agree to the terms and conditions
                        outlined above.
                    </p>
                    <div className="acceptance-fields">
                        <div className="acceptance-field">
                            <span>Name: ____________________</span>
                        </div>
                        <div className="acceptance-field">
                            <span>Emergency Contact No: ____________________</span>
                        </div>
                        <div className="acceptance-field">
                            <span>Current Address: ____________________</span>
                        </div>
                        <div className="acceptance-field">
                            <span>Signature: ____________________</span>
                        </div>
                        <div className="acceptance-field">
                            <span>Date: ____________________</span>
                        </div>
                    </div>
                </div>

                {/* PDF Footer - Appears on every page when PDF is generated */}
                {/* <div className="pdf-page-footer">
                    <div className="pdf-footer-line"></div>
                    <div className="pdf-footer-content">
                        <div className="pdf-footer-phone">
                            <span className="pdf-footer-icon">📞</span>
                            <span className="pdf-footer-text">87348 63549 | 6355 611 632</span>
                        </div>
                        <div className="pdf-footer-email">
                            <span className="pdf-footer-icon">✉</span>
                            <span className="pdf-footer-text">{templateData.companyEmail}</span>
                        </div>
                        <div className="pdf-footer-address">
                            <span className="pdf-footer-icon">📍</span>
                            <span className="pdf-footer-text">{templateData.companyAddress}</span>
                        </div>
                    </div>
                </div> */}
            </div>
        </div>
    );
});

OfferLetterTemplate.displayName = 'OfferLetterTemplate';

export default OfferLetterTemplate;
