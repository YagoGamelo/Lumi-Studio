import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
export async function DELETE(_req:Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await authenticatedUser();
  if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
  const {id}=await params;
  const {error}=await auth.db.from("bots").delete().eq("id",id).eq("user_id",auth.user.id);
  return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true});
}