import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import OpenAI from "openai";
import {z} from "zod";
const styles=["drone","orbit","whip","zoom","dissolve","push"] as const;
const schema=z.object({prompt:z.string().trim().min(8).max(600),sources:z.number().int().min(1).max(2)});
const resultSchema=z.object({
 style:z.enum(styles),
 seconds:z.number().min(2).max(12),
 direction:z.enum(["left","right","up","down","center"]),
 description:z.string().max(500)
});
function preset(prompt:string,sources:number){
 const p=prompt.toLowerCase();
 const style:typeof styles[number]=/órbita|orbita|circular|rodar|girar/.test(p)?"orbit":/whip|rápid|rapido|chicote/.test(p)?"whip":/dissolv|fade|suave|fundid/.test(p)?"dissolve":/slide|desliza|empurr|push/.test(p)?"push":/zoom|aproxim|afast/.test(p)?"zoom":"drone";
 const direction=/esquerda/.test(p)?"left":/direita/.test(p)?"right":/cima|subir/.test(p)?"up":/baixo|descer/.test(p)?"down":"center";
 const seconds=Math.min(12,Math.max(2,Number(p.match(/(\d{1,2})\s*(?:s\b|segundo)/)?.[1]||6)));
 return {style,direction,seconds,description:sources===1?"Movimento de câmara digital numa fonte. Não é vídeo de drone nem reconstrução 3D.":"Transição digital entre duas fontes, sem gerar imagens inexistentes."};
}
export async function POST(req:Request){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão para preparar transições."},{status:401});
 const input=schema.safeParse(await req.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:"Descreve a transição (8 a 600 caracteres) e usa uma ou duas câmaras."},{status:400});
 const fallback=preset(input.data.prompt,input.data.sources);
 if(!process.env.OPENAI_API_KEY)return NextResponse.json({plan:fallback,engine:"rules",notice:"A IA externa ainda não está configurada. Preparámos uma transição com regras locais."});
 try{
  const ai=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:12000});
  const response=await ai.chat.completions.create({
   model:process.env.OPENAI_MODEL||"gpt-4.1-mini",
   temperature:0.3,max_tokens:240,response_format:{type:"json_object"},
   messages:[
    {role:"system",content:"És um realizador de transições de vídeo. Responde APENAS JSON com style (drone/orbit/whip/zoom/dissolve/push), seconds (número de 2 a 12), direction (left/right/up/down/center), description (curta, em português europeu). Cria apenas um PLANO de animação 2D/2.5D de vídeo, nunca afirmes gerar drones, deslocamentos físicos ou ambientes 3D. Respeita uma ou duas fontes conforme indicado."},
    {role:"user",content:"Fontes: "+input.data.sources+". Pedido: "+input.data.prompt}
   ]
  });
  const parsed=resultSchema.safeParse(JSON.parse(response.choices[0]?.message?.content||"{}"));
  if(!parsed.success)return NextResponse.json({plan:fallback,engine:"rules",notice:"O planeamento de IA devolveu valores inválidos. Foi usado um estilo local."});
  return NextResponse.json({plan:parsed.data,engine:"ai"});
 }catch{
  return NextResponse.json({plan:fallback,engine:"rules",notice:"O serviço de IA não respondeu. Foi usada uma transição local."});
 }
}
