import z from "zod"


export const PreInterviewSchema = z.object({
    
    github: z.string()
})