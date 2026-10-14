import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { z } from "zod";
import OpenAI from "openai";
const schema=z.object({name:z.string().min(3).max(80),topic:z.string().min(5).max(600),style:z.enum(["informativo","humor","gaming","react","educativo"]),source_url:z.string().url().max(500).optional()});
export async function GET(){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão"},{status:401});
 const {data}=await auth.db.from("content_projects").select("id,name,topic,style,script,status,output_url,created_at").eq("user_id",auth.user.id).order("created_at",{ascending:false}).limit(50);
 return NextResponse.json({projects:data||[]});
}
export async function POST(req:Request){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const input=schema.safeParse(await req.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:"Dados inválidos."},{status:400});
 if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:"É necessária OPENAI_API_KEY no servidor."},{status:503});
 const {count}=await auth.db.from("content_projects").select("*",{count:"exact",head:true}).eq("user_id",auth.user.id);
 if((count||0)>=20)return NextResponse.json({error:"Limite beta de projetos atingido."},{status:403});
 try{
 const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:25000});
 const response=await openai.responses.create({model:process.env.OPENAI_MODEL||"gpt-4.1-mini",max_output_tokens:950,
 instructions:"Escreve um guião original em português europeu para vídeo curto de 30-60 segundos. Estrutura: GANCHO, NARRAÇÃO, IDEIAS VISUAIS, LEGENDAS e FONTES se aplicável. Não inventes factos atuais: se não tiveres prova evita números ou explica que é necessário verificar. Reacts devem acrescentar comentário próprio, sem copiar vídeos. Não afirmes que analisaste um URL sem consultar o conteúdo.",
 input:"Projeto: "+input.data.name+"\nTema: "+input.data.topic+"\nEstilo: "+input.data.style+(input.data.source_url?"\nLink de referência fornecido (não acedido automaticamente): "+input.data.source_url:"")
 });
 const {data,error}=await adminDb().from("content_projects").insert({user_id:auth.user.id,...input.data,script:response.output_text,status:"script_ready"}).select("id,name,topic,script,status").single();
 if(error)throw error;
 return NextResponse.json({project:data},{status:201});
 }catch(e){console.error("Studio",e instanceof Error?e.message:e);return NextResponse.json({error:"Não foi possível criar guião."},{status:502});}
}
