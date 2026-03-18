"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Users, MessageCircle, ArrowLeft } from 'lucide-react';

// In-memory cache for the session
const messageCache = {};
const userListCache = { data: null, lastFetch: 0 };

export default function ChatPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserName, setCurrentUserName] = useState(null);
  const [showUserList, setShowUserList] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const scrollLockRef = useRef(false);

  useEffect(() => {
    const uniquePresence = document.cookie
      .split('; ')
      .find(row => row.startsWith('uniquePresence='))
      ?.split('=')[1];

    if (!uniquePresence) {
      setError('Not authenticated. Please log in.');
      setLoading(false);
      return;
    }

    setCurrentUser({ uniquePresence });
    fetchUserData(uniquePresence);
    fetchUsers(uniquePresence);
    setLoading(false);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedUser && currentUser) {
      scrollLockRef.current = false;
      // Initial fetch from cache or server
      fetchMessages(selectedUser.uniquePresence);
      
      // Set up polling for new messages
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(selectedUser.uniquePresence);
      }, 3000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [selectedUser, currentUser]);

  // Smooth scroll only when new messages arrive, not on every render
  useEffect(() => {
    if (!scrollLockRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const fetchUserData = async (uniquePresence) => {
    try {
      const response = await fetch('/api/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${uniquePresence}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentUserName(result.data?.name);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const fetchUsers = async (uniquePresence) => {
    try {
      const now = Date.now();
      // Use cache if data is less than 10 seconds old
      if (userListCache.data && now - userListCache.lastFetch < 10000) {
        setUsers(userListCache.data);
        return;
      }

      const response = await fetch('/api/chat', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${uniquePresence}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch users:', response.status);
        return;
      }

      const text = await response.text();
      if (!text) {
        console.error('Empty response from server');
        return;
      }

      const result = JSON.parse(text);
      if (result.status === 'success') {
        const usersData = result.data || [];
        userListCache.data = usersData;
        userListCache.lastFetch = now;
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      // Use cached data on error if available
      if (userListCache.data) {
        setUsers(userListCache.data);
      } else {
        setUsers([]);
      }
    }
  };

  const fetchMessages = useCallback(async (otherUserPresence) => {
    if (!currentUser) return;

    const cacheKey = `${currentUser.uniquePresence}_${otherUserPresence}`;
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.uniquePresence}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otherUser: otherUserPresence }),
      });

      if (!response.ok) {
        console.error('Failed to fetch messages:', response.status);
        // Use cached messages on error if available
        if (messageCache[cacheKey]) {
          setMessages(messageCache[cacheKey]);
        }
        return;
      }

      const text = await response.text();
      if (!text) return;

      const result = JSON.parse(text);
      if (result.status === 'success') {
        const formattedMessages = (result.data || []).map(msg => ({
          senderId: msg.senderId,
          senderName: msg.senderName,
          receiverId: msg.receiverId,
          message: msg.message,
          timestamp: msg.timestamp,
          isRead: msg.isRead,
          isMine: msg.senderId === currentUser.uniquePresence,
        }));
        
        // Cache the messages
        messageCache[cacheKey] = formattedMessages;
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      // Use cached messages on error if available
      if (messageCache[cacheKey]) {
        setMessages(messageCache[cacheKey]);
      }
    }
  }, [currentUser]);

  const selectUser = (user) => {
    setSelectedUser(user);
    setShowUserList(false);
    scrollLockRef.current = false;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !currentUser) return;

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.uniquePresence}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: selectedUser.uniquePresence,
          senderName: currentUserName,
          receiverName: selectedUser.name,
          message: newMessage.trim(),
        }),
      });

      if (response.ok) {
        setNewMessage('');
        // Immediately fetch updated messages
        fetchMessages(selectedUser.uniquePresence);
      } else {
        console.error('Failed to send message:', response.status);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-red-500 opacity-50" />
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Users List Sidebar */}
      <div className={`${showUserList ? 'w-full md:w-80' : 'hidden md:block md:w-80'} bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden`}>
        <div className="p-4 bg-blue-600 text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            <h2 className="text-xl font-bold">Messages</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {users.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No users available</p>
            </div>
          ) : (
            users.map((user) => (
              <button
                key={user.uniquePresence}
                onClick={() => selectUser(user)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-800 transition-colors border-b border-gray-800 flex-shrink-0 ${
                  selectedUser?.uniquePresence === user.uniquePresence ? 'bg-gray-800' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-100 truncate">{user.name}</p>
                  <p className="text-sm text-gray-400 truncate">{user.email}</p>
                </div>
                {user.unreadCount > 0 && (
                  <div className="bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0">
                    {user.unreadCount}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${showUserList ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-hidden`}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-blue-600 text-white flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setShowUserList(true)}
                className="md:hidden p-2 hover:bg-white/20 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold flex-shrink-0">
                {selectedUser.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{selectedUser.name}</p>
                <p className="text-sm opacity-90 truncate">{selectedUser.email}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-xs lg:max-w-md">
                      {!msg.isMine && (
                        <p className="text-xs text-gray-400 mb-1 ml-2 font-semibold">
                          {msg.senderName}
                        </p>
                      )}
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          msg.isMine
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-gray-800 text-gray-100 rounded-bl-none'
                        }`}
                      >
                        <p className="break-words">{msg.message}</p>
                      </div>
                      <p className={`text-xs text-gray-500 mt-1 ${msg.isMine ? 'text-right' : 'text-left'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-gray-900 border-t border-gray-800 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-700 bg-gray-800 text-white rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 bg-black">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Select a user to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}