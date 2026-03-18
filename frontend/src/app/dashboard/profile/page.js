"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Calendar,
  Bookmark,
  Edit2,
  Save,
  ArrowLeft,
  X,
  Linkedin,
  Github,
  Globe,
  Award,
  Book,
  TrendingUp
} from "lucide-react";

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const fileInputRef = useRef(null);
  const bannerInputRef = useRef(null);
   const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fetching, setFetching] = useState(true);

    const getUniquePresence = () => {
    if (typeof window === "undefined") return null;
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith("uniquePresence="));
    return match ? match.split("=")[1] : null;
  };
  

  const [profileData, setProfileData] = useState({
    name: "Loading...",
    email: "",
    phone: "",
    location: "",
    title: "",
    bio: "",
    linkedin: "",
    github: "",
    website: "",
    joinDate: "",
    bookmarkedJobs: [], 
  skills: [],         
  goals: []           
  });

  const [tempData, setTempData] = useState(profileData);
  console.log('Temp Data:', tempData);
 

  

  // const bookmarkedJobs = [
  //   {
  //     id: 1,
  //     title: "Senior Frontend Developer",
  //     company: "TechCorp Inc.",
  //     location: "Remote",
  //     salary: "$120k - $150k",
  //     type: "Full-time",
  //     bookmarkedDate: "2 days ago"
  //   },
  //   {
  //     id: 2,
  //     title: "Full Stack Engineer",
  //     company: "StartupXYZ",
  //     location: "San Francisco, CA",
  //     salary: "$130k - $160k",
  //     type: "Full-time",
  //     bookmarkedDate: "5 days ago"
  //   },
  //   {
  //     id: 3,
  //     title: "React Developer",
  //     company: "Digital Agency",
  //     location: "New York, NY",
  //     salary: "$110k - $140k",
  //     type: "Contract",
  //     bookmarkedDate: "1 week ago"
  //   }
  // ];

 

  // const skills = [
  //   "React", "Node.js", "TypeScript", "Python", "AWS",
  //   "Docker", "MongoDB", "PostgreSQL", "GraphQL", "Next.js",
  //   "Tailwind CSS", "Git", "CI/CD", "REST APIs", "Microservices"
  // ];
  const uniquePresence = getUniquePresence();

    
  useEffect(() => {
    const fetchProfile = async () => {
      if (!uniquePresence) return;
      try {
        setFetching(true);
        const response = await fetch("/api/getProfile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${uniquePresence}`,
          },
        });

        const result = await response.json();
        console.log("Fetched profile data:", result);
        if (result.status === "success" && result.data) {
          setProfileData(result.data);
          setTempData(result.data);
        } else {
          console.warn("No profile found, creating new profile...");
          setProfileData({
            name: "New User",
            email: "",
            phone: "",
            location: "",
            title: "",
            bio: "Write something about yourself...",
            linkedin: "",
            github: "",
            website: "",
            joinDate: new Date().toLocaleString("default", { month: "long", year: "numeric" }),
          });
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
        setError("Failed to fetch profile");
      } finally {
        setFetching(false);
      }
    };

    fetchProfile();
  }, [uniquePresence]);
  console.log('Profile Data:', profileData);
    // --- Save to DB ---
  const saveUserProfile = async () => {
    setLoading(true);
    setError(null);

console.log('Saving profile with uniquePresence:', uniquePresence);
    try {
      const response = await fetch("/api/saveProfile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${uniquePresence}`, 
        },
        body: JSON.stringify(tempData),
      });
      console.log('Save profile response:', );

      const result = await response.json();
      if (result.status === "success") {
        setProfileData(tempData); 
        setIsEditing(false);
        alert("Profile saved");
      } else {
        setError(result.message || "Failed to save profile");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while saving profile");
    } finally {
      setLoading(false);
    }
  };


  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = () => {
    setTempData(profileData);
    setIsEditing(true);
  };

  const handleSave = async() => {
    await saveUserProfile(); 
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempData(profileData);
    setIsEditing(false);
  };

  const handleInputChange = (field, value) => {
    setTempData({ ...tempData, [field]: value });
  };

  const toneStyles = {
    indigo: { card: "border-indigo-500/20 bg-indigo-500/5", icon: "text-indigo-200 bg-indigo-500/20" },
    fuchsia: { card: "border-fuchsia-500/20 bg-fuchsia-500/5", icon: "text-fuchsia-200 bg-fuchsia-500/20" },
    emerald: { card: "border-emerald-500/20 bg-emerald-500/5", icon: "text-emerald-200 bg-emerald-500/20" },
  };

  const statCards = [
    { label: "Bookmarked", value: profileData.bookmarkedJobs?.length || 0, icon: Bookmark, tone: "indigo" },
    { label: "Interviews", value: "8", icon: Calendar, tone: "fuchsia" },
    { label: "Skills", value: profileData.skills?.length || 0, icon: Award, tone: "emerald" }
  ];

  const contactFields = [
    { key: "email", label: "Email", icon: Mail, placeholder: "Email address" },
    { key: "phone", label: "Phone", icon: Phone, placeholder: "Phone number" },
    { key: "location", label: "Location", icon: MapPin, placeholder: "City, Country" }
  ];

  const initials = profileData.name
    ? profileData.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "NP";

  const isBusy = fetching || loading;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 overflow-hidden">
      {(fetching || loading) && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-800">
          <div className="h-full w-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-400 animate-pulse" />
        </div>
      )}

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute left-10 bottom-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-10 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 backdrop-blur hover:border-white/20 hover:bg-white/10 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </a>

          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                  <Save className="w-4 h-4" />
                  Save profile
                </button>
                <button
                  onClick={handleCancel}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-200 hover:border-white/20 hover:bg-white/10 transition cursor-pointer"
              >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:shadow-indigo-500/30 cursor-pointer"
            >
                <Edit2 className="w-4 h-4" />
                Edit profile
              </button>
            )}
          </div>
        </div>

        <div className={`overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur ${isBusy ? "opacity-95" : ""}`}>
          <div className="relative h-56">
            {bannerImage ? (
              <img src={bannerImage} alt="Banner" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-slate-800" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-slate-950/80" />
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="absolute right-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:border-white/30 hover:bg-black/60 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Update cover
            </button>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerChange}
              className="hidden"
            />
          </div>

          <div className="px-8 pb-10 -mt-16">
            <div className="flex flex-col gap-6 md:flex-row md:items-end">
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center rounded-2xl border-4 border-slate-900 bg-white shadow-2xl overflow-hidden">
                  <img
                    src={profileImage || "/profile_default.jpg"}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur hover:border-white/30 hover:bg-white/15 cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  Change photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <div className="flex-1 space-y-3">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={tempData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg font-semibold text-white outline-none focus:border-indigo-400 focus:bg-white/10"
                      placeholder="Full name"
                    />
                    <input
                      type="text"
                      value={tempData.title || ""}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-slate-200 outline-none focus:border-indigo-400 focus:bg-white/10"
                      placeholder="Role headline"
                    />
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-bold text-white">{profileData.name}</h1>
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                        Profile ready
                      </span>
                    </div>
                    <p className="text-lg text-slate-200">
                      {profileData.title || "Add a short headline so recruiters know your focus."}
                    </p>
                  </>
                )}

                <div className="flex flex-wrap gap-2 text-sm text-slate-200">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    <MapPin className="w-4 h-4 text-fuchsia-300" />
                    {profileData.location || "Location not set"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    <Calendar className="w-4 h-4 text-emerald-300" />
                    Joined {profileData.joinDate || "recently"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    <Mail className="w-4 h-4 text-indigo-300" />
                    {profileData.email || "Add email"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {statCards.map(({ label, value, icon: Icon, tone }) => (
            <div
              key={label}
              className={`group rounded-2xl border ${toneStyles[tone].card} p-5 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-white/20 hover:shadow-black/40`}
            >
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${toneStyles[tone].icon}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-3xl font-bold text-white">{value}</div>
              <p className="text-sm text-slate-300">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          <div className="space-y-8 xl:col-span-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Book className="w-5 h-5 text-indigo-300" />
                  <h2 className="text-xl font-semibold text-white">About</h2>
                </div>
                {isBusy && <span className="text-xs text-slate-300">Syncing...</span>}
              </div>
              {isEditing ? (
                <textarea
                  value={tempData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-200 outline-none focus:border-indigo-400 focus:bg-white/10"
                  placeholder="Share a quick summary about your experience and goals."
                />
              ) : (
                <p className="text-slate-200 leading-relaxed">
                  {profileData.bio || "Add a short summary about yourself to help teams know you better."}
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-emerald-300" />
                  <h2 className="text-xl font-semibold text-white">Skills & Goals</h2>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {profileData.skills && profileData.skills.length > 0 ? (
                      profileData.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100"
                        >
                          <TrendingUp className="w-4 h-4" />
                          {skill}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">No skills added yet.</p>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Goals</p>
                  <div className="space-y-2">
                    {profileData.goals && profileData.goals.length > 0 ? (
                      profileData.goals.map((goal, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 rounded-2xl border border-indigo-400/20 bg-indigo-500/5 px-4 py-3 text-sm text-slate-100"
                        >
                          <Bookmark className="mt-0.5 w-4 h-4 text-indigo-300" />
                          <span>{goal}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">Tell us what you want to achieve next.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bookmark className="w-5 h-5 text-indigo-300" />
                  <h2 className="text-xl font-semibold text-white">Bookmarked jobs</h2>
                </div>
                <span className="text-sm text-slate-300">
                  {profileData.bookmarkedJobs?.length || 0} saved
                </span>
              </div>
              <div className="space-y-4">
                {profileData.bookmarkedJobs && profileData.bookmarkedJobs.length > 0 ? (
                  profileData.bookmarkedJobs.map((job, index) => (
                    <div
                      key={job.id || index}
                      className="group rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-6 transition hover:border-indigo-400/40 hover:-translate-y-1"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold text-white">{job.title || "Untitled role"}</h3>
                          <p className="text-sm text-indigo-200">{job.company || "Unknown company"}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
                              <MapPin className="w-4 h-4 text-fuchsia-200" />
                              {job.location || "Remote / Anywhere"}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
                              <Briefcase className="w-4 h-4 text-emerald-200" />
                              {job.title || "N/A"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {job.link ? (
                            <a
                              href={job.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-sm font-semibold text-indigo-100 hover:border-indigo-300/50 hover:bg-indigo-500/20 transition cursor-pointer"
                            >
                              <TrendingUp className="w-4 h-4" />
                              View listing
                            </a>
                          ) : (
                            <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300">
                              No link provided
                            </span>
                          )}
                          <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-indigo-200 transition hover:border-indigo-300/50 hover:bg-indigo-500/10 cursor-pointer">
                            <Bookmark className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-slate-400">
                        Bookmarked {job.bookmarkedDate || "recently"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-slate-300">
                    No saved roles yet. Start bookmarking interesting opportunities to see them here.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
              <h2 className="mb-6 text-xl font-semibold text-white">Contact</h2>
              <div className="space-y-4">
                {isEditing ? (
                  contactFields.map((field) => {
                    const Icon = field.icon;
                    return (
                      <div key={field.key} className="space-y-2">
                        <label className="text-sm text-slate-300">{field.label}</label>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                            <Icon className="w-5 h-5 text-indigo-300" />
                          </div>
                          <input
                            type="text"
                            value={tempData[field.key] || ""}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100 outline-none focus:border-indigo-400 focus:bg-white/10"
                            placeholder={field.placeholder}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <>
                    {contactFields.map((field) => {
                      const Icon = field.icon;
                      const value = profileData[field.key];
                      return (
                        <div key={field.key} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                            <Icon className="w-5 h-5 text-indigo-300" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">{field.label}</p>
                            <p className="text-sm font-semibold text-white">{value || "Not provided"}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                        <Calendar className="w-5 h-5 text-emerald-300" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Joined</p>
                        <p className="text-sm font-semibold text-white">{profileData.joinDate || "Recently"}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
              <h2 className="mb-6 text-xl font-semibold text-white">Social</h2>
              <div className="space-y-3">
                {isEditing ? (
                  ["linkedin", "github", "website"].map((key) => {
                    const iconMap = { linkedin: Linkedin, github: Github, website: Globe };
                    const Icon = iconMap[key];
                    return (
                      <div key={key} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <Icon className="w-5 h-5 text-indigo-300" />
                        <input
                          type="text"
                          value={tempData[key] || ""}
                          onChange={(e) => handleInputChange(key, e.target.value)}
                          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100 outline-none focus:border-indigo-400 focus:bg-white/10"
                          placeholder={`${key.charAt(0).toUpperCase() + key.slice(1)} URL`}
                        />
                      </div>
                    );
                  })
                ) : (
                  <>
                    <a
                      href={profileData.linkedin ? `https://${profileData.linkedin}` : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-blue-500/10 px-4 py-3 text-slate-50 transition hover:border-blue-300/40 hover:bg-blue-500/20 cursor-pointer"
                    >
                      <Linkedin className="w-5 h-5 text-blue-300" />
                      <span>{profileData.linkedin || "Add LinkedIn"}</span>
                    </a>
                    <a
                      href={profileData.github ? `https://${profileData.github}` : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-50 transition hover:border-white/20 hover:bg-white/10 cursor-pointer"
                    >
                      <Github className="w-5 h-5 text-slate-200" />
                      <span>{profileData.github || "Add GitHub"}</span>
                    </a>
                    <a
                      href={profileData.website ? `https://${profileData.website}` : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-purple-400/30 bg-purple-500/10 px-4 py-3 text-slate-50 transition hover:border-purple-300/50 hover:bg-purple-500/20 cursor-pointer"
                    >
                      <Globe className="w-5 h-5 text-purple-200" />
                      <span>{profileData.website || "Add portfolio"}</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
