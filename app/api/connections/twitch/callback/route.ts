import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/crypto";
import { validateOAuth } from "@/lib/oauth";
export async function GET(req:NextRequest){
 const origin=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;
 const fail=()=>NextResponse.redirect(new URL("/dashboard?tab=connections&error=twitch",origin));
 const auth=await authenticatedUser(),state=req.nextUrl.searchParams.get("state"),code=req.nextUrl.searchParams.get("code");
 if(!auth||!code||!validateOAuth(req.cookies.get("lumi_oauth_twitch")?.value,state,auth.user.id))return fail();
 const params=new URLSearchParams({client_id:process.env.TWITCH_CLIENT_ID||"",client_secret:process.env.TWITCH_CLIENT_SECRET||"",code,grant_type:"authorization_code",redirect_uri:origin+"/api/connections/twitch/callback"});
 const tokenRes=await fetch("https://id.twitch.tv/oauth2/token",{method:"POST",body:params,cache:"no-store"});
 if(!tokenRes.ok)return fail();
 const token=await tokenRes.json();
 const userRes=await fetch("https://api.twitch.tv/helix/users",{headers:{"Client-Id":process.env.TWITCH_CLIENT_ID||"","Authorization":"Bearer "+token.access_token},cache:"no-store"});
 if(!userRes.ok)return fail();
 const user=(await userRes.json()).data?.[0];
 if(!user)return fail();
 const {error}=await adminDb().from("integrations").upsert({
   user_id:auth.user.id,provider:"twitch",provider_user_id:user.id,display_name:user.display_name,
   access_token_encrypted:encryptToken(token.access_token),
   refresh_token_encrypted:token.refresh_token?encryptToken(token.refresh_token):null,
   expires_at:new Date(Date.now()+Number(token.expires_in||3600)*1000).toISOString()
 },{onConflict:"user_id,provider"});
 if(error)return fail();
 const response=NextResponse.redirect(new URL("/dashboard?tab=connections&connected=twitch",origin));
 response.cookies.delete("lumi_oauth_twitch");
 return response;
}