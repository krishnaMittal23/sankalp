import { PrismaClient } from "@prisma/client";
import { queryNearestVectors } from "./qdrant.js";

const prisma = new PrismaClient();

export async function buildContext(userId, { role, skills } = {}) {
  if (!userId) {
    return { text: `Candidate: anonymous. Role: ${role}. Skills: ${skills.join(", ")}. No prior data available.`, meta: {} };
  }

  const lastInterview = await prisma.interview.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { transcripts: true, questions: true, reports: true }
  });

  const agg = await prisma.userAggregate.findUnique({ where: { userId } });
  const neighbors = await queryNearestVectors(userId, skills.join(", "), 5);

  const lastSummary = lastInterview?.report?.content?.slice(0, 400) || "No prior interviews.";
  const memSummaries = neighbors.map(n => n.payload.content).join("\n");

  const ctxText = [
    `Role: ${role}`,
    `Skills: ${skills.join(", ")}`,
    `Last interview summary: ${lastSummary}`,
    `Known strengths: ${agg?.strengths || 'N/A'}`,
    `Known weaknesses: ${agg?.weaknesses || 'N/A'}`,
    `Recent memory notes: ${memSummaries}`
  ].join("\n\n");

  return {
    text: ctxText,
    meta: {
      lastInterviewId: lastInterview?.id || null,
      avgScore: agg?.avgScore || null
    }
  };
}
