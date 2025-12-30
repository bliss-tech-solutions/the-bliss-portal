import React, { useState, useEffect } from "react";
import { Table, Button, Drawer, Typography, Tag, Space, Avatar, Spin, Card, Popover, Tooltip } from "antd";
import { HistoryOutlined, UserOutlined, ClockCircleOutlined, DollarCircleOutlined, InfoCircleOutlined, FileExcelOutlined } from "@ant-design/icons";
import { useGetSalaryCalculationQuery, useGetAllUsersSalaryCalculationQuery } from "../../../../store/api";
import XLSX from 'xlsx-js-style';
import "./SalaryManagement.css";

const { Title, Text } = Typography;


// Component to render the history table inside the drawer
const SalaryHistory = ({ userId }) => {
    const { data, isLoading } = useGetSalaryCalculationQuery({ userId });

    const columns = [
        {
            title: 'Month',
            dataIndex: 'month',
            key: 'month',
            render: (text, record) => (
                <Text strong>{record.monthName} {record.year}</Text>
            )
        },
        {
            title: 'Total Days',
            dataIndex: 'totalDaysInMonth',
            key: 'totalDays',
        },
        {
            title: 'Full Leaves',
            key: 'fullLeaves',
            render: (_, record) => {
                const count = record.attendanceSummary?.leaveDeduction?.fullDayLeaves || 0;
                const calc = record.attendanceSummary?.leaveDeduction?.calculation;
                const details = record.attendanceSummary?.leaveDeduction?.fullDayDetails || [];
                return (
                    <Popover
                        content={
                            <div style={{ minWidth: '150px' }}>
                                {calc && (
                                    <div style={{ marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 4 }}>
                                        <Text type="secondary" size="small">Calculation:</Text><br />
                                        <Text strong>{calc}</Text>
                                    </div>
                                )}
                                {details.length > 0 ? (
                                    <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
                                        {details.map((d, i) => <li key={i}><Text size="small">{d}</Text></li>)}
                                    </ul>
                                ) : <Text type="secondary" italic>No date details</Text>}
                            </div>
                        }
                        title="Full Day Leave Details"
                        trigger="hover"
                    >
                        <Tag color={count > 0 ? "error" : "default"} style={{ cursor: 'pointer' }}>
                            {count}
                        </Tag>
                    </Popover>
                );
            }
        },
        {
            title: 'Half Day Leaves',
            key: 'halfDayLeaves',
            render: (_, record) => {
                const count = record.attendanceSummary?.checkInCheckOutHalfDay?.halfDaysCount || 0;
                const calc = record.attendanceSummary?.checkInCheckOutHalfDay?.calculation;
                const details = record.attendanceSummary?.checkInCheckOutHalfDay?.halfDayDetails || [];
                return (
                    <Popover
                        content={
                            <div style={{ minWidth: '150px' }}>
                                {calc && (
                                    <div style={{ marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 4 }}>
                                        <Text type="secondary" size="small">Calculation:</Text><br />
                                        <Text strong>{calc}</Text>
                                    </div>
                                )}
                                {details.length > 0 ? (
                                    <Table
                                        dataSource={details}
                                        pagination={false}
                                        size="small"
                                        columns={[
                                            { title: 'Date', dataIndex: 'date', key: 'date' },
                                            { title: 'In', dataIndex: 'checkIn', key: 'checkIn' },
                                            { title: 'Out', dataIndex: 'checkOut', key: 'checkOut' }
                                        ]}
                                    />
                                ) : <Text type="secondary" italic>No details available</Text>}
                            </div>
                        }
                        title="Half Day Details"
                        trigger="hover"
                    >
                        <Tag color={count > 0 ? "warning" : "default"} style={{ cursor: 'pointer' }}>
                            {count}
                        </Tag>
                    </Popover>
                );
            }
        },
        {
            title: 'PF',
            key: 'pf',
            render: (_, record) => (
                <Text type="danger">₹{(record.attendanceSummary?.providentFund?.pfAmount || 0).toLocaleString()}</Text>
            )
        },
        {
            title: 'Calculation',
            key: 'calculation',
            render: (_, record) => {
                const finalCalc = record.finalPay?.finalCalculation || "";
                const deductionCalc = record.attendanceSummary?.totalDeduction?.calculation || "";
                const totalDeductionAmount = record.attendanceSummary?.totalDeduction?.totalDeductionAmount || 0;

                const tooltipContent = (
                    <div>
                        {deductionCalc && (
                            <div style={{ marginBottom: 4 }}>
                                <Text type="secondary" size="small">Deduction Info:</Text><br />
                                <Text strong>{deductionCalc} = ₹{totalDeductionAmount.toLocaleString()}</Text>
                            </div>
                        )}
                        <div>
                            <Text type="secondary" size="small">Final Calculation:</Text><br />
                            <Text strong>{finalCalc}</Text>
                        </div>
                    </div>
                );

                return (
                    <Tooltip title={tooltipContent}>
                        <Text ellipsis style={{ maxWidth: 150 }}>{finalCalc}</Text>
                    </Tooltip>
                );
            }
        },
        {
            title: 'Net Salary',
            key: 'netSalaryPayable',
            render: (_, record) => {
                const val = record.finalPay?.netSalaryPayable;
                return <Text type="success" strong>₹{val !== undefined ? Number(val).toLocaleString() : '0'}</Text>
            }
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => {
                const status = record.finalPay?.paymentStatus || "Processed";
                return <Tag color="green">{status}</Tag>
            }
        }
    ];

    // Transform backend data to table source
    // The API might return a single salarySummary or a monthlyBreakdown
    const historyData = data?.data?.monthlyBreakdown || (data?.data?.salarySummary ? [data.data.salarySummary] : []);

    return (
        <Table
            columns={columns}
            dataSource={historyData}
            loading={isLoading}
            rowKey={(record) => `${record.month}-${record.year}`}
            pagination={false}
            size="small"
        />
    );
};

const SalaryManagement = () => {
    // Use the new bulk API
    const { data: salaryData, isLoading } = useGetAllUsersSalaryCalculationQuery();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // The API returns { success: true, data: [ ... ] }
    // We want the array in `data`
    const users = salaryData?.data || [];

    const showHistory = (record) => {
        // Construct a user object compatible with what the drawer/history expects
        // The record has userId, name, etc. directly.
        setSelectedUser({
            userId: record.userId,
            name: record.name,
            profileImage: record.profileImage, // Note: The sample JSON didn't show profileImage, might need to handle if missing
            position: record.position
        });
        setDrawerVisible(true);
    };

    const onClose = () => {
        setDrawerVisible(false);
        setSelectedUser(null);
    };

    const handleDownloadExcel = () => {
        if (!users || users.length === 0) return;

        const excelData = users.map(user => {
            const sd = user.salaryData;
            return {
                "Employee Name": user.name,
                "Position": user.position || 'Employee',
                "Month": `${sd?.monthName || ''} ${sd?.year || ''}`,
                "Current Salary": sd?.baseMonthlySalary || 0,
                "Rate Per Day": sd?.salaryRate?.perDaySalary || 0,
                "PF Amount": sd?.attendanceSummary?.providentFund?.pfAmount || 0,
                "Full Leaves": sd?.attendanceSummary?.leaveDeduction?.fullDayLeaves || 0,
                "Half Day Leaves": sd?.attendanceSummary?.checkInCheckOutHalfDay?.halfDaysCount || 0,
                "Total Deductions": sd?.attendanceSummary?.totalDeduction?.totalDeductionAmount || 0,
                "Net Salary Payable": sd?.finalPay?.netSalaryPayable || 0,
                "Status": sd?.finalPay?.paymentStatus || 'Pending'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Set default column widths (Approx 150px)
        const colCount = 11;
        worksheet['!cols'] = Array(colCount).fill({ wch: 22 });

        // Apply styles to the worksheet
        const range = XLSX.utils.decode_range(worksheet['!ref']);

        // Style for "Net Salary Payable" cells (New Column Index 9)
        const netSalaryStyle = {
            fill: { fgColor: { rgb: "EBB236" } },
            font: { bold: true, color: { rgb: "000000" } },
            alignment: { horizontal: "center" },
            border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
            }
        };

        // Style for Headers
        const headerStyle = {
            fill: { fgColor: { rgb: "EBB236" } }, // Same brand color #EBB236
            font: { bold: true, color: { rgb: "000000" } },
            alignment: { horizontal: "center" },
            border: {
                bottom: { style: "medium", color: { rgb: "000000" } },
                top: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
            }
        };

        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_ref = XLSX.utils.encode_cell({ c: C, r: R });
                if (!worksheet[cell_ref]) continue;

                // Apply Header Style
                if (R === 0) {
                    worksheet[cell_ref].s = headerStyle;
                }

                // Apply Net Salary Highlight Style (Now at Column index 9)
                if (C === 9) {
                    worksheet[cell_ref].s = netSalaryStyle;
                }
            }
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Salary Data");

        // Generate filename with current month/year if available
        const latestInfo = users[0]?.salaryData;
        const filename = `Salary_Report_${latestInfo?.monthName || 'Export'}_${latestInfo?.year || ''}.xlsx`;

        XLSX.writeFile(workbook, filename);
    };

    const columns = [
        {
            title: 'Employee',
            key: 'name',
            render: (_, record) => (
                <Space>
                    <Avatar icon={<UserOutlined />} src={record.profileImage} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text strong>{record.name}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{record.userId}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Position',
            dataIndex: 'position',
            key: 'position',
            render: (text) => <Tag color="blue">{text || 'Employee'}</Tag>
        },
        {
            title: 'Base Salary',
            key: 'baseSalary',
            render: (_, record) => {
                const base = record.salaryData?.baseMonthlySalary;
                return <Text>₹{base ? base.toLocaleString() : '0'}</Text>;
            }
        },
        {
            title: 'PF Deduction',
            key: 'pf',
            render: (_, record) => {
                const pf = record.salaryData?.attendanceSummary?.providentFund?.pfAmount;
                return <Text type="danger">₹{pf ? pf.toLocaleString() : '0'}</Text>;
            }
        },
        {
            title: 'Net Salary',
            key: 'netSalary',
            render: (_, record) => {
                const net = record.salaryData?.finalPay?.netSalaryPayable;
                return <Text strong style={{ color: '#52c41a' }}>₹{net ? net.toLocaleString() : '0'}</Text>;
            }
        },
        // {
        //     title: 'Status',
        //     key: 'status',
        //     render: (_, record) => {
        //         const status = record.salaryData?.finalPay?.paymentStatus;
        //         const color = status === 'Salary payable' ? 'green' : 'orange';
        //         return <Tag color={color}>{status || 'Pending'}</Tag>;
        //     }
        // },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="primary"
                    className="global-action-btn"
                    ghost
                    icon={<HistoryOutlined />}
                    onClick={() => showHistory(record)}
                >
                    View History
                </Button>
            )
        }
    ];

    return (
        <div className="salary-management-container">
            <div className="header-section">
                <Title level={3}>Salary Management</Title>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary">Manage and view salary details for all employees</Text>
                    <Button
                        type="primary"
                        icon={<FileExcelOutlined />}
                        onClick={handleDownloadExcel}
                        className="global-action-btn"
                        style={{ backgroundColor: '#217346', borderColor: '#217346' }}
                    >
                        Download Excel Sheet
                    </Button>
                </div>
            </div>

            <Card className="table-card">
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="userId"
                    loading={isLoading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Drawer
                title={
                    <Space>
                        <Avatar src={selectedUser?.profileImage} icon={<UserOutlined />} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <Text strong>{selectedUser?.name}'s Salary History</Text>
                            <Text type="secondary" style={{ fontSize: '12px' }}>{selectedUser?.position}</Text>
                        </div>
                    </Space>
                }
                placement="right"
                width={1000}
                onClose={onClose}
                open={drawerVisible}
            >
                {selectedUser && <SalaryHistory userId={selectedUser.userId} />}
            </Drawer>
        </div>
    );
};

export default SalaryManagement;