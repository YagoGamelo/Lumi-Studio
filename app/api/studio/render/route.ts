import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { z } from "zod";
const schema=z.object({project_id:z.string().uuid(),provider_avatar_id:z.string().min(2).max(160)});
export async function POST(req:Request){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Projeto/avatar inválido."},{status:400});
 if(!process.env.HEYGEN_API_KEY||!process.env.HEYGEN_VOICE_ID)return NextResponse.json({error:"A renderização com avatar requer a API e voz HeyGen configuradas no servidor."},{status:503});
 const {data:project}=await auth.db.from("content_projects").select("id,script,status").eq("id",parsed.data.project_id).eq("user_id",auth.user.id).maybeSingle();
 if(!project||project.status!=="script_ready")return NextResponse.json({error:"Gera primeiro um guião."},{status:400});
 const {count}=await auth.db.from("content_projects").select("*",{count:"exact",head:true}).eq("user_id",auth.user.id).in("status",["render_queued","rendering"]);
 if((count||0)>0)return NextResponse.json({error:"Aguarda a renderização em curso."},{status:429});
 const text=String(project.script||"").slice(0,700);
 const response=await fetch("https://api.heygen.com/v2/video/generate",{
   method:"POST",
   headers:{"x-api-key":process.env.HEYGEN_API_KEY,"Content-Type":"application/json"},
   body:JSON.stringify({video_inputs:[{character:{type:"avatar",avatar_id:parsed.data.provider_avatar_id,avatar_style:"normal"},
    voice:{type:"text",input_text:text,voice_id:process.env.HEYGEN_VOICE_ID}}],dimension:{width:1080,height:1920}})
 });
 const body=await response.json().catch(()=>({}));
 const id=body?.data?.video_id as string|undefined;
 if(!response.ok||!id)return NextResponse.json({error:"Renderização recusada pelo fornecedor. Confirma permissões, créditos e avatar."},{status:502});
 await adminDb().from("content_projects").update({status:"rendering",external_job_id:id,avatar_provider_id:parsed.data.provider_avatar_id}).eq("id",project.id).eq("user_id",auth.user.id);
 return NextResponse.json({job_id:id,status:"rendering"});
}