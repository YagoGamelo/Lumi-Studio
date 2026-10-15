import {authenticatedUser} from "@/lib/auth";
import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
function escapeCalendar(s:string){
 return s.replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;").slice(0,500);
}
export async function GET(req:Request){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const id=new URL(req.url).searchParams.get("id");
 if(!id)return NextResponse.json({error:"Escolhe um alerta."},{status:400});
 const {data,error}=await auth.db.from("bot_alert_schedules").select("id,bot_id,time_local,timezone,recurrence,weekday,message,next_run_at").eq("id",id).eq("user_id",auth.user.id).maybeSingle();
 if(error||!data)return NextResponse.json({error:"Alerta não encontrado."},{status:404});
 const {data:bot}=await auth.db.from("bots").select("title").eq("id",data.bot_id).eq("user_id",auth.user.id).maybeSingle();
 if(!bot)return NextResponse.json({error:"Bot não encontrado."},{status:404});
 const instant=new Date(data.next_run_at);
 const local=new Intl.DateTimeFormat("en-GB",{timeZone:data.timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(instant);
 const y=local.find(x=>x.type==="year")?.value||"2026";
 const m=local.find(x=>x.type==="month")?.value||"01";
 const d=local.find(x=>x.type==="day")?.value||"01";
 const dayNames=["SU","MO","TU","WE","TH","FR","SA"];
 const rule=data.recurrence==="daily"?"FREQ=DAILY":
 data.recurrence==="weekdays"?"FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR":
 "FREQ=WEEKLY;BYDAY="+dayNames[data.weekday??0];
 const date=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
 const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//LUMI Studio//Bot Alerts//PT",
 "CALSCALE:GREGORIAN","BEGIN:VEVENT","UID:"+data.id+"@lumi-studio",
 "DTSTAMP:"+date,"DTSTART;TZID="+data.timezone+":"+y+m+d+"T"+data.time_local.replace(":","")+"00",
 "RRULE:"+rule,"SUMMARY:"+escapeCalendar("LUMI: "+bot.title),
 "DESCRIPTION:"+escapeCalendar(data.message),
 "BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+escapeCalendar(data.message),
 "TRIGGER:PT0S","END:VALARM","END:VEVENT","END:VCALENDAR",""];
 return new Response(lines.join("\r\n"),{headers:{
  "Content-Type":"text/calendar; charset=utf-8",
  "Content-Disposition":'attachment; filename="lumi-bot-alarme.ics"',
  "Cache-Control":"private, no-store",
  "X-Content-Type-Options":"nosniff"
 }});
}
