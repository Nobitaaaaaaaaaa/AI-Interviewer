import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router"
import { BACKEND_URL } from "../lib/config"
import { toast } from "sonner"
import axios from "axios"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { PhoneOff, Loader2, Bot, User, Mic } from "lucide-react"

const DEEPGRAM_API_KEY = "c51709dad5c286df25414ad27c679663d61d5f32";

export function Interview() {
    const { interviewId } = useParams();
    const navigate = useNavigate();
    const audioRef = useRef<HTMLAudioElement>(null);
    const [latestTranscript, setLatestTranscript] = useState<string>("");
    const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "failed">("connecting");

    // Refs for animating volume & waves directly (no react re-render overhead)
    const aiOrbRef = useRef<HTMLDivElement>(null);
    const userOrbRef = useRef<HTMLDivElement>(null);
    const aiWavesRef = useRef<HTMLDivElement>(null);
    const userWavesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let pc: RTCPeerConnection | null = null;
        let ms: MediaStream | null = null;
        let socket: WebSocket | null = null;
        let audioContext: AudioContext | null = null;
        let processor: ScriptProcessorNode | null = null;

        let userAnalyser: AnalyserNode | null = null;
        let aiAnalyser: AnalyserNode | null = null;
        let animationFrameId: number | null = null;

        // Animation frame loop
        const animate = () => {
            // 1. User Volume / Wave visualizer
            if (userAnalyser) {
                const array = new Uint8Array(userAnalyser.frequencyBinCount);
                userAnalyser.getByteFrequencyData(array);
                let sum = 0;
                for (let i = 0; i < array.length; i++) sum += array[i] ?? 0;
                const average = sum / array.length;

                // Scale the central avatar orb based on volume
                if (userOrbRef.current) {
                    const scale = 1 + (average / 128) * 0.4;
                    userOrbRef.current.style.transform = `scale(${scale})`;
                    const shadowIntensity = (average / 128) * 30;
                    userOrbRef.current.style.boxShadow = `0 0 ${20 + shadowIntensity}px rgba(16, 185, 129, ${0.4 + (average / 128) * 0.6})`;
                }

                // Bounce visualizer wave bars
                if (userWavesRef.current) {
                    const bars = userWavesRef.current.children;
                    for (let i = 0; i < bars.length; i++) {
                        const bar = bars[i] as HTMLDivElement;
                        // organic bouncing factor
                        const factor = (i === 0 || i === 4 ? 0.6 : i === 1 || i === 3 ? 1.0 : 1.4) * (average / 128);
                        const height = Math.max(4, factor * 32);
                        bar.style.height = `${height}px`;
                    }
                }
            }

            // 2. AI Volume / Wave visualizer
            if (aiAnalyser) {
                const array = new Uint8Array(aiAnalyser.frequencyBinCount);
                aiAnalyser.getByteFrequencyData(array);
                let sum = 0;
                for (let i = 0; i < array.length; i++) sum += array[i] ?? 0;
                const average = sum / array.length;

                // Scale the central avatar orb based on volume
                if (aiOrbRef.current) {
                    const scale = 1 + (average / 128) * 0.4;
                    aiOrbRef.current.style.transform = `scale(${scale})`;
                    const shadowIntensity = (average / 128) * 30;
                    aiOrbRef.current.style.boxShadow = `0 0 ${20 + shadowIntensity}px rgba(99, 102, 241, ${0.4 + (average / 128) * 0.6})`;
                }

                // Bounce visualizer wave bars
                if (aiWavesRef.current) {
                    const bars = aiWavesRef.current.children;
                    for (let i = 0; i < bars.length; i++) {
                        const bar = bars[i] as HTMLDivElement;
                        const factor = (i === 0 || i === 4 ? 0.6 : i === 1 || i === 3 ? 1.0 : 1.4) * (average / 128);
                        const height = Math.max(4, factor * 32);
                        bar.style.height = `${height}px`;
                    }
                }
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        (async () => {
            try {
                // Initialize audio context
                audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

                // Create peer connection
                pc = new RTCPeerConnection();

                // Set up to play remote audio
                const audioEl = document.createElement("audio");
                audioEl.autoplay = true;
                audioRef.current = audioEl;

                pc.ontrack = (e) => {
                    if (audioRef.current) {
                        audioRef.current.srcObject = e.streams[0]!;
                    }
                    if (audioContext && e.streams[0]) {
                        console.log("Setting up AI audio context analyzer...");
                        try {
                            const aiSource = audioContext.createMediaStreamSource(e.streams[0]);
                            aiAnalyser = audioContext.createAnalyser();
                            aiAnalyser.fftSize = 32;
                            aiSource.connect(aiAnalyser);
                        } catch (err) {
                            console.error("AI Web Audio connection failed:", err);
                        }
                    }
                };

                // Request microphone access
                try {
                    ms = await navigator.mediaDevices.getUserMedia({ audio: true });
                } catch (permErr: any) {
                    console.error("Microphone access denied:", permErr);
                    toast.error("Microphone access denied. Please allow microphone permission and reload.");
                    setConnectionStatus("failed");
                    return;
                }

                // Connect user's microphone to the analyzer
                if (audioContext && ms) {
                    try {
                        const userSource = audioContext.createMediaStreamSource(ms);
                        userAnalyser = audioContext.createAnalyser();
                        userAnalyser.fftSize = 32;
                        userSource.connect(userAnalyser);
                    } catch (err) {
                        console.error("User Web Audio connection failed:", err);
                    }
                }

                // Start Web Audio animation frame loop
                animationFrameId = requestAnimationFrame(animate);

                // Connect to Deepgram via raw WebSocket
                const dgUrl = new URL("wss://api.deepgram.com/v1/listen");
                dgUrl.searchParams.set("model", "nova-3");
                dgUrl.searchParams.set("encoding", "linear16");
                dgUrl.searchParams.set("sample_rate", "16000");
                dgUrl.searchParams.set("channels", "1");

                socket = new WebSocket(dgUrl.toString(), ["token", DEEPGRAM_API_KEY]);

                socket.onopen = () => {
                    console.log("Deepgram WebSocket connected");
                    if (!audioContext || !ms) return;
                    const source = audioContext.createMediaStreamSource(ms);
                    processor = audioContext.createScriptProcessor(4096, 1, 1);

                    source.connect(processor);
                    processor.connect(audioContext.destination);

                    processor.onaudioprocess = (e) => {
                        if (!socket || socket.readyState !== WebSocket.OPEN) return;
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcm = new Int16Array(inputData.length);
                        for (let i = 0; i < inputData.length; i++) {
                            const val = inputData[i] ?? 0;
                            const s = Math.max(-1, Math.min(1, val));
                            pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        }
                        socket.send(pcm.buffer);
                    };
                };

                socket.onmessage = (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        const transcript = data.channel?.alternatives?.[0]?.transcript;
                        if (transcript) {
                            console.log("Transcript:", transcript);
                            setLatestTranscript(transcript);
                            axios.post(`${BACKEND_URL}/api/v1/session/user/response/${interviewId}`, {
                                message: transcript
                            });
                        }
                    } catch {
                        // Ignore non-JSON messages (e.g. metadata)
                    }
                };

                socket.onerror = (e) => {
                    console.error("Deepgram WebSocket error:", e);
                    toast.error("Transcription connection failed.");
                };

                socket.onclose = (e) => {
                    console.log("Deepgram WebSocket closed:", e.code, e.reason);
                };

                pc.addTrack(ms.getTracks()[0]!);

                // Start the session using the Session Description Protocol (SDP)
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                const openAiKey = localStorage.getItem("openai_key") || "";
                const sdpResponse = await fetch(`${BACKEND_URL}/api/v1/session/${interviewId}`, {
                    method: "POST",
                    body: offer.sdp,
                    headers: { 
                        "Content-Type": "application/sdp",
                        "x-openai-key": openAiKey
                    },
                });
                const responseText = await sdpResponse.text();
                if (!sdpResponse.ok) {
                    toast.error(`Session negotiation failed: ${responseText}`);
                    setConnectionStatus("failed");
                    return;
                }
                await pc.setRemoteDescription({ type: "answer", sdp: responseText });
                setConnectionStatus("connected");

            } catch (err) {
                console.error("Interview setup error:", err);
                toast.error("Failed to start interview. Please try again.");
                setConnectionStatus("failed");
            }
        })();

        return () => {
            console.log("Cleaning up interview session...");
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            if (socket) {
                if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                    socket.close();
                }
            }
            if (processor) {
                processor.disconnect();
            }
            if (audioContext) {
                audioContext.close();
            }
            if (ms) {
                ms.getTracks().forEach(track => track.stop());
            }
            if (pc) {
                pc.close();
            }
        };

    }, [interviewId]);

    const handleEndInterview = () => {
        toast.info("Ending session and calculating your feedback...");
        navigate(`/result/${interviewId}`);
    };

    return (
        <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col p-6 overflow-hidden relative">
            {/* Radial glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4 shrink-0">
                <div>
                    <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-indigo-400 bg-clip-text text-transparent">
                        AI Technical Interview Room
                    </h1>
                    <p className="text-xs text-zinc-400">
                        Discussing your developer experience based on your projects
                    </p>
                </div>
                <div className="flex items-center gap-2 mt-2 sm:mt-0 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800">
                    <span className={`h-2 w-2 rounded-full ${
                        connectionStatus === "connected" ? "bg-emerald-500 animate-pulse" :
                        connectionStatus === "connecting" ? "bg-amber-500 animate-pulse" : "bg-red-500"
                    }`} />
                    <span className="text-xs font-semibold capitalize text-zinc-300">
                        {connectionStatus === "connected" ? "Session Active" :
                         connectionStatus === "connecting" ? "Connecting..." : "Disconnected"}
                    </span>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 my-6 min-h-0">
                {/* AI Participant Card */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 relative overflow-hidden h-full">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest absolute top-6 left-6">
                        Interviewer (AI)
                    </span>
                    <div className="relative flex items-center justify-center mb-8">
                        <div className="absolute h-36 w-36 rounded-full bg-indigo-500/5 animate-pulse" />
                        <div 
                            ref={aiOrbRef}
                            className="relative flex h-28 w-28 items-center justify-center rounded-full bg-indigo-650 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all duration-75"
                        >
                            <Bot className="h-14 w-14 text-white" />
                        </div>
                    </div>
                    {/* Live Soundwave Bars */}
                    <div ref={aiWavesRef} className="flex items-center gap-1.5 h-12">
                        <div className="w-2 bg-indigo-500 rounded-full transition-all duration-75 h-1" />
                        <div className="w-2 bg-indigo-400 rounded-full transition-all duration-75 h-1" />
                        <div className="w-2 bg-indigo-300 rounded-full transition-all duration-75 h-1" />
                        <div className="w-2 bg-indigo-400 rounded-full transition-all duration-75 h-1" />
                        <div className="w-2 bg-indigo-500 rounded-full transition-all duration-75 h-1" />
                    </div>
                </div>

                {/* User Participant Card */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 relative overflow-hidden h-full">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest absolute top-6 left-6">
                        Candidate (You)
                    </span>
                    <div className="relative flex items-center justify-center mb-8">
                        <div className="absolute h-36 w-36 rounded-full bg-emerald-500/5 animate-pulse" />
                        <div 
                            ref={userOrbRef}
                            className="relative flex h-28 w-28 items-center justify-center rounded-full bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-75"
                        >
                            <User className="h-14 w-14 text-white" />
                        </div>
                    </div>
                    {/* Live Soundwave Bars */}
                    <div ref={userWavesRef} className="flex items-center gap-1.5 h-12">
                        <div className="w-2 bg-emerald-500 rounded-full transition-all duration-75 h-1" />
                        <div className="w-2 bg-emerald-400 rounded-full transition-all duration-75 h-1" />
                        <div className="w-2 bg-emerald-300 rounded-full transition-all duration-75 h-1" />
                        <div className="w-2 bg-emerald-400 rounded-full transition-all duration-75 h-1" />
                        <div className="w-2 bg-emerald-500 rounded-full transition-all duration-75 h-1" />
                    </div>
                </div>
            </div>

            {/* Footer area */}
            <div className="flex flex-col md:flex-row gap-4 border-t border-zinc-800 pt-4 shrink-0 items-end">
                {/* Live Transcription Box */}
                <div className="flex-1 w-full rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 min-h-[80px] flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1 flex items-center gap-1">
                        <Mic className="h-3 w-3 text-emerald-400 animate-pulse" />
                        Live Transcription Feed
                    </span>
                    {latestTranscript ? (
                        <p className="text-sm text-zinc-200 font-medium italic leading-relaxed">
                            "{latestTranscript}"
                        </p>
                    ) : (
                        <p className="text-sm text-zinc-500 italic">
                            Speak to begin generating live transcription feed...
                        </p>
                    )}
                </div>

                {/* End Interview Button */}
                <Button 
                    onClick={handleEndInterview} 
                    variant="destructive"
                    className="w-full md:w-auto px-8 py-8 flex items-center justify-center gap-2 font-semibold shadow-md bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 transition-all duration-300 shrink-0"
                >
                    <PhoneOff className="h-4 w-4" />
                    End Interview
                </Button>
            </div>

            <audio autoPlay ref={audioRef} className="hidden"></audio>
        </div>
    );
}
