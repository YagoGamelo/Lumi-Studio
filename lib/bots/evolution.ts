/**
 * LUMI integration discovery registry.
 * Listing a provider does NOT mean that it is connected or executable.
 * New providers can be proposed without granting permissions or deploying code.
 */
export const LUMI_PROVIDERS={
  discord:{label:"Discord",category:"community",auth:"bot_install",capabilities:["discord.receive","discord.send"],status:"planned"},
  whatsapp:{label:"WhatsApp Business",category:"messaging",auth:"oauth_or_business_token",capabilities:["whatsapp.receive","whatsapp.reply"],status:"planned"},
  sms:{label:"SMS",category:"messaging",auth:"provider_credentials",capabilities:["sms.receive","sms.send"],status:"planned"},
  youtube:{label:"YouTube",category:"video",auth:"oauth",capabilities:["youtube.read","youtube.publish","youtube.live"],status:"planned"},
  twitch:{label:"Twitch",category:"streaming",auth:"oauth",capabilities:["twitch.chat.read","twitch.chat.send","twitch.events"],status:"planned"},
  tiktok:{label:"TikTok",category:"social",auth:"oauth",capabilities:["tiktok.read","tiktok.publish"],status:"planned"},
  google_calendar:{label:"Google Calendar",category:"productivity",auth:"oauth",capabilities:["calendar.read","calendar.publish"],status:"planned"},
  google_drive:{label:"Google Drive",category:"files",auth:"oauth",capabilities:["storage.files"],status:"planned"},
  gmail:{label:"Gmail",category:"messaging",auth:"oauth",capabilities:["email.read","email.send"],status:"planned"},
  alarms:{label:"Alarmes LUMI",category:"productivity",auth:"internal",capabilities:["schedule.trigger","notifications.send"],status:"planned"},
  openai:{label:"OpenAI",category:"ai",auth:"server_api_key",capabilities:["ai.chat","ai.vision","images.generate"],status:"planned"},
  anthropic:{label:"Anthropic",category:"ai",auth:"server_api_key",capabilities:["ai.chat"],status:"planned"},
  google_gemini:{label:"Google Gemini",category:"ai",auth:"server_api_key",capabilities:["ai.chat","ai.vision"],status:"planned"},
  webhooks:{label:"Webhooks",category:"automation",auth:"verified_secret",capabilities:["automation.webhook"],status:"planned"}
} as const;
export type LumiProviderId=keyof typeof LUMI_PROVIDERS;
export type CapabilityDemand={capability:string;requests:number;successful_runs:number;failed_runs:number};
export type ImprovementProposal={
 capability:string;requests:number;success_rate:number|null;
 priority:"high"|"medium"|"low";action:"review_existing_adapter"|"research_new_adapter";
 notes:string[];
};
/**
 * Deterministic improvement suggestions computed from AGGREGATED counts.
 * Never send prompts, personal messages or secret tokens to a learning model.
 * These proposals cannot install connectors, run generated code or deploy.
 */
export function suggestCapabilityImprovements(demand:readonly CapabilityDemand[]):ImprovementProposal[]{
 return demand.filter(x=>typeof x.capability==="string"&&x.capability.length<=100&&
  Number.isSafeInteger(x.requests)&&x.requests>=1&&
  Number.isSafeInteger(x.successful_runs)&&x.successful_runs>=0&&
  Number.isSafeInteger(x.failed_runs)&&x.failed_runs>=0)
 .map(item=>{
  const attempts=item.successful_runs+item.failed_runs;
  const successRate=attempts?item.successful_runs/attempts:null;
  const action=attempts>0?"review_existing_adapter" as const:"research_new_adapter" as const;
  const priority=item.requests>=20&&(successRate===null||successRate<0.85)?"high" as const:
    item.requests>=5?"medium" as const:"low" as const;
  return {capability:item.capability,requests:item.requests,success_rate:successRate,priority,action,
   notes:[
    attempts>0?"Rever falhas, testes e limites do adaptador.":"Validar a disponibilidade da API oficial e as permissões necessárias.",
    "Criar alterações numa branch isolada; testar e rever antes de publicar.",
    "Nunca ativar um conector nem enviar dados privados sem autorização explícita."
   ]};
 }).sort((a,b)=>{
   const rank={high:0,medium:1,low:2};
   return rank[a.priority]-rank[b.priority]||b.requests-a.requests||a.capability.localeCompare(b.capability);
 });
}
