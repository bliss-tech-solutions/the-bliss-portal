// Navigation Configuration with Role-Based Access Control
import { DashboardOutlined, UserOutlined } from '@ant-design/icons';
import { BiTask } from "react-icons/bi";

// Import components
import AdminDashboard from '../RoutesComponents/AdminDashboard/AdminDashboard';
import ProfileUpdate from '../PortalCommonComponents/ProfileUpdate/ProfileUpdate';
import ExecutionTaskAssignPanel from '../RoutesComponents/ExecutionTaskAssignPanel/ExecutionTaskAssignPanel';
import UserTaskAssignmentPanel from '../RoutesComponents/UserTaskAssignmentPanel/UserTaskAssignmentPanel';
// Navigation Configuration
export const navigationConfig = [
    // Admin Only Route
    {
        componentLabelName: "Admin Dashboard",
        icon: DashboardOutlined,
        routeName: "/admin-dashboard",
        roles: ["Execution"],
        component: AdminDashboard,
        showInSidebar: true
    },
    // Profile Settings - Available to all roles (hidden from sidebar, accessed via profile dropdown)
    {
        componentLabelName: "Profile Settings",
        icon: UserOutlined,
        routeName: "/profile-settings",
        roles: ["Execution", "admin", "moderator", "user"],
        component: ProfileUpdate,
        showInSidebar: false
    },
    {
        componentLabelName: "Task Assign Panel",
        icon: BiTask,
        routeName: "/execution-task-assign-panel",
        roles: ["Execution"],
        component: ExecutionTaskAssignPanel,
        showInSidebar: true
    },
    {
        componentLabelName: "User Task Assignment Panel",
        icon: BiTask,
        routeName: "/user-task-assignment-panel",
        roles: ["user"],
        component: UserTaskAssignmentPanel,
        showInSidebar: true
    }
];

// Helper function to filter navigation items based on user role (for sidebar)
export const getNavigationForRole = (userRole) => {
    return navigationConfig.filter(item =>
        item.roles.includes(userRole) && item.showInSidebar === true
    );
};

// Helper function to get all routes for role (including hidden routes)
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

// Helper function to get component by route name
export const getComponentByRoute = (routeName) => {
    const route = navigationConfig.find(item => item.routeName === routeName);
    return route ? route.component : null;
};