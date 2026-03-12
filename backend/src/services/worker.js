import { PrismaClient } from "@prisma/client";
import { 
  evaluateAnswer, 
  generateReport, 
  stopAnalysisSession,
  getCompleteQuestionAnalysis 
} from "./llm.js";

const prisma = new PrismaClient();

export async function enqueueEvaluation(
  transcriptId, 
  transcriptText, 
  questionId, 
  interviewId
) {
  setImmediate(async () => {
    try {
      const question = await prisma.question.findUnique({ 
        where: { id: questionId } 
      });

      const evalResult = await evaluateAnswer(
        transcriptText, 
        question.text,
        interviewId,
        questionId
      );

      console.log("📊 Evaluation Result:", JSON.stringify(evalResult, null, 2));

await prisma.transcript.update({
  where: { id: transcriptId },
  data: { 
    evaluation: JSON.stringify(evalResult),
    finalScore: evalResult.finalScore || evalResult.score,
    responseScore: evalResult.responseScore,
    voiceToneScore: evalResult.breakdown?.voiceTone,
    bodyLanguageScore: evalResult.breakdown?.bodyLanguage
  },
});
      const interview = await prisma.interview.findUnique({
        where: { id: interviewId },
        include: { questions: true }
      });

const transcripts = await prisma.transcript.findMany({ 
  where: { interviewId },
  include: { question: true }
});

      if (transcripts.length >= interview.questions.length) {
        console.log("✅ All questions answered. Generating final report...");

        const sessionAnalysis = await stopAnalysisSession(interviewId);
const reportText = await generateReport(
  transcripts.map(t => ({
    question: t.question.text,
    transcript: t.answerText,
    evaluation: JSON.parse(t.evaluation || '{}'),
  })),
  sessionAnalysis
);

        await prisma.report.create({
          data: { 
            interviewId, 
            content: reportText,
            analysisData: sessionAnalysis ? JSON.stringify(sessionAnalysis) : null
          },
        });

        console.log("📝 Final report generated successfully!");
      }
    } catch (err) {
      console.error("❌ Worker error:", err);
    }
  });
}
