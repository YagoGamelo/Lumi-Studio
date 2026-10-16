"use client";
import {useEffect,useState} from "react";
import {BrainCircuit,Sparkles} from "lucide-react";

type Provider={id:"openai"|"anthropic"|"gemini";name:string;model:string;configured:boolean};
type Task="chat"|"code"|"plan"|"summarize";
type Selected="auto"|Provider["id"];
export default function AiRouterPanel(){
 const [providers,setProviders]=useState<Provider[]>([]);
 const [loading,setLoading]=useState(true);
 const [task,setTask]=useState<Task>("chat");
 const [provider,setProvider]=useState<Selected>("auto");
 const [prompt,setPrompt]=useState("");
 const [answer,setAnswer]=useState("");
 const [origin,setOrigin]=useState("");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);

 useEffect(()=>{
  let active=true;
  fetch("/api/ai/providers",{cache:"no-store"}).then(async response=>{
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Não foi possível consultar as IAs.");
   if(active)setProviders(data.providers||[]);
  }).catch(e=>{if(active)setMessage(e instanceof Error?e.message:"Erro de ligação.");})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[]);

 async function submit(){
  setBusy(true);setMessage("");setAnswer("");setOrigin("");
  try{
   const response=await fetch("/api/ai/chat",{method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({prompt,task,provider})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Não foi possível gerar a resposta.");
   setAnswer(data.text||"");setOrigin(data.provider+" · "+data.model);
   setMessage(data.note||"Resposta gerada.");
  }catch(e){setMessage(e instanceof Error?e.message:"Falha ao contactar a IA.");}
  finally{setBusy(false);}
 }
 const active=providers.filter(p=>p.configured);
 return <><div className="heading-row"><div>
  <h1><BrainCircuit size={24}/> LUMI AI Router</h1>
  <p>Uma entrada para diferentes IAs. A LUMI escolhe automaticamente uma das que estejam configuradas.</p>
 </div></div>
 <section className="section-panel">
  <h2>Modelos de texto disponíveis</h2>
  <p className="muted-info">A indicação «Configurada» apenas confirma a existência da chave no servidor. Não verifica o saldo, a API ou a disponibilidade em tempo real.</p>
  <div className="connect-grid" style={{marginTop:12}}>
   {providers.map(p=><div className="connect-card" key={p.id}><span className="bot-icon"><BrainCircuit size={18}/></span>
    <div><strong>{p.name}</strong><small>{p.model} · {p.configured?"Configurada":"Não configurada"}</small></div>
   </div>)}
  </div>
  {loading&&<p className="muted-info">A consultar os modelos...</p>}
  {!loading&&!active.length&&<p className="muted-info">Configura OPENAI_API_KEY, ANTHROPIC_API_KEY ou GEMINI_API_KEY no servidor para ativar o Router.</p>}
 </section>
 <section className="section-panel" style={{marginTop:16}}>
  <h2><Sparkles size={19}/> Experimentar a inteligência LUMI</h2>
  <div className="select-row">
   <div className="form-field"><label>Tipo de tarefa</label><select value={task} onChange={e=>setTask(e.target.value as Task)}>
    <option value="chat">Conversar</option><option value="code">Programar</option>
    <option value="plan">Planear</option><option value="summarize">Resumir</option>
   </select></div>
   <div className="form-field"><label>IA a utilizar</label><select value={provider} onChange={e=>setProvider(e.target.value as Selected)}>
    <option value="auto">Automática (LUMI escolhe)</option>
    {providers.map(p=><option key={p.id} value={p.id} disabled={!p.configured}>{p.name}{p.configured?"":" (indisponível)"}</option>)}
   </select></div>
  </div>
  <div className="form-field"><label>O teu pedido</label>
   <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={4000}
    placeholder="Ex.: Explica-me como criar um bot que recebe pedidos de ajuda no Discord..."/>
  </div>
  <button className="btn" disabled={busy||!active.length||prompt.trim().length<3} onClick={()=>void submit()}>
   <Sparkles size={16}/>{busy?"A consultar...":"Pedir à LUMI"}
  </button>
  {message&&<p className="muted-info" role="status" style={{marginTop:14}}>{message}</p>}
  {answer&&<div style={{marginTop:16}}><strong>Resposta · {origin}</strong>
   <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",lineHeight:1.6,overflowWrap:"anywhere",marginTop:10}}>{answer}</pre>
  </div>}
  <p className="muted-info" style={{marginTop:16}}>Beta: apenas geração de texto. Limite de 20 tentativas por dia e utilizador. O pedido é enviado à IA selecionada, sem executar ações em contas externas. Não introduzas dados sensíveis ou palavras-passe.</p>
 </section></>;
}
