import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { getCreateAccountAuth } from '../utils/authUtils';

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

// Protected route for CreateNewUser - requires create account authentication
const ProtectedCreateAccountRoute = ({ children }) => {
    const location = useLocation();

    // Check if user has authenticated via create account login
    const isCreateAccountAuthenticated = getCreateAccountAuth();

    // If not authenticated via create account login, redirect to create account login page
    if (!isCreateAccountAuthenticated) {
        return <Navigate to="/create-account-login" state={{ from: location }} replace />;
    }

    return children;
};

export { ProtectedRoute, RedirectIfAuthenticated, ProtectedCreateAccountRoute };
