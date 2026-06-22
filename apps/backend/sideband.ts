
import WebSocket from "ws";
import {prisma} from "./db";  


export async function initSideband(callId: string, interviewId: string, openAiKey: string) {

    const url = "wss://api.openai.com/v1/realtime?call_id="+callId;
    const ws = new WebSocket(url, {
        headers: {
            Authorization: `Bearer ${openAiKey}`,

        },
    });

    const interview = await prisma.interview.findFirst({
        where:{
            id:interviewId

        }
    })

    ws.on("open", function open() {
        console.log("Connected to server:)");

        ws.send(JSON.stringify({
            type: "session.update",
            session: {
                type:"realtime",
                instructions: `You are an AI interviewer. Conduct an interview with the user. Ask questions, provide feedback, and evaluate their answers. Be professional and encouraging. Please use english only during the interview. ${interview?.githubMetadata}`,

            },
        }));       

    });

    ws.on("message", async function incoming(message) {
        try {
            const parsedMessage = JSON.parse(message.toString());
            
            if (parsedMessage.type === "response.done") {
                const output = parsedMessage.response?.output;
                if (!output) return;
                
                let assistantTranscript = "";
                for (const item of output) {
                    if (item.content) {
                        for (const contentBlock of item.content) {
                            if (contentBlock.transcript) {
                                assistantTranscript += contentBlock.transcript + " ";
                            } else if (contentBlock.text) {
                                assistantTranscript += contentBlock.text + " ";
                            }
                        }
                    }
                }
                
                const finalMsg = assistantTranscript.trim();
                if (finalMsg) {
                    console.log(`[sideband] Saving AI message to DB: "${finalMsg}"`);
                    await prisma.message.create({
                        data: {
                            interviewId,
                            type: "AI",
                            message: finalMsg
                        }
                    });
                }
            }
        } catch (err: any) {
            console.error("[sideband] Error parsing/handling message:", err.message || err);
        }
    });

}