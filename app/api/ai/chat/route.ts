import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {chooseAiProvider,generateAiText} from "@/lib/ai/router";
import {z} from "zod";

export const dynamic="force-dynamic";
const schema=z.object({
 prompt:z.string().trim().min(3).max(4000),
 task:z.enum(["chat","code","plan","summarize"]).default("chat"),
 provider:z.enum(["auto","openai","anthropic","gemini"]).default("auto")
});
const INSTRUCTIONS={
 chat:"És a LUMI, assistente útil em pt-PT. Sê preciso, admite limites e não afirmes que executaste ações que não executaste.",
 code:"És a LUMI, assistente de programação. Fornece código seguro, explica pressupostos, não executes ações nem afirmes que criaste ficheiros.",
 plan:"És a LUMI, assistente de planeamento. Organiza passos realistas sem afirmar que foram executados.",
 summarize:"És a LUMI, assistente de resumos. Resume apenas o que foi fornecido; não inventes factos."
} as const;
export async function POST(req:Request){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const input=schema.safeParse(await req.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:"Pedido inválido (3 a 4000 caracteres)."},{status:400});
 try{chooseAiProvider(input.data.task,input.data.provider);}
 catch{return NextResponse.json({error:"Essa IA não está configurada no servidor. Adiciona a chave nas variáveis privadas da Vercel."},{status:503});}
 const quota=await auth.db.rpc("lumi_consume_ai_quota");
 if(quota.error)return NextResponse.json({error:"A proteção de custos não está ativa. Executa supabase/ai-router.sql no Supabase antes de usar IAs pagas."},{status:503});
 if(quota.data!==true)return NextResponse.json({error:"Limite beta de 20 pedidos de IA por dia atingido."},{status:429});
 try{
  const result=await generateAiText({...input.data,system:INSTRUCTIONS[input.data.task]});
  return NextResponse.json({...result,task:input.data.task,note:"Resposta gerada por uma IA externa; não foram executadas ações."},
   {headers:{"Cache-Control":"private, no-store"}});
 }catch{
  return NextResponse.json({error:"Não foi possível obter resposta desta IA. Verifica a chave, permissões, modelo e saldo no fornecedor."},{status:502});
 }
}
