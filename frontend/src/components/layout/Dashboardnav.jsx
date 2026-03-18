"use client";

import React, { useState, useEffect } from "react";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { 
  Briefcase, 
  Map, 
  Video, 
  FileQuestion, 
  Menu, 
  X, 
  ChevronDown,
  User,
  LogOut,
  Settings
} from "lucide-react";

export default function DashboardNav() {
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userData, setUserData] = useState({
    name: "Loading...",
    email: "loading@example.com",
    profileImage: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    setPathname(window.location.pathname);
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const uniquePresence = document.cookie
        .split('; ')
        .find(row => row.startsWith('uniquePresence='))
        ?.split('=')[1];

      if (!uniquePresence) {
        console.error("No authentication token found");
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/getProfile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${uniquePresence}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserData({
          name: data.data.name || data.username || "User",
          email: data.data.email || "user@example.com",
          profileImage: data.data.profileImage || data.avatar || null,
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const navLinks = [
    {
      name: t("navbar.jobs"),
      path: "/dashboard/jobs",
      icon: <Briefcase className="w-5 h-5" />,
      description: t("navbar.jobsDesc")
    },
    {
      name: t("navbar.roadmap"),
      path: "/dashboard/roadmap",
      icon: <Map className="w-5 h-5" />,
      description: t("navbar.roadmapDesc")
    },
    {
      name: t("navbar.interview"),
      path: "/dashboard/interview",
      icon: <Video className="w-5 h-5" />,
      description: t("navbar.interviewDesc")
    },
    {
      name: t("navbar.quiz"),
      path: "/dashboard/quiz",
      icon: <FileQuestion className="w-5 h-5" />,
      description: t("navbar.quizDesc")
    }
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      window.location.href = "/auth/login";
    }
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (path) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/50 shadow-2xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent hidden sm:block">
              NextStep
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <a
                key={link.path}
                href={link.path}
                className={`relative px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 group ${
                  isActive(link.path)
                    ? "text-white bg-blue-600/20 border border-blue-500/30 shadow-lg shadow-blue-500/10"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <span className={`transition-transform duration-200 ${isActive(link.path) ? "text-blue-400" : "group-hover:scale-110"}`}>
                  {link.icon}
                </span>
                <span>{link.name}</span>
              </a>
            ))}
          </div>

          {/* User Profile Dropdown */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher compact />
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-all duration-200 border border-slate-800/50 hover:border-blue-500/30 group"
              >
                <img 
                  src={userData.profileImage || "/profile_default.jpg"} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-lg object-cover shadow-lg cursor-pointer"
                />
                <div className="text-left hidden lg:block">
                  <p className="text-sm font-semibold text-white">{isLoading ? t("navbar.loading") : userData.name}</p>
                  <p className="text-xs text-slate-400">{t("navbar.viewProfile")}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-800/50 overflow-hidden animate-fadeIn">
                  <div className="p-3 border-b border-slate-800/50 bg-gradient-to-r from-blue-900/20 to-cyan-900/20">
                    <p className="text-sm font-semibold text-white">{userData.name}</p>
                    <p className="text-xs text-slate-400">{userData.email}</p>
                  </div>
                  
                  <div className="py-2">
                    <a
                      href="/dashboard/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors"
                    >
                      <User className="w-4 h-4" />
                      {t("navbar.myProfile")}
                    </a>
                    <a
                      href="/dashboard/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      {t("navbar.settings")}
                    </a>
                  </div>

                  <div className="border-t border-slate-800/50 py-2">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      {t("navbar.logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800/50 animate-fadeIn">
            <div className="px-4 mb-3">
              <LanguageSwitcher />
            </div>
            <div className="space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.path}
                  href={link.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive(link.path)
                      ? "bg-blue-600/20 border border-blue-500/30 text-white shadow-lg"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className={isActive(link.path) ? "text-blue-400" : ""}>
                    {link.icon}
                  </span>
                  <div>
                    <p className="font-medium">{link.name}</p>
                    <p className="text-xs opacity-75">{link.description}</p>
                  </div>
                </a>
              ))}
            </div>

            {/* Mobile User Section */}
            <div className="mt-4 pt-4 border-t border-slate-800/50">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 mb-2">
                <img 
                  src={userData.profileImage || "/profile_default.jpg"} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-lg object-cover shadow-lg cursor-pointer"
                />
                <div>
                  <p className="text-sm font-semibold text-white">{isLoading ? "Loading..." : userData.name}</p>
                  <p className="text-xs text-slate-400">{userData.email}</p>
                </div>
              </div>

              <div className="space-y-1">
                <a
                  href="/dashboard/profile"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4" />
                  {t("navbar.myProfile")}
                </a>
                <a
                  href="/dashboard/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  {t("navbar.settings")}
                </a>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors w-full"
                >
                  <LogOut className="w-4 h-4" />
                  {t("navbar.logout")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </nav>
  );
}
