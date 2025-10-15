import { configureStore } from '@reduxjs/toolkit'
import roleReducer from './slices/roleSlice'
import authReducer from './slices/authSlice'
import themeReducer from './slices/themeSlice'
import { api } from './api'

export const store = configureStore({
    reducer: {
        role: roleReducer,
        auth: authReducer,
        theme: themeReducer,
        [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
})

export default store