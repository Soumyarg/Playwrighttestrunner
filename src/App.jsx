import { useRoutes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import TestOrchestrator from './pages/test-orchestrator/TestOrchestrator';
import TestExecution from './pages/test-execution/TestExecution';
import SavedTests from './pages/saved-tests/SavedTests';
import NotFound from './pages/NotFound';

const Routes = () => {
  return useRoutes([
    {
      path: '/',
      element: <Layout />,
      children: [
        { path: '/', element: <Dashboard /> },
        { path: '/test-orchestrator', element: <TestOrchestrator /> },
        { path: '/test-execution', element: <TestExecution /> },
        { path: '/saved-tests', element: <SavedTests /> },
        { path: '*', element: <NotFound /> },
      ],
    },
  ]);
};

function App() {
  const darkMode = useSelector(state => state.ui.darkMode);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return <Routes />;
}

export default App;
