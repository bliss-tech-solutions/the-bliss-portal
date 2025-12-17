import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  currentScreen: 'overview', // 'overview', 'employees', etc.
  showUserDetails: false,
  selectedUserId: null,
}

const adminDashboardSlice = createSlice({
  name: 'adminDashboard',
  initialState,
  reducers: {
    setCurrentScreen: (state, action) => {
      state.currentScreen = action.payload
    },
    showUserDetailsView: (state, action) => {
      state.showUserDetails = true
      state.selectedUserId = action.payload
    },
    hideUserDetailsView: (state) => {
      state.showUserDetails = false
      state.selectedUserId = null
    },
  },
})

export const { setCurrentScreen, showUserDetailsView, hideUserDetailsView } = adminDashboardSlice.actions

// Selectors
export const selectCurrentScreen = (state) => state.adminDashboard.currentScreen
export const selectShowUserDetails = (state) => state.adminDashboard.showUserDetails
export const selectSelectedUserId = (state) => state.adminDashboard.selectedUserId

export default adminDashboardSlice.reducer

