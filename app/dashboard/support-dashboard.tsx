"use client";
import {useEffect,useState} from "react";
import {Bot,Building2,CheckCircle2,Copy,Headphones,MessagesSquare,MessageCircle,Phone,Plus,RefreshCcw,Save,ShieldCheck,Trash2,UserRound,ExternalLink} from "lucide-react";
type BotItem={id:string;title:string;instruction:string;category:string;frequency:string;status:string};
type Profile={public_token:string;bot_id:string|null;business_name:string;knowledge:string;welcome:string;enabled:boolean;auto_reply:boolean};
type Thread={id:string;customer_name:string;channel:string;status:string;updated_at:string;customer_last4?:string|null};
type ChatMessage={id:string;role:"customer"|"human"|"bot";body:string;created_at:string};
type CallLog={id:string;caller_last4:string|null;status:string;direction:string;duration_seconds:number|null;summary:string;source:string;created_at:string;consent_to_transcribe:boolean};
export default function SupportDashboard({bots}:{bots:BotItem[]}){
 const [profile,setProfile]=useState<Profile>({public_token:"",bot_id:null,business_name:"A minha loja",knowledge:"",welcome:"Olá! Como podemos ajudar?",enabled:false,auto_reply:true});
 const [origin,setOrigin]=useState("");
 const [threads,setThreads]=useState<Thread[]>([]),[calls,setCalls]=useState<CallLog[]>([]);
 const [selected,setSelected]=useState(""),[messages,setMessages]=useState<ChatMessage[]>([]);
 const [reply,setReply]=useState(""),[callSummary,setCallSummary]=useState(""),[callerLast4,setCallerLast4]=useState("");
 const [callStatus,setCallStatus]=useState("received"),[callDuration,setCallDuration]=useState("");
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [notice,setNotice]=useState(""),[error,setError]=useState("");
 const [section,setSection]=useState<"inbox"|"calls"|"config">("config");
 const link=origin&&profile.public_token?origin+"/atendimento/"+profile.public_token:"";
 const knownBot=bots.find(b=>b.id===profile.bot_id);
 const caption=(date:string)=>{try{return new Date(date).toLocaleString("pt-PT",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});}catch{return date;}};
 async function json<T>(url:string,opts?:RequestInit):Promise<T>{
  const res=await fetch(url,{cache:"no-store",...opts});
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||"A operação não foi concluída.");return data as T;
 }
 const post=(value:unknown,method="POST"):RequestInit=>({method,headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
 async function fetchAll(){
  try{
   const [p,i,c]=await Promise.all([
    json<{profile:Profile|null}>("/api/support/profile"),
    json<{threads:Thread[]}>("/api/support/inbox"),
    json<{calls:CallLog[]}>("/api/support/calls")
   ]);
   if(p.profile)setProfile(p.profile);
   setThreads(i.threads);setCalls(c.calls);setError("");
  }catch(err){setError(err instanceof Error?err.message:"Atendimento indisponível.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{setOrigin(window.location.origin);void fetchAll();const interval=setInterval(()=>void fetchAll(),20000);return()=>clearInterval(interval);},[]);
 async function execute(action:()=>Promise<void>,success:string){
  setBusy(true);setError("");setNotice("");
  try{await action();setNotice(success);await fetchAll();}
  catch(e){setError(e instanceof Error?e.message:"Não foi possível concluir a operação.");}
  finally{setBusy(false);}
 }
 async function save(){
  await execute(async()=>{
   const r=await json<{profile:Profile}>("/api/support/profile",post({
    bot_id:profile.bot_id||null,business_name:profile.business_name,knowledge:profile.knowledge,
    welcome:profile.welcome,enabled:profile.enabled,auto_reply:profile.auto_reply
   }));
   setProfile(r.profile);
  },"Definições guardadas. O link público só recebe mensagens quando o atendimento estiver ativo.");
 }
 async function showConversation(id:string){
  setSelected(id);setSection("inbox");setMessages([]);setError("");
  try{const r=await json<{messages:ChatMessage[]}>("/api/support/inbox?id="+encodeURIComponent(id));setMessages(r.messages);}
  catch(e){setError(e instanceof Error?e.message:"Conversa indisponível.");}
 }
 async function changeConversation(id:string,patch:{reply?:string;status?:string}){
  await execute(async()=>{
   await json("/api/support/inbox",post({conversation_id:id,...patch},"PATCH"));
   const r=await json<{messages:ChatMessage[]}>("/api/support/inbox?id="+encodeURIComponent(id));
   setMessages(r.messages);setReply("");
  },"Conversa atualizada.");
 }
 async function deleteConversation(id:string){
  if(!confirm("Eliminar esta conversa e todas as mensagens?"))return;
  await execute(async()=>{await json("/api/support/inbox?id="+encodeURIComponent(id),{method:"DELETE"});if(selected===id){setSelected("");setMessages([]);}},"Conversa eliminada.");
 }
 async function addCall(){
  await execute(async()=>{
   await json("/api/support/calls",post({
    caller_last4:callerLast4.trim(),status:callStatus,direction:"inbound",
    duration_seconds:callDuration?Number(callDuration):null,summary:callSummary
   }));
   setCallSummary("");setCallerLast4("");setCallDuration("");
  },"Chamada registada.");
 }
 async function removeCall(id:string){
  if(!confirm("Eliminar este registo de chamada?"))return;
  await execute(async()=>{await json("/api/support/calls?id="+encodeURIComponent(id),{method:"DELETE"});},"Registo eliminado.");
 }
 async function copy(){
  try{await navigator.clipboard.writeText(link);setNotice("Link de atendimento copiado.");}catch{setError("Copia o link manualmente.");}
 }
 return <div className="support-dashboard">
  <div className="heading-row"><div><div className="section-kicker"><Headphones size={15}/> LUMI · BOTS UNIVERSAIS DE ATENDIMENTO</div><h1>Responde aos clientes. Acompanha tudo.</h1><p>Chat da loja, inteligência artificial, atendimento humano e registo de chamadas num só lugar.</p></div><button className="stream-control" disabled={busy||loading} onClick={()=>void fetchAll()}><RefreshCcw size={15}/> Atualizar</button></div>
  <div className="support-stats"><div><MessagesSquare size={21}/><strong>{threads.length}</strong><small>Conversas recentes</small></div><div><UserRound size={21}/><strong>{threads.filter(t=>t.status==="needs_human").length}</strong><small>A precisar de uma pessoa</small></div><div><Phone size={21}/><strong>{calls.length}</strong><small>Chamadas registadas</small></div></div>
  <div className="support-tabbar">
   {([["config","Configurar loja"],["inbox","Conversas"],["calls","Chamadas"]] as const).map(([key,label])=><button className={section===key?"active":""} key={key} onClick={()=>setSection(key)}>{label}</button>)}
  </div>
  {error&&<div className="notice" role="alert">{error}</div>}
  {notice&&<div className="notice" role="status">{notice}</div>}
  {section==="config"&&<div className="support-two-col">
   <section className="section-panel support-section"><div className="panel-heading"><div><h2><Building2 size={20}/> O teu bot de atendimento</h2><p>Podes usar qualquer bot que já criaste na LUMI.</p></div></div>
    <div className="form-field"><label>Nome da loja ou negócio</label><input maxLength={90} value={profile.business_name} onChange={e=>setProfile(p=>({...p,business_name:e.target.value}))}/></div>
    <div className="form-field"><label>Bot associado</label><select value={profile.bot_id||""} onChange={e=>setProfile(p=>({...p,bot_id:e.target.value||null}))}><option value="">Atendimento padrão</option>{bots.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}</select></div>
    <div className="form-field"><label>Informações oficiais da loja</label><textarea rows={7} maxLength={3500} value={profile.knowledge} onChange={e=>setProfile(p=>({...p,knowledge:e.target.value}))} placeholder={"Ex.: Horário: segunda a sexta 9h–18h.\nEntregas: 2 a 5 dias úteis.\nTrocas: contactar a equipa pelo chat.\nProdutos e preços confirmados: …"}/></div>
    <div className="form-field"><label>Mensagem de boas-vindas</label><input maxLength={280} value={profile.welcome} onChange={e=>setProfile(p=>({...p,welcome:e.target.value}))}/></div>
    <label className="support-check"><input type="checkbox" checked={profile.auto_reply} onChange={e=>setProfile(p=>({...p,auto_reply:e.target.checked}))}/> Responder automaticamente com IA (quando o serviço estiver configurado)</label>
    <label className="support-check"><input type="checkbox" checked={profile.enabled} onChange={e=>setProfile(p=>({...p,enabled:e.target.checked}))}/> Ativar o link público para receber clientes</label>
    <button className="btn full" onClick={save} disabled={busy}><Save size={16}/> Guardar atendimento</button>
    <p className="muted-info">A IA usa apenas as informações da loja e as instruções do bot. Se não souber responder, encaminha o pedido para atendimento humano. Sem chave de IA no servidor, apresenta uma resposta de espera.</p>
   </section>
   <section className="section-panel support-section"><div className="panel-heading"><div><h2><MessageCircle size={20}/> Instalar o chat na loja</h2><p>Partilha o link com clientes ou adiciona ao teu website.</p></div></div>
    {link?<><div className="support-share-link">{link}</div><div className="stream-controls"><button className="stream-control" onClick={copy}><Copy size={15}/> Copiar link</button><a className="stream-control" href={link} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Abrir chat</a></div>
    <div className="form-field"><label>Código para integrar num site (iframe)</label><textarea rows={3} readOnly value={'<iframe title="Atendimento '+profile.business_name.replace(/["><]/g,"")+'" src="'+link+'" width="380" height="600"></iframe>'}/></div></>:<p className="muted-info">Guarda a configuração para receber um link público.</p>}
    <div className="support-channels"><h3><ShieldCheck size={17}/> Canais externos</h3><p><strong>SMS e WhatsApp:</strong> preparada uma entrada de mensagens Twilio para uma loja piloto. Requer número autorizado e ligação segura.</p><p><strong>Chamadas:</strong> preparada uma entrada telefónica Twilio que explica o uso de IA, pede autorização para transcrição e guarda o resumo da chamada, sem gravar o áudio.</p><p><strong>Instagram, Messenger e outros:</strong> serão conectados pelas APIs oficiais, de acordo com as permissões de cada serviço.</p></div>
    {knownBot&&<p className="muted-info">Bot atual: {knownBot.title}.</p>}
   </section>
  </div>}
  {section==="inbox"&&<div className="support-two-col support-inbox-grid">
   <section className="section-panel support-section"><div className="panel-heading"><div><h2><MessagesSquare size={20}/> Conversas dos clientes</h2><p>Os pedidos que precisam de ajuda aparecem identificados.</p></div></div>
    {threads.length===0?<p className="muted-info">Ainda não há conversas. Ativa e partilha o link de atendimento com um cliente ou experimenta o chat.</p>:threads.map(t=><div key={t.id} className={"support-thread "+(selected===t.id?"selected":"")}><button onClick={()=>void showConversation(t.id)}><strong>{t.customer_name} {t.status==="needs_human"?"· Precisa de ajuda":""}</strong><span>{t.channel} · {caption(t.updated_at)} · {t.status==="closed"?"Fechada":"Aberta"}</span></button><button className="support-delete" title="Eliminar" onClick={()=>void deleteConversation(t.id)}><Trash2 size={15}/></button></div>)}
   </section>
   <section className="section-panel support-section"><div className="panel-heading"><div><h2><Bot size={20}/> Histórico da conversa</h2><p>Responde como pessoa ou fecha o pedido.</p></div></div>
    {!selected?<p className="muted-info">Escolhe uma conversa para ver as mensagens.</p>:<>
     <div className="support-admin-messages">{messages.map(m=><div className={"support-admin-message "+m.role} key={m.id}><strong>{m.role==="customer"?"Cliente":m.role==="bot"?"Assistente IA":"Equipa"}</strong><p>{m.body}</p><small>{caption(m.created_at)}</small></div>)}</div>
     <div className="form-field"><label>Responder ao cliente (aparece no chat)</label><textarea rows={3} maxLength={1200} value={reply} onChange={e=>setReply(e.target.value)} placeholder="Olá! Obrigado pelo contacto…"/></div>
     <div className="stream-controls"><button className="btn" disabled={busy||!reply.trim()} onClick={()=>void changeConversation(selected,{reply})}><MessageCircle size={16}/> Responder</button><button className="stream-control" disabled={busy} onClick={()=>void changeConversation(selected,{status:"closed"})}><CheckCircle2 size={16}/> Fechar</button></div>
     <p className="muted-info">Respostas humanas aparecem automaticamente no chat aberto pelo cliente. SMS e WhatsApp exigirão também um mecanismo de envio externo autorizado.</p>
    </>}
   </section>
  </div>}
  {section==="calls"&&<div className="support-two-col">
   <section className="section-panel support-section"><div className="panel-heading"><div><h2><Phone size={20}/> Registar uma chamada</h2><p>Mesmo antes de ligares um operador telefónico.</p></div></div>
    <div className="form-field"><label>Últimos 4 dígitos do número (opcional)</label><input maxLength={4} inputMode="numeric" value={callerLast4} onChange={e=>setCallerLast4(e.target.value.replace(/\D/g,""))} placeholder="1234"/></div>
    <div className="form-field"><label>Estado</label><select value={callStatus} onChange={e=>setCallStatus(e.target.value)}><option value="received">Recebida</option><option value="answered">Atendida</option><option value="missed">Não atendida</option><option value="completed">Concluída</option><option value="escalated">Encaminhada para pessoa</option></select></div>
    <div className="form-field"><label>Duração em segundos (opcional)</label><input type="number" min={0} max={86400} value={callDuration} onChange={e=>setCallDuration(e.target.value)} placeholder="90"/></div>
    <div className="form-field"><label>Notas do atendimento (não coloques dados sensíveis)</label><textarea maxLength={2000} rows={4} value={callSummary} onChange={e=>setCallSummary(e.target.value)} placeholder="O cliente pediu informações sobre horários e entregas…"/></div>
    <button className="btn full" onClick={addCall} disabled={busy}><Plus size={16}/> Guardar registo</button>
    <p className="muted-info">Por defeito não gravamos o áudio. Um operador Twilio autorizado pode adicionar registos automáticos de chamadas, mediante informação e autorização do cliente para transcrição.</p>
   </section>
   <section className="section-panel support-section"><div className="panel-heading"><div><h2><Headphones size={20}/> Histórico de chamadas</h2><p>{calls.length} registos recentes.</p></div></div>
    {calls.length===0?<p className="muted-info">Ainda não há chamadas registadas.</p>:calls.map(call=><div className="support-call" key={call.id}><div><strong>{call.caller_last4?"Número terminado em "+call.caller_last4:"Número não identificado"}</strong><small>{caption(call.created_at)} · {call.status} · {call.source==="twilio"?"Telefone integrado":"Registo manual"}</small>{call.duration_seconds!=null&&<small>Duração: {call.duration_seconds} segundos</small>}</div><p>{call.summary||"Sem notas."}</p><button title="Eliminar registo" onClick={()=>void removeCall(call.id)} disabled={busy}><Trash2 size={14}/> Apagar</button></div>)}
   </section>
  </div>}
 </div>;
}
