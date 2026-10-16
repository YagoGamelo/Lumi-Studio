import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {executeDraftCapabilities} from "@/lib/bots/runtime";
import {z} from "zod";

export const dynamic="force-dynamic";

/** Runs only local, allowlisted draft adapters for bots owned by the signed-in user. */
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  const auth=await authenticatedUser();
  if(!auth)return NextResponse.json({error:"Inicia sessão para executar o teu bot."},{status:401});
  const {id}=await params;
  if(!z.string().uuid().safeParse(id).success)
    return NextResponse.json({error:"Identificador de bot inválido."},{status:400});
  const {data:bot,error}=await auth.db.from("bots")
    .select("id,title,instruction").eq("id",id).eq("user_id",auth.user.id).maybeSingle();
  if(error)return NextResponse.json({error:"Não foi possível consultar o bot."},{status:503});
  if(!bot)return NextResponse.json({error:"Bot não encontrado."},{status:404});

  const {data:row,error:blueprintError}=await auth.db.from("bot_blueprints")
    .select("blueprint").eq("bot_id",id).eq("user_id",auth.user.id).maybeSingle();
  if(blueprintError){
    // Avoid using a potentially different tree when storage cannot be read.
    return NextResponse.json({error:"Não foi possível consultar a árvore do bot."},{status:503});
  }
  const result=executeDraftCapabilities(bot,row?.blueprint??null);
  return NextResponse.json(result,{headers:{"Cache-Control":"private, no-store"}});
}
