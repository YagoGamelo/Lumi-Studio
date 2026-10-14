import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { z } from "zod";
const schema=z.object({active:z.boolean(),hour_utc:z.number().int().min(0).max(23),notify_email:z.boolean()});
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const a=await authenticatedUser();if(!a)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const {id}=await params,body=schema.safeParse(await req.json().catch(()=>null));
 if(!body.success)return NextResponse.json({error:"Configuração inválida"},{status:400});
 const {data:bot}=await a.db.from("bots").select("id,frequency").eq("id",id).eq("user_id",a.user.id).maybeSingle();
 if(!bot)return NextResponse.json({error:"Bot inexistente"},{status:404});
 if(body.data.active&&bot.frequency==="manual")return NextResponse.json({error:"Escolhe frequência diária ou semanal primeiro."},{status:400});
 const date=new Date();date.setUTCHours(body.data.hour_utc,0,0,0);
 if(date.getTime()<=Date.now()+60000)date.setUTCDate(date.getUTCDate()+1);
 const {error}=await adminDb().from("bots").update({status:body.data.active?"active":"paused",schedule_hour_utc:body.data.hour_utc,notify_email:body.data.notify_email,next_run_at:body.data.active?date.toISOString():null}).eq("id",id).eq("user_id",a.user.id);
 if(error)return NextResponse.json({error:error.message},{status:500});
 return NextResponse.json({ok:true,next_run_at:date.toISOString()});
}