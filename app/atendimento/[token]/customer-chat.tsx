"use client";
import {useEffect,useState} from "react";
type Msg={id:string;role:"customer"|"bot"|"human";body:string;created_at:string};
type Shop={name:string;welcome:string;auto_reply:boolean};
export default function CustomerChat({token}:{token:string}){
 const [shop,setShop]=useState<Shop|null>(null),[messages,setMessages]=useState<Msg[]>([]);
 const [conversation,setConversation]=useState(""),[accessKey,setAccessKey]=useState("");
 const [name,setName]=useState(""),[message,setMessage]=useState(""),[notice,setNotice]=useState(""),[loading,setLoading]=useState(false);
 const api="/api/support/public/"+token;
 useEffect(()=>{
  let active=true;
  const init=async()=>{
   try{
    let id="",secret="";
    try{const saved=sessionStorage.getItem("lumi_support_"+token);if(saved){const s=JSON.parse(saved);id=s.id||"";secret=s.secret||"";}}catch{}
    const url=id&&secret?api+"?conversation_id="+encodeURIComponent(id)+"&access_secret="+encodeURIComponent(secret):api;
    const res=await fetch(url,{cache:"no-store"}),data=await res.json();
    if(!active)return;
    if(!res.ok)throw Error(data.error||"Chat indisponível.");
    setShop(data.shop);setMessages(data.messages||[]);
    if(id&&secret&&data.messages){setConversation(id);setAccessKey(secret);}
   }catch(err){if(active)setNotice(err instanceof Error?err.message:"Chat indisponível.");}
  };void init();
  return()=>{active=false;};
 },[api,token]);
 useEffect(()=>{
  if(!conversation||!accessKey)return;
  let alive=true;
  const refresh=async()=>{
   try{
    const res=await fetch(api+"?conversation_id="+conversation+"&access_secret="+accessKey,{cache:"no-store"});
    const data=await res.json();
    if(alive&&res.ok&&data.messages)setMessages(data.messages);
   }catch{}
  };
  const interval=setInterval(()=>void refresh(),7000);
  return()=>{alive=false;clearInterval(interval);};
 },[api,conversation,accessKey]);
 async function send(){
  if(!message.trim()||loading)return;
  setLoading(true);setNotice("");
  try{
   const payload:{message:string;customer_name?:string;conversation_id?:string;access_secret?:string}={message:message.trim()};
   if(conversation&&accessKey){payload.conversation_id=conversation;payload.access_secret=accessKey;}
   else if(name.trim())payload.customer_name=name.trim();
   const res=await fetch(api,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const data=await res.json();
   if(!res.ok)throw Error(data.error||"Não foi possível enviar.");
   const id=String(data.conversation_id),secret=String(data.access_secret||accessKey);
   if(id&&secret){sessionStorage.setItem("lumi_support_"+token,JSON.stringify({id,secret}));setConversation(id);setAccessKey(secret);}
   setMessages(old=>[...old,{id:"local-"+Date.now(),role:"customer",body:payload.message,created_at:new Date().toISOString()},{id:"answer-"+Date.now(),role:"bot",body:data.reply,created_at:new Date().toISOString()}]);
   setMessage("");if(data.needs_human)setNotice("O pedido ficou sinalizado para atendimento humano.");
  }catch(err){setNotice(err instanceof Error?err.message:"Erro de ligação.");}
  finally{setLoading(false);}
 }
 return <main className="support-public-page"><div className="support-chat-frame"><header><span className="support-identity">✦ LUMI ATENDIMENTO</span><h1>{shop?.name||"Chat com a loja"}</h1><p>{shop?.welcome||"A preparar o atendimento…"}</p></header>
  <section className="support-chat-history" aria-live="polite">
   {messages.length===0&&<p className="support-chat-welcome">As respostas automáticas são geradas a partir das informações fornecidas pela loja. Podes pedir ajuda de uma pessoa se precisares.</p>}
   {messages.map(m=><div key={m.id} className={"support-chat-bubble "+(m.role==="customer"?"mine":"agent")}><small>{m.role==="customer"?"Tu":m.role==="human"?"Equipa":"Assistente IA"}</small><p>{m.body}</p></div>)}
  </section>
  {!conversation&&<label className="support-name-label">Como te podemos tratar? (opcional)<input value={name} onChange={e=>setName(e.target.value)} maxLength={70} placeholder="O teu primeiro nome"/></label>}
  <form onSubmit={e=>{e.preventDefault();void send();}} className="support-chat-form"><input aria-label="Escreve a tua mensagem" value={message} onChange={e=>setMessage(e.target.value)} maxLength={1200} placeholder="Olá, queria saber…" disabled={!shop||loading}/><button disabled={!shop||loading||!message.trim()}>{loading?"A enviar…":"Enviar"}</button></form>
  {notice&&<p className="support-chat-notice" role="status">{notice}</p>}
  <footer>Ao enviares uma mensagem, ela fica guardada para a loja te poder responder. Não envies palavras-passe nem dados bancários. Não somos um serviço de emergência.</footer>
 </div></main>;
}
