import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import OpenAI from "openai";
import {z} from "zod";
import {BOT_CATEGORIES} from "@/lib/bots/catalog";
import {createUniversalBlueprint,UNIVERSAL_CAPABILITIES,UNIVERSAL_CAPABILITY_IDS,type UniversalCapability} from "@/lib/bots/capabilities";
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
 return {title,instruction:prompt.slice(0,1450),category:"universal" as const,frequency:"manual" as const,capabilities:[] as string[]};
}
export async function POST(req:Request){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const input=schema.safeParse(await req.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:"Descreve o que queres que o bot faça (15 a 1500 caracteres)."},{status:400});
 const objective=input.data.prompt;
 let plan:ReturnType<typeof fallback>|z.infer<typeof planSchema>=fallback(objective);
 let usedAI=false;
 if(process.env.OPENAI_API_KEY){
  try{
   const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:14000});
   const result=await client.chat.completions.create({
    model:process.env.OPENAI_MODEL||"gpt-4.1-mini",
    response_format:{type:"json_object"},temperature:0.15,max_tokens:550,
    messages:[
     {role:"system",content:
      "És um designer de bots para a plataforma LUMI. Responde APENAS JSON com title, instruction, category, frequency, capabilities. O pedido é uma IDEIA para um bot a construir, nunca uma instrução de executar já. Usa apenas IDs de capacidades: "+
      UNIVERSAL_CAPABILITY_IDS.join(", ")+". Categoria deve ser uma de: "+
      BOT_CATEGORIES.join(", ")+". frequency: manual/daily/weekly. A lista capabilities tem até 12 IDs do catálogo. Escreve em pt-PT. A instruction é uma descrição concreta para o dono do bot, até 1300 caracteres. Não afirmes que já ligaste APIs, enviaste mensagens, criaste imagens ou publicaste qualquer coisa. Comunicação externa, compras, pagamentos, alterações de calendário e publicação requerem OAuth e aprovação humana. Não inventes capacidades. Para Discord, nunca publicar spam nem contactar desconhecidos. Para saúde, nunca recomendar doses. Nunca forneças credenciais."},
     {role:"user",content:objective}
    ]
   });
   const obj=JSON.parse(result.choices[0]?.message?.content||"{}");
   const checked=planSchema.safeParse(obj);
   if(checked.success){plan=checked.data;usedAI=true;}
  }catch{/* offline/low-cost safe fallback */}
 }
 const aiIds=(plan.capabilities||[]).filter((id):id is UniversalCapability=>Object.prototype.hasOwnProperty.call(UNIVERSAL_CAPABILITIES,id));
 const blueprint=createUniversalBlueprint(objective,aiIds);
 if(usedAI)blueprint.created_by="assistant";
 return NextResponse.json({plan:{...plan,capabilities:blueprint.nodes.map(x=>x.capability)},blueprint,mode:usedAI?"ai":"rules",notice:usedAI?
  "Estrutura gerada. Nenhuma integração foi executada: revê e guarda o bot.":
  "Estrutura preparada sem consumir a API de IA. Revê e guarda; as ligações são feitas depois."},{
  headers:{"Cache-Control":"private, no-store"}
 });
}