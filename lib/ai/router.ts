import "server-only";
import OpenAI from "openai";

export type AiProvider="openai"|"anthropic"|"gemini";
export type AiTask="chat"|"code"|"plan"|"summarize";
export type ProviderSelection="auto"|AiProvider;

const PROVIDERS:ReadonlyArray<{id:AiProvider;name:string;model:string;configured:boolean}>= [
 {id:"openai",name:"OpenAI",model:process.env.OPENAI_MODEL||"gpt-4.1-mini",configured:Boolean(process.env.OPENAI_API_KEY)},
 {id:"anthropic",name:"Claude (Anthropic)",model:process.env.ANTHROPIC_MODEL||"claude-sonnet-4-6",configured:Boolean(process.env.ANTHROPIC_API_KEY)},
 {id:"gemini",name:"Gemini (Google)",model:process.env.GEMINI_MODEL||"gemini-2.5-flash",configured:Boolean(process.env.GEMINI_API_KEY)}
];

export function getAiProviders(){
 return PROVIDERS.map(({id,name,model,configured})=>({id,name,model,configured}));
}

/** Deterministic preference order, not a live benchmark of models. */
export function chooseAiProvider(task:AiTask,requested:ProviderSelection="auto"){
 const available=PROVIDERS.filter(x=>x.configured);
 if(requested!=="auto"){
  const chosen=available.find(x=>x.id===requested);
  if(!chosen)throw new Error("PROVIDER_NOT_CONFIGURED");
  return chosen;
 }
 const preferred:AiProvider[]=task==="code"?["anthropic","openai","gemini"]:
  task==="summarize"?["gemini","openai","anthropic"]:
  ["openai","gemini","anthropic"];
 const envPreferred=process.env.LUMI_AI_DEFAULT_PROVIDER;
 if(task==="chat"&&preferred.includes(envPreferred as AiProvider)){
  preferred.splice(preferred.indexOf(envPreferred as AiProvider),1);
  preferred.unshift(envPreferred as AiProvider);
 }
 const found=preferred.map(id=>available.find(p=>p.id===id)).find(Boolean);
 if(!found)throw new Error("NO_AI_PROVIDER_CONFIGURED");
 return found;
}

export async function generateAiText(input:{
 task:AiTask;prompt:string;system:string;provider?:ProviderSelection;json?:boolean;
}):Promise<{text:string;provider:AiProvider;model:string}>{
 const {task,prompt,system,json=false}=input;
 const selected=chooseAiProvider(task,input.provider??"auto");
 if(prompt.length>5000||system.length>4500)throw new Error("PROMPT_TOO_LONG");
 let text="";
 if(selected.id==="openai"){
  const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY!,timeout:18000,maxRetries:0});
  const response=await openai.chat.completions.create({
   model:selected.model,
   messages:[{role:"system",content:system},{role:"user",content:prompt}],
   ...(json?{response_format:{type:"json_object" as const}}:{}),
   max_tokens:850
  });
  text=response.choices[0]?.message?.content||"";
 }else if(selected.id==="anthropic"){
  const response=await fetch("https://api.anthropic.com/v1/messages",{
   method:"POST",signal:AbortSignal.timeout(18000),
   headers:{"content-type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY!,
    "anthropic-version":"2023-06-01"},
   body:JSON.stringify({model:selected.model,max_tokens:850,system,messages:[
    {role:"user",content:json?"Responde apenas com JSON válido.\n"+prompt:prompt}
   ]})
  });
  if(!response.ok)throw new Error("AI_PROVIDER_ERROR");
  const data=await response.json() as {content?:{type?:string;text?:string}[]};
  text=(data.content||[]).filter(c=>c.type==="text").map(c=>c.text||"").join("\n");
 }else{
  const model=encodeURIComponent(selected.model);
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent",{
   method:"POST",signal:AbortSignal.timeout(18000),
   headers:{"content-type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY!},
   body:JSON.stringify({
    systemInstruction:{parts:[{text:system}]},
    contents:[{role:"user",parts:[{text:prompt}]}],
    generationConfig:{maxOutputTokens:850,...(json?{responseMimeType:"application/json"}:{})}
   })
  });
  if(!response.ok)throw new Error("AI_PROVIDER_ERROR");
  const data=await response.json() as {candidates?:{content?:{parts?:{text?:string}[]}}[]};
  text=(data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join("\n");
 }
 if(!text.trim())throw new Error("AI_EMPTY_RESPONSE");
 return {text:text.trim().slice(0,14000),provider:selected.id,model:selected.model};
}

export function parseAiJson(text:string):unknown{
 // Models occasionally wrap JSON in markdown fences.
 const cleaned=text.trim().replace(/^\x60{3}(?:json)?\s*/i,"").replace(/\s*\x60{3}$/,"");
 return JSON.parse(cleaned);
}
