import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/supabase/server";
export async function GET(request:NextRequest) {
  const url=new URL(request.url);
  const code=url.searchParams.get("code");
  const next=url.searchParams.get("next")||"/onboarding";
  if(code){
    const db=await serverDb();
    const {error}=await db.auth.exchangeCodeForSession(code);
    if(!error)return NextResponse.redirect(new URL(next.startsWith("/")&&!next.startsWith("//")?next:"/onboarding",url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=callback",url.origin));
}