import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import OpenAI from "openai";
import {z} from "zod";

const inputSchema=z.object({message:z.string().trim().min(1).max(1600)});
export const dynamic="force-dynamic";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão para testar os teus bots."},{status:401});
 const {id}=await params;
 if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:"Bot inválido."},{status:400});
 const input=inputSchema.safeParse(await req.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:"Escreve uma pergunta com até 1600 caracteres."},{status:400});
 const {data:bot,error}=await auth.db.from("bots").select("title,instruction").eq("id",id).eq("user_id",auth.user.id).maybeSingle();
 if(error)return NextResponse.json({error:"Erro a carregar o bot."},{status:500});
 if(!bot)return NextResponse.json({error:"Bot não encontrado."},{status:404});
 if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:"O teste por IA ainda não está ativado. Configura OPENAI_API_KEY nas variáveis privadas da Vercel. Já podes criar e exportar o teu bot."},{status:503});
 try{
  const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:18000});
  const reply=await openai.chat.completions.create({
   model:process.env.OPENAI_MODEL||"gpt-4.1-mini",
   max_tokens:550,
   messages:[
    {role:"system",content:"És um bot configurado pelo criador com o nome "+bot.title+". Instruções: "+bot.instruction+"\nÉs uma demonstração textual da LUMI Studio, não uma aplicação com controlo de ferramentas externas. Responde de forma útil e adapta-te ao pedido; nunca digas que instalaste software, enviaste mensagens, moveste ficheiros, fizeste compras, geraste um vídeo real ou acedeste a apps se não existem integrações autorizadas. Explica o passo seguinte quando uma ação precisar de ligação ou autorização. Não peças palavras-passe nem tokens privados."},
    {role:"user",content:input.data.message}
   ]
  });
  const output=reply.choices[0]?.message?.content;
  if(!output)return NextResponse.json({error:"A IA não devolveu resposta."},{status:502});
  return NextResponse.json({output,mode:"text_preview"},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"O modelo de IA não conseguiu responder agora."},{status:502});}
}
