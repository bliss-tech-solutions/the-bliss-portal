import { configureStore } from '@reduxjs/toolkit'
import roleReducer from './slices/roleSlice'
import authReducer from './slices/authSlice'
import themeReducer from './slices/themeSlice'
import adminDashboardReducer from './slices/adminDashboardSlice'
import { api } from './api'

export const store = configureStore({
    reducer: {
        role: roleReducer,
        auth: authReducer,
        theme: themeReducer,
        adminDashboard: adminDashboardReducer,
        [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
})

export default store