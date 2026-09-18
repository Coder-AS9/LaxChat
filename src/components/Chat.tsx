import { useState, useRef, useEffect, useCallback } from 'react';
import { User, Message, ChatMessage, ChatRequest } from '../types';
import {
  getUsers,
  getConversation,
  addMessage,
  broadcastUpdate,
  onBroadcast,
  onStorageChange,
  setCurrentUser,
  updateUser,
  createChatRequest,
  getChatRequestBetween,
  updateChatRequest,
  areUsersConnected,
  getPendingRequestsForUser,
  markMessagesAsSeen,
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
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<ChatRequest[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'pending' | 'rejected' | 'none'>('none');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load contacts
  const loadContacts = useCallback(() => {
    const allUsers = getUsers().filter(u => u.id !== currentUser.id);
    setContacts(allUsers);
    if (!selectedContact && allUsers.length > 0) {
      setSelectedContact(allUsers[0]);
    } else if (selectedContact) {
      const stillExists = allUsers.find(u => u.id === selectedContact.id);
      if (!stillExists) {
        setSelectedContact(allUsers.length > 0 ? allUsers[0] : null);
      }
    }
  }, [currentUser.id, selectedContact]);

  // Load messages for selected contact
  const loadMessages = useCallback(() => {
    if (!selectedContact) return;
    const msgs = getConversation(currentUser.id, selectedContact.id);
    const formatted: ChatMessage[] = msgs.map(m => ({
      id: m.id,
      text: m.text,
      sender: m.senderId === currentUser.id ? 'me' : 'other',
      timestamp: m.timestamp,
      status: m.status,
    }));
    setChatMessages(formatted);

    // Mark messages as seen when viewing
    const hasUnseen = msgs.some(m => m.senderId === selectedContact.id && m.status !== 'seen');
    if (hasUnseen && areUsersConnected(currentUser.id, selectedContact.id)) {
      markMessagesAsSeen(currentUser.id, selectedContact.id);
      broadcastUpdate('seen');
      // Reload to show updated status
      setTimeout(() => {
        const updatedMsgs = getConversation(currentUser.id, selectedContact.id);
        const updatedFormatted: ChatMessage[] = updatedMsgs.map(m => ({
          id: m.id,
          text: m.text,
          sender: m.senderId === currentUser.id ? 'me' : 'other',
          timestamp: m.timestamp,
          status: m.status,
        }));
        setChatMessages(updatedFormatted);
      }, 100);
    }
  }, [currentUser.id, selectedContact]);

  // Check connection status with selected contact
  const checkConnection = useCallback(() => {
    if (!selectedContact) {
      setConnectionStatus('none');
      return;
    }
    const connected = areUsersConnected(currentUser.id, selectedContact.id);
    if (connected) {
      setConnectionStatus('connected');
    } else {
      const req = getChatRequestBetween(currentUser.id, selectedContact.id);
      if (!req) {
        setConnectionStatus('none');
      } else if (req.status === 'pending') {
        if (req.toUserId === currentUser.id) {
          setConnectionStatus('pending'); // I received the request
        } else {
          setConnectionStatus('pending'); // I sent the request
        }
      } else if (req.status === 'rejected') {
        setConnectionStatus('rejected');
      }
    }
  }, [currentUser.id, selectedContact]);

  // Load pending requests
  const loadPendingRequests = useCallback(() => {
    const requests = getPendingRequestsForUser(currentUser.id);
    setPendingRequests(requests);
  }, [currentUser.id]);

  // Initial load
  useEffect(() => {
    loadContacts();
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

  // Listen for real-time updates
  useEffect(() => {
    const unsubBroadcast = onBroadcast(() => {
      loadContacts();
      loadMessages();
      checkConnection();
      loadPendingRequests();
    });

    const unsubStorage = onStorageChange(() => {
      loadContacts();
      loadMessages();
      checkConnection();
      loadPendingRequests();
    });

    const interval = setInterval(() => {
      loadMessages();
      loadContacts();
      loadPendingRequests();
    }, 1500);

    return () => {
      unsubBroadcast();
      unsubStorage();
      clearInterval(interval);
    };
  }, [loadContacts, loadMessages, checkConnection, loadPendingRequests]);

  const sendMessage = () => {
    if (!inputText.trim() || !selectedContact) return;

    // Check if connected
    if (!areUsersConnected(currentUser.id, selectedContact.id)) {
      // Create chat request if not exists
      const existing = getChatRequestBetween(currentUser.id, selectedContact.id);
      if (!existing) {
        createChatRequest(currentUser.id, selectedContact.id);
        broadcastUpdate('request');
        loadPendingRequests();
        checkConnection();
      }
      // Don't send message until accepted
      setInputText('');
      return;
    }

    const msg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: inputText.trim(),
      senderId: currentUser.id,
      receiverId: selectedContact.id,
      timestamp: Date.now(),
      status: 'sent',
    };

    addMessage(msg);
    broadcastUpdate('message');
    setInputText('');
    loadMessages();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    broadcastUpdate('logout');
    onLogout();
  };

  const handleAcceptRequest = (requestId: string, fromUserId: string) => {
    updateChatRequest(requestId, 'accepted');
    broadcastUpdate('request');
    loadPendingRequests();
    checkConnection();
    // Select this contact to start chatting
    const user = getUsers().find(u => u.id === fromUserId);
    if (user) {
      setSelectedContact(user);
    }
    setShowNotifications(false);
  };

  const handleRejectRequest = (requestId: string) => {
    updateChatRequest(requestId, 'rejected');
    broadcastUpdate('request');
    loadPendingRequests();
    setShowNotifications(false);
  };

  const handleSendRequest = () => {
    if (!selectedContact) return;
    createChatRequest(currentUser.id, selectedContact.id);
    broadcastUpdate('request');
    checkConnection();
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

  const getLastMessage = (contactId: string): string => {
    const msgs = getConversation(currentUser.id, contactId);
    if (msgs.length === 0) {
      const req = getChatRequestBetween(currentUser.id, contactId);
      if (req) {
        if (req.status === 'pending') {
          return req.fromUserId === currentUser.id ? '📨 Chat request sent' : '📨 Chat request received';
        }
        if (req.status === 'rejected') return '❌ Request rejected';
      }
      return 'No messages yet';
    }
    const last = msgs[msgs.length - 1];
    const prefix = last.senderId === currentUser.id ? 'You: ' : '';
    const text = last.text.length > 30 ? last.text.substring(0, 30) + '...' : last.text;
    return prefix + text;
  };

  const getLastMessageTime = (contactId: string): number => {
    const msgs = getConversation(currentUser.id, contactId);
    if (msgs.length === 0) return 0;
    return msgs[msgs.length - 1].timestamp;
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-80 overflow-y-auto">
                    <div className="p-3 border-b border-gray-100">
                      <h3 className="font-semibold text-sm text-gray-800">Chat Requests</h3>
                    </div>
                    {pendingRequests.length === 0 ? (
                      <div className="p-4 text-center text-gray-400 text-sm">
                        No pending requests
                      </div>
                    ) : (
                      pendingRequests.map(req => {
                        const fromUser = getUsers().find(u => u.id === req.fromUserId);
                        if (!fromUser) return null;
                        return (
                          <div key={req.id} className="p-3 border-b border-gray-50 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full ${fromUser.color} flex items-center justify-center text-lg flex-shrink-0`}>
                              {fromUser.avatar}
                            </div>
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
            <div className={`w-8 h-8 rounded-full ${currentUser.color} flex items-center justify-center text-sm`}>
              {currentUser.avatar}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{currentUser.name}</p>
              <p className="text-xs text-green-500">● Online</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
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
              <p className="text-gray-400 text-sm">
                {contacts.length === 0
                  ? 'No other users yet. Open another tab to register!'
                  : 'No users match your search'}
              </p>
            </div>
          ) : (
            filteredContacts.map(contact => {
              const isConnected = areUsersConnected(currentUser.id, contact.id);
              const req = getChatRequestBetween(currentUser.id, contact.id);
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
                    <div className={`w-12 h-12 rounded-full ${contact.color} flex items-center justify-center text-xl shadow-sm`}>
                      {contact.avatar}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-gray-800 text-sm truncate">{contact.name}</h3>
                      {getLastMessageTime(contact.id) > 0 && (
                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                          {formatTime(getLastMessageTime(contact.id))}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!isConnected && req?.status === 'pending' && (
                        <span className="text-xs text-amber-500 font-medium">⏳ Pending</span>
                      )}
                      {!isConnected && req?.status === 'rejected' && (
                        <span className="text-xs text-red-400 font-medium">❌ Rejected</span>
                      )}
                      <p className="text-xs text-gray-500 truncate mt-0.5">{getLastMessage(contact.id)}</p>
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
            {contacts.length} user{contacts.length !== 1 ? 's' : ''} available
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

              <div className={`w-10 h-10 rounded-full ${selectedContact.color} flex items-center justify-center text-lg shadow-sm`}>
                {selectedContact.avatar}
              </div>
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
              {connectionStatus === 'rejected' && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                  ❌ Rejected
                </span>
              )}
            </div>

            {/* Messages or Chat Request UI */}
            {connectionStatus !== 'connected' ? (
              /* Chat Request View */
              <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-6">
                <div className="text-center max-w-sm">
                  <div className={`w-20 h-20 rounded-full ${selectedContact.color} flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg`}>
                    {selectedContact.avatar}
                  </div>
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
                        const req = getChatRequestBetween(currentUser.id, selectedContact.id);
                        if (!req) return null;
                        const iAmReceiver = req.toUserId === currentUser.id;

                        if (iAmReceiver) {
                          return (
                            <>
                              <p className="text-gray-500 mt-2 mb-6">
                                <span className="font-medium text-gray-700">{selectedContact.name}</span> wants to chat with you!
                              </p>
                              <div className="flex gap-3 justify-center">
                                <button
                                  onClick={() => handleAcceptRequest(req.id, req.fromUserId)}
                                  className="px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors shadow-md"
                                >
                                  ✓ Accept
                                </button>
                                <button
                                  onClick={() => handleRejectRequest(req.id)}
                                  className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors shadow-md"
                                >
                                  ✗ Reject
                                </button>
                              </div>
                            </>
                          );
                        } else {
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

                  {connectionStatus === 'rejected' && (
                    <>
                      <p className="text-gray-500 mt-2 mb-6">
                        Your chat request was declined. You can try sending again.
                      </p>
                      <button
                        onClick={handleSendRequest}
                        className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors shadow-md"
                      >
                        🔄 Resend Request
                      </button>
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
              <p className="text-gray-400 mt-2">Select a user to start chatting</p>
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="md:hidden mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm"
              >
                View Users
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
          onSave={(updatedUser) => {
            updateUser(updatedUser);
            setCurrentUser(updatedUser);
            onUserUpdate(updatedUser);
            broadcastUpdate('user');
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
  const [error, setError] = useState('');

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
            <div className={`w-16 h-16 rounded-full ${color} flex items-center justify-center text-3xl shadow-md`}>
              {avatar}
            </div>
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

          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Picture (Avatar)
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
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg border border-red-100">
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
