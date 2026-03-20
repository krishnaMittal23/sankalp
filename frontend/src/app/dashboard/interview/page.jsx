"use client"

// import React, { useState, useEffect, useRef } from 'react';
// import { Camera, Mic, Square, Play, AlertCircle, CheckCircle, Loader, Volume2, VolumeX, Loader2 } from 'lucide-react';

// const API_URL = 'http://localhost:3000';
// const FLASK_URL = 'http://127.0.0.1:5001';

// const AIInterviewerVideo = ({ isListening, isSpeaking, videoRef }) => {
//   return (
//     <div className="relative w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
//       <video
//         ref={videoRef}
//         className="w-full h-full object-cover"
//         muted
//         playsInline
//       >
//         <source src="/interviewer-video.mp4" type="video/mp4" />
//         Your browser does not support the video tag.
//       </video>

//       <div className="absolute inset-0 pointer-events-none">
//         {isSpeaking && (
//           <div className="absolute top-4 left-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-lg">
//             <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
//             AI Speaking
//           </div>
//         )}

//         {isListening && (
//           <div className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-lg">
//             <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
//             Listening to You
//           </div>
//         )}

//         <div className="absolute bottom-6 left-0 right-0 text-center">
//           <div className="inline-block bg-black bg-opacity-60 backdrop-blur-sm px-6 py-3 rounded-full">
//             <p className="text-white text-lg font-semibold">
//               {isSpeaking ? '🗣️ AI Interviewer Speaking...' : isListening ? '👂 Listening to you...' : '💼 Ready for Interview'}
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// const InterviewPlatform = () => {
//   const [step, setStep] = useState('setup');
//   const [role, setRole] = useState('');
//   const [skills, setSkills] = useState('');
//   const [userName, setUserName] = useState('');
//   const [interview, setInterview] = useState(null);
//   const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
//   const [isRecording, setIsRecording] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [transcripts, setTranscripts] = useState([]);
//   const [analysisStatus, setAnalysisStatus] = useState(null);
//   const [report, setReport] = useState(null);
  
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [isLoadingAudio, setIsLoadingAudio] = useState(false);
//   const [audioError, setAudioError] = useState(null);
  
//   const mediaRecorderRef = useRef(null);
//   const audioChunksRef = useRef([]);
//   const audioRef = useRef(null);
//   const analysisPollingRef = useRef(null);
//   const interviewerVideoRef = useRef(null);

//   useEffect(() => {
//     if (step === 'interview' && interview && interview.questions[currentQuestionIndex]) {
//       playQuestionAudio();
//     }
    
//     return () => {
//       if (audioRef.current) {
//         audioRef.current.pause();
//         audioRef.current = null;
//       }
//       if (interviewerVideoRef.current) {
//         interviewerVideoRef.current.pause();
//       }
//     };
//   }, [currentQuestionIndex, step]);

//   useEffect(() => {
//     const video = interviewerVideoRef.current;
//     if (!video) return;

//     if (isPlaying) {
//       video.play().catch(err => console.error('Video play error:', err));
//     } else {
//       video.pause();
//       video.currentTime = 0;
//     }
//   }, [isPlaying]);

//   const playQuestionAudio = async () => {
//     if (!interview) return;
    
//     const currentQuestion = interview.questions[currentQuestionIndex];
//     if (!currentQuestion?.id) return;

//     setIsLoadingAudio(true);
//     setAudioError(null);

//     try {
//       const response = await fetch(
//         `${API_URL}/interviews/${interview.id}/questions/${currentQuestion.id}/audio`
//       );

//       if (!response.ok) throw new Error('Failed to fetch audio');

//       const audioBlob = await response.blob();
//       const audioUrl = URL.createObjectURL(audioBlob);

//       const audio = new Audio(audioUrl);
//       audioRef.current = audio;

//       audio.onplay = () => setIsPlaying(true);
//       audio.onended = () => {
//         setIsPlaying(false);
//         URL.revokeObjectURL(audioUrl);
//       };
//       audio.onerror = () => {
//         setAudioError('Error playing audio');
//         setIsPlaying(false);
//       };

//       await audio.play();
//     } catch (error) {
//       console.error('Error playing question audio:', error);
//       setAudioError('Could not load audio');
//     } finally {
//       setIsLoadingAudio(false);
//     }
//   };

//   const handleReplayAudio = () => {
//     if (audioRef.current) {
//       audioRef.current.currentTime = 0;
//       audioRef.current.play();
//     } else {
//       playQuestionAudio();
//     }
//   };

//   const handleStopAudio = () => {
//     if (audioRef.current) {
//       audioRef.current.pause();
//       audioRef.current.currentTime = 0;
//       setIsPlaying(false);
//     }
//   };

//   const createInterview = async () => {
//     try {
//       const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
//       const response = await fetch(`${API_URL}/interviews`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ 
//           role, 
//           skills: skillsArray,
//           userName: userName || 'Anonymous'
//         })
//       });
      
//       const data = await response.json();
//       setInterview(data);
//       setStep('interview');
//       startAnalysisPolling(data.id);
//     } catch (error) {
//       alert('Failed to create interview: ' + error.message);
//     }
//   };

//   const startAnalysisPolling = (interviewId) => {
//     if (analysisPollingRef.current) {
//       clearInterval(analysisPollingRef.current);
//     }

//     analysisPollingRef.current = setInterval(async () => {
//       try {
//         const response = await fetch(`${API_URL}/interviews/${interviewId}/analysis-status`);
//         const data = await response.json();
//         setAnalysisStatus(data);
//       } catch (error) {
//         console.error('Analysis polling error:', error);
//       }
//     }, 2000);
//   };

//   useEffect(() => {
//     return () => {
//       if (analysisPollingRef.current) {
//         clearInterval(analysisPollingRef.current);
//       }
//     };
//   }, []);

//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       const mediaRecorder = new MediaRecorder(stream);
//       mediaRecorderRef.current = mediaRecorder;
//       audioChunksRef.current = [];

//       mediaRecorder.ondataavailable = (event) => {
//         audioChunksRef.current.push(event.data);
//       };

//       mediaRecorder.start();
//       setIsRecording(true);
//     } catch (error) {
//       alert('Microphone access denied: ' + error.message);
//     }
//   };

//   const stopRecording = async () => {
//     if (!mediaRecorderRef.current) return;

//     return new Promise((resolve) => {
//       mediaRecorderRef.current.onstop = async () => {
//         setIsProcessing(true);
//         const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
//         const reader = new FileReader();
//         reader.onloadend = async () => {
//           const base64Audio = reader.result.split(',')[1];
          
//           try {
//             const currentQuestion = interview.questions[currentQuestionIndex];
//             const response = await fetch(`${API_URL}/interviews/${interview.id}/answer`, {
//               method: 'POST',
//               headers: { 'Content-Type': 'application/json' },
//               body: JSON.stringify({
//                 questionId: currentQuestion.id,
//                 audioBase64: base64Audio
//               })
//             });

//             const data = await response.json();
//             await pollEvaluation(data.transcriptId);
//             setIsProcessing(false);
            
//             if (currentQuestionIndex < interview.questions.length - 1) {
//               setCurrentQuestionIndex(currentQuestionIndex + 1);
//             } else {
//               if (analysisPollingRef.current) {
//                 clearInterval(analysisPollingRef.current);
//               }
//               await fetchFinalReport();
//               setStep('results');
//             }
//           } catch (error) {
//             alert('Failed to submit answer: ' + error.message);
//             setIsProcessing(false);
//           }
//         };
//         reader.readAsDataURL(audioBlob);
//         resolve();
//       };

//       mediaRecorderRef.current.stop();
//       mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
//       setIsRecording(false);
//     });
//   };

//   const pollEvaluation = async (transcriptId) => {
//     let attempts = 0;
//     while (attempts < 20) {
//       try {
//         const response = await fetch(`${API_URL}/interviews/transcripts/${transcriptId}/evaluation`);
//         const data = await response.json();
        
//         if (data.status === 'completed') {
//           setTranscripts(prev => [...prev, data]);
//           return;
//         }
        
//         await new Promise(resolve => setTimeout(resolve, 1000));
//         attempts++;
//       } catch (error) {
//         console.error('Evaluation polling error:', error);
//         attempts++;
//       }
//     }
//   };

//   const fetchFinalReport = async () => {
//     try {
//       const response = await fetch(`${API_URL}/interviews/${interview.id}/report`);
//       const data = await response.json();
//       setReport(data);
//     } catch (error) {
//       console.error('Failed to fetch report:', error);
//     }
//   };

//   if (step === 'setup') {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
//         <div className="max-w-2xl mx-auto">
//           <div className="bg-white rounded-2xl shadow-xl p-8">
//             <div className="text-center mb-8">
//               <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
//                 <span className="text-4xl">🤖</span>
//               </div>
//               <h1 className="text-3xl font-bold text-gray-800 mb-2">AI Interview Copilot</h1>
//               <p className="text-gray-600">Practice with a virtual AI interviewer</p>
//             </div>
            
//             <div className="space-y-6">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Your Name
//                 </label>
//                 <input
//                   type="text"
//                   value={userName}
//                   onChange={(e) => setUserName(e.target.value)}
//                   placeholder="John Doe"
//                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Role/Position
//                 </label>
//                 <input
//                   type="text"
//                   value={role}
//                   onChange={(e) => setRole(e.target.value)}
//                   placeholder="e.g., Software Engineer"
//                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Skills (comma-separated)
//                 </label>
//                 <input
//                   type="text"
//                   value={skills}
//                   onChange={(e) => setSkills(e.target.value)}
//                   placeholder="e.g., React, Node.js, Python"
//                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
//                 />
//               </div>

//               <button
//                 onClick={createInterview}
//                 disabled={!role || !skills}
//                 className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
//               >
//                 Start Interview
//               </button>
//             </div>

//             <div className="mt-6 bg-blue-50 rounded-lg p-4">
//               <h4 className="font-semibold text-blue-900 mb-2">🎯 Features:</h4>
//               <ul className="text-sm text-blue-800 space-y-1">
//                 <li>• Interactive AI interviewer with voice</li>
//                 <li>• Real-time body language & voice analysis</li>
//                 <li>• Comprehensive evaluation & feedback</li>
//                 <li>• Detailed performance report</li>
//               </ul>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (step === 'interview') {
//     const currentQuestion = interview?.questions[currentQuestionIndex];
    
//     return (
//       <div className="min-h-screen bg-gray-900 p-4">
//         <div className="max-w-7xl mx-auto">
//           {/* Main Grid Layout */}
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 2rem)' }}>
            
//             <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 2rem)' }}>
//               {/* AI Interviewer Video - Fixed height */}
//               <div className="bg-black rounded-2xl overflow-hidden shadow-2xl" style={{ height: '60%', minHeight: '400px' }}>
//                 <AIInterviewerVideo 
//                   isListening={isRecording} 
//                   isSpeaking={isPlaying}
//                   videoRef={interviewerVideoRef}
//                 />
//               </div>

//               {/* Your Video Feed - Fixed height */}
//               <div className="bg-white rounded-xl shadow-lg p-4" style={{ height: '35%', minHeight: '250px' }}>
//                 <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Video</h3>
//                 <div className="bg-gray-900 rounded-lg overflow-hidden relative" style={{ height: 'calc(100% - 28px)' }}>
//                   <img 
//                     src={`${FLASK_URL}/api/video-feed/${interview.id}`}
//                     alt="Video feed"
//                     className="w-full h-full object-cover"
//                   />
//                   {isRecording && (
//                     <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
//                       <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
//                       RECORDING
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="lg:col-span-2 flex flex-col gap-4">
//               <div className="bg-white rounded-xl shadow-lg p-4">
//                 <div className="flex justify-between text-sm text-gray-600 mb-2">
//                   <span>Question {currentQuestionIndex + 1} of {interview.questions.length}</span>
//                   <span>{Math.round(((currentQuestionIndex + 1) / interview.questions.length) * 100)}%</span>
//                 </div>
//                 <div className="w-full bg-gray-200 rounded-full h-2">
//                   <div 
//                     className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
//                     style={{ width: `${((currentQuestionIndex + 1) / interview.questions.length) * 100}%` }}
//                   />
//                 </div>
//               </div>

//               <div className="bg-white rounded-xl shadow-lg p-6 flex-grow overflow-y-auto">
//                 <div className="flex items-start justify-between gap-4 mb-4">
//                   <h2 className="text-xl font-bold text-gray-800 flex-1">
//                     {currentQuestion?.text}
//                   </h2>
                  
//                   <div className="flex gap-2">
//                     {isLoadingAudio ? (
//                       <div className="p-3 bg-gray-100 rounded-lg">
//                         <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
//                       </div>
//                     ) : isPlaying ? (
//                       <button
//                         onClick={handleStopAudio}
//                         className="p-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
//                         title="Stop audio"
//                       >
//                         <VolumeX className="w-5 h-5" />
//                       </button>
//                     ) : (
//                       <button
//                         onClick={handleReplayAudio}
//                         className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
//                         title="Play/Replay question"
//                       >
//                         <Volume2 className="w-5 h-5" />
//                       </button>
//                     )}
//                   </div>
//                 </div>

//                 {audioError && (
//                   <div className="text-sm text-amber-600 mb-4">
//                      {audioError}
//                   </div>
//                 )}

//                 {/* Analysis Status */}
//                 {analysisStatus?.active && (
//                   <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
//                     <div className="text-sm font-medium text-gray-700 mb-3">📊 Real-time Analysis</div>
//                     <div className="grid grid-cols-3 gap-4 text-center">
//                       <div>
//                         <div className="text-xs text-gray-600 mb-1">Body</div>
//                         <div className="text-2xl font-bold text-blue-600">
//                           {analysisStatus.results.body_language_score?.toFixed(0) || '--'}
//                         </div>
//                       </div>
//                       <div>
//                         <div className="text-xs text-gray-600 mb-1">Voice</div>
//                         <div className="text-2xl font-bold text-green-600">
//                           {analysisStatus.results.voice_tone_score?.toFixed(0) || '--'}
//                         </div>
//                       </div>
//                       <div>
//                         <div className="text-xs text-gray-600 mb-1">Score</div>
//                         <div className="text-2xl font-bold text-purple-600">
//                           {analysisStatus.results.combined_score?.toFixed(0) || '--'}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 <div className="flex flex-col items-center space-y-4">
//                   {!isRecording && !isProcessing && (
//                     <>
//                       <button
//                         onClick={startRecording}
//                         disabled={isPlaying}
//                         className="flex items-center space-x-2 bg-red-600 text-white px-8 py-4 rounded-full font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
//                       >
//                         <Mic size={24} />
//                         <span>Start Recording Answer</span>
//                       </button>
//                       {isPlaying && (
//                         <p className="text-sm text-gray-600">
//                            Wait for AI to finish speaking...
//                         </p>
//                       )}
//                     </>
//                   )}

//                   {isRecording && (
//                     <button
//                       onClick={stopRecording}
//                       className="flex items-center space-x-2 bg-gray-800 text-white px-8 py-4 rounded-full font-semibold hover:bg-gray-900 transition animate-pulse shadow-lg"
//                     >
//                       <Square size={24} />
//                       <span>Stop Recording</span>
//                     </button>
//                   )}

//                   {isProcessing && (
//                     <div className="flex items-center space-x-2 text-blue-600">
//                       <Loader className="animate-spin" size={24} />
//                       <span className="font-medium">Processing your answer...</span>
//                     </div>
//                   )}
//                 </div>

//                 {transcripts.length > 0 && transcripts[transcripts.length - 1] && (
//                   <div className="mt-6 space-y-4">
//                     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//                       <div className="flex items-center gap-2 mb-2">
//                         <Mic className="w-4 h-4 text-blue-600" />
//                         <h3 className="font-semibold text-blue-900 text-sm">Your Response:</h3>
//                       </div>
//                       <p className="text-sm text-gray-700 italic">
//                         "{transcripts[transcripts.length - 1].transcript}"
//                       </p>
//                     </div>

//                     {transcripts[transcripts.length - 1].evaluation && (
//                       <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
//                         <h3 className="font-semibold text-purple-900 text-sm mb-3">AI Evaluation:</h3>
                        
//                         <div className="grid grid-cols-4 gap-2 mb-4">
//                           <div className="bg-white rounded-lg p-2 text-center">
//                             <div className="text-xs text-gray-600">Response</div>
//                             <div className="text-lg font-bold text-blue-600">
//                               {transcripts[transcripts.length - 1].scores?.response || '--'}
//                             </div>
//                           </div>
//                           <div className="bg-white rounded-lg p-2 text-center">
//                             <div className="text-xs text-gray-600">Voice</div>
//                             <div className="text-lg font-bold text-green-600">
//                               {transcripts[transcripts.length - 1].scores?.voiceTone || '--'}
//                             </div>
//                           </div>
//                           <div className="bg-white rounded-lg p-2 text-center">
//                             <div className="text-xs text-gray-600">Body</div>
//                             <div className="text-lg font-bold text-purple-600">
//                               {transcripts[transcripts.length - 1].scores?.bodyLanguage || '--'}
//                             </div>
//                           </div>
//                           <div className="bg-white rounded-lg p-2 text-center border-2 border-purple-300">
//                             <div className="text-xs text-gray-600">Final</div>
//                             <div className="text-lg font-bold text-purple-700">
//                               {transcripts[transcripts.length - 1].scores?.final || '--'}
//                             </div>
//                           </div>
//                         </div>

//                         <div className="space-y-3 text-sm">
//                           <div className="bg-white rounded-lg p-3">
//                             <div className="font-semibold text-gray-700 mb-1">💬 Notes:</div>
//                             <p className="text-gray-600">
//                               {transcripts[transcripts.length - 1].evaluation.notes}
//                             </p>
//                           </div>
                          
//                           <div className="bg-green-50 rounded-lg p-3">
//                             <div className="font-semibold text-green-800 mb-1">✅ Strengths:</div>
//                             <p className="text-green-700">
//                               {transcripts[transcripts.length - 1].evaluation.strengths}
//                             </p>
//                           </div>
                          
//                           <div className="bg-amber-50 rounded-lg p-3">
//                             <div className="font-semibold text-amber-800 mb-1">📈 Areas for Improvement:</div>
//                             <p className="text-amber-700">
//                               {transcripts[transcripts.length - 1].evaluation.improvements}
//                             </p>
//                           </div>

//                           {transcripts[transcripts.length - 1].evaluation.voiceAnalysis && (
//                             <div className="bg-blue-50 rounded-lg p-3">
//                               <div className="font-semibold text-blue-800 mb-2">🎤 Voice Analysis:</div>
//                               <div className="grid grid-cols-2 gap-2 text-xs">
//                                 <div>
//                                   <span className="text-gray-600">Positive Sentiment:</span>
//                                   <span className="font-bold text-green-600 ml-1">
//                                     {(transcripts[transcripts.length - 1].evaluation.voiceAnalysis.vader?.pos * 100).toFixed(1)}%
//                                   </span>
//                                 </div>
//                                 <div>
//                                   <span className="text-gray-600">Confidence Score:</span>
//                                   <span className="font-bold text-blue-600 ml-1">
//                                     {(transcripts[transcripts.length - 1].evaluation.voiceAnalysis.vader?.compound * 100).toFixed(1)}%
//                                   </span>
//                                 </div>
//                               </div>
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
//       <div className="max-w-4xl mx-auto">
//         <div className="bg-white rounded-2xl shadow-xl p-8">
//           <div className="text-center mb-8">
//             <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
//               <CheckCircle className="w-10 h-10 text-green-600" />
//             </div>
//             <h1 className="text-3xl font-bold text-gray-800 mb-2">Interview Complete!</h1>
//             <p className="text-gray-600">Great job, {userName || 'Candidate'}! Here's your detailed feedback.</p>
//           </div>
          
//           {report && (
//             <div className="space-y-6">
//               <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
//                 <h2 className="text-xl font-semibold text-gray-800 mb-4">📋 Final Report</h2>
//                 <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
//                   {report.content}
//                 </pre>
//               </div>

//               {transcripts.length > 0 && (
//                 <div className="space-y-4">
//                   <h2 className="text-xl font-semibold text-gray-800">📊 Question Breakdown</h2>
//                   {transcripts.map((t, idx) => (
//                     <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
//                       <h3 className="font-semibold text-gray-700 mb-3">
//                         Q{idx + 1}: {t.question}
//                       </h3>
//                       <div className="grid grid-cols-4 gap-4 text-center mt-4">
//                         <div className="bg-blue-50 rounded-lg p-3">
//                           <div className="text-xs text-gray-600 mb-1">Response</div>
//                           <div className="text-xl font-bold text-blue-600">
//                             {t.scores?.response || '--'}
//                           </div>
//                         </div>
//                         <div className="bg-green-50 rounded-lg p-3">
//                           <div className="text-xs text-gray-600 mb-1">Voice</div>
//                           <div className="text-xl font-bold text-green-600">
//                             {t.scores?.voiceTone || '--'}
//                           </div>
//                         </div>
//                         <div className="bg-purple-50 rounded-lg p-3">
//                           <div className="text-xs text-gray-600 mb-1">Body</div>
//                           <div className="text-xl font-bold text-purple-600">
//                             {t.scores?.bodyLanguage || '--'}
//                           </div>
//                         </div>
//                         <div className="bg-gray-100 rounded-lg p-3">
//                           <div className="text-xs text-gray-600 mb-1">Final</div>
//                           <div className="text-xl font-bold text-gray-800">
//                             {t.scores?.final || '--'}
//                           </div>
//                         </div>
//                       </div>
                      
//                       <div className="mt-4 pt-4 border-t border-gray-200">
//                         <p className="text-sm text-gray-600 mb-2">
//                           <span className="font-medium">Your Answer:</span> {t.transcript}
//                         </p>
//                         {t.evaluation && (
//                           <div className="space-y-2 text-sm">
//                             <p className="text-gray-700">
//                               <span className="font-medium text-green-700">Strengths:</span> {t.evaluation.strengths}
//                             </p>
//                             <p className="text-gray-700">
//                               <span className="font-medium text-amber-700">Improvements:</span> {t.evaluation.improvements}
//                             </p>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               <button
//                 onClick={() => window.location.reload()}
//                 className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition"
//               >
//                 Start New Interview
//               </button>
//             </div>
//           )}

//           {!report && (
//             <div className="text-center py-12">
//               <Loader className="animate-spin w-12 h-12 text-blue-600 mx-auto mb-4" />
//               <p className="text-gray-600">Generating your report...</p>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default InterviewPlatform;


import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Square, Play, AlertCircle, CheckCircle, Loader, Volume2, VolumeX, Loader2, TrendingUp, Brain, ArrowLeft } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const FLASK_URL = process.env.NEXT_PUBLIC_AI_URL || 'http://127.0.0.1:5001';

const AIInterviewerVideo = ({ isListening, isSpeaking, videoRef }) => {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
      >
        <source src="/interviewer-video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div className="absolute inset-0 pointer-events-none">
        {isSpeaking && (
          <div className="absolute top-4 left-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            AI Speaking
          </div>
        )}

        {isListening && (
          <div className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Listening to You
          </div>
        )}

        <div className="absolute bottom-6 left-0 right-0 text-center">
          <div className="inline-block bg-black bg-opacity-60 backdrop-blur-sm px-6 py-3 rounded-full">
            <p className="text-white text-lg font-semibold">
              {isSpeaking ? '🗣️ AI Interviewer Speaking...' : isListening ? '👂 Listening to you...' : '💼 Ready for Interview'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const InterviewPlatform = () => {
  const [userId] = useState(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('interview_userId');
    if (stored) {
      console.log('📌 Using existing userId:', stored);
      return stored;
    }
    const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('interview_userId', newId);
    console.log('🆕 Generated new userId:', newId);
    return newId;
  });

  const [step, setStep] = useState('setup');
  const [role, setRole] = useState('');
  const [skills, setSkills] = useState('');
  const [userName, setUserName] = useState('');
  const [interview, setInterview] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [report, setReport] = useState(null);
  
  const [contextUsed, setContextUsed] = useState(false);
  const [previousInterviewCount, setPreviousInterviewCount] = useState(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const analysisPollingRef = useRef(null);
  const interviewerVideoRef = useRef(null);

  useEffect(() => {
    if (userId) {
      fetchUserHistory();
    }
  }, [userId]);

  const fetchUserHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/interviews`);
      const data = await response.json();
      const allInterviews = Array.isArray(data) ? data : (data.interviews || []);
      const userInterviews = allInterviews.filter(i => 
        i.userName === userName || i.userId === userId
      );
      setPreviousInterviewCount(userInterviews.length);
      console.log(`📊 User has ${userInterviews.length} previous interviews`);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  useEffect(() => {
    if (step === 'interview' && interview && interview.questions[currentQuestionIndex]) {
      playQuestionAudio();
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (interviewerVideoRef.current) {
        interviewerVideoRef.current.pause();
      }
    };
  }, [currentQuestionIndex, step]);

  useEffect(() => {
    const video = interviewerVideoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(err => console.error('Video play error:', err));
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isPlaying]);

  const playQuestionAudio = async () => {
    if (!interview) return;
    
    const currentQuestion = interview.questions[currentQuestionIndex];
    if (!currentQuestion?.id) return;

    setIsLoadingAudio(true);
    setAudioError(null);

    try {
      const response = await fetch(
        `${API_URL}/interviews/${interview.id}/questions/${currentQuestion.id}/audio`
      );

      if (!response.ok) throw new Error('Failed to fetch audio');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setAudioError('Error playing audio');
        setIsPlaying(false);
      };

      await audio.play();
    } catch (error) {
      console.error('Error playing question audio:', error);
      setAudioError('Could not load audio');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleReplayAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      playQuestionAudio();
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const createInterview = async () => {
    try {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
      const response = await fetch(`${API_URL}/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role, 
          skills: skillsArray,
          userName: userName || 'Anonymous',
          userId: userId
        })
      });
      
      const data = await response.json();
      if (!response.ok || data.error) {
        alert('Failed to create interview: ' + (data.error || data.details || 'Unknown error'));
        return;
      }
      if (!data.questions || data.questions.length === 0) {
        alert('Interview created but no questions were generated. Please try again.');
        return;
      }
      setInterview(data);
      setContextUsed(data.contextUsed || false);
      console.log('🎯 Context used:', data.contextUsed);
      
      setStep('interview');
      startAnalysisPolling(data.id);
    } catch (error) {
      alert('Failed to create interview: ' + error.message);
    }
  };

  const startAnalysisPolling = (interviewId) => {
    if (analysisPollingRef.current) {
      clearInterval(analysisPollingRef.current);
    }

    let failCount = 0;
    analysisPollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/interviews/${interviewId}/analysis-status`);
        const data = await response.json();
        if (data.active) {
          failCount = 0;
          setAnalysisStatus(data);
        } else {
          failCount++;
          if (failCount >= 5) {
            clearInterval(analysisPollingRef.current);
            analysisPollingRef.current = null;
          }
        }
      } catch (error) {
        failCount++;
        if (failCount >= 5) {
          clearInterval(analysisPollingRef.current);
          analysisPollingRef.current = null;
        }
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (analysisPollingRef.current) {
        clearInterval(analysisPollingRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
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
      alert('Microphone access denied: ' + error.message);
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result.split(',')[1];
          
          try {
            const currentQuestion = interview?.questions?.[currentQuestionIndex];
            const response = await fetch(`${API_URL}/interviews/${interview.id}/answer`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                questionId: currentQuestion.id,
                audioBase64: base64Audio
              })
            });

            const data = await response.json();
            await pollEvaluation(data.transcriptId);
            setIsProcessing(false);
            
            if (currentQuestionIndex < (interview?.questions?.length ?? 0) - 1) {
              setCurrentQuestionIndex(currentQuestionIndex + 1);
            } else {
              if (analysisPollingRef.current) {
                clearInterval(analysisPollingRef.current);
              }
              await fetchFinalReport();
              setStep('results');
            }
          } catch (error) {
            alert('Failed to submit answer: ' + error.message);
            setIsProcessing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
        resolve();
      };

      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    });
  };

  const pollEvaluation = async (transcriptId) => {
    let attempts = 0;
    while (attempts < 20) {
      try {
        const response = await fetch(`${API_URL}/interviews/transcripts/${transcriptId}/evaluation`);
        const data = await response.json();
        
        if (data.status === 'completed') {
          setTranscripts(prev => [...prev, data]);
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error('Evaluation polling error:', error);
        attempts++;
      }
    }
  };
  const fetchFinalReport = async () => {
    try {
      const response = await fetch(
        `${API_URL}/interviews/${interview.id}/report?userId=${userId}`
      );
      const data = await response.json();
      setReport(data);
      console.log('📝 Report fetched, memory update triggered');
    } catch (error) {
      console.error('Failed to fetch report:', error);
    }
  };

  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Brain className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">AI Interview Copilot</h1>
              <p className="text-gray-600">Practice with a virtual AI interviewer</p>
              
              {previousInterviewCount > 0 && (
                <div className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 px-4 py-2 rounded-full">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Welcome back! You've completed {previousInterviewCount} interview{previousInterviewCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role/Position
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g., Software Engineer"
                  className="w-full px-4 py-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g., React, Node.js, Python"
                  className="w-full px-4 py-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <button
                onClick={createInterview}
                disabled={!role || !skills}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
              >
                Start Interview
              </button>
            </div>

            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">🎯 Features:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Interactive AI interviewer with voice</li>
                <li>• Real-time body language & voice analysis</li>
                <li>• Comprehensive evaluation & feedback</li>
                <li>• AI learns from your previous interviews</li>
                <li>• Personalized questions based on weak areas</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'interview') {
    const currentQuestion = interview?.questions?.[currentQuestionIndex];
    
    return (
      <div className="min-h-screen bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          {contextUsed && (
            <div className="mb-4 bg-gradient-to-r from-green-900 to-blue-900 border border-green-700 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-green-400" />
                <div>
                  <div className="text-white font-semibold">AI Memory Active</div>
                  <div className="text-green-300 text-sm">Questions tailored to your previous performance</div>
                </div>
              </div>
              <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                PERSONALIZED
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 2rem)' }}>
            
            <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 2rem)' }}>
              <div className="bg-black rounded-2xl overflow-hidden shadow-2xl" style={{ height: '60%', minHeight: '400px' }}>
                <AIInterviewerVideo 
                  isListening={isRecording} 
                  isSpeaking={isPlaying}
                  videoRef={interviewerVideoRef}
                />
              </div>

              <div className="bg-white rounded-xl shadow-lg p-4" style={{ height: '35%', minHeight: '250px' }}>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Video</h3>
                <div className="bg-gray-900 rounded-lg overflow-hidden relative" style={{ height: 'calc(100% - 28px)' }}>
                  <img 
                    src={`${FLASK_URL}/api/video-feed/${interview.id}`}
                    alt="Video feed"
                    className="w-full h-full object-cover"
                  />
                  {isRecording && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      RECORDING
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Question {currentQuestionIndex + 1} of {interview?.questions?.length ?? '...'}</span>
                  <span>{interview?.questions?.length ? Math.round(((currentQuestionIndex + 1) / interview.questions.length) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${interview?.questions?.length ? ((currentQuestionIndex + 1) / interview.questions.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 flex-grow overflow-y-auto">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-xl font-bold text-gray-800 flex-1">
                    {currentQuestion?.text}
                  </h2>
                  
                  <div className="flex gap-2">
                    {isLoadingAudio ? (
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      </div>
                    ) : isPlaying ? (
                      <button
                        onClick={handleStopAudio}
                        className="p-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition cursor-pointer"
                        title="Stop audio"
                      >
                        <VolumeX className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={handleReplayAudio}
                        className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer"
                        title="Play/Replay question"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {audioError && (
                  <div className="text-sm text-amber-600 mb-4">
                     {audioError}
                  </div>
                )}

                {analysisStatus?.active && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-3">📊 Real-time Analysis</div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Body</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {analysisStatus.results.body_language_score?.toFixed(0) || '--'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Voice</div>
                        <div className="text-2xl font-bold text-green-600">
                          {analysisStatus.results.voice_tone_score?.toFixed(0) || '--'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Score</div>
                        <div className="text-2xl font-bold text-purple-600">
                          {analysisStatus.results.combined_score?.toFixed(0) || '--'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col items-center space-y-4">
                  {!isRecording && !isProcessing && (
                    <>
                      <button
                        onClick={startRecording}
                        disabled={isPlaying}
                        className="flex items-center space-x-2 bg-red-600 text-white px-8 py-4 rounded-full font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg"
                      >
                        <Mic size={24} />
                        <span>Start Recording Answer</span>
                      </button>
                      {isPlaying && (
                        <p className="text-sm text-gray-600">
                           Wait for AI to finish speaking...
                        </p>
                      )}
                    </>
                  )}

                  {isRecording && (
                    <button
                      onClick={stopRecording}
                      className="flex items-center space-x-2 bg-gray-800 text-white px-8 py-4 rounded-full font-semibold hover:bg-gray-900 transition animate-pulse cursor-pointer shadow-lg"
                    >
                      <Square size={24} />
                      <span>Stop Recording</span>
                    </button>
                  )}

                  {isProcessing && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <Loader className="animate-spin" size={24} />
                      <span className="font-medium">Processing your answer...</span>
                    </div>
                  )}
                </div>

                {transcripts.length > 0 && transcripts[transcripts.length - 1] && (
                  <div className="mt-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Mic className="w-4 h-4 text-blue-600" />
                        <h3 className="font-semibold text-blue-900 text-sm">Your Response:</h3>
                      </div>
                      <p className="text-sm text-gray-700 italic">
                        "{transcripts[transcripts.length - 1].transcript}"
                      </p>
                    </div>

                    {transcripts[transcripts.length - 1].evaluation && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-900 text-sm mb-3">AI Evaluation:</h3>
                        
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          <div className="bg-white rounded-lg p-2 text-center">
                            <div className="text-xs text-gray-600">Response</div>
                            <div className="text-lg font-bold text-blue-600">
                              {transcripts[transcripts.length - 1].scores?.response || '--'}
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-2 text-center">
                            <div className="text-xs text-gray-600">Voice</div>
                            <div className="text-lg font-bold text-green-600">
                              {transcripts[transcripts.length - 1].scores?.voiceTone || '--'}
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-2 text-center">
                            <div className="text-xs text-gray-600">Body</div>
                            <div className="text-lg font-bold text-purple-600">
                              {transcripts[transcripts.length - 1].scores?.bodyLanguage || '--'}
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-2 text-center border-2 border-purple-300">
                            <div className="text-xs text-gray-600">Final</div>
                            <div className="text-lg font-bold text-purple-700">
                              {transcripts[transcripts.length - 1].scores?.final || '--'}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 text-sm">
                          <div className="bg-white rounded-lg p-3">
                            <div className="font-semibold text-gray-700 mb-1">💬 Notes:</div>
                            <p className="text-gray-600">
                              {transcripts[transcripts.length - 1].evaluation.notes}
                            </p>
                          </div>
                          
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="font-semibold text-green-800 mb-1">✅ Strengths:</div>
                            <p className="text-green-700">
                              {transcripts[transcripts.length - 1].evaluation.strengths}
                            </p>
                          </div>
                          
                          <div className="bg-amber-50 rounded-lg p-3">
                            <div className="font-semibold text-amber-800 mb-1">📈 Areas for Improvement:</div>
                            <p className="text-amber-700">
                              {transcripts[transcripts.length - 1].evaluation.improvements}
                            </p>
                          </div>

                          {transcripts[transcripts.length - 1].evaluation.voiceAnalysis && (
                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="font-semibold text-blue-800 mb-2">🎤 Voice Analysis:</div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-600">Positive Sentiment:</span>
                                  <span className="font-bold text-green-600 ml-1">
                                    {(transcripts[transcripts.length - 1].evaluation.voiceAnalysis.vader?.pos * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Confidence Score:</span>
                                  <span className="font-bold text-blue-600 ml-1">
                                    {(transcripts[transcripts.length - 1].evaluation.voiceAnalysis.vader?.compound * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setStep('setup')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Interview Complete!</h1>
            <p className="text-gray-600">Great job, {userName || 'Candidate'}! Here's your detailed feedback.</p>
            <div className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 px-4 py-2 rounded-full">
              <Brain className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">
                Your performance has been saved for personalized future interviews
              </span>
            </div>
          </div>
          
          {report && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">📋 Final Report</h2>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                  {report.content}
                </pre>
              </div>

              {transcripts.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-800">📊 Question Breakdown</h2>
                  {transcripts.map((t, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <h3 className="font-semibold text-gray-700 mb-3">
                        Q{idx + 1}: {t.question}
                      </h3>
                      <div className="grid grid-cols-4 gap-4 text-center mt-4">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="text-xs text-gray-600 mb-1">Response</div>
                          <div className="text-xl font-bold text-blue-600">
                            {t.scores?.response || '--'}
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-xs text-gray-600 mb-1">Voice</div>
                          <div className="text-xl font-bold text-green-600">
                            {t.scores?.voiceTone || '--'}
                          </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="text-xs text-gray-600 mb-1">Body</div>
                          <div className="text-xl font-bold text-purple-600">
                            {t.scores?.bodyLanguage || '--'}
                          </div>
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="text-xs text-gray-600 mb-1">Final</div>
                          <div className="text-xl font-bold text-gray-800">
                            {t.scores?.final || '--'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Your Answer:</span> {t.transcript}
                        </p>
                        {t.evaluation && (
                          <div className="space-y-2 text-sm">
                            <p className="text-gray-700">
                              <span className="font-medium text-green-700">Strengths:</span> {t.evaluation.strengths}
                            </p>
                            <p className="text-gray-700">
                              <span className="font-medium text-amber-700">Improvements:</span> {t.evaluation.improvements}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition cursor-pointer"
              >
                Start New Interview
              </button>
            </div>
          )}

          {!report && (
            <div className="text-center py-12">
              <Loader className="animate-spin w-12 h-12 text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Generating your report...</p>
              <p className="text-sm text-gray-500 mt-2">This will be saved to improve your future interviews</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewPlatform;