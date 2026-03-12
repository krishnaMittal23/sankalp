// services/embeddings.js
import fetch from "node-fetch";
// import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function createEmbedding(text) {
  if (!text || text.length === 0) throw new Error("Cannot embed empty text");

  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-1.5-embedding",
      input: text
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || "Embedding generation failed");

  return data.data[0].embedding;
}
