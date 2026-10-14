import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { twitchAuth,twitchRequest } from "@/lib/twitch";
export async function GET(){
 const a=await authenticatedUser();if(!a)return NextResponse.json({error:"Inicia sessão."},{status:401});
 try{
 const t=await twitchAuth(a.user.id);if(!t)return NextResponse.json({error:"Liga primeiro a tua Twitch em Integrações."},{status:409});
 const clips=await twitchRequest(a.user.id,"clips?broadcaster_id="+encodeURIComponent(t.ownerId)+"&first=20");
 return NextResponse.json({clips:(clips?.payload.data||[]).map((c:Record<string,unknown>)=>({
   id:c.id,title:c.title,view_count:c.view_count,duration:c.duration,url:c.url,thumbnail_url:c.thumbnail_url,created_at:c.created_at
 }))});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Erro Twitch."},{status:502});}
}
}