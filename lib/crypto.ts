import "server-only";
import { createCipheriv,createDecipheriv,randomBytes } from "node:crypto";
function key() {
  const raw=process.env.TOKEN_ENCRYPTION_KEY;
  if(!raw)throw new Error("TOKEN_ENCRYPTION_KEY em falta");
  const bytes=Buffer.from(raw,"base64");
  if(bytes.length!==32)throw new Error("TOKEN_ENCRYPTION_KEY precisa de 32 bytes base64");
  return bytes;
}
export function encryptToken(value:string){
  const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv);
  const encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString("base64");
}
export function decryptToken(value:string){
  const buffer=Buffer.from(value,"base64");
  const iv=buffer.subarray(0,12),tag=buffer.subarray(12,28),ciphertext=buffer.subarray(28);
  const cipher=createDecipheriv("aes-256-gcm",key(),iv);cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(ciphertext),cipher.final()]).toString("utf8");
}