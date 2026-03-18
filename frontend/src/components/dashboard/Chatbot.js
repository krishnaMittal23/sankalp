"use client";
import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

export default function ChatbotUI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "👋 Hi! I'm your AI Career Copilot. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uniquePresence, setUniquePresence] = useState(null);
  const chatEndRef = useRef(null);

  // ✅ Read uniquePresence from cookies
  const getUniquePresence = () => {
    if (typeof document === "undefined") return null;
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith("uniquePresence="));
    return match ? match.split("=")[1] : null;
  };

  // ✅ Load token and chat history from localStorage on mount
  useEffect(() => {
    const token = getUniquePresence();
    if (token) {
      console.log("✅ uniquePresence from cookies:", token);
      setUniquePresence(token);
    } else {
      console.warn("⚠️ uniquePresence cookie not found!");
    }

    // Load chat history from localStorage
    const savedMessages = localStorage.getItem("chatHistory");
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        setMessages(parsedMessages);
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    }
  }, []);

  // ✅ Save messages to localStorage whenever they change
  useEffect(() => {
    console.log("Saving chat history to localStorage:", messages);
    if (messages.length > 0) {
      localStorage.setItem("chatHistory", JSON.stringify(messages));
    }
  }, [messages]);

  // ✅ Auto-scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Handle Send button
  const handleSend = async () => {
    if (!input.trim()) return;
    if (!uniquePresence) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Please log in first — I can't find your session token." },
      ]);
      return;
    }

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setIsLoading(true);

    console.log("Send clicked ✅", userMessage, "with token:", uniquePresence);

    try {
      // Send chat history for context
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${uniquePresence}`,
        },
        body: JSON.stringify({ 
          message: userMessage,
          chatHistory: messages // Include chat history for context
        }),
      });

      const data = await res.json();

      if (data.reply) {
        setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: `⚠️ ${data.error || "No response received."}` },
        ]);
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Something went wrong, please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Handle enter key press
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  // ✅ Clear chat history
  const clearChat = () => {
    const initialMessage = { sender: "bot", text: "👋 Hi! I'm your AI Career Copilot. How can I help you today?" };
    setMessages([initialMessage]);
    localStorage.setItem("chatHistory", JSON.stringify([initialMessage]));
  };

  return (
    <>
      {/* Floating Chat Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300
          ${isOpen ? "bg-red-500 hover:bg-red-600" : "bg-gradient-to-br from-blue-500 to-indigo-600 hover:scale-110"}
          text-white flex items-center justify-center cursor-pointer`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-6 z-50 w-80 sm:w-96 h-[500px] 
                     bg-white/90 dark:bg-gray-900/95 backdrop-blur-lg rounded-2xl shadow-2xl 
                     border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-fade-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <h2 className="text-base font-semibold">AI Career Copilot</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={clearChat} 
                className="text-xs px-2 py-1 hover:bg-white/20 rounded cursor-pointer"
                title="Clear chat"
              >
                Clear
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full cursor-pointer">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-700 flex flex-col">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                  msg.sender === "bot"
                    ? "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 self-start"
                    : "bg-blue-500 text-white self-end"
                }`}
              >
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500 text-sm self-start">
                <Loader2 className="animate-spin" size={16} />
                Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t dark:border-gray-700 flex items-center gap-2 bg-gray-50 dark:bg-gray-800">
            <input
              type="text"
              className="flex-1 text-black dark:text-white p-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              onClick={handleSend}
              className={`p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center ${
                isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
