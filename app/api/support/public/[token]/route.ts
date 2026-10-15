import {NextResponse} from "next/server";
import {supportDb,supportTokenPattern,hashSecret,equalSecret,publicSecret,answerBusiness,textLimit} from "@/lib/support";
import {z} from "zod";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const payload=z.object({
 message:z.string().trim().min(1).max(textLimit),
 customer_name:z.string().trim().min(1).max(70).optional(),
 conversation_id:z.string().uuid().optional(),
 access_secret:z.string().regex(/^[a-f0-9]{64}$/).optional()
});
function error(msg:string,status:number){return NextResponse.json({error:msg},{status,headers:{"Cache-Control":"no-store"}});}
async function profile(token:string){
 const db=supportDb();
 const {data}=await db.from("support_profiles").select("user_id,bot_id,business_name,knowledge,welcome,enabled,auto_reply").eq("public_token",token).eq("enabled",true).maybeSingle();
 return {db,data};
}
export async function GET(req:Request,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;if(!supportTokenPattern.test(token))return error("Chat não encontrado.",404);
 let data;
 try{({data}=await profile(token));}catch{return error("Chat temporariamente indisponível.",503);}
 if(!data)return error("Este atendimento não está ativo.",404);
 const url=new URL(req.url);
 const id=url.searchParams.get("conversation_id"),key=url.searchParams.get("access_secret");
 if(!id||!key)return NextResponse.json({shop:{name:data.business_name,welcome:data.welcome,auto_reply:data.auto_reply}},{headers:{"Cache-Control":"no-store"}});
 if(!z.string().uuid().safeParse(id).success||!z.string().regex(/^[a-f0-9]{64}$/).safeParse(key).success)return error("Conversa inválida.",400);
 try{
  const {db}=await profile(token);
  const {data:thread}=await db.from("support_conversations").select("id,secret_hash,status").eq("id",id).eq("user_id",data.user_id).eq("channel","website").maybeSingle();
  if(!thread||!equalSecret(key,thread.secret_hash))return error("Não tens acesso a esta conversa.",403);
  const {data:messages}=await db.from("support_messages").select("id,role,body,created_at").eq("conversation_id",id).eq("user_id",data.user_id).order("created_at",{ascending:true}).limit(80);
  return NextResponse.json({shop:{name:data.business_name,welcome:data.welcome,auto_reply:data.auto_reply},status:thread.status,messages:messages||[]},{headers:{"Cache-Control":"no-store"}});
 }catch{return error("Não foi possível carregar a conversa.",503);}
}
export async function POST(req:Request,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;if(!supportTokenPattern.test(token))return error("Chat não encontrado.",404);
 const parsed=payload.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return error("A mensagem pode ter até "+textLimit+" caracteres.",400);
 const input=parsed.data;
 let db,data;
 try{({db,data}=await profile(token));}catch{return error("Este atendimento ainda não está configurado no servidor.",503);}
 if(!data)return error("Este chat está desativado.",404);
 const {count:daily,error:quotaError}=await db.from("support_messages").select("id",{head:true,count:"exact"}).eq("user_id",data.user_id).gte("created_at",new Date(Date.now()-86400000).toISOString());
 if(quotaError)return error("Este atendimento está indisponível.",503);
 if((daily||0)>=200)return error("O atendimento atingiu o limite diário desta versão beta.",429);
 let thread:{id:string;secret_hash:string;status:string}|null=null;
 let newKey:string|undefined;
 if(input.conversation_id&&input.access_secret){
  const found=await db.from("support_conversations").select("id,secret_hash,status").eq("user_id",data.user_id).eq("channel","website").eq("id",input.conversation_id).maybeSingle();
  if(!found.data||!equalSecret(input.access_secret,found.data.secret_hash))return error("Acesso negado a esta conversa.",403);
  thread=found.data;
 }else if(input.conversation_id||input.access_secret)return error("Identificador e chave da conversa são obrigatórios.",400);
 else{
  const {count:recent}=await db.from("support_conversations").select("id",{head:true,count:"exact"}).eq("user_id",data.user_id).gte("created_at",new Date(Date.now()-86400000).toISOString());
  if((recent||0)>=40)return error("Não é possível abrir mais conversas neste momento.",429);
  newKey=publicSecret();
  const {data:created,error:createError}=await db.from("support_conversations").insert({
   user_id:data.user_id,secret_hash:hashSecret(newKey),
   customer_name:input.customer_name||"Cliente",channel:"website",status:"open"
  }).select("id,secret_hash,status").single();
  if(createError||!created)return error("Não foi possível iniciar a conversa.",503);
  thread=created;
 }
 if(thread.status==="closed")return error("Esta conversa está fechada. Podes começar outra.",409);
 const {count:messagesCount}=await db.from("support_messages").select("id",{head:true,count:"exact"}).eq("conversation_id",thread.id);
 if((messagesCount||0)>=50)return error("Esta conversa atingiu o limite beta.",429);
 const {data:lastMessages}=await db.from("support_messages").select("role,body,created_at").eq("conversation_id",thread.id).order("created_at",{ascending:false}).limit(8);
 if(lastMessages?.[0]&&Date.now()-new Date(lastMessages[0].created_at).getTime()<1800)return error("Aguarda dois segundos antes de enviares outra mensagem.",429);
 const {error:insertError}=await db.from("support_messages").insert({conversation_id:thread.id,user_id:data.user_id,role:"customer",body:input.message});
 if(insertError)return error("Não foi possível guardar a mensagem.",503);
 let reply="";
 let needHuman=!data.auto_reply;
 if(!data.auto_reply)reply="Obrigado! A tua mensagem ficou registada. A equipa responderá quando estiver disponível.";
 else{
  const {data:bot}=data.bot_id?await db.from("bots").select("instruction").eq("id",data.bot_id).eq("user_id",data.user_id).maybeSingle():{data:null};
  const generated=await answerBusiness({
   business_name:data.business_name,knowledge:data.knowledge,bot_instruction:bot?.instruction||"Atendimento cordial.",
   question:input.message,history:(lastMessages||[]).reverse()
  });
  reply=generated.answer;needHuman=generated.needsHuman;
 }
 await db.from("support_messages").insert({conversation_id:thread.id,user_id:data.user_id,role:"bot",body:reply});
 await db.from("support_conversations").update({
  status:needHuman?"needs_human":"open",updated_at:new Date().toISOString()
 }).eq("id",thread.id).eq("user_id",data.user_id);
 return NextResponse.json({conversation_id:thread.id,...(newKey?{access_secret:newKey}:{}),reply,needs_human:needHuman,mode:data.auto_reply?"bot":"human_pending"},{headers:{"Cache-Control":"no-store"}});
}
