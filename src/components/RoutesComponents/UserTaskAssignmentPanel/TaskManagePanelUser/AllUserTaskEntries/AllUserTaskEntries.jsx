import React from 'react';
import TaskEntries from '../../../../CommonComponents/TaskEntries/TaskEntries';

/**
 * AllUserTaskEntries - Wrapper component that uses the common TaskEntries component
 * This maintains backward compatibility while using the shared component
 */
const AllUserTaskEntries = ({
    activeTab = '1',
    searchTerm = '',
    selectedDateRange = null,
    priorityFilter = 'all',
    assignerFilter = 'all',
    refreshKey = 0
}) => {
    return (
        <TaskEntries
            activeTab={activeTab}
            searchTerm={searchTerm}
            selectedDateRange={selectedDateRange}
            priorityFilter={priorityFilter}
            assignerFilter={assignerFilter}
            refreshKey={refreshKey}
            // Changing this key forces TaskEntries to remount
            key={refreshKey}
            // Changing this key forces TaskEntries (and its RTK Query hook) to re-mount and refetch fresh data
            // key={refreshKey}
        />
    );
};

export default AllUserTaskEntries;
