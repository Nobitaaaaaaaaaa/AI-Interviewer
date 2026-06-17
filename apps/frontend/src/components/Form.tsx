import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {toast} from "sonner"
import axios from "axios"
import { BACKEND_URL } from "../lib/config";

export function Form(){
  const [github , setgithub]= useState("")
  

  async function onSubmit(){
    if(!github){
      toast("Please provide a valid GitHub url")
      return ;
    }

    try {
      toast("Submitting GitHub URL to backend...")
      const response = await axios.post(`${BACKEND_URL}/api/v1/pre-interview`, { github })
      toast("Success! Profile details fetched.")
      console.log("Backend response data:", response.data);
    } catch (error: any) {
      toast.error(`Error: ${error.message || "Failed to connect to backend"}`)
      console.error("Form submission failed:", error);
    }
  }

    return (
    <div className="h-screen w-screen flex justify-center items-center">
      <div>
          <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
            AI Interviewer Kickstart
          </h2>
          <div className="p-4">
            <Input onChange={(e) =>setgithub(e.target.value)} placeholder="GitHub Url" className="p-4"/>
          </div>
          <div className="flex justify-center">
            <Button onClick={onSubmit}>Start Interview</Button>
          </div>
       </div>

    </div>
    
  );
}