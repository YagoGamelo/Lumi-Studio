import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {z} from "zod";

export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};

export async function GET(_req:Request,{params}:Context){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const {id}=await params;
 if(!z.string().uuid().safeParse(id).success)
  return NextResponse.json({error:"Conversa inválida."},{status:400});
 const {data:conversation,error}=await auth.db.from("lumi_ai_conversations")
  .select("id,title,created_at,updated_at")
  .eq("id",id).eq("user_id",auth.user.id).maybeSingle();
 if(error)return NextResponse.json({error:"Não foi possível abrir o histórico."},{status:503});
 if(!conversation)return NextResponse.json({error:"Conversa não encontrada."},{status:404});
 const {data:messages,error:messagesError}=await auth.db.from("lumi_ai_messages")
  .select("id,role,content,created_at")
  .eq("conversation_id",id).eq("user_id",auth.user.id)
  .order("created_at",{ascending:true})
  .limit(100);
 if(messagesError)return NextResponse.json({error:"Não foi possível consultar as mensagens."},{status:503});
 return NextResponse.json({conversation,messages:messages||[]},{
  headers:{"Cache-Control":"private, no-store"}});
}

export async function DELETE(_req:Request,{params}:Context){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const {id}=await params;
 if(!z.string().uuid().safeParse(id).success)
  return NextResponse.json({error:"Conversa inválida."},{status:400});
 const {data,error}=await auth.db.from("lumi_ai_conversations")
  .delete().eq("id",id).eq("user_id",auth.user.id).select("id").maybeSingle();
 if(error)return NextResponse.json({error:"Não foi possível eliminar a conversa."},{status:503});
 if(!data)return NextResponse.json({error:"Conversa não encontrada."},{status:404});
 return NextResponse.json({deleted:true},{headers:{"Cache-Control":"private, no-store"}});
}
