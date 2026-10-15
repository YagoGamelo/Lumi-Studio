"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {ArrowRight, Bot, Camera, Check, Clapperboard, Copy, Download, ExternalLink, Link2, Mic, Monitor, Plus, Radio, Save, ShieldCheck, Smartphone, Square, Trash2, Video, VideoOff, WandSparkles} from "lucide-react";
import {browserDb} from "@/lib/supabase/browser";

type BotDraft={id:string;title:string;instruction:string;category:string;frequency:string;status:string};
type SceneMode="starting"|"live"|"brb"|"irl"|"ending"|"custom";
type Scene={id:string;name:string;mode:SceneMode};
type Settings={title:string;handle:string;accent:string;message:string;scenes:Scene[];activeId:string;attachedIds:string[]};
const starterScenes:Scene[]=[
 {id:"starting",name:"A começar",mode:"starting"},
 {id:"live",name:"Em direto",mode:"live"},
 {id:"brb",name:"Já volto",mode:"brb"},
 {id:"irl",name:"IRL / Telemóvel",mode:"irl"},
 {id:"ending",name:"A terminar",mode:"ending"}
];
const defaultSettings:Settings={title:"A minha stream",handle:"@creator",accent:"#997bff",message:"Bem-vindos à live!",scenes:starterScenes,activeId:"starting",attachedIds:[]};
function safeHex(value:string){return /^#[0-9a-fA-F]{6}$/.test(value)?value:"#997bff";}
function newToken(){return Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b=>b.toString(16).padStart(2,"0")).join("");}
function drawCover(ctx:CanvasRenderingContext2D,v:HTMLVideoElement,x:number,y:number,w:number,h:number){
 if(v.readyState<2 || !v.videoWidth || !v.videoHeight)return;
 const ratio=Math.max(w/v.videoWidth,h/v.videoHeight),cw=v.videoWidth*ratio,ch=v.videoHeight*ratio;
 ctx.drawImage(v,x-(cw-w)/2,y-(ch-h)/2,cw,ch);
}
function truncate(s:string,length:number){return s.length>length?s.slice(0,length-1)+"…":s;}
export default function StreamStudio({bots,username}:{bots:BotDraft[],username:string}){
 const [settings,setSettings]=useState<Settings>({...defaultSettings,handle:"@"+username});
 const [hydrated,setHydrated]=useState(false);
 const [screenOn,setScreenOn]=useState(false),[cameraOn,setCameraOn]=useState(false),[micOn,setMicOn]=useState(false);
 const [recording,setRecording]=useState(false),[status,setStatus]=useState("Pronto para configurar o teu estúdio.");
 const [clientId,setClientId]=useState(""),[overlayToken,setOverlayToken]=useState(""),[overlayLive,setOverlayLive]=useState(false);
 const [uid,setUid]=useState("");
 const [showGuides,setShowGuides]=useState(false);
 const [origin,setOrigin]=useState("");
 const screenEl=useRef<HTMLVideoElement>(null),cameraEl=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const screenStream=useRef<MediaStream|null>(null),cameraStream=useRef<MediaStream|null>(null),micStream=useRef<MediaStream|null>(null);
 const recorder=useRef<MediaRecorder|null>(null),recordStream=useRef<MediaStream|null>(null),audioCtx=useRef<AudioContext|null>(null);
 const settingsRef=useRef(settings);
 const activeScene=settings.scenes.find(s=>s.id===settings.activeId)||settings.scenes[0];
 const attached=bots.filter(b=>settings.attachedIds.includes(b.id));
 const storageKey="lumi_stream_studio_v1_"+username;
 useEffect(()=>{
  try{
   const raw=localStorage.getItem(storageKey);
   if(raw){
    const saved=JSON.parse(raw) as Partial<Settings>&{overlayToken?:string;clientId?:string};
    if(Array.isArray(saved.scenes)&&saved.scenes.length){
     setSettings({title:String(saved.title||defaultSettings.title),handle:String(saved.handle||"@"+username),accent:safeHex(String(saved.accent||defaultSettings.accent)),message:String(saved.message||defaultSettings.message),scenes:saved.scenes.filter(s=>s.id&&s.name&&s.mode),activeId:String(saved.activeId||"live"),attachedIds:Array.isArray(saved.attachedIds)?saved.attachedIds:[]});
    }
    if(saved.overlayToken)setOverlayToken(saved.overlayToken);
    if(saved.clientId)setClientId(saved.clientId);
   }
  }catch{setStatus("Não foi possível ler as definições guardadas.");}
  setHydrated(true);
  setOrigin(window.location.origin);
 },[storageKey,username]);
 useEffect(()=>{settingsRef.current=settings;if(hydrated)localStorage.setItem(storageKey,JSON.stringify({...settings,overlayToken,clientId}));},[settings,overlayToken,clientId,hydrated,storageKey]);
 useEffect(()=>{
  let frame=0;
  const render=()=>{
   const el=canvas.current,ctx=el?.getContext("2d");if(!el||!ctx){frame=requestAnimationFrame(render);return;}
   const s=settingsRef.current,scene=s.scenes.find(x=>x.id===s.activeId)||s.scenes[0];
   const mode=scene?.mode||"live",accent=safeHex(s.accent);
   const w=el.width,h=el.height;
   const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,"#13192f");bg.addColorStop(1,"#24113e");ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
   ctx.strokeStyle=accent+"33";ctx.lineWidth=1;for(let i=0;i<11;i++){ctx.beginPath();ctx.moveTo(i*180,0);ctx.lineTo(i*180-400,h);ctx.stroke();}
   ctx.fillStyle=accent+"35";ctx.beginPath();ctx.arc(1070,140,200,0,Math.PI*2);ctx.fill();
   if(mode==="live"||mode==="irl"||mode==="custom"){
    const screen=screenEl.current,cam=cameraEl.current;
    if(screen&&screenStream.current)drawCover(ctx,screen,0,0,w,h);
    if(!screenStream.current){
     ctx.textAlign="center";ctx.fillStyle="#e2dcff";ctx.font="bold 64px sans-serif";ctx.fillText(mode==="irl"?"MODO IRL":"LUMI STREAM",w/2,h/2-20);
     ctx.font="26px sans-serif";ctx.fillStyle="#aaa8c9";ctx.fillText(mode==="irl"?"Prepara a ligação móvel":"Ativa a captura ou a câmara",w/2,h/2+28);
    }
    if(cam&&cameraStream.current){
     const cw=screenStream.current?290:550,ch=screenStream.current?164:310,x=screenStream.current?945:365,y=screenStream.current?465:190;
     ctx.fillStyle="#0e1020";ctx.fillRect(x-5,y-5,cw+10,ch+10);drawCover(ctx,cam,x,y,cw,ch);
     ctx.lineWidth=4;ctx.strokeStyle=accent;ctx.strokeRect(x,y,cw,ch);
    }
   }else{
    ctx.fillStyle="#f8f5ff";ctx.font="bold 85px sans-serif";ctx.textAlign="center";
    ctx.fillText(mode==="starting"?"A STREAM VAI COMEÇAR":mode==="brb"?"JÁ VOLTO":"OBRIGADO PELA LIVE!",w/2,h/2);
    ctx.font="31px sans-serif";ctx.fillStyle="#d6c8ff";ctx.fillText(truncate(s.title,58),w/2,h/2+70);
   }
   ctx.textAlign="left";ctx.fillStyle="#0b0d19cf";ctx.fillRect(0,0,w,86);
   ctx.fillStyle=accent;ctx.fillRect(0,0,8,86);ctx.font="bold 26px sans-serif";ctx.fillStyle="#ffffff";ctx.fillText(truncate(s.title,65),30,37);
   ctx.font="20px sans-serif";ctx.fillStyle="#cabef4";ctx.fillText(truncate(s.handle,40),30,67);
   ctx.fillStyle="#0b0d19db";ctx.fillRect(0,h-84,w,84);ctx.fillStyle=accent;ctx.fillRect(0,h-84,8,84);
   ctx.font="26px sans-serif";ctx.fillStyle="#ffffff";ctx.fillText(truncate(s.message,85),28,h-30);
   ctx.textAlign="right";ctx.font="bold 20px sans-serif";ctx.fillStyle="#f5d4ff";ctx.fillText("✦ LUMI STUDIO",w-25,h-30);
   frame=requestAnimationFrame(render);
  };
  frame=requestAnimationFrame(render);
  return()=>cancelAnimationFrame(frame);
 },[]);
 useEffect(()=>()=>{screenStream.current?.getTracks().forEach(t=>t.stop());cameraStream.current?.getTracks().forEach(t=>t.stop());micStream.current?.getTracks().forEach(t=>t.stop());recordStream.current?.getTracks().forEach(t=>t.stop());if(recorder.current?.state==="recording")recorder.current.stop();void audioCtx.current?.close();},[]);
 useEffect(()=>{
  if(!overlayLive||!uid||!hydrated)return;
  const t=setTimeout(async()=>{
   const s=settings;
   const {error}=await browserDb().from("stream_profiles").update({title:s.title,handle:s.handle,accent:safeHex(s.accent),scene:activeScene?.name||"Live",message:s.message,updated_at:new Date().toISOString()}).eq("user_id",uid);
   if(error){setOverlayLive(false);setStatus("Ligação do overlay interrompida: "+error.message);}
  },700);
  return()=>clearTimeout(t);
 },[overlayLive,uid,settings,activeScene?.name,hydrated]);
 const update=(patch:Partial<Settings>)=>setSettings(s=>({...s,...patch}));
 function chooseScene(id:string){update({activeId:id});setStatus("Cena alterada. A pré-visualização e a gravação usam esta cena.");}
 async function toggleScreen(){
  if(screenStream.current){screenStream.current.getTracks().forEach(t=>t.stop());screenStream.current=null;if(screenEl.current)screenEl.current.srcObject=null;setScreenOn(false);return;}
  if(!navigator.mediaDevices?.getDisplayMedia){setStatus("Este navegador não suporta capturar o ecrã. Usa Chrome ou Edge num computador.");return;}
  try{const stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});screenStream.current=stream;if(screenEl.current){screenEl.current.srcObject=stream;void screenEl.current.play().catch(()=>{});}stream.getVideoTracks()[0]?.addEventListener("ended",()=>{screenStream.current=null;setScreenOn(false);});setScreenOn(true);setStatus("Ecrã capturado. Confirma as permissões do navegador.");}
  catch(e){setStatus(e instanceof Error?e.message:"Captura não autorizada.");}
 }
 async function toggleCamera(){
  if(cameraStream.current){cameraStream.current.getTracks().forEach(t=>t.stop());cameraStream.current=null;if(cameraEl.current)cameraEl.current.srcObject=null;setCameraOn(false);return;}
  if(!navigator.mediaDevices?.getUserMedia){setStatus("A câmara não é suportada neste navegador.");return;}
  try{const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});cameraStream.current=stream;if(cameraEl.current){cameraEl.current.srcObject=stream;void cameraEl.current.play().catch(()=>{});}setCameraOn(true);setStatus("Câmara ligada.");}
  catch(e){setStatus(e instanceof Error?e.message:"Acesso à câmara negado.");}
 }
 async function toggleMic(){
  if(micStream.current){micStream.current.getTracks().forEach(t=>t.stop());micStream.current=null;setMicOn(false);return;}
  if(!navigator.mediaDevices?.getUserMedia){setStatus("Microfone indisponível neste navegador.");return;}
  try{micStream.current=await navigator.mediaDevices.getUserMedia({audio:true});setMicOn(true);setStatus("Microfone ligado.");}
  catch(e){setStatus(e instanceof Error?e.message:"Acesso ao microfone negado.");}
 }
 async function startRecord(){
  if(!canvas.current?.captureStream||typeof MediaRecorder==="undefined"){setStatus("Gravação não suportada. Experimenta Chrome ou Edge num computador.");return;}
  try{
   const video=canvas.current.captureStream(30),tracks=[...video.getVideoTracks()];
   const sources=[micStream.current,screenStream.current].filter(Boolean) as MediaStream[];
   if(sources.some(s=>s.getAudioTracks().length)){
    const ctx=new AudioContext();audioCtx.current=ctx;await ctx.resume();const destination=ctx.createMediaStreamDestination();
    for(const stream of sources){if(stream.getAudioTracks().length)ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks())).connect(destination);}
    tracks.push(...destination.stream.getAudioTracks());
   }
   const output=new MediaStream(tracks);recordStream.current=output;
   const formats=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm","video/mp4"];
   const mime=formats.find(m=>MediaRecorder.isTypeSupported(m));
   const rec=new MediaRecorder(output,mime?{mimeType:mime}:undefined);recorder.current=rec;
   const chunks:BlobPart[]=[];
   rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   rec.onerror=()=>setStatus("Erro durante a gravação.");
   rec.onstop=()=>{
    const extension=rec.mimeType.includes("mp4")?"mp4":"webm";
    if(chunks.length){const file=new Blob(chunks,{type:rec.mimeType||"video/webm"});const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download="lumi-stream-"+new Date().toISOString().replace(/[:.]/g,"-")+"."+extension;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);setStatus("Gravação concluída: ficheiro transferido para o dispositivo.");}
    else setStatus("Não foi possível guardar a gravação.");
    output.getTracks().forEach(t=>t.stop());recordStream.current=null;void audioCtx.current?.close();audioCtx.current=null;setRecording(false);
   };
   rec.start(1000);setRecording(true);setStatus("A gravar localmente — isto NÃO transmite para a Twitch/YouTube.");
  }catch(e){setStatus(e instanceof Error?e.message:"Não foi possível iniciar a gravação.");recordStream.current?.getTracks().forEach(t=>t.stop());void audioCtx.current?.close();audioCtx.current=null;}
 }
 function stopRecord(){if(recorder.current?.state==="recording")recorder.current.stop();}
 function addScene(){const name=prompt("Nome da nova cena (máx. 36 caracteres):");if(!name?.trim())return;const id="custom-"+Date.now();update({scenes:[...settings.scenes,{id,name:name.trim().slice(0,36),mode:"custom"}],activeId:id});}
 function removeScene(id:string){if(settings.scenes.length===1)return;const next=settings.scenes.filter(s=>s.id!==id);update({scenes:next,activeId:settings.activeId===id?next[0].id:settings.activeId});}
 function attach(id:string){update({attachedIds:settings.attachedIds.includes(id)?settings.attachedIds.filter(x=>x!==id):[...settings.attachedIds,id]});}
 function botAction(bot:BotDraft){update({message:"🤖 "+bot.title+": "+truncate(bot.instruction,80)});setStatus("Mensagem do bot aplicada à cena. O bot ainda não executou ações externas.");}
 const overlayUrl=useMemo(()=>{
  if(!origin)return "";
  const url=new URL("/overlay/stream",origin);
  if(overlayLive&&overlayToken)url.searchParams.set("key",overlayToken);
  url.searchParams.set("title",settings.title);url.searchParams.set("handle",settings.handle);url.searchParams.set("accent",safeHex(settings.accent));url.searchParams.set("scene",activeScene?.name||"Live");url.searchParams.set("message",settings.message);
  return url.toString();
 },[origin,settings,activeScene?.name,overlayLive,overlayToken]);
 async function copy(value:string){try{await navigator.clipboard.writeText(value);setStatus("Link copiado.");}catch{setStatus("Não foi possível copiar. Mantém o dedo sobre o link para copiar.");}}
 async function activateOverlay(){
  try{
   const db=browserDb(),{data:{user},error:authError}=await db.auth.getUser();if(authError||!user){setStatus("Inicia sessão para sincronizar overlays.");return;}
   const token=overlayToken||newToken();
   const {error}=await db.from("stream_profiles").upsert({user_id:user.id,token,title:settings.title,handle:settings.handle,accent:safeHex(settings.accent),scene:activeScene?.name||"Live",message:settings.message,updated_at:new Date().toISOString()},{onConflict:"user_id"});
   if(error){setStatus("Sincronização indisponível. Executa supabase/stream.sql no SQL Editor do Supabase. Detalhe: "+error.message);return;}
   setOverlayToken(token);setUid(user.id);setOverlayLive(true);setStatus("Overlay sincronizado! Copia novamente o link para OBS/Streamlabs.");
  }catch(e){setStatus(e instanceof Error?e.message:"Não foi possível ativar a sincronização.");}
 }
 const invite=/^\d{17,22}$/.test(clientId.trim())?"https://discord.com/oauth2/authorize?client_id="+encodeURIComponent(clientId.trim())+"&scope=bot%20applications.commands&permissions=3072":"";
 return <div className="stream-studio">
  <div className="heading-row"><div><div className="section-kicker"><Radio size={15}/> LUMI STREAM STUDIO · BETA</div><h1>O controlo da tua stream.</h1><p>Cenas, captura, gravação e overlays para OBS, Streamlabs e Discord.</p></div><span className="pill">Beta funcional · sem RTMP</span></div>
  <div className="stream-layout">
   <section className="stream-main">
    <div className="stream-preview-top"><span><span className={"stream-dot"+(recording?" recording":"")}/>{recording?"A GRAVAR":"PRÉ-VISUALIZAÇÃO"}</span><span>1280 × 720 · 16:9</span></div>
    <canvas ref={canvas} width={1280} height={720} className="stream-canvas" aria-label="Pré-visualização da cena selecionada"/>
    <video ref={screenEl} muted playsInline style={{display:"none"}}/><video ref={cameraEl} muted playsInline style={{display:"none"}}/>
    <div className="stream-controls">
     <button className={screenOn?"stream-control active":"stream-control"} onClick={toggleScreen}><Monitor size={17}/>{screenOn?"Parar ecrã":"Capturar ecrã"}</button>
     <button className={cameraOn?"stream-control active":"stream-control"} onClick={toggleCamera}>{cameraOn?<VideoOff size={17}/>:<Camera size={17}/>} {cameraOn?"Desligar câmara":"Câmara"}</button>
     <button className={micOn?"stream-control active":"stream-control"} onClick={toggleMic}><Mic size={17}/>{micOn?"Desligar mic":"Microfone"}</button>
     <button className={recording?"stream-control stop":"stream-control primary"} onClick={recording?stopRecord:startRecord}>{recording?<Square size={16}/>:<Video size={16}/>} {recording?"Parar gravação":"Gravar vídeo"}</button>
    </div>
    <p className="muted-info" role="status">{status}</p>
    <section className="section-panel stream-section"><div className="panel-heading"><div><h2><Clapperboard size={19}/> Cenas</h2><p>Muda a cena durante a gravação. O modo IRL prepara um layout próprio.</p></div><button className="tiny-btn" onClick={addScene}><Plus size={14}/> Nova cena</button></div>
     <div className="stream-scene-list">{settings.scenes.map(s=><div key={s.id} className={settings.activeId===s.id?"stream-scene selected":"stream-scene"}><button onClick={()=>chooseScene(s.id)}><span className="scene-thumbnail"><Monitor size={17}/></span><span><strong>{s.name}</strong><small>{settings.activeId===s.id?"Cena ativa":s.mode==="irl"?"Cena para telemóvel":"Mudar para esta cena"}</small></span></button>{s.mode==="custom"&&<button className="scene-remove" onClick={()=>removeScene(s.id)} aria-label={"Eliminar "+s.name}><Trash2 size={14}/></button>}</div>)}</div>
    </section>
    <section className="section-panel stream-section"><div className="panel-heading"><div><h2><WandSparkles size={19}/> Identidade da stream</h2><p>Edita títulos e mensagens — aparecem no vídeo e no overlay.</p></div><Save size={17} color="#a98dff"/></div>
     <div className="select-row"><div className="form-field"><label>Título</label><input maxLength={90} value={settings.title} onChange={e=>update({title:e.target.value})}/></div><div className="form-field"><label>Nome / @canal</label><input maxLength={50} value={settings.handle} onChange={e=>update({handle:e.target.value})}/></div></div>
     <div className="form-field"><label>Mensagem / alerta</label><input maxLength={180} value={settings.message} onChange={e=>update({message:e.target.value})}/></div>
     <div className="form-field"><label>Cor da stream</label><input type="color" value={safeHex(settings.accent)} onChange={e=>update({accent:e.target.value})} style={{width:78,padding:5}}/></div>
     <p className="muted-info">As definições ficam guardadas neste navegador. Não são ainda partilhadas automaticamente entre dispositivos.</p>
    </section>
   </section>
   <aside className="stream-side">
    <section className="section-panel stream-section"><div className="panel-heading"><div><h2><Bot size={19}/> Bots na stream</h2><p>Adiciona os bots criados no LUMI Builder.</p></div></div>
     {bots.length===0?<p className="muted-info">Ainda não tens bots. Vai a «Criar bots» e guarda um bot de Discord ou de stream.</p>:bots.map(bot=><div key={bot.id} className="stream-bot-row"><div><strong>{truncate(bot.title,30)}</strong><small>{truncate(bot.instruction,80)}</small></div><button onClick={()=>attach(bot.id)} className={settings.attachedIds.includes(bot.id)?"tiny-btn":"stream-control"}>{settings.attachedIds.includes(bot.id)?<><Check size={13}/> Adicionado</>:<><Plus size={13}/> Adicionar</>}</button></div>)}
     {attached.length>0&&<><h3 className="stream-subhead">Ações manuais</h3>{attached.map(bot=><button className="stream-action" key={bot.id} onClick={()=>botAction(bot)}><Bot size={16}/> Mostrar aviso de {truncate(bot.title,22)} <ArrowRight size={14}/></button>)}</>}
     <p className="muted-info">Os bots são rascunhos; estes botões mostram mensagens. Moderação Discord e automações reais exigem conectores autorizados.</p>
    </section>
    <section className="section-panel stream-section"><div className="panel-heading"><div><h2><Link2 size={19}/> OBS e Streamlabs</h2><p>Link de Browser Source para usar em qualquer um.</p></div></div>
     <div className="stream-url">{overlayUrl||"O link aparece quando abrires o estúdio."}</div>
     <button className="btn full" disabled={!overlayUrl} onClick={()=>copy(overlayUrl)}><Copy size={16}/> Copiar link do overlay</button>
     <button className="stream-control full" onClick={activateOverlay} style={{marginTop:10}}><Radio size={16}/>{overlayLive?"Overlay ao vivo ligado":"Ativar sincronização em tempo real"}</button>
     <p className="muted-info">OBS/Streamlabs → Adicionar fonte → Browser Source / Navegador → colar URL → 1920 × 1080. O link normal é estático; a sincronização de mensagens e cenas exige executar a migração SQL incluída no projeto.</p>
     {overlayLive&&<p className="notice">As alterações da cena e mensagem são enviadas para o overlay. Trata o link como privado: permite visualizar o teu overlay.</p>}
    </section>
    <section className="section-panel stream-section"><div className="panel-heading"><div><h2><Smartphone size={19}/> Trocar de PC para IRL</h2><p>Preparação da passagem para o telemóvel.</p></div></div>
     <button className="stream-control full" onClick={()=>chooseScene("irl")}><Smartphone size={17}/> Ativar cena IRL</button>
     <p className="muted-info">A troca contínua do vídeo PC → telemóvel precisa de um servidor de ingestão/relay RTMP ou SRT e de uma aplicação móvel ligada à mesma transmissão. Esta versão prepara a cena, mas ainda não transfere uma live entre dispositivos.</p>
    </section>
   </aside>
  </div>
  <div className="stream-bottom-grid">
   <section className="section-panel stream-section"><div className="panel-heading"><div><h2><Bot size={19}/> Bots de Discord</h2><p>Prepara a instalação de uma aplicação Discord no teu servidor.</p></div></div>
    <div className="form-field"><label>Discord Application (Client) ID — nunca o Bot Token</label><input inputMode="numeric" value={clientId} maxLength={22} onChange={e=>setClientId(e.target.value.replace(/[^0-9]/g,""))} placeholder="ID numérico da aplicação Discord"/></div>
    <div className="stream-controls"><a className="stream-control" href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Abrir Discord Developer Portal</a>{invite&&<a className="stream-control primary" href={invite} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Convidar bot para o servidor</a>}</div>
    <p className="muted-info">O convite pede apenas ver canais e enviar mensagens. Criar a aplicação e convidá-la não a torna funcional: comandos e eventos exigem um serviço Discord ligado, em desenvolvimento. Nunca coloques o token do bot neste formulário.</p>
   </section>
   <section className="section-panel stream-section"><div className="panel-heading"><div><h2><Download size={19}/> Guia e exportação</h2><p>As tuas configurações e como reutilizar noutros programas.</p></div></div>
    <div className="stream-controls"><button className="stream-control" onClick={()=>{const blob=new Blob([JSON.stringify({version:1,...settings},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="lumi-stream-scenes.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);setStatus("Configuração exportada.");}}><Download size={16}/> Exportar cenas</button><button className="stream-control" onClick={()=>setShowGuides(v=>!v)}><ShieldCheck size={16}/> {showGuides?"Fechar guia":"Ver guia rápido"}</button></div>
    {showGuides&&<div className="stream-guide"><p><strong>OBS Studio / Streamlabs:</strong> adiciona uma fonte «Browser / Navegador», cola o link e define 1920 × 1080. Podes também capturar o estúdio aberto como fonte de janela.</p><p><strong>Bots:</strong> cria o rascunho no LUMI Builder, anexa-o neste painel e mostra avisos manualmente. Os conectores externos ficam para uma próxima fase.</p><p><strong>Gravação:</strong> permite gravar o canvas localmente num navegador compatível. Para emitir diretamente em Twitch, YouTube ou Kick precisaremos de um motor RTMP/WebRTC. Não partilhes stream keys.</p></div>}
   </section>
  </div>
 </div>;
}
