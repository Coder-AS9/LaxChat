import { useState, useRef, useEffect } from 'react';

interface Message {
  id: number;
  text: string;
  sender: 'me' | 'other';
  timestamp: Date;
}

interface Contact {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  online: boolean;
}

const contacts: Contact[] = [
  { id: 1, name: 'Alice Johnson', avatar: '👩', lastMessage: 'Hey! How are you?', online: true },
  { id: 2, name: 'Bob Smith', avatar: '👨', lastMessage: 'See you tomorrow!', online: true },
  { id: 3, name: 'Carol White', avatar: '👩‍💼', lastMessage: 'Thanks for the help!', online: false },
  { id: 4, name: 'David Brown', avatar: '👨‍💻', lastMessage: 'The project is done', online: true },
  { id: 5, name: 'Eva Martinez', avatar: '👩‍🎨', lastMessage: 'Love the new design!', online: false },
];

const autoReplies: Record<number, string[]> = {
  1: ['That sounds great!', 'I totally agree with you.', 'Let me think about it...', 'Haha, that\'s funny!', 'Sure, let\'s do it!'],
  2: ['Awesome!', 'No worries at all.', 'I\'ll get back to you on that.', 'Sounds like a plan!', 'Great idea!'],
  3: ['You\'re welcome!', 'Happy to help anytime.', 'Let me know if you need anything else.', 'Of course!', 'Anytime!'],
  4: ['Working on it!', 'Almost done.', 'I\'ll push the changes soon.', 'Check the latest commit.', 'LGTM! 👍'],
  5: ['Thanks so much!', 'I\'m so glad you like it!', 'More designs coming soon!', 'Appreciate the feedback!', 'That means a lot! 🎨'],
};

export default function App() {
  const [selectedContact, setSelectedContact] = useState<Contact>(contacts[0]);
  const [messages, setMessages] = useState<Record<number, Message[]>>({
    1: [
      { id: 1, text: 'Hey! How are you?', sender: 'other', timestamp: new Date(Date.now() - 3600000) },
      { id: 2, text: 'I\'m doing great, thanks! How about you?', sender: 'me', timestamp: new Date(Date.now() - 3500000) },
      { id: 3, text: 'Pretty good! Want to grab coffee later?', sender: 'other', timestamp: new Date(Date.now() - 3400000) },
    ],
    2: [
      { id: 1, text: 'Are we still meeting tomorrow?', sender: 'other', timestamp: new Date(Date.now() - 7200000) },
      { id: 2, text: 'Yes, 10 AM at the usual place', sender: 'me', timestamp: new Date(Date.now() - 7100000) },
      { id: 3, text: 'See you tomorrow!', sender: 'other', timestamp: new Date(Date.now() - 7000000) },
    ],
    3: [
      { id: 1, text: 'Can you help me with the report?', sender: 'other', timestamp: new Date(Date.now() - 86400000) },
      { id: 2, text: 'Sure! I\'ll send it over in a bit.', sender: 'me', timestamp: new Date(Date.now() - 86300000) },
      { id: 3, text: 'Thanks for the help!', sender: 'other', timestamp: new Date(Date.now() - 86200000) },
    ],
    4: [
      { id: 1, text: 'How\'s the project going?', sender: 'me', timestamp: new Date(Date.now() - 1800000) },
      { id: 2, text: 'Almost finished! Just running tests.', sender: 'other', timestamp: new Date(Date.now() - 1700000) },
    ],
    5: [
      { id: 1, text: 'Check out my new portfolio!', sender: 'other', timestamp: new Date(Date.now() - 43200000) },
      { id: 2, text: 'Wow, it looks amazing!', sender: 'me', timestamp: new Date(Date.now() - 43100000) },
      { id: 3, text: 'Love the new design!', sender: 'other', timestamp: new Date(Date.now() - 43000000) },
    ],
  });
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(100);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedContact]);

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: messageIdRef.current++,
      text: inputText.trim(),
      sender: 'me',
      timestamp: new Date(),
    };

    setMessages(prev => ({
      ...prev,
      [selectedContact.id]: [...(prev[selectedContact.id] || []), newMessage],
    }));
    setInputText('');

    // Simulate auto-reply
    setTimeout(() => {
      const replies = autoReplies[selectedContact.id] || ['Got it!', 'Thanks!', 'OK!'];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const replyMessage: Message = {
        id: messageIdRef.current++,
        text: randomReply,
        sender: 'other',
        timestamp: new Date(),
      };
      setMessages(prev => ({
        ...prev,
        [selectedContact.id]: [...(prev[selectedContact.id] || []), replyMessage],
      }));
    }, 1000 + Math.random() * 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen w-full flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-indigo-600 mb-3">💬 ChatApp</h1>
          <div className="relative">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 rounded-full bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-sm"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.map(contact => (
            <div
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`flex items-center p-4 cursor-pointer transition-colors duration-150 hover:bg-indigo-50 ${
                selectedContact.id === contact.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'
              }`}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-2xl">
                  {contact.avatar}
                </div>
                {contact.online && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800 text-sm truncate">{contact.name}</h3>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{contact.lastMessage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6 shadow-sm">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-xl">
              {selectedContact.avatar}
            </div>
            {selectedContact.online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
            )}
          </div>
          <div className="ml-3">
            <h2 className="font-semibold text-gray-800">{selectedContact.name}</h2>
            <p className="text-xs text-gray-500">
              {selectedContact.online ? '🟢 Online' : '⚫ Offline'}
            </p>
          </div>
          <div className="ml-auto flex gap-3">
            <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-gray-100">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages[selectedContact.id]?.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl shadow-sm ${
                    message.sender === 'me'
                      ? 'bg-indigo-500 text-white rounded-br-md'
                      : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  <p className={`text-xs mt-1 ${message.sender === 'me' ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
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
                className="w-full px-5 py-3 rounded-full bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-sm"
              />
              <button className="absolute right-3 top-2.5 p-1 rounded-full hover:bg-gray-200 text-gray-400 transition-colors">
                <span className="text-lg">😊</span>
              </button>
            </div>
            <button
              onClick={sendMessage}
              disabled={!inputText.trim()}
              className="p-3 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
