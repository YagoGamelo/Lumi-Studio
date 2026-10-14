import "server-only";
import { adminDb } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto";
export async function userProviderKey(userId:string,provider:"openai"|"heygen"|"newsapi"|"elevenlabs"){
 const {data}=await adminDb().from("user_api_keys").select("encrypted_value").eq("user_id",userId).eq("provider",provider).maybeSingle();
 return data?.encrypted_value?decryptToken(data.encrypted_value):null;
}