"use client";
import {useEffect,useRef,useState} from "react";
import {BrainCircuit,BookOpen,CheckCircle2,History,MessageSquarePlus,Send,
 Sparkles,Trash2,Factory,ShieldCheck} from "lucide-react";

type Thread={id:string;title:string;created_at:string;updated_at:string};
type Message={id:string;role:"user"|"assistant";content:string;created_at?:string};
type Note={id:string;title:string;content:string;created_at:string};
const QUICK_PROMPTS=[
 "Quero criar um bot universal do zero. Que informações precisas?",
 "Desenha um bot Discord com moderação e aprovações.",
 "Quero automatizar tarefas entre várias aplicações.",
 "Ajuda-me a testar e melhorar as raízes de um bot."
];

export default function AiRouterPanel(){
 const [threads,setThreads]=useState<Thread[]>([]);
 const [activeId,setActiveId]=useState<string|null>(null);
 const [messages,setMessages]=useState<Message[]>([]);
 const [prompt,setPrompt]=useState("");
 const [busy,setBusy]=useState(false);
 const [loadingThread,setLoadingThread]=useState(false);
 const [loading,setLoading]=useState(true);
 const [available,setAvailable]=useState(false);
 const [historyOpen,setHistoryOpen]=useState(false);
 const [notice,setNotice]=useState("");
 const [notes,setNotes]=useState<Note[]>([]);
 const [noteTitle,setNoteTitle]=useState("");
 const [noteContent,setNoteContent]=useState("");
 const [useKnowledge,setUseKnowledge]=useState(false);
 const [knowledgeMessage,setKnowledgeMessage]=useState("");
 const [saving,setSaving]=useState(false);
 const bottomRef=useRef<HTMLDivElement>(null);
 const scrollRef=useRef<HTMLDivElement>(null);
 const requestCounter=useRef(0);

 async function refreshThreads(){
  const response=await fetch("/api/ai/conversations",{cache:"no-store"});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||"Não foi possível carregar o histórico.");
  setThreads(data.conversations||[]);
 }
 useEffect(()=>{
  let active=true;
  Promise.allSettled([
   fetch("/api/ai/providers",{cache:"no-store"}).then(r=>r.json()).then(data=>{
    if(active)setAvailable(Boolean(data.providers?.some((x:{configured:boolean})=>x.configured)));
   }),
   fetch("/api/ai/conversations",{cache:"no-store"}).then(async r=>{
    const data=await r.json();
    if(!r.ok)throw new Error(data.error||"Histórico indisponível.");
    if(active)setThreads(data.conversations||[]);
   }),
   fetch("/api/ai/knowledge",{cache:"no-store"}).then(async r=>{
    const data=await r.json();
    if(!r.ok)throw new Error(data.error||"Biblioteca indisponível.");
    if(active)setNotes(data.items||[]);
   }).catch(e=>{
    if(active)setKnowledgeMessage(e instanceof Error?e.message:"Biblioteca indisponível.");
   })
  ]).then(results=>{
   const failure=results[1];
   if(active&&failure.status==="rejected")
    setNotice(failure.reason instanceof Error?failure.reason.message:"O histórico não está configurado.");
  }).finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[]);
 useEffect(()=>{
  if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;
 },[messages,busy,activeId]);

 async function openThread(id:string){
  if(busy||loadingThread)return;
  const key=++requestCounter.current;
  setLoadingThread(true);setNotice("");setHistoryOpen(false);
  try{
   const response=await fetch("/api/ai/conversations/"+encodeURIComponent(id),{cache:"no-store"});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Não foi possível abrir a conversa.");
   if(key!==requestCounter.current)return;
   setActiveId(id);setMessages(data.messages||[]);setPrompt("");
  }catch(e){if(key===requestCounter.current)setNotice(e instanceof Error?e.message:"Falha ao abrir conversa.");}
  finally{if(key===requestCounter.current)setLoadingThread(false);}
 }
 function newThread(){
  if(busy)return;
  ++requestCounter.current;setActiveId(null);setMessages([]);
  setPrompt("");setNotice("");setHistoryOpen(false);
 }
 async function removeThread(id:string){
  if(busy||!window.confirm("Eliminar esta conversa e todas as suas mensagens?"))return;
  setNotice("");
  try{
   const response=await fetch("/api/ai/conversations/"+encodeURIComponent(id),{method:"DELETE"});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Falha ao eliminar conversa.");
   setThreads(old=>old.filter(x=>x.id!==id));
   if(activeId===id){setActiveId(null);setMessages([]);}
   setNotice("Conversa eliminada.");
  }catch(e){setNotice(e instanceof Error?e.message:"Não foi possível eliminar.");}
 }
 async function submit(){
  const text=prompt.trim();
  if(busy||loadingThread||text.length<3||!available)return;
  setBusy(true);setNotice("");setPrompt("");
  const localMessage:Message={id:"pending-"+Date.now(),role:"user",content:text};
  setMessages(old=>[...old,localMessage]);
  try{
   const response=await fetch("/api/ai/chat",{method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({prompt:text,conversationId:activeId,useKnowledge})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"A LUMI não conseguiu responder.");
   const answer:Message={id:"answer-"+Date.now(),role:"assistant",content:data.text||""};
   setMessages(old=>[...old,answer]);
   if(data.saved&&data.conversationId)setActiveId(data.conversationId);
   setNotice(data.saved?"":data.warning||"Resposta recebida, mas o histórico não foi guardado.");
   if(data.saved)await refreshThreads().catch(()=>setNotice("Resposta guardada, mas não foi possível atualizar a lista de conversas."));
  }catch(e){
   setMessages(old=>old.filter(item=>item.id!==localMessage.id));
   setPrompt(text);
   setNotice(e instanceof Error?e.message:"Erro ao contactar a LUMI AI.");
  }finally{setBusy(false);}
 }

 async function saveNote(){
  setSaving(true);setKnowledgeMessage("");
  try{
   const response=await fetch("/api/ai/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({title:noteTitle,content:noteContent})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Não foi possível guardar.");
   setNotes(old=>[data.item,...old]);setNoteTitle("");setNoteContent("");
   setKnowledgeMessage("Nota privada guardada. Não é usada para treinar a LUMI.");
  }catch(e){setKnowledgeMessage(e instanceof Error?e.message:"Erro ao guardar.");}
  finally{setSaving(false);}
 }
 async function removeNote(id:string){
  if(!window.confirm("Eliminar esta nota da biblioteca privada?"))return;
  setSaving(true);setKnowledgeMessage("");
  try{
   const response=await fetch("/api/ai/knowledge",{method:"DELETE",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
   if(!response.ok){const data=await response.json();throw new Error(data.error||"Erro ao eliminar.");}
   setNotes(old=>old.filter(item=>item.id!==id));
   setKnowledgeMessage("Nota eliminada.");
  }catch(e){setKnowledgeMessage(e instanceof Error?e.message:"Erro ao eliminar.");}
  finally{setSaving(false);}
 }

 return <div className="lumi-ai-page">
  <div className="lumi-ai-top">
   <div>
    <span className="lumi-ai-eyebrow"><Sparkles size={14}/> A tua inteligência central</span>
    <h1><BrainCircuit size={27}/> LUMI AI</h1>
    <p>O cérebro da tua fábrica de bots universais. Planeia, constrói ideias e evolui com testes.</p>
   </div>
   <a className="lumi-builder-link" href="/dashboard?tab=bots"><Factory size={16}/> Abrir LUMI Builder</a>
  </div>
  <div className="lumi-chat-layout">
   <aside className={"lumi-thread-sidebar"+(historyOpen?" is-open":"")} aria-label="Histórico das minhas conversas">
    <div className="lumi-thread-head">
     <strong><History size={17}/> Conversas</strong>
     <button type="button" className="lumi-thread-new" disabled={busy} onClick={newThread}>
      <MessageSquarePlus size={15}/> Nova
     </button>
    </div>
    <div className="lumi-thread-list">
     {loading&&<small>Carregando...</small>}
     {!loading&&!threads.length&&<p>Ainda não tens conversas guardadas. Começa a falar com a LUMI.</p>}
     {threads.map(t=><div className={"lumi-thread-item"+(t.id===activeId?" active":"")} key={t.id}>
      <button type="button" onClick={()=>void openThread(t.id)} disabled={busy||loadingThread}
       aria-current={t.id===activeId?"page":undefined} title={t.title}>
       <strong>{t.title}</strong>
       <small>{new Date(t.updated_at).toLocaleDateString("pt-PT",{day:"2-digit",month:"short"})}</small>
      </button>
      <button type="button" className="lumi-thread-delete" disabled={busy||loadingThread}
       onClick={()=>void removeThread(t.id)} aria-label={"Eliminar conversa "+t.title}>
       <Trash2 size={15}/>
      </button>
     </div>)}
    </div>
    <div className="lumi-thread-privacy"><ShieldCheck size={15}/>
     <span>Histórico privado da tua conta. Podes apagar as conversas.</span>
    </div>
   </aside>
   <section className="lumi-chat-stage" aria-label="Conversa com a LUMI AI">
    <header className="lumi-chat-header">
     <span className="lumi-chat-identity"><span className="lumi-ai-avatar"><BrainCircuit size={21}/></span>
      <span><strong>LUMI AI</strong><small>Especialista em bots universais</small></span>
     </span>
     <div className="lumi-chat-header-actions">
      <button className="lumi-mobile-history" type="button" onClick={()=>setHistoryOpen(old=>!old)}>
       <History size={17}/> Histórico
      </button>
      <button type="button" onClick={newThread} disabled={busy} className="lumi-new-chat">
       <MessageSquarePlus size={16}/> <span>Nova conversa</span>
      </button>
     </div>
    </header>
    <div className="lumi-chat-scroll" ref={scrollRef} role="log" aria-live="polite">
     {!messages.length&&!loadingThread&&<div className="lumi-chat-welcome">
      <div className="lumi-welcome-logo"><BrainCircuit size={36}/></div>
      <h2>Vamos criar algo extraordinário?</h2>
      <p>Sou a LUMI AI. O meu foco é ajudar-te a imaginar, planear e aperfeiçoar bots para qualquer finalidade. Podemos continuar a desenvolver ideias em várias conversas.</p>
      <div className="lumi-quick-prompts">
       {QUICK_PROMPTS.map(text=><button type="button" key={text} onClick={()=>setPrompt(text)}
        disabled={busy||!available}>{text}</button>)}
      </div>
     </div>}
     {loadingThread&&<p className="lumi-chat-loading">A abrir a tua conversa...</p>}
     {messages.map(message=><div key={message.id} className={"lumi-chat-row "+message.role}>
      {message.role==="assistant"&&<span className="lumi-msg-avatar"><BrainCircuit size={16}/></span>}
      <div className="lumi-chat-bubble">
       {message.role==="assistant"&&<strong>LUMI AI</strong>}
       <p>{message.content}</p>
      </div>
     </div>)}
     {busy&&<div className="lumi-chat-row assistant"><span className="lumi-msg-avatar"><BrainCircuit size={16}/></span>
      <div className="lumi-chat-bubble"><p>A LUMI está a preparar a resposta...</p></div>
     </div>}
     <div ref={bottomRef}/>
    </div>
    <form className="lumi-chat-compose" onSubmit={event=>{event.preventDefault();void submit();}}>
     {notice&&<p className="lumi-chat-notice" role="status">{notice}</p>}
     {!available&&!loading&&<p className="lumi-chat-notice" role="status">
      Ainda não há um motor de IA disponível. Verifica a configuração na Vercel.
     </p>}
     <div className="lumi-compose-row">
      <textarea aria-label="Mensagem para a LUMI AI" rows={2} maxLength={4000}
       value={prompt} onChange={event=>setPrompt(event.target.value)}
       placeholder="Fala com a LUMI... Que bot vamos criar ou melhorar?"/>
      <button type="submit" aria-label="Enviar mensagem" disabled={busy||loadingThread||!available||prompt.trim().length<3}>
       <Send size={19}/>
      </button>
     </div>
     <label className="lumi-chat-consent">
      <input type="checkbox" checked={useKnowledge} onChange={e=>setUseKnowledge(e.target.checked)}/>
      Consultar a minha biblioteca privada nesta resposta
     </label>
     <small>O histórico serve para retomares conversas. A LUMI não o utiliza para treinar modelos; pedidos podem ser enviados à API de inferência configurada. Beta: 20 respostas/dia.</small>
    </form>
   </section>
  </div>
  <details className="lumi-chat-knowledge">
   <summary><BookOpen size={19}/> Biblioteca de conhecimento privada <span>Gerir notas</span></summary>
   <div className="lumi-knowledge-inner">
    <p className="muted-info">Estas notas são apenas tuas. A LUMI só as consulta quando ativares a opção no chat. Não são usadas para treino do modelo.</p>
    <div className="form-field"><label>Título da nota</label>
     <input maxLength={80} value={noteTitle} onChange={e=>setNoteTitle(e.target.value)} placeholder="Ex.: Estrutura dos meus bots"/>
    </div>
    <div className="form-field"><label>Informação</label>
     <textarea maxLength={1500} value={noteContent} onChange={e=>setNoteContent(e.target.value)} placeholder="Conhecimento que autorizo a LUMI a consultar"/>
    </div>
    <button className="btn-outline" type="button" disabled={saving||noteTitle.trim().length<3||noteContent.trim().length<10}
     onClick={()=>void saveNote()}><CheckCircle2 size={16}/> Guardar nota</button>
    {knowledgeMessage&&<p className="muted-info" role="status">{knowledgeMessage}</p>}
    {notes.map(n=><div className="lumi-knowledge-item" key={n.id}>
     <div><strong>{n.title}</strong><p>{n.content}</p></div>
     <button type="button" onClick={()=>void removeNote(n.id)} disabled={saving} aria-label={"Eliminar nota "+n.title}>
      <Trash2 size={15}/>
     </button>
    </div>)}
   </div>
  </details>
 </div>;
}
