import { useState, useEffect } from 'react';
import { User } from '../types';
import { getUsers, getGroups, getFavoriteChats } from '../utils/storage';

interface DashboardProps {
  currentUser: User;
  onNavigate: (view: string, data?: any) => void;
}

export default function Dashboard({ currentUser, onNavigate }: DashboardProps) {
  const [recentChats, setRecentChats] = useState<User[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [favoriteChats, setFavoriteChats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const allUsers = await getUsers();
    const userGroups = await getGroups(currentUser.id);
    const favorites = await getFavoriteChats(currentUser.id);
    
    // Get recent chats (connected users)
    const connectedUsers = allUsers.filter(u => u.id !== currentUser.id);
    setRecentChats(connectedUsers.slice(0, 5));
    setGroups(userGroups);
    setFavoriteChats(favorites);
    setLoading(false);
  };

  const quickActions = [
    {
      icon: '💬',
      label: 'New Chat',
      color: 'from-blue-500 to-cyan-500',
      action: () => onNavigate('find-users'),
    },
    {
      icon: '👥',
      label: 'Create Group',
      color: 'from-purple-500 to-pink-500',
      action: () => onNavigate('create-group'),
    },
    {
      icon: '🔍',
      label: 'Search Messages',
      color: 'from-orange-500 to-red-500',
      action: () => onNavigate('search'),
    },
    {
      icon: '⭐',
      label: 'Favorites',
      color: 'from-yellow-500 to-orange-500',
      action: () => onNavigate('favorites'),
    },
  ];

  const features = [
    { icon: '🌙', label: 'Dark Mode', status: 'active' },
    { icon: '😀', label: 'Emoji Picker', status: 'active' },
    { icon: '🎤', label: 'Voice Messages', status: 'coming-soon' },
    { icon: '📹', label: 'Video Calling', status: 'coming-soon' },
    { icon: '📞', label: 'Audio Calling', status: 'coming-soon' },
    { icon: '📍', label: 'Location Sharing', status: 'coming-soon' },
    { icon: '✉️', label: 'Read Receipts', status: 'active' },
    { icon: '🔍', label: 'Message Search', status: 'active' },
    { icon: '📌', label: 'Pinned Messages', status: 'active' },
    { icon: '⭐', label: 'Favorite Chats', status: 'active' },
    { icon: '🤖', label: 'AI Assistant', status: 'coming-soon' },
    { icon: '👥', label: 'Group Chat', status: 'active' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">💬</div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  LaxChat
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back, {currentUser.name}!</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full ${currentUser.color} flex items-center justify-center text-xl`}>
                {currentUser.avatar}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.action}
                className={`bg-gradient-to-br ${action.color} p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 text-white`}
              >
                <div className="text-4xl mb-2">{action.icon}</div>
                <div className="font-semibold">{action.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Chats */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Recent Chats</h2>
              <button
                onClick={() => onNavigate('find-users')}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View All
              </button>
            </div>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : recentChats.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">💬</div>
                <p className="text-gray-500 dark:text-gray-400">No recent chats</p>
                <button
                  onClick={() => onNavigate('find-users')}
                  className="mt-3 text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                >
                  Start chatting
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentChats.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => onNavigate('chat', user)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="relative">
                      {user.profileImage ? (
                        <img src={user.profileImage} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className={`w-12 h-12 rounded-full ${user.color} flex items-center justify-center text-xl`}>
                          {user.avatar}
                        </div>
                      )}
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.isOnline ? '🟢 Online' : '🔴 Offline'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Groups */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Your Groups</h2>
              <button
                onClick={() => onNavigate('create-group')}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Create New
              </button>
            </div>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">👥</div>
                <p className="text-gray-500 dark:text-gray-400">No groups yet</p>
                <button
                  onClick={() => onNavigate('create-group')}
                  className="mt-3 text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                >
                  Create a group
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => onNavigate('group-chat', group)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl">
                      👥
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{group.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {group.members?.length || 0} members
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Features</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border-2 transition-all ${
                  feature.status === 'active'
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 opacity-60'
                }`}
              >
                <div className="text-3xl mb-2">{feature.icon}</div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{feature.label}</p>
                <p className={`text-xs mt-1 ${
                  feature.status === 'active' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {feature.status === 'active' ? '✓ Active' : 'Coming Soon'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{recentChats.length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Connections</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{groups.length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Groups</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">{favoriteChats.length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Favorites</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {recentChats.filter(u => u.isOnline).length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Online Now</div>
          </div>
        </div>
      </div>
    </div>
  );
}
