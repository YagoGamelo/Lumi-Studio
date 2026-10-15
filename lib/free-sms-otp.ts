import "server-only";
import {createHmac,randomInt,timingSafeEqual} from "node:crypto";
import {adminDb,phonePattern,textBeeSend} from "@/lib/alerts";

function secret(){
 const value=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!value||value.length<24)throw new Error("Falta chave privada do Supabase.");
 return value;
}
function digest(user:string,phone:string,code:string){
 return createHmac("sha256",secret()).update("LUMI:TextBee:OTP:v1:"+user+":"+phone+":"+code).digest("hex");
}
export async function startFreeSmsVerification(userId:string,phone:string){
 if(!phonePattern.test(phone))throw new Error("Número inválido.");
 const db=adminDb();
 const pin=randomInt(100000,1000000).toString();
 const {error}=await db.from("bot_alert_phone_otps").upsert({
  user_id:userId,phone_e164:phone,code_hash:digest(userId,phone,pin),
  expires_at:new Date(Date.now()+10*60000).toISOString(),attempts:0,created_at:new Date().toISOString()
 },{onConflict:"user_id"});
 if(error)throw new Error("Executa a migração supabase/alerts-free-sms.sql.");
 try{
  await textBeeSend(phone,"LUMI Studio: o teu código de verificação é "+pin+". Válido por 10 minutos. Não partilhes este código.");
 }catch(e){
  await db.from("bot_alert_phone_otps").delete().eq("user_id",userId);
  throw e;
 }
}
export async function checkFreeSmsVerification(userId:string,phone:string,code:string){
 if(!/^\d{6}$/.test(code))return false;
 const db=adminDb();
 const {data:otp,error}=await db.from("bot_alert_phone_otps")
  .select("phone_e164,code_hash,expires_at,attempts").eq("user_id",userId).maybeSingle();
 if(error||!otp)throw new Error("Serviço de verificação indisponível.");
 if(otp.phone_e164!==phone||new Date(otp.expires_at).getTime()<Date.now()||otp.attempts>=5){
  await db.from("bot_alert_phone_otps").delete().eq("user_id",userId);
  return false;
 }
 const expected=digest(userId,phone,code);
 const correct=timingSafeEqual(Buffer.from(expected,"hex"),Buffer.from(otp.code_hash,"hex"));
 if(!correct){
  await db.from("bot_alert_phone_otps").update({attempts:otp.attempts+1}).eq("user_id",userId);
  return false;
 }
 await db.from("bot_alert_phone_otps").delete().eq("user_id",userId);
 return true;
}
