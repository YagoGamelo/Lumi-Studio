import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {adminDb,phonePattern,requestPhoneVerification,twilioVerifyReady,freeSmsVerifyReady} from "@/lib/alerts";
import {startFreeSmsVerification} from "@/lib/free-sms-otp";
import {z} from "zod";
export const dynamic="force-dynamic";
const schema=z.object({phone:z.string().regex(/^\+[1-9]\d{7,14}$/),consent:z.literal(true)});

export async function POST(req:Request){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Coloca o teu próprio número internacional (+351...) e confirma a autorização."},{status:400});
 if(!freeSmsVerifyReady()&&!twilioVerifyReady())return NextResponse.json({error:"Liga o TextBee gratuito com o teu Android, ou configura um fornecedor de SMS."},{status:503});
 const {phone}=parsed.data;
 if(!phonePattern.test(phone))return NextResponse.json({error:"Número inválido."},{status:400});
 let db;
 try{db=adminDb();}catch{return NextResponse.json({error:"Serviço de verificação não configurado."},{status:503});}
 const {data:record,error:lookupError}=await db.from("bot_alert_phones").select("phone_e164,verified_at,verification_requested_at,attempts_day,attempts_today").eq("user_id",auth.user.id).maybeSingle();
 if(lookupError)return NextResponse.json({error:"Ativa a migração supabase/alerts.sql antes de verificar números."},{status:503});
 const now=new Date(),day=now.toISOString().slice(0,10);
 const attempts=record?.attempts_day===day?record.attempts_today||0:0;
 if(attempts>=3)return NextResponse.json({error:"Máximo de 3 códigos por dia. Tenta amanhã."},{status:429});
 if(record?.verification_requested_at&&now.getTime()-new Date(record.verification_requested_at).getTime()<60000)return NextResponse.json({error:"Aguarda pelo menos um minuto antes de pedir outro código."},{status:429});
 try{
  if(freeSmsVerifyReady())await startFreeSmsVerification(auth.user.id,phone);
  else await requestPhoneVerification(phone);
  const {error}=await db.from("bot_alert_phones").upsert({
   user_id:auth.user.id,phone_e164:phone,
   verified_at:record?.phone_e164===phone?record?.verified_at:null,
   verification_requested_at:now.toISOString(),attempts_day:day,attempts_today:attempts+1
  },{onConflict:"user_id"});
  if(error)throw error;
  return NextResponse.json({ok:true,masked:"•••• "+phone.slice(-4),message:"Código enviado por SMS. Introduz o código para verificar o número."});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Não foi possível enviar o SMS pelo Android."},{status:502});}
}
