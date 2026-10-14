import { NextResponse } from "next/server";
import { authenticatedUser, isUsernameValid } from "@/lib/auth";
import { z } from "zod";
const schema=z.object({username:z.string().max(20),referral:z.string().max(20).optional()});
export async function POST(req:Request) {
  const auth=await authenticatedUser();
  if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
  const input=schema.safeParse(await req.json().catch(()=>null));
  if(!input.success)return NextResponse.json({error:"Dados inválidos."},{status:400});
  const username=input.data.username.toLowerCase().trim();
  const referral=input.data.referral?.toLowerCase().trim()||null;
  if(!isUsernameValid(username) || (referral&&!isUsernameValid(referral)))return NextResponse.json({error:"Usa 3–20 caracteres; começa por uma letra."},{status:400});
  const {error}=await auth.db.rpc("complete_onboarding",{new_username:username,invitation_code:referral});
  if(error)return NextResponse.json({error:error.message.includes("duplicate")?"Nome de utilizador já escolhido.":error.message},{status:409});
  return NextResponse.json({ok:true});
}