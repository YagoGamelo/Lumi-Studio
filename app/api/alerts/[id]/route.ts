import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
export const dynamic="force-dynamic";
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const {enabled}=await req.json().catch(()=>({}));
 if(typeof enabled!=="boolean")return NextResponse.json({error:"Estado inválido."},{status:400});
 const {id}=await params;
 const {data,error}=await auth.db.from("bot_alert_schedules").update({enabled}).eq("id",id).eq("user_id",auth.user.id).select("id,enabled").maybeSingle();
 if(error)return NextResponse.json({error:"Não foi possível alterar o alerta."},{status:500});
 if(!data)return NextResponse.json({error:"Alerta não encontrado."},{status:404});
 return NextResponse.json({schedule:data});
}
export async function DELETE(_req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const {id}=await params;
 const {error}=await auth.db.from("bot_alert_schedules").delete().eq("id",id).eq("user_id",auth.user.id);
 if(error)return NextResponse.json({error:"Não foi possível eliminar o alerta."},{status:500});
 return NextResponse.json({ok:true});
}
