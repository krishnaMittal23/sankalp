import express from "express";
import { PrismaClient } from "@prisma/client";
import { generateQuestions, startAnalysisSession } from "../services/llm.js";
import { transcribeAudio } from "../services/deepgram.js";
import { synthesizeSpeech } from "../services/elevenlabs.js";
import { enqueueEvaluation } from "../services/worker.js";
import { updateMemoryFromReport, getInterviewContext } from "../services/memory.js";

const router = express.Router();
const prisma = new PrismaClient();

// router.post("/", async (req, res) => {
//   try {
//     const { role, skills, userName, userId } = req.body; 

//     if (!role || !skills || skills.length === 0) {
//       return res.status(400).json({ 
//         error: "Role and skills are required" 
//       });
//     }
//     const context = userId ? await getInterviewContext(userId, skills) : null;
//     const questionTexts = await generateQuestions({ role, skills, context });


//     const interview = await prisma.interview.create({
//       data: {
//         role,
//         skills,
//         userName: userName || "Anonymous", 
//         questions: {
//           create: questionTexts.map((text, index) => ({ 
//             text,
//             order: index 
//           })),
//         },
//       },
//       include: { questions: true },
//     });

//     const analysisSession = await startAnalysisSession(interview.id);
//     console.log("Analysis session started:", analysisSession);

//     res.json({
//       ...interview,
//       analysisSession: analysisSession.status === 'success'
//     });
//   } catch (error) {
//     console.error("Error creating interview:", error);
//     res.status(500).json({ 
//       error: "Failed to create interview",
//       details: error.message 
//     });
//   }
// });

router.post("/", async (req, res) => {
  try {
    const { role, skills, userName, userId } = req.body; // Add userId

    if (!role || !skills || skills.length === 0) {
      return res.status(400).json({ 
        error: "Role and skills are required" 
      });
    }

    let context = null;
    if (userId) {
      try {
        context = await getInterviewContext(userId, skills);
        console.log("📚 Fetched context for user:", userId);
        console.log("Context preview:", context?.text?.substring(0, 200));
      } catch (error) {
        console.warn("⚠️ Could not fetch context, proceeding without it:", error.message);
      }
    }

    const questionTexts = await generateQuestions({ 
      role, 
      skills, 
      context
    });

    const interview = await prisma.interview.create({
      data: {
        role,
        skills,
        userName: userName || "Anonymous", 
        questions: {
          create: questionTexts.map((text, index) => ({ 
            text,
            order: index 
          })),
        },
      },
      include: { questions: true },
    });

    const analysisSession = await startAnalysisSession(interview.id);
    console.log("Analysis session started:", analysisSession);

    res.json({
      ...interview,
      analysisSession: analysisSession.status === 'success',
      contextUsed: context !== null
    });
  } catch (error) {
    console.error("Error creating interview:", error);
    res.status(500).json({ 
      error: "Failed to create interview",
      details: error.message 
    });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const interview = await prisma.interview.findUnique({
      where: { id: req.params.id },
      include: { 
        questions: true,
        transcripts: {
          include: { question: true }
        },
        reports: true
      },
    });

    if (!interview) {
      return res.status(404).json({ error: "Interview not found" });
    }

    res.json(interview);
  } catch (error) {
    console.error("Error fetching interview:", error);
    res.status(500).json({ error: "Failed to fetch interview" });
  }
});


router.post("/:id/answer", async (req, res) => {
  try {
    const { questionId, audioBase64 } = req.body;
    const interviewId = req.params.id;

    if (!questionId || !audioBase64) {
      return res.status(400).json({ 
        error: "Question ID and audio are required" 
      });
    }
    const transcriptText = await transcribeAudio(audioBase64);
    console.log("Transcribed:", transcriptText);

const transcript = await prisma.transcript.create({
  data: {
    interviewId,
    questionId,
    transcript: transcriptText, 
  },
});


    enqueueEvaluation(
      transcript.id, 
      transcriptText, 
      questionId, 
      interviewId
    );

    res.json({
      success: true,
      transcriptId: transcript.id,
      transcript: transcriptText,
      message: "Answer submitted. Evaluation in progress..."
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    res.status(500).json({ 
      error: "Failed to submit answer",
      details: error.message 
    });
  }
});


router.get("/:id/questions/:questionId/audio", async (req, res) => {
  try {
    const question = await prisma.question.findUnique({
      where: { id: req.params.questionId },
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }
    const audioBuffer = await synthesizeSpeech(question.text);

    res.set({
      "Content-Type": "audio/wav",
      "Content-Length": audioBuffer.length,
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error("Error generating audio:", error);
    res.status(500).json({ 
      error: "Failed to generate audio",
      details: error.message 
    });
  }
});


router.get("/transcripts/:transcriptId/evaluation", async (req, res) => {
  try {
    const transcript = await prisma.transcript.findUnique({
      where: { id: req.params.transcriptId },
      include: { question: true }
    });

    if (!transcript) {
      return res.status(404).json({ error: "Transcript not found" });
    }

    if (!transcript.evaluation) {
      return res.json({ 
        status: "pending",
        message: "Evaluation in progress..." 
      });
    }

    const evaluation = JSON.parse(transcript.evaluation);

    res.json({
      status: "completed",
      transcript: transcript.transcript,
      question: transcript.question.text,
      evaluation: evaluation,
      scores: {
        response: evaluation.responseScore,
        voiceTone: evaluation.breakdown?.voiceTone,
        bodyLanguage: evaluation.breakdown?.bodyLanguage,
        final: evaluation.finalScore
      }
    });
  } catch (error) {
    console.error("Error fetching evaluation:", error);
    res.status(500).json({ error: "Failed to fetch evaluation" });
  }
});


router.get("/:id/report", async (req, res) => {
  try {
    const { userId } = req.query;

    const report = await prisma.report.findFirst({
      where: { interviewId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!report) {
      return res.status(404).json({ 
        error: "Report not yet generated. Complete all questions first." 
      });
    }

    let analysisData = null;
    if (report.analysisData) {
      try {
        analysisData = JSON.parse(report.analysisData);
      } catch (e) {
        console.warn("Could not parse analysis data");
      }
    }

    if(userId) {
      await updateMemoryFromReport(req.params.id, userId).catch(err => {
        console.error("error updating memory", err);
      });
    }
    res.json({
      content: report.content,
      analysisData: analysisData,
      createdAt: report.createdAt
    });
    // const userId = req.query;
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.get("/:id/analysis-status", async (req, res) => {
  try {
    const FLASK_URL = process.env.FLASK_ANALYSIS_URL || "http://127.0.0.1:5001";
    const response = await fetch(
      `${FLASK_URL}/api/session/status?sessionId=${req.params.id}`
    );

    if (!response.ok) {
      return res.json({ active: false });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching analysis status:", error);
    res.json({ active: false });
  }
});

router.get("/", async (req, res) => {
  try {
    const interviews = await prisma.interview.findMany({
      include: {
        questions: true,
        transcripts: true,
        reports: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(interviews);
  } catch (error) {
    console.error("Error fetching interviews:", error);
    res.status(500).json({ error: "Failed to fetch interviews" });
  }
});

export default router;
