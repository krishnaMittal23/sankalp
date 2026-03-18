"use client";

import React, { useEffect, useState } from "react";
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
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format, parseISO, startOfWeek } from "date-fns";

export default function Analytics() {
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

  const COLORS = ["#22c55e", "#3b82f6", "#f97316", "#ef4444", "#a855f7"];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
     {data.length > 0 && <Card className="lg:col-span-2 mt-6">
        <CardHeader>
          <CardTitle>Performance Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
              <XAxis
                dataKey="createdAt"
                tickFormatter={(d) => format(parseISO(d), "MMM d")}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip
                formatter={(val) => `${val}%`}
                labelFormatter={(d) => format(parseISO(d), "PPP")}
              />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 4, fill: "#22c55e" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>}
      {weeklyData.length > 0 && <Card>
        <CardHeader>
          <CardTitle>Weekly Test Frequency</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
              <XAxis dataKey="week" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>}
      {topicData.length > 0 && <Card className="lg:col-span-1 mb-6">
        <CardHeader>
          <CardTitle>Topic Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={topicData}
                dataKey="value"
                nameKey="topic"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {topicData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>}
    </div>
  );
}
