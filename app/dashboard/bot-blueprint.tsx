"use client";
import {GitBranch,LockKeyhole,PlugZap,ShieldCheck} from "lucide-react";
import {UNIVERSAL_CAPABILITIES,type UniversalBlueprint} from "@/lib/bots/capabilities";

export default function BotBlueprintPreview({blueprint,onClose}:{
 blueprint:UniversalBlueprint;onClose?:()=>void;
}){
 return <section className="section-panel" style={{marginTop:14}}>
  <div className="heading-row" style={{marginBottom:8}}>
   <div><h2><GitBranch size={20}/> Árvore do teu bot</h2>
    <p className="muted-info">A LUMI dividiu a tua ideia em ramos que podem crescer e ligar-se a mais ferramentas.</p>
   </div>
   {onClose&&<button className="tiny-btn" onClick={onClose}>Fechar</button>}
  </div>
  <p className="muted-info"><strong>Objetivo:</strong> {blueprint.objective}</p>
  <div style={{display:"grid",gap:10,marginTop:16}}>
   {blueprint.nodes.map((node,index)=>{
    const desc=UNIVERSAL_CAPABILITIES[node.capability]?.description||"Capacidade em planeamento";
    return <div key={node.id} className="connect-card" style={{display:"block",padding:13}}>
     <div style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between"}}>
      <strong><span aria-hidden="true">{index===0?"✦":"↳"}</span> {node.label}</strong>
      <small>Planeado</small>
     </div>
     <p className="muted-info" style={{marginTop:5}}>{desc}</p>
     <small style={{display:"block",marginTop:5}}>Liga-se a: {node.connection}</small>
     {node.requires_approval&&<small style={{display:"block",marginTop:4}}>🔒 Precisa de autorização para executar ações</small>}
    </div>;
   })}
  </div>
  <div className="alert-grid" style={{marginTop:16}}>
   <div><h3><PlugZap size={17}/> Ligações necessárias</h3>
    <p className="muted-info">{blueprint.connections.join(" · ")}</p>
   </div>
   <div><h3><ShieldCheck size={17}/> Aprovações</h3>
    <p className="muted-info">{blueprint.approvals.length?
      blueprint.approvals.join(" · "):"Nenhuma ação externa identificada no planeamento."}</p>
   </div>
  </div>
  <div className="notice" style={{marginTop:14}}><LockKeyhole size={16}/> {blueprint.notice}</div>
 </section>;
}
