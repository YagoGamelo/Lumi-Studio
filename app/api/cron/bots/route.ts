import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase/admin";
import { executeBot } from "@/lib/engine";
export const maxDuration=60;
export async function GET(req:NextRequest){
 if(!process.env.CRON_SECRET||req.headers.get("authorization")!=="Bearer "+process.env.CRON_SECRET)return NextResponse.json({error:"Não autorizado"},{status:401});
 const db=adminDb();
 const {data,error}=await db.rpc("claim_due_bot_jobs",{batch_size:3});
 if(error)return NextResponse.json({error:"Fila indisponível"},{status:500});
 const results=[];
 for(const bot of data||[]){
   try{
     const output=await executeBot(bot,"Executa agora a tarefa programada segundo as tuas instruções. A data UTC é "+new Date().toISOString()+". Fornece um resumo útil com fontes se usares notícias.");
     if(bot.notify_email&&process.env.RESEND_API_KEY&&process.env.RESEND_FROM_EMAIL){
       const {data:user}=await db.auth.admin.getUserById(bot.user_id);
       if(user?.user?.email){
         await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL,to:user.user.email,subject:"LUMI · "+bot.title,text:output.output.slice(0,7000)})});
       }
     }
     results.push({id:bot.id,status:"done"});
   }catch(err){
     await db.from("bot_runs").insert({bot_id:bot.id,user_id:bot.user_id,input:"[programado]",status:"failed",output:err instanceof Error?err.message:"Falhou"});
     results.push({id:bot.id,status:"failed"});
   }
 }
 return NextResponse.json({processed:results.length,results});
}