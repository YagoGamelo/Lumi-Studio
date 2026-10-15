import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {z} from "zod";
export const dynamic="force-dynamic";

const input=z.object({
 bot_id:z.string().uuid().nullable(),
 business_name:z.string().trim().min(2).max(90),
 knowledge:z.string().trim().max(3500),
 welcome:z.string().trim().min(2).max(280),
 enabled:z.boolean(),
 auto_reply:z.boolean()
});
const missing="A configuração de atendimento ainda não está ativada. Executa supabase/support.sql no Supabase.";

export async function GET(){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const {data,error}=await auth.db.from("support_profiles").select("user_id,bot_id,public_token,business_name,knowledge,welcome,enabled,auto_reply").eq("user_id",auth.user.id).maybeSingle();
 if(error)return NextResponse.json({error:missing},{status:503});
 return NextResponse.json({profile:data},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:Request){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const parsed=input.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Confirma nome da loja, informação, mensagem de boas-vindas e bot."},{status:400});
 if(parsed.data.bot_id){
  const {data:bot}=await auth.db.from("bots").select("id").eq("user_id",auth.user.id).eq("id",parsed.data.bot_id).maybeSingle();
  if(!bot)return NextResponse.json({error:"Só podes ligar bots que pertencem à tua conta."},{status:403});
 }
 const {data,error}=await auth.db.from("support_profiles").upsert({
  user_id:auth.user.id,...parsed.data,updated_at:new Date().toISOString()
 },{onConflict:"user_id"}).select("public_token,business_name,knowledge,welcome,bot_id,enabled,auto_reply").single();
 if(error)return NextResponse.json({error:missing+" ("+String(error.code||"erro")+")"},{status:503});
 return NextResponse.json({profile:data,notice:"Atendimento guardado. Partilha o link do chat apenas quando estiveres preparado para receber clientes."});
}
