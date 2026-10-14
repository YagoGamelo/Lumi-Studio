import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { twitchAuth,twitchRequest } from "@/lib/twitch";
import { adminDb } from "@/lib/supabase/admin";
import { randomUUID } from "node:crypto";
export async function POST(req:Request){
 const a=await authenticatedUser();if(!a)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const body=await req.json().catch(()=>({}));
 if(typeof body.clip_id!=="string"||body.clip_id.length>100)return NextResponse.json({error:"Clip inválido."},{status:400});
 try{
 const t=await twitchAuth(a.user.id);if(!t)return NextResponse.json({error:"Liga a Twitch."},{status:409});
 const list=await twitchRequest(a.user.id,"clips?id="+encodeURIComponent(body.clip_id));
 const clip=list?.payload?.data?.[0];
 if(!clip||clip.broadcaster_id!==t.ownerId)return NextResponse.json({error:"Só podes importar clips do canal ligado."},{status:403});
 const dl=await twitchRequest(a.user.id,"clips/downloads?editor_id="+encodeURIComponent(t.ownerId)+"&broadcaster_id="+encodeURIComponent(t.ownerId)+"&clip_id="+encodeURIComponent(body.clip_id));
 const item=dl?.payload?.data?.[0];
 const url=item?.landscape_download_url||item?.portrait_download_url||item?.download_url;
 if(typeof url!=="string")return NextResponse.json({error:"Twitch não disponibilizou URL de download para este clip."},{status:502});
 const host=new URL(url).hostname;
 if(!(host.endsWith(".twitchcdn.net")||host==="clips-media-assets2.twitch.tv"||host.endsWith(".ttvnw.net")))return NextResponse.json({error:"Domínio do vídeo inesperado."},{status:502});
 const response=await fetch(url,{redirect:"error"});
 const declared=Number(response.headers.get("content-length")||0);
 if(!response.ok||declared>25_000_000)return NextResponse.json({error:"Clip indisponível ou superior a 25 MB."},{status:413});
 const buffer=await response.arrayBuffer();
 if(buffer.byteLength>25_000_000)return NextResponse.json({error:"Clip demasiado grande."},{status:413});
 const path=a.user.id+"/clip/"+randomUUID()+".mp4";
 const db=adminDb();const stored=await db.storage.from("lumi-private").upload(path,buffer,{contentType:"video/mp4"});
 if(stored.error)throw stored.error;
 const {data,error}=await db.from("media_assets").insert({user_id:a.user.id,kind:"clip",storage_path:path,original_name:String(clip.title||"Twitch clip").slice(0,200),rights_confirmed:true}).select("id,original_name").single();
 if(error){await db.storage.from("lumi-private").remove([path]);throw error;}
 return NextResponse.json({asset:data},{status:201});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Não foi possível importar."},{status:502});}
}
}