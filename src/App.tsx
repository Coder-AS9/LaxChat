import { useState, useEffect } from 'react';
import { User } from './types';
import Login from './components/Login';
import Chat from './components/Chat';

// Simple session storage for current user (just for this browser session)
const SESSION_KEY = 'laxchat_session';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from session storage
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    if (sessionData) {
      try {
        const user = JSON.parse(sessionData);
        setCurrentUserState(user);
      } catch (e) {
        console.error('Error parsing session:', e);
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUserState(user);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUserState(null);
    sessionStorage.removeItem(SESSION_KEY);
  };

  const handleUserUpdate = (user: User) => {
    setCurrentUserState(user);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
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

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Chat currentUser={currentUser} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
  );
}
