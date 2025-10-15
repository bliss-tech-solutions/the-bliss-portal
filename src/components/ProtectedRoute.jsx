import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useSelector((state) => state.auth);
    const location = useLocation();

    // If not authenticated, redirect to login with return url
    if (!isAuthenticated) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return children;
};

// Component for redirecting authenticated users from login page
const RedirectIfAuthenticated = ({ children }) => {
    const { isAuthenticated } = useSelector((state) => state.auth);

    // If authenticated, redirect to dashboard
    if (isAuthenticated) {
        return <Navigate to="/Dashboard" replace />;
    }

    return children;
};

export { ProtectedRoute, RedirectIfAuthenticated };
