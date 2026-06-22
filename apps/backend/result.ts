import axios from "axios";
import {z} from "zod";
import { GoogleGenAI } from "@google/genai";
import { zodToJsonSchema } from "zod-to-json-schema";

const outputSchema = z.object({
    feedback: z.string().describe("Feedback for the user"),
    score: z.number().min(0).max(10).describe("The score for the user's performance and score it out of 10"),
});

const RESULT_PROMPT = `
You are an expert interviewer and evaluator. Your task is to evaluate the performance of the candidate based on the conversation between you and the candidate. You will provide a score out of 10 and detailed feedback on how well the candidate performed, including areas of strength and improvement. Always provide constructive feedback that can help the candidate grow.

Give a score out of 10 and give them any feedback you have about their interview.
Please return only a JSON which looks like this:
{
  "feedback": "string",
  "score": number
}

Do not return any other text other than the JSON mentioned above. The JSON should be parsable and should strictly follow the above format.
{USER_TRANSCRIPT}`;





export async function calculateResult(messages:{type:string, message:string, createdAt:Date}[], geminiKey: string) {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const transcript = messages.map(m => `${m.type}: ${m.message}`).join("\n");
        const prompt = RESULT_PROMPT.replace("{USER_TRANSCRIPT}", transcript);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const result = outputSchema.parse(JSON.parse(response.text!));

        return result;
    }


