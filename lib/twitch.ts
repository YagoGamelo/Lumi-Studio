import "server-only";
import { adminDb } from "@/lib/supabase/admin";
import { encryptToken,decryptToken } from "@/lib/crypto";
export async function twitchAuth(userId:string) {
 const db=adminDb();
 const {data}=await db.from("integrations").select("*").eq("user_id",userId).eq("provider","twitch").maybeSingle();
 if(!data)return null;
 let token=decryptToken(data.access_token_encrypted);
 if(data.expires_at && new Date(data.expires_at).getTime()<Date.now()+120000){
   if(!data.refresh_token_encrypted)throw new Error("Volta a ligar a conta Twitch");
   const body=new URLSearchParams({grant_type:"refresh_token",refresh_token:decryptToken(data.refresh_token_encrypted),client_id:process.env.TWITCH_CLIENT_ID||"",client_secret:process.env.TWITCH_CLIENT_SECRET||""});
   const res=await fetch("https://id.twitch.tv/oauth2/token",{method:"POST",body,cache:"no-store"});
   if(!res.ok)throw new Error("É necessário voltar a ligar a conta Twitch");
   const refreshed=await res.json();
   token=refreshed.access_token;
   await db.from("integrations").update({
     access_token_encrypted:encryptToken(token),
     refresh_token_encrypted:encryptToken(refreshed.refresh_token||decryptToken(data.refresh_token_encrypted)),
     expires_at:new Date(Date.now()+Number(refreshed.expires_in||3600)*1000).toISOString()
   }).eq("id",data.id);
 }
 return {token,ownerId:data.provider_user_id as string,channel:data.display_name as string};
}
export async function twitchRequest(userId:string,path:string) {
 const t=await twitchAuth(userId);
 if(!t)return null;
 const res=await fetch("https://api.twitch.tv/helix/"+path,{headers:{"Authorization":"Bearer "+t.token,"Client-Id":process.env.TWITCH_CLIENT_ID||""},cache:"no-store"});
 if(!res.ok)throw new Error("Erro Twitch "+res.status);
 return {payload:await res.json(),auth:t};
}
