import {NextResponse} from "next/server";
import {createHmac,timingSafeEqual} from "node:crypto";
import {supportDb,answerBusiness,hashSecret} from "@/lib/support";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
type MetaMessage={id?:string;from?:string;timestamp?:string;type?:string;text?:{body?:string}};
type MetaEvent={object?:string;entry?:Array<{changes?:Array<{value?:{metadata?:{phone_number_id?:string};messages?:MetaMessage[]}}>}>;
};
const plain=(value:string,status=200)=>new Response(value,{status,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
function config(){
 const phone=process.env.META_WA_PHONE_NUMBER_ID||"";
 const owner=process.env.META_WA_OWNER_ID||"";
 const apiToken=process.env.META_WA_ACCESS_TOKEN||"";
 const appSecret=process.env.META_WA_APP_SECRET||"";
 const verifyToken=process.env.META_WA_VERIFY_TOKEN||"";
 const graphVersion=process.env.META_WA_GRAPH_VERSION||"v25.0";
 const safeVersion=/^v\d{2,3}\.\d$/.test(graphVersion);
 const enabled=process.env.META_WA_FREE_REPLIES_ENABLED==="true";
 const monthlyBudget=Math.min(1000,Math.max(1,Number(process.env.META_WA_FREE_REPLIES_PER_MONTH||"100")));
 if(!enabled||!phone||!owner||!apiToken||!appSecret||!verifyToken||!safeVersion)return null;
 if(!/^\d{6,25}$/.test(phone)||!/^[0-9a-f-]{36}$/i.test(owner)||!Number.isInteger(monthlyBudget))return null;
 return {phone,owner,apiToken,appSecret,verifyToken,graphVersion,monthlyBudget};
}
export async function GET(req:Request){
 const c=config();if(!c)return plain("Canal Meta desativado.",503);
 const u=new URL(req.url);
 const correct=u.searchParams.get("hub.mode")==="subscribe"&&u.searchParams.get("hub.verify_token")===c.verifyToken;
 const challenge=u.searchParams.get("hub.challenge");
 return correct&&challenge&&/^\d{1,100}$/.test(challenge)?plain(challenge):plain("Verificação recusada.",403);
}
function authenticated(body:string,signature:string|null,secret:string){
 if(!signature||!/^sha256=[0-9a-f]{64}$/i.test(signature))return false;
 const actual=createHmac("sha256",secret).update(body).digest("hex");
 return timingSafeEqual(Buffer.from(actual,"hex"),Buffer.from(signature.slice(7),"hex"));
}
async function answerOne(c:NonNullable<ReturnType<typeof config>>,m:MetaMessage){
 if(m.type!=="text"||!m.id||m.id.length>150||!m.from||!/^\d{8,15}$/.test(m.from))return;
 const question=String(m.text?.body||"").trim().slice(0,1000);
 if(!question)return;
 // Meta delivers customer-initiated messages, so this is a reply inside that user's 24 h window.
 const db=supportDb();
 const {data:profile}=await db.from("support_profiles").select("user_id,bot_id,business_name,knowledge,enabled,auto_reply").eq("user_id",c.owner).eq("enabled",true).maybeSingle();
 if(!profile)return;
 const {error:duplicate}=await db.from("support_meta_inbound_ids").insert({id:m.id,user_id:c.owner});
 if(duplicate)return; // Duplicate webhook or migration missing. Never send twice on a retry.
 const senderHash=hashSecret("meta-whatsapp:"+m.from+"|"+c.owner);
 const {data:previous}=await db.from("support_conversations")
  .select("id,status").eq("user_id",c.owner).eq("channel","whatsapp")
  .eq("customer_reference_hash",senderHash).order("created_at",{ascending:false}).limit(1).maybeSingle();
 let conversationId:string|null=previous?.status!=="closed"?(previous?.id||null):null;
 if(!conversationId){
  const {data:created}=await db.from("support_conversations").insert({
   user_id:c.owner,secret_hash:hashSecret(m.id),
   channel:"whatsapp",customer_name:"WhatsApp "+m.from.slice(-4),
   customer_reference_hash:senderHash,customer_last4:m.from.slice(-4),status:"open"
  }).select("id").single();
  conversationId=created?.id||null;
 }
 if(!conversationId)return;
 await db.from("support_messages").insert({user_id:c.owner,conversation_id:conversationId,role:"customer",body:question});
 if(!profile.auto_reply){
  await db.from("support_conversations").update({status:"needs_human",updated_at:new Date().toISOString()}).eq("id",conversationId);
  return;
 }
 const {data:bot}=profile.bot_id?await db.from("bots").select("instruction").eq("id",profile.bot_id).eq("user_id",c.owner).maybeSingle():{data:null};
 const reply=await answerBusiness({business_name:profile.business_name,knowledge:profile.knowledge,bot_instruction:bot?.instruction||"",question});
 const utcMonth=new Date().toISOString().slice(0,7);
 const {data:approved,error:quotaError}=await db.rpc("reserve_meta_free_reply",{
  p_phone_number_id:c.phone,p_month_utc:utcMonth,p_limit:c.monthlyBudget
 });
 if(quotaError||!approved){
  await db.from("support_conversations").update({status:"needs_human",updated_at:new Date().toISOString()}).eq("id",conversationId);
  return; // HARD STOP: No Meta API call after local budget is reached.
 }
 const payload={messaging_product:"whatsapp",recipient_type:"individual",to:m.from,
  type:"text",text:{preview_url:false,body:reply.answer.slice(0,650)}};
 try{
  const res=await fetch("https://graph.facebook.com/"+c.graphVersion+"/"+c.phone+"/messages",{
   method:"POST",headers:{Authorization:"Bearer "+c.apiToken,"Content-Type":"application/json"},
   body:JSON.stringify(payload),signal:AbortSignal.timeout(11000),cache:"no-store"
  });
  if(!res.ok)throw new Error("Meta recusou a mensagem");
  await db.from("support_messages").insert({user_id:c.owner,conversation_id:conversationId,role:"bot",body:reply.answer.slice(0,650)});
  await db.from("support_conversations").update({status:reply.needsHuman?"needs_human":"open",updated_at:new Date().toISOString()}).eq("id",conversationId);
 }catch{
  await db.from("support_conversations").update({status:"needs_human",updated_at:new Date().toISOString()}).eq("id",conversationId);
 }
}
export async function POST(req:Request){
 const c=config();if(!c)return plain("Canal Meta desativado.",503);
 const body=await req.text();
 if(Buffer.byteLength(body)>120000)return plain("Payload demasiado grande.",413);
 if(!authenticated(body,req.headers.get("x-hub-signature-256"),c.appSecret))return plain("Assinatura inválida.",403);
 let event:MetaEvent;
 try{event=JSON.parse(body) as MetaEvent;}catch{return plain("JSON inválido.",400);}
 if(event.object!=="whatsapp_business_account")return plain("OK");
 const incoming:MetaMessage[]=[];
 for(const entry of (event.entry||[])){
  for(const change of (entry.changes||[])){
   if(change.value?.metadata?.phone_number_id!==c.phone)continue;
   for(const msg of (change.value.messages||[])){
    if(msg.type==="text")incoming.push(msg);
   }
  }
 }
 await Promise.all(incoming.slice(0,4).map(async m=>{try{await answerOne(c,m);}catch{/* signed webhooks may retry; never leak data */}}));
 return plain("OK");
}
