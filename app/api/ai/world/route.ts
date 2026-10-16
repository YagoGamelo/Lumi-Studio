import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {getWorldFeedNames} from "@/lib/ai/world";

export const dynamic="force-dynamic";
export async function GET(){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const {data,error}=await auth.db.from("lumi_world_observations")
  .select("id,source_id,title,source_url,published_at,discovered_at")
  .order("discovered_at",{ascending:false}).limit(30);
 if(error)return NextResponse.json({
  error:"Índice do mundo ainda não está ativo. Executa supabase/lumi-world.sql."
 },{status:503});
 return NextResponse.json({items:data||[],sources:getWorldFeedNames(),
  note:"Estes são apenas títulos e referências RSS, não conhecimento verificado nem transcrições de vídeos."
 },{headers:{"Cache-Control":"private, no-store"}});
}
