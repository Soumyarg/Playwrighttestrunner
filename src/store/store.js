import { configureStore } from '@reduxjs/toolkit';
import testsReducer from './testsSlice';
import executionReducer from './executionSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    tests: testsReducer,
    execution: executionReducer,
    ui: uiReducer,
  },
});
