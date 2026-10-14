import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { executeBot } from "@/lib/engine";
import { z } from "zod";
const schema=z.object({bot_id:z.string().uuid(),message:z.string().trim().min(2).max(1800)});
export async function POST(req:Request){
 const a=await authenticatedUser();if(!a)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const input=schema.safeParse(await req.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:"Pedido inválido."},{status:400});
 const {data:bot}=await a.db.from("bots").select("*").eq("id",input.data.bot_id).eq("user_id",a.user.id).maybeSingle();
 if(!bot)return NextResponse.json({error:"Bot inexistente."},{status:404});
 const today=new Date();today.setUTCHours(0,0,0,0);
 const {count}=await a.db.from("bot_runs").select("*",{count:"exact",head:true}).eq("user_id",a.user.id).gte("created_at",today.toISOString());
 if((count||0)>=10)return NextResponse.json({error:"Limite beta de 10 execuções por dia."},{status:429});
 try{return NextResponse.json(await executeBot(bot,input.data.message));}
 catch(err){return NextResponse.json({error:err instanceof Error?err.message:"Erro ao executar o bot"},{status:503});}
}