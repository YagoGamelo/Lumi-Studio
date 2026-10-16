import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";

export const dynamic="force-dynamic";
/** Never retrieve another user's conversation, even if its UUID is known. */
export async function GET(){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const {data,error}=await auth.db.from("lumi_ai_conversations")
  .select("id,title,created_at,updated_at")
  .eq("user_id",auth.user.id)
  .order("updated_at",{ascending:false})
  .limit(40);
 if(error)return NextResponse.json({
  error:"Histórico ainda não está ativo. Executa supabase/lumi-conversations.sql."
 },{status:503});
 return NextResponse.json({conversations:data||[]},{
  headers:{"Cache-Control":"private, no-store"}});
}
