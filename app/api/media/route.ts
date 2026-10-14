import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
export async function GET(){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão"},{status:401});
 const {data,error}=await auth.db.from("media_assets").select("id,kind,original_name,rights_confirmed,created_at").eq("user_id",auth.user.id).order("created_at",{ascending:false}).limit(100);
 return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({assets:data});
}