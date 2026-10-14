import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
export async function GET(){
 const a=await authenticatedUser();if(!a)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const {data}=await adminDb().from("integrations").select("provider,display_name,created_at").eq("user_id",a.user.id);
 return NextResponse.json({connections:data||[]});
}
export async function DELETE(req:Request){
 const a=await authenticatedUser();if(!a)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const provider=new URL(req.url).searchParams.get("provider");
 if(provider!=="twitch"&&provider!=="youtube")return NextResponse.json({error:"Serviço inválido"},{status:400});
 const {error}=await adminDb().from("integrations").delete().eq("user_id",a.user.id).eq("provider",provider);
 return error?NextResponse.json({error:"Não foi possível desligar."},{status:500}):NextResponse.json({ok:true});
}
