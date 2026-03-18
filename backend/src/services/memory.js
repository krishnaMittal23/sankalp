// services/memory.js
import { PrismaClient } from "@prisma/client";
import { createEmbedding } from "./embeddings.js";
import { storeInQdrant, searchQdrant } from "./qdrant.js";

const prisma = new PrismaClient();
export async function updateMemoryFromReport(interviewId, userId) {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      transcripts: { include: { question: true } },
      reports: { orderBy: { createdAt: 'desc' }, take: 1 }
    }
  });

  if (!interview.reports[0]) return;

  const report = interview.reports[0];
  
  const avgScores = calculateAverages(interview.transcripts);
  
  const weaknesses = extractWeaknesses(interview.transcripts);
  
  const strengths = extractStrengths(interview.transcripts);
  
  await storeWeaknesses(userId, weaknesses);
  await storeStrengths(userId, strengths);
  
  await updateUserAggregate(userId, avgScores, strengths, weaknesses);
  
  await storeReportInQdrant(userId, interviewId, report, avgScores);
}

function calculateAverages(transcripts) {
  const scores = transcripts.map(t => t.finalScore).filter(Boolean);
  return {
    avgFinal: scores.reduce((a, b) => a + b, 0) / scores.length,
    avgResponse: transcripts.map(t => t.responseScore).filter(Boolean)
      .reduce((a, b) => a + b, 0) / transcripts.length,
    avgVoice: transcripts.map(t => t.voiceToneScore).filter(Boolean)
      .reduce((a, b) => a + b, 0) / transcripts.length,
    avgBody: transcripts.map(t => t.bodyLanguageScore).filter(Boolean)
      .reduce((a, b) => a + b, 0) / transcripts.length
  };
}

function extractWeaknesses(transcripts) {
  return transcripts
    .filter(t => t.finalScore && t.finalScore < 60)
    .map(t => {
      const evalu = JSON.parse(t.evaluation || '{}');
      return {
        question: t.question.text,
        score: t.finalScore,
        improvements: evalu.improvements || '',
        topic: extractTopic(t.question.text)
      };
    });
}

function extractStrengths(transcripts) {
  return transcripts
    .filter(t => t.finalScore && t.finalScore > 80)
    .map(t => {
      const evalu = JSON.parse(t.evaluation || '{}');
      return {
        question: t.question.text,
        score: t.finalScore,
        strengths: evalu.strengths || '',
        topic: extractTopic(t.question.text)
      };
    });
}

function extractTopic(question) {
  const keywords = question.toLowerCase().match(/\b(database|api|system design|algorithm|testing|security|react|node|python|java)\b/gi);
  return keywords ? keywords[0] : 'general';
}

async function storeWeaknesses(userId, weaknesses) {
  for (const weakness of weaknesses) {
    const text = `Weakness in ${weakness.topic}: ${weakness.improvements}`;
    const embedding = await createEmbedding(text);
    
    await prisma.userMemory.create({
      data: {
        userId,
        type: 'weakness',
        content: text,
        metadata: {
          topic: weakness.topic,
          score: weakness.score,
          question: weakness.question
        }
      }
    });
    
    await storeInQdrant(userId, 'weakness', text, embedding, {
      topic: weakness.topic,
      score: weakness.score
    });
  }
}

async function storeStrengths(userId, strengths) {
  for (const strength of strengths) {
    const text = `Strength in ${strength.topic}: ${strength.strengths}`;
    const embedding = await createEmbedding(text);
    
    await prisma.userMemory.create({
      data: {
        userId,
        type: 'strength',
        content: text,
        metadata: {
          topic: strength.topic,
          score: strength.score
        }
      }
    });
    
    await storeInQdrant(userId, 'strength', text, embedding, {
      topic: strength.topic,
      score: strength.score
    });
  }
}

async function updateUserAggregate(userId, avgScores, strengths, weaknesses) {
  const strengthTopics = [...new Set(strengths.map(s => s.topic))];
  const weaknessTopics = [...new Set(weaknesses.map(w => w.topic))];
  
  await prisma.userAggregate.upsert({
    where: { userId },
    create: {
      userId,
      avgScore: avgScores.avgFinal,
      lastInterview: new Date(),
      strengths: strengthTopics,
      weaknesses: weaknessTopics
    },
    update: {
      avgScore: avgScores.avgFinal,
      lastInterview: new Date(),
      strengths: strengthTopics,
      weaknesses: weaknessTopics,
      updatedAt: new Date()
    }
  });
}

async function storeReportInQdrant(userId, interviewId, report, avgScores) {
  const summaryText = `Interview summary: Average score ${avgScores.avgFinal}. ${report.content.substring(0, 500)}`;
  const embedding = await createEmbedding(summaryText);
  
  await storeInQdrant(userId, 'interview_summary', summaryText, embedding, {
    interviewId,
    avgScore: avgScores.avgFinal,
    date: new Date().toISOString()
  });
}

export async function getInterviewContext(userId, skills) {
  const aggregate = await prisma.userAggregate.findUnique({
    where: { userId }
  });
  
  if (!aggregate) {
    return null;
  }
  
  const recentWeaknesses = await prisma.userMemory.findMany({
    where: { userId, type: 'weakness' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  const queryText = `User needs practice in: ${skills.join(', ')}`;
  const queryEmbedding = await createEmbedding(queryText);
  const similarMemories = await searchQdrant(userId, queryEmbedding, 3);
  
  return {
    text: buildContextText(aggregate, recentWeaknesses, similarMemories),
    aggregate,
    weaknesses: recentWeaknesses,
    similarPast: similarMemories
  };
}

function buildContextText(aggregate, weaknesses, similarMemories) {
  let context = `User Performance History:\n`;
  context += `- Average Score: ${aggregate.avgScore?.toFixed(1)}/100\n`;
  context += `- Strengths: ${JSON.stringify(aggregate.strengths)}\n`;
  context += `- Weaknesses: ${JSON.stringify(aggregate.weaknesses)}\n\n`;
  
  if (weaknesses.length > 0) {
    context += `Recent Areas Needing Improvement:\n`;
    weaknesses.forEach(w => {
      context += `- ${w.content}\n`;
    });
  }
  
  return context;
}