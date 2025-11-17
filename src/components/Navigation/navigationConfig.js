// Navigation Configuration with Role-Based Access Control
import { DashboardOutlined, UserOutlined } from '@ant-design/icons';
import { BiTask } from "react-icons/bi";
import { SlCalender } from "react-icons/sl";
import { FileTextOutlined } from '@ant-design/icons';
import { FaCalendarAlt } from "react-icons/fa";
import { CalendarOutlined } from '@ant-design/icons';
import { SiGoogleanalytics } from "react-icons/si";

// Import components
import AdminDashboard from '../RoutesComponents/AdminDashboard/AdminDashboard';
import ProfileUpdate from '../PortalCommonComponents/ProfileUpdate/ProfileUpdate';
import ExecutionTaskAssignPanel from '../RoutesComponents/ExecutionTaskAssignPanel/ExecutionTaskAssignPanel';
import UserTaskAssignmentPanel from '../RoutesComponents/UserTaskAssignmentPanel/TaskManagePanelUser/UserTaskAssignmentPanel';
import UserAttendanceData from '../RoutesComponents/HRWorkComponent/UserAttendanceData/UserAttendanceData';
import FestiveCalender from '../RoutesComponents/HRWorkComponent/FestiveCalender/FestiveCalender';
import DocumentGenerator from '../RoutesComponents/HRWorkComponent/DocumentGenerator/DocumentGenerator';
import TaskAndLeaveCalender from '../RoutesComponents/UserTaskAssignmentPanel/TaskAndLeaveCalender/TaskAndLeaveCalender';
// Navigation Configuration

export const navigationConfig = [
    // Admin Only Route
    {
        componentLabelName: "Analytics",
        icon: SiGoogleanalytics,
        routeName: "/admin-dashboard",
        roles: ["admin"],
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
    },
    {
        componentLabelName: "User Attendance Data",
        icon: SlCalender,
        routeName: "/user-attendance-data",
        roles: ["HR"],
        component: UserAttendanceData,
        showInSidebar: true
    },
    {
        componentLabelName: "Festive Calender",
        icon: FaCalendarAlt,
        routeName: "/festive-calender",
        roles: ["HR"],
        component: FestiveCalender,
        showInSidebar: true
    },
    {
        componentLabelName: "Document Generator",
        icon: FileTextOutlined,
        routeName: "/document-generator",
        roles: ["HR"],
        component: DocumentGenerator,
        showInSidebar: true
    },
    {
        componentLabelName: "Task and Leave Calender",
        icon: CalendarOutlined,
        routeName: "/task-and-leave-calender",
        roles: ["user"],
        component: TaskAndLeaveCalender,
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