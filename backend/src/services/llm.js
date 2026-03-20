import fetch from "node-fetch";
import dotenv from "dotenv";
import { jsonrepair } from "jsonrepair";

// import { createEmbedding, queryNearestVectors } from "./qdrant.js";

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const FLASK_ANALYSIS_URL = process.env.FLASK_ANALYSIS_URL || "http://127.0.0.1:5001";
const OPENROUTER_REFERER = process.env.OPENROUTER_REFERER || process.env.FRONTEND_URL || "http://localhost:3000";

if (!OPENROUTER_API_KEY) {
  console.error("❌ Missing OpenRouter API Key. Check your .env file in /backend");
  process.exit(1);
}

console.log("✅ Loaded OpenRouter API Key:", OPENROUTER_API_KEY.slice(0, 10) + "...");

function cleanLLMResponse(resp) {
  return resp.replace(/```json|```/g, "").trim();
}

async function getAnalysisScores(sessionId, transcript, questionId) {
  try {
    const [transcriptRes, statusRes] = await Promise.all([
      fetch(`${FLASK_ANALYSIS_URL}/api/analyze/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, transcript, questionId })
      }),
      fetch(`${FLASK_ANALYSIS_URL}/api/session/status?sessionId=${sessionId}`)
    ]);

    if (!transcriptRes.ok) {
      console.warn("⚠️ Flask analysis unavailable, using defaults");
      return { voiceToneScore: 50, bodyLanguageScore: 50 };
    }

    const transcriptData = await transcriptRes.json();
    let bodyLanguageScore = 50;

    if (statusRes.ok) {
      const statusData = await statusRes.json();
      bodyLanguageScore = statusData.results?.body_language_score || 50;
    }

    return {
      voiceToneScore: transcriptData.voiceAnalysis?.voice_tone_score || 50,
      bodyLanguageScore,
      voiceAnalysis: transcriptData.voiceAnalysis
    };
  } catch (error) {
    console.error("❌ Error fetching analysis scores:", error.message);
    return { voiceToneScore: 50, bodyLanguageScore: 50 };
  }
}

function calculateFinalScore(responseScore, voiceToneScore, bodyLanguageScore) {
  const weights = {
    response: 0.5,
    voice: 0.25,
    body: 0.25
  };

  const finalScore = 
    (responseScore * weights.response) +
    (voiceToneScore * weights.voice) +
    (bodyLanguageScore * weights.body);

  return {
    finalScore: Math.round(finalScore * 100) / 100,
    breakdown: {
      response: responseScore,
      voiceTone: voiceToneScore,
      bodyLanguage: bodyLanguageScore
    },
    weights: {
      response: '50%',
      voice: '25%',
      body: '25%'
    }
  };
}

// export async function generateQuestions({ role, skills }) {
//   const prompt = `Generate 3-5 interview questions for a ${role} with these skills: ${skills.join(", ")}. 
// Return only valid JSON array of strings (no markdown, no explanations).`;

//   const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
//       "HTTP-Referer": "http://localhost:3000",
//       "X-Title": "AI Career Interview Copilot",
//       "Content-Type": "application/json"
//     },
//     body: JSON.stringify({
//       model: "openai/gpt-4o",
//       messages: [
//         { role: "user", content: prompt }
//       ],
//       max_tokens: 2000
//     })
//   });

//   const data = await response.json();
//   console.log("🔍 OpenRouter response:", JSON.stringify(data, null, 2));

//   if (data.error) {
//     throw new Error(`OpenRouter Error: ${data.error.message}`);
//   }

//   const content = cleanLLMResponse(data.choices[0].message.content);
//   return JSON.parse(content);
// }

export async function generateQuestions({ role, skills, context = null }) {
  const contextText = context?.text ? `CONTEXT:\n${context.text}\n\n` : "";
//   const prompt = `
// ${contextText}
// Generate 3-5 interview questions for a ${role} with these skills: ${skills.join(", ")}. 
//   Prioritize focus on the user's weaknesses and improvement areas from the context. 
// Return only valid JSON array of strings (no markdown, no explanations).`;

  const prompt = `
  ${contextText}
  Generate 3-5 interview questions for a ${role} with these skills: ${skills.join(", ")}. 

  IMPORTANT: 
  - Focus 60% of questions on the user's weakness areas mentioned in context
  - Focus 30% on testing skills they haven't demonstrated well before
  - Focus 10% on strengths to build confidence

  Return only valid JSON array of strings (no markdown, no explanations).`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": OPENROUTER_REFERER,
      "X-Title": "AI Career Interview Copilot",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(`OpenRouter Error: ${data.error.message}`);

  const content = cleanLLMResponse(data.choices[0].message.content);
  try {
    return JSON.parse(jsonrepair(content));
  } catch (e) {
    console.error("❌ Failed to parse LLM question response:", content);
    throw new Error("LLM returned invalid JSON for questions. Please try again.");
  }
}

export async function evaluateAnswer(transcript, question, sessionId = null, questionId = null) {
  const isBlankAnswer = !transcript || transcript.trim().split(/\s+/).length < 3;

  const prompt = `You are an interview evaluator. Evaluate the candidate's answer to this interview question.

Question: "${question}"
Candidate's Answer: "${transcript}"

${isBlankAnswer ? 'Note: The candidate provided a very short or unclear answer. Score accordingly (low score) but still return valid JSON.' : ''}

Evaluate based on:
1. Content quality and relevance
2. Technical accuracy (if applicable)
3. Communication clarity
4. Completeness of answer

You MUST respond with ONLY a valid JSON object. Do not include any explanation outside the JSON.
Format: { "score": <number 0-100>, "notes": <string>, "strengths": <string>, "improvements": <string> }`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": OPENROUTER_REFERER,
      "X-Title": "AI Career Interview Copilot",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o",
      messages: [
        { role: "system", content: "You are an interview evaluator. Always respond with valid JSON only. Never refuse to evaluate - if the answer is blank or irrelevant, give a low score and explain in the JSON fields." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`❌ OpenRouter Error: ${data.error.message}`);
  }

  const content = cleanLLMResponse(data.choices[0].message.content);
  console.log("🧾 Evaluation Response:", content);

  let evaluation;
  try {
    evaluation = JSON.parse(jsonrepair(content));
  } catch (e) {
    console.error("❌ Failed to parse LLM evaluation response:", content);
    // Fallback: return a default low-score evaluation instead of crashing
    evaluation = {
      score: 10,
      notes: "The candidate's answer was unclear or could not be evaluated.",
      strengths: "None identified.",
      improvements: "Please provide a clear and relevant answer to the question."
    };
  }

  let analysisScores = { voiceToneScore: 50, bodyLanguageScore: 50 };
  if (sessionId) {
    analysisScores = await getAnalysisScores(sessionId, transcript, questionId);
  }

  const finalScoreData = calculateFinalScore(
    evaluation.score,
    analysisScores.voiceToneScore,
    analysisScores.bodyLanguageScore
  );

  return {
    ...evaluation,
    responseScore: evaluation.score,
    ...finalScoreData,
    voiceAnalysis: analysisScores.voiceAnalysis,
    timestamp: new Date().toISOString()
  };
}

export async function getCompleteQuestionAnalysis(sessionId, transcript, questionId, llmScore) {
  try {
    const response = await fetch(`${FLASK_ANALYSIS_URL}/api/analyze/question-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        transcript,
        questionId,
        responseScore: llmScore
      })
    });

    if (!response.ok) {
      throw new Error('Flask analysis failed');
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting complete analysis:", error.message);
    return {
      scores: {
        response: llmScore,
        voiceTone: 50,
        bodyLanguage: 50,
        final: llmScore
      }
    };
  }
}

export async function generateReport(transcripts, sessionAnalysis = null) {
  let analysisSection = '';
  
  if (sessionAnalysis) {
    analysisSection = `

PERFORMANCE ANALYSIS:
- Average Body Language Score: ${sessionAnalysis.body_language_score || 'N/A'}/100
- Average Voice Tone Score: ${sessionAnalysis.voice_tone_score || 'N/A'}/100
- Overall Confidence Score: ${sessionAnalysis.combined_score || 'N/A'}/100
- Status: ${sessionAnalysis.overall_status || 'N/A'}

Per-Question Breakdown:
${sessionAnalysis.question_analyses?.map((qa, idx) => `
Question ${idx + 1}:
- Voice Tone: ${qa.voice_tone_score}/100
- Body Language: ${qa.body_language_score}/100
`).join('\n') || 'No detailed analysis available'}
`;
  }

  const prompt = `Generate a comprehensive interview report based on the following data:

INTERVIEW RESPONSES:
${JSON.stringify(transcripts, null, 2)}
${analysisSection}

Create a structured report that includes:
1. Executive Summary
2. Response Analysis (content quality, technical accuracy)
3. Communication Assessment (voice tone, body language)
4. Strengths and Areas for Improvement
5. Overall Recommendation

Return plain text only (no markdown, no JSON).`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": OPENROUTER_REFERER,
      "X-Title": "AI Career Interview Copilot",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o",
      messages: [
        { role: "user", content: prompt }
      ],
      max_tokens: 2000
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`OpenRouter Error: ${data.error.message}`);
  }

  return data.choices[0].message.content.trim();
}

export async function startAnalysisSession(interviewId) {
  try {
    const response = await fetch(`${FLASK_ANALYSIS_URL}/api/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: interviewId })
    });

    if (!response.ok) {
      console.warn("⚠️ Could not start analysis session");
      return { success: false };
    }

    return await response.json();
  } catch (error) {
    console.error("Error starting analysis session:", error.message);
    return { success: false };
  }
}

export async function stopAnalysisSession(interviewId) {
  try {
    const response = await fetch(`${FLASK_ANALYSIS_URL}/api/session/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: interviewId })
    });

    if (!response.ok) {
      console.warn("⚠️ Could not stop analysis session");
      return null;
    }

    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error("Error stopping analysis session:", error.message);
    return null;
  }
}