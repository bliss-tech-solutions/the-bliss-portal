import React from 'react';
import { Menu, Tooltip } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getNavigationForRole } from './navigationConfig';

const Navigation = ({ isCollapsed = true }) => {
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
        label: isCollapsed ? null : item.componentLabelName,
        title: isCollapsed ? item.componentLabelName : undefined, // Tooltip for collapsed state
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
            inlineCollapsed={isCollapsed}
            className={isCollapsed ? 'collapsed-navigation' : 'expanded-navigation'}
        />
    );
};

export default Navigation;
