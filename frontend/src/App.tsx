import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
// contexts
import { useEffect, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import { WorkflowProvider, useWorkflows } from './context/WorkflowContext';
import { PromptTemplateProvider } from './context/PromptTemplateContext';
import { JobsProvider } from './context/JobsContext';
// utils
import { setStreamSessionExpiredHandler } from './lib/api/streamUtils';
// components
import TopBar from './components/TopBar';
import LoginForm from './components/auth/LoginForm';
import WorkflowsManager from './pages/WorkflowsManager';
import Workflow from './pages/Workflow';
import PromptTemplateManager from './pages/PromptTemplateManager';
import FilesManager from './pages/FilesManager';
import PromptTemplate from './pages/PromptTemplate';
import JobsManager from './pages/JobsManager';
import Job from './pages/Job';

// Main app content when authenticated
const AuthenticatedApp = () => {
  const {
    isLoading,
    error,
    workflow,
    loadWorkflow
  } = useWorkflows();
  const location = useLocation();

  // Handle navigation and workflow state
  useEffect(() => {
    console.log("location.pathname", location.pathname);
    const match = location.pathname.match(/^\/workflow\/([^/]+)/);
    if (match) {
      const workflowId = match[1];
      // Only load from DB if we don't have this workflow or have a different one
      if (!workflow || (workflow.workflow_id !== workflowId && workflowId !== 'new')) {
        loadWorkflow(workflowId);
      }
    }
  }, [location.pathname, workflow, loadWorkflow]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 bg-gray-50">
        <div className="text-center space-y-8">
          {/* Flowing Dots Animation */}
          <div className="relative px-8">
            <div className="flex space-x-6">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full 
                                    bg-blue-500 
                                    ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900
                                    dark:bg-blue-400
                                    shadow-[0_0_10px_rgba(59,130,246,0.5)]
                                    dark:shadow-[0_0_10px_rgba(96,165,250,0.5)]
                                    animate-[flowingDot_1.5s_ease-in-out_infinite]`}
                  style={{
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
            {/* Connection Lines */}
            <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 -z-10">
              <div className="h-1.5 bg-gradient-to-r from-transparent via-blue-500/70 to-transparent animate-glow-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-700 dark:text-gray-200">Processing...</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Please wait while we set things up...</p>
          </div>
        </div>
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
              <Route path="/prompts" element={<PromptTemplateManager />} />
              <Route path="/prompt/:templateId" element={<PromptTemplate />} />
              <Route path="/files" element={<FilesManager />} />
              <Route path="/jobs" element={<JobsManager />} />
              <Route path="/jobs/:jobId" element={<Job />} />
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
          <PromptTemplateProvider>
            <JobsProvider>
              <AuthenticatedApp />
            </JobsProvider>
          </PromptTemplateProvider>
        </WorkflowProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App; 