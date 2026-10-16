import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {createUniversalBlueprint} from "@/lib/bots/capabilities";
import {z} from "zod";
export const dynamic="force-dynamic";
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const {id}=await params;
 if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:"Identificador inválido."},{status:400});
 const {data:bot,error}=await auth.db.from("bots")
  .select("id,title,instruction").eq("id",id).eq("user_id",auth.user.id).maybeSingle();
 if(error)return NextResponse.json({error:"Não foi possível abrir o bot."},{status:503});
 if(!bot)return NextResponse.json({error:"Bot não encontrado."},{status:404});
 const {data:row}=await auth.db.from("bot_blueprints")
  .select("blueprint,objective").eq("bot_id",id).eq("user_id",auth.user.id).maybeSingle();
 // Existing bots (before the migration) still get a useful rules-based preview.
 const generated=createUniversalBlueprint(bot.instruction||bot.title);
 const stored=row?.blueprint&&typeof row.blueprint==="object"&&
  Array.isArray((row.blueprint as {nodes?:unknown}).nodes)?row.blueprint:generated;
 return NextResponse.json({bot:{id:bot.id,title:bot.title},blueprint:stored,
  saved:Boolean(row),notice:row?"Árvore guardada.":"Árvore provisória criada a partir das instruções; guarda um novo bot após executar a migração."},{
   headers:{"Cache-Control":"private, no-store"}
 });
}
