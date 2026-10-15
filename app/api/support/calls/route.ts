import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {supportDb} from "@/lib/support";
import {z} from "zod";
export const dynamic="force-dynamic";
const schema=z.object({
 caller_last4:z.string().regex(/^\d{0,4}$/).optional(),
 direction:z.enum(["inbound","outbound"]).default("inbound"),
 status:z.enum(["received","answered","missed","completed","escalated"]).default("received"),
 duration_seconds:z.number().int().min(0).max(86400).nullable().optional(),
 summary:z.string().trim().max(2000).default("")
});
export async function GET(){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 try{
  const db=supportDb();
  const {data,error}=await db.from("support_calls").select("id,caller_last4,status,direction,duration_seconds,summary,source,created_at,consent_to_transcribe").eq("user_id",auth.user.id).order("created_at",{ascending:false}).limit(100);
  if(error)throw error;
  return NextResponse.json({calls:data||[]},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Ativa a migração support.sql e a chave privada Supabase."},{status:503});}
}
export async function POST(req:Request){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Confirma os dados da chamada."},{status:400});
 try{
  const db=supportDb();
  const {count}=await db.from("support_calls").select("id",{count:"exact",head:true}).eq("user_id",auth.user.id).gte("created_at",new Date(Date.now()-86400000).toISOString());
  if((count||0)>=100)return NextResponse.json({error:"Limite diário de registos atingido."},{status:429});
  const {data,error}=await db.from("support_calls").insert({user_id:auth.user.id,...parsed.data,source:"manual",consent_to_transcribe:false}).select("id").single();
  if(error)throw error;
  return NextResponse.json({call:data},{status:201});
 }catch{return NextResponse.json({error:"Não foi possível criar o registo."},{status:503});}
}
export async function DELETE(req:Request){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const id=new URL(req.url).searchParams.get("id");
 if(!id||!z.string().uuid().safeParse(id).success)return NextResponse.json({error:"Identificador inválido."},{status:400});
 try{
  const db=supportDb();
  const {error}=await db.from("support_calls").delete().eq("id",id).eq("user_id",auth.user.id);
  if(error)throw error;
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Não foi possível eliminar o registo."},{status:503});}
}
