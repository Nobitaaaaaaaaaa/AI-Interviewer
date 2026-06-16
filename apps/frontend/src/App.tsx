import "styles/globals.css"
import { Form  } from "./components/Form";
import { useState } from "react";
import {Interview} from "./components/Interview"
import {Result} from "./components/Result"
import { Toaster } from "sonner";

export function App() { 

  const [page,setPage] = useState<"form"|"interview"|"result">("form");


  return(
    <div>
      <Toaster/>
    {page =="form" && <Form/>}
    {page =="interview" && <Interview/>}
    {page =="result" && <Result/>}
     
    </div>
   
  )

}

export default App;
