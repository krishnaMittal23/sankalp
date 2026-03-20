import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { GoogleGenerativeAI } from "@google/generative-ai"; 
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getProjectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function getProjectRefFromJwt(token) {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    return decoded?.ref || null;
  } catch {
    return null;
  }
}

function isMissingUniquePresenceColumn(error) {
  const msg = (error?.message || "").toLowerCase();
  return msg.includes("uniquepresence") && msg.includes("does not exist");
}

function isGeminiQuotaError(error) {
  const msg = (error?.message || "").toLowerCase();
  return msg.includes("quota") || msg.includes("too many requests") || msg.includes("429");
}

function extractRetrySeconds(error) {
  const msg = error?.message || "";
  const retryInfoMatch = msg.match(/retry in\s+([\d.]+)s/i);
  if (retryInfoMatch) return Math.ceil(Number(retryInfoMatch[1]));

  const retryDelayMatch = msg.match(/"retryDelay":"(\d+)s"/i);
  if (retryDelayMatch) return Number(retryDelayMatch[1]);

  return null;
}

async function generateWithGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "compound-beta",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 350,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error: ${err}`);
  }

  const json = await res.json();
  return json?.choices?.[0]?.message?.content || null;
}

async function generateWithOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 350,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error: ${err}`);
  }

  const json = await res.json();
  return json?.choices?.[0]?.message?.content || null;
}

const urlRef = getProjectRefFromUrl(supabaseUrl);
const serviceRef = getProjectRefFromJwt(serviceRoleKey);
const selectedKey =
  serviceRoleKey && serviceRef && serviceRef === urlRef
    ? serviceRoleKey
    : anonKey;

const supabase = createClient(supabaseUrl, selectedKey);


async function authenticateRequest(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) throw new Error("Authorization header missing");

  const token = authHeader.split("Bearer ")[1];
  if (!token) throw new Error("Unauthorized - No token provided");

  if (token.startsWith("uid:")) {
    const userId = token.slice(4).trim();
    if (!userId) throw new Error("Unauthorized - Invalid token");

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", userId)
      .single();

    if (error || !user) throw new Error("Unauthorized - User not found");
    return { user, uniquePresence: token };
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("id, name, email, uniquePresence")
    .eq("uniquePresence", token)
    .single();

  if (error && isMissingUniquePresenceColumn(error)) {
    const { data: byId, error: byIdError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", token)
      .single();

    if (byIdError || !byId) throw new Error("Unauthorized - User not found");
    return { user: byId, uniquePresence: `uid:${byId.id}` };
  }

  if (error || !user) throw new Error("Unauthorized - User not found");

  return { user, uniquePresence: token };
}



export async function GET(request) {
  try {
    const { user, uniquePresence } = await authenticateRequest(request);

    const client = await clientPromise;
    const db = client.db("AI_Interview");

    // Profile
    const profile = await db.collection("Profiles").findOne(
      { uniquePresence },
      { projection: { _id: 0 } }
    );

    if (!profile) {
      return NextResponse.json(
        { status: "error", message: "Profile not found" },
        { status: 404 }
      );
    }

    // Bookmarked Jobs
    const bookmarkedJobs = await db
      .collection("BookmarkedJobs")
      .find({ uniquePresence })
      .project({ _id: 0 })
      .toArray();

    // Goals and Skills
    const goalsData = await db
      .collection("Goals")
      .findOne({ uniquePresence }, { projection: { _id: 0 } });
    
    const scoresDocs = await db
      .collection("Scores")
      .find({ uniquePresence })
      .project({ _id: 0, topic: 1, score: 1, total: 1, percentage: 1 })
      .toArray();

    const scores = {};
    for (const doc of scoresDocs) {
      scores[doc.topic] = {
        score: doc.score,
        total: doc.total,
        percentage: doc.percentage,
      };
    }

    const fullProfile = {
      ...profile,
      bookmarkedJobs: bookmarkedJobs || [],
      goals: goalsData?.goals || [],
      skills: goalsData?.skills || [],
      scores: scores || {},
    };
    console.log("Fetched full profile:", fullProfile);

    return NextResponse.json({ status: "success", data: fullProfile });
  } catch (error) {
    console.error("GetProfile API error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}


function detectIntent(message) {
  const msg = message.toLowerCase().trim();

  // --- Rule-based intent detection (no LLM quota used) ---

  // QUIZ: quiz/test/practice + optional topic
  const quizMatch = msg.match(
    /(?:quiz|test|practice|generate.*quiz|take.*quiz|start.*quiz|quiz.*on|quiz.*for|test.*on|test.*for|practice.*on)\s+(?:on\s+|for\s+|about\s+)?([a-z0-9 .#+]+?)(?:\s*$|\s*please|\s*now)/i
  );
  if (
    quizMatch ||
    /\b(quiz|generate.*quiz|take.*quiz|start.*quiz|test me|practice questions)\b/.test(msg)
  ) {
    // Try to extract topic from patterns like "quiz for X", "quiz on X", "generate quiz for X"
    const topicMatch = msg.match(
      /(?:quiz|test|practice)\s+(?:for|on|about|in|of)\s+([a-z0-9 .#+]+?)(?:\s*$|\s*please|\s*now)/i
    ) || msg.match(
      /(?:generate|create|start|take)\s+(?:a\s+)?(?:quiz|test)\s+(?:for|on|about|in|of)?\s*([a-z0-9 .#+]+?)(?:\s*$|\s*please|\s*now)/i
    );
    const topic = topicMatch ? topicMatch[1].trim() : null;
    return { intent: "QUIZ", topic };
  }

  // JOB_SEARCH: job/jobs/career + search/find/look/browse/open
  if (
    /\b(search\s+jobs?|find\s+jobs?|look\s+for\s+jobs?|browse\s+jobs?|job\s+search|open\s+jobs?|show\s+jobs?|find\s+me\s+a?\s+job|i\s+want\s+(to\s+)?(?:search|find|look\s+for)\s+(?:a\s+)?job)\b/.test(msg)
  ) {
    const searchMatch = msg.match(
      /(?:search|find|look for|browse)\s+(?:for\s+)?(?:a\s+)?([a-z0-9 ]+?)\s+jobs?/i
    );
    const search = searchMatch ? searchMatch[1].trim() : null;
    return { intent: "JOB_SEARCH", search };
  }

  // RESUME: resume/cv + build/generate/create/make
  if (
    /\b(build|generate|create|make|write|update|improve)\s+(?:my\s+)?(?:resume|cv)\b/.test(msg) ||
    /\b(?:resume|cv)\s+(?:builder|generator|creator)\b/.test(msg)
  ) {
    return { intent: "RESUME" };
  }

  // MOCK_INTERVIEW: mock interview / practice interview / start interview / non-verbal prep
  if (
    /\b(mock\s+interview|practice\s+interview|start\s+(a\s+)?interview|take\s+(a\s+)?interview|i\s+want\s+(to\s+)?(do|take|start|practice)\s+(a\s+)?(mock\s+)?interview|non[\s-]?verbal\s+(prep|practice|training|interview)|body\s+language\s+(prep|practice|training)|interview\s+prep|prep\s+(for\s+)?(interview|interviews)|prepare\s+(for\s+)?(an?\s+)?interview)\b/.test(msg)
  ) {
    return { intent: "MOCK_INTERVIEW" };
  }

  // ROADMAP: show/open/generate roadmap or learning path
  if (
    /\b(show|open|view|generate|create|get|my|see)\s+(my\s+)?(road\s?map|learning\s+path|career\s+path|study\s+plan)\b/.test(msg) ||
    /\b(road\s?map|learning\s+path|career\s+path)\b/.test(msg)
  ) {
    return { intent: "ROADMAP" };
  }

  return { intent: "NONE" };
}

export async function POST(request) {
  try {
    const { message, chatHistory } = await request.json();

    // --- Intent Detection (keyword/regex-based, no LLM quota used) ---
    const { intent, topic, search } = detectIntent(message);

    if (intent && intent !== "NONE") {
      const intentMessages = {
        QUIZ: `Sure! Taking you to the${topic ? ` ${topic}` : ""} quiz now... 🧠`,
        JOB_SEARCH: `On it! Opening job search${search ? ` for "${search}"` : ""} now... 💼`,
        RESUME: "Let's build your resume! Redirecting you now... 📄",
        MOCK_INTERVIEW: "Time to practice! Taking you to mock interview... 🎤",
        ROADMAP: "Opening your career roadmap now... 🗺️",
      };
      return NextResponse.json({
        intent,
        params: { topic, search },
        reply: intentMessages[intent],
      });
    }

    const { user, uniquePresence } = await authenticateRequest(request);

    const client = await clientPromise;
    const db = client.db("AI_Interview");

    // Fetch all user context
    // --- Scores ---
    const scoresDocs = await db
      .collection("Scores")
      .find({ uniquePresence })
      .project({ _id: 0, topic: 1, score: 1, total: 1, percentage: 1 })
      .toArray();

    const scores = {};
    for (const doc of scoresDocs) {
      scores[doc.topic] = {
        score: doc.score,
        total: doc.total,
        percentage: doc.percentage,
      };
    }

    // --- Profile ---
    const profile = await db.collection("Profiles").findOne({ uniquePresence });

    // --- Goals & Skills ---
    const goalsData = await db.collection("Goals").findOne({ uniquePresence });
    const goals = goalsData?.goals || [];
    const skills = goalsData?.skills || [];

    // --- Bookmarked Jobs ---
    const bookmarkedJobs = await db
      .collection("BookmarkedJobs")
      .find({ uniquePresence })
      .project({ _id: 0 })
      .toArray();

    // --- Debug log: Full context ---
    console.log("✅ User context fetched for Gemini:", {
      profile,
      goals,
      skills,
      scores,
      bookmarkedJobs,
      chatHistoryLength: chatHistory?.length || 0,
    });

    // Format chat history for context
    const formattedHistory = chatHistory && chatHistory.length > 1
      ? chatHistory
          .slice(0, -1) // Exclude the current message (it's already in 'message')
          .map((msg) => `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.text}`)
          .join("\n")
      : "No previous conversation.";

    // Construct contextual prompt with conversation history
    const prompt = `
You are the AI Career Copilot chatbot. You provide personalized career guidance based on the user's profile and conversation history.

User Profile:
- Name: ${user.name || "User"}
- Goals: ${goals.join(", ") || "Not specified"}
- Skills: ${skills.join(", ") || "Not specified"}
- Test Scores: ${Object.keys(scores).length > 0 ? JSON.stringify(scores, null, 2) : "No scores available"}
- Bookmarked Jobs: ${bookmarkedJobs.length > 0 ? bookmarkedJobs.map((j) => j.title).join(", ") : "None"}

Conversation History:
${formattedHistory}

Current User Message: "${message}"

Instructions:
- Respond naturally and conversationally, referencing previous messages when relevant
- Use the user's profile data to provide personalized guidance
- If the user refers to something from earlier in the conversation, acknowledge it
- Be supportive, encouraging, and professional
- Keep responses concise but helpful (2-4 sentences unless more detail is needed)

Your response:
`;

    console.log("🧠 Final Gemini Prompt:\n", prompt);

    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Generate content using Gemini
    let reply = "⚠️ Sorry, I couldn't generate a response.";
    try {
      const result = await model.generateContent(prompt);
      reply = result.response.text() || reply;
    } catch (geminiError) {
      if (isGeminiQuotaError(geminiError)) {
        const retrySeconds = extractRetrySeconds(geminiError);
        const retryHint = retrySeconds
          ? ` Please retry in about ${retrySeconds} seconds.`
          : " Please retry in a short while.";

        // Fallback 1: Groq
        try {
          const groqReply = await generateWithGroq(prompt);
          if (groqReply) {
            reply = groqReply;
          } else {
            throw new Error("Groq returned empty response");
          }
        } catch (groqError) {
          console.warn("Groq fallback failed:", groqError?.message || groqError);

          // Fallback 2: OpenRouter
          try {
            const openRouterReply = await generateWithOpenRouter(prompt);
            if (openRouterReply) {
              reply = openRouterReply;
            } else {
              reply =
                "I hit a temporary AI quota limit while generating your response." +
                retryHint +
                " In the meantime, I can still help with concise guidance if you ask a specific career question.";
            }
          } catch (openRouterError) {
            console.warn("OpenRouter fallback failed:", openRouterError?.message || openRouterError);
            reply =
              "I hit a temporary AI quota limit while generating your response." +
              retryHint +
              " In the meantime, I can still help with concise guidance if you ask a specific career question.";
          }
        }

        console.warn("Gemini quota/rate-limit reached:", geminiError?.message || geminiError);
      } else {
        throw geminiError;
      }
    }

    console.log("✅ Gemini response:", reply);

    // Return AI response
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chatbot route error:", error);
    const status =
      (error?.message || "").includes("Unauthorized") ||
      (error?.message || "").includes("Authorization header")
        ? 401
        : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}