import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {adminDb,checkPhoneVerification,twilioVerifyReady,freeSmsVerifyReady} from "@/lib/alerts";
import {checkFreeSmsVerification} from "@/lib/free-sms-otp";
import {z} from "zod";
export const dynamic="force-dynamic";
const schema=z.object({code:z.string().regex(/^\d{4,10}$/)});
export async function POST(req:Request){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Código de verificação inválido."},{status:400});
 if(!freeSmsVerifyReady()&&!twilioVerifyReady())return NextResponse.json({error:"Verificação ainda não configurada."},{status:503});
 let db;
 try{db=adminDb();}catch{return NextResponse.json({error:"Verificação ainda não configurada."},{status:503});}
 const {data:record}=await db.from("bot_alert_phones").select("phone_e164,verification_requested_at").eq("user_id",auth.user.id).maybeSingle();
 if(!record?.phone_e164||!record.verification_requested_at)return NextResponse.json({error:"Pede primeiro um código SMS."},{status:400});
 if(Date.now()-new Date(record.verification_requested_at).getTime()>10*60000)return NextResponse.json({error:"Código expirado. Pede um novo código."},{status:400});
 try{
  const approved=freeSmsVerifyReady()
   ?await checkFreeSmsVerification(auth.user.id,record.phone_e164,parsed.data.code)
   :(await checkPhoneVerification(record.phone_e164,parsed.data.code)).status==="approved";
  if(!approved)return NextResponse.json({error:"O código está incorreto ou expirou."},{status:400});
  const {error}=await db.from("bot_alert_phones").update({verified_at:new Date().toISOString()}).eq("user_id",auth.user.id).eq("phone_e164",record.phone_e164);
  if(error)throw error;
  return NextResponse.json({ok:true,masked:"•••• "+record.phone_e164.slice(-4)});
 }catch{return NextResponse.json({error:"Não foi possível confirmar o código. Pede outro código, se necessário."},{status:400});}
}
export async function DELETE(){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 let db;
 try{db=adminDb();}catch{return NextResponse.json({error:"Serviço indisponível."},{status:503});}
 const {error}=await db.from("bot_alert_phones").delete().eq("user_id",auth.user.id);
 if(error)return NextResponse.json({error:"Não foi possível desligar o telemóvel."},{status:500});
 await db.from("bot_alert_schedules").update({enabled:false,claim_until:null}).eq("user_id",auth.user.id).in("channel",["sms","whatsapp"]);
 return NextResponse.json({ok:true});
}
