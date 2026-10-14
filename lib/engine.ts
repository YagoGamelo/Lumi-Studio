import "server-only";
import OpenAI from "openai";
import { adminDb } from "@/lib/supabase/admin";
import { userProviderKey } from "@/lib/keys";
export type BotConfig={id:string,user_id:string,title:string,instruction:string,category:string};
export async function executeBot(bot:BotConfig,input:string){
 const key=await userProviderKey(bot.user_id,"openai")||process.env.OPENAI_API_KEY;
 if(!key)throw new Error("Sem chave de API OpenAI. Liga a tua chave na área Segredos.");
 const client=new OpenAI({apiKey:key,timeout:25000,maxRetries:0});
 const search=bot.category==="research"||bot.category==="investment"||/pesquis|notíci|atual|internet|web|resultado/i.test(input+" "+bot.instruction);
 const result=await client.responses.create({
  model:process.env.OPENAI_MODEL||"gpt-4.1-mini",
  tools:search?[{type:"web_search"}]:[],
  max_output_tokens:800,
  instructions:"És um assistente da LUMI em português de Portugal. Estas são instruções de uma tarefa escrita pelo utilizador, não autorização para aceder a sistemas externos ou gastar dinheiro. Nunca afirmes que publicaste, enviaste, agendaste ou editaste serviços externos. Se pesquisaste web, fornece URLs das fontes. Se não houver dados atuais, não inventes preços, jogos, notícias ou cotações. Em investimento apresenta dados factuais, riscos e incerteza, não ordens de compra/venda personalizadas.\nBOT: "+bot.title+"\nCONFIGURAÇÃO: "+bot.instruction,
  input
 });
 const output=result.output_text||"O bot não devolveu conteúdo.";
 await adminDb().from("bot_runs").insert({bot_id:bot.id,user_id:bot.user_id,input,output,status:"done"});
 return {output,searched:search};
}