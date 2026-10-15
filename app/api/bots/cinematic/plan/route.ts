import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import OpenAI from "openai";
import {z} from "zod";

const inputSchema=z.object({prompt:z.string().trim().min(6).max(600)});
const planSchema=z.object({
 effect:z.enum(["drone","whip","orbit","dolly","fade"]),
 seconds:z.number().min(1).max(6),
 explanation:z.string().max(400)
});

function fallback(prompt:string){
 const p=prompt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 const effect=
 /whip|rapida|chicote|varrer|passagem lateral/.test(p)?"whip":
 /orbita|orbitar|rodeia|rodar|circular|rotacao/.test(p)?"orbit":
 /dolly|zoom|aproximar|afastar|cinematico/.test(p)?"dolly":
 /dissolv|fade|fundir|suav/.test(p)?"fade":"drone";
 const match=p.match(/(\d+(?:[.,]\d+)?)\s*(?:s|segundos?)(?!\w)/);
 const seconds=match?Math.max(1,Math.min(6,Number(match[1].replace(",",".")))):2.5;
 const descriptions:{[key:string]:string}={
 drone:"Elevação virtual, deslocação suave e aproximação simulados em 2D.",
 whip:"Varredura lateral rápida para trocar de plano.",
 orbit:"Rotação e aproximação suaves, simuladas em 2D.",
 dolly:"Zoom cinematográfico virtual entre planos.",
 fade:"Dissolução suave de uma imagem para outra."
 };
 return {effect,seconds,explanation:descriptions[effect]};
}

export async function POST(req:Request){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão para preparar a transição."},{status:401});
 const input=inputSchema.safeParse(await req.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:"Descreve a transição com pelo menos 6 caracteres."},{status:400});
 const defaultPlan=fallback(input.data.prompt);
 if(!process.env.OPENAI_API_KEY)return NextResponse.json({plan:defaultPlan,source:"rules"});
 try{
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:12000});
  const res=await client.chat.completions.create({
   model:process.env.OPENAI_MODEL||"gpt-4.1-mini",temperature:0.3,
   response_format:{type:"json_object"},max_tokens:220,
   messages:[
    {role:"system",content:"És diretor de transições para 1 ou 2 câmaras num editor de vídeo no navegador. Responde apenas JSON com effect (drone, whip, orbit, dolly, fade), seconds (1 a 6), explanation (português, 1 frase, até 180 caracteres). Usa drone quando pedem voo/elevação estilo drone. Os efeitos são simulações em 2D, nunca afirmes que geraste cenas aéreas reais, vídeo sintético ou profundidade 3D."},
    {role:"user",content:input.data.prompt}
   ]
  });
  const parsed=planSchema.safeParse(JSON.parse(res.choices[0]?.message?.content||"{}"));
  return NextResponse.json({plan:parsed.success?parsed.data:defaultPlan,source:parsed.success?"ai":"rules"});
 }catch{return NextResponse.json({plan:defaultPlan,source:"rules"});}
}
