import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

export async function scrapeGithub(username: string) {
  try {
    console.log(`[scraper] Attempting direct request to GitHub for: ${username}`);
    const userRepos = await axios.get(
      `https://api.github.com/users/${username}/repos`,
      {
        headers: {
          "User-Agent": "AI-Interviewer",
        },
        timeout: 8000,
      }
    );
    return userRepos.data.map((x: any) => ({
      description: x.description,
      name: x.name,
      fullName: x.full_name,
      starCount: x.stargazers_count,
    }));
  } catch (directError: any) {
    console.warn(`[scraper] Direct request failed: ${directError.message || directError}. Attempting proxy fallback...`);
    if (process.env.PROXY_URL) {
      try {
        const proxyAgent = new HttpsProxyAgent(process.env.PROXY_URL);
        const userRepos = await axios.get(
          `https://api.github.com/users/${username}/repos`,
          {
            httpAgent: proxyAgent,
            httpsAgent: proxyAgent,
            headers: {
              "User-Agent": "AI-Interviewer",
            },
            timeout: 10000,
          }
        );
        return userRepos.data.map((x: any) => ({
          description: x.description,
          name: x.name,
          fullName: x.full_name,
          starCount: x.stargazers_count,
        }));
      } catch (proxyError: any) {
        console.error(`[scraper] Proxy fallback also failed: ${proxyError.message || proxyError}`);
        throw proxyError;
      }
    } else {
      throw directError;
    }
  }
}