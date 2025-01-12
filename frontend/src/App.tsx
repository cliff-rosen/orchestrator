import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TopBar from './components/TopBar'
import { ThemeProvider } from './context/ThemeContext'
import { useAuth } from './context/AuthContext'
import { useEffect, useState } from 'react'
import { setSessionExpiredHandler } from './lib/api'
import { setStreamSessionExpiredHandler } from './lib/api/streamUtils'
import LoginForm from './components/auth/LoginForm'
import HomeScreen from './components/HomeScreen'
import ResearchWorkflow from './components/ResearchWorkflow'
import TemplateWorkflow from './components/TemplateWorkflow'
// Define available workflows
const WORKFLOWS = [
  {
    id: 'research',
    name: 'Research Assistant',
    description: 'AI-powered research workflow to analyze questions and find answers',
    path: '/research',
    component: ResearchWorkflow
  },
  {
    id: 'aita',
    name: 'AITA',
    description: 'Find out if you are the asshole',
    path: '/aita',
    component: TemplateWorkflow
  }
] as const

function App() {
  const { handleSessionExpired, isAuthenticated, login, register, error } = useAuth()
  const [isRegistering, setIsRegistering] = useState(false)

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
                  <Route path="/" element={<HomeScreen workflows={WORKFLOWS} />} />
                  {WORKFLOWS.map(workflow => (
                    <Route
                      key={workflow.id}
                      path={workflow.path}
                      element={<workflow.component />}
                    />
                  ))}
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