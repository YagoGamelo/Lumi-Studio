/**
 * LUMI Universal Builder — declarative capability registry.
 * Register new capabilities here. A blueprint NEVER executes these operations.
 * Runtime implementations must authenticate users, check scopes, quotas and approvals separately.
 */
export const UNIVERSAL_CAPABILITIES={
 "ai.chat":{name:"Conversar e compreender pedidos",description:"Analisar pedidos e propor respostas",connection:"OpenAI API",approval:false},
 "ai.vision":{name:"Ler fotografias",description:"Interpretar imagens autorizadas, sem inventar detalhes",connection:"API de visão + origem de imagens autorizada",approval:false},
 "documents.draft":{name:"Criar documentos",description:"Preparar textos, resumos e rascunhos editáveis",connection:"Editor ou exportador de documentos",approval:false},
 "calendar.draft":{name:"Preparar uma agenda",description:"Organizar eventos e propor horários",connection:"Agenda LUMI",approval:false},
 "calendar.publish":{name:"Guardar eventos na agenda",description:"Adicionar eventos apenas após autorização",connection:"Google Calendar ou outro calendário com OAuth",approval:true},
 "discord.receive":{name:"Ouvir pedidos no Discord",description:"Reagir a comandos/mensagens permitidas no servidor",connection:"Discord Bot / instalação no servidor",approval:false},
 "discord.send":{name:"Enviar mensagens no Discord",description:"Publicar apenas nos canais autorizados e com limites",connection:"Discord / permissão Send Messages",approval:true},
 "whatsapp.receive":{name:"Receber WhatsApp",description:"Receber mensagens e fotografias autorizadas",connection:"WhatsApp Business Cloud API",approval:false},
 "whatsapp.reply":{name:"Responder por WhatsApp",description:"Responder dentro das condições e custos Meta",connection:"WhatsApp Business Cloud API",approval:true},
 "sms.receive":{name:"Receber SMS",description:"Ler mensagens de texto recebidas no canal autorizado",connection:"Gateway de SMS / TextBee",approval:false},
 "sms.send":{name:"Enviar SMS",description:"Enviar mensagens verificadas com limites de custos",connection:"Gateway de SMS / tarifário",approval:true},
 "email.send":{name:"Enviar emails",description:"Preparar e enviar emails com autenticação e revisão",connection:"Conta de email autorizada",approval:true},
 "research.web":{name:"Pesquisar na web",description:"Procurar e citar fontes atualizadas",connection:"Ferramenta de pesquisa web",approval:false},
 "storage.files":{name:"Organizar ficheiros",description:"Ler e guardar ficheiros com permissões mínimas",connection:"Google Drive / Dropbox / armazenamento",approval:true},
 "images.generate":{name:"Criar imagens",description:"Gerar imagens com fornecedor de IA",connection:"API de geração de imagens",approval:true},
 "video.generate":{name:"Criar vídeos",description:"Preparar e renderizar clips com fornecedor externo",connection:"API de vídeo e orçamento aprovado",approval:true},
 "voice.listen":{name:"Receber voz",description:"Transcrever áudio enviado com consentimento",connection:"Entrada de áudio + API de transcrição",approval:false},
 "schedule.trigger":{name:"Trabalhar por horário",description:"Executar tarefas agendadas com quota",connection:"Agendador LUMI / worker",approval:false},
 "automation.webhook":{name:"Ligar aplicações",description:"Orquestrar eventos e ações autorizadas entre apps",connection:"Webhooks ou APIs autenticadas",approval:true},
 "commerce.support":{name:"Atender clientes",description:"Responder segundo informação aprovada pela loja",connection:"LUMI Atendimento",approval:false},
 "review.human":{name:"Pedir aprovação",description:"Parar antes de enviar, publicar ou alterar algo",connection:"Confirmação no painel LUMI",approval:true}
} as const;
export type UniversalCapability=keyof typeof UNIVERSAL_CAPABILITIES;
export const UNIVERSAL_CAPABILITY_IDS=Object.keys(UNIVERSAL_CAPABILITIES) as UniversalCapability[];

export type UniversalBlueprint={
 version:1; objective:string; created_by:"assistant"|"rules";
 nodes:{id:string;capability:UniversalCapability;label:string;depends_on:string[];
  status:"planned";connection:string;requires_approval:boolean}[];
 connections:string[];approvals:string[];notice:string;
};

const PATTERNS:ReadonlyArray<{pattern:RegExp;ids:UniversalCapability[]}>= [
 {pattern:/foto|fotografia|imagem receb|analis.ar imagem|imagem do|planta|documento fotografado/i,ids:["ai.vision"]},
 {pattern:/criar imagem|gerar imagem|desenha|ilustra|foto gerada/i,ids:["images.generate"]},
 {pattern:/mem[oó]ria descritiva|documento|relat[oó]rio|pdf|word|texto de projeto|or[cç]amento|redigir|escrever/i,ids:["documents.draft"]},
 {pattern:/calend[aá]rio|agenda|marcar evento|marcar reuni[aã]o|evento|consulta|tarefa semanal/i,ids:["calendar.draft","calendar.publish"]},
 {pattern:/lembret|alarme|a cada hora|de hora em hora|agendar|todos os dias|periodicamente/i,ids:["schedule.trigger","calendar.draft"]},
 {pattern:/discord|servidor de gaming|servidor de jogos/i,ids:["discord.receive","discord.send"]},
 {pattern:/whatsapp|watsap|whatasap/i,ids:["whatsapp.receive","whatsapp.reply"]},
 {pattern:/sms|mensagem de telem[oó]vel/i,ids:["sms.receive","sms.send"]},
 {pattern:/email|e-mail|correio eletr[oó]nico/i,ids:["email.send"]},
 {pattern:/pesquisa|pesquisar|procurar informa[cç]|not[ií]cias|fontes/i,ids:["research.web"]},
 {pattern:/drive|dropbox|ficheiro|pasta|guardar foto|armazenar|transferir arquivo/i,ids:["storage.files"]},
 {pattern:/v[ií]deo|clip|short|reels|render|montagem/i,ids:["video.generate"]},
 {pattern:/[aá]udio|voz|transcre|falar por voz/i,ids:["voice.listen"]},
 {pattern:/loja|clientes|atendimento|encomenda|suporte/i,ids:["commerce.support"]},
 {pattern:/liga[rç]|automatiza|quando acontecer|integra|webhook|sincroniza|outra app/i,ids:["automation.webhook"]},
];
const CAP_ORDER:UniversalCapability[]=[
 "ai.chat","ai.vision","voice.listen","research.web","discord.receive","whatsapp.receive","sms.receive",
 "commerce.support","documents.draft","images.generate","video.generate","storage.files","calendar.draft",
 "schedule.trigger","calendar.publish","automation.webhook","discord.send","whatsapp.reply","sms.send","email.send","review.human"
];
function safeObjective(value:string){return value.trim().replace(/\s+/g," ").slice(0,750);}
export function createUniversalBlueprint(objective:string,aiIds:UniversalCapability[]=[]):UniversalBlueprint{
 const selected=new Set<UniversalCapability>(["ai.chat"]);
 for(const {pattern,ids} of PATTERNS)if(pattern.test(objective))ids.forEach(id=>selected.add(id));
 for(const id of aiIds)if(UNIVERSAL_CAPABILITY_IDS.includes(id))selected.add(id);
 if([...selected].some(id=>UNIVERSAL_CAPABILITIES[id].approval))selected.add("review.human");
 // A generic request yields a planning assistant rather than an uncontrolled executor.
 const nodes=CAP_ORDER.filter(id=>selected.has(id)).slice(0,20).map((id)=>{
  const info=UNIVERSAL_CAPABILITIES[id];
  const dependencies:string[]=[];
  if(id!=="ai.chat")dependencies.push("ai.chat");
  if(info.approval&&id!=="review.human")dependencies.push("review.human");
  if(id==="calendar.publish"&&selected.has("calendar.draft"))dependencies.push("calendar.draft");
  if(id==="discord.send"&&selected.has("discord.receive"))dependencies.push("discord.receive");
  if(id==="whatsapp.reply"&&selected.has("whatsapp.receive"))dependencies.push("whatsapp.receive");
  if(id==="sms.send"&&selected.has("sms.receive"))dependencies.push("sms.receive");
  return {id,capability:id,label:info.name,depends_on:dependencies,
   status:"planned" as const,connection:info.connection,requires_approval:info.approval};
 });
 const connections=[...new Set(nodes.map(n=>n.connection))];
 const approvals=nodes.filter(n=>n.requires_approval&&n.id!=="review.human").map(n=>n.label);
 const health=/medicamen|rem[eé]dio|sa[uú]de|dose|posologi/i.test(objective);
 const moderation=/discord/i.test(objective);
 const notices=[
  "Estrutura do bot, não um bot a executar. Liga as contas necessárias, testa e autoriza as ações antes de o ativar.",
  ...(health?["Tarefas de saúde exigem confirmação das instruções clínicas; a IA não define doses nem altera tratamentos."]:[]),
  ...(moderation?["Mensagens Discord só com instalação e permissões do servidor, limites contra spam e aprovação."]:[])
 ];
 return {version:1,objective:safeObjective(objective),created_by:"rules",nodes,connections,approvals,notice:notices.join(" ")};
}