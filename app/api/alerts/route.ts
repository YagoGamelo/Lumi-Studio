import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {nextAlertTime,messagingReady,phonePattern,validateTimezone} from "@/lib/alerts";
import {z} from "zod";

export const dynamic="force-dynamic";
const schema=z.object({
 bot_id:z.string().uuid(),
 channel:z.enum(["inapp","sms","whatsapp"]),
 time_local:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
 timezone:z.string().min(1).max(64),
 recurrence:z.enum(["daily","weekdays","weekly"]),
 weekday:z.number().int().min(0).max(6).nullable().optional(),
 message:z.string().trim().min(5).max(450),
 whatsapp_opt_in:z.boolean().default(false)
});
const unavailable={error:"A área de alertas ainda não está ativada na base de dados. Executa supabase/alerts.sql no Supabase SQL Editor."};
export async function GET(){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const [schedules,phone,inbox]=await Promise.all([
  auth.db.from("bot_alert_schedules").select("id,bot_id,channel,time_local,timezone,recurrence,weekday,message,enabled,next_run_at,last_error").eq("user_id",auth.user.id).order("created_at",{ascending:false}).limit(50),
  auth.db.from("bot_alert_phones").select("phone_e164,verified_at").eq("user_id",auth.user.id).maybeSingle(),
  auth.db.from("bot_alert_inbox").select("id,bot_title,content,channel,delivered_at,provider_status").eq("user_id",auth.user.id).order("delivered_at",{ascending:false}).limit(20)
 ]);
 if(schedules.error||phone.error||inbox.error)return NextResponse.json(unavailable,{status:503});
 const currentPhone=phone.data?.phone_e164||"";
 return NextResponse.json({schedules:schedules.data||[],inbox:inbox.data||[],phone:{masked:currentPhone?"•••• "+currentPhone.slice(-4):"",verified:Boolean(phone.data?.verified_at)},
 channels:{inapp:true,sms:messagingReady("sms"),whatsapp:messagingReady("whatsapp")}},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:Request){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Confirma o bot, a hora, o canal e a mensagem."},{status:400});
 const input=parsed.data;
 if(!validateTimezone(input.timezone))return NextResponse.json({error:"Fuso horário inválido."},{status:400});
 if(input.recurrence==="weekly" && input.weekday==null)return NextResponse.json({error:"Seleciona o dia da semana."},{status:400});
 if(input.channel==="whatsapp"&&!input.whatsapp_opt_in)return NextResponse.json({error:"É necessária autorização explícita para receber mensagens WhatsApp."},{status:400});
 const {data:bot}=await auth.db.from("bots").select("id").eq("user_id",auth.user.id).eq("id",input.bot_id).maybeSingle();
 if(!bot)return NextResponse.json({error:"Este bot não pertence à tua conta."},{status:404});
 const {count,error:counterError}=await auth.db.from("bot_alert_schedules").select("id",{head:true,count:"exact"}).eq("user_id",auth.user.id);
 if(counterError)return NextResponse.json(unavailable,{status:503});
 if((count||0)>=10)return NextResponse.json({error:"Limite beta de 10 alertas agendados por utilizador."},{status:429});
 if(input.channel!=="inapp"){
  if(!messagingReady(input.channel))return NextResponse.json({error:"Os envios por "+(input.channel==="sms"?"SMS":"WhatsApp")+" ainda não estão configurados pelo operador da LUMI."},{status:503});
  const {data:phone,error}=await auth.db.from("bot_alert_phones").select("phone_e164,verified_at").eq("user_id",auth.user.id).maybeSingle();
  if(error||!phone?.verified_at||!phonePattern.test(phone.phone_e164))return NextResponse.json({error:"Antes de ativar este canal, confirma o teu número de telemóvel com um código SMS."},{status:403});
 }
 let nextRun:Date;
 try{nextRun=nextAlertTime(input.timezone,input.time_local,input.recurrence,input.weekday??null);}catch{return NextResponse.json({error:"Não foi possível calcular esta hora. Verifica o fuso e os dias escolhidos."},{status:400});}
 const {data,error}=await auth.db.from("bot_alert_schedules").insert({
  user_id:auth.user.id,bot_id:input.bot_id,channel:input.channel,time_local:input.time_local,
  timezone:input.timezone,recurrence:input.recurrence,weekday:input.recurrence==="weekly"?input.weekday:null,
  message:input.message,whatsapp_opt_in:input.channel==="whatsapp"&&input.whatsapp_opt_in,
  next_run_at:nextRun.toISOString(),enabled:true
 }).select("id,time_local,channel,next_run_at").single();
 if(error)return NextResponse.json({error:"Não foi possível guardar o alerta."},{status:500});
 return NextResponse.json({schedule:data,notice:"Alerta guardado. O envio automático depende de um processador de agendamentos ativo."},{status:201});
}
