import { useState, useRef } from 'react';
import { User } from '../types';
import { getUserByName, addUser } from '../utils/storage';

const AVATARS = ['😎', '🤓', '🦊', '🐱', '🐶', '🦁', '🐼', '🐨', '🦄', '🐸', '🦋', '🌟', '🔥', '💎', '🎮', '🎵', '👨‍💻', '👩‍💻', '🧑‍🎤', '🦸', '🧙', '🥷', '👽', '🤖'];
const COLORS = [
  'bg-indigo-500', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-cyan-500', 'bg-purple-500', 'bg-rose-500', 'bg-teal-500',
  'bg-blue-500', 'bg-orange-500', 'bg-lime-500', 'bg-fuchsia-500',
];

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    const user = await getUserByName(name.trim());
    
    if (!user) {
      setError('User not found. Please register first.');
      setLoading(false);
      return;
    }

    if (user.password !== password) {
      setError('Incorrect password. Please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);
    onLogin(user);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setProfileImage(result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (!password) {
      setError('Please set a password');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('🔍 Step 1: Checking if user already exists...');
      const existing = await getUserByName(name.trim());
      
      if (existing) {
        console.log('❌ User already exists:', existing);
        setError('This name is already taken. Choose a different name or log in.');
        setLoading(false);
        return;
      }
      
      console.log('✅ User does not exist, proceeding with registration...');
      console.log('🔍 Step 2: Calling addUser with data:', {
        name: name.trim(),
        avatar: selectedAvatar,
        color: selectedColor,
        password: password,
        profileImage: profileImage ? '[HAS IMAGE]' : null,
      });

      const newUser = await addUser({
        name: name.trim(),
        avatar: selectedAvatar,
        color: selectedColor,
        password: password,
        profileImage: profileImage,
        createdAt: Date.now(),
      });

      console.log('🔍 Step 3: addUser returned:', newUser);

      setLoading(false);

      if (!newUser) {
        console.error('❌ addUser returned null - registration failed');
        setError('Failed to create account. Check browser console for details.');
        return;
      }

      console.log('✅ Registration successful! User created:', newUser);
      onLogin(newUser);
    } catch (err) {
      console.error('💥 EXCEPTION during registration:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      setLoading(false);
      setError(`Registration failed: ${err instanceof Error ? err.message : 'Unknown error'}. Check console.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isRegister) {
      await handleRegister();
    } else {
      await handleLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-xl mb-4">
            <span className="text-4xl">💬</span>
          </div>
          <h1 className="text-3xl font-bold text-white">LaxChat</h1>
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
                Username
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder={isRegister ? 'Choose a username' : 'Enter your username'}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-sm"
                autoFocus
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder={isRegister ? 'Set a password (min 4 chars)' : 'Enter your password'}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-sm"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register only) */}
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="Confirm your password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-sm"
                  disabled={loading}
                />
              </div>
            )}

            {/* Register Options */}
            {isRegister && (
              <>
                {/* Profile Picture Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture (optional)
                  </label>
                  <div className="flex items-center gap-3">
                    {profileImage ? (
                      <div className="relative">
                        <img
                          src={profileImage}
                          alt="Profile"
                          className="w-16 h-16 rounded-full object-cover border-2 border-indigo-200"
                        />
                        <button
                          type="button"
                          onClick={() => setProfileImage(undefined)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
                      disabled={loading}
                    >
                      📷 Upload Photo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Avatar Selection (only if no profile image) */}
                {!profileImage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or choose an Emoji Avatar
                  </label>
                  <div className="grid grid-cols-8 gap-2 max-h-28 overflow-y-auto p-1">
                    {AVATARS.map((avatar) => (
                      <button
                        key={avatar}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                          selectedAvatar === avatar
                            ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-110'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        disabled={loading}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>
                )}

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
                        disabled={loading}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg border border-red-100 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-500 text-white font-semibold rounded-xl hover:bg-indigo-600 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : (isRegister ? 'Create Account & Chat' : 'Log In')}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); setPassword(''); setConfirmPassword(''); }}
              className="text-sm text-indigo-500 hover:text-indigo-700 font-medium"
              disabled={loading}
            >
              {isRegister
                ? 'Already have an account? Log In'
                : "Don't have an account? Register"}
            </button>
          </div>

        </div>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-indigo-100 text-xs">
            💡 Now with real-time sync across all devices!
          </p>
        </div>
      </div>
    </div>
  );
}
