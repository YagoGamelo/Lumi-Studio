import {NextResponse} from "next/server";
import {supportDb,twilioVerified,xml,xmlResponse,answerBusiness,masked,hashSecret,publicSecret} from "@/lib/support";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const xmlEmpty=()=>xmlResponse("");
export async function POST(req:Request){
 const base=process.env.TWILIO_SUPPORT_BASE_URL;
 const owner=process.env.TWILIO_SUPPORT_OWNER_ID;
 const expectedTo=process.env.TWILIO_SUPPORT_MESSAGING_TO;
 if(!base||!owner||!expectedTo)return NextResponse.json({error:"Canal não configurado."},{status:503});
 const form=new URLSearchParams(await req.text());
 const u=new URL(req.url),signedUrl=base.replace(/\/$/,"")+u.pathname+u.search;
 if(!twilioVerified(req,form,signedUrl))return NextResponse.json({error:"Assinatura Twilio inválida."},{status:403});
 const to=form.get("To")||"",from=form.get("From")||"",body=(form.get("Body")||"").trim().slice(0,1200),sid=form.get("MessageSid")||"";
 if(to!==expectedTo||!from||!body||!/^S[M][a-f0-9]{32}$/i.test(sid))return xmlEmpty();
 try{
  const db=supportDb();
  const {data:profile}=await db.from("support_profiles").select("user_id,bot_id,business_name,knowledge,enabled,auto_reply").eq("user_id",owner).eq("enabled",true).maybeSingle();
  if(!profile)return xmlEmpty();
  const channel=from.startsWith("whatsapp:")?"whatsapp":"sms";
  const reference=hashSecret(from.toLowerCase()+"|"+owner);
  const {data:existing}=await db.from("support_conversations").select("id,status").eq("user_id",owner).eq("channel",channel).eq("customer_reference_hash",reference).order("created_at",{ascending:false}).limit(1).maybeSingle();
  let id=existing?.status!=="closed"?existing?.id:null;
  if(!id){
   const token=publicSecret();
   const {data:created}=await db.from("support_conversations").insert({
    user_id:owner,secret_hash:hashSecret(token),
    customer_name:"Cliente "+masked(from),customer_reference_hash:reference,customer_last4:masked(from),
    channel,status:"open"
   }).select("id").single();
   id=created?.id;
  }
  if(!id)return xmlEmpty();
  // Retries from the messaging provider may be duplicated; check the unique provider SID in text metadata.
  // The incoming webhook itself is signed; do not send unsolicited messages.
  const {count}=await db.from("support_messages").select("id",{head:true,count:"exact"}).eq("conversation_id",id);
  if((count||0)>=100)return xmlResponse("<Message>"+xml("Este atendimento atingiu o limite da conversa. Contacta a equipa.")+"</Message>");
  await db.from("support_messages").insert({conversation_id:id,user_id:owner,role:"customer",body});
  const {data:bot}=profile.bot_id?await db.from("bots").select("instruction").eq("id",profile.bot_id).eq("user_id",owner).maybeSingle():{data:null};
  const result=profile.auto_reply?await answerBusiness({business_name:profile.business_name,knowledge:profile.knowledge,bot_instruction:bot?.instruction||"",question:body}):{answer:"Obrigado pela mensagem. Um colaborador entrará em contacto.",needsHuman:true,mode:"fallback" as const};
  await db.from("support_messages").insert({conversation_id:id,user_id:owner,role:"bot",body:result.answer});
  await db.from("support_conversations").update({status:result.needsHuman?"needs_human":"open",updated_at:new Date().toISOString()}).eq("id",id).eq("user_id",owner);
  return xmlResponse("<Message>"+xml(result.answer.slice(0,650))+"</Message>");
 }catch{return xmlResponse("<Message>"+xml("Recebemos a tua mensagem, mas o atendimento automático não está disponível de momento.")+"</Message>");}
}
