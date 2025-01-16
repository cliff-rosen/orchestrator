import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import TopBar from './components/TopBar';
import { ThemeProvider } from './context/ThemeContext';
import LoginForm from './components/auth/LoginForm';
import { useAuth } from './context/AuthContext';
import { setStreamSessionExpiredHandler } from './lib/api/streamUtils';
import WorkflowsManager from './components/WorkflowsManager';
import Workflow from './components/Workflow';
import { Workflow as WorkflowType } from './types';
import { workflowApi } from './lib/api';

// Helper component to get current workflow
const CurrentWorkflow = ({ workflows }: { workflows: readonly WorkflowType[] }) => {
  const { workflowId } = useParams();
  const workflow = workflows.find(w => w.id === workflowId);
  if (!workflow) return <Navigate to="/" replace />;
  return <Workflow workflow={workflow} />;
};

function App() {
  const { handleSessionExpired, isAuthenticated, login, register, error: authError } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set up session expiry handler
  useEffect(() => {
    setStreamSessionExpiredHandler(handleSessionExpired);
    return () => setStreamSessionExpiredHandler(() => { });
  }, [handleSessionExpired]);

  // Fetch workflows when authenticated
  useEffect(() => {
    const fetchWorkflows = async () => {
      if (!isAuthenticated) return;

      try {
        setLoading(true);
        const fetchedWorkflows = await workflowApi.getWorkflows();
        setWorkflows(fetchedWorkflows);
      } catch (err) {
        setError('Failed to load workflows');
        console.error('Error loading workflows:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflows();
  }, [isAuthenticated]);

  const handleCreateWorkflow = async (): Promise<WorkflowType> => {
    const newId = `workflow-${workflows.length + 1}`;
    const newWorkflow: WorkflowType = {
      id: newId,
      name: 'Untitled Workflow',
      description: 'A new custom workflow',
      path: `/workflow/${newId}`,
      inputs: [],
      outputs: [],
      steps: [
        {
          id: 'step-1',
          label: 'Step 1',
          description: 'Step 1 description',
          stepType: 'ACTION',
        }
      ]
    };

    try {
      // In a real app, this would be an API call
      // const createdWorkflow = await workflowApi.createWorkflow(newWorkflow);
      setWorkflows([...workflows, newWorkflow]);
      return newWorkflow;
    } catch (err) {
      console.error('Error creating workflow:', err);
      throw err;
    }
  };


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

  if (loading) {
    return (
      <BrowserRouter>
        <ThemeProvider>
          <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 bg-gray-50">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
        </ThemeProvider>
      </BrowserRouter>
    );
  }

  if (error) {
    return (
      <BrowserRouter>
        <ThemeProvider>
          <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 bg-gray-50">
            <div className="text-red-500 text-xl">{error}</div>
          </div>
        </ThemeProvider>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <ThemeProvider>
        <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
          <TopBar />
          <div className="relative">
            {/* Main Content */}
            <div className="container mx-auto px-4 py-6">
              <div className="flex-1">
                <Routes>
                  <Route
                    path="/"
                    element={
                      <WorkflowsManager
                        workflows={workflows}
                        onCreateWorkflow={handleCreateWorkflow}
                      />
                    }
                  />
                  <Route
                    path="/workflow/:workflowId/*"
                    element={<CurrentWorkflow workflows={workflows} />}
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </div>
          </div>
        </div>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App; 