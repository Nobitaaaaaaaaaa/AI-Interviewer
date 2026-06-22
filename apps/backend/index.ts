import "dotenv/config";
import express from "express"
import { PreInterviewSchema } from "./types"
import {scrapeGithub} from "./scrapers/github";
import cors from "cors"
import {prisma} from "./db"
import { initSideband } from "./sideband";
import { calculateResult } from "./result";

const  app = express()
app.use(cors())
app.use(express.json())
app.use(express.text({ type: ["application/sdp", "text/plain"] }));

// Debug: log every incoming request
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url} [Content-Type: ${req.headers['content-type']}]`);
    next();
});

// Test route
app.get("/api/v1/health", (req, res) => {
    res.json({ status: "ok" });
});

app.post("/api/v1/pre-interview", async (req, res) => {
    console.log("📥 Received POST request at /api/v1/pre-interview with body:", req.body);
    
    const {success , data} = PreInterviewSchema.safeParse(req.body);

    if(!success){
        console.warn("⚠️ Invalid request body received:", req.body);
        return res.status(411).json({message:"Incorrect data provided"});
    }

    const githubUrl = data.github.endsWith("/") ? data.github.slice(0,-1) : data.github;
    const githubUsername = githubUrl.split("/").pop();

    if (!githubUsername) {
        console.warn("⚠️ Could not extract GitHub username from:", data.github);
        return res.status(400).json({message: "Invalid GitHub URL or username"});
    }

    console.log(`🔍 Scraping GitHub profile for username: "${githubUsername}"...`);
    try {
        const githubData = await scrapeGithub(githubUsername);
        const interview = await prisma.interview.create({
            data: {
                githubMetadata: JSON.stringify(githubData),
                status: "Pre"
            }
        });
         res.json({id:interview.id});
    } catch (error: any) {
        console.error("❌ Failed to scrape GitHub profile:", error.message || error);
        return res.status(500).json({
            message: "Failed to scrape GitHub data",
            error: error.message
        });
    }
})

app.post("/api/v1/session/:interviewId", async (req, res) => {
    console.log("📥 Received SDP Offer at /api/v1/session. Body length:", req.body?.length);
    const openAiKey = (req.headers["x-openai-key"] as string) || process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
    
    if (!openAiKey) {
        return res.status(400).json({ error: "Missing OpenAI API Key" });
    }

    const sessionConfig = JSON.stringify({
        type: "realtime",
        model: "gpt-realtime",
        audio: { output: { voice: "marin" } },
    });

  const fd = new FormData();
  fd.set("sdp", req.body);
  fd.set("session", sessionConfig);

  try {
    console.log("📤 Sending request to OpenAI Realtime Calls...");
    const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "OpenAI-Safety-Identifier": "hashed-user-id",
      },
      body: fd,
    });

    const location = sdpResponse.headers.get("Location");
    console.log("--- OpenAI Headers ---");
    sdpResponse.headers.forEach((val, key) => console.log(`  ${key}: ${val}`));
    console.log("----------------------");
    const callId = location?.split("/").pop()!;
    console.log("callId extracted:", callId);


    const responseText = await sdpResponse.text();
    console.log(`📥 OpenAI response status: ${sdpResponse.status}`);
    
    if (!sdpResponse.ok) {
      console.error("❌ OpenAI error response:", responseText);
      return res.status(sdpResponse.status).send(responseText);
    }

    console.log("✅ Received valid SDP response from OpenAI");

    initSideband(callId, req.params.interviewId, openAiKey);
    res.send(responseText);

    
  } catch (error) {
    console.error("❌ Token generation/connection error:", error);
    res.status(500).json({ error: "Failed to generate session" });
  }

});

app.post("/api/v1/session/user/response/:interviewId", async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.json({ success: true });
  }

  const interviewId = req.params.interviewId!;

  // Find the last message for this interview
  const lastMessage = await prisma.message.findFirst({
    where: { interviewId },
    orderBy: { createdAt: "desc" }
  });

  const thresholdMs = 8000;
  if (lastMessage && lastMessage.type === "USER" && (Date.now() - new Date(lastMessage.createdAt).getTime() < thresholdMs)) {
    await prisma.message.update({
      where: { id: lastMessage.id },
      data: {
        message: `${lastMessage.message} ${message.trim()}`
      }
    });
  } else {
    await prisma.message.create({
      data: {
        interviewId,
        type: "USER",
        message: message.trim()
      }
    });
  }
  res.json({ success: true });
});

app.get("/api/v1/result/:interviewId", async (req, res) => {
  const geminiKey = (req.headers["x-gemini-key"] as string) || process.env.GEMINI_API_KEY;

  let interview = await prisma.interview.findFirst({
    where: {
      id: req.params.interviewId
    },
    include: {
      conversations: true
    }
  });

  if (!interview) {
    return res.status(411).json({ message: "Interview not found" });
  }

  if (interview.status !== "Done") {
    if (!geminiKey) {
        return res.status(400).json({ message: "Missing Gemini API Key" });
    }
    const result = await calculateResult(interview.conversations, geminiKey);

    await prisma.interview.update({
      where: {
        id: req.params.interviewId
      },
      data: {
        status: "Done",
        feedback: result.feedback,
        score: result.score
      }
    });

    // Re-fetch with updated data
    interview = await prisma.interview.findFirst({
      where: { id: req.params.interviewId },
      include: { conversations: true }
    });
  }

  res.json({
    score: interview?.score,
    feedback: interview?.feedback,
    transcript: interview?.conversations.map(c => ({
      type: c.type === "AI" ? "Assistant" : "User",
      content: c.message,
      createdAt: c.createdAt
    })),
    status: interview?.status === "Done" ? "DONE" : interview?.status
  });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Backend server is running and listening on port ${PORT}`);
});

