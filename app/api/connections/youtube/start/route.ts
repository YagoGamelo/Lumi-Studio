import { NextRequest,NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { oauthState } from "@/lib/oauth";
export async function GET(req:NextRequest){
 const a=await authenticatedUser();if(!a)return NextResponse.redirect(new URL("/login",req.url));
 const client=process.env.GOOGLE_CLIENT_ID,origin=process.env.NEXT_PUBLIC_SITE_URL;
 if(!client||!origin)return NextResponse.json({error:"OAuth YouTube não configurado."},{status:503});
 const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
 url.searchParams.set("client_id",client);
 url.searchParams.set("redirect_uri",origin+"/api/connections/youtube/callback");
 url.searchParams.set("response_type","code");
 url.searchParams.set("access_type","offline");
 url.searchParams.set("prompt","consent");
 url.searchParams.set("scope","https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly");
 const res=NextResponse.redirect(url);
 url.searchParams.set("state",oauthState(res,"youtube",a.user.id));
 return NextResponse.redirect(url,{headers:{"Set-Cookie":res.headers.get("Set-Cookie")||""}});
}