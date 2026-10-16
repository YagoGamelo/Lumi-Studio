"use client";
import {useEffect,useState} from "react";
import {Globe2,ExternalLink} from "lucide-react";

type Observation={id:string;source_id:string;title:string;source_url:string;published_at:string|null};

export default function WorldPanel(){
 const [items,setItems]=useState<Observation[]>([]);
 const [notice,setNotice]=useState("");
 useEffect(()=>{
  let active=true;
  fetch("/api/ai/world",{cache:"no-store"}).then(async response=>{
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Ainda sem fontes externas.");
   if(active)setItems(data.items||[]);
  }).catch(e=>{if(active)setNotice(e instanceof Error?e.message:"Sem índice público.");});
  return ()=>{active=false;};
 },[]);
 return <section className="section-panel" style={{marginTop:16}}>
  <h2><Globe2 size={19}/> LUMI Mundo · Descoberta externa</h2>
  <p className="muted-info">
   A LUMI explora fontes externas de forma controlada. Nesta versão recebe apenas
   títulos e links de feeds públicos da NASA e do arXiv; não leu artigos completos,
   não viu vídeos e não treinou um modelo. Conversas pessoais não alimentam este índice.
  </p>
  {notice&&<p className="muted-info" role="status">{notice}</p>}
  {!notice&&!items.length&&<p className="muted-info">
   Ainda sem descobertas. Depois da migração SQL e do primeiro ciclo do agendador,
   as referências aparecerão aqui.
  </p>}
  <div style={{display:"grid",gap:10,marginTop:12}}>
   {items.slice(0,12).map(entry=><div className="connect-card" key={entry.id}>
    <span className="bot-icon"><Globe2 size={18}/></span>
    <div style={{flex:1,minWidth:0}}>
     <strong>{entry.title}</strong>
     <small>{entry.source_id==="arxiv-ai"?"arXiv · IA":"NASA · Notícias"} · Apenas título, não verificado</small>
     <a href={entry.source_url} target="_blank" rel="noopener noreferrer"
      style={{fontSize:13,display:"inline-flex",alignItems:"center",gap:5,marginTop:5}}>
      Consultar fonte original <ExternalLink size={13}/>
     </a>
    </div>
   </div>)}
  </div>
 </section>;
}
