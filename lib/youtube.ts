import "server-only";
import { adminDb } from "@/lib/supabase/admin";
import { decryptToken,encryptToken } from "@/lib/crypto";
export async function youtubeAuth(userId:string){
 const db=adminDb();
 const {data}=await db.from("integrations").select("*").eq("user_id",userId).eq("provider","youtube").maybeSingle();
 if(!data)return null;
 let token=decryptToken(data.access_token_encrypted);
 if(data.expires_at&&new Date(data.expires_at).getTime()<Date.now()+120000){
   if(!data.refresh_token_encrypted)throw new Error("Volta a ligar o YouTube.");
   const params=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID||"",client_secret:process.env.GOOGLE_CLIENT_SECRET||"",refresh_token:decryptToken(data.refresh_token_encrypted),grant_type:"refresh_token"});
   const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",body:params});
   if(!response.ok)throw new Error("Token YouTube expirado. Volta a ligar o canal.");
   const item=await response.json();token=item.access_token;
   await db.from("integrations").update({access_token_encrypted:encryptToken(token),expires_at:new Date(Date.now()+Number(item.expires_in||3600)*1000).toISOString()}).eq("id",data.id);
 }
 return {token,channel:data.display_name};
}