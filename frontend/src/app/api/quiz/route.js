import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsonrepair } from "jsonrepair";

function extractJsonObject(text) {
  const match = text?.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(jsonrepair(match[0]));
  } catch {
    return null;
  }
}

function normalizeQuestions(rawQuestions, topic) {
  if (!Array.isArray(rawQuestions)) return [];

  return rawQuestions
    .map((q, idx) => {
      const options = Array.isArray(q?.options) ? q.options.slice(0, 4) : [];
      const answer = q?.answer;
      const question = q?.question;
      const explanation = q?.explanation || `Review the core concept for ${topic}.`;

      if (!question || options.length < 4 || !answer || !options.includes(answer)) {
        return null;
      }

      return {
        question: String(question),
        options: options.map((o) => String(o)),
        answer: String(answer),
        explanation: String(explanation),
      };
    })
    .filter(Boolean)
    .slice(0, 5);
}

function fallbackQuiz(topic) {
  return [
    {
      question: `Which approach is best for starting to learn ${topic}?`,
      options: [
        "Memorize random facts only",
        "Follow a structured plan from basics to advanced",
        "Skip fundamentals and jump to advanced topics",
        "Avoid hands-on practice",
      ],
      answer: "Follow a structured plan from basics to advanced",
      explanation: `A structured progression helps you build lasting understanding in ${topic}.`,
    },
    {
      question: `What is the most effective way to retain concepts in ${topic}?`,
      options: [
        "Read once and never revisit",
        "Active recall and spaced repetition",
        "Only watch videos passively",
        "Focus only on definitions",
      ],
      answer: "Active recall and spaced repetition",
      explanation: "Testing yourself over time significantly improves retention.",
    },
    {
      question: `When practicing ${topic}, what should you prioritize?`,
      options: [
        "Quantity over understanding",
        "Hands-on exercises with feedback",
        "Avoid mistakes at all costs",
        "Only theory without application",
      ],
      answer: "Hands-on exercises with feedback",
      explanation: "Practice plus feedback closes knowledge gaps faster.",
    },
    {
      question: `How should you handle weak areas in ${topic}?`,
      options: [
        "Ignore them and move on",
        "Identify gaps and revise targeted subtopics",
        "Only redo what you already know",
        "Rely on guesswork",
      ],
      answer: "Identify gaps and revise targeted subtopics",
      explanation: "Targeted revision gives the highest improvement per study hour.",
    },
    {
      question: `What indicates solid progress in ${topic}?`,
      options: [
        "Finishing content quickly",
        "Explaining concepts clearly and solving unseen problems",
        "Collecting many resources",
        "Avoiding difficult questions",
      ],
      answer: "Explaining concepts clearly and solving unseen problems",
      explanation: "Real mastery shows up in transfer of knowledge to new problems.",
    },
  ];
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
      max_tokens: 1200,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error: ${err}`);
  }

  const json = await res.json();
  return json?.choices?.[0]?.message?.content || null;
}

export async function POST(request) {
  try {
    const { topic } = await request.json();
    const cleanTopic = String(topic || "").trim();

    if (!cleanTopic) {
      return NextResponse.json({ message: "Topic is required" }, { status: 400 });
    }

    const prompt = `Generate a 5-question multiple-choice quiz on the topic "${cleanTopic}". Return strict JSON only in this exact format: {"questions":[{"question":"...","options":["A","B","C","D"],"answer":"...","explanation":"..."}]}. Ensure the answer value exactly matches one option.`;

    // Try Gemini first
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = extractJsonObject(text);
        const normalized = normalizeQuestions(parsed?.questions, cleanTopic);

        if (normalized.length >= 5) {
          return NextResponse.json({
            status: "success",
            source: "gemini",
            data: { questions: normalized },
          });
        }
      } catch (geminiError) {
        console.warn("Gemini quiz failed, trying OpenRouter:", geminiError?.message || geminiError);
      }
    }

    // Fallback to OpenRouter
    try {
      const text = await generateWithOpenRouter(prompt);
      const parsed = extractJsonObject(text);
      const normalized = normalizeQuestions(parsed?.questions, cleanTopic);

      if (normalized.length >= 5) {
        return NextResponse.json({
          status: "success",
          source: "openrouter",
          data: { questions: normalized },
        });
      }
    } catch (openRouterError) {
      console.warn("OpenRouter quiz failed:", openRouterError?.message || openRouterError);
    }

    // Static fallback
    return NextResponse.json({
      status: "success",
      source: "fallback",
      data: { questions: fallbackQuiz(cleanTopic) },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error?.message || "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
