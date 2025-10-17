import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: import.meta.env.VITE_API_BASE_URL,
        credentials: 'include',
    }),
    tagTypes: ['User', 'UserData', 'Tasks'],
    endpoints: (builder) => ({
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
        getTaskAssign: builder.query({
            query: (userId) => ({
                url: `/api/getTaskAssign/${userId}?isArchived=false`,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
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
            invalidatesTags: ['TaskChat'],
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

        // Get all users
        getAllUsers: builder.query({
            query: () => ({
                url: '/api/getUserDetails',
                method: 'GET',
            }),
            providesTags: ['Users'],
        }),
    }),
})

export const {
    useAddUserDetailsMutation,
    useGenerateUserCredentialMutation,
    useSignInUserMutation,
    useGetUserDataQuery,
    useAddUserDataMutation,
    useUpdateUserDataMutation,
    useDeleteUserDataMutation,
    useAddTaskAssignMutation,
    useGetTaskAssignQuery,
    useArchiveTaskMutation,
    useAddTaskChatMutation,
    useGetTaskChatMessagesQuery,
    useGetUserChatMessagesQuery,
    useGetAllUsersQuery
} = api


