import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TopBar from './components/TopBar'
import { ThemeProvider } from './context/ThemeContext'
import { useAuth } from './context/AuthContext'
import { useEffect, useState } from 'react'
import { setSessionExpiredHandler } from './lib/api'
import { setStreamSessionExpiredHandler } from './lib/api/streamUtils'
import LoginForm from './components/auth/LoginForm'
import WorkflowsManager from './components/WorkflowsManager'
import Workflow from './components/Workflow'
import { WORKFLOWS, Workflow as WorkflowType } from './data'

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
      steps: [
        {
          label: 'Step 1',
          description: 'Configure your first step',
        }
      ]
    }
    setWorkflows([...workflows, newWorkflow])
    return newWorkflow
  }

  useEffect(() => {
    setSessionExpiredHandler(handleSessionExpired)
    setStreamSessionExpiredHandler(handleSessionExpired)
    return () => setSessionExpiredHandler(() => { })
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
                    <Workflow workflows={workflows} />
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