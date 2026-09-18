import { useState } from 'react';
import { User } from '../types';
import { getUserByName, addUser, setCurrentUser, getUsers } from '../utils/storage';

const AVATARS = ['😎', '🤓', '🦊', '🐱', '🐶', '🦁', '🐼', '🐨', '🦄', '🐸', '🦋', '🌟', '🔥', '💎', '🎮', '🎵'];
const COLORS = [
  'bg-indigo-500', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-cyan-500', 'bg-purple-500', 'bg-rose-500', 'bg-teal-500',
];

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [error, setError] = useState('');
  const [existingUsers, setExistingUsers] = useState(getUsers());

  const handleLogin = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    const user = getUserByName(name.trim());
    if (!user) {
      setError('User not found. Please register first.');
      return;
    }

    setCurrentUser(user);
    onLogin(user);
  };

  const handleRegister = () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    const existing = getUserByName(name.trim());
    if (existing) {
      setError('This name is already taken. Choose a different name or log in.');
      return;
    }

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      avatar: selectedAvatar,
      color: selectedColor,
      createdAt: Date.now(),
    };

    addUser(newUser);
    setCurrentUser(newUser);
    onLogin(newUser);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isRegister) {
      handleRegister();
    } else {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-xl mb-4">
            <span className="text-4xl">💬</span>
          </div>
          <h1 className="text-3xl font-bold text-white">ChatApp</h1>
          <p className="text-indigo-100 mt-2">Connect with friends in real-time</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder={isRegister ? 'Choose a username' : 'Enter your username'}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-sm"
                autoFocus
              />
            </div>

            {/* Register Options */}
            {isRegister && (
              <>
                {/* Avatar Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choose Avatar
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {AVATARS.map((avatar) => (
                      <button
                        key={avatar}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                          selectedAvatar === avatar
                            ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-110'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choose Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full ${color} transition-all ${
                          selectedColor === color
                            ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110'
                            : 'hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-indigo-500 text-white font-semibold rounded-xl hover:bg-indigo-600 transition-colors shadow-md hover:shadow-lg"
            >
              {isRegister ? 'Create Account & Chat' : 'Log In'}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-sm text-indigo-500 hover:text-indigo-700 font-medium"
            >
              {isRegister
                ? 'Already have an account? Log In'
                : "Don't have an account? Register"}
            </button>
          </div>

          {/* Quick Login for existing users */}
          {!isRegister && existingUsers.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-3 text-center">Quick login as:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {existingUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setName(user.name);
                      setError('');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${user.color} text-white hover:opacity-90 transition-opacity`}
                  >
                    <span>{user.avatar}</span>
                    <span>{user.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-indigo-100 text-xs">
            💡 Tip: Open this page in multiple tabs to chat between different users!
          </p>
        </div>
      </div>
    </div>
  );
}
