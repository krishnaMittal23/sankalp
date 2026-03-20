import { StateGraph, Annotation } from '@langchain/langgraph';
import {TavilySearch} from '@langchain/tavily'
import OpenAI from "openai";
import { parse as parseJsonC } from 'jsonc-parser';

const llmClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});


async function callLLM(messages, model = "nvidia/nemotron-3-super-120b-a12b:free") {
  try {
    const completion = await llmClient.chat.completions.create({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 3000,
    });


    const firstMessage = completion.choices[0].message;
    let textContent = "";
    if (firstMessage.content) {
      if (Array.isArray(firstMessage.content)) {
        textContent = firstMessage.content
          .filter(c => c.type === "text")
          .map(c => c.text)
          .join("\n");
      } else if (typeof firstMessage.content === 'string') {
        textContent = firstMessage.content;
      } else if (firstMessage.content.text) {
        textContent = firstMessage.content.text;
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


const RoadmapState = Annotation.Root({
  bookmarkedJobs: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  userSkills: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  currentJobIndex: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => 0,
  }),
  jobAnalysis: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ({}),
  }),
  roadmaps: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ({}),
  }),
  finalOutput: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ({}),
  }),
});


const webSearchTool = new TavilySearch({
  maxResults: 5,
  apiKey: process.env.TAVILY_API_KEY,
});


async function analyzeJobRequirements(state) {
  const { bookmarkedJobs, userSkills, currentJobIndex } = state;
  const currentJob = bookmarkedJobs[currentJobIndex];
  
  if (!currentJob) {
    return { ...state, jobAnalysis: {} };
  }


  const prompt = `
Analyze this job posting and extract the required skills and qualifications:


Job Title: ${currentJob.title}
Company: ${currentJob.company}


Based on typical requirements for this role, list the key technical skills, tools, and qualifications needed.
Return as JSON with this format:
{
  "requiredSkills": ["skill1", "skill2", ...],
  "niceToHave": ["skill1", "skill2", ...]
}
`;


  try {
    const response = await callLLM([
      { role: "system", content: "You are a job requirements analyst. Return only valid JSON." },
      { role: "user", content: prompt }
    ]);
    
    let parsed;
    try {
      parsed = parseJsonC(response.content, undefined, { allowTrailingComma: true });
    } catch (err) {
      console.warn("Failed to parse job requirements, using defaults", err);
      parsed = { requiredSkills: [], niceToHave: [] };
    }

    const requiredSkills = parsed.requiredSkills || [];
    const userSkillsLower = userSkills.map(s => s.toLowerCase());
    const skillGaps = requiredSkills.filter(
      skill => !userSkillsLower.some(us => us.includes(skill.toLowerCase()) || skill.toLowerCase().includes(us))
    );


    const analysis = {
      jobId: currentJob.jobId,
      requiredSkills,
      niceToHave: parsed.niceToHave || [],
      skillGaps,
      matchingSkills: requiredSkills.filter(skill => !skillGaps.includes(skill))
    };


    return { ...state, jobAnalysis: analysis };
  } catch (err) {
    console.error("Error in analyzeJobRequirements:", err);
    return { 
      ...state, 
      jobAnalysis: { 
        jobId: currentJob.jobId, 
        requiredSkills: [], 
        skillGaps: [],
        niceToHave: [],
        matchingSkills: []
      } 
    };
  }
}


async function fetchLearningResources(skill) {
  try {
    const query = `best courses tutorials learn ${skill} 2025`;
    const results = await webSearchTool.invoke(query);
    if (Array.isArray(results)) {
      return results.slice(0, 3).map(result => ({
        title: extractTitle(result.content) || `Learn ${skill}`,
        url: result.url,
        description: result.content.substring(0, 150)
      }));
    }
    
    return [];
  } catch (err) {
    console.error(`Error fetching resources for ${skill}:`, err);
    return [];
  }
}


function extractTitle(content) {
  const firstSentence = content.split('.')[0];
  return firstSentence.length > 60 ? firstSentence.substring(0, 60) + '...' : firstSentence;
}


async function generateJobRoadmap(state) {
  const { bookmarkedJobs, userSkills, currentJobIndex, jobAnalysis } = state;
  const currentJob = bookmarkedJobs[currentJobIndex];
  
  if (!currentJob || !jobAnalysis.jobId) {
    return state;
  }


  const systemPrompt = `
You are an expert career development advisor and learning path designer.
Your task is to create a detailed, actionable learning roadmap for someone preparing for a specific job role.


Return ONLY a valid JSON array with this exact structure:
[
  {
    "step": 1,
    "title": "Short descriptive title",
    "description": "Detailed description of what to learn and why",
    "estimatedDuration": "time estimate (e.g., 2-3 months)",
    "skills": ["skill1", "skill2"]
  }
]


Important:
- Create 4-7 steps in logical learning order
- Each step should build on previous steps
- Be realistic with time estimates
- Focus on practical, job-relevant skills
- Do NOT include resources field - it will be added separately
`;


  const userPrompt = `
Job Title: ${currentJob.title}
Company: ${currentJob.company}


User's Current Skills: ${userSkills.join(', ') || 'No specific skills listed'}


Required Skills for Job: ${jobAnalysis.requiredSkills.join(', ')}
Skill Gaps to Address: ${jobAnalysis.skillGaps.join(', ') || 'None - user has most required skills'}
Nice to Have: ${jobAnalysis.niceToHave.join(', ')}


Create a learning roadmap that:
1. Prioritizes the most critical skill gaps first
2. Builds on the user's existing skills
3. Prepares them specifically for the ${currentJob.title} role at ${currentJob.company}
4. Includes practical projects or portfolio work where relevant


Return ONLY the JSON array, no additional text.
`;


  try {
    const response = await callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], "nvidia/nemotron-3-super-120b-a12b:free");

    let roadmapArray;
    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        roadmapArray = parseJsonC(jsonMatch[0], undefined, { allowTrailingComma: true });
      } else {
        roadmapArray = parseJsonC(response.content, undefined, { allowTrailingComma: true });
      }
      
      if (!Array.isArray(roadmapArray)) {
        throw new Error('Response is not an array');
      }
    } catch (err) {
      console.warn("Failed to parse roadmap, creating fallback", err);
      roadmapArray = createFallbackRoadmap(currentJob, jobAnalysis);
    }

    for (let step of roadmapArray) {
      const stepSkills = step.skills || [];
      const allResources = [];

      for (const skill of stepSkills.slice(0, 2)) { 
        const resources = await fetchLearningResources(skill);
        allResources.push(...resources);
      }
      step.resources = allResources.slice(0, 4);
      
      if (step.resources.length === 0) {
        step.resources = [
          {
            title: `Search for ${stepSkills[0] || 'relevant'} tutorials`,
            url: `https://www.google.com/search?q=learn+${encodeURIComponent(stepSkills[0] || currentJob.title)}`,
            description: "Explore online courses and documentation"
          }
        ];
      }
    }


    const updatedRoadmaps = {
      ...state.roadmaps,
      [currentJob.jobId]: roadmapArray
    };


    return { ...state, roadmaps: updatedRoadmaps };
  } catch (err) {
    console.error("Error in generateJobRoadmap:", err);
    const fallbackRoadmap = createFallbackRoadmap(currentJob, jobAnalysis);
    const updatedRoadmaps = {
      ...state.roadmaps,
      [currentJob.jobId]: fallbackRoadmap
    };
    return { ...state, roadmaps: updatedRoadmaps };
  }
}


function createFallbackRoadmap(job, analysis) {
  const skillGaps = analysis.skillGaps || [];
  
  if (skillGaps.length === 0) {
    return [
      {
        step: 1,
        title: "Advanced Skills Development",
        description: `You already have the fundamental skills for ${job.title}. Focus on advanced topics and real-world projects.`,
        resources: [
          {
            title: "Build Portfolio Projects",
            url: "https://github.com/topics/portfolio",
            description: "Create projects to showcase your skills"
          }
        ],
        estimatedDuration: "2-3 months",
        skills: analysis.requiredSkills.slice(0, 3)
      }
    ];
  }


  return skillGaps.slice(0, 5).map((skill, index) => ({
    step: index + 1,
    title: `Learn ${skill}`,
    description: `Master ${skill} to meet the requirements for ${job.title} at ${job.company}`,
    resources: [
      {
        title: `${skill} Learning Resources`,
        url: `https://www.google.com/search?q=learn+${encodeURIComponent(skill)}`,
        description: `Find courses and tutorials for ${skill}`
      }
    ],
    estimatedDuration: "1-2 months",
    skills: [skill]
  }));
}


function shouldProcessNextJob(state) {
  const { bookmarkedJobs, currentJobIndex } = state;
  return currentJobIndex < bookmarkedJobs.length - 1 ? "analyzeJob" : "finalize";
}


async function incrementJobIndex(state) {
  return { ...state, currentJobIndex: state.currentJobIndex + 1 };
}


async function finalizeOutput(state) {
  return { ...state, finalOutput: state.roadmaps };
}


// workflow graph
const workflow = new StateGraph(RoadmapState)
  .addNode("analyzeJob", analyzeJobRequirements)
  .addNode("generateRoadmap", generateJobRoadmap)
  .addNode("incrementIndex", incrementJobIndex)
  .addNode("finalize", finalizeOutput)
  .addEdge("__start__", "analyzeJob")
  .addEdge("analyzeJob", "generateRoadmap")
  .addEdge("generateRoadmap", "incrementIndex")
  .addConditionalEdges("incrementIndex", shouldProcessNextJob, {
    analyzeJob: "analyzeJob",
    finalize: "finalize"
  })
  .addEdge("finalize", "__end__");


const graph = workflow.compile();


export async function generateRoadmaps(bookmarkedJobs = [], userSkills = []) {
  if (!bookmarkedJobs || bookmarkedJobs.length === 0) {
    return { error: "No bookmarked jobs provided" };
  }


  const initialState = {
    bookmarkedJobs,
    userSkills: userSkills || [],
    currentJobIndex: 0,
    jobAnalysis: {},
    roadmaps: {},
    finalOutput: {}
  };


  try {
    const resultState = await graph.invoke(initialState);
    return resultState.finalOutput || {};
  } catch (error) {
    console.error("Error in generateRoadmaps:", error);
    return { error: error.message };
  }
}


export { graph as roadmapGenerationGraph };
