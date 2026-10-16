import {createHash,timingSafeEqual} from "node:crypto";
import {supportDb} from "@/lib/support";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const token=new URL(req.url).searchParams.get("token")||"";
 if(!/^[a-f0-9]{64}$/.test(token))return new Response("Ligação inválida.",{status:400});
 const hash=createHash("sha256").update(token).digest("hex");
 const {data:a,error}=await supportDb().from("support_agent_artifacts")
  .select("kind,body,expires_at,token_hash").eq("token_hash",hash).maybeSingle();
 if(error||!a||new Date(a.expires_at).getTime()<Date.now())
  return new Response("Ligação inexistente ou expirada.",{status:404,headers:{"Cache-Control":"no-store"}});
 if(!timingSafeEqual(Buffer.from(hash,"hex"),Buffer.from(a.token_hash,"hex")))
  return new Response("Acesso recusado.",{status:403});
 const ics=a.kind==="medication_calendar";
 return new Response(a.body,{
  headers:{
   "Content-Type":ics?"text/calendar; charset=utf-8":"text/plain; charset=utf-8",
   "Content-Disposition":'attachment; filename="'+(ics?"lumi-lembretes.ics":"lumi-memoria-descritiva-rascunho.txt")+'"',
   "Cache-Control":"private, no-store, no-cache, max-age=0",
   "Referrer-Policy":"no-referrer",
   "X-Content-Type-Options":"nosniff",
   "X-Robots-Tag":"noindex, nofollow",
   "Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'; sandbox"
  }
 });
}
