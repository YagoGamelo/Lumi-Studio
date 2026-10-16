import {createHmac,timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {supportDb,answerBusiness,hashSecret} from "@/lib/support";
import {textBeeSend} from "@/lib/alerts";
import {workflowReply} from "@/lib/channel-workflows";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=60;
type SMSWebhook={
 smsId?:string;webhookEvent?:string;sender?:string;message?:string;idempotencyKey?:string;deviceId?:string;
};
const plain=(msg:string,status=200)=>new NextResponse(msg,{status,headers:{"Cache-Control":"no-store"}});
function settings(){
 const secret=process.env.TEXTBEE_WEBHOOK_SECRET||"";
 const owner=process.env.TEXTBEE_OWNER_ID||"";
 const enabled=process.env.TEXTBEE_INBOUND_ENABLED==="true";
 return enabled&&secret.length>=20&&/^[0-9a-f-]{36}$/i.test(owner)&&process.env.TEXTBEE_API_KEY
  ?{secret,owner}:null;
}
function sigOK(raw:string,sig:string|null,secret:string){
 if(!sig||!/^[a-f0-9]{64}$/i.test(sig))return false;
 const expected=createHmac("sha256",secret).update(raw).digest("hex");
 return timingSafeEqual(Buffer.from(expected,"hex"),Buffer.from(sig,"hex"));
}
function outgoingSms(text:string){
 const match=text.match(/https:\/\/[a-z0-9.-]+\/api\/support\/artifacts\?token=[a-f0-9]{64}/i);
 if(match)return "LUMI: abre o teu rascunho privado: "+match[0];
 return text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7e]/g," ").slice(0,148);
}
export async function POST(req:Request){
 const s=settings();if(!s)return plain("SMS desativado.",503);
 const raw=await req.text();
 if(raw.length>12000)return plain("Payload inválido.",413);
 if(!sigOK(raw,req.headers.get("x-signature"),s.secret))return plain("Assinatura inválida.",403);
 let incoming:SMSWebhook;
 try{incoming=JSON.parse(raw) as SMSWebhook;}catch{return plain("JSON inválido.",400);}
 if(incoming.webhookEvent!=="MESSAGE_RECEIVED")return plain("OK");
 if(!incoming.smsId||!/^.{5,150}$/.test(incoming.smsId)||!incoming.sender||
  !/^\+[1-9]\d{7,14}$/.test(incoming.sender)||!incoming.message?.trim())return plain("OK");
 const text=incoming.message.trim().slice(0,700);
 const db=supportDb();
 const {data:profile}=await db.from("support_profiles")
  .select("user_id,bot_id,business_name,knowledge,auto_reply,enabled")
  .eq("user_id",s.owner).eq("enabled",true).maybeSingle();
 if(!profile)return plain("OK");
 const {error:duplicate}=await db.from("support_textbee_inbound_ids")
  .insert({id:incoming.smsId,user_id:s.owner});
 if(duplicate)return plain("OK"); // signed retry / migration not ready
 const senderHash=hashSecret("textbee-sms:"+incoming.sender+"|"+s.owner);
 const {data:previous}=await db.from("support_conversations")
  .select("id,status").eq("user_id",s.owner).eq("channel","sms")
  .eq("customer_reference_hash",senderHash).order("created_at",{ascending:false}).limit(1).maybeSingle();
 let conversationId:string|null=previous?.status!=="closed"?previous?.id||null:null;
 if(!conversationId){
  const {data:created}=await db.from("support_conversations").insert({
   user_id:s.owner,secret_hash:hashSecret(incoming.smsId+":sms"),
   channel:"sms",customer_name:"SMS "+incoming.sender.slice(-4),
   customer_reference_hash:senderHash,customer_last4:incoming.sender.slice(-4),status:"open"
  }).select("id").single();
  conversationId=created?.id||null;
 }
 if(!conversationId)return plain("OK");
 await db.from("support_messages").insert({user_id:s.owner,conversation_id:conversationId,role:"customer",body:text});
 if(!profile.auto_reply){
  await db.from("support_conversations").update({status:"needs_human"}).eq("id",conversationId);
  return plain("OK");
 }
 const {data:reserved,error}=await db.rpc("reserve_support_sms_reply",{p_day_cap:5,p_month_cap:30});
 if(error||!reserved){
  await db.from("support_conversations").update({status:"needs_human"}).eq("id",conversationId);
  return plain("OK"); // Never send after cap reached.
 }
 const {data:bot}=profile.bot_id?await db.from("bots").select("instruction")
  .eq("id",profile.bot_id).eq("user_id",s.owner).maybeSingle():{data:null};
 let replyText="";
 try{
  replyText=process.env.LUMI_AGENT_CHANNELS_ENABLED==="true"
   ?await workflowReply({ownerId:s.owner,channel:"sms",senderHash,text,
     botInstruction:bot?.instruction||"",businessName:profile.business_name,knowledge:profile.knowledge},async()=>{
      const r=await answerBusiness({business_name:profile.business_name,
        knowledge:profile.knowledge,bot_instruction:bot?.instruction||"",question:text});
      return r.answer;
     })
   :(await answerBusiness({business_name:profile.business_name,
      knowledge:profile.knowledge,bot_instruction:bot?.instruction||"",question:text})).answer;
 }catch{
  await db.from("support_conversations").update({status:"needs_human"}).eq("id",conversationId);
  return plain("OK");
 }
 try{
  const message=outgoingSms(replyText);
  await textBeeSend(incoming.sender,message);
  await db.from("support_messages").insert({user_id:s.owner,conversation_id:conversationId,role:"bot",body:message});
 }catch{
  await db.from("support_conversations").update({status:"needs_human"}).eq("id",conversationId);
 }
 return plain("OK");
}
