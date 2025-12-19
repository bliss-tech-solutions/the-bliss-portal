import React from 'react';
import TaskEntries from '../../../CommonComponents/TaskEntries/TaskEntries';

/**
 * ContentProviderTaskEntries - Task entries component for ContentProvider role
 * Wrapper around the common TaskEntries component with ContentProvider-specific configuration
 */
const ContentProviderTaskEntries = ({
    activeTab = '1',
    searchTerm = '',
    selectedDateRange = null,
    priorityFilter = 'all',
    assignerFilter = 'all',
    userId = null,
    refreshKey = 0
}) => {
    return (
        <TaskEntries
            userId={userId}
            activeTab={activeTab}
            searchTerm={searchTerm}
            selectedDateRange={selectedDateRange}
            priorityFilter={priorityFilter}
            assignerFilter={assignerFilter}
            refreshKey={refreshKey}
            // Changing this key forces TaskEntries to remount
            key={refreshKey}
        />
    );
};

export default ContentProviderTaskEntries;


