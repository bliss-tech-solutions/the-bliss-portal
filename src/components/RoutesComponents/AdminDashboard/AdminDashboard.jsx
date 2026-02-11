import React from 'react';
import EmployeesData from './EmployeesData/EmployeesData';
import './AdminDashboard.css';
import AdminDashboardNew from './AdminDashboardNew/AdminDashboardNew';
const AdminDashboard = () => {
    return (
        <div className="admin-dashboard-container">
            {/* <EmployeesData /> */}
            <AdminDashboardNew />
        </div>
    );
};

export default AdminDashboard;
