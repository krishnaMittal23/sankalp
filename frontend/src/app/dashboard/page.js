"use client";

import React, { useState, useRef, useEffect } from "react";
import { LogOut, Upload, Target, FileText, CheckCircle } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, Float } from "@react-three/drei";
import DashboardNav from "@/components/layout/Dashboardnav";
import ChatbotButton from "@/components/dashboard/Chatbot";
import Analytics from "@/components/dashboard/Analytics";
import { useLanguage } from "@/components/providers/LanguageProvider";

function AnimatedSphere({ position, color, speed }) {
  const meshRef = useRef(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * speed;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * speed * 0.5;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Sphere ref={meshRef} args={[1, 32, 32]} position={position}>
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.8}
          transparent
          opacity={0.6}
        />
      </Sphere>
    </Float>
  );
}

function Stars() {
  const count = 200;
  const positions = new Float32Array(count * 3);
  
  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 20;
  }

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.6} />
    </points>
  );
}

function Background3D() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 5]} intensity={0.5} />
        <pointLight position={[-10, -10, -5]} intensity={0.3} color="#a855f7" />
        
        <AnimatedSphere position={[-2, 1, 0]} color="#8b5cf6" speed={0.2} />
        <AnimatedSphere position={[2, -1, -1]} color="#ec4899" speed={0.15} />
        <AnimatedSphere position={[0, 0, -2]} color="#3b82f6" speed={0.25} />
        
        <Stars />
      </Canvas>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [file, setFile] = useState(null);
  const [goals, setGoals] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [skills, setSkills] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [quizScores, setQuizScores] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const uniquePresence = document.cookie
        .split('; ')
        .find(row => row.startsWith('uniquePresence='))
        ?.split('=')[1];

      // Fetch interviews from backend
      try {
        const res = await fetch('http://localhost:3001/interviews');
        const data = await res.json();
        setInterviews(Array.isArray(data) ? data : (data.interviews || []));
      } catch (err) {
        console.error('Error fetching interviews:', err);
      }

      if (uniquePresence) {
        // Fetch profile for skills
        try {
          const res = await fetch('/api/getProfile', {
            headers: { 'Authorization': `Bearer ${uniquePresence}` }
          });
          const data = await res.json();
          if (data.status === 'success') {
            setSkills(data.data.skills || []);
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
        }

        // Fetch quiz scores
        try {
          const res = await fetch('/api/getScores', {
            headers: { 'Authorization': `Bearer ${uniquePresence}` }
          });
          const data = await res.json();
          if (data.status === 'success') {
            setQuizScores(data.data || []);
          }
        } catch (err) {
          console.error('Error fetching scores:', err);
        }
      }
    };

    fetchDashboardData();
  }, []);

  const completedInterviews = interviews.filter(i => i.reports && i.reports.length > 0).length;
  const avgQuizScore = quizScores.length > 0
    ? Math.round(quizScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / quizScores.length)
    : 0;

  const features = [
    {
      title: t("dashboardHome.featureJobsTitle"),
      description: t("dashboardHome.featureJobsDesc"),
      link: "/dashboard/jobs",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: t("dashboardHome.featureRoadmapTitle"),
      description: t("dashboardHome.featureRoadmapDesc"),
      link: "/dashboard/roadmap",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      title: t("dashboardHome.featureInterviewTitle"),
      description: t("dashboardHome.featureInterviewDesc"),
      link: "/dashboard/interview",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: t("dashboardHome.featureQuizTitle"),
      description: t("dashboardHome.featureQuizDesc"),
      link: "/dashboard/quiz",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      title: t("dashboardHome.featureResumeTitle"),
      description: t("dashboardHome.featureResumeDesc"),
      link: "/dashboard/resume",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
     {
      title: t("dashboardHome.featureChatTitle"),
      description: t("dashboardHome.featureChatDesc"),
      link: "/dashboard/chat",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    }
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
      } else {
        alert(t("dashboardHome.alertUploadType"));
        e.target.value = '';
      }
    }
  };

  const handleProcess = async () => {
    if (!file && !goals.trim()) {
      alert(t("dashboardHome.alertDocOrGoals"));
      return;
    }

    setIsProcessing(true);

    try {
      const uniquePresence = document.cookie
        .split('; ')
        .find(row => row.startsWith('uniquePresence='))
        ?.split('=')[1];

      let extractedText = null;

      if (file) {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const extractResponse = await fetch('/api/extract-text', {
            method: 'POST',
            body: formData,
          });

          if (!extractResponse.ok) {
            throw new Error(t("dashboardHome.alertExtractFailed"));
          }

          const extractData = await extractResponse.json();
          extractedText = extractData.text;
          
        } catch (error) {
          console.error('Error extracting text:', error);
          alert(t("dashboardHome.alertProcessingDocument"));
          setIsProcessing(false);
          return;
        }
      }

      const apiCalls = [];
      const processingBody = {};
      
      if (extractedText) {
        processingBody.fileName = file.name;
        processingBody.fileSize = file.size;
        processingBody.doc_text = extractedText;
      }
      if (goals.trim()) {
        processingBody.goals = goals;
      }
      apiCalls.push(
        fetch('/api/user/processing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${uniquePresence}`
          },
          body: JSON.stringify(processingBody),
        })
      );

      if (extractedText && jobDescription.trim()) {
        const atsBody = {
          doc_text: extractedText,
          jobDescription: jobDescription.trim(),
          fileName: file.name
        };

        apiCalls.push(
          fetch('/api/user/ats-check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${uniquePresence}`
            },
            body: JSON.stringify(atsBody),
          })
        );
      }

      const results = await Promise.allSettled(apiCalls);
      console.log('API call results:', results);

      const processingResult = results[0];
      if (processingResult.status === 'fulfilled') {
        const data = await processingResult.value.json();
        if (!processingResult.value.ok) {
          if (processingResult.value.status === 401) {
            alert(`${t("dashboardHome.alertAuthFailed")}: ` + (data.error || t("dashboardHome.unauthorized")));
          } else if (processingResult.value.status === 429) {
            alert(`${t("dashboardHome.alertRateLimit")} ${data.retryAfter || t("dashboardHome.aWhile")} ${t("dashboardHome.seconds")}.`);
          } else {
            alert(`${t("dashboardHome.alertProcessingError")}: ${data.error || t("dashboardHome.somethingWrong")}`);
          }
        } else {
          console.log('Processing API Response:', data);
        }
      } else {
        console.error('Processing API failed:', processingResult.reason);
        alert(t("dashboardHome.alertApiFailed"));
      }

      if (results.length > 1) {
        const atsResult = results[1];
        if (atsResult.status === 'fulfilled') {
          const atsData = await atsResult.value.json();
          if (!atsResult.value.ok) {
            console.error('ATS Check Error:', atsData);
            alert(`${t("dashboardHome.alertAtsError")}: ${atsData.error || t("dashboardHome.somethingWrong")}`);
          } else {
            console.log('ATS Check Response:', atsData);
            alert(`${t("dashboardHome.alertSuccessAts")} ${atsData.data.atsAnalysis.matchScore}%`);
          }
        } else {
          console.error('ATS Check failed:', atsResult.reason);
          alert(t("dashboardHome.alertAtsFailedSaved"));
        }
      }

      if (results[0].status === 'fulfilled') {
        alert(t("dashboardHome.alertProcessingCompleted"));
        setFile(null);
        setGoals('');
        setJobDescription('');
        setShowUploadSection(false);
      }

    } catch (error) {
      console.error('Error calling API:', error);
      alert(t("dashboardHome.alertRequestError"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("user_id");
      localStorage.removeItem("role");
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      window.location.href = "/auth/login";
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Background3D />
      <ChatbotButton /> 
      
      <div className="relative z-10 container mx-auto px-4 py-8 space-y-8">
        <DashboardNav />
        
        <div className="text-center space-y-3 py-6">
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-white">
            {t("dashboardHome.welcome")}
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            {t("dashboardHome.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-400">{t("dashboardHome.cardQuizzes")}</p>
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{quizScores.length}</p>
            <p className="text-sm text-slate-500 mt-1">{quizScores.length > 0 ? `${avgQuizScore}% ${t("dashboardHome.avgScore")}` : t("dashboardHome.noQuizzes")}</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-400">{t("dashboardHome.cardInterviews")}</p>
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{interviews.length}</p>
            <p className="text-sm text-slate-500 mt-1">{completedInterviews} {t("dashboardHome.completed")}</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-400">{t("dashboardHome.cardSkills")}</p>
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{skills.length}</p>
            <p className="text-sm text-slate-500 mt-1">{skills.length > 0 ? `${skills.slice(0, 3).join(', ')}` : t("dashboardHome.noSkills")}</p>
          </div>
        </div>

        <Analytics />

        <div 
  className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-2xl"
  onMouseEnter={() => setShowUploadSection(true)}
  onMouseLeave={() => setShowUploadSection(false)}
>
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center">
        <Upload className="w-6 h-6 text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white">{t("dashboardHome.docTitle")}</h2>
        <p className="text-slate-400">{t("dashboardHome.docSubtitle")}</p>
      </div>
    </div>
  </div>

  <div className={`space-y-6 transition-all duration-800 overflow-hidden ${
    showUploadSection 
      ? 'max-h-[2000px] opacity-100 translate-y-0' 
      : 'max-h-0 opacity-0 -translate-y-4'
  }`}>
    <div>
      <label className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <Upload className="w-4 h-4" />
        {t("dashboardHome.uploadResume")}
      </label>
      <input
        type="file"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx"
        className="block w-full text-sm text-slate-400
          file:mr-4 file:py-3 file:px-6
          file:rounded-lg file:border-0
          file:text-sm file:font-semibold
          file:bg-primary file:text-white
          hover:file:bg-primary/80
          border border-slate-800 rounded-lg
          bg-slate-950/50
          focus:outline-none focus:border-primary transition-colors"
      />
      {file && (
        <div className="mt-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-primary">{t("dashboardHome.selected")}</span> {file.name}
            <span className="text-slate-500 ml-2">({(file.size / 1024).toFixed(2)} KB)</span>
          </p>
        </div>
      )}
    </div>

    <div>
      <label className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <Target className="w-4 h-4" />
        {t("dashboardHome.yourGoals")}
      </label>
      <textarea
        value={goals}
        onChange={(e) => setGoals(e.target.value)}
        placeholder={t("dashboardHome.yourGoalsPlaceholder")}
        rows={4}
        className="w-full px-4 py-3 border border-slate-800 rounded-lg
          bg-slate-950/50 text-white placeholder-slate-500
          focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
      />
    </div>

    <div>
      <label className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        {t("dashboardHome.jobDescription")}
      </label>
      <textarea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder={t("dashboardHome.jobDescriptionPlaceholder")}
        rows={5}
        className="w-full px-4 py-3 border border-slate-800 rounded-lg
          bg-slate-950/50 text-white placeholder-slate-500
          focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
      />
      {file && jobDescription.trim() && (
        <p className="mt-3 text-sm text-green-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {t("dashboardHome.atsParallel")}
        </p>
      )}
    </div>

    <button
      onClick={handleProcess}
      disabled={isProcessing}
      className="w-full py-4 px-6 bg-gradient-to-r from-primary to-primary/80 text-white font-bold rounded-lg
        hover:shadow-lg hover:shadow-primary/25 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900
        transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
        transform hover:scale-[1.02] active:scale-[0.98]"
    >
      {isProcessing ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {t("dashboardHome.processing")}
        </span>
      ) : (
        t("dashboardHome.processDocument")
      )}
    </button>
  </div>
</div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <a
              key={index}
              href={feature.link}
              className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-slate-900/50 backdrop-blur-xl p-8 shadow-lg hover:shadow-primary/20 hover:border-primary/50 transform hover:scale-105 transition-all duration-300 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 space-y-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                  {feature.icon}
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="flex items-center text-primary font-semibold group-hover:gap-3 gap-2 transition-all">
                  <span>{t("dashboardHome.getStarted")}</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-white shadow-2xl shadow-primary/30">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-3xl font-bold">{t("dashboardHome.readyTitle")}</h3>
              <p className="text-white/90 text-lg">{t("dashboardHome.readySubtitle")}</p>
            </div>
            <button className="px-8 py-4 bg-white text-primary font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 whitespace-nowrap cursor-pointer">
              {t("dashboardHome.completeProfile")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
