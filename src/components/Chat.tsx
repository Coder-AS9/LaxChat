import { useState, useRef, useEffect, useCallback } from 'react';
import { User, Message, ChatMessage } from '../types';
import {
  getUsers,
  getConversation,
  addMessage,
  broadcastUpdate,
  onBroadcast,
  onStorageChange,
  setCurrentUser,
} from '../utils/storage';

interface ChatProps {
  currentUser: User;
  onLogout: () => void;
}

export default function Chat({ currentUser, onLogout }: ChatProps) {
  const [contacts, setContacts] = useState<User[]>([]);
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const msgIdRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load contacts (all users except current)
  const loadContacts = useCallback(() => {
    const allUsers = getUsers().filter(u => u.id !== currentUser.id);
    setContacts(allUsers);
    if (!selectedContact && allUsers.length > 0) {
      setSelectedContact(allUsers[0]);
    } else if (selectedContact) {
      // Check if selected contact still exists
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
    }));
    setChatMessages(formatted);
  }, [currentUser.id, selectedContact]);

  // Initial load
  useEffect(() => {
    loadContacts();
  }, []); // eslint-disable-line

  // Load messages when contact changes
  useEffect(() => {
    loadMessages();
  }, [selectedContact, loadMessages]);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Listen for real-time updates from other tabs
  useEffect(() => {
    const unsubBroadcast = onBroadcast((data) => {
      if (data.type === 'message' || data.type === 'user') {
        loadContacts();
        loadMessages();
      }
      if (data.type === 'user') {
        loadContacts();
      }
    });

    const unsubStorage = onStorageChange(() => {
      loadContacts();
      loadMessages();
    });

    // Polling fallback for same-tab updates
    const interval = setInterval(() => {
      loadMessages();
      loadContacts();
    }, 2000);

    return () => {
      unsubBroadcast();
      unsubStorage();
      clearInterval(interval);
    };
  }, [loadContacts, loadMessages]);

  const sendMessage = () => {
    if (!inputText.trim() || !selectedContact) return;

    const msg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: inputText.trim(),
      senderId: currentUser.id,
      receiverId: selectedContact.id,
      timestamp: Date.now(),
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
    if (msgs.length === 0) return 'No messages yet';
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

  const getUnreadCount = (_contactId: string): number => {
    // Simplified: no unread tracking in this version
    return 0;
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
    <div className="h-screen w-full flex bg-gray-100">
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
            <h1 className="text-xl font-bold text-indigo-600">💬 ChatApp</h1>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors font-medium"
              title="Logout"
            >
              Logout
            </button>
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
            filteredContacts.map(contact => (
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
                  <p className="text-xs text-gray-500 truncate mt-0.5">{getLastMessage(contact.id)}</p>
                </div>
                {getUnreadCount(contact.id) > 0 && (
                  <span className="ml-2 bg-indigo-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {getUnreadCount(contact.id)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            {contacts.length} user{contacts.length !== 1 ? 's' : ''} available • Open new tabs to add more
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
              {/* Mobile menu button */}
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
              <div className="ml-3">
                <h2 className="font-semibold text-gray-800 text-sm md:text-base">{selectedContact.name}</h2>
                <p className="text-xs text-green-500">● Online</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-gray-50 to-gray-100">
              <div className="max-w-3xl mx-auto space-y-1">
                {chatMessages.length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-4">👋</div>
                    <h3 className="text-gray-600 font-medium text-lg">Start a conversation</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      Send a message to {selectedContact.name}
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
                          <p className={`text-xs mt-1 ${message.sender === 'me' ? 'text-indigo-200' : 'text-gray-400'}`}>
                            {formatTime(message.timestamp)}
                          </p>
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
        ) : (
          /* No contact selected */
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-xl font-semibold text-gray-600">Welcome to ChatApp</h2>
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
    </div>
  );
}
