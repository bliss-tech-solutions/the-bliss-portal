import React from 'react';
import EmployeesData from './EmployeesData/EmployeesData';
import './AdminDashboard.css';

const AdminDashboard = () => {
    return (
        <div className="admin-dashboard-container">
            <EmployeesData />
        </div>
    );
};

export default AdminDashboard;
