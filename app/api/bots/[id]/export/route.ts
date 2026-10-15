import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {createPortableBotFiles,type BotTarget} from "@/lib/bot-package";
import {zipFiles} from "@/lib/zip";
import {z} from "zod";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const targetSchema=z.enum(["server","discord","website"]);

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão para exportar o bot."},{status:401});
 const {id}=await params;
 if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:"Bot inválido."},{status:400});
 const url=new URL(req.url);
 const target=targetSchema.safeParse(url.searchParams.get("target"));
 if(!target.success)return NextResponse.json({error:"Escolhe server, discord ou website."},{status:400});
 const {data:bot,error}=await auth.db.from("bots").select("id,title,instruction,category,frequency").eq("id",id).eq("user_id",auth.user.id).maybeSingle();
 if(error)return NextResponse.json({error:"Erro ao procurar o bot."},{status:500});
 if(!bot)return NextResponse.json({error:"Bot não encontrado."},{status:404});
 try{
  const archive=zipFiles(createPortableBotFiles(bot,target.data as BotTarget));
  const suffix=target.data==="server"?"webhook":target.data==="discord"?"discord":"website";
  const filename="lumi-bot-"+suffix+"-"+id.slice(0,8)+".zip";
  return new Response(new Uint8Array(archive),{status:200,headers:{
   "Content-Type":"application/zip",
   "Content-Disposition":'attachment; filename="'+filename+'"',
   "Content-Length":String(archive.length),
   "Cache-Control":"private, no-store",
   "X-Content-Type-Options":"nosniff"
  }});
 }catch{
  return NextResponse.json({error:"Não foi possível preparar a exportação."},{status:500});
 }
}
