import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const a=await authenticatedUser();if(!a)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const {id}=await params;
 const {data:bot}=await a.db.from("bots").select("id").eq("id",id).eq("user_id",a.user.id).maybeSingle();
 if(!bot)return NextResponse.json({error:"Bot inexistente."},{status:404});
 const {data}=await a.db.from("bot_runs").select("input,output,status,created_at").eq("bot_id",id).eq("user_id",a.user.id).order("created_at",{ascending:false}).limit(20);
 return NextResponse.json({runs:data||[]});
}