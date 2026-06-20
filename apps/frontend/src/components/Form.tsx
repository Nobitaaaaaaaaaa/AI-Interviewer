import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {toast} from "sonner"
import axios from "axios"
import { BACKEND_URL } from "../lib/config";
import { useNavigate } from "react-router";

export function Form(){
  const [github , setgithub]= useState("")
  const [loading , setloading] = useState(false)
  const navigate = useNavigate()
  

  async function onSubmit(){
    if(!github){
      toast("Please provide a valid GitHub url")
      return ;
    }
    setloading(true)

    try {
      toast("Submitting GitHub URL to backend...")
      const response = await axios.post(`${BACKEND_URL}/api/v1/pre-interview`, { github })
      toast("Success! Profile details fetched.")
      
      navigate(`/interview/${response.data.id}`)
    } catch (error: any) {
      toast.error(`Error: ${error.message || "Failed to connect to backend"}`)
      console.error("Form submission failed:", error);
    }
    setloading(false)
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
            <Button disabled={loading} onClick={onSubmit}>
              {loading ? "Submitting..." : "Start Interview"}
            </Button>
          </div>
       </div>

    </div>
    
  );
}