import { StateGraph, Annotation } from '@langchain/langgraph';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { TavilySearch } from "@langchain/tavily";
import OpenAI from "openai";
import { parse as parseJsonC } from 'jsonc-parser';
import { jsonrepair } from 'jsonrepair';


const llmClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function callLLM(messages, model = "nvidia/nemotron-3-super-120b-a12b:free") {
  try {
    const completion = await llmClient.chat.completions.create({
      model,
      messages,
      temperature: 0.1,
      max_tokens: 1000,
    });

    const firstMessage = completion.choices[0].message;
    let textContent = "";
    if (firstMessage.content) {
      if (Array.isArray(firstMessage.content)) {
        textContent = firstMessage.content
          .filter(c => c.type === "text")
          .map(c => c.text)
          .join("\n");
      } else {
        textContent = typeof firstMessage.content === 'string'
          ? firstMessage.content
          : firstMessage.content.text || "";
      }
    }
    if (!textContent || textContent.trim() === "") {
      if (firstMessage.reasoning && firstMessage.reasoning.trim() !== "") {
        textContent = firstMessage.reasoning;
      }
    }

    return { content: textContent || "" };
  } catch (err) {
    console.error("LLM call error:", err);
    return { content: "" };
  }
}

const GraphState = Annotation.Root({
  rawDocumentText: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  rawGoals: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  cleanedDocumentText: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  cleanedGoals: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  searchQueries: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  searchResults: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  finalOutput: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
});

const webSearchTool = new TavilySearch({
  maxResults: 5,
  apiKey: process.env.TAVILY_API_KEY,
});

async function cleanContent(state) {
  const { rawDocumentText, rawGoals } = state;
  let cleanedDocumentText = rawDocumentText || "";
  let cleanedGoals = rawGoals || "";

  if (rawDocumentText && rawDocumentText.trim()) {
    const prompt = `
Clean and extract only relevant professional info from this document.  
Remove personal identifiers. Keep work experience, skills, education, projects, achievements.

Original:
${rawDocumentText}
`;
    try {
      const response = await callLLM([
        { role: "system", content: "You are a document preprocessor." },
        { role: "user", content: prompt }
      ]);
      cleanedDocumentText = response.content.trim();
    } catch (err) {
      console.warn("Error in document cleaning, fallback regex method", err);
      cleanedDocumentText = rawDocumentText
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '')
        .replace(/\b\d{10,}\b/g, '')
        .replace(/\n\s*\n/g, "\n")
        .trim();
    }
  }

  if (rawGoals && rawGoals.trim()) {
    const prompt = `
Clean and structure this goals text. Focus on career objectives, skill development, industry preferences.If uncesseary text is there then ignore it.

Original goals:
${rawGoals}
`;
    try {
      const response = await callLLM([
        { role: "system", content: "You are a goals cleaner." },
        { role: "user", content: prompt }
      ]);
      cleanedGoals = response.content.trim();
    } catch (err) {
      console.warn("Error in goals cleaning", err);
      cleanedGoals = rawGoals.trim();
    }
  }

  return { ...state, cleanedDocumentText, cleanedGoals };
}

async function shouldSearchWeb(state) {
  const { cleanedDocumentText, cleanedGoals } = state;
  const prompt = `
Given the following cleaned content, decide whether web search would add value:

Document: ${cleanedDocumentText ? cleanedDocumentText.substring(0, 300) + "..." : "None"}
Goals: ${cleanedGoals || "None"}

Reply with "YES" or "NO".
`;
  const response = await callLLM([
    { role: "system", content: "Decide if web search is helpful." },
    { role: "user", content: prompt }
  ]);
  const should = response.content.trim().toUpperCase().includes("YES");
  return { ...state, searchQueries: should ? ["career trends"] : [] };
}

async function generateSearchQueries(state) {
  const { cleanedDocumentText, cleanedGoals, searchQueries } = state;
  if (!searchQueries || searchQueries.length === 0) return state;

  const prompt = `
Based on the following cleaned content, propose 2-3 specific web search queries (JSON array of strings):

Document: ${cleanedDocumentText ? cleanedDocumentText.substring(0, 400) + "..." : "None"}
Goals: ${cleanedGoals || "None"}
`;
  try {
    const response = await callLLM([
      { role: "system", content: "Generate search queries." },
      { role: "user", content: prompt }
    ]);
    let raw = response.content.trim();
    let queries = JSON.parse(jsonrepair(raw));
    if (!Array.isArray(queries)) queries = [];
    return { ...state, searchQueries: queries.slice(0, 3) };
  } catch (err) {
    console.warn("Error generating queries", err);
    return { ...state, searchQueries: [] };
  }
}

async function performWebSearch(state) {
  const { searchQueries } = state;
  if (!searchQueries || searchQueries.length === 0) return state;

  const results = [];
  for (const query of searchQueries.slice(0, 2)) {
    try {
      const res = await webSearchTool.invoke({ query });
      const items = Array.isArray(res)
        ? res
        : typeof res === "string"
          ? JSON.parse(res)
          : [res];
      results.push(...items);
    } catch (err) {
      console.warn("Search error", err);
    }
  }
  return { ...state, searchResults: results };
}

async function analyzeContent(state) {
  const { cleanedDocumentText, cleanedGoals, searchResults } = state;
  const context = searchResults.length
    ? `\n\nWeb context:\n${searchResults.map(r => `- ${r.title}: ${r.content}`).join("\n")}`
    : "";

const systemPrompt = `
You are an expert career advisor. You **MUST ONLY** respond with a valid, single JSON object. DO NOT include any explanatory text, reasoning, or markdown (e.g., \`\`\`json) outside of the JSON object itself.  
Given the document text, the user's goals, and optional web search insights, extract:
- goals (array of strings)
- skills (array of strings, only explicitly mentioned)
Return **pure JSON**.
`;

  const userPrompt = `
Document:
${cleanedDocumentText || "None"}

Goals:
${cleanedGoals || "None"}

${context}
`;

  const parser = new JsonOutputParser();
  try {
    const response = await callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    console.log("LLM response:", response.content);
    let parsed;
    try {
      parsed = parseJsonC(response.content, undefined, { allowTrailingComma: true });
    } catch (err) {
      console.warn("jsonc-parser failed", err);
      parsed = { goals: [], skills: [] };
    }
    return {
      ...state,
      finalOutput: {
        goals: Array.isArray(parsed.goals) ? parsed.goals : [],
        skills: Array.isArray(parsed.skills) ? parsed.skills : []
      }
    };
  } catch (err) {
    console.error("Error in analysis node", err);
    return {
      ...state,
      finalOutput: { goals: cleanedGoals ? [cleanedGoals] : [], skills: [] }
    };
  }
}

const workflow = new StateGraph(GraphState)
  .addNode("cleanContent", cleanContent)
  .addNode("shouldSearchWeb", shouldSearchWeb)
  .addNode("generateQueries", generateSearchQueries)
  .addNode("webSearch", performWebSearch)
  .addNode("analyze", analyzeContent)
  .addEdge("__start__", "cleanContent")
  .addEdge("cleanContent", "shouldSearchWeb")
  .addEdge("shouldSearchWeb", "generateQueries")
  .addEdge("generateQueries", "webSearch")
  .addEdge("webSearch", "analyze")
  .addEdge("analyze", "__end__");

const graph = workflow.compile();

export async function processWithLLM(documentText = "", goals = "") {
  if (!documentText && !goals) return { error: "No content", goals: [], skills: [] };

  const initialState = {
    rawDocumentText: documentText,
    rawGoals: goals,
    cleanedDocumentText: "",
    cleanedGoals: "",
    searchQueries: [],
    searchResults: [],
    finalOutput: null
  };

  const resultState = await graph.invoke(initialState); 
  return resultState.finalOutput || { goals: [], skills: [] };
}

export { graph as goalAnalysisGraph };

