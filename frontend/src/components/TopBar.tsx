import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { MoonIcon, SunIcon, DocumentTextIcon, Square2StackIcon, FolderIcon, PlayIcon } from '@heroicons/react/24/outline'
import settings from '../config/settings'
import { HelpGuide } from './HelpGuide';

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
                                to="/jobs"
                                className={`${location.pathname === '/jobs'
                                    ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                            >
                                <PlayIcon className="h-5 w-5 mr-1" />
                                Jobs
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
                    <div className="flex items-center gap-2">
                        <HelpGuide />
                        <button
                            onClick={toggleTheme}
                            className="inline-flex items-center justify-center rounded-md w-8 h-8
                                     text-gray-400 hover:text-gray-500 hover:bg-gray-100
                                     dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800
                                     focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                     transition-colors"
                            aria-label="Toggle theme"
                        >
                            {isDarkMode ? (
                                <SunIcon className="h-4 w-4" />
                            ) : (
                                <MoonIcon className="h-4 w-4" />
                            )}
                        </button>
                        {isAuthenticated && (
                            <>
                                <div className="ml-4 flex items-center">
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {user?.username}
                                    </span>
                                </div>
                                <button
                                    onClick={logout}
                                    className="ml-4 inline-flex items-center justify-center rounded-md
                                             px-3 py-1.5 text-sm font-medium
                                             text-gray-500 hover:text-gray-700 hover:bg-gray-100
                                             dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800
                                             focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                             transition-colors"
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