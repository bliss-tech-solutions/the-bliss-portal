import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  currentScreen: 'overview', // 'overview', 'employees', etc.
}

const adminDashboardSlice = createSlice({
  name: 'adminDashboard',
  initialState,
  reducers: {
    setCurrentScreen: (state, action) => {
      state.currentScreen = action.payload
    },
  },
})

export const { setCurrentScreen } = adminDashboardSlice.actions

// Selectors
export const selectCurrentScreen = (state) => state.adminDashboard.currentScreen

export default adminDashboardSlice.reducer

