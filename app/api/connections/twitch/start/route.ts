import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { oauthState } from "@/lib/oauth";
export async function GET(req:NextRequest){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.redirect(new URL("/login",req.url));
 const cid=process.env.TWITCH_CLIENT_ID,origin=process.env.NEXT_PUBLIC_SITE_URL;
 if(!cid||!origin)return NextResponse.json({error:"Twitch OAuth ainda não configurado"},{status:503});
 const base=new URL("https://id.twitch.tv/oauth2/authorize");
 base.searchParams.set("client_id",cid);
 base.searchParams.set("redirect_uri",origin+"/api/connections/twitch/callback");
 base.searchParams.set("response_type","code");
 base.searchParams.set("scope","channel:manage:clips");
 const response=NextResponse.redirect(base);
 base.searchParams.set("state",oauthState(response,"twitch",auth.user.id));
 return NextResponse.redirect(base,{headers:{"Set-Cookie":response.headers.get("Set-Cookie")||""}});
}