# Dynamic Navigation System with Role-Based Access Control

## Overview
This navigation system provides role-based access control for routes and navigation items. Users will only see navigation items and have access to routes based on their assigned role.

## Supported Roles
- `admin` - Full access to all administrative functions
- `moderator` - Access to moderation and content management
- `user` - Basic user access to personal features

## How to Add New Routes

### 1. Create Your Component
First, create your component in the `RoutesComponents` folder:

```javascript
// src/components/RoutesComponents/MyNewComponent.jsx
import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const MyNewComponent = () => {
    return (
        <div style={{ padding: '24px', background: 'var(--primary-bg)', minHeight: '100vh' }}>
            <Title level={2} style={{ color: 'var(--primary-text)' }}>
                My New Component
            </Title>
            <Card>
                <p>This is my new component content.</p>
            </Card>
        </div>
    );
};

export default MyNewComponent;
```

### 2. Add to Navigation Config
Then, add your route to the navigation configuration:

```javascript
// src/components/Navigation/navigationConfig.js
import MyNewComponent from '../RoutesComponents/MyNewComponent';
import { MyIcon } from '@ant-design/icons';

// Add to navigationConfig array
{
    componentLabelName: "My New Feature",
    icon: MyIcon,
    routeName: "/my-new-feature",
    roles: ["admin"], // Only admin can see this
    component: MyNewComponent
}
```

### 3. Role-Based Access Examples

#### Admin Only:
```javascript
{
    componentLabelName: "Admin Panel",
    icon: SettingOutlined,
    routeName: "/admin-panel",
    roles: ["admin"], // Only admin
    component: AdminPanel
}
```

#### Moderator Only:
```javascript
{
    componentLabelName: "Moderation Tools",
    icon: TeamOutlined,
    routeName: "/moderation",
    roles: ["moderator"], // Only moderator
    component: ModerationTools
}
```

#### Admin and Moderator:
```javascript
{
    componentLabelName: "Content Management",
    icon: FileTextOutlined,
    routeName: "/content",
    roles: ["admin", "moderator"], // Both admin and moderator
    component: ContentManagement
}
```

#### All Roles:
```javascript
{
    componentLabelName: "Profile",
    icon: UserOutlined,
    routeName: "/profile",
    roles: ["admin", "moderator", "user"], // All roles
    component: UserProfile
}
```

## Usage in Components

### Using the Navigation Component
```javascript
import Navigation from '../Navigation/Navigation';

// In your sidebar or layout component
<Navigation />
```

### Checking Route Access
```javascript
import { hasAccessToRoute } from '../Navigation/navigationConfig';

// Check if user has access to a route
const canAccess = hasAccessToRoute('/admin-panel', userRole);
```

### Getting Routes for Current Role
```javascript
import { getNavigationForRole, getAllRoutesForRole } from '../Navigation/navigationConfig';

// Get navigation items for user's role
const navigationItems = getNavigationForRole(userRole);

// Get all routes for routing configuration
const routes = getAllRoutesForRole(userRole);
```

## File Structure
```
src/components/
├── Navigation/
│   ├── navigationConfig.js    # Route configuration
│   ├── Navigation.jsx         # Navigation component
│   └── README.md             # This file
└── RoutesComponents/
    ├── AdminDashboard.jsx     # Admin only
    ├── UserDashboard.jsx      # User only
    ├── ModeratorDashboard.jsx # Moderator only
    ├── Settings.jsx           # All roles
    └── ...                    # Other components
```

## Benefits
- ✅ Role-based access control
- ✅ Easy to add new routes
- ✅ Clean configuration system
- ✅ Type-safe navigation
- ✅ Centralized route management
- ✅ Dynamic menu generation
