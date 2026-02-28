import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    darkMode: false,
    sidebarCollapsed: false,
    activeOrchestratorTab: 'test-code',
    notification: null,
  },
  reducers: {
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
      if (state.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    setSidebarCollapsed(state, action) {
      state.sidebarCollapsed = action.payload;
    },
    setActiveOrchestratorTab(state, action) {
      state.activeOrchestratorTab = action.payload;
    },
    showNotification(state, action) {
      state.notification = {
        id: Date.now(),
        type: action.payload.type || 'info',
        message: action.payload.message,
        duration: action.payload.duration || 3000,
      };
    },
    clearNotification(state) {
      state.notification = null;
    },
  },
});

export const {
  toggleDarkMode, setSidebarCollapsed, setActiveOrchestratorTab,
  showNotification, clearNotification,
} = uiSlice.actions;
export default uiSlice.reducer;
