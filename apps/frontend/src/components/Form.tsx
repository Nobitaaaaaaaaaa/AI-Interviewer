import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {toast} from "sonner"
import axios from "axios"
import { BACKEND_URL } from "../lib/config";

export function Form(){
  const [github , setgithub]= useState("")
  const [linkedin, setlinkedin] = useState("")

  async function onSubmit(){
    if(!github|| !linkedin){
      toast("Please provide valid git hub and linkedin urls")
      return ;
    }

    await axios.post(`${BACKEND_URL}/api/v1/pre-interview`, { github, linkedin })
 
  }

    return (
    <div className="h-screen w-screen flex justify-center items-center">
      <div>
          <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
            AI Interviewer Kickstart
          </h2>
          <div className="p-4">
            <Input onChange={(e) =>setlinkedin(e.target.value)} placeholder="LinkedIn Url" className="p-4"/>
          </div>
          <div className="p-4">
            <Input onChange={(e) =>setgithub(e.target.value)} placeholder="Git Hub Url" className="p-4"/>
          </div>
          <div className="flex justify-center">
            <Button onClick={onSubmit}>Start Interview</Button>
          </div>
       </div>

    </div>
    
  );
}