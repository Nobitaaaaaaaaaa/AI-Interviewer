import express from "express"
import { PreInterviewSchema } from "./types"
import {scrapeGithub} from "./scrapers/github";
import "dotenv/config";
import cors from "cors"
import {prisma} from "./db"

const  app = express()
app.use(express.json())
app.use(cors())
app.use(express.text({ type: ["application/sdp", "text/plain"] }));

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

app.post("/api/v1/session:interviewId", async (req, res) => {
    console.log("📥 Received SDP Offer at /api/v1/session. Body length:", req.body?.length);
    const sessionConfig = JSON.stringify({
        type: "realtime",
        model: "gpt-realtime",
        audio: { output: { voice: "marin" } },
    });

  const fd = new FormData();
  fd.set("", req.body);
  fd.set("session", sessionConfig);

  try {
    console.log("📤 Sending request to OpenAI Realtime Calls...");
    const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_KEY || process.env.OPENAI_API_KEY}`,
        "OpenAI-Safety-Identifier": "hashed-user-id",
      },
      body: fd,
    });

    const location = sdpResponse.headers.get("Location");
    const callId = location?.split("/").pop();
    console.log(callId);


    const responseText = await sdpResponse.text();
    console.log(`📥 OpenAI response status: ${sdpResponse.status}`);
    
    if (!sdpResponse.ok) {
      console.error("❌ OpenAI error response:", responseText);
      return res.status(sdpResponse.status).send(responseText);
    }

    console.log("✅ Received valid SDP response from OpenAI");
    res.send(responseText);

    initSideband(callId , )
  } catch (error) {
    console.error("❌ Token generation/connection error:", error);
    res.status(500).json({ error: "Failed to generate session" });
  }

});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Backend server is running and listening on port ${PORT}`);
});
