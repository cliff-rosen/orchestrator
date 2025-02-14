import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { MoonIcon, SunIcon, DocumentTextIcon, Square2StackIcon, FolderIcon } from '@heroicons/react/24/outline'
import settings from '../config/settings'

export default function TopBar() {
    const { isAuthenticated, logout, user } = useAuth()
    const { isDarkMode, toggleTheme } = useTheme()
    const location = useLocation()

    return (
        <div className="bg-white dark:bg-gray-800 shadow">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 justify-between">
                    <div className="flex">
                        <div className="flex flex-shrink-0 items-center">
                            <img
                                className="h-8 w-auto"
                                src={settings.logoUrl}
                                alt="Logo"
                            />
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link
                                to="/"
                                className={`${location.pathname === '/' || location.pathname.startsWith('/workflow/')
                                    ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                            >
                                <Square2StackIcon className="h-5 w-5 mr-1" />
                                Workflows
                            </Link>

                            <Link
                                to="/prompts"
                                className={`${location.pathname === '/prompts' || location.pathname.startsWith('/prompt/')
                                    ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                                state={{ preserveWorkflowState: true }}
                            >
                                <DocumentTextIcon className="h-5 w-5 mr-1" />
                                Prompt Templates
                            </Link>

                            <Link
                                to="/files"
                                className={`${location.pathname === '/files'
                                    ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                                state={{ preserveWorkflowState: true }}
                            >
                                <FolderIcon className="h-5 w-5 mr-1" />
                                Files
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <button
                            onClick={toggleTheme}
                            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 
                                     dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                        >
                            {isDarkMode ? (
                                <SunIcon className="h-5 w-5" />
                            ) : (
                                <MoonIcon className="h-5 w-5" />
                            )}
                        </button>
                        {isAuthenticated && (
                            <>
                                <div className="ml-4 flex items-center">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {user?.username}
                                    </span>
                                </div>
                                <button
                                    onClick={logout}
                                    className="ml-4 rounded-md bg-white px-3 py-2 text-sm font-semibold 
                                             text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 
                                             hover:bg-gray-50 dark:bg-gray-700 dark:text-white 
                                             dark:ring-gray-600 dark:hover:bg-gray-600"
                                >
                                    Logout
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
} 