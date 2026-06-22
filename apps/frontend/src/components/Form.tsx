import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import axios from "axios";
import { BACKEND_URL } from "../lib/config";
import { useNavigate } from "react-router";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Sparkles, Terminal, KeyRound } from "lucide-react";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export function Form() {
  const [github, setgithub] = useState("");
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem("openai_key") || "");
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("gemini_key") || "");
  const [loading, setloading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit() {
    if (!github) {
      toast.error("Please provide a valid GitHub URL");
      return;
    }
    if (!openaiKey) {
      toast.error("Please provide your OpenAI API Key");
      return;
    }
    if (!geminiKey) {
      toast.error("Please provide your Gemini API Key");
      return;
    }

    setloading(true);

    try {
      toast.info("Analyzing profile and initializing session...");
      // Save keys to localStorage
      localStorage.setItem("openai_key", openaiKey.trim());
      localStorage.setItem("gemini_key", geminiKey.trim());

      const response = await axios.post(`${BACKEND_URL}/api/v1/pre-interview`, { github });
      toast.success("Success! Let's start the interview.");
      navigate(`/interview/${response.data.id}`);
    } catch (error: any) {
      toast.error(`Error: ${error.message || "Failed to connect to backend"}`);
      console.error("Form submission failed:", error);
    }
    setloading(false);
  }

  return (
    <div className="h-screen w-screen flex justify-center items-center bg-zinc-950 overflow-hidden relative">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-4">
        <Card className="border-zinc-800 bg-zinc-950/70 text-zinc-100 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-zinc-700">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-indigo-400">
              <Terminal className="h-5 w-5 animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-indigo-400 bg-clip-text text-transparent">
              AI Interviewer
            </CardTitle>
            <CardDescription className="text-zinc-400 text-xs mt-1">
              Please provide your own API keys below. Unfortunately, running advanced voice models is painfully expensive, and our bank account isn't sponsored by Microsoft or Google (yet). Rest assured, your keys stay safely stored in your browser's local storage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-2">
            {/* GitHub URL Input */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">GitHub Profile</span>
              <div className="relative flex items-center">
                <GithubIcon className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
                <Input
                  value={github}
                  onChange={(e) => setgithub(e.target.value)}
                  placeholder="https://github.com/username"
                  className="pl-9 pr-4 py-5 text-sm border-zinc-800 bg-zinc-950/50 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-indigo-500/50"
                />
              </div>
            </div>

            {/* OpenAI API Key Input */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">OpenAI API Key (WebRTC)</span>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
                <Input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="pl-9 pr-4 py-5 text-sm border-zinc-800 bg-zinc-950/50 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-indigo-500/50"
                />
              </div>
            </div>

            {/* Gemini API Key Input */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Gemini API Key (Evaluation)</span>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
                <Input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="pl-9 pr-4 py-5 text-sm border-zinc-800 bg-zinc-950/50 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-indigo-500/50"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center pt-4 pb-6">
            <Button
              disabled={loading}
              onClick={onSubmit}
              className="w-full py-5 text-sm font-semibold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Analyzing Profile...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Start Interview
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
