import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { saveScores } from "@/mongowork/saveScores.js";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { jsonrepair } from "jsonrepair";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let redis, ratelimit;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
    });
  }
} catch (error) {
  console.warn("Redis/Rate limiting setup failed:", error);
}

async function authenticateRequest(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) throw new Error("Authorization header missing");

  const uniquePresence = authHeader.split("Bearer ")[1];
  if (!uniquePresence) throw new Error("Unauthorized - No token provided");

  const { data: user, error } = await supabase
    .from("users")
    .select("id, name, email, uniquePresence")
    .eq("uniquePresence", uniquePresence)
    .single();
   

  if (error || !user) throw new Error("Unauthorized - User not found");
  return { user, uniquePresence };
}

async function checkRateLimit(request) {
  if (!ratelimit) return { success: true };
  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "anonymous";

  try {
    const result = await ratelimit.limit(ip);
    return result;
  } catch (error) {
    console.error("Rate limiting error:", error);
    return { success: true };
  }
}

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

// async function generateTopicTagsWithGemini(topic) {
//   if (!topic) return [];

//   const prompt = `
// You are a tagging assistant. Convert the following quiz topic into 3-5 concise, lowercase topic tags.
// Respond with only a JSON array of tags, no extra text.

// Topic: "${topic}"
// `;

//   const response = await ai.models.generateContent({
//     model: "gemini-2.5-flash-lite",
//     contents: prompt,
//   });

//   try {
//     const text = response.text.trim();
//     console.log(text);
//     const tags = JSON.parse(text);
//     if (Array.isArray(tags)) return tags.map((t) => t.toLowerCase().trim());
//   } catch (err) {
//     console.warn("Failed to parse Gemini response, fallback to simple:", err);
//   }

//   return topic
//     .split(/[;,]/)
//     .map((t) => t.trim().toLowerCase())
//     .filter(Boolean)
//     .slice(0, 5);
// }

async function generateTopicTagsWithGemini(topic) {
  if (!topic) return [];

  const prompt = `
You are a tagging assistant. Convert the following quiz topic into 3-5 concise, lowercase topic tags.
Return only a JSON array of tags, no extra text.

Topic: "${topic}"
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
  });

  let text = response.text.trim();
  text = text.replace(/^```(json)?/, "").replace(/```$/, "").trim();
  console.log(text);
  
  try {
    const parsed = JSON.parse(jsonrepair(text));
    if (Array.isArray(parsed)) return parsed.map((t) => t.toLowerCase().trim());
  } catch (err) {
    console.warn("Failed to parse Gemini response, fallback:", err);
    return topic
      .split(/[;,]/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 5);
  }

  return [];
}

export async function POST(request) {
  try {
    const { user, uniquePresence } = await authenticateRequest(request);
    const rateResult = await checkRateLimit(request);

    if (!rateResult.success) {
      return NextResponse.json(
        { message: "Rate limit exceeded", status: "error" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { topic, score, total } = body;

    if (!topic || score === undefined || !total) {
      return NextResponse.json(
        { message: "Missing required fields", status: "error" },
        { status: 400 }
      );
    }

    const tgs = await generateTopicTagsWithGemini(topic);

    const result = await saveScores({
      topic,
      tags: tgs,
      score,
      total,
      uniquePresence,
      user,
    });

    return NextResponse.json({
      status: "success",
      message: "Score saved successfully",
      data: result,
    });
  } catch (error) {
    console.error("SaveScore API error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
