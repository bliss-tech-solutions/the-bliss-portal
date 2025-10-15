import React from 'react';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getNavigationForRole } from './navigationConfig';

const Navigation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);

    // Get user role from auth state
    const userRole = user?.role || 'user';

    // Get navigation items filtered by user role
    const navigationItems = getNavigationForRole(userRole);

    // Convert navigation config to Ant Design Menu items
    const menuItems = navigationItems.map(item => ({
        key: item.routeName,
        icon: React.createElement(item.icon),
        label: item.componentLabelName,
    }));

    // Handle menu item click
    const handleMenuClick = ({ key }) => {
        navigate(key);
    };

    return (
        <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
        />
    );
};

export default Navigation;
