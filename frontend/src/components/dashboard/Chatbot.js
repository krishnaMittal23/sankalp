"use client";
import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ChatbotUI() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "👋 Hi! I'm your AI Career Copilot. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [uniquePresence, setUniquePresence] = useState(null);
  const chatEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const wasVoiceInputRef = useRef(false);
  const currentAudioRef = useRef(null);
  const ttsCache = useRef(new Map());

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
    setIsRedirecting(false);

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

      if (data.intent && data.intent !== "NONE") {
        // Show the redirect message in chat
        setMessages((prev) => [...prev, { sender: "bot", text: data.reply, type: "redirect" }]);
        setIsRedirecting(true);

        // Build redirect URL
        const routes = {
          QUIZ: `/dashboard/quiz${data.params?.topic ? `?topic=${encodeURIComponent(data.params.topic)}` : ""}`,
          JOB_SEARCH: `/dashboard/jobs${data.params?.search ? `?search=${encodeURIComponent(data.params.search)}` : ""}`,
          RESUME: "/dashboard/resume",
          MOCK_INTERVIEW: "/dashboard/interview",
          ROADMAP: "/dashboard/roadmap",
        };

        const url = routes[data.intent];
        if (url) {
          setTimeout(() => {
            setIsOpen(false);
            router.push(url);
          }, 1200);
        }
      } else if (data.reply) {
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

  // ✅ Stop currently playing audio
  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  };

  // ✅ Play bot reply as speech via Deepgram TTS (with caching)
  const speakText = async (text) => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      setIsSpeaking(true);

      let audioBase64 = ttsCache.current.get(text);

      if (!audioBase64) {
        const res = await fetch("/api/chatbot/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        audioBase64 = data.audioBase64;

        if (audioBase64) {
          // Cache and limit to 10 most recent entries
          ttsCache.current.set(text, audioBase64);
          if (ttsCache.current.size > 10) {
            const oldest = ttsCache.current.keys().next().value;
            ttsCache.current.delete(oldest);
          }
        }
      }

      if (audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
        currentAudioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
        };
        await audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
    }
  };

  // ✅ Start voice recording
  const startRecording = async () => {
    if (!navigator.mediaDevices) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Your browser doesn't support microphone access." },
      ]);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Microphone access denied. Please allow mic permissions." },
      ]);
    }
  };

  // ✅ Stop recording and transcribe via Deepgram
  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = async () => {
      setIsTranscribing(true);
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(",")[1];
        try {
          const res = await fetch("/api/chatbot/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioBase64: base64Audio }),
          });
          const data = await res.json();

          if (data.transcript && data.transcript.trim()) {
            wasVoiceInputRef.current = true;
            handleSendWithText(data.transcript);
          } else {
            setMessages((prev) => [
              ...prev,
              { sender: "bot", text: "🤔 I didn't catch that. Could you try speaking again?" },
            ]);
          }
        } catch (error) {
          console.error("Transcription error:", error);
          setMessages((prev) => [
            ...prev,
            { sender: "bot", text: "⚠️ Failed to transcribe audio. Please try again." },
          ]);
        } finally {
          setIsTranscribing(false);
        }
      };
      reader.readAsDataURL(audioBlob);
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    setIsRecording(false);
  };

  // ✅ Send a specific text (used by voice input)
  const handleSendWithText = async (text) => {
    if (!text.trim()) return;
    if (!uniquePresence) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Please log in first — I can't find your session token." },
      ]);
      return;
    }

    const userMessage = text;
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setIsLoading(true);
    setIsRedirecting(false);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${uniquePresence}`,
        },
        body: JSON.stringify({
          message: userMessage,
          chatHistory: messages,
        }),
      });

      const data = await res.json();

      if (data.intent && data.intent !== "NONE") {
        setMessages((prev) => [...prev, { sender: "bot", text: data.reply, type: "redirect" }]);
        setIsRedirecting(true);

        const routes = {
          QUIZ: `/dashboard/quiz${data.params?.topic ? `?topic=${encodeURIComponent(data.params.topic)}` : ""}`,
          JOB_SEARCH: `/dashboard/jobs${data.params?.search ? `?search=${encodeURIComponent(data.params.search)}` : ""}`,
          RESUME: "/dashboard/resume",
          MOCK_INTERVIEW: "/dashboard/interview",
          ROADMAP: "/dashboard/roadmap",
        };

        const url = routes[data.intent];
        if (url) {
          setTimeout(() => {
            setIsOpen(false);
            router.push(url);
          }, 1200);
        }
      } else if (data.reply) {
        setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
        if (wasVoiceInputRef.current) speakText(data.reply);
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
      wasVoiceInputRef.current = false;
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

  // ✅ Render formatted bot message with bullets, bold, and paragraphs
  const renderBotMessage = (text) => {
    const lines = text.split("\n").filter((l) => l.trim());
    const elements = [];
    let bulletGroup = [];

    const flushBullets = () => {
      if (bulletGroup.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-1.5 text-gray-300">
            {bulletGroup.map((item, idx) => (
              <li key={idx} className="leading-relaxed">{formatInline(item)}</li>
            ))}
          </ul>
        );
        bulletGroup = [];
      }
    };

    const formatInline = (str) => {
      const parts = str.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="text-white font-medium">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    for (const line of lines) {
      const trimmed = line.trim();
      const bulletMatch = trimmed.match(/^(?:[-*•]|\d+[.)]) (.+)/);
      if (bulletMatch) {
        bulletGroup.push(bulletMatch[1]);
      } else {
        flushBullets();
        elements.push(
          <p key={`p-${elements.length}`} className="text-gray-200 leading-relaxed my-1 whitespace-pre-wrap">
            {formatInline(trimmed)}
          </p>
        );
      }
    }
    flushBullets();

    return elements;
  };

  return (
    <>
      {/* Floating Chat Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-[0_10px_30px_-8px_rgba(0,0,0,0.35)] transition-all duration-300
          ${isOpen ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700 hover:scale-105"}
          text-white flex items-center justify-center cursor-pointer`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-in Chat Panel */}
      <div
        className={`fixed top-4 right-4 bottom-4 z-50 w-[calc(100%-2rem)] sm:w-[440px] md:w-[480px]
                     bg-gray-900 text-gray-100
                     shadow-[-8px_0_30px_-12px_rgba(0,0,0,0.5)]
                     rounded-2xl flex flex-col overflow-hidden
                     transition-transform duration-300 ease-in-out
                     ${isOpen ? "translate-x-0" : "translate-x-[calc(100%+2rem)]"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gray-800 text-gray-100 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">AI Career Copilot</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 uppercase tracking-wide">AI</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={clearChat} 
              className="text-xs px-2 py-1 hover:bg-gray-700 rounded cursor-pointer text-gray-400 hover:text-gray-200"
              title="Clear chat"
            >
              Clear
            </button>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-700 rounded-full cursor-pointer text-gray-400 hover:text-gray-200" aria-label="Close chat">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 chatbot-scrollbar flex flex-col">
          {messages.map((msg, i) => {
            const isBot = msg.sender === "bot";
            const isRedirect = msg.type === "redirect";
            return (
              <div
                key={i}
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  isBot
                    ? isRedirect
                      ? "bg-amber-900/40 text-amber-200 border border-amber-700/50 self-start"
                      : "bg-gray-800/90 text-gray-100 border border-gray-700/60 self-start"
                    : "bg-blue-600 text-white self-end"
                }`}
              >
                {isBot && !isRedirect
                  ? renderBotMessage(msg.text)
                  : <span className="whitespace-pre-wrap">{msg.text}</span>
                }
                {isBot && !isRedirect && i > 0 && (
                  <button
                    onClick={() => speakText(msg.text)}
                    className="mt-1 p-1 rounded-full hover:bg-gray-600/50 text-blue-400 hover:text-blue-300 transition cursor-pointer"
                    title="Listen to this message"
                    disabled={isSpeaking}
                  >
                    <Volume2 size={18} />
                  </button>
                )}
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm self-start">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.2s]" />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.1s]" />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
              </span>
              <span>Thinking...</span>
            </div>
          )}
          {isSpeaking && (
            <div className="flex items-center gap-2 text-blue-300 text-sm self-start">
              <Volume2 size={18} className="animate-pulse text-blue-300" />
              <span>Speaking...</span>
              <button
                onClick={stopSpeaking}
                className="p-1 rounded-full hover:bg-red-500/20 text-red-400 hover:text-red-300 transition cursor-pointer"
                title="Stop speaking"
              >
                <VolumeX size={18} />
              </button>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-gray-700 flex items-center gap-3 bg-gray-800">
          <input
            type="text"
            className="flex-1 text-gray-100 placeholder:text-gray-500 px-4 py-3 rounded-xl border border-gray-600 
                       bg-gray-700 text-base outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            placeholder={isRecording ? "🎙️ Listening..." : isTranscribing ? "✍️ Transcribing..." : "Ask me anything..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || isRedirecting || isRecording || isTranscribing}
          />
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-xl transition ${
              isRecording
                ? "bg-red-500 text-white animate-pulse hover:bg-red-600"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600"
            } ${isLoading || isRedirecting || isTranscribing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            disabled={isLoading || isRedirecting || isTranscribing}
            title={isRecording ? "Stop recording" : "Start voice input"}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button
            type="button"
            onClick={handleSend}
            className={`p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition ${
              isLoading || isRedirecting || isRecording || isTranscribing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
            disabled={isLoading || isRedirecting || isRecording || isTranscribing}
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </>
  );
}
