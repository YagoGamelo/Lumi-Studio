import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {z} from "zod";
export const dynamic="force-dynamic";
/**
 * WhatsApp has no free API guarantee for proactive timed messages.
 * This route is only opened after a real user clicks "Partilhar no WhatsApp".
 * It pre-fills a message but NEVER sends it automatically.
 */
export async function GET(req:Request){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const id=new URL(req.url).searchParams.get("id");
 if(!id||!z.string().uuid().safeParse(id).success)return NextResponse.json({error:"Mensagem inválida."},{status:400});
 const {data:entry,error}=await auth.db.from("bot_alert_inbox").select("content,channel").eq("id",id).eq("user_id",auth.user.id).maybeSingle();
 if(error||!entry||entry.channel!=="whatsapp")return NextResponse.json({error:"Mensagem não encontrada."},{status:404});
 const {data:phone}=await auth.db.from("bot_alert_phones").select("phone_e164,verified_at").eq("user_id",auth.user.id).maybeSingle();
 if(!phone?.verified_at||!phone.phone_e164)return NextResponse.json({error:"Verifica o teu número primeiro."},{status:403});
 const number=phone.phone_e164.replace(/\D/g,"");
 const url="https://wa.me/"+number+"?text="+encodeURIComponent(entry.content.slice(0,1000));
 return NextResponse.redirect(url,302);
}
