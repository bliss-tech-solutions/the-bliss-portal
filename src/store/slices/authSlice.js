import { createSlice } from '@reduxjs/toolkit'
import { saveAuthState, getAuthState, clearAuthState, isAuthValid } from '../../utils/authUtils'

// Initialize state from localStorage if available
const savedAuthState = getAuthState();
const initialState = savedAuthState && isAuthValid(savedAuthState) ? savedAuthState : {
  isAuthenticated: false,
  user: null,
  userId: null,
  token: null,
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
    loginSuccess(state, action) {
      state.isAuthenticated = true
      state.user = action.payload.user
      state.userId = action.payload.userId || action.payload.user?.id
      state.token = action.payload.token
      saveAuthState(state)
    },
    logout(state) {
      state.isAuthenticated = false
      state.user = null
      state.userId = null
      state.token = null
      clearAuthState()
    },
    setAuthState(state, action) {
      state.isAuthenticated = action.payload.isAuthenticated
      state.user = action.payload.user || null
      state.userId = action.payload.userId || null
      state.token = action.payload.token || null
      if (action.payload.isAuthenticated) {
        saveAuthState(state)
      } else {
        clearAuthState()
      }
    },
    updateUserProfile(state, action) {
      // Update specific user fields (like profilePhoto) without replacing entire user object
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
        saveAuthState(state)
      }
    },
    },
})

export const { loginSuccess, logout, setAuthState, updateUserProfile } = authSlice.actions

// Selectors
export const selectUserId = (state) => state.auth.userId
export const selectUser = (state) => state.auth.user

export default authSlice.reducer
