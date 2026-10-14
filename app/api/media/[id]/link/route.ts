import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const {id}=await params;
 const {data}=await auth.db.from("media_assets").select("storage_path").eq("id",id).eq("user_id",auth.user.id).maybeSingle();
 if(!data)return NextResponse.json({error:"Ficheiro não encontrado."},{status:404});
 const {data:link,error}=await adminDb().storage.from("lumi-private").createSignedUrl(data.storage_path,180);
 return error?NextResponse.json({error:"Erro ao gerar acesso."},{status:500}):NextResponse.json({url:link.signedUrl});
}