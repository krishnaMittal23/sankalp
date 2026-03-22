"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { format, parseISO, startOfWeek } from "date-fns";

const COLORS = ["#22c55e", "#3b82f6", "#f97316", "#ef4444", "#a855f7", "#06b6d4", "#ec4899"];

const cardClass = "bg-slate-900/70 backdrop-blur-xl border border-slate-800/50 rounded-2xl shadow-lg";

function CustomTooltip({ active, payload, label, labelFormatter, valueFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-xl px-4 py-3 shadow-2xl">
      {label && (
        <p className="text-xs text-slate-400 mb-1.5 font-medium">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color || entry.fill }}>
          {valueFormatter ? valueFormatter(entry.value, entry.name) : entry.value}
        </p>
      ))}
    </div>
  );
}

const axisStyle = { fill: "#94a3b8", fontSize: 12 };

export default function Analytics({ interviews = [] }) {
  const uniquePresence = (() => {
    if (typeof window === "undefined") return null;
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith("uniquePresence="));
    return match ? match.split("=")[1] : null;
  })();

  const [data, setData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [topicData, setTopicData] = useState([]);
  useEffect(() => {
    if (!uniquePresence) return;

    const fetchScores = async () => {
      try {
        const res = await fetch("/api/getScores", {
          headers: {
            Authorization: `Bearer ${uniquePresence}`,
          },
        });

        const payload = await res.json();
        const rows = Array.isArray(payload?.data) ? payload.data : [];

        const sorted = rows.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        setData(sorted);

        const weekly = {};
        sorted.forEach((test) => {
          if (!test?.createdAt) return;
          const week = format(startOfWeek(parseISO(test.createdAt)), "MMM d");
          weekly[week] = (weekly[week] || 0) + 1;
        });

        setWeeklyData(
          Object.entries(weekly).map(([week, count]) => ({ week, count }))
        );

        const tagMap = {};
        sorted.forEach((t) => {
          if (t.tags && Array.isArray(t.tags)) {
            t.tags.forEach((tag) => {
              tagMap[tag] = (tagMap[tag] || 0) + 1;
            });
          }
        });

        setTopicData(
          Object.entries(tagMap).map(([tag, value]) => ({ topic: tag, value }))
        );
      } catch (error) {
        console.error("Failed to load analytics:", error);
        setData([]);
        setWeeklyData([]);
        setTopicData([]);
      }
    };

    fetchScores();
  }, [uniquePresence]);

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const scores = data.map((d) => d.percentage).filter((p) => typeof p === "number");
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const latest = scores.length > 0 ? scores[scores.length - 1] : 0;
    const trending = scores.length >= 2 ? latest >= scores[scores.length - 2] : true;
    const bestTopic = topicData.length > 0
      ? topicData.reduce((max, t) => (t.value > max.value ? t : max), topicData[0]).topic
      : "—";
    return { avg, total: data.length, bestTopic, trending, latest };
  }, [data, topicData]);

  // Score Distribution — bucket scores into ranges
  const distributionData = useMemo(() => {
    if (data.length === 0) return [];
    const buckets = { "0–20": 0, "21–40": 0, "41–60": 0, "61–80": 0, "81–100": 0 };
    data.forEach((d) => {
      const p = d.percentage;
      if (p <= 20) buckets["0–20"]++;
      else if (p <= 40) buckets["21–40"]++;
      else if (p <= 60) buckets["41–60"]++;
      else if (p <= 80) buckets["61–80"]++;
      else buckets["81–100"]++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [data]);

  // Topic-wise average score for radar chart
  const radarData = useMemo(() => {
    if (data.length === 0) return [];
    const topicScores = {};
    data.forEach((d) => {
      const topic = d.topic || "General";
      if (!topicScores[topic]) topicScores[topic] = { sum: 0, count: 0 };
      topicScores[topic].sum += d.percentage;
      topicScores[topic].count++;
    });
    return Object.entries(topicScores).map(([topic, { sum, count }]) => ({
      topic: topic.length > 14 ? topic.slice(0, 12) + "…" : topic,
      avgScore: Math.round(sum / count),
    }));
  }, [data]);

  // Interview completion stats
  const interviewStats = useMemo(() => {
    if (!interviews || interviews.length === 0) return null;
    const completed = interviews.filter((i) => i.reports && i.reports.length > 0).length;
    const total = interviews.length;
    const pct = Math.round((completed / total) * 100);
    return { completed, total, pct };
  }, [interviews]);

  const hasData = data.length > 0 || weeklyData.length > 0 || topicData.length > 0 || interviews.length > 0;

  if (!hasData) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-10 mt-6">
        <div className="flex flex-col items-center justify-center text-center py-8 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-300">No progress data yet</p>
            <p className="text-sm text-slate-500 mt-1">Take your first test to see your progress report here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 md:p-8 mt-6 space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Progress Report</h2>
          <p className="text-sm text-slate-400 mt-1">Track your learning journey and test performance</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      </div>

      {/* KPI summary row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Avg Score</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.avg}<span className="text-sm text-slate-400 font-normal">%</span></p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Tests</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Best Topic</p>
            <p className="text-lg font-bold text-white mt-1 truncate">{stats.bestTopic}</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Trend</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-white">{stats.latest}%</span>
              {stats.trending ? (
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Performance Trend — Area chart with gradient */}
        {data.length > 0 && (
          <Card className={`lg:col-span-2 ${cardClass}`}>
            <CardHeader>
              <CardTitle className="text-white">Performance Trend</CardTitle>
              <CardDescription className="text-slate-400">Your test scores over time</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} stroke="#94a3b8" />
                  <XAxis
                    dataKey="createdAt"
                    tickFormatter={(d) => format(parseISO(d), "MMM d")}
                    tick={axisStyle}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={axisStyle}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        labelFormatter={(d) => format(parseISO(d), "PPP")}
                        valueFormatter={(val) => `${val}%`}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="percentage"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    fill="url(#scoreGradient)"
                    dot={{ r: 4, fill: "#22c55e", stroke: "#0f172a", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#22c55e", stroke: "#bbf7d0", strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Topic Distribution — Donut chart */}
        {topicData.length > 0 && (
          <Card className={`lg:col-span-1 ${cardClass}`}>
            <CardHeader>
              <CardTitle className="text-white">Topic Distribution</CardTitle>
              <CardDescription className="text-slate-400">Topics covered across tests</CardDescription>
            </CardHeader>
            <CardContent className="h-72 flex flex-col">
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topicData}
                      dataKey="value"
                      nameKey="topic"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {topicData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <CustomTooltip
                          valueFormatter={(val, name) => `${name}: ${val}`}
                        />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 justify-center">
                {topicData.map((entry, i) => (
                  <div key={entry.topic} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-xs text-slate-400 truncate max-w-[100px]">{entry.topic}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly Test Frequency — Bar chart with gradient */}
        {weeklyData.length > 0 && (
          <Card className={`lg:col-span-2 ${cardClass}`}>
            <CardHeader>
              <CardTitle className="text-white">Weekly Test Frequency</CardTitle>
              <CardDescription className="text-slate-400">Number of tests taken each week</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} stroke="#94a3b8" />
                  <XAxis
                    dataKey="week"
                    tick={axisStyle}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={axisStyle}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        valueFormatter={(val) => `${val} test${val !== 1 ? "s" : ""}`}
                      />
                    }
                  />
                  <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Score Distribution — Histogram */}
        {distributionData.length > 0 && (
          <Card className={`lg:col-span-1 ${cardClass}`}>
            <CardHeader>
              <CardTitle className="text-white">Score Distribution</CardTitle>
              <CardDescription className="text-slate-400">How your scores are spread</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData} barCategoryGap="20%">
                  <defs>
                    <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} stroke="#94a3b8" />
                  <XAxis
                    dataKey="range"
                    tick={{ ...axisStyle, fontSize: 11 }}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={axisStyle}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        valueFormatter={(val) => `${val} test${val !== 1 ? "s" : ""}`}
                      />
                    }
                  />
                  <Bar dataKey="count" fill="url(#histGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Topic-wise Avg Score — Radar Chart */}
        {radarData.length >= 3 && (
          <Card className={`lg:col-span-2 ${cardClass}`}>
            <CardHeader>
              <CardTitle className="text-white">Strengths & Weaknesses</CardTitle>
              <CardDescription className="text-slate-400">Average score by topic</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#334155" strokeOpacity={0.5} />
                  <PolarAngleAxis dataKey="topic" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickCount={5}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        valueFormatter={(val, name) => `${val}%`}
                      />
                    }
                  />
                  <Radar
                    dataKey="avgScore"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="#06b6d4"
                    fillOpacity={0.2}
                    dot={{ r: 4, fill: "#06b6d4", stroke: "#0f172a", strokeWidth: 2 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Interview Completion — Progress Ring */}
        {interviewStats && (
          <Card className={`lg:col-span-1 ${cardClass}`}>
            <CardHeader>
              <CardTitle className="text-white">Interview Completion</CardTitle>
              <CardDescription className="text-slate-400">Completed vs total interviews</CardDescription>
            </CardHeader>
            <CardContent className="h-72 flex flex-col items-center justify-center">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  {/* Background ring */}
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="10"
                  />
                  {/* Progress ring */}
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke="url(#ringGradient)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${interviewStats.pct * 3.14} ${314 - interviewStats.pct * 3.14}`}
                  />
                  <defs>
                    <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">{interviewStats.pct}%</span>
                  <span className="text-xs text-slate-400">completed</span>
                </div>
              </div>
              <div className="flex gap-6 mt-4 text-center">
                <div>
                  <p className="text-lg font-bold text-white">{interviewStats.completed}</p>
                  <p className="text-xs text-slate-400">Completed</p>
                </div>
                <div className="w-px bg-slate-700" />
                <div>
                  <p className="text-lg font-bold text-white">{interviewStats.total}</p>
                  <p className="text-xs text-slate-400">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
