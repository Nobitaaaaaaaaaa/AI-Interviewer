import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

const proxyAgent = new HttpsProxyAgent(
  process.env.PROXY_URL!
);

export async function scrapeGithub(username: string) {
  const userRepos = await axios.get(
    `https://api.github.com/users/${username}/repos`,
    {
      httpAgent: proxyAgent,
      httpsAgent: proxyAgent,
      headers: {
        "User-Agent": "AI-Interviewer",
      },
    }
  );

  return userRepos.data.map((x: any) => ({
    description: x.description,
    name: x.name,
    fullName: x.full_name,
    starCount: x.stargazers_count,
  }));
}