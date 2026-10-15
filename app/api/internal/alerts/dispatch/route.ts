import {NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import OpenAI from "openai";
import {adminDb,nextAlertTime,sendAlert,messagingReady,type AlertSchedule} from "@/lib/alerts";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
function authorized(req:Request){
 const expected=process.env.CRON_SECRET;
 if(!expected||expected.length<24)return false;
 const actual=req.headers.get("authorization")||"";
 const candidate="Bearer "+expected;
 return actual.length===candidate.length&&timingSafeEqual(Buffer.from(actual),Buffer.from(candidate));
}
async function information(title:string,instruction:string,message:string){
 // If the task implies fresh/live news, do not fabricate dated facts without search APIs.
 const text=message.slice(0,400);
 if(!process.env.OPENAI_API_KEY)return "LUMI · "+title+"\n"+text+"\n(Resumo/alerta configurado, sem fontes em tempo real ligadas.)";
 try{
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:9000});
  const r=await client.chat.completions.create({
   model:process.env.OPENAI_MODEL||"gpt-4.1-mini",max_tokens:190,temperature:0.2,
   messages:[
    {role:"system",content:"Cria um pequeno resumo em português de Portugal para uma notificação programada. O bot chama-se "+title+". Instruções do criador: "+instruction.slice(0,900)+". Não tens acesso à Internet nem a notícias/valores atuais. Nunca inventes notícias recentes, preços, datas nem acontecimentos em tempo real. Se o assunto exigir dados atuais, informa que faltam fontes ao vivo. Não digas que executaste tarefas ou consultas externas. Máximo 450 caracteres."},
    {role:"user",content:"Mensagem ou assunto que o utilizador quer receber: "+text}
   ]
  });
  return ("LUMI · "+title+"\n"+String(r.choices[0]?.message?.content||text)).slice(0,450);
 }catch{return "LUMI · "+title+"\n"+text+"\n(Não foi possível gerar resumo com IA.)";}
}

export async function POST(req:Request){
 if(!authorized(req))return NextResponse.json({error:"Não autorizado."},{status:401});
 let db;
 try{db=adminDb();}catch{return NextResponse.json({error:"Trabalhador não configurado."},{status:503});}
 const {data:jobs,error}=await db.rpc("claim_due_bot_alerts",{batch_limit:5});
 if(error)return NextResponse.json({error:"Migração supabase/alerts.sql em falta ou erro de base de dados."},{status:503});
 let processed=0,failed=0;
 for(const s of (jobs||[]) as AlertSchedule[]){
  const deliveryKey=s.id+"|"+s.next_run_at;
  let next:string;
  try{next=nextAlertTime(s.timezone,s.time_local,s.recurrence,s.weekday,new Date(Math.max(Date.now(),new Date(s.next_run_at).getTime()+30000))).toISOString();}
  catch{next=new Date(Date.now()+86400000).toISOString();}
  const release=(last_error:string|null)=>db.from("bot_alert_schedules").update({next_run_at:next,claim_until:null,last_run_at:new Date().toISOString(),last_error}).eq("id",s.id);
  try{
   const {data:bot}=await db.from("bots").select("title,instruction").eq("id",s.bot_id).eq("user_id",s.user_id).maybeSingle();
   if(!bot){failed++;await release("Bot eliminado ou indisponível");continue;}
   const content=await information(bot.title,bot.instruction||"",s.message);
   // Idempotency: claim this exact occurrence in the inbox *before* sending to a paid provider.
   // A crashed worker will not send the same occurrence again on retry.
   const {error:inboxError}=await db.from("bot_alert_inbox").insert({
    user_id:s.user_id,schedule_id:s.id,delivery_key:deliveryKey,
    bot_title:bot.title,content,channel:s.channel,provider_status:s.channel==="inapp"?"inapp":"pending"
   });
   if(inboxError){await release("Entrega já processada ou erro ao escrever na caixa de entrada");continue;}
   if(s.channel!=="inapp"){
    if(!messagingReady(s.channel))throw new Error("Fornecedor SMS/WhatsApp não configurado.");
    const {data:phone}=await db.from("bot_alert_phones").select("phone_e164,verified_at").eq("user_id",s.user_id).maybeSingle();
    if(!phone?.verified_at||!phone.phone_e164)throw new Error("Número não verificado. Desativa ou verifica novamente.");
    await sendAlert(s.channel,phone.phone_e164,content,bot.title);
   }
   await db.from("bot_alert_inbox").update({provider_status:s.channel==="inapp"?"inapp":"submitted"}).eq("delivery_key",deliveryKey);
   processed++;await release(null);
  }catch(err){
   const reason=err instanceof Error?err.message.slice(0,120):"Falha no envio";
   failed++;
   await db.from("bot_alert_inbox").update({provider_status:"failed"}).eq("delivery_key",deliveryKey);
   await release(reason);
  }
 }
 return NextResponse.json({ok:true,processed,failed},{headers:{"Cache-Control":"no-store"}});
}
