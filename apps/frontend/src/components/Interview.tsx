import { useEffect, useRef } from "react"
import { useParams } from "react-router"
import { BACKEND_URL } from "../lib/config"
import { toast } from "sonner"

export function Interview() {
    
    const {interviewId} = useParams();
    const audioRef = useRef<HTMLAudioElement>(null);


    useEffect(() => {
        (async () => {
        // Create a peer connection
            const pc = new RTCPeerConnection();

            // Set up to play remote audio from the model
            audioRef.current = document.createElement("audio");
            audioRef.current.autoplay = true;
            pc.ontrack = (e) => (audioRef.current!.srcObject = e.streams[0]!);

            // Add local audio track for microphone input in the browser
            const ms = await navigator.mediaDevices.getUserMedia({
            audio: true,
            });
            pc.addTrack(ms.getTracks()[0]!);

            // Set up data channel for sending and receiving events
            // const dc = pc.createDataChannel("oai-events");

            // Start the session using the Session Description Protocol (SDP)
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            console.log("HI");
            const sdpResponse = await fetch(`${BACKEND_URL}/api/v1/session`, {
            method: "POST",
            body: offer.sdp,
            headers: {
                "Content-Type": "application/sdp",
            },
            });

             console.log("hello");
             const responseText = await sdpResponse.text();
             if (!sdpResponse.ok) {
                 console.error("Failed to fetch session:", responseText);
                 toast.error(`Session negotiation failed: ${responseText}`);
                 return;
             }
             const answer = {
                 type: "answer" as "answer",
                 sdp: responseText,
             };
             await pc.setRemoteDescription(answer);
        })();

    }, [interviewId])


    return (
        <div>
            <audio autoPlay ref={audioRef}></audio>
            Interview
        </div>
    )
}