import "server-only";
import {createClient} from "@supabase/supabase-js";

export type AlertChannel="inapp"|"sms"|"whatsapp";
export type AlertFrequency="daily"|"weekdays"|"weekly";
export type AlertSchedule={
 id:string;user_id:string;bot_id:string;channel:AlertChannel;time_local:string;timezone:string;
 recurrence:AlertFrequency;weekday:number|null;message:string;whatsapp_opt_in:boolean;
 next_run_at:string;enabled:boolean;claim_until:string|null;
};

export function adminDb(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error("O projeto ainda não configurou a chave privada do servidor Supabase.");
 return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
export const phonePattern=/^\+[1-9]\d{7,14}$/;
export function messagingReady(channel:AlertChannel){
 if(channel==="inapp")return true;
 if(!process.env.TWILIO_ACCOUNT_SID||!process.env.TWILIO_AUTH_TOKEN||!process.env.TWILIO_FROM_NUMBER)return false;
 if(channel==="whatsapp")return Boolean(process.env.TWILIO_WHATSAPP_FROM&&process.env.TWILIO_WHATSAPP_CONTENT_SID);
 return true;
}
export function twilioVerifyReady(){
 return Boolean(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_VERIFY_SERVICE_SID);
}
async function twilioPost(url:string,fields:Record<string,string>){
 const sid=process.env.TWILIO_ACCOUNT_SID;
 const token=process.env.TWILIO_AUTH_TOKEN;
 if(!sid||!token)throw new Error("Twilio ainda não está configurado.");
 const auth=Buffer.from(sid+":"+token).toString("base64");
 const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Authorization:"Basic "+auth},body:new URLSearchParams(fields),cache:"no-store",signal:AbortSignal.timeout(12000)});
 const payload=await response.json().catch(()=>({})) as {status?:string;sid?:string;message?:string};
 if(!response.ok)throw new Error("Twilio HTTP "+response.status+" "+String(payload.message||"").slice(0,100));
 return payload;
}
export function verifyEndpoint(path:"Verifications"|"VerificationCheck"){
 const service=process.env.TWILIO_VERIFY_SERVICE_SID;
 if(!service)throw new Error("Twilio Verify Service não configurado.");
 return "https://verify.twilio.com/v2/Services/"+encodeURIComponent(service)+"/"+path;
}
export async function requestPhoneVerification(phone:string){
 return twilioPost(verifyEndpoint("Verifications"),{To:phone,Channel:"sms"});
}
export async function checkPhoneVerification(phone:string,code:string){
 return twilioPost(verifyEndpoint("VerificationCheck"),{To:phone,Code:code});
}
export async function sendAlert(channel:"sms"|"whatsapp",phone:string,content:string,botTitle:string){
 if(!messagingReady(channel))throw new Error("Canal de mensagens não configurado.");
 const sid=process.env.TWILIO_ACCOUNT_SID!;
 const fields:Record<string,string>={To:channel==="whatsapp"?"whatsapp:"+phone:phone};
 if(channel==="sms"){
  fields.From=process.env.TWILIO_FROM_NUMBER!;
  fields.Body=content.slice(0,450);
 }else{
  fields.From=process.env.TWILIO_WHATSAPP_FROM!;
  fields.ContentSid=process.env.TWILIO_WHATSAPP_CONTENT_SID!;
  // A approved WhatsApp template informs recipients to open the LUMI inbox.
  fields.ContentVariables=JSON.stringify({"1":botTitle.slice(0,50)});
 }
 return twilioPost("https://api.twilio.com/2010-04-01/Accounts/"+encodeURIComponent(sid)+"/Messages.json",fields);
}

type LocalParts={year:number;month:number;day:number;hour:number;minute:number};
function partsAt(timezone:string,date:Date):LocalParts{
 const formatter=new Intl.DateTimeFormat("en-GB",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
 const entries=formatter.formatToParts(date);
 const obj=Object.fromEntries(entries.filter(x=>x.type!=="literal").map(x=>[x.type,Number(x.value)]));
 return {year:obj.year,month:obj.month,day:obj.day,hour:obj.hour,minute:obj.minute};
}
export function validateTimezone(timezone:string){
 if(timezone.length>64)return false;
 try{new Intl.DateTimeFormat("en-GB",{timeZone:timezone}).format();return true;}catch{return false;}
}
export function nextAlertTime(timezone:string,timeLocal:string,recurrence:AlertFrequency,weekday:number|null,after=new Date()){
 if(!validateTimezone(timezone)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(timeLocal))throw new Error("Fuso horário ou hora inválidos.");
 const [hour,minute]=timeLocal.split(":").map(Number);
 const current=partsAt(timezone,after);
 const start=Date.UTC(current.year,current.month-1,current.day);
 for(let dayOffset=0;dayOffset<9;dayOffset++){
  const dayDate=new Date(start+dayOffset*86400000);
  const day=dayDate.getUTCDay();
  if(recurrence==="weekdays"&&(day===0||day===6))continue;
  if(recurrence==="weekly"&&day!==weekday)continue;
  const localTarget=Date.UTC(dayDate.getUTCFullYear(),dayDate.getUTCMonth(),dayDate.getUTCDate(),hour,minute);
  let utcGuess=localTarget;
  for(let n=0;n<4;n++){
   const p=partsAt(timezone,new Date(utcGuess));
   const representation=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);
   const delta=localTarget-representation;
   if(delta===0)break;
   utcGuess+=delta;
  }
  const actual=partsAt(timezone,new Date(utcGuess));
  if(actual.year!==dayDate.getUTCFullYear()||actual.month!==dayDate.getUTCMonth()+1||actual.day!==dayDate.getUTCDate()||actual.hour!==hour||actual.minute!==minute)continue;
  if(utcGuess>after.getTime()+15000)return new Date(utcGuess);
 }
 throw new Error("Não foi possível calcular a próxima execução para esta hora.");
}
