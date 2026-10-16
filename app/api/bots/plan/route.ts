import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {z} from "zod";
import {BOT_CATEGORIES} from "@/lib/bots/catalog";
import {createUniversalBlueprint,UNIVERSAL_CAPABILITIES,UNIVERSAL_CAPABILITY_IDS,type UniversalCapability} from "@/lib/bots/capabilities";
import {generateAiText,getAiProviders,parseAiJson} from "@/lib/ai/router";

export const dynamic="force-dynamic";
const schema=z.object({prompt:z.string().trim().min(15).max(1500)});
const planSchema=z.object({
 title:z.string().trim().min(3).max(75),
 instruction:z.string().trim().min(12).max(2500),
 category:z.enum(BOT_CATEGORIES),
 frequency:z.enum(["manual","daily","weekly"]),
 capabilities:z.array(z.string()).max(30).optional()
});
function fallback(prompt:string){
 const title=/discord/i.test(prompt)?"Bot Discord":/agenda|calend[aá]rio/i.test(prompt)?"Bot de agenda":
 /mem[oó]ria descritiva|projeto/i.test(prompt)?"Assistente de projetos":"O meu bot universal";
 return {title,instruction:prompt.slice(0,1450),category:"universal" as const,
  frequency:"manual" as const,capabilities:[] as string[]};
}
export async function POST(req:Request){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const input=schema.safeParse(await req.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:"Descreve o que queres que o bot faça (15 a 1500 caracteres)."},{status:400});
 const objective=input.data.prompt;
 let plan:ReturnType<typeof fallback>|z.infer<typeof planSchema>=fallback(objective);
 let usedAI=false;
 let provider:string|undefined;
 let model:string|undefined;
 let notice="Estrutura preparada sem consumir a API de IA. Revê e guarda; as ligações são feitas depois.";
 if(getAiProviders().some(x=>x.configured)){
  // Keep the inexpensive rules fallback if the daily quota is unavailable or exhausted.
  const quota=await auth.db.rpc("lumi_consume_ai_quota");
  if(quota.error)notice="Plano criado por regras. Para ativar as IAs, executa supabase/ai-router.sql no Supabase SQL Editor.";
  else if(quota.data!==true)notice="Limite diário de IA atingido. O planeamento por regras continua disponível.";
  else try{
   const system="És um designer de bots para a plataforma LUMI. Responde APENAS com JSON com title, instruction, category, frequency, capabilities. "
    +"O pedido é uma IDEIA para um bot, nunca uma ordem para executar já. Usa exclusivamente os IDs: "
    +UNIVERSAL_CAPABILITY_IDS.join(", ")+". Categoria: "+BOT_CATEGORIES.join(", ")
    +". frequency: manual/daily/weekly. Até 12 capacidades. Escreve em pt-PT, instrução até 1300 caracteres. "
    +"Não afirmes que ligaste APIs, enviaste mensagens ou publicaste conteúdo. "
    +"Comunicação externa, pagamentos e alterações de calendário exigem permissões e aprovação. "
    +"Nada de spam, credenciais, ou recomendações de doses médicas.";
   const output=await generateAiText({task:"plan",prompt:objective,system,json:true});
   const checked=planSchema.safeParse(parseAiJson(output.text));
   if(checked.success){
    plan=checked.data;usedAI=true;provider=output.provider;model=output.model;
    notice="Estrutura gerada por IA. Nenhuma integração foi executada: revê e guarda o bot.";
   }else notice="A IA devolveu um plano inválido. A LUMI preparou uma alternativa por regras.";
  }catch{notice="O fornecedor de IA não respondeu. A LUMI preparou uma estrutura por regras.";}
 }
 const aiIds=(plan.capabilities||[]).filter((id):id is UniversalCapability=>
  Object.prototype.hasOwnProperty.call(UNIVERSAL_CAPABILITIES,id));
 const blueprint=createUniversalBlueprint(objective,aiIds);
 if(usedAI)blueprint.created_by="assistant";
 return NextResponse.json({plan:{...plan,capabilities:blueprint.nodes.map(x=>x.capability)},
  blueprint,mode:usedAI?"ai":"rules",provider,model,notice
 },{headers:{"Cache-Control":"private, no-store"}});
}
