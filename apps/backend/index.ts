import express from "express"
import { PreInterviewSchema } from "./types"
import {scrapeGithub} from "./scrapers/github";
import "dotenv/config";
import cors from "cors"

const  app = express()
app.use(express.json())
app.use(cors())

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
        console.log("✅ GitHub data scraped successfully:", githubData);
        return res.json({github:githubData});
    } catch (error: any) {
        console.error("❌ Failed to scrape GitHub profile:", error.message || error);
        return res.status(500).json({
            message: "Failed to scrape GitHub data",
            error: error.message
        });
    }
})

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Backend server is running and listening on port ${PORT}`);
});