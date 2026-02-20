import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: import.meta.env.VITE_API_BASE_URL,
        credentials: 'include',
    }),
    tagTypes: ['User', 'UserData', 'Tasks', 'UserDocuments', 'Teams', 'GlobalChat', 'SalaryHistory', 'Clients', 'Leaves', 'CheckInStatus', 'DailyWorking', 'RealEstateProjects'],
    endpoints: (builder) => ({
        incrementSalary: builder.mutation({
            query: ({ userId, body }) => ({
                url: `/api/userverificationdocuments/incrementSalary/${userId}`,
                method: 'PATCH',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['UserDocuments', 'SalaryHistory'],
        }),
        getSalaryHistory: builder.query({
            query: (userId) => ({
                url: `/api/userverificationdocuments/salaryHistory/${userId}`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            providesTags: ['SalaryHistory'],
        }),
        createLeave: builder.mutation({
            query: (body) => ({
                url: '/api/leave/request',
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['Leaves'],
        }),
        getUserLeaves: builder.query({
            query: (userId) => ({
                url: `/api/leave/getAll/${userId}`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            providesTags: ['Leaves'],
            async onCacheEntryAdded(arg, { cacheDataLoaded, cacheEntryRemoved, dispatch }) {
                const { getSocket } = await import('../utils/socket');
                const socket = getSocket();
                if (!socket) return;

                const handleUpdate = () => dispatch(api.util.invalidateTags(['Leaves']));

                try {
                    await cacheDataLoaded;
                    socket.on('leave:requested', handleUpdate);
                    socket.on('leave:updated', handleUpdate);
                    socket.on('leave:deleted', handleUpdate);
                    socket.on('leave-updated', handleUpdate);
                    socket.on('leave-requested', handleUpdate);
                } catch { }

                await cacheEntryRemoved;
                socket.off('leave:requested', handleUpdate);
                socket.off('leave:updated', handleUpdate);
                socket.off('leave:deleted', handleUpdate);
                socket.off('leave-updated', handleUpdate);
                socket.off('leave-requested', handleUpdate);
            },
        }),
        getAllLeaves: builder.query({
            query: () => ({
                url: '/api/leave/getAllLeaves',
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            providesTags: ['Leaves'],
            async onCacheEntryAdded(arg, { cacheDataLoaded, cacheEntryRemoved, dispatch }) {
                const { getSocket } = await import('../utils/socket');
                const socket = getSocket();
                if (!socket) return;

                const handleUpdate = () => dispatch(api.util.invalidateTags(['Leaves']));

                try {
                    await cacheDataLoaded;
                    socket.on('leave:requested', handleUpdate);
                    socket.on('leave:updated', handleUpdate);
                    socket.on('leave:deleted', handleUpdate);
                    socket.on('leave-updated', handleUpdate);
                    socket.on('leave-requested', handleUpdate);
                } catch { }

                await cacheEntryRemoved;
                socket.off('leave:requested', handleUpdate);
                socket.off('leave:updated', handleUpdate);
                socket.off('leave:deleted', handleUpdate);
                socket.off('leave-updated', handleUpdate);
                socket.off('leave-requested', handleUpdate);
            },
        }),
        // HR: approve/reject specific dates within a leave
        rejectLeave: builder.mutation({
            query: ({ userId, month, leaveId, body }) => ({
                url: `/api/leave/reject/${userId}/${month}/${leaveId}`,
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['Leaves'],
        }),
        addFestiveNote: builder.mutation({
            query: (body) => ({
                url: '/api/festive/note',
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
        }),
        updateFestive: builder.mutation({
            query: (body) => ({
                url: '/api/festive/note',
                method: 'PUT',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
        }),
        deleteFestiveNote: builder.mutation({
            query: ({ date, noteId }) => ({
                url: `/api/festive/note/${date}/${noteId}`,
                method: 'DELETE',
            }),
        }),
        getFestiveNotesByUser: builder.query({
            query: (userId) => ({
                url: `/api/festive/user/${userId}`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
        }),
        checkIn: builder.mutation({
            query: (body) => ({
                url: '/api/checkin',
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['CheckInStatus'],
        }),
        checkout: builder.mutation({
            query: (body) => ({
                url: '/api/checkout',
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['CheckInStatus'],
        }),
        checkInStatus: builder.query({
            // Expect backend to return { checkedIn: boolean, timestamp?: string }
            query: ({ userId }) => ({
                url: `/api/checkin/status?userId=${encodeURIComponent(userId)}`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            providesTags: ['CheckInStatus'],
        }),
        checkoutStatus: builder.query({
            // Expect backend to return { checkedOut: boolean, timestamp?: string }
            query: ({ userId }) => ({
                url: `/api/checkout/status?userId=${encodeURIComponent(userId)}`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
        }),
        addUserDetails: builder.mutation({
            query: (body) => ({
                url: '/api/addUserDetails',
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['User'],
        }),
        generateUserCredential: builder.mutation({
            query: (body) => ({
                url: '/api/generateUserCredential',
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
        }),
        signInUser: builder.mutation({
            query: (credentials) => ({
                url: '/api/signIn',
                method: 'POST',
                body: credentials,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['User'],
        }),
        // User-specific data endpoints
        getUserData: builder.query({
            query: (userId) => ({
                url: `/api/user/${userId}/data`,
                headers: { 'Authorization': `Bearer ${userId}` },
            }),
            providesTags: ['UserData'],
        }),
        addUserData: builder.mutation({
            query: ({ userId, data }) => ({
                url: `/api/user/${userId}/data`,
                method: 'POST',
                body: data,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userId}`
                },
            }),
            invalidatesTags: ['UserData'],
        }),
        updateUserData: builder.mutation({
            query: ({ userId, dataId, data }) => ({
                url: `/api/user/${userId}/data/${dataId}`,
                method: 'PUT',
                body: data,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userId}`
                },
            }),
            invalidatesTags: ['UserData'],
        }),
        deleteUserData: builder.mutation({
            query: ({ userId, dataId }) => ({
                url: `/api/user/${userId}/data/${dataId}`,
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${userId}` },
            }),
            invalidatesTags: ['UserData'],
        }),
        addTaskAssign: builder.mutation({
            query: (body) => ({
                url: '/api/addtaskassign',
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['Tasks'],
        }),
        updateTaskAssign: builder.mutation({
            query: ({ taskId, body }) => ({
                url: `/api/addtaskassign/${taskId}`,
                method: 'PUT',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['Tasks'],
        }),
        getSuggestedSlots: builder.query({
            query: ({ receiverUserId, slotDate } = {}) => {
                const params = new URLSearchParams();
                if (receiverUserId) params.append('receiverUserId', receiverUserId);
                if (slotDate) params.append('slotDate', slotDate);
                const queryString = params.toString();
                return {
                    url: `/api/availability${queryString ? `?${queryString}` : ''}`,
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                };
            },
        }),
        getTaskAssign: builder.query({
            query: (userId) => ({
                url: `/api/getTaskAssign/${userId}?isArchived=false`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            providesTags: ['Tasks'],
        }),
        getTaskAssignByDate: builder.query({
            query: ({ userId, date }) => {
                const params = new URLSearchParams();
                if (userId) params.append('userId', userId);
                if (date) params.append('date', date);
                const queryString = params.toString();
                return {
                    url: `/api/getTaskAssignByDate${queryString ? `?${queryString}` : ''}`,
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                };
            },
            providesTags: ['Tasks'],
        }),
        archiveTask: builder.mutation({
            query: (taskId) => ({
                url: `/api/addtaskassign/${taskId}/archive`,
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['Tasks'],
        }),
        updateTaskStatus: builder.mutation({
            query: ({ taskId, status = 'completed' }) => ({
                url: `/api/addtaskassign/${taskId}/status`,
                method: 'PUT',
                body: { taskStatus: status },
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['Tasks'],
        }),
        requestTaskExtension: builder.mutation({
            query: ({ taskId, slotId, body }) => ({
                url: `/api/addtaskassign/${taskId}/slots/${slotId}/request-extension`,
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['Tasks'],
        }),
        respondTaskExtension: builder.mutation({
            query: ({ taskId, slotId, extensionId, body }) => ({
                url: `/api/addtaskassign/${taskId}/slots/${slotId}/extensions/${extensionId}/respond`,
                method: 'PUT',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['Tasks'],
        }),
        // Create chat message with sender and receiver
        addTaskChat: builder.mutation({
            query: ({ taskId, senderId, receiverId, userName, message, time }) => ({
                url: '/api/chat/messages',
                method: 'POST',
                body: {
                    taskId,
                    senderId,      // ✅ Logged-in user (sender)
                    receiverId,    // ✅ Task receiver (from position selection)
                    userName,
                    message,
                    time
                },
                headers: { 'Content-Type': 'application/json' },
            }),
        }),

        // Get chat messages by task (matches your backend)
        getTaskChatMessages: builder.query({
            query: (taskId) => ({
                url: `/api/chat/messages?taskId=${taskId}`,
                method: 'GET',
            }),
            providesTags: ['TaskChat'],
        }),

        // Get chat messages by user
        getUserChatMessages: builder.query({
            query: (userId) => ({
                url: `/api/chat/messages/user/${userId}`,
                method: 'GET',
            }),
            providesTags: ['TaskChat'],
        }),

        // Global Chat - Create a new global chat message
        addGlobalChat: builder.mutation({
            query: ({ senderId, senderName, senderEmail, message, messageType, time }) => ({
                url: '/api/globalchat/messages',
                method: 'POST',
                body: {
                    senderId,
                    senderName,
                    senderEmail: senderEmail || '',
                    message,
                    messageType: messageType || 'text',
                    time
                },
                headers: { 'Content-Type': 'application/json' },
            }),
        }),

        // Global Chat - Get all global chat messages (with pagination)
        getGlobalChatMessages: builder.query({
            query: ({ limit = 100, skip = 0, sort = 'asc' } = {}) => ({
                url: `/api/globalchat/messages?limit=${limit}&skip=${skip}&sort=${sort}`,
                method: 'GET',
            }),
            providesTags: ['GlobalChat'],
        }),

        // Global Chat - Get recent messages (last N messages)
        getRecentGlobalChatMessages: builder.query({
            query: ({ count = 50 } = {}) => ({
                url: `/api/globalchat/messages/recent?count=${count}`,
                method: 'GET',
            }),
            providesTags: ['GlobalChat'],
        }),

        // Global Chat - Archive/Delete message
        archiveGlobalChatMessage: builder.mutation({
            query: ({ messageId, userId, archived = true }) => ({
                url: '/api/globalchat/messages/archive',
                method: 'POST',
                body: { messageId, userId, archived },
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['GlobalChat'],
        }),

        // Get all users
        getAllUsers: builder.query({
            query: () => ({
                url: '/api/getUserDetails',
                method: 'GET',
            }),
            providesTags: ['Users'],
        }),
        // Get analytics overview
        getAnalyticsOverview: builder.query({
            query: () => ({
                url: '/api/analytics/overview',
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            providesTags: ['Analytics'],
        }),
        // Get user-wise analytics
        getUserWiseAnalytics: builder.query({
            query: (userId) => ({
                url: `/api/analytics/userwise/${userId}`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            providesTags: ['Analytics', 'User'],
        }),
        getDashboardAnalysis: builder.query({
            query: () => ({
                url: '/api/dashboard/analysis',
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                responseHandler: (response) => response.text(),
            }),
            transformResponse: (response) => {
                try {
                    // Split by newline and parse each line as JSON
                    const objects = response.split('\n')
                        .filter(line => line.trim() !== '')
                        .map(line => {
                            try {
                                return JSON.parse(line);
                            } catch (e) {
                                console.error('Error parsing line:', line, e);
                                return null;
                            }
                        })
                        .filter(item => item !== null);

                    // Find and return the summary object
                    return objects.find(item => item.type === 'summary') || {};
                } catch (error) {
                    console.error('Error parsing dashboard analysis response:', error);
                    return {};
                }
            },
            providesTags: ['Analytics'],
        }),
        clearDashboardCache: builder.mutation({
            query: () => ({
                url: '/api/dashboard/cache',
                method: 'DELETE',
            }),
            invalidatesTags: ['Analytics'],
        }),
        getAllCheckins: builder.query({
            query: (params) => {
                const queryString = new URLSearchParams(params).toString();
                return {
                    url: `/api/checkin/all${queryString ? `?${queryString}` : ''}`,
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                };
            },
        }),
        getCheckinAnalysis: builder.query({
            query: (params) => {
                const queryString = new URLSearchParams(params).toString();
                return {
                    url: `/api/checkin/analysis${queryString ? `?${queryString}` : ''}`,
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                };
            },
        }),
        createUserVerificationDocument: builder.mutation({
            query: (body) => ({
                url: '/api/userverificationdocuments/create',
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['UserDocuments'],
        }),
        updateUserVerificationDocument: builder.mutation({
            query: ({ userId, body }) => ({
                url: `/api/userverificationdocuments/updateByUserId/${userId}`,
                method: 'PUT',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['UserDocuments'],
        }),
        getAllUserVerificationDocuments: builder.query({
            query: () => ({
                url: '/api/userverificationdocuments/getAll',
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            providesTags: ['UserDocuments'],
        }),
        checkCreateAccountSignIn: builder.query({
            query: () => ({
                url: '/api/createaccountsignin/check',
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
        }),
        signInCreateAccount: builder.mutation({
            query: (body) => ({
                url: '/api/createaccountsignin/signin',
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
        }),
        createClient: builder.mutation({
            query: (body) => ({
                url: '/api/clientmanagement/create',
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['Clients'],
        }),
        getAllClients: builder.query({
            query: () => ({
                url: '/api/clientmanagement/getAllClientsData',
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            providesTags: ['Clients'],
            async onCacheEntryAdded(
                arg,
                { cacheDataLoaded, cacheEntryRemoved, dispatch }
            ) {
                const { getSocket } = await import('../utils/socket');
                const socket = getSocket();
                if (!socket) return;

                const handleUpdate = () => {
                    dispatch(api.util.invalidateTags(['Clients']));
                };

                try {
                    await cacheDataLoaded;
                    socket.on('client:created', handleUpdate);
                    socket.on('client:updated', handleUpdate);
                    socket.on('client:deleted', handleUpdate);
                    socket.on('client:change', handleUpdate);
                    socket.on('client:attachment:added', handleUpdate);
                } catch { }

                await cacheEntryRemoved;
                socket.off('client:created', handleUpdate);
                socket.off('client:updated', handleUpdate);
                socket.off('client:deleted', handleUpdate);
                socket.off('client:change', handleUpdate);
                socket.off('client:attachment:added', handleUpdate);
            },
        }),
        getClientsByUserId: builder.query({
            query: (userId) => ({
                url: `/api/clientmanagement/getClientsByUserId/${userId}`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            providesTags: (result, error, userId) => [
                { type: 'Clients', id: userId },
                { type: 'Clients', id: 'LIST' }
            ],
            async onCacheEntryAdded(
                arg,
                { cacheDataLoaded, cacheEntryRemoved, dispatch }
            ) {
                const { getSocket } = await import('../utils/socket');
                const socket = getSocket();
                if (!socket) return;

                const handleUpdate = () => {
                    dispatch(api.util.invalidateTags([{ type: 'Clients', id: arg }]));
                    dispatch(api.util.invalidateTags([{ type: 'Clients', id: 'LIST' }]));
                };

                try {
                    await cacheDataLoaded;
                    socket.on('client:created', handleUpdate);
                    socket.on('client:updated', handleUpdate);
                    socket.on('client:deleted', handleUpdate);
                    socket.on('client:change', handleUpdate);
                    // Also refresh client list when an attachment is added, 
                    // as it might affect some counts or last updated status
                    socket.on('client:attachment:added', handleUpdate);
                } catch { }

                await cacheEntryRemoved;
                socket.off('client:created', handleUpdate);
                socket.off('client:updated', handleUpdate);
                socket.off('client:deleted', handleUpdate);
                socket.off('client:change', handleUpdate);
                socket.off('client:attachment:added', handleUpdate);
            },
        }),
        updateClient: builder.mutation({
            query: ({ clientId, body }) => ({
                url: `/api/clientmanagement/update/${clientId}`,
                method: 'PUT',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['Clients'],
        }),
        getDeliverablesSummary: builder.query({
            query: (userId) => {
                let url = `/api/clientmanagement/deliverables/summary`;
                if (userId) {
                    url += `?userId=${userId}`;
                }
                return {
                    url,
                    method: 'GET',
                };
            },
            providesTags: ['Clients'],
        }),
        tickDeliverable: builder.mutation({
            query: ({ clientId, type, index = null, status = null }) => ({
                url: `/api/clientmanagement/${clientId}/deliverables/update`,
                method: 'PATCH',
                body: { type, index, status },
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['Clients'],
        }),
        addClientAttachment: builder.mutation({
            query: ({ clientId, body }) => ({
                url: `/api/clientmanagement/${clientId}/attachments`,
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: (result, error, { clientId, body }) => [
                { type: 'Clients', id: 'LIST' },
                { type: 'Clients', id: 'ATTACHMENTS-LIST' },
                { type: 'Clients', id: `ATTACHMENTS-${clientId}-${body?.uploadedBy?.userId}` }
            ],
        }),
        getClientAttachments: builder.query({
            query: (clientId) => ({
                url: `/api/clientmanagement/${clientId}/attachments`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            providesTags: (result, error, clientId) => [
                { type: 'Clients', id: `ATTACHMENTS-${clientId}` },
                { type: 'Clients', id: 'ATTACHMENTS-LIST' }
            ],
        }),
        getUploadTracker: builder.query({
            query: (userId) => ({
                url: `/api/clientmanagement/tracker/${userId}`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            providesTags: (result, error, userId) => [
                { type: 'Clients', id: `TRACKER-${userId}` },
                { type: 'Clients', id: 'TRACKER-LIST' }
            ],
        }),
        getClientAttachmentsByUserId: builder.query({
            query: ({ clientId, userId }) => ({
                url: `/api/clientmanagement/${clientId}/attachments/byUserId/${userId}`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            providesTags: (result, error, { clientId, userId }) => [
                { type: 'Clients', id: `ATTACHMENTS-${clientId}-${userId}` },
                { type: 'Clients', id: 'ATTACHMENTS-LIST' }
            ],
            async onCacheEntryAdded(
                arg,
                { updateCachedData, cacheDataLoaded, cacheEntryRemoved, updateCachedData: update, dispatch }
            ) {
                // We'll use the centralized socket utilities
                const { getSocket } = await import('../utils/socket');
                const socket = getSocket();

                if (!socket) return;

                const handleUpdate = () => {
                    // Force a refetch when data changes
                    // In a more complex app, we could merge the new data directly
                    dispatch(api.util.invalidateTags([{ type: 'Clients', id: `ATTACHMENTS-${arg.clientId}-${arg.userId}` }]));
                };

                try {
                    await cacheDataLoaded;

                    socket.on('client:attachment:added', handleUpdate);
                    socket.on('client:attachment:updated', handleUpdate);
                    socket.on('client:attachment:deleted', handleUpdate);
                    socket.on('client:change', handleUpdate);

                } catch {
                    // no-op if cacheEntryRemoved triggers before cacheDataLoaded
                }

                await cacheEntryRemoved;
                socket.off('client:attachment:added', handleUpdate);
                socket.off('client:attachment:updated', handleUpdate);
                socket.off('client:attachment:deleted', handleUpdate);
                socket.off('client:change', handleUpdate);
            },
        }),
        archiveClientAttachment: builder.mutation({
            query: ({ clientId, attachmentId }) => ({
                url: `/api/clientmanagement/${clientId}/attachments/${attachmentId}`,
                method: 'DELETE',
                body: { archived: true },
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: (result, error, { clientId }) => [
                { type: 'Clients', id: 'LIST' },
                { type: 'Clients', id: 'ATTACHMENTS-LIST' }
            ],
        }),
        deleteClientAttachment: builder.mutation({
            query: ({ clientId, attachmentId }) => ({
                url: `/api/clientmanagement/${clientId}/attachments/${attachmentId}`,
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: (result, error, { clientId }) => [
                { type: 'Clients', id: 'LIST' },
                { type: 'Clients', id: 'ATTACHMENTS-LIST' }
            ],
        }),
        deleteClient: builder.mutation({
            query: (clientId) => ({
                url: `/api/clientmanagement/delete/${clientId}`,
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['Clients'],
        }),
        createTeam: builder.mutation({
            query: (body) => ({
                url: '/api/teammanagement/createTeam',
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['Teams'], // Invalidate teams cache to trigger refetch
        }),
        getAllTeams: builder.query({
            query: () => ({
                url: '/api/teammanagement/getAllTeams',
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            providesTags: ['Teams'], // Provide tag for cache invalidation
        }),
        updateTeam: builder.mutation({
            query: ({ teamId, body }) => ({
                url: `/api/teammanagement/updateTeam/${teamId}`,
                method: 'PUT',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['Teams'], // Invalidate teams cache to trigger refetch
        }),
        updateUserDetails: builder.mutation({
            query: ({ userId, body }) => ({
                url: `/api/updateUserDetails/${userId}`,
                method: 'PUT',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['User'],
        }),

        getSalaryCalculation: builder.query({
            query: ({ userId, month, year }) => {
                let url = `/api/salaryCalculation/calculate/${userId}`;
                const params = new URLSearchParams();
                if (month) params.append('month', month);
                if (year) params.append('year', year);
                const queryString = params.toString();
                if (queryString) {
                    url += `?${queryString}`;
                }
                return {
                    url,
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                }
            },
        }),
        getAllUsersSalaryCalculation: builder.query({
            query: () => ({
                url: '/api/salaryCalculation/calculate-all-users',
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
        }),
        // Daily Working / Note Scheduling Endpoints
        createDailyWorkingTask: builder.mutation({
            query: (body) => ({
                url: '/api/daily-working/create',
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['DailyWorking'],
        }),
        getAllDailyWorkingTasks: builder.query({
            query: () => ({
                url: '/api/daily-working/all',
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            providesTags: ['DailyWorking'],
            async onCacheEntryAdded(arg, { cacheDataLoaded, cacheEntryRemoved, dispatch }) {
                const { getSocket } = await import('../utils/socket');
                const socket = getSocket();
                if (!socket) return;
                const handleUpdate = () => dispatch(api.util.invalidateTags(['DailyWorking']));
                try {
                    await cacheDataLoaded;
                    socket.on('dailyWorking:created', handleUpdate);
                    socket.on('dailyWorking:updated', handleUpdate);
                    socket.on('dailyWorking:deleted', handleUpdate);
                } catch { }
                await cacheEntryRemoved;
                socket.off('dailyWorking:created', handleUpdate);
                socket.off('dailyWorking:updated', handleUpdate);
                socket.off('dailyWorking:deleted', handleUpdate);
            },
        }),
        getUserDailyWorkingTasks: builder.query({
            query: (userId) => ({
                url: `/api/daily-working/user/${userId}`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            providesTags: (result, error, userId) => [{ type: 'DailyWorking', id: userId }],
            async onCacheEntryAdded(arg, { cacheDataLoaded, cacheEntryRemoved, dispatch }) {
                const { getSocket } = await import('../utils/socket');
                const socket = getSocket();
                if (!socket) return;
                const handleUpdate = () => dispatch(api.util.invalidateTags([{ type: 'DailyWorking', id: arg }]));
                try {
                    await cacheDataLoaded;
                    socket.on('dailyWorking:created', handleUpdate);
                    socket.on('dailyWorking:updated', handleUpdate);
                    socket.on('dailyWorking:deleted', handleUpdate);
                } catch { }
                await cacheEntryRemoved;
                socket.off('dailyWorking:created', handleUpdate);
                socket.off('dailyWorking:updated', handleUpdate);
                socket.off('dailyWorking:deleted', handleUpdate);
            },
        }),
        updateDailyWorkingTask: builder.mutation({
            query: ({ taskId, body }) => ({
                url: `/api/daily-working/update/${taskId}`,
                method: 'PATCH',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: (result, error, { taskId }) => ['DailyWorking'],
        }),
        deleteDailyWorkingTask: builder.mutation({
            query: (taskId) => ({
                url: `/api/daily-working/delete/${taskId}`,
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['DailyWorking'],
        }),
        createRealEstateProject: builder.mutation({
            query: (body) => ({
                url: '/api/realEstate/project/create',
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['RealEstateProjects'],
        }),
        updateRealEstateProject: builder.mutation({
            query: ({ id, body }) => ({
                url: `/api/realEstate/project/update/${id}`,
                method: 'PUT',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['RealEstateProjects'],
        }),
        getAllRealEstateProjects: builder.query({
            query: () => '/api/realEstate/project/getAll',
            providesTags: ['RealEstateProjects'],
        }),
        getRealEstateAmenities: builder.query({
            query: () => '/api/realEstate/amenities/getAll',
            transformResponse: (response) => response?.data ?? response,
        }),
        // Image Upload Endpoint (same format as your working HTML)
        uploadImage: builder.mutation({
            queryFn: async (formData) => {
                try {
                    const uploadBaseUrl = import.meta.env.VITE_FILE_UPLOAD_BASE_URL || 'http://192.168.1.46:4000';
                    const url = `${uploadBaseUrl}/api/upload-file`;
                    const response = await fetch(url, {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
                        return { error: { status: response.status, data: errorData } };
                    }

                    const data = await response.json().catch(() => ({}));
                    return { data };
                } catch (error) {
                    return { error: { status: 'FETCH_ERROR', error: error.message } };
                }
            },
        }),
        // Fetch Images Endpoint (same as your HTML fetchImages function)
        fetchImages: builder.query({
            queryFn: async () => {
                try {
                    const uploadBaseUrl = import.meta.env.VITE_FILE_UPLOAD_BASE_URL || 'http://192.168.1.46:4000';
                    const url = `${uploadBaseUrl}/api/images`;

                    const response = await fetch(url);

                    if (!response.ok) {
                        return { error: { status: response.status } };
                    }
                    const data = await response.json().catch(() => ({}));
                    return { data };
                } catch (error) {
                    return { error: { status: 'FETCH_ERROR', error: error.message } };
                }
            },
        }),
        getUniqueRoles: builder.query({
            query: () => ({
                url: '/api/getUniqueRolesAndPositions',
                method: 'GET',
            }),
        }),
    }),
});

export const {
    useCreateLeaveMutation,
    useGetUserLeavesQuery,
    useGetAllLeavesQuery,
    useRejectLeaveMutation,
    useAddFestiveNoteMutation,
    useUpdateFestiveMutation,
    useDeleteFestiveNoteMutation,
    useGetFestiveNotesByUserQuery,
    useCheckInMutation,
    useCheckoutMutation,
    useCheckInStatusQuery,
    useCheckoutStatusQuery,
    useLazyCheckoutStatusQuery,
    useAddUserDetailsMutation,
    useGenerateUserCredentialMutation,
    useSignInUserMutation,
    useGetUserDataQuery,
    useAddUserDataMutation,
    useUpdateUserDataMutation,
    useDeleteUserDataMutation,
    useAddTaskAssignMutation,
    useUpdateTaskAssignMutation,
    useLazyGetSuggestedSlotsQuery,
    useGetTaskAssignQuery,
    useGetTaskAssignByDateQuery,
    useLazyGetTaskAssignByDateQuery,
    useArchiveTaskMutation,
    useUpdateTaskStatusMutation,
    useRequestTaskExtensionMutation,
    useRespondTaskExtensionMutation,
    useAddTaskChatMutation,
    useGetTaskChatMessagesQuery,
    useLazyGetTaskChatMessagesQuery,
    useGetUserChatMessagesQuery,
    useAddGlobalChatMutation,
    useGetGlobalChatMessagesQuery,
    useLazyGetGlobalChatMessagesQuery,
    useGetRecentGlobalChatMessagesQuery,
    useLazyGetRecentGlobalChatMessagesQuery,
    useArchiveGlobalChatMessageMutation,
    useGetAllUsersQuery,
    useGetAllCheckinsQuery,
    useCreateUserVerificationDocumentMutation,
    useUpdateUserVerificationDocumentMutation,
    useGetAllUserVerificationDocumentsQuery,
    useCheckCreateAccountSignInQuery,
    useLazyCheckCreateAccountSignInQuery,
    useSignInCreateAccountMutation,
    useCreateClientMutation,
    useGetAllClientsQuery,
    useUpdateClientMutation,
    useGetClientsByUserIdQuery,
    useAddClientAttachmentMutation,
    useGetDeliverablesSummaryQuery,
    useGetUploadTrackerQuery,
    useTickDeliverableMutation,
    useGetClientAttachmentsByUserIdQuery,
    useGetClientAttachmentsQuery,
    useCreateTeamMutation,
    useGetAllTeamsQuery,
    useUpdateTeamMutation,
    useGetAnalyticsOverviewQuery,
    useGetUserWiseAnalyticsQuery,
    useUpdateUserDetailsMutation,
    useIncrementSalaryMutation,
    useGetSalaryHistoryQuery,
    useDeleteClientAttachmentMutation,
    useArchiveClientAttachmentMutation,
    useGetSalaryCalculationQuery,
    useGetAllUsersSalaryCalculationQuery,
    useCreateDailyWorkingTaskMutation,
    useGetAllDailyWorkingTasksQuery,
    useGetUserDailyWorkingTasksQuery,
    useUpdateDailyWorkingTaskMutation,
    useDeleteDailyWorkingTaskMutation,
    useDeleteClientMutation,
    useUploadImageMutation,
    useFetchImagesQuery,
    useCreateRealEstateProjectMutation,
    useUpdateRealEstateProjectMutation,
    useGetAllRealEstateProjectsQuery,
    useGetRealEstateAmenitiesQuery,
    useGetUniqueRolesQuery,
    useLazyGetCheckinAnalysisQuery,
    useGetDashboardAnalysisQuery,
    useClearDashboardCacheMutation
} = api


