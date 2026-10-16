import "server-only";
import {createUniversalBlueprint, type UniversalBlueprint, type UniversalCapability} from "@/lib/bots/capabilities";

/**
 * First executable LUMI capability adapters. These produce LOCAL DRAFTS ONLY:
 * no OAuth, provider calls, scheduled jobs or external side effects.
 * New adapters must be reviewed and explicitly added to this allowlist.
 */
type DraftContext={title:string;instruction:string;objective:string};
type DraftResult={capability:UniversalCapability;title:string;content:string};
type DraftAdapter=(context:DraftContext)=>DraftResult;

const adapters:Partial<Record<UniversalCapability,DraftAdapter>>={
 "documents.draft":({title,instruction,objective})=>({
   capability:"documents.draft",
   title:"Rascunho de documento",
   content:`# ${title}\n\n## Objetivo\n${objective}\n\n## Instruções fornecidas\n${instruction}\n\n## Próximas etapas\n- Rever e completar a informação.\n- Validar os detalhes com a pessoa responsável.\n- Aprovar o documento antes de o partilhar.\n\nRascunho local; nenhum documento foi enviado ou publicado.`
 }),
 "calendar.draft":({title,instruction,objective})=>({
   capability:"calendar.draft",
   title:"Proposta de agenda",
   content:`Agenda proposta para: ${title}\n\nObjetivo: ${objective}\n\nPedido: ${instruction}\n\nPara agendar: confirmar data, hora, fuso horário, duração e participantes.\n\nAinda não foi criado nenhum evento em calendários externos.`
 })
};

export const EXECUTABLE_DRAFT_CAPABILITIES=Object.freeze(Object.keys(adapters) as UniversalCapability[]);

export function executeDraftCapabilities(bot:{title:string;instruction:string}, blueprintInput:unknown){
 const fallback=createUniversalBlueprint(bot.instruction);
 const candidate=blueprintInput as Partial<UniversalBlueprint>|null;
 const valid=candidate&&candidate.version===1&&Array.isArray(candidate.nodes);
 const blueprint=valid?candidate as UniversalBlueprint:fallback;
 // Only the capability IDs of a blueprint are consumed. Labels, dependencies and
 // supplied metadata are never interpreted as code or authority to perform actions.
 const selected=new Set<UniversalCapability>();
 for(const node of blueprint.nodes.slice(0,20)){
   if(node&&typeof node.capability==="string"&&Object.prototype.hasOwnProperty.call(adapters,node.capability))
     selected.add(node.capability as UniversalCapability);
 }
 const context:DraftContext={
   title:bot.title.slice(0,75),
   instruction:bot.instruction.slice(0,2500),
   objective:(typeof blueprint.objective==="string"?blueprint.objective:bot.instruction).slice(0,750)
 };
 const outputs:DraftResult[]=[];
 for(const id of EXECUTABLE_DRAFT_CAPABILITIES){
   if(selected.has(id)){const adapter=adapters[id];if(adapter)outputs.push(adapter(context));}
 }
 return {
   status:outputs.length?"draft_created" as const:"not_available" as const,
   outputs,
   output:outputs.length
    ?outputs.map(x=>`${x.title}\n\n${x.content}`).join("\n\n---\n\n")
    :"Este bot tem uma árvore de capacidades, mas ainda não possui uma ferramenta de execução disponível. Por agora, apenas os rascunhos de documentos e propostas de agenda podem ser gerados localmente. Discord, SMS, WhatsApp e alterações em calendários externos continuam desativados.",
   executed_capabilities:outputs.map(x=>x.capability),
   notice:"Motor beta: sem envios, agendamentos, integrações externas ou ações automáticas."
 };
}
