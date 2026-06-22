import { BACKEND_URL } from "../lib/config"
import axios from "axios"
import { useParams, useNavigate } from "react-router"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Award, Brain, MessageSquare, ArrowLeft, Loader2, Star, Sparkles } from "lucide-react"

interface ResultData {
  transcript: { type: "Assistant" | "User", content: string, createdAt: string }[];
  score: number;
  feedback: string;
  status: string;
}

export function Result() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<ResultData>({
    score: 0,
    feedback: "",
    transcript: [],
    status: "Pre"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const geminiKey = localStorage.getItem("gemini_key") || "";
    
    const fetchResult = () => {
      axios.get(`${BACKEND_URL}/api/v1/result/${interviewId}`, {
        headers: { "x-gemini-key": geminiKey }
      })
        .then(response => {
          setResult(response.data);
          if (response.data.status === "DONE") {
            setLoading(false);
          }
        })
        .catch(err => {
          console.error("Error fetching results:", err);
        });
    };

    fetchResult();

    const intervalId = setInterval(() => {
      axios.get(`${BACKEND_URL}/api/v1/result/${interviewId}`, {
        headers: { "x-gemini-key": geminiKey }
      }).then(response => {
        setResult(response.data);
        if (response.data.status === "DONE") {
          setLoading(false);
          clearInterval(intervalId);
        }
      }).catch(err => {
        console.error("Error fetching results in interval:", err);
      });
    }, 3000);

    return () => clearInterval(intervalId);
  }, [interviewId]);

  const handleRestart = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col p-6 md:p-10 relative overflow-y-auto">
      {/* Background radial glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-2xl backdrop-blur-xl py-8">
            <CardContent className="flex flex-col items-center justify-center space-y-6">
              <div className="relative flex items-center justify-center">
                <div className="absolute h-20 w-20 rounded-full bg-indigo-500/10 animate-pulse" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800">
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold tracking-tight text-zinc-200">
                  Analyzing Interview Responses
                </h3>
                <p className="text-sm text-zinc-400 max-w-[280px]">
                  Our AI evaluator is grading your answers and preparing detailed feedback. This may take up to a minute...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Interview Performance Review
              </h1>
              <p className="text-zinc-400 mt-1">
                Detailed metrics, evaluation criteria, and full transcript.
              </p>
            </div>
            <Button
              onClick={handleRestart}
              variant="outline"
              className="flex items-center gap-2 border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 self-start"
            >
              <ArrowLeft className="h-4 w-4" />
              Restart Interview
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score Box */}
            <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-xl backdrop-blur-xl flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Overall Score
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <div className="relative flex items-center justify-center">
                  {/* Circular progress bar SVG */}
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle
                      className="text-zinc-800"
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                      r="58"
                      cx="72"
                      cy="72"
                    />
                    <circle
                      className="text-indigo-500 transition-all duration-1000 ease-out"
                      strokeWidth="8"
                      strokeDasharray={364.4}
                      strokeDashoffset={364.4 - (364.4 * (result.score || 0)) / 10}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="58"
                      cx="72"
                      cy="72"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold text-white">{result.score}</span>
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Out of 10</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="text-xs text-center text-zinc-500 justify-center pb-6">
                {result.score >= 8 ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Star className="h-3 w-3 fill-emerald-400" /> Excellent Performance
                  </span>
                ) : result.score >= 5 ? (
                  <span className="text-indigo-400 font-semibold">Good Effort, Room to Grow</span>
                ) : (
                  <span className="text-red-400 font-semibold">Needs Improvement</span>
                )}
              </CardFooter>
            </Card>

            {/* Feedback Box */}
            <Card className="col-span-1 md:col-span-2 border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-xl backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  AI Feedback & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="py-4">
                <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/80 p-4 max-h-[220px] overflow-y-auto">
                  <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                    {result.feedback || "No feedback generated."}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="text-xs text-zinc-500 flex items-center gap-1.5 pb-6">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>Generated by Advanced Coding Evaluator</span>
              </CardFooter>
            </Card>
          </div>

          {/* Transcript Box */}
          <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-xl backdrop-blur-xl">
            <CardHeader className="border-b border-zinc-900/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-400" />
                Interview Transcript
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Full logs of the exchange between the AI Interviewer and yourself.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto p-6 space-y-4">
                {result.transcript.length > 0 ? (
                  result.transcript
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                    .map((x, i) => {
                      const isUser = x.type === "User";
                      return (
                        <div
                          key={i}
                          className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-xl px-4 py-3 text-sm shadow-md transition-all duration-300 ${
                              isUser
                                ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none border border-indigo-500/30"
                                : "bg-zinc-900 text-zinc-200 rounded-tl-none border border-zinc-800"
                            }`}
                          >
                            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1 block">
                              {isUser ? "You" : "AI Interviewer"}
                            </span>
                            <p className="leading-relaxed">{x.content}</p>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-sm text-zinc-500 text-center py-8">
                    No speech logs found in the transcript.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}