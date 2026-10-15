import {NextResponse} from "next/server";
import {supportDb,twilioVerified} from "@/lib/support";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req:Request){
 const base=process.env.TWILIO_SUPPORT_BASE_URL,owner=process.env.TWILIO_SUPPORT_OWNER_ID;
 if(!base||!owner)return NextResponse.json({error:"Integração não configurada."},{status:503});
 const form=new URLSearchParams(await req.text()),u=new URL(req.url);
 const signed=base.replace(/\/$/,"")+u.pathname+u.search;
 if(!twilioVerified(req,form,signed))return NextResponse.json({error:"Assinatura inválida."},{status:403});
 const sid=form.get("CallSid")||"",status=form.get("CallStatus")||"";
 if(!/^CA[a-f0-9]{32}$/i.test(sid))return NextResponse.json({ok:true});
 const duration=Number(form.get("CallDuration")||"");
 try{
  const db=supportDb();
  const patch:{updated_at:string;status?:string;duration_seconds?:number}={updated_at:new Date().toISOString()};
  if(["completed"].includes(status))patch.status="completed";
  if(["no-answer","busy","failed","canceled"].includes(status))patch.status="missed";
  if(Number.isInteger(duration)&&duration>=0&&duration<=86400)patch.duration_seconds=duration;
  await db.from("support_calls").update(patch).eq("user_id",owner).eq("call_sid",sid);
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Erro ao registar estado."},{status:503});}
}
