"use client";
import {useEffect,useState} from "react";
import {AlarmClock,Bell,BellRing,CalendarDays,CheckCircle2,Clock,Download,MessageCircle,Phone,RefreshCcw,Send,ShieldCheck,Trash2} from "lucide-react";
type Bot={id:string;title:string;instruction:string;category:string;frequency:string;status:string};
type Channel="inapp"|"sms"|"whatsapp";
type Schedule={id:string;bot_id:string;channel:Channel;time_local:string;timezone:string;recurrence:"daily"|"weekdays"|"weekly";weekday:number|null;message:string;enabled:boolean;next_run_at:string;last_error?:string|null};
type Inbox={id:string;bot_title:string;content:string;channel:string;delivered_at:string;provider_status:string};
type Config={schedules:Schedule[];inbox:Inbox[];phone:{masked:string;verified:boolean};channels:{inapp:boolean;sms:boolean;whatsapp:boolean};whatsapp_mode?:"manual"|"paid"};
const defaultConfig:Config={schedules:[],inbox:[],phone:{masked:"",verified:false},channels:{inapp:true,sms:false,whatsapp:false}};
const days=["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const channels:Record<Channel,string>={inapp:"Caixa de entrada / Alarme",sms:"SMS para o telemóvel",whatsapp:"WhatsApp — preparar grátis"};
const defaultZone=()=>{
 if(typeof Intl!=="undefined")return Intl.DateTimeFormat().resolvedOptions().timeZone||"Europe/Lisbon";
 return "Europe/Lisbon";
};
export default function BotAlerts({bots}:{bots:Bot[]}){
 const [data,setData]=useState<Config>(defaultConfig),[botId,setBotId]=useState(bots[0]?.id||"");
 const [time,setTime]=useState("09:00"),[timezone,setTimezone]=useState(defaultZone);
 const [recurrence,setRecurrence]=useState<"daily"|"weekdays"|"weekly">("daily"),[weekday,setWeekday]=useState(1);
 const [channel,setChannel]=useState<Channel>("inapp"),[message,setMessage]=useState("Prepara as informações e os lembretes que pedi a este bot.");
 const [whatsappConsent,setWhatsappConsent]=useState(false),[phoneConsent,setPhoneConsent]=useState(false);
 const [phone,setPhone]=useState(""),[code,setCode]=useState("");
 const [error,setError]=useState(""),[info,setInfo]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 async function load(){
  try{
   const res=await fetch("/api/alerts",{cache:"no-store"});
   const j=await res.json();
   if(!res.ok)throw new Error(j.error||"Não foi possível carregar os alertas.");
   setData(j as Config);setError("");
  }catch(e){setError(e instanceof Error?e.message:"A funcionalidade ainda não está configurada.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();const interval=window.setInterval(()=>void load(),60000);return()=>window.clearInterval(interval);},[]);
 async function perform(url:string,options:RequestInit,success:string){
  setBusy(true);setInfo("");setError("");
  try{
   const res=await fetch(url,options);
   const j=await res.json();
   if(!res.ok)throw new Error(j.error||"A operação falhou.");
   setInfo(j.notice||j.message||success);
   await load();return true;
  }catch(e){setError(e instanceof Error?e.message:"Erro desconhecido.");return false;}
  finally{setBusy(false);}
 }
 const json=(body:unknown):RequestInit=>({method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 async function create(){
  if(!botId){setError("Escolhe primeiro um bot guardado.");return;}
  await perform("/api/alerts",json({bot_id:botId,channel,time_local:time,timezone,recurrence,weekday:recurrence==="weekly"?weekday:null,message,whatsapp_opt_in:channel==="whatsapp"&&whatsappConsent}),"Alerta configurado.");
 }
 async function verifyStart(){
  if(!phoneConsent){setError("Confirma primeiro que o número é teu e autorizas o SMS de verificação.");return;}
  await perform("/api/alerts/phone/start",json({phone:phone.trim(),consent:true}),"Código enviado.");
 }
 async function verifyCheck(){
  if(await perform("/api/alerts/phone/check",json({code:code.trim()}),"Número verificado. Já podes configurar SMS e WhatsApp.")){setCode("");}
 }
 const bestName=(id:string)=>bots.find(x=>x.id===id)?.title||"Bot eliminado";
 const formatted=(iso:string,zone:string)=>{try{return new Date(iso).toLocaleString("pt-PT",{timeZone:zone,day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});}catch{return iso;}};
 return <div className="alert-workspace">
  <div className="heading-row"><div><div className="section-kicker"><BellRing size={15}/> LUMI BOT ALERTS</div><h1>As informações chegam até ti.</h1><p>Escolhe o bot, o horário e como queres receber cada lembrete ou resumo.</p></div><button className="stream-control" onClick={()=>void load()} disabled={busy}><RefreshCcw size={15}/> Atualizar</button></div>
  {error&&<div role="alert" className="notice error">{error}</div>}
  {info&&<div role="status" className="notice">{info}</div>}
  <div className="alert-grid">
   <div>
    <section className="section-panel alert-panel"><div className="panel-heading"><div><h2><Clock size={19}/> Criar um alerta</h2><p>Os horários são configurados em cada bot.</p></div></div>
     {bots.length===0?<div className="muted-info">Ainda não guardaste nenhum bot. Cria um bot universal na área «Criar bots» e volta aqui.</div>:<>
      <div className="form-field"><label>Qual é o bot que envia a informação?</label><select value={botId} onChange={e=>{setBotId(e.target.value);setMessage("Prepara informações sobre "+(bots.find(b=>b.id===e.target.value)?.title||"este assunto")+" e envia um resumo.");}}>{bots.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}</select></div>
      <div className="form-field"><label>O que queres receber?</label><textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={450} placeholder="Um resumo das minhas tarefas, novidades verificadas de tecnologia, alertas importantes…"/></div>
      <div className="alert-settings"><div className="form-field"><label>Hora de entrega</label><input type="time" value={time} onChange={e=>setTime(e.target.value)}/></div><div className="form-field"><label>Frequência</label><select value={recurrence} onChange={e=>setRecurrence(e.target.value as typeof recurrence)}><option value="daily">Todos os dias</option><option value="weekdays">Segunda a sexta</option><option value="weekly">Um dia por semana</option></select></div></div>
      {recurrence==="weekly"&&<div className="form-field"><label>Dia da semana</label><select value={weekday} onChange={e=>setWeekday(Number(e.target.value))}>{days.map((d,i)=><option key={d} value={i}>{d}</option>)}</select></div>}
      <div className="form-field"><label>Fuso horário</label><select value={timezone} onChange={e=>setTimezone(e.target.value)}>{Array.from(new Set([timezone,"Europe/Lisbon","Europe/London","Europe/Madrid","America/Sao_Paulo","America/New_York","UTC"])).map(x=><option key={x} value={x}>{x}</option>)}</select></div>
      <div className="form-field"><label>Onde receber?</label><select value={channel} onChange={e=>setChannel(e.target.value as Channel)}>{(Object.keys(channels) as Channel[]).map(c=><option key={c} value={c}>{channels[c]}</option>)}</select></div>
      {channel!=="inapp"&&<div className="alert-channel-note"><Phone size={16}/><p>{data.phone.verified?"Número verificado: "+data.phone.masked:"É necessário verificar o teu número por SMS antes de usares este canal."} {channel==="whatsapp"&&data.whatsapp_mode!=="paid"?"Grátis: o resumo será guardado na LUMI; abre-o no WhatsApp e confirma o envio manualmente. Não é enviado automaticamente à hora marcada.":!data.channels[channel]?"O envio ainda não está configurado. Para SMS grátis, liga um Android ao TextBee.":""}</p></div>}
      {channel==="whatsapp"&&<label className="alert-consent"><input type="checkbox" checked={whatsappConsent} onChange={e=>setWhatsappConsent(e.target.checked)}/> Autorizo expressamente a LUMI a enviar alertas informativos do bot ao meu WhatsApp, e sei que posso cancelar quando quiser.</label>}
      <button className="btn full" disabled={busy||loading||!message.trim()||(channel!=="inapp"&&(!data.phone.verified||!data.channels[channel]))} onClick={create}><CalendarDays size={16}/> Guardar alerta</button>
      <p className="muted-info alert-fineprint">O envio automático de SMS requer o Android com TextBee e um agendador externo ativo. A caixa de entrada não dispara notificações com a página fechada. No WhatsApp gratuito precisas de confirmar manualmente cada envio. Para um alarme no telemóvel, importa o ficheiro de calendário.</p>
     </>}
    </section>
    <section className="section-panel alert-panel"><div className="panel-heading"><div><h2><Phone size={19}/> O teu telemóvel</h2><p>Para SMS e WhatsApp: apenas números confirmados.</p></div></div>
     {data.phone.verified?<div className="alert-verified"><CheckCircle2 size={18}/> Número verificado: {data.phone.masked} <button onClick={()=>{if(confirm("Desligar este número e desativar alertas SMS/WhatsApp?"))void perform("/api/alerts/phone/check",{method:"DELETE"},"Número desligado.");}} disabled={busy}>Desligar</button></div>:<>
      <div className="form-field"><label>Número internacional (ex.: +3519XXXXXXXX)</label><input type="tel" autoComplete="tel" placeholder="+351912345678" value={phone} onChange={e=>setPhone(e.target.value)}/></div>
      <label className="alert-consent"><input type="checkbox" checked={phoneConsent} onChange={e=>setPhoneConsent(e.target.checked)}/> Confirmo que este número é meu e autorizo um SMS de verificação.</label>
      <button className="stream-control" disabled={busy||!phoneConsent} onClick={verifyStart}><Send size={15}/> Pedir código por SMS</button>
      <div className="alert-settings"><div className="form-field"><label>Código recebido</label><input inputMode="numeric" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="123456"/></div><button className="stream-control alert-confirm" disabled={busy||code.length<4} onClick={verifyCheck}><ShieldCheck size={15}/> Verificar</button></div>
     </>}
     <p className="muted-info">Para SMS, podes usar o plano gratuito do TextBee com um telemóvel Android e SIM; o teu operador pode cobrar os SMS do tarifário. Para WhatsApp, a opção gratuita prepara uma mensagem que envias tu próprio. Nunca ativaremos envios pagos sem autorização.</p><p className="muted-info"><a href="https://textbee.dev/" target="_blank" rel="noopener noreferrer">Configurar TextBee gratuito ↗</a></p>
    </section>
   </div>
   <div>
    <section className="section-panel alert-panel"><div className="panel-heading"><div><h2><AlarmClock size={19}/> Alertas agendados</h2><p>{data.schedules.length} configurações</p></div></div>
     {data.schedules.length===0?<p className="muted-info">Ainda não tens alertas. Guarda o primeiro horário à esquerda.</p>:data.schedules.map(s=><div className="alert-schedule" key={s.id}><div className="alert-schedule-top"><strong>{bestName(s.bot_id)}</strong><span className="pill">{s.enabled?"Ativo":"Pausado"}</span></div>
      <p>{s.message}</p><small><Clock size={13}/> {s.time_local} · {s.recurrence==="daily"?"Todos os dias":s.recurrence==="weekdays"?"Segunda a sexta":days[s.weekday??1]} · {channels[s.channel]}</small>
      <small>Próxima entrega prevista: {formatted(s.next_run_at,s.timezone)} ({s.timezone})</small>
      {s.last_error&&<p className="alert-error">{s.last_error}</p>}
      <div className="alert-actions"><a href={"/api/alerts/calendar?id="+encodeURIComponent(s.id)} title="Importar na agenda do telemóvel"><Download size={14}/> Alarme .ics</a><button disabled={busy} onClick={()=>void perform("/api/alerts/"+s.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled:!s.enabled})},s.enabled?"Alerta pausado.":"Alerta reativado.")}>{s.enabled?"Pausar":"Reativar"}</button><button disabled={busy} onClick={()=>{if(confirm("Eliminar este alerta?"))void perform("/api/alerts/"+s.id,{method:"DELETE"},"Alerta eliminado.");}}><Trash2 size={14}/> Eliminar</button></div></div>)}
    </section>
    <section className="section-panel alert-panel"><div className="panel-heading"><div><h2><Bell size={19}/> Caixa de informações</h2><p>Alertas e resumos que já chegaram à LUMI.</p></div></div>
     {data.inbox.length===0?<p className="muted-info">Ainda não há informações recebidas. Aparecem aqui depois da primeira execução agendada.</p>:data.inbox.map(n=><article className="alert-inbox-item" key={n.id}><div><strong>{n.bot_title}</strong><small>{formatted(n.delivered_at,timezone)} · {channels[n.channel as Channel]||n.channel}</small></div><p>{n.content}</p>{n.provider_status==="failed"&&<small>Não foi possível enviar para o canal externo; a mensagem ficou disponível aqui.</small>}{n.channel==="whatsapp"&&n.provider_status==="manual_ready"&&<a className="stream-control" href={"/api/alerts/whatsapp/share?id="+encodeURIComponent(n.id)} target="_blank" rel="noopener noreferrer" style={{marginTop:9}}>Abrir e enviar pelo WhatsApp ↗</a>}</article>)}
    </section>
   </div>
  </div>
 </div>;
}
