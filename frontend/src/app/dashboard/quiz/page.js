"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>}>
      <QuizPageContent />
    </Suspense>
  );
}

function QuizPageContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [topic, setTopic] = useState("");
  const [quiz, setQuiz] = useState([]);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showExplanations, setShowExplanations] = useState({});
  const [showScoreAnimation, setShowScoreAnimation] = useState(false);
  const [showScoresModal, setShowScoresModal] = useState(false);
  const [prevScores, setPrevScores] = useState([]);
  const [loadingScores, setLoadingScores] = useState(false);

  const uniquePresence = (() => {
    if (typeof window === "undefined") return null;
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith("uniquePresence="));
    return match ? match.split("=")[1] : null;
  })();

  // Auto-start quiz if ?topic= param is present (e.g. from chatbot redirect)
  useEffect(() => {
    const topicParam = searchParams.get("topic");
    if (topicParam) {
      setTopic(topicParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (topic && quiz.length === 0 && !loading && !submitted) {
      const topicParam = searchParams.get("topic");
      if (topicParam && topic === topicParam) {
        generateQuiz();
      }
    }
  }, [topic]);

  const fetchScores = async () => {
    setLoadingScores(true);
    try {
      const res = await fetch("/api/getScores", {
        headers: { Authorization: `Bearer ${uniquePresence}` },
      });
      const data = await res.json();
      if (data.status === "success") {
        setPrevScores(data.data);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoadingScores(false);
    }
  };

  const openScoresModal = () => {
    setShowScoresModal(true);
    fetchScores();
  };

  const generateQuiz = async () => {
    if (!topic.trim()) return alert(t("quizPage.enterTopicAlert"));
    setLoading(true);
    setQuiz([]);
    setScore(null);
    setAnswers({});
    setCurrentQuestion(0);
    setSubmitted(false);
    setShowExplanations({});
    setShowScoreAnimation(false);

    try {
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const payload = await response.json();
      const questions = payload?.data?.questions;

      if (!response.ok || !Array.isArray(questions) || questions.length === 0) {
        throw new Error(payload?.message || t("quizPage.failedGenerate"));
      }

      setQuiz(questions);
    } catch (err) {
      console.error("Quiz generation error:", err);
      alert(t("quizPage.tryAgain"));
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (qIndex, option) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: option }));
  };

  const nextQuestion = () => {
    if (currentQuestion < quiz.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const submitQuiz = async () => {
    let sc = 0;
    quiz.forEach((q, i) => {
      if (answers[i] === q.answer) sc++;
    });
    setScore(sc);
    setSubmitted(true);
    setShowScoreAnimation(true);

    try {
      await fetch("/api/saveScore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${uniquePresence}`,
        },
        body: JSON.stringify({
          topic,
          score: sc,
          total: quiz.length,
        }),
      });
    } catch (err) {
      console.error("Error saving score:", err);
    }
  };

  const resetQuiz = () => {
    setTopic("");
    setQuiz([]);
    setAnswers({});
    setScore(null);
    setCurrentQuestion(0);
    setSubmitted(false);
    setShowExplanations({});
    setShowScoreAnimation(false);
  };

  const toggleExplanation = (index) => {
    setShowExplanations((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <button
        onClick={() => router.back()}
        className="fixed top-6 left-6 z-40 px-5 py-2.5 rounded-lg bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 hover:bg-zinc-800/80 hover:border-zinc-700 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
      >
        ← {t("quizPage.back")}
      </button>

      <button
        onClick={openScoresModal}
        className="fixed top-6 right-6 z-40 px-5 py-2.5 rounded-lg bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 hover:bg-zinc-800/80 hover:border-zinc-700 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-primary/10"
      >
        {t("quizPage.previousScores")}
      </button>

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-6xl font-bold mb-3 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent animate-gradient">
            {t("quizPage.title")}
          </h1>
          <p className="text-zinc-500 text-lg">{t("quizPage.subtitle")}</p>
        </div>

        {quiz.length === 0 && !submitted ? (
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-900/80 rounded-2xl p-8 hover:border-zinc-800/80 transition-all duration-500 animate-slide-up shadow-2xl">
            <label className="block text-sm font-medium mb-4 text-zinc-400 uppercase tracking-wide">
              {t("quizPage.enterTopic")}
            </label>
            <input
              type="text"
              placeholder={t("quizPage.topicPlaceholder")}
              className="w-full bg-black/50 border border-zinc-900/80 rounded-lg px-6 py-4 text-zinc-100 placeholder:text-zinc-700 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-300 mb-4 hover:border-zinc-800"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && generateQuiz()}
            />
            <button
              onClick={generateQuiz}
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary via-primary to-primary/80 text-white hover:shadow-2xl hover:shadow-primary/30 disabled:from-zinc-900 disabled:to-zinc-900 disabled:text-zinc-700 disabled:shadow-none py-4 rounded-lg transition-all duration-300 font-semibold transform hover:scale-[1.02] hover:-translate-y-0.5 disabled:transform-none relative overflow-hidden group"
            >
              <span className="relative z-10">{loading ? t("quizPage.generating") : t("quizPage.generateQuiz")}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </button>
          </div>
        ) : null}

        {quiz.length > 0 && !submitted ? (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-900/80 rounded-2xl p-6 hover:border-zinc-800/80 transition-all duration-300 shadow-xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-zinc-600 uppercase tracking-wider">{t("quizPage.progress")}</span>
                <span className="text-sm font-medium text-zinc-300">
                  {currentQuestion + 1} / {quiz.length}
                </span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary via-primary to-primary/80 h-2 transition-all duration-700 rounded-full relative overflow-hidden"
                  style={{ width: `${((currentQuestion + 1) / quiz.length) * 100}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-900/80 rounded-2xl p-8 hover:border-zinc-800/80 transition-all duration-500 shadow-2xl animate-slide-up">
              <div className="text-xs text-zinc-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                {t("quizPage.question")} {currentQuestion + 1}
              </div>
              <h3 className="text-2xl font-semibold mb-8 text-zinc-100 leading-relaxed">
                {quiz[currentQuestion].question}
              </h3>
              <div className="space-y-3">
                {quiz[currentQuestion].options.map((opt, i) => {
                  const isSelected = answers[currentQuestion] === opt;
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(currentQuestion, opt)}
                      className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group ${
                        isSelected
                          ? "bg-gradient-to-r from-primary to-primary/80 text-white border-primary shadow-xl shadow-primary/30 scale-[1.02]"
                          : "bg-black/50 border-zinc-900/80 hover:border-zinc-700 hover:bg-zinc-900/50 text-zinc-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/5"
                      }`}
                    >
                      <span className="relative z-10">{opt}</span>
                      {!isSelected && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={prevQuestion}
                disabled={currentQuestion === 0}
                className="bg-zinc-950/80 backdrop-blur-xl hover:bg-zinc-900/80 disabled:bg-zinc-950/50 disabled:text-zinc-800 border border-zinc-900/80 hover:border-zinc-800 px-6 py-3 rounded-lg font-medium transition-all duration-300 disabled:cursor-not-allowed text-zinc-400 hover:text-zinc-200 hover:scale-105 hover:shadow-lg hover:shadow-primary/5 disabled:hover:scale-100"
              >
                ← {t("quizPage.previous")}
              </button>
              {currentQuestion === quiz.length - 1 ? (
                <button
                  onClick={submitQuiz}
                  className="bg-gradient-to-r from-primary via-primary to-primary/80 text-white hover:shadow-2xl hover:shadow-primary/40 px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 relative overflow-hidden group"
                >
                  <span className="relative z-10">{t("quizPage.submitQuiz")}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="bg-gradient-to-r from-primary via-primary to-primary/80 text-white hover:shadow-2xl hover:shadow-primary/40 px-6 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 relative overflow-hidden group"
                >
                  <span className="relative z-10">{t("quizPage.next")} →</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </button>
              )}
            </div>
          </div>
        ) : null}

        {submitted && quiz.length > 0 ? (
          <div className="space-y-6 animate-fade-in">
            <div className={`bg-zinc-950/80 backdrop-blur-xl border border-zinc-900/80 rounded-2xl p-12 text-center transition-all duration-1000 shadow-2xl ${
              showScoreAnimation ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}>
              <div className="text-sm text-zinc-600 uppercase tracking-wider mb-4">{t("quizPage.finalScore")}</div>
              <div className={`text-8xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent transition-all duration-1000 delay-300 ${
                showScoreAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
                {score}/{quiz.length}
              </div>
              <div className={`text-xl text-zinc-500 transition-all duration-1000 delay-500 ${
                showScoreAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
                {score === quiz.length ? t("quizPage.perfect") : score >= quiz.length / 2 ? t("quizPage.wellDone") : t("quizPage.keepLearning")}
              </div>
            </div>

            <div className="space-y-4">
              {quiz.map((q, i) => {
                const isCorrect = answers[i] === q.answer;
                return (
                  <div
                    key={i}
                    style={{ animationDelay: `${i * 100}ms` }}
                    className={`bg-zinc-950/80 backdrop-blur-xl rounded-2xl p-6 border-2 transition-all duration-500 hover:scale-[1.01] shadow-xl animate-slide-up ${
                      isCorrect ? 'border-green-600/50 hover:border-green-500/70 hover:shadow-green-500/10' : 'border-red-600/50 hover:border-red-500/70 hover:shadow-red-500/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="text-lg font-semibold flex-1 text-zinc-200">
                        <span className="text-zinc-600 text-sm">Q{i + 1}.</span> {q.question}
                      </h4>
                      <span className={`text-3xl ml-4 animate-bounce-in ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {isCorrect ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      {q.options.map((opt, idx) => {
                        const isAnswerCorrect = opt === q.answer;
                        const isSelected = answers[i] === opt;
                        const isWrong = isSelected && !isAnswerCorrect;
                        return (
                          <div
                            key={idx}
                            className={`border-2 p-4 rounded-lg transition-all duration-300 ${
                              isAnswerCorrect
                                ? "bg-green-950/30 border-green-600/50 hover:border-green-500/70 hover:bg-green-950/40"
                                : isWrong
                                ? "bg-red-950/30 border-red-600/50 hover:border-red-500/70 hover:bg-red-950/40"
                                : "bg-black/50 border-zinc-900/80 hover:border-zinc-800"
                            }`}
                          >
                            <span className="text-base flex items-center gap-2">
                              {isAnswerCorrect ? <span className="text-green-400 text-xl">✓</span> : null}
                              {isWrong ? <span className="text-red-400 text-xl">✗</span> : null}
                              <span className={isAnswerCorrect ? 'text-green-300' : isWrong ? 'text-red-300' : 'text-zinc-500'}>
                                {opt}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => toggleExplanation(i)}
                      className="text-sm text-zinc-500 hover:text-zinc-300 transition-all duration-300 flex items-center gap-2 hover:gap-3 group"
                    >
                      <span className="group-hover:animate-pulse">{showExplanations[i] ? '−' : '+'}</span>
                      {showExplanations[i] ? t("quizPage.hide") : t("quizPage.show")} {t("quizPage.explanation")}
                    </button>
                    {showExplanations[i] ? (
                      <div className="mt-4 bg-black/50 border border-zinc-900/80 rounded-lg p-4 text-sm text-zinc-400 animate-slide-down">
                        {q.explanation}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <button
              onClick={resetQuiz}
              className="w-full bg-gradient-to-r from-primary via-primary to-primary/80 text-white hover:shadow-2xl hover:shadow-primary/40 px-6 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden group"
            >
              <span className="relative z-10">{t("quizPage.startNewQuiz")}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </button>
          </div>
        ) : null}
      </div>

      {showScoresModal ? (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-zinc-950/95 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md border border-zinc-900/80 relative shadow-2xl animate-scale-in">
            <button
              onClick={() => setShowScoresModal(false)}
              className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-200 text-3xl font-light leading-none transition-all duration-300 hover:rotate-90 hover:scale-110"
            >
              ×
            </button>
            <h2 className="text-2xl font-semibold mb-6 text-zinc-200">{t("quizPage.previousScores")}</h2>
            {loadingScores ? (
              <div className="text-center py-8">
                <div className="inline-block w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-3"></div>
                <p className="text-zinc-500 text-sm">{t("quizPage.loading")}</p>
              </div>
            ) : prevScores.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">{t("quizPage.noScores")}</p>
            ) : (
              <ul className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {prevScores.map((item, i) => (
                  <li
                    key={i}
                    style={{ animationDelay: `${i * 50}ms` }}
                    className="border border-zinc-900/80 p-4 rounded-xl bg-black/50 hover:border-zinc-800 hover:bg-zinc-900/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5 animate-slide-up"
                  >
                    <div className="font-medium text-zinc-200 mb-2">{item.topic}</div>
                    <div className="text-zinc-500 text-sm mb-1">
                      {t("quizPage.score")}: <span className="font-semibold text-primary">{item.score}/{item.total}</span> <span className="text-zinc-600">({item.percentage}%)</span>
                    </div>
                    <div className="text-zinc-700 text-xs">
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounce-in {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}