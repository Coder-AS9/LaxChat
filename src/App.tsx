import { useState, useEffect } from 'react';
import { User } from './types';
import { getCurrentUser, setCurrentUser, onBroadcast, onStorageChange } from './utils/storage';
import Login from './components/Login';
import Chat from './components/Chat';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUserState(user);
    }
    setLoading(false);

    // Listen for logout from other tabs
    const unsubBroadcast = onBroadcast((data) => {
      if (data.type === 'logout') {
        // Another tab logged out - we don't force logout here
      }
    });

    const unsubStorage = onStorageChange(() => {
      const updatedUser = getCurrentUser();
      if (!updatedUser && currentUser) {
        setCurrentUserState(null);
      }
    });

    return () => {
      unsubBroadcast();
      unsubStorage();
    };
  }, []); // eslint-disable-line

  const handleLogin = (user: User) => {
    setCurrentUserState(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserState(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">💬</div>
          <p className="text-white text-lg font-medium">Loading ChatApp...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return <Chat currentUser={currentUser} onLogout={handleLogout} />;
}
