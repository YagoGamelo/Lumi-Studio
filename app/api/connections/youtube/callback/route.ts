import { NextRequest,NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { validateOAuth } from "@/lib/oauth";
import { encryptToken } from "@/lib/crypto";
import { adminDb } from "@/lib/supabase/admin";
export async function GET(req:NextRequest){
 const origin=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;
 const fail=()=>NextResponse.redirect(new URL("/dashboard?tab=connections&error=youtube",origin));
 const a=await authenticatedUser();
 const state=req.nextUrl.searchParams.get("state"),code=req.nextUrl.searchParams.get("code");
 if(!a||!code||!validateOAuth(req.cookies.get("lumi_oauth_youtube")?.value,state,a.user.id))return fail();
 const params=new URLSearchParams({code,client_id:process.env.GOOGLE_CLIENT_ID||"",client_secret:process.env.GOOGLE_CLIENT_SECRET||"",redirect_uri:origin+"/api/connections/youtube/callback",grant_type:"authorization_code"});
 const res=await fetch("https://oauth2.googleapis.com/token",{method:"POST",body:params,cache:"no-store"});
 if(!res.ok)return fail();
 const token=await res.json();
 const channel=await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",{headers:{"Authorization":"Bearer "+token.access_token},cache:"no-store"});
 if(!channel.ok)return fail();
 const info=(await channel.json()).items?.[0];if(!info)return fail();
 const {error}=await adminDb().from("integrations").upsert({
  user_id:a.user.id,provider:"youtube",provider_user_id:info.id,display_name:info.snippet?.title||"YouTube",
  access_token_encrypted:encryptToken(token.access_token),
  refresh_token_encrypted:token.refresh_token?encryptToken(token.refresh_token):null,
  expires_at:new Date(Date.now()+Number(token.expires_in||3600)*1000).toISOString()
 },{onConflict:"user_id,provider"});
 if(error)return fail();
 const response=NextResponse.redirect(new URL("/dashboard?tab=connections&connected=youtube",origin));
 response.cookies.delete("lumi_oauth_youtube");
 return response;
}