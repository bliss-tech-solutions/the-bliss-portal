import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  mode: 'light', // 'light' or 'dark'
  logo: {
    light: 'https://the-bliss-solution.vercel.app/Images/BlissLogo/BlissBlacklogo.png',
    dark: 'https://the-bliss-solution.vercel.app/Images/BlissLogo/BlissWhiteLogo.png'
  },
  headerLogo: {
    light: 'https://the-bliss-solution.vercel.app/Images/BlissLogo/BlissBlacklogo.png',
    dark: 'https://the-bliss-solution.vercel.app/Images/BlissLogo/BlissWhiteLogo.png'
  }
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light'
      // Update document theme attribute for CSS variables
      document.documentElement.setAttribute('data-theme', state.mode)
      // Save to localStorage
      localStorage.setItem('theme', state.mode)
    },
    setTheme: (state, action) => {
      state.mode = action.payload
      document.documentElement.setAttribute('data-theme', state.mode)
      localStorage.setItem('theme', state.mode)
    },
    updateLogo: (state, action) => {
      state.logo = { ...state.logo, ...action.payload }
    },
    updateHeaderLogo: (state, action) => {
      state.headerLogo = { ...state.headerLogo, ...action.payload }
    }
  },
})

export const { toggleTheme, setTheme, updateLogo, updateHeaderLogo } = themeSlice.actions

// Selectors
export const selectTheme = (state) => state.theme.mode
export const selectIsDarkMode = (state) => state.theme.mode === 'dark'
export const selectCurrentLogo = (state) =>
  state.theme.mode === 'dark' ? state.theme.logo.dark : state.theme.logo.light
export const selectCurrentHeaderLogo = (state) =>
  state.theme.mode === 'dark' ? state.theme.headerLogo.dark : state.theme.headerLogo.light

export default themeSlice.reducer
