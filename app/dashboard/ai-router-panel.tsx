"use client";
import {useEffect,useState} from "react";
import {BrainCircuit,BookOpen,Sparkles,Trash2} from "lucide-react";
import WorldPanel from "./world-panel";

type Provider={id:"lumi"|"openai"|"anthropic"|"gemini";name:string;model:string;configured:boolean};
type Task="chat"|"code"|"plan"|"summarize";
type Selected="auto"|Provider["id"];
type Note={id:string;title:string;content:string;created_at:string};

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
 const [notes,setNotes]=useState<Note[]>([]);
 const [noteTitle,setNoteTitle]=useState("");
 const [noteContent,setNoteContent]=useState("");
 const [useKnowledge,setUseKnowledge]=useState(false);
 const [useWorld,setUseWorld]=useState(true);
 const [knowledgeMessage,setKnowledgeMessage]=useState("");
 const [saving,setSaving]=useState(false);

 useEffect(()=>{
  let active=true;
  fetch("/api/ai/providers",{cache:"no-store"}).then(async response=>{
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Não foi possível consultar as IAs.");
   if(active)setProviders(data.providers||[]);
  }).catch(e=>{if(active)setMessage(e instanceof Error?e.message:"Erro de ligação.");})
   .finally(()=>{if(active)setLoading(false);});
  fetch("/api/ai/knowledge",{cache:"no-store"}).then(async response=>{
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Biblioteca indisponível.");
   if(active)setNotes(data.items||[]);
  }).catch(e=>{if(active)setKnowledgeMessage(e instanceof Error?e.message:"Biblioteca indisponível.");});
  return ()=>{active=false;};
 },[]);

 async function submit(){
  setBusy(true);setMessage("");setAnswer("");setOrigin("");
  try{
   const response=await fetch("/api/ai/chat",{method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({prompt,task,provider,useKnowledge,useWorld})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Não foi possível gerar a resposta.");
   setAnswer(data.text||"");setOrigin(data.provider+" · "+data.model);
   setMessage("LUMI AI respondeu. Notas pessoais: "+(data.knowledgeUsed||0)+". Referências públicas: "+(data.worldUsed||0)+". Nenhuma ação externa executada.");
  }catch(e){setMessage(e instanceof Error?e.message:"Falha ao contactar a IA.");}
  finally{setBusy(false);}
 }

 async function saveNote(){
  setSaving(true);setKnowledgeMessage("");
  try{
   const response=await fetch("/api/ai/knowledge",{method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({title:noteTitle,content:noteContent})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Não foi possível guardar.");
   setNotes(old=>[data.item,...old]);setNoteTitle("");setNoteContent("");
   setKnowledgeMessage("Nota privada guardada. Só será consultada nos pedidos em que autorizares.");
  }catch(e){setKnowledgeMessage(e instanceof Error?e.message:"Erro ao guardar.");}
  finally{setSaving(false);}
 }

 async function removeNote(id:string){
  if(!window.confirm("Eliminar definitivamente esta nota da biblioteca LUMI?"))return;
  setSaving(true);setKnowledgeMessage("");
  try{
   const response=await fetch("/api/ai/knowledge",{method:"DELETE",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Erro ao eliminar.");
   setNotes(old=>old.filter(x=>x.id!==id));
   setKnowledgeMessage("Nota eliminada.");
  }catch(e){setKnowledgeMessage(e instanceof Error?e.message:"Erro ao eliminar.");}
  finally{setSaving(false);}
 }

 const active=providers.filter(p=>p.configured);
 return <><div className="heading-row"><div>
  <h1><BrainCircuit size={24}/> LUMI AI · Cérebro híbrido</h1>
  <p>A tua inteligência central: modelo próprio quando estiver alojado e, como ferramentas auxiliares, OpenAI, Gemini e Claude.</p>
 </div></div>
 <section className="section-panel">
  <h2>O cérebro e as IAs disponíveis</h2>
  <p className="muted-info">«Configurada» significa que existem credenciais no servidor, não que o modelo foi testado. A LUMI tem identidade própria mesmo quando consulta outras IAs.</p>
  <div className="connect-grid" style={{marginTop:12}}>
   {providers.map(p=><div className="connect-card" key={p.id}>
    <span className="bot-icon"><BrainCircuit size={18}/></span>
    <div><strong>{p.name}</strong><small>{p.model} · {p.configured?"Configurada":"Não configurada"}</small></div>
   </div>)}
  </div>
  {loading&&<p className="muted-info">A consultar os modelos...</p>}
  {!loading&&!active.length&&<p className="muted-info">É necessário configurar pelo menos uma IA na Vercel ou alojar o modelo próprio num servidor seguro.</p>}
 </section>
 <section className="section-panel" style={{marginTop:16}}>
  <h2><Sparkles size={19}/> Conversar com a LUMI AI</h2>
  <div className="select-row">
   <div className="form-field"><label>Tipo de tarefa</label><select value={task} onChange={e=>setTask(e.target.value as Task)}>
    <option value="chat">Conversar</option><option value="code">Programar</option>
    <option value="plan">Planear</option><option value="summarize">Resumir</option>
   </select></div>
   <div className="form-field"><label>Motor a utilizar</label><select value={provider} onChange={e=>setProvider(e.target.value as Selected)}>
    <option value="auto">Automático — LUMI escolhe</option>
    {providers.map(p=><option key={p.id} value={p.id} disabled={!p.configured}>{p.name}{p.configured?"":" (indisponível)"}</option>)}
   </select></div>
  </div>
  <div className="form-field"><label>O teu pedido</label>
   <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={4000}
    placeholder="Olá LUMI AI! Ajuda-me a criar um bot para o Discord."/>
  </div>
  <label style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}>
   <input type="checkbox" checked={useWorld} onChange={e=>setUseWorld(e.target.checked)}/>
   Usar referências externas do LUMI Mundo (títulos públicos, não verificados)
  </label>
  <label style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}>
   <input type="checkbox" checked={useKnowledge} onChange={e=>setUseKnowledge(e.target.checked)}/>
   Consultar notas relevantes da minha biblioteca neste pedido
  </label>
  <button className="btn" disabled={busy||!active.length||prompt.trim().length<3} onClick={()=>void submit()}>
   <Sparkles size={16}/>{busy?"A consultar...":"Pedir à LUMI AI"}
  </button>
  {message&&<p className="muted-info" role="status" style={{marginTop:14}}>{message}</p>}
  {answer&&<div style={{marginTop:16}}><strong>Resposta da LUMI AI · motor: {origin}</strong>
   <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",lineHeight:1.6,overflowWrap:"anywhere",marginTop:10}}>{answer}</pre>
  </div>}
  <p className="muted-info" style={{marginTop:16}}>Limite beta: 20 tentativas por dia. As IAs externas recebem o pedido e, apenas com a opção acima ativada, as notas selecionadas. Não coloques palavras-passe ou dados sensíveis.</p>
 </section>
 <section className="section-panel" style={{marginTop:16}}>
  <h2><BookOpen size={19}/> Biblioteca de conhecimento LUMI</h2>
  <p className="muted-info">Guarda apenas informação que tens direito a utilizar. A memória é privada da tua conta, não é treino automático, e não entra nos pedidos sem autorização. Até 50 notas nesta beta.</p>
  <div className="form-field"><label>Título da nota</label>
   <input value={noteTitle} maxLength={80} onChange={e=>setNoteTitle(e.target.value)} placeholder="Ex.: Regras do meu servidor Discord"/>
  </div>
  <div className="form-field"><label>Conhecimento</label>
   <textarea value={noteContent} maxLength={1500} onChange={e=>setNoteContent(e.target.value)} placeholder="Escreve as regras ou informações que a LUMI deve poder consultar."/>
  </div>
  <button className="btn-outline" disabled={saving||noteTitle.trim().length<3||noteContent.trim().length<10} onClick={()=>void saveNote()}>
   <BookOpen size={16}/> Guardar nota
  </button>
  {knowledgeMessage&&<p className="muted-info" role="status" style={{marginTop:10}}>{knowledgeMessage}</p>}
  <div style={{display:"grid",gap:10,marginTop:16}}>
   {notes.map(n=><div className="connect-card" key={n.id}>
    <div style={{flex:1}}><strong>{n.title}</strong><small>{n.content}</small></div>
    <button className="tiny-btn" disabled={saving} onClick={()=>void removeNote(n.id)} aria-label={"Eliminar nota "+n.title}><Trash2 size={14}/></button>
   </div>)}
  </div>
 </section>
 <WorldPanel/>
 </>;
}
