import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {supportDb} from "@/lib/support";
import {z} from "zod";
export const dynamic="force-dynamic";
const edit=z.object({conversation_id:z.string().uuid(),status:z.enum(["open","needs_human","closed"]).optional(),reply:z.string().trim().min(1).max(1200).optional()}).refine(x=>Boolean(x.status||x.reply));

export async function GET(req:Request){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 try{
  const db=supportDb();
  const id=new URL(req.url).searchParams.get("id");
  if(id){
   const {data:thread}=await db.from("support_conversations").select("id,customer_name,channel,status,updated_at").eq("user_id",auth.user.id).eq("id",id).maybeSingle();
   if(!thread)return NextResponse.json({error:"Conversa não encontrada."},{status:404});
   const {data:messages,error}=await db.from("support_messages").select("id,role,body,created_at").eq("user_id",auth.user.id).eq("conversation_id",id).order("created_at",{ascending:true}).limit(100);
   if(error)throw error;
   return NextResponse.json({thread,messages:messages||[]},{headers:{"Cache-Control":"no-store"}});
  }
  const {data:threads,error}=await db.from("support_conversations").select("id,customer_name,channel,status,updated_at,created_at,customer_last4").eq("user_id",auth.user.id).order("updated_at",{ascending:false}).limit(60);
  if(error)throw error;
  return NextResponse.json({threads:threads||[]},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Ativa supabase/support.sql e SUPABASE_SERVICE_ROLE_KEY para consultar o atendimento."},{status:503});}
}
export async function PATCH(req:Request){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const body=edit.safeParse(await req.json().catch(()=>null));
 if(!body.success)return NextResponse.json({error:"Mensagem ou estado inválido."},{status:400});
 try{
  const db=supportDb(),s=body.data;
  const {data:thread}=await db.from("support_conversations").select("id").eq("id",s.conversation_id).eq("user_id",auth.user.id).maybeSingle();
  if(!thread)return NextResponse.json({error:"Conversa não encontrada."},{status:404});
  if(s.reply){
   const {error}=await db.from("support_messages").insert({conversation_id:s.conversation_id,user_id:auth.user.id,role:"human",body:s.reply});
   if(error)throw error;
  }
  const {error}=await db.from("support_conversations").update({status:s.status||"open",updated_at:new Date().toISOString()}).eq("id",s.conversation_id).eq("user_id",auth.user.id);
  if(error)throw error;
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Não foi possível atualizar a conversa."},{status:503});}
}
export async function DELETE(req:Request){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const id=new URL(req.url).searchParams.get("id");
 if(!id||!z.string().uuid().safeParse(id).success)return NextResponse.json({error:"Identificador inválido."},{status:400});
 try{
  const db=supportDb();
  const {error}=await db.from("support_conversations").delete().eq("id",id).eq("user_id",auth.user.id);
  if(error)throw error;
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Não foi possível eliminar a conversa."},{status:503});}
}
