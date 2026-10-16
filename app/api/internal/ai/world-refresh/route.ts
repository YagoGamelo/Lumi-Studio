import {NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {adminDb} from "@/lib/supabase/admin";
import {discoverWorldMetadata} from "@/lib/ai/world";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
function authorized(request:Request){
 const secret=process.env.CRON_SECRET||"";
 const input=request.headers.get("authorization")||"";
 const expected="Bearer "+secret;
 return secret.length>=24&&input.length===expected.length&&
  timingSafeEqual(Buffer.from(input),Buffer.from(expected));
}

export async function GET(request:Request){
 if(!authorized(request))return NextResponse.json({error:"Não autorizado."},{status:401});
 let db;
 try{db=adminDb();}catch{
  return NextResponse.json({error:"Worker não configurado (service role)."},{status:503});
 }
 // Explicitly fail closed if the migration is not installed.
 const probe=await db.from("lumi_world_observations").select("id").limit(1);
 if(probe.error)return NextResponse.json({error:"Executa supabase/lumi-world.sql."},{status:503});

 const discovered=await discoverWorldMetadata();
 let inserted=0;
 let failed=0;
 const sources=[];
 for(const feed of discovered){
  if(feed.error){failed++;sources.push({source:feed.source_id,state:feed.error});continue;}
  const {error}=await db.from("lumi_world_observations")
   .upsert(feed.items,{onConflict:"source_url",ignoreDuplicates:true});
  if(error){failed++;sources.push({source:feed.source_id,state:"DATABASE_ERROR"});}
  else{inserted+=feed.items.length;sources.push({source:feed.source_id,state:"ok",observed:feed.items.length});}
 }
 // Bound the retention window to limit storage and avoid collecting old content.
 await db.from("lumi_world_observations").delete()
  .lt("discovered_at",new Date(Date.now()-60*86400_000).toISOString());
 return NextResponse.json({
  ok:failed===0,observed:inserted,failed,sources,
  note:"Apenas metadados de RSS. Sem vídeos, transcrições, treino de modelos, conversas ou fontes privadas."
 },{status:failed===discovered.length?502:200,
  headers:{"Cache-Control":"private, no-store"}});
}
