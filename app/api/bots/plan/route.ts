import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import OpenAI from "openai";
import { z } from "zod";
const schema=z.object({prompt:z.string().min(15).max(1500)});
export async function POST(req:Request){
  const auth=await authenticatedUser();
  if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
  const input=schema.safeParse(await req.json().catch(()=>null));
  if(!input.success)return NextResponse.json({error:"Descreve melhor o bot."},{status:400});
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:"Motor de IA ainda não configurado. Podes criar manualmente."},{status:503});
  try {
    const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:15000});
    const response=await openai.chat.completions.create({
      model:process.env.OPENAI_MODEL||"gpt-4.1-mini",temperature:0.3,max_tokens:260,
      messages:[
        {role:"system",content:"Cria configurações de bots seguros a partir de pedidos em português. Responde APENAS JSON com title, instruction, category (universal/content/stream/discord/planner/research/investment) e frequency (manual/daily/weekly). Não afirmes que há integrações ligadas ou execução ativa. A instruction deve ser clara, até 1000 caracteres. Não incluir chaves, credenciais nem recomendações financeiras personalizadas."},
        {role:"user",content:input.data.prompt}
      ]
    });
    const raw=response.choices[0]?.message?.content||"";
    const parsed=JSON.parse(raw.replace(/^\\x60\\x60\\x60json\s*/,"").replace(/\\x60\\x60\\x60$/,""));
    const out=z.object({title:z.string().max(75),instruction:z.string().max(2500),category:z.enum(["universal","content","stream","discord","planner","research","investment"]),frequency:z.enum(["manual","daily","weekly"])}).safeParse(parsed);
    if(!out.success)throw new Error("Plano inválido");
    return NextResponse.json({plan:out.data});
  } catch {return NextResponse.json({error:"Não foi possível gerar o plano agora."},{status:502});}
}