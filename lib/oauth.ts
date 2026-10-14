import "server-only";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
export function oauthState(response:NextResponse,provider:"twitch"|"youtube",userId:string){
 const nonce=randomBytes(24).toString("hex");
 response.cookies.set("lumi_oauth_"+provider,nonce+"."+userId,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:600});
 return nonce;
}
export function validateOAuth(cookie:string|undefined,state:string|null,userId:string){
 if(!cookie||!state||!/^[0-9a-f]{48}$/.test(state))return false;
 const [nonce,id]=cookie.split(".");
 return nonce===state&&id===userId;
}
