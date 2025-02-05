import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { MoonIcon, SunIcon, DocumentTextIcon, HomeIcon } from '@heroicons/react/24/outline'
import settings from '../config/settings'
import classNames from 'classnames'

export default function TopBar() {
    const { isAuthenticated, logout, user } = useAuth()
    const { isDarkMode, toggleTheme } = useTheme()
    const location = useLocation()

    const navigation = [
        { name: 'Workflows', href: '/', icon: HomeIcon },
        { name: 'Prompt Templates', href: '/prompt-templates', icon: DocumentTextIcon },
    ]

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
                            {navigation.map((item) => {
                                const isActive = location.pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        className={classNames(
                                            isActive
                                                ? 'border-blue-500 text-gray-900 dark:text-white'
                                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white',
                                            'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium'
                                        )}
                                    >
                                        <item.icon className="h-5 w-5 mr-2" />
                                        {item.name}
                                    </Link>
                                );
                            })}
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
                                        {user?.email}
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