import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
export async function GET(req:Request){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const id=new URL(req.url).searchParams.get("id");
 if(!id||!/^[-0-9a-f]{36}$/i.test(id))return NextResponse.json({error:"Projeto inválido"},{status:400});
 const {data:p}=await auth.db.from("content_projects").select("id,status,external_job_id,output_url").eq("id",id).eq("user_id",auth.user.id).maybeSingle();
 if(!p)return NextResponse.json({error:"Projeto não encontrado"},{status:404});
 if(p.status!=="rendering"||!p.external_job_id)return NextResponse.json({project:p});
 const res=await fetch("https://api.heygen.com/v1/video_status.get?video_id="+encodeURIComponent(p.external_job_id),{headers:{"x-api-key":process.env.HEYGEN_API_KEY||""},cache:"no-store"});
 const data=await res.json().catch(()=>({}));
 if(res.ok && data?.data?.status==="completed"){
   await adminDb().from("content_projects").update({status:"rendered",output_url:data.data.video_url}).eq("id",id);
   return NextResponse.json({project:{...p,status:"rendered",output_url:data.data.video_url}});
 }
 if(res.ok && data?.data?.status==="failed"){
   await adminDb().from("content_projects").update({status:"failed",error:"Falha no fornecedor."}).eq("id",id);
   return NextResponse.json({project:{...p,status:"failed"}});
 }
 return NextResponse.json({project:p});
}