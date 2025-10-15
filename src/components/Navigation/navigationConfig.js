// Navigation Configuration with Role-Based Access Control
import { DashboardOutlined } from '@ant-design/icons';

// Import AdminDashboard component
import AdminDashboard from '../RoutesComponents/AdminDashboard/AdminDashboard';

// Navigation Configuration
export const navigationConfig = [
    // Admin Only Route
    {
        componentLabelName: "Admin Dashboard",
        icon: DashboardOutlined,
        routeName: "/admin-dashboard",
        roles: ["Executive"],
        component: AdminDashboard
    }
];

// Helper function to filter navigation items based on user role
export const getNavigationForRole = (userRole) => {
    return navigationConfig.filter(item => 
        item.roles.includes(userRole)
    );
};

// Helper function to get all unique routes for role
export const getAllRoutesForRole = (userRole) => {
    return navigationConfig
        .filter(item => item.roles.includes(userRole))
        .map(item => ({
            path: item.routeName,
            element: item.component
        }));
};

// Helper function to check if user has access to specific route
export const hasAccessToRoute = (routeName, userRole) => {
    const route = navigationConfig.find(item => item.routeName === routeName);
    return route ? route.roles.includes(userRole) : false;
};