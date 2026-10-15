import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { z } from "zod";
const schema=z.object({
  title:z.string().trim().min(3).max(75),
  instruction:z.string().trim().min(12).max(2500),
  category:z.enum(["universal","content","stream","discord","planner","research","investment"]),
  frequency:z.enum(["manual","daily","weekly"]),
});
export async function GET(){
  const auth=await authenticatedUser();
  if(!auth)return NextResponse.json({error:"Autenticação necessária."},{status:401});
  const {data,error}=await auth.db.from("bots").select("*").eq("user_id",auth.user.id).order("created_at",{ascending:false}).limit(100);
  return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({bots:data});
}
export async function POST(req:Request){
  const auth=await authenticatedUser();
  if(!auth)return NextResponse.json({error:"Autenticação necessária."},{status:401});
  const input=schema.safeParse(await req.json().catch(()=>null));
  if(!input.success)return NextResponse.json({error:"Verifica o nome, instruções e opções."},{status:400});
  const {count}=await auth.db.from("bots").select("*",{count:"exact",head:true}).eq("user_id",auth.user.id);
  if((count||0)>=3)return NextResponse.json({error:"Limite gratuito de 3 rascunhos nesta fase beta."},{status:403});
  const {data,error}=await auth.db.from("bots").insert({user_id:auth.user.id,...input.data,status:"draft"}).select().single();
  return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({bot:data},{status:201});
}