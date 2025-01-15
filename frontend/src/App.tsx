import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import TopBar from './components/TopBar'
import { ThemeProvider } from './context/ThemeContext'
import LoginForm from './components/auth/LoginForm'
import { useAuth } from './context/AuthContext'
import { setStreamSessionExpiredHandler } from './lib/api/streamUtils'
import WorkflowsManager from './components/WorkflowsManager'
import Workflow from './components/Workflow'
import { WORKFLOWS } from './data'
import { Workflow as WorkflowType } from './types'

// Wrapper component to handle workflow selection
const WorkflowWrapper: React.FC<{ workflows: readonly WorkflowType[] }> = ({ workflows }) => {
  const { workflowId } = useParams();
  const selectedWorkflow = workflows.find(w => w.id === workflowId);

  if (!selectedWorkflow) {
    return <Navigate to="/" replace />;
  }

  return <Workflow workflow={selectedWorkflow} />;
};

function App() {
  const { handleSessionExpired, isAuthenticated, login, register, error } = useAuth()
  const [isRegistering, setIsRegistering] = useState(false)
  const [workflows, setWorkflows] = useState<WorkflowType[]>([...WORKFLOWS])

  const handleCreateWorkflow = () => {
    const newId = `workflow-${workflows.length + 1}`
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
    }
    setWorkflows([...workflows, newWorkflow])
    return newWorkflow
  }

  useEffect(() => {
    setStreamSessionExpiredHandler(handleSessionExpired)
    return () => setStreamSessionExpiredHandler(() => { })
  }, [handleSessionExpired])

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
              error={error}
            />
          </div>
        </ThemeProvider>
      </BrowserRouter>
    )
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
                  <Route path="/" element={
                    <WorkflowsManager
                      workflows={workflows}
                      onCreateWorkflow={handleCreateWorkflow}
                    />
                  } />
                  <Route path="/workflow/:workflowId" element={
                    <WorkflowWrapper workflows={workflows} />
                  } />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </div>
          </div>
        </div>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App 