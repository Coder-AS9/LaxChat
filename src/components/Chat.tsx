import { useState, useRef, useEffect, useCallback } from 'react';
import { User, Message, ChatMessage, ChatRequest } from '../types';
import {
  getUsers,
  getConversation,
  addMessage,
  updateUser,
  createChatRequest,
  getChatRequestBetween,
  updateChatRequest,
  deleteChatRequest,
  areUsersConnected,
  getPendingRequestsForUser,
  markMessagesAsSeen,
  subscribeToMessages,
  subscribeToChatRequests,
  subscribeToUsers,
} from '../utils/storage';

const AVATARS = ['😎', '🤓', '🦊', '🐱', '🐶', '🦁', '🐼', '🐨', '🦄', '🐸', '🦋', '🌟', '🔥', '💎', '🎮', '🎵', '👨‍💻', '👩‍💻', '🧑‍🎤', '🦸', '🧙', '🥷', '👽', '🤖'];
const COLORS = [
  'bg-indigo-500', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-cyan-500', 'bg-purple-500', 'bg-rose-500', 'bg-teal-500',
  'bg-blue-500', 'bg-orange-500', 'bg-lime-500', 'bg-fuchsia-500',
];

interface ChatProps {
  currentUser: User;
  onLogout: () => void;
  onUserUpdate: (user: User) => void;
}

export default function Chat({ currentUser, onLogout, onUserUpdate }: ChatProps) {
  const [contacts, setContacts] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<ChatRequest[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'pending' | 'none'>('none');
  const [contactStatuses, setContactStatuses] = useState<Record<string, 'connected' | 'pending' | 'none'>>({});
  const [contactLastMessages, setContactLastMessages] = useState<Record<string, { text: string; time: number }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load all users and contacts
  const loadData = useCallback(async () => {
    const users = await getUsers();
    const otherUsers = users.filter(u => u.id !== currentUser.id);
    setAllUsers(otherUsers);

    // Only show CONNECTED users in the sidebar (not pending requests)
    const connectedUsers: User[] = [];
    const statuses: Record<string, 'connected' | 'pending' | 'none'> = {};
    const lastMessages: Record<string, { text: string; time: number }> = {};

    for (const user of otherUsers) {
      const connected = await areUsersConnected(currentUser.id, user.id);
      if (connected) {
        connectedUsers.push(user);
        statuses[user.id] = 'connected';
      } else {
        const req = await getChatRequestBetween(currentUser.id, user.id);
        if (req && req.status === 'pending') {
          statuses[user.id] = 'pending';
        } else {
          statuses[user.id] = 'none';
        }
      }

      // Pre-load last message (only for connected users)
      if (connected) {
        const msgs = await getConversation(currentUser.id, user.id);
        if (msgs.length === 0) {
          lastMessages[user.id] = { text: 'No messages yet', time: 0 };
        } else {
          const last = msgs[msgs.length - 1];
          const prefix = last.senderId === currentUser.id ? 'You: ' : '';
          const text = last.text.length > 30 ? last.text.substring(0, 30) + '...' : last.text;
          lastMessages[user.id] = { text: prefix + text, time: last.timestamp };
        }
      }
    }

    setContacts(connectedUsers);
    setContactStatuses(statuses);
    setContactLastMessages(lastMessages);

    // Only auto-select if no contact is currently selected
    // NEVER reset selectedContact during polling - this prevents the screen from disappearing
    if (!selectedContact && connectedUsers.length > 0) {
      setSelectedContact(connectedUsers[0]);
    }
    // If selectedContact exists, NEVER change it during loadData
    // This preserves the view when user is looking at a pending request or any profile
  }, [currentUser.id, selectedContact]);

  // Load messages for selected contact
  const loadMessages = useCallback(async () => {
    if (!selectedContact) return;
    const msgs = await getConversation(currentUser.id, selectedContact.id);
    const formatted: ChatMessage[] = msgs.map(m => ({
      id: m.id,
      text: m.text,
      sender: m.senderId === currentUser.id ? 'me' : 'other',
      timestamp: m.timestamp,
      status: m.status,
    }));
    setChatMessages(formatted);

    // Mark messages as seen
    const hasUnseen = msgs.some(m => m.senderId === selectedContact.id && m.status !== 'seen');
    if (hasUnseen) {
      const connected = await areUsersConnected(currentUser.id, selectedContact.id);
      if (connected) {
        await markMessagesAsSeen(currentUser.id, selectedContact.id);
      }
    }
  }, [currentUser.id, selectedContact]);

  // Load pending requests
  const loadPendingRequests = useCallback(async () => {
    const requests = await getPendingRequestsForUser(currentUser.id);
    setPendingRequests(requests);
  }, [currentUser.id]);

  // Check connection status
  const checkConnection = useCallback(async () => {
    if (!selectedContact) {
      setConnectionStatus('none');
      return;
    }
    const connected = await areUsersConnected(currentUser.id, selectedContact.id);
    if (connected) {
      setConnectionStatus('connected');
    } else {
      const req = await getChatRequestBetween(currentUser.id, selectedContact.id);
      if (!req) {
        setConnectionStatus('none');
      } else if (req.status === 'pending') {
        setConnectionStatus('pending');
        // Make sure pending requests are loaded for the Accept/Reject UI
        await loadPendingRequests();
      }
    }
  }, [currentUser.id, selectedContact, loadPendingRequests]);

  // Initial load
  useEffect(() => {
    loadData();
    loadPendingRequests();
  }, []); // eslint-disable-line

  // When selected contact changes
  useEffect(() => {
    loadMessages();
    checkConnection();
  }, [selectedContact, loadMessages, checkConnection]);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Set up real-time subscriptions
  useEffect(() => {
    // Subscribe to new messages
    const msgSub = subscribeToMessages(() => {
      loadMessages();
      loadData();
    });

    // Subscribe to chat requests
    const reqSub = subscribeToChatRequests(() => {
      loadPendingRequests();
      loadData();
      checkConnection();
    });

    // Subscribe to user updates
    const userSub = subscribeToUsers(() => {
      loadData();
    });

    return () => {
      msgSub.unsubscribe();
      reqSub.unsubscribe();
      userSub.unsubscribe();
    };
  }, [loadMessages, loadData, loadPendingRequests, checkConnection]);

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedContact) return;

    // Check if connected
    const connected = await areUsersConnected(currentUser.id, selectedContact.id);
    if (!connected) {
      // Create chat request if not exists
      const existing = await getChatRequestBetween(currentUser.id, selectedContact.id);
      if (!existing) {
        await createChatRequest(currentUser.id, selectedContact.id);
        await loadPendingRequests();
        await checkConnection();
      }
      setInputText('');
      return;
    }

    await addMessage({
      senderId: currentUser.id,
      receiverId: selectedContact.id,
      text: inputText.trim(),
      timestamp: Date.now(),
      status: 'sent',
    });

    setInputText('');
    await loadMessages();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  const handleAcceptRequest = async (requestId: string, fromUserId: string) => {
    await updateChatRequest(requestId, 'accepted');
    await loadPendingRequests();
    await checkConnection();
    await loadData();
    
    // Select this contact to start chatting
    const user = allUsers.find(u => u.id === fromUserId);
    if (user) {
      setSelectedContact(user);
    }
    setShowNotifications(false);
  };

  const handleRejectRequest = async (requestId: string) => {
    await deleteChatRequest(requestId);
    await loadPendingRequests();
    await checkConnection();
    setShowNotifications(false);
  };

  const handleSendRequest = async () => {
    if (!selectedContact) return;
    await createChatRequest(currentUser.id, selectedContact.id);
    await checkConnection();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filter contacts based on search
  const filteredContacts = searchQuery.trim().length >= 3
    ? allUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : contacts;

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = '';
  chatMessages.forEach(msg => {
    const dateStr = formatDate(msg.timestamp);
    if (dateStr !== currentDate) {
      currentDate = dateStr;
      groupedMessages.push({ date: dateStr, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  return (
    <div className="h-screen w-full flex bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className={`
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        fixed md:relative z-30
        w-80 h-full bg-white border-r border-gray-200 flex flex-col
        transition-transform duration-300 ease-in-out
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              💬 LaxChat
            </h1>
            <div className="flex items-center gap-1">
              {/* Notifications bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors relative"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {pendingRequests.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown */}
                {showNotifications && (
                  <div className="fixed right-4 top-20 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] max-h-[70vh] overflow-y-auto">
                    <div className="p-3 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl">
                      <h3 className="font-semibold text-sm text-gray-800">Chat Requests</h3>
                    </div>
                    {pendingRequests.length === 0 ? (
                      <div className="p-4 text-center text-gray-400 text-sm">
                        No pending requests
                      </div>
                    ) : (
                      pendingRequests.map((req) => {
                        const fromUser = allUsers.find(u => u.id === req.fromUserId);
                        if (!fromUser) return null;
                        return (
                          <div key={req.id} className="p-3 border-b border-gray-50 flex items-center gap-3">
                            {fromUser.profileImage ? (
                              <img
                                src={fromUser.profileImage}
                                alt={fromUser.name}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-full ${fromUser.color} flex items-center justify-center text-lg flex-shrink-0`}>
                                {fromUser.avatar}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{fromUser.name}</p>
                              <p className="text-xs text-gray-500">wants to chat with you</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleAcceptRequest(req.id, req.fromUserId)}
                                className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                title="Accept"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleRejectRequest(req.id)}
                                className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                title="Reject"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Settings */}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Current User */}
          <div className="flex items-center gap-2 mb-3 px-2">
            {currentUser.profileImage ? (
              <img
                src={currentUser.profileImage}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className={`w-8 h-8 rounded-full ${currentUser.color} flex items-center justify-center text-sm`}>
                {currentUser.avatar}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-800">{currentUser.name}</p>
              <p className="text-xs text-green-500">● Online</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Type 3+ chars to search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-9 rounded-full bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-sm"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-6 text-center">
              {searchQuery.trim().length >= 3 ? (
                <>
                  <div className="text-3xl mb-2">🔍</div>
                  <p className="text-gray-400 text-sm">No users found for "{searchQuery}"</p>
                </>
              ) : searchQuery.trim().length > 0 ? (
                <>
                  <div className="text-3xl mb-2">⌨️</div>
                  <p className="text-gray-500 text-sm font-medium">Keep typing...</p>
                  <p className="text-gray-400 text-xs mt-1">Type at least 3 characters to search</p>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-2">💬</div>
                  <p className="text-gray-500 text-sm font-medium">No connections yet</p>
                  <p className="text-gray-400 text-xs mt-1">Search for users above to send chat requests</p>
                </>
              )}
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const status = contactStatuses[contact.id] || 'none';
              const isConnected = status === 'connected';
              const isSearchResult = searchQuery.trim().length >= 3;
              const lastMsgData = contactLastMessages[contact.id] || { text: 'No messages yet', time: 0 };
              
              // Check if there's a pending request from this contact to current user
              const incomingRequest = pendingRequests.find(
                req => req.fromUserId === contact.id && req.toUserId === currentUser.id
              );

              return (
                <div
                  key={contact.id}
                  onClick={() => {
                    setSelectedContact(contact);
                    setShowMobileSidebar(false);
                  }}
                  className={`flex items-center p-4 cursor-pointer transition-colors duration-150 hover:bg-indigo-50 ${
                    selectedContact?.id === contact.id
                      ? 'bg-indigo-50 border-l-4 border-indigo-500'
                      : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="relative">
                    {contact.profileImage ? (
                      <img
                        src={contact.profileImage}
                        alt={contact.name}
                        className="w-12 h-12 rounded-full object-cover shadow-sm"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full ${contact.color} flex items-center justify-center text-xl shadow-sm`}>
                        {contact.avatar}
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-gray-800 text-sm truncate">{contact.name}</h3>
                      {isConnected && lastMsgData.time > 0 && (
                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                          {formatTime(lastMsgData.time)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {isSearchResult && !isConnected && !incomingRequest && (
                        <span className="text-xs text-indigo-500 font-medium mr-1">🔍 Found</span>
                      )}
                      {!isConnected && status === 'pending' && !incomingRequest && (
                        <span className="text-xs text-amber-500 font-medium">⏳ Pending</span>
                      )}
                      {incomingRequest && isSearchResult && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleAcceptRequest(incomingRequest.id, incomingRequest.fromUserId)}
                            className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                          >
                            ✓ Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(incomingRequest.id)}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}
                      {isConnected && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{lastMsgData.text}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            {contacts.length} connection{contacts.length !== 1 ? 's' : ''} • Search to find new users
          </p>
        </div>
      </div>

      {/* Mobile overlay */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 shadow-sm">
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="md:hidden mr-3 p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {selectedContact.profileImage ? (
                <img
                  src={selectedContact.profileImage}
                  alt={selectedContact.name}
                  className="w-10 h-10 rounded-full object-cover shadow-sm"
                />
              ) : (
                <div className={`w-10 h-10 rounded-full ${selectedContact.color} flex items-center justify-center text-lg shadow-sm`}>
                  {selectedContact.avatar}
                </div>
              )}
              <div className="ml-3 flex-1">
                <h2 className="font-semibold text-gray-800 text-sm md:text-base">{selectedContact.name}</h2>
                <p className="text-xs text-green-500">● Online</p>
              </div>

              {/* Connection status badge */}
              {connectionStatus === 'connected' && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  ✓ Connected
                </span>
              )}
              {connectionStatus === 'pending' && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                  ⏳ Pending
                </span>
              )}
            </div>

            {/* Messages or Chat Request UI */}
            {connectionStatus !== 'connected' ? (
              /* Chat Request View */
              <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-6">
                <div className="text-center max-w-sm">
                  {selectedContact.profileImage ? (
                    <img
                      src={selectedContact.profileImage}
                      alt={selectedContact.name}
                      className="w-20 h-20 rounded-full object-cover mx-auto mb-4 shadow-lg"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-full ${selectedContact.color} flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg`}>
                      {selectedContact.avatar}
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-gray-800">{selectedContact.name}</h3>

                  {connectionStatus === 'none' && (
                    <>
                      <p className="text-gray-500 mt-2 mb-6">
                        Send a chat request to start messaging {selectedContact.name}
                      </p>
                      <button
                        onClick={handleSendRequest}
                        className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors shadow-md hover:shadow-lg"
                      >
                        📨 Send Chat Request
                      </button>
                    </>
                  )}

                  {connectionStatus === 'pending' && (
                    <>
                      {(() => {
                        // Check if we received this request or sent it
                        const request = pendingRequests.find(r => 
                          (r.fromUserId === selectedContact.id && r.toUserId === currentUser.id) ||
                          (r.fromUserId === currentUser.id && r.toUserId === selectedContact.id)
                        );
                        
                        if (request && request.toUserId === currentUser.id) {
                          // We received the request - show Accept/Reject buttons
                          return (
                            <>
                              <p className="text-gray-500 mt-2 mb-6">
                                <span className="font-medium text-gray-700">{selectedContact.name}</span> wants to chat with you!
                              </p>
                              <div className="flex gap-3 justify-center">
                                <button
                                  onClick={() => handleAcceptRequest(request.id, request.fromUserId)}
                                  className="px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors shadow-md"
                                >
                                  ✓ Accept
                                </button>
                                <button
                                  onClick={() => handleRejectRequest(request.id)}
                                  className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors shadow-md"
                                >
                                  ✗ Reject
                                </button>
                              </div>
                            </>
                          );
                        } else {
                          // We sent the request - show waiting message
                          return (
                            <>
                              <div className="mt-4 mb-6">
                                <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-medium">
                                  <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                  </svg>
                                  Waiting for response...
                                </div>
                              </div>
                              <p className="text-gray-400 text-sm">
                                Your chat request has been sent to {selectedContact.name}.<br/>
                                You'll be able to chat once they accept.
                              </p>
                            </>
                          );
                        }
                      })()}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-gray-50 to-gray-100">
                  <div className="max-w-3xl mx-auto space-y-1">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-16">
                        <div className="text-5xl mb-4">🎉</div>
                        <h3 className="text-gray-600 font-medium text-lg">You're now connected!</h3>
                        <p className="text-gray-400 text-sm mt-1">
                          Start chatting with {selectedContact.name}
                        </p>
                      </div>
                    )}

                    {groupedMessages.map((group, gi) => (
                      <div key={gi}>
                        {/* Date separator */}
                        <div className="flex items-center justify-center my-4">
                          <span className="bg-white text-gray-400 text-xs px-3 py-1 rounded-full shadow-sm border border-gray-100">
                            {group.date}
                          </span>
                        </div>

                        {/* Messages */}
                        {group.messages.map((message, mi) => (
                          <div
                            key={message.id || mi}
                            className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'} mb-2`}
                          >
                            <div
                              className={`max-w-[75%] md:max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl shadow-sm ${
                                message.sender === 'me'
                                  ? 'bg-indigo-500 text-white rounded-br-md'
                                  : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'
                              }`}
                            >
                              <p className="text-sm leading-relaxed break-words">{message.text}</p>
                              <div className={`flex items-center gap-1 mt-1 justify-end`}>
                                <p className={`text-xs ${message.sender === 'me' ? 'text-indigo-200' : 'text-gray-400'}`}>
                                  {formatTime(message.timestamp)}
                                </p>
                                {message.sender === 'me' && (
                                  <span className="text-xs">
                                    {message.status === 'seen' ? (
                                      <span className="text-sky-200" title="Seen">✓✓</span>
                                    ) : (
                                      <span className="text-indigo-300" title="Sent">✓</span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Message Input */}
                <div className="bg-white border-t border-gray-200 p-3 md:p-4">
                  <div className="max-w-3xl mx-auto flex items-center gap-2 md:gap-3">
                    <button className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors hidden md:block">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="w-full px-4 md:px-5 py-2.5 md:py-3 rounded-full bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-sm"
                      />
                      <button className="absolute right-3 top-2 p-1 rounded-full hover:bg-gray-200 text-gray-400 transition-colors">
                        <span className="text-lg">😊</span>
                      </button>
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!inputText.trim()}
                      className="p-2.5 md:p-3 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          /* No contact selected */
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-xl font-semibold text-gray-600">Welcome to LaxChat</h2>
              <p className="text-gray-400 mt-2">
                {contacts.length > 0
                  ? 'Select a connection to start chatting'
                  : 'Search for users to send chat requests'}
              </p>
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="md:hidden mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm"
              >
                {contacts.length > 0 ? 'View Connections' : 'Find Users'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          currentUser={currentUser}
          onClose={() => setShowSettings(false)}
          onSave={async (updatedUser) => {
            await updateUser(updatedUser);
            onUserUpdate(updatedUser);
            setShowSettings(false);
          }}
        />
      )}
    </div>
  );
}

// ---- Settings Modal ----
interface SettingsModalProps {
  currentUser: User;
  onClose: () => void;
  onSave: (user: User) => void;
}

function SettingsModal({ currentUser, onClose, onSave }: SettingsModalProps) {
  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [color, setColor] = useState(currentUser.color);
  const [profileImage, setProfileImage] = useState<string | undefined>(currentUser.profileImage);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleRemoveImage = () => {
    setProfileImage(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!name.trim() || name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    onSave({
      ...currentUser,
      name: name.trim(),
      avatar,
      color,
      profileImage,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">⚙️ Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Preview */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover shadow-md border-2 border-white"
              />
            ) : (
              <div className={`w-16 h-16 rounded-full ${color} flex items-center justify-center text-3xl shadow-md`}>
                {avatar}
              </div>
            )}
            <div>
              <p className="font-bold text-gray-800 text-lg">{name || 'Your Name'}</p>
              <p className="text-sm text-gray-500">Preview</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-sm"
              placeholder="Enter your name"
            />
          </div>

          {/* Profile Picture Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Picture
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-xl hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                >
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium text-indigo-600">Upload from Gallery</span>
                </button>
                {profileImage && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                    title="Remove profile picture"
                  >
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {profileImage && (
                <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg border border-green-100">
                  <img
                    src={profileImage}
                    alt="Selected"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span className="text-sm text-green-700 font-medium">Image selected ✓</span>
                </div>
              )}
            </div>
          </div>

          {/* Avatar (only show if no profile image) */}
          {!profileImage && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or choose an Emoji Avatar
              </label>
              <div className="grid grid-cols-8 gap-2 max-h-36 overflow-y-auto p-2 bg-gray-50 rounded-xl">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                      avatar === a
                        ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-110'
                        : 'bg-white hover:bg-gray-100 border border-gray-100'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full ${c} transition-all ${
                    color === c
                      ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110'
                      : 'hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg border border-red-100 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors shadow-md"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
