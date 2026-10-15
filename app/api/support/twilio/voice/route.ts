import {NextResponse} from "next/server";
import {supportDb,twilioVerified,xml,xmlResponse,answerBusiness,masked} from "@/lib/support";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;

const voice=(text:string)=>"<Say language=\"pt-PT\">"+xml(text.slice(0,600))+"</Say>";
function callerAction(url:string,step:string){
 const target=new URL(url);target.searchParams.set("step",step);
 return target.toString();
}
function verifyOwner(req:Request,fields:URLSearchParams){
 const base=process.env.TWILIO_SUPPORT_BASE_URL,owner=process.env.TWILIO_SUPPORT_OWNER_ID;
 if(!base||!owner)return null;
 const u=new URL(req.url),publicUrl=base.replace(/\/$/,"")+u.pathname+u.search;
 if(!twilioVerified(req,fields,publicUrl))return null;
 return {base,owner};
}
export async function POST(req:Request){
 const fields=new URLSearchParams(await req.text());
 const config=verifyOwner(req,fields);
 if(!config)return NextResponse.json({error:"Webhook não autorizado ou não configurado."},{status:403});
 const sid=fields.get("CallSid")||"",from=fields.get("From")||"",to=fields.get("To")||"";
 if(!/^CA[a-f0-9]{32}$/i.test(sid))return xmlResponse(voice("Pedido inválido.")+"<Hangup/>");
 const expectedTo=process.env.TWILIO_SUPPORT_VOICE_TO;
 if(!expectedTo||to!==expectedTo)return xmlResponse(voice("Este número ainda não está configurado para atendimento.")+"<Hangup/>");
 const endpoint=config.base.replace(/\/$/,"")+"/api/support/twilio/voice";
 const step=new URL(req.url).searchParams.get("step")||"welcome";
 try{
  const db=supportDb();
  const {data:p}=await db.from("support_profiles").select("user_id,bot_id,business_name,knowledge,enabled,auto_reply").eq("user_id",config.owner).eq("enabled",true).maybeSingle();
  if(!p)return xmlResponse(voice("O atendimento está indisponível.")+"<Hangup/>");
  const {data:record}=await db.from("support_calls").select("id,consent_to_transcribe").eq("call_sid",sid).eq("user_id",config.owner).maybeSingle();
  if(!record){
   await db.from("support_calls").insert({user_id:config.owner,call_sid:sid,source:"twilio",direction:"inbound",caller_last4:masked(from),status:"received",summary:"Chamada recebida. Áudio não gravado."});
  }
  if(step==="welcome"){
   return xmlResponse(
    voice("Olá! Ligaste para "+p.business_name+". Este é um atendimento automático com inteligência artificial. "+
     "Se continuares, as tuas palavras poderão ser transcritas para responder e guardadas num breve registo da chamada. "+
     "Não gravamos o áudio. Para autorizar, prime um. Se não quiseres, desliga ou aguarda.")+
    '<Gather input="dtmf" numDigits="1" timeout="8" action="'+xml(callerAction(endpoint,"consent"))+'" method="POST"/>'+
    voice("Sem autorização, terminamos esta chamada. Obrigado.")+"<Hangup/>"
   );
  }
  if(step==="consent"){
   if(fields.get("Digits")!=="1"){
    await db.from("support_calls").update({status:"completed",summary:"Não autorizou a transcrição."}).eq("call_sid",sid).eq("user_id",config.owner);
    return xmlResponse(voice("Obrigado. Podes contactar-nos por mensagem se preferires.")+"<Hangup/>");
   }
   await db.from("support_calls").update({consent_to_transcribe:true,status:"answered"}).eq("call_sid",sid).eq("user_id",config.owner);
   return xmlResponse(
    voice("Obrigado. Diz em poucas palavras como podemos ajudar.")+
    '<Gather input="speech" language="pt-PT" speechTimeout="auto" timeout="8" action="'+xml(callerAction(endpoint,"question"))+'" method="POST"/>'+
    voice("Não ouvimos o teu pedido. Obrigado por ligar.")+"<Hangup/>"
   );
  }
  if(step==="question"){
   const {data:current}=await db.from("support_calls").select("consent_to_transcribe").eq("call_sid",sid).eq("user_id",config.owner).maybeSingle();
   if(!current?.consent_to_transcribe)return xmlResponse(voice("É necessário autorizar primeiro.")+"<Hangup/>");
   const speech=(fields.get("SpeechResult")||"").trim().slice(0,800);
   if(!speech)return xmlResponse(voice("Não conseguimos compreender. A equipa poderá ajudar por mensagem.")+"<Hangup/>");
   const {data:bot}=p.bot_id?await db.from("bots").select("instruction").eq("id",p.bot_id).eq("user_id",config.owner).maybeSingle():{data:null};
   const result=p.auto_reply?await answerBusiness({business_name:p.business_name,knowledge:p.knowledge,bot_instruction:bot?.instruction||"",question:speech}):{answer:"Obrigado. Recebemos o teu pedido. A nossa equipa pode ajudar por mensagem.",needsHuman:true};
   // Store a minimal text summary of the call (never store the audio).
   const summary=("Pergunta: "+speech+" | Resposta: "+result.answer).slice(0,1400);
   await db.from("support_calls").update({status:result.needsHuman?"escalated":"answered",summary}).eq("call_sid",sid).eq("user_id",config.owner);
   return xmlResponse(voice(result.answer)+" "+voice("Obrigado por ligares. Até breve.")+"<Hangup/>");
  }
  return xmlResponse(voice("Obrigado pela chamada.")+"<Hangup/>");
 }catch{return xmlResponse(voice("Desculpa. Não foi possível atender automaticamente. Por favor tenta por mensagem.")+"<Hangup/>");}
}
