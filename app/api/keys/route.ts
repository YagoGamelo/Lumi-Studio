import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/crypto";
const allowed=["openai","heygen","newsapi","elevenlabs"];
export async function GET(){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const {data}=await adminDb().from("user_api_keys").select("provider,last_four,created_at").eq("user_id",auth.user.id);
 return NextResponse.json({keys:data||[]});
}
export async function POST(req:Request){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const body=await req.json().catch(()=>null),provider=body?.provider,key=body?.key;
 if(!allowed.includes(provider)||typeof key!=="string"||key.length<8||key.length>500||/[\r\n]/.test(key))return NextResponse.json({error:"Fornecedor ou chave inválida."},{status:400});
 try{
 const {error}=await adminDb().from("user_api_keys").upsert({user_id:auth.user.id,provider,encrypted_value:encryptToken(key),last_four:key.slice(-4)},{onConflict:"user_id,provider"});
 return error?NextResponse.json({error:"Não foi possível guardar a chave."},{status:500}):NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Encriptação do servidor não configurada."},{status:503});}
}
export async function DELETE(req:Request){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const provider=new URL(req.url).searchParams.get("provider");
 if(!provider||!allowed.includes(provider))return NextResponse.json({error:"Fornecedor inválido."},{status:400});
 await adminDb().from("user_api_keys").delete().eq("user_id",auth.user.id).eq("provider",provider);
 return NextResponse.json({ok:true});
}