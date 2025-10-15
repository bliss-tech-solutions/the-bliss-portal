import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: import.meta.env.VITE_API_BASE_URL,
        credentials: 'include',
    }),
    tagTypes: ['User', 'UserData'],
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
    }),
})

export const { 
    useAddUserDetailsMutation, 
    useGenerateUserCredentialMutation, 
    useSignInUserMutation,
    useGetUserDataQuery,
    useAddUserDataMutation,
    useUpdateUserDataMutation,
    useDeleteUserDataMutation
} = api


