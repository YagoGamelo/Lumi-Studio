import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { youtubeAuth } from "@/lib/youtube";
import { z } from "zod";
export const maxDuration=60;
const schema=z.object({asset_id:z.string().uuid(),title:z.string().min(3).max(100),description:z.string().max(3000).default(""),publish_at:z.string().datetime().optional(),synthetic:z.boolean(),approved:z.literal(true)});
export async function POST(req:Request){
 const a=await authenticatedUser();if(!a)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Preenche os dados e aprova explicitamente a publicação."},{status:400});
 const {asset_id,title,description,publish_at,synthetic}=parsed.data;
 if(publish_at&&new Date(publish_at).getTime()<Date.now()+600000)return NextResponse.json({error:"Agenda pelo menos 10 minutos antes."},{status:400});
 const {data:asset}=await a.db.from("media_assets").select("kind,storage_path").eq("id",asset_id).eq("user_id",a.user.id).maybeSingle();
 if(!asset||!["video","clip"].includes(asset.kind))return NextResponse.json({error:"Escolhe um vídeo autorizado da tua biblioteca."},{status:404});
 try{
 const y=await youtubeAuth(a.user.id);if(!y)return NextResponse.json({error:"Liga primeiro o teu canal YouTube."},{status:409});
 const db=adminDb();
 const downloaded=await db.storage.from("lumi-private").download(asset.storage_path);
 if(downloaded.error)throw downloaded.error;
 const buf=await downloaded.data.arrayBuffer();
 if(buf.byteLength>25_000_000)return NextResponse.json({error:"Limite beta de 25 MB por publicação."},{status:413});
 const mime=asset.storage_path.endsWith(".webm")?"video/webm":"video/mp4";
 const metadata={snippet:{title,description,categoryId:"22"},status:{privacyStatus:"private",selfDeclaredMadeForKids:false,containsSyntheticMedia:synthetic,...(publish_at?{publishAt:publish_at}:{})}};
 const start=await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",{
  method:"POST",headers:{"Authorization":"Bearer "+y.token,"Content-Type":"application/json; charset=UTF-8","X-Upload-Content-Length":String(buf.byteLength),"X-Upload-Content-Type":mime},
  body:JSON.stringify(metadata),cache:"no-store"
 });
 const location=start.headers.get("location");
 if(!start.ok||!location||!location.startsWith("https://www.googleapis.com/"))return NextResponse.json({error:"YouTube recusou o início do upload. Verifica as permissões e a cota."},{status:502});
 const upload=await fetch(location,{method:"PUT",headers:{"Content-Type":mime,"Content-Length":String(buf.byteLength)},body:buf,cache:"no-store"});
 const result=await upload.json().catch(()=>({}));
 if(!upload.ok)return NextResponse.json({error:"Falha no envio para o YouTube."},{status:502});
 return NextResponse.json({ok:true,video_id:result.id,privacy:"private",scheduled:!!publish_at});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Erro YouTube."},{status:503});}
}