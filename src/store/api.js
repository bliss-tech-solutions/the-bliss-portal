import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: import.meta.env.VITE_API_BASE_URL,
        credentials: 'include',
    }),
    tagTypes: ['User', 'UserData', 'Tasks', 'UserDocuments', 'Teams', 'GlobalChat'],
    endpoints: (builder) => ({
        createLeave: builder.mutation({
            query: (body) => ({
                url: '/api/leave/request',
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
        }),
        getUserLeaves: builder.query({
            query: (userId) => ({
                url: `/api/leave/getAll/${userId}`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
        }),
        getAllLeaves: builder.query({
            query: () => ({
                url: '/api/leave/getAllLeaves',
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
        }),
        // HR: approve/reject specific dates within a leave
        rejectLeave: builder.mutation({
            query: ({ userId, month, leaveId, body }) => ({
                url: `/api/leave/reject/${userId}/${month}/${leaveId}`,
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
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
                url: '/api/festive/update',
                method: 'PUT',
                body,
                headers: { 'Content-Type': 'application/json' },
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
        }),
        checkout: builder.mutation({
            query: (body) => ({
                url: '/api/checkout',
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
        }),
        checkInStatus: builder.query({
            // Expect backend to return { checkedIn: boolean, timestamp?: string }
            query: ({ userId }) => ({
                url: `/api/checkin/status?userId=${encodeURIComponent(userId)}`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
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
        getAllCheckins: builder.query({
            query: () => ({
                url: '/api/checkin/all',
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
        }),
        getTodayCheckin: builder.query({
            query: (userId) => ({
                url: `/api/checkin/${userId}/today`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
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
        }),
        getAllClients: builder.query({
            query: () => ({
                url: '/api/clientmanagement/getAllClientsData',
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
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
        }),
        updateClient: builder.mutation({
            query: ({ clientId, body }) => ({
                url: `/api/clientmanagement/update/${clientId}`,
                method: 'PUT',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
        }),
        addClientAttachment: builder.mutation({
            query: ({ clientId, body }) => ({
                url: `/api/clientmanagement/${clientId}/attachments`,
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            }),
            invalidatesTags: ['Clients'],
        }),
        getClientAttachmentsByUserId: builder.query({
            query: ({ clientId, userId }) => ({
                url: `/api/clientmanagement/${clientId}/attachments/byUserId/${userId}`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
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
    }),
})

export const {
    useCreateLeaveMutation,
    useGetUserLeavesQuery,
    useGetAllLeavesQuery,
    useRejectLeaveMutation,
    useAddFestiveNoteMutation,
    useUpdateFestiveMutation,
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
    useGetTodayCheckinQuery,
    useCreateUserVerificationDocumentMutation,
    useGetAllUserVerificationDocumentsQuery,
    useCheckCreateAccountSignInQuery,
    useLazyCheckCreateAccountSignInQuery,
    useSignInCreateAccountMutation,
    useCreateClientMutation,
    useGetAllClientsQuery,
    useUpdateClientMutation,
    useGetClientsByUserIdQuery,
    useAddClientAttachmentMutation,
    useGetClientAttachmentsByUserIdQuery,
    useCreateTeamMutation,
    useGetAllTeamsQuery,
    useUpdateTeamMutation,
    useGetAnalyticsOverviewQuery,
    useGetUserWiseAnalyticsQuery
} = api


