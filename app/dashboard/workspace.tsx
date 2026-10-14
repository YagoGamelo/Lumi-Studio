"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import { ArrowRight,ArrowUpRight,Bot,CalendarClock,Camera,Check,ChevronRight,Clapperboard,CloudUpload,Copy,CreditCard,FileVideo,Gift,Globe,KeyRound,LayoutDashboard,LockKeyhole,LogOut,Menu,Music,Pause,Play,Plus,RefreshCcw,Search,Send,Settings,ShieldCheck,Sparkles,Trash2,UploadCloud,Users,Video,Wallet,WandSparkles,X,Youtube,Instagram,Twitch } from "lucide-react";
import Link from "next/link";
import { browserDb } from "@/lib/supabase/browser";
import Studio from "./studio";
type BotRow={id:string,title:string,instruction:string,category:string,frequency:string,status:string,created_at:string,next_run_at?:string|null,notify_email?:boolean};
type Tab="overview"|"bots"|"studio"|"connections"|"affiliates"|"billing"|"settings";
const menuItems:{key:Tab,label:string,icon:typeof Bot}[]=[
 {key:"overview",label:"Visão geral",icon:LayoutDashboard},
 {key:"bots",label:"Bots universais",icon:Bot},
 {key:"studio",label:"Estúdio de vídeo",icon:Clapperboard},
 {key:"connections",label:"Integrações e APIs",icon:Globe},
 {key:"affiliates",label:"Afiliados",icon:Gift},
 {key:"billing",label:"Planos e pagamentos",icon:CreditCard},
 {key:"settings",label:"Conta",icon:Settings}
];
const examples=[
 {label:"Organizar o meu dia",prompt:"Cria um assistente que todas as manhãs me ajude a planear as tarefas e compromissos do dia.",category:"planner"},
 {label:"Pesquisar notícias",prompt:"Cria um bot que pesquise notícias de tecnologia recentes, com links das fontes.",category:"research"},
 {label:"Investimentos",prompt:"Cria um bot que acompanhe notícias e variações históricas das ações que eu escolher, com links e sem aconselhamento personalizado.",category:"investment"},
 {label:"Criar vídeos",prompt:"Cria um bot de criação de conteúdo sobre gaming, com guiões originais e ideias para vídeos curtos.",category:"content"}
];
function euro(cents:number){return(cents/100).toLocaleString("pt-PT",{style:"currency",currency:"EUR"});}
export default function Workspace({initialBots,username,email,stats,hasConnect}:{
 initialBots:BotRow[],username:string,email:string,stats:{earned:number,pending:number,available:number},hasConnect:boolean
}){
 const [tab,setTab]=useState<Tab>("overview"),[mobile,setMobile]=useState(false);
 const [notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const [bots,setBots]=useState(initialBots);
 const [name,setName]=useState(""),[prompt,setPrompt]=useState(""),[category,setCategory]=useState("universal"),[frequency,setFrequency]=useState("manual");
 const [selected,setSelected]=useState<BotRow|null>(null),[message,setMessage]=useState(""),[answer,setAnswer]=useState("");
 const [scheduleHour,setScheduleHour]=useState(9),[scheduleEmail,setScheduleEmail]=useState(false);
 const [connections,setConnections]=useState<{provider:string,display_name:string}[]>([]);
 const [keys,setKeys]=useState<{provider:string,last_four:string}[]>([]);
 const [provider,setProvider]=useState("openai"),[keyValue,setKeyValue]=useState("");
 const [amount,setAmount]=useState("10"),[balance,setBalance]=useState(stats);
 const [annual,setAnnual]=useState(false);
 const [hasConnectAccount,setHasConnectAccount]=useState(hasConnect);
 const referral=(typeof window!=="undefined"?window.location.origin:"https://teusite.pt")+"/login?ref="+username;
 const refreshBots=useCallback(async()=>{
  const r=await fetch("/api/bots");if(r.ok){const j=await r.json();setBots(j.bots||[]);}
 },[]);
 const refreshConnections=useCallback(async()=>{
  const [r,k]=await Promise.all([fetch("/api/connections"),fetch("/api/keys")]);
  if(r.ok)setConnections((await r.json()).connections||[]);
  if(k.ok)setKeys((await k.json()).keys||[]);
 },[]);
 useEffect(()=>{
  const key=new URLSearchParams(window.location.search).get("tab");
  if(menuItems.some(x=>x.key===key))setTab(key as Tab);
  refreshConnections();
 },[refreshConnections]);
 function go(next:Tab){setTab(next);setNotice("");setMobile(false);window.history.replaceState(null,"","/dashboard?tab="+next);}
 async function api(path:string,data:unknown,method="POST"){
  const r=await fetch(path,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Não foi possível concluir.");
  return j;
 }
 async function plan(){
  if(prompt.trim().length<15){setNotice("Descreve melhor o bot.");return;}
  setBusy(true);setNotice("");
  try{const j=await api("/api/bots/plan",{prompt});setName(j.plan.title);setCategory(j.plan.category);setFrequency(j.plan.frequency);setPrompt(j.plan.instruction);setNotice("A IA propôs uma configuração. Revê-a antes de guardar.");}
  catch(e){setNotice((e as Error).message);}finally{setBusy(false);}
 }
 async function createBot(){
  setBusy(true);setNotice("");
  try{const j=await api("/api/bots",{title:name.trim()||"O meu bot",instruction:prompt,category,frequency});setBots(old=>[j.bot,...old]);setSelected(j.bot);setName("");setPrompt("");setNotice("Bot guardado. Podes testá-lo agora.");}
  catch(e){setNotice((e as Error).message);}finally{setBusy(false);}
 }
 async function runBot(){
  if(!selected||message.length<2)return;
  setBusy(true);setNotice("");
  try{const j=await api("/api/bots/run",{bot_id:selected.id,message});setAnswer(j.output);}
  catch(e){setNotice((e as Error).message);}finally{setBusy(false);}
 }
 async function schedule(active:boolean){
  if(!selected)return;
  setBusy(true);
  try{const j=await api("/api/bots/"+selected.id+"/schedule",{active,hour_utc:scheduleHour,notify_email:scheduleEmail});
   setSelected(s=>s?{...s,status:active?"active":"paused",next_run_at:active?j.next_run_at:null}:null);
   await refreshBots();setNotice(active?"Agendamento ativado. A execução depende do cron configurado no alojamento.":"Agendamento pausado.");
  }catch(e){setNotice((e as Error).message);}finally{setBusy(false);}
 }
 async function deleteBot(id:string){
  if(!confirm("Eliminar este bot?"))return;
  setBusy(true);try{const r=await fetch("/api/bots/"+id,{method:"DELETE"});if(!r.ok)throw new Error("Não foi possível eliminar.");
   setBots(old=>old.filter(x=>x.id!==id));if(selected?.id===id)setSelected(null);
  }catch(e){setNotice((e as Error).message);}finally{setBusy(false);}
 }
 async function saveKey(){
  setBusy(true);setNotice("");
  try{await api("/api/keys",{provider,key:keyValue});setKeyValue("");await refreshConnections();setNotice("Chave guardada encriptada no servidor. Nunca será mostrada no browser.");}
  catch(e){setNotice((e as Error).message);}finally{setBusy(false);}
 }
 async function removeKey(item:string){
  const r=await fetch("/api/keys?provider="+encodeURIComponent(item),{method:"DELETE"});
  if(r.ok){await refreshConnections();setNotice("Chave eliminada.");}
 }
 async function checkout(plan:string){
  setBusy(true);
  try{const j=await api("/api/billing/checkout",{plan});window.location.assign(j.url);}
  catch(e){setNotice((e as Error).message);setBusy(false);}
 }
 async function connectPayout(){
  setBusy(true);
  try{const j=await api("/api/affiliate/connect",{});window.location.assign(j.url);}
  catch(e){setNotice((e as Error).message);setBusy(false);}
 }
 async function spend(kind:"payout"|"redeem"){
  setBusy(true);
  try{await api(kind==="payout"?"/api/affiliate/payout":"/api/affiliate/redeem",{amount_cents:Math.round(Number(amount)*100)});
   setBalance(x=>({...x,available:Math.max(0,x.available-Math.round(Number(amount)*100))}));
   setNotice(kind==="payout"?"Transferência solicitada. O recebimento segue os prazos da Stripe.":"Crédito adicionado à tua conta para faturas futuras.");
  }catch(e){setNotice((e as Error).message);}finally{setBusy(false);}
 }
 async function logout(){await browserDb().auth.signOut();window.location.assign("/");}
 return <div className="dash">
  {mobile&&<div className="side-overlay open" onClick={()=>setMobile(false)}/>}
  <aside className={"dash-sidebar"+(mobile?" open":"")}>
   <Link href="/" className="logo dash-logo"><span className="logo-symbol"><Sparkles size={20}/></span>LUMI<span className="logo-light">Studio</span></Link>
   <div className="dash-side-label">WORKSPACE</div><nav className="dash-nav">{menuItems.map(item=><button className={tab===item.key?"active":""} key={item.key} onClick={()=>go(item.key)}><item.icon size={18}/>{item.label}</button>)}</nav>
   <div className="dash-bottom"><button className="tiny-btn" onClick={logout}><LogOut size={14}/> Sair</button><div className="dash-account"><div className="dash-avatar">{username[0].toUpperCase()}</div><div><strong>@{username}</strong><span>Conta LUMI</span></div></div></div>
  </aside>
  <main className="dash-content">
   <div className="dash-top"><div className="breadcrumb"><button className="icon-button mobile-menu" onClick={()=>setMobile(!mobile)} aria-label="Abrir menu"><Menu size={18}/></button><span>Workspace</span><ChevronRight size={15}/><b>{menuItems.find(x=>x.key===tab)?.label}</b></div><div className="dash-top-actions"><span className="pill">BETA</span><div className="dash-avatar">{username[0].toUpperCase()}</div></div></div>
   {notice&&<div className="notice" role="status">{notice}<button className="tiny-btn" onClick={()=>setNotice("")} style={{float:"right"}}><X size={13}/></button></div>}
   {tab==="overview"&&<><div className="heading-row"><div><h1>Bem-vindo, {username} <span className="gradient-text">✦</span></h1><p>A tua área para criar e gerir o que a IA pode fazer por ti.</p></div><button className="btn" onClick={()=>go("bots")}><Plus size={17}/> Criar bot</button></div>
   <section className="dash-hero"><div><div className="section-kicker"><Sparkles size={15}/> LUMI BUILDER</div><h2>Descreve. Cria. Experimenta.</h2><p>Os bots universais já conseguem responder através de IA e pesquisa web. Cria o teu assistente e testa-o sem programação.</p><button className="btn" onClick={()=>go("bots")}>Começar agora <ArrowRight size={16}/></button></div><div className="dash-hero-art"><div><WandSparkles size={68}/></div></div></section>
   <div className="dash-stats" style={{marginTop:20}}><div className="stat-card"><div>Bots criados <Bot size={19}/></div><strong>{bots.length}</strong><small>No teu workspace</small></div><div className="stat-card"><div>Comissões disponíveis <Wallet size={19}/></div><strong>{euro(balance.available)}</strong><small>Para crédito ou levantamento</small></div><div className="stat-card"><div>Conexões ativas <Globe size={19}/></div><strong>{connections.length}</strong><small>Serviços autorizados</small></div></div>
   <div className="section-panel"><div className="panel-heading"><div><h2>O que queres criar?</h2><p>Experimenta um destes exemplos.</p></div></div><div className="bot-grid">{examples.slice(0,3).map(x=><button key={x.label} className="bot-card" style={{color:"inherit",textAlign:"left"}} onClick={()=>{go("bots");setName(x.label);setPrompt(x.prompt);setCategory(x.category);}}><div><span className="bot-icon"><Bot size={20}/></span><ArrowUpRight size={16}/></div><h3>{x.label}</h3><p>{x.prompt}</p></button>)}</div></div></>}
   {tab==="bots"&&<><div className="heading-row"><div><div className="section-kicker"><Bot size={15}/> LUMI BUILDER</div><h1>Cria o teu bot universal.</h1><p>Escreve o pedido. A IA prepara a configuração e o bot pode responder imediatamente.</p></div></div>
   <div className="builder"><div className="section-panel" style={{marginTop:0}}><div className="panel-heading"><div><h2>A tua ideia</h2><p>O assistente interpreta instruções em português.</p></div><Sparkles size={22} color="#a58cff"/></div>
   <div className="form-field"><label>O que queres que o teu bot faça?</label><textarea rows={6} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Quero um bot que todas as manhãs pesquise notícias da NVIDIA e me envie um resumo com links..."/></div>
   <button className="btn-outline full" disabled={busy||prompt.length<15} onClick={plan}><WandSparkles size={17}/> Ajudar a configurar com IA</button>
   <div className="form-field"><label>Nome do bot</label><input value={name} onChange={e=>setName(e.target.value)} maxLength={75} placeholder="Ex.: O meu radar de notícias"/></div>
   <div className="select-row"><div className="form-field"><label>Categoria</label><select value={category} onChange={e=>setCategory(e.target.value)}><option value="universal">Universal</option><option value="content">Conteúdo</option><option value="planner">Organização</option><option value="research">Pesquisa online</option><option value="investment">Investimentos (informação)</option></select></div><div className="form-field"><label>Execução</label><select value={frequency} onChange={e=>setFrequency(e.target.value)}><option value="manual">Manual</option><option value="daily">Diária</option><option value="weekly">Semanal</option></select></div></div>
   <button className="btn full" disabled={busy||name.length<3||prompt.length<12} onClick={createBot}><Plus size={17}/> Guardar bot</button><p className="builder-help">Ações externas só são executadas com integrações e permissões apropriadas.</p></div>
   <div className="section-panel" style={{marginTop:0}}><div className="panel-heading"><div><h2>Os teus bots</h2><p>Seleciona um bot para o testar.</p></div></div><div className="builder-templates">{bots.length===0?<p className="muted-info">Ainda não criaste nenhum.</p>:bots.map(b=><div key={b.id} className="template-button" style={{justifyContent:"space-between",borderColor:selected?.id===b.id?"#aa8aff":undefined}}><button onClick={()=>{setSelected(b);setAnswer("");setMessage("Executa a tua tarefa agora.");}} style={{border:0,background:"transparent",color:"inherit",textAlign:"left",flex:1}}><strong>{b.title}</strong><br/><small style={{color:"#929bb5"}}>{b.category} · {b.status}</small></button><button className="icon-button" title="Eliminar" onClick={()=>deleteBot(b.id)}><Trash2 size={16}/></button></div>)}</div>
   {selected&&<div style={{marginTop:22,borderTop:"1px solid #30374b",paddingTop:20}}><h3>Testar: {selected.title}</h3><div className="form-field"><label>Mensagem para o bot</label><textarea rows={3} value={message} onChange={e=>setMessage(e.target.value)}/></div><button className="btn full" disabled={busy||message.length<2} onClick={runBot}><Play size={15}/> Executar agora</button>{answer&&<div className="notice" style={{whiteSpace:"pre-wrap",maxHeight:400,overflow:"auto"}}>{answer}</div>}
   <div style={{marginTop:22}}><h3><CalendarClock size={17} style={{verticalAlign:"middle"}}/> Agendamento</h3><p className="muted-info" style={{margin:"10px 0"}}>Execução diária ou semanal. Horário UTC, com cron ativo no alojamento.</p><div className="form-field"><label>Hora (UTC)</label><select value={scheduleHour} onChange={e=>setScheduleHour(Number(e.target.value))}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,"0")}:00 UTC</option>)}</select></div><label style={{display:"flex",gap:9,alignItems:"center",fontSize:12}}><input type="checkbox" checked={scheduleEmail} onChange={e=>setScheduleEmail(e.target.checked)}/> Enviar por email (se notificações estiverem configuradas)</label><div style={{display:"flex",gap:10,marginTop:14}}><button className="btn" disabled={busy||selected.frequency==="manual"} onClick={()=>schedule(true)}><Play size={14}/> Ativar</button><button className="btn-outline" disabled={busy} onClick={()=>schedule(false)}><Pause size={14}/> Pausar</button></div>{selected.frequency==="manual"&&<p className="muted-info">Este bot foi guardado em modo manual. Cria um bot com frequência diária/semanal para o agendar.</p>}</div></div>}</div></div></>}
   {tab==="studio"&&<Studio/>}
   {tab==="connections"&&<><div className="heading-row"><div><h1>Integrações e segredos</h1><p>Liga contas oficialmente. Guarda as tuas API keys encriptadas, nunca em texto público.</p></div><ShieldCheck size={26} color="#a991ff"/></div>
   <div className="section-panel"><div className="panel-heading"><div><h2>Redes sociais</h2><p>OAuth: tu autorizas e podes desligar quando quiseres.</p></div></div><div className="connect-grid">{[{name:"Twitch",provider:"twitch",icon:Twitch,url:"/api/connections/twitch/start"},{name:"YouTube",provider:"youtube",icon:Youtube,url:"/api/connections/youtube/start"}].map(c=>{const linked=connections.find(x=>x.provider===c.provider);return <div className="connect-card" key={c.provider}><span className="bot-icon"><c.icon size={22}/></span><div style={{flex:1}}><strong>{c.name}</strong><small>{linked?"Ligado: "+linked.display_name:"Não ligado"}</small></div>{linked?<button className="tiny-btn" onClick={async()=>{if(!confirm("Desligar "+c.name+"?"))return;await fetch("/api/connections?provider="+c.provider,{method:"DELETE"});await refreshConnections();}}>Desligar</button>:<a className="tiny-btn" href={c.url}>Ligar <ArrowUpRight size={13}/></a>}</div>;})}</div><p className="muted-info" style={{marginTop:18}}>As ligações Google Calendar, Instagram e TikTok serão adicionadas depois das revisões de permissões dessas plataformas.</p></div>
   <div className="section-panel"><div className="panel-heading"><div><h2>Cofre de API keys</h2><p>As chaves são cifradas no servidor. Nunca as colocamos no código público.</p></div><LockKeyhole color="#9e87ff" size={20}/></div><div className="select-row"><div className="form-field"><label>Fornecedor</label><select value={provider} onChange={e=>setProvider(e.target.value)}><option value="openai">OpenAI (bots)</option><option value="heygen">HeyGen (vídeos)</option><option value="newsapi">News API</option><option value="elevenlabs">ElevenLabs</option></select></div><div className="form-field"><label>Chave secreta</label><input type="password" autoComplete="off" value={keyValue} onChange={e=>setKeyValue(e.target.value)} placeholder="Cola a chave aqui"/></div></div><button className="btn" onClick={saveKey} disabled={busy||keyValue.length<8}><KeyRound size={16}/> Guardar no cofre</button><div style={{marginTop:17}}>{keys.map(k=><div key={k.provider} className="template-button" style={{marginTop:8,justifyContent:"space-between"}}><span><strong>{k.provider}</strong><small>•••• {k.last_four}</small></span><button className="tiny-btn" onClick={()=>removeKey(k.provider)}>Eliminar</button></div>)}</div></div></>}
   {tab==="affiliates"&&<><div className="heading-row"><div><h1>Ganham contigo.</h1><p>O teu código é @<strong>{username}</strong>. Recebes 30% dos pagamentos elegíveis dos convidados.</p></div><Gift size={26} color="#b89cfa"/></div><div className="earnings-grid">{[{label:"Comissões acumuladas",value:balance.earned},{label:"Em validação",value:balance.pending},{label:"Saldo disponível",value:balance.available}].map(x=><div key={x.label}><small>{x.label}</small><strong>{euro(x.value)}</strong></div>)}</div><div className="builder"><div className="section-panel"><h2>O teu link de afiliado</h2><p className="muted-info" style={{margin:"12px 0"}}>O username é o código automático de convite.</p><div className="copy-code"><code>{referral}</code><button onClick={()=>navigator.clipboard.writeText(referral)}><Copy size={14}/> Copiar</button></div><p className="muted-info" style={{marginTop:15}}>Comissões mensais e anuais, registadas apenas após pagamento. A elegibilidade tem condições, não é um desconto de compra.</p></div><div className="section-panel"><h2>Saldo e levantamentos</h2><p className="muted-info" style={{margin:"12px 0"}}>Comissões ficam em validação durante 30 dias e estão sujeitas a devoluções e verificação do prestador de pagamentos.</p><div className="form-field"><label>Montante (mínimo 10€)</label><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} min={10}/></div><div style={{display:"grid",gap:9}}><button className="btn-outline full" onClick={connectPayout} disabled={busy}>{hasConnectAccount?"Rever conta Stripe":"Configurar conta Stripe Connect"}</button><button className="btn full" disabled={busy||!hasConnectAccount||balance.available<Number(amount)*100} onClick={()=>spend("payout")}>Pedir levantamento <ArrowUpRight size={16}/></button><button className="btn-outline full" disabled={busy||balance.available<Number(amount)*100} onClick={()=>spend("redeem")}>Usar saldo em subscrições <Wallet size={16}/></button></div></div></div></>}
   {tab==="billing"&&<><div className="heading-row"><div><h1>Escolhe o teu plano.</h1><p>Mais possibilidades à medida que a LUMI evolui.</p></div><button className="btn-outline" onClick={()=>setAnnual(!annual)}>{annual?"Mensal":"Ver anual"} <ArrowRight size={15}/></button></div><div className="pricing-grid">{[{title:"Free",price:"0€",period:"",key:"",description:"Explora o Builder e guarda até 3 bots."},{title:"Creator",price:annual?"199€":"19,90€",period:annual?"/ano":"/mês",key:"creator_"+(annual?"yearly":"monthly"),description:"Para criadores que querem evoluir."},{title:"Pro",price:annual?"499€":"49,90€",period:annual?"/ano":"/mês",key:"pro_"+(annual?"yearly":"monthly"),description:"Para projetos de conteúdo mais exigentes."}].map(p=><div key={p.title} className="price-card"><h3>{p.title}</h3><div className="price"><strong>{p.price}</strong><span>{p.period}</span></div><p>{p.description}</p>{p.key?<button className="btn full" style={{marginTop:30}} disabled={busy} onClick={()=>checkout(p.key)}>Escolher plano <ArrowRight size={17}/></button>:<div className="pill" style={{marginTop:25,display:"inline-block"}}>Plano inicial</div>}<div className="price-rule"/><p>Os limites exatos de geração e vídeo serão publicados antes do lançamento dos planos pagos.</p></div>)}</div><div className="section-panel"><h2>Gerir faturação</h2><p className="muted-info" style={{margin:"12px 0"}}>Portal seguro Stripe para cancelar ou alterar subscrições.</p><button className="btn-outline" onClick={async()=>{setBusy(true);try{const j=await api("/api/billing/portal",{});window.location.assign(j.url);}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}}>Abrir portal <ArrowUpRight size={16}/></button></div></>}
   {tab==="settings"&&<><div className="heading-row"><div><h1>A tua conta</h1><p>Controla a tua identidade e segurança.</p></div></div><div className="section-panel"><h2>Informações</h2><div className="form-field"><label>Username</label><input value={"@"+username} readOnly/></div><div className="form-field"><label>Email</label><input value={email} readOnly/></div><button className="btn-outline" onClick={logout}><LogOut size={16}/> Terminar sessão</button><p className="muted-info" style={{marginTop:20}}>Os teus ficheiros de rosto e vídeos são privados. Antes de abrir a plataforma ao público, é necessário adicionar gestão de eliminação de conta e consentimento para processamento por fornecedores.</p></div></>}
   <footer style={{marginTop:60,paddingTop:22,borderTop:"1px solid #272d3e",fontSize:11,color:"#8790a9"}}>© 2026 LUMI Studio · Beta de desenvolvimento · A publicação e os bots exigem configuração e permissões reais.</footer>
  </main>
 </div>;
}