import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import { WorkflowProvider, useWorkflows } from './context/WorkflowContext';
import { setStreamSessionExpiredHandler } from './lib/api/streamUtils';
import WorkflowsManager from './components/WorkflowsManager';
import Workflow from './components/Workflow';
import TopBar from './components/TopBar';
import LoginForm from './components/auth/LoginForm';


// Main app content when authenticated
const AuthenticatedApp = () => {
  const { loading, error } = useWorkflows();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 bg-gray-50">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <TopBar />
      <div className="relative">
        <div className="container mx-auto px-4 py-6">
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<WorkflowsManager />} />
              <Route path="/workflow/:workflowId/*" element={<Workflow />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const { handleSessionExpired, isAuthenticated, login, register, error: authError } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  // Set up session expiry handler
  useEffect(() => {
    setStreamSessionExpiredHandler(handleSessionExpired);
    return () => setStreamSessionExpiredHandler(() => { });
  }, [handleSessionExpired]);

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <ThemeProvider>
          <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 bg-gray-50">
            <LoginForm
              isRegistering={isRegistering}
              setIsRegistering={setIsRegistering}
              login={login}
              register={register}
              error={authError}
            />
          </div>
        </ThemeProvider>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <ThemeProvider>
        <WorkflowProvider>
          <AuthenticatedApp />
        </WorkflowProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App; 