"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function RoadmapPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [roadmaps, setRoadmaps] = useState(null);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});

  useEffect(() => {
    const fetchExistingRoadmap = async () => {
      const uniquePresence = document.cookie
        .split("; ")
        .find((row) => row.startsWith("uniquePresence="))
        ?.split("=")[1];

      if (!uniquePresence) return;

      try {
        setLoading(true);
        const response = await fetch("/api/roadmap", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${uniquePresence}`,
          },
        });

        const data = await response.json();
        if (data.status === "success" && data.data?.roadmaps) {
          setRoadmaps(data.data.roadmaps);
          const firstJobId = Object.keys(data.data.roadmaps)[0];
          setSelectedJob(firstJobId);
          
          if (data.source === "cache") {
            toast.success(t("roadmapPage.toastLoadedSaved"));
          }
        }
      } catch (err) {
        console.warn("No cached roadmap found:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExistingRoadmap();
  }, []);

  const handleGenerateRoadmap = async (force = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const uniquePresence = document.cookie
        .split('; ')
        .find(row => row.startsWith('uniquePresence='))
        ?.split('=')[1];

      if (!uniquePresence) {
        throw new Error(t("roadmapPage.loginRequired"));
      }

      const response = await fetch('/api/roadmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${uniquePresence}`
        },
        body: JSON.stringify({ force }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t("roadmapPage.failedGenerate"));
      }

      if (data.status === 'success' && data.data.roadmaps) {
        setRoadmaps(data.data.roadmaps);
        const firstJobId = Object.keys(data.data.roadmaps)[0];
        setSelectedJob(firstJobId);

        if (data.source === "cache") {
          toast.success(t("roadmapPage.toastLoadedProfile"));
        } else {
          toast.success(t("roadmapPage.toastGenerated"));
        }
      } else {
        toast.error(data.message || t("roadmapPage.failedLoad"));
      }
    } catch (err) {
      console.error('Error generating roadmap:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = (stepIndex) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepIndex]: !prev[stepIndex]
    }));
  };

  const formatJobTitle = (jobId) => {
    const parts = jobId.split('-');
    const title = parts.slice(1, -1).join(' ');
    const company = parts[parts.length - 1];
    return { title, company };
  };

  const currentRoadmap = selectedJob && roadmaps ? roadmaps[selectedJob] : null;

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("roadmapPage.back")}
          </button>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            {t("roadmapPage.title")}
          </h1>
          <p className="text-gray-600 text-lg">
            {t("roadmapPage.subtitle")}
          </p>
        </motion.div>

        <motion.div
          key="roadmap"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          {!roadmaps && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center"
            >
              <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">
                    {t("roadmapPage.readyTitle")}
                  </h2>
                  <p className="text-gray-600 mb-2">
                    {t("roadmapPage.readySubtitle")}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t("roadmapPage.readyCaption")}
                  </p>
                </div>

                <button
                  onClick={() => handleGenerateRoadmap(false)}
                  disabled={loading}
                  className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin h-6 w-6"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        {t("roadmapPage.generating")}
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        {t("roadmapPage.generateRoadmap")}
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <p className="text-red-600 text-sm">{error}</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {roadmaps && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Job Selection Sidebar */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-1"
              >
                <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {t("roadmapPage.bookmarkedJobs")}
                  </h3>
                  <div className="space-y-3">
                    {Object.keys(roadmaps).map((jobId) => {
                      const { title, company } = formatJobTitle(jobId);
                      const isSelected = selectedJob === jobId;
                      return (
                        <button
                          key={jobId}
                          onClick={() => setSelectedJob(jobId)}
                          className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                            isSelected
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <div className="font-medium text-sm mb-1 line-clamp-2">
                            {title}
                          </div>
                          <div className={`text-xs ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                            {company}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      setRoadmaps(null);
                      setSelectedJob(null);
                      setExpandedSteps({});
                      handleGenerateRoadmap(true);
                    }}
                    disabled={loading}
                    className="mt-6 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {loading ? t("roadmapPage.regenerating") : t("roadmapPage.generateNew")}
                  </button>
                </div>
              </motion.div>

              {/* Roadmap Content */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-3"
              >
                {currentRoadmap && Array.isArray(currentRoadmap) && (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            {formatJobTitle(selectedJob).title}
                          </h2>
                          <p className="text-gray-600">
                            {formatJobTitle(selectedJob).company} • {currentRoadmap.length} {t("roadmapPage.learningSteps")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Roadmap Steps */}
                    <div className="space-y-4">
                      {currentRoadmap.map((step, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                        >
                          <button
                            onClick={() => toggleStep(index)}
                            className="w-full p-6 flex items-start gap-4 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                                {step.step || index + 1}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                {step.title}
                              </h3>
                              <p className="text-gray-600 text-sm mb-3">
                                {step.description}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  {step.estimatedDuration}
                                </span>
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                    />
                                  </svg>
                                  {step.skills?.length || 0} skills
                                </span>
                                {step.resources?.length > 0 && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                                    <svg
                                      className="w-3 h-3"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                      />
                                    </svg>
                                    {step.resources.length} resources
                                  </span>
                                )}
                              </div>
                            </div>
                            <motion.div
                              animate={{ rotate: expandedSteps[index] ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex-shrink-0"
                            >
                              <svg
                                className="w-6 h-6 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </motion.div>
                          </button>

                          {/* Expanded Content */}
                          <AnimatePresence>
                            {expandedSteps[index] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="border-t border-gray-100"
                              >
                                <div className="p-6 bg-gray-50 space-y-4">
                                  {/* Skills Section */}
                                  {step.skills && step.skills.length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <svg
                                          className="w-4 h-4 text-indigo-600"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                          />
                                        </svg>
                                        Skills You'll Learn
                                      </h4>
                                      <div className="flex flex-wrap gap-2">
                                        {step.skills.map((skill, idx) => (
                                          <span
                                            key={idx}
                                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-indigo-300 hover:shadow-sm transition-all"
                                          >
                                            {skill}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}


                                  {step.resources && step.resources.length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <svg
                                          className="w-4 h-4 text-blue-600"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                          />
                                        </svg>
                                        Learning Resources
                                      </h4>
                                      <div className="space-y-3">
                                        {step.resources.map((resource, idx) => (
                                          <a
                                            key={idx}
                                            href={resource.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all group"
                                          >
                                            <div className="flex items-start gap-3">
                                              <svg
                                                className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5 group-hover:text-blue-600 transition-colors"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                                />
                                              </svg>
                                              <div className="flex-1 min-w-0">
                                                <h5 className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors mb-1 line-clamp-1">
                                                  {resource.title}
                                                </h5>
                                                {resource.description && (
                                                  <p className="text-xs text-gray-500 line-clamp-2">
                                                    {resource.description}
                                                  </p>
                                                )}
                                                <p className="text-xs text-blue-500 mt-1 truncate">
                                                  {resource.url}
                                                </p>
                                              </div>
                                              <svg
                                                className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-blue-500 transition-colors"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                />
                                              </svg>
                                            </div>
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                              
                                  {(!step.resources || step.resources.length === 0) && (
                                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                      <p className="text-sm text-yellow-800">
                                        No resources found yet. Try searching for "{step.skills?.[0]}" tutorials online.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
