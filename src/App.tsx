import { useState, useEffect } from 'react';
import { User } from './types';
import { isSupabaseConfigured } from './utils/supabase';
import { setUserPresence } from './utils/storage';
import Login from './components/Login';
import Chat from './components/Chat';
import Dashboard from './components/Dashboard';

// Simple session storage for current user (just for this browser session)
const SESSION_KEY = 'laxchat_session';
const THEME_KEY = 'laxchat_theme';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'chat' | 'find-users' | 'create-group' | 'search' | 'favorites' | 'group-chat'>('dashboard');
  const [viewData, setViewData] = useState<any>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Load theme
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Load user from session storage
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    if (sessionData) {
      try {
        const user = JSON.parse(sessionData);
        setCurrentUserState(user);
        // Set user as online
        setUserPresence(user.id, true);
      } catch (e) {
        console.error('Error parsing session:', e);
      }
    }
    setLoading(false);

    // Set user offline when tab closes
    const handleBeforeUnload = () => {
      if (currentUser) {
        setUserPresence(currentUser.id, false);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem(THEME_KEY, newMode ? 'dark' : 'light');
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUserState(user);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setUserPresence(user.id, true);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    if (currentUser) {
      setUserPresence(currentUser.id, false);
    }
    setCurrentUserState(null);
    sessionStorage.removeItem(SESSION_KEY);
    setCurrentView('dashboard');
  };

  const handleUserUpdate = (user: User) => {
    setCurrentUserState(user);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  };

  const handleNavigate = (view: string, data?: any) => {
    setCurrentView(view as any);
    setViewData(data || null);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">💬</div>
          <p className="text-white text-lg font-medium">Loading LaxChat...</p>
        </div>
      </div>
    );
  }

  // Show configuration error if Supabase is not set up
  if (!isSupabaseConfigured) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Configuration Required</h1>
            <p className="text-gray-600">LaxChat needs Supabase to be configured</p>
          </div>

          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <strong>Missing Environment Variables:</strong> VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">To fix this issue:</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>Create a <code className="bg-gray-100 px-2 py-1 rounded">.env</code> file in the project root</li>
                <li>Add your Supabase credentials:
                  <div className="bg-gray-900 text-green-400 p-3 rounded mt-2 font-mono text-xs">
                    VITE_SUPABASE_URL=https://your-project.supabase.co<br/>
                    VITE_SUPABASE_ANON_KEY=your-anon-key-here
                  </div>
                </li>
                <li>Restart the development server</li>
              </ol>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Need help?</strong> Check the README.md file for detailed setup instructions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Render based on current view
  if (currentView === 'dashboard') {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <Dashboard currentUser={currentUser} onNavigate={handleNavigate} />
        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="fixed bottom-6 right-6 p-4 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <span className="text-2xl">{darkMode ? '☀️' : '🌙'}</span>
        </button>
      </div>
    );
  }

  if (currentView === 'chat' || currentView === 'find-users' || currentView === 'create-group' || currentView === 'search' || currentView === 'favorites' || currentView === 'group-chat') {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <Chat
          currentUser={currentUser}
          onLogout={handleLogout}
          onUserUpdate={handleUserUpdate}
          initialView={currentView}
          initialData={viewData}
          onNavigate={handleNavigate}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        />
      </div>
    );
  }

  return null;
}
