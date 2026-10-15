"use client";
import {useCallback,useEffect,useRef,useState,type RefObject} from "react";
import {ArrowUpRight, CircleHelp, Cloud, ExternalLink, Globe, Link2, Radio, ShieldCheck, Smartphone, Square, Wifi, WifiOff} from "lucide-react";

type StreamRef=RefObject<MediaStream|null>;
type Props={
 canvasRef:RefObject<HTMLCanvasElement|null>;
 microphoneRef:StreamRef;
 screenRef:StreamRef;
 microphoneEnabled:boolean;
 screenEnabled:boolean;
 onNotice:(message:string)=>void;
};
type Phase="idle"|"connecting"|"live"|"reconnecting";
type RTCSession={pc:RTCPeerConnection;stream:MediaStream;url:string;sessionUrl:string|null;token:string;controller:AbortController;audio:AudioContext;destination:MediaStreamAudioDestinationNode;silent:OscillatorNode;silentGain:GainNode;inputs:MediaStreamAudioSourceNode[]};
type Metrics={bitrate:number;duration:number;connection:string};
function failMessage(error:unknown){
 const message=error instanceof Error?error.message:"Erro desconhecido";
 if(message.includes("Failed to fetch")||message.includes("NetworkError"))return "Ligação WHIP recusada ou bloqueada por CORS. Confirma o URL, HTTPS, o servidor e as permissões CORS.";
 return message;
}
function waitForIce(pc:RTCPeerConnection,timeoutMs=12000){
 return new Promise<void>(resolve=>{
  if(pc.iceGatheringState==="complete"){resolve();return;}
  let completed=false;
  const done=()=>{if(completed)return;completed=true;pc.removeEventListener("icegatheringstatechange",check);clearTimeout(timeout);resolve();};
  const check=()=>{if(pc.iceGatheringState==="complete")done();};
  const timeout=setTimeout(done,timeoutMs);
  pc.addEventListener("icegatheringstatechange",check);
 });
}
function validateWhipURL(raw:string){
 const url=new URL(raw.trim());
 if(url.protocol!=="https:"&&!(url.protocol==="http:"&&(url.hostname==="localhost"||url.hostname==="127.0.0.1")))throw new Error("O URL WHIP deve começar por https://.");
 if(url.username||url.password||url.hash)throw new Error("Utiliza um URL sem credenciais ou fragmentos.");
 return url.toString();
}
function secondsToTime(v:number){return new Date(Math.max(0,v)*1000).toISOString().slice(11,19);}
export default function LiveBroadcast({canvasRef,microphoneRef,screenRef,microphoneEnabled,screenEnabled,onNotice}:Props){
 const [url,setUrl]=useState("");
 const [token,setToken]=useState("");
 const [phase,setPhase]=useState<Phase>("idle");
 const [showSettings,setShowSettings]=useState(true);
 const [metrics,setMetrics]=useState<Metrics>({bitrate:0,duration:0,connection:"—"});
 const session=useRef<RTCSession|null>(null);
 const startedAt=useRef(0);
 const busy=useRef(false);
 const currentPhase=useRef<Phase>("idle");
 const statusRef=useRef(onNotice);
 useEffect(()=>{statusRef.current=onNotice;},[onNotice]);
 const updatePhase=(next:Phase)=>{currentPhase.current=next;setPhase(next);};
 const cleanup=useCallback(async(s:RTCSession)=>{
  s.pc.onconnectionstatechange=null;
  s.pc.oniceconnectionstatechange=null;
  s.controller.abort();
  if(s.sessionUrl){
   try{
    const headers:HeadersInit={};
    if(s.token)headers.Authorization="Bearer "+s.token;
    await fetch(s.sessionUrl,{method:"DELETE",headers,signal:AbortSignal.timeout(5000)});
   }catch{/* network interruptions or an already closed session are expected */}
  }
  s.pc.close();s.stream.getTracks().forEach(t=>t.stop());
  s.inputs.forEach(node=>node.disconnect());s.silent.disconnect();s.silentGain.disconnect();
  try{await s.audio.close();}catch{/* already closed */}
 },[]);
 const stop=useCallback(async()=>{
  if(!session.current)return;
  const active=session.current;session.current=null;
  updatePhase("idle");
  setMetrics({bitrate:0,duration:0,connection:"—"});
  statusRef.current("Emissão parada. As fontes de câmara/ecrã continuam disponíveis para pré-visualização.");
  await cleanup(active);
 },[cleanup]);
 useEffect(()=>()=>{if(session.current){void cleanup(session.current);session.current=null;}},[cleanup]);
 const refreshAudio=useCallback(()=>{
  const s=session.current;if(!s||s.audio.state==="closed")return;
  s.inputs.forEach(source=>source.disconnect());s.inputs=[];
  const sources=[microphoneRef.current,screenRef.current].filter((stream):stream is MediaStream=>Boolean(stream&&stream.getAudioTracks().some(t=>t.readyState==="live")));
  for(const input of sources){
   try{
    const node=s.audio.createMediaStreamSource(new MediaStream(input.getAudioTracks().filter(t=>t.readyState==="live")));
    node.connect(s.destination);s.inputs.push(node);
   }catch{/* Some screen capture implementations do not include audio. */}
  }
 },[microphoneRef,screenRef]);
 useEffect(()=>{refreshAudio();},[refreshAudio,microphoneEnabled,screenEnabled]);
 useEffect(()=>{
  if(phase==="idle")return;
  let previous=0,previousTime=0;
  const poll=async()=>{
   const s=session.current;if(!s)return;
   try{
    const stats=await s.pc.getStats();let bytes=0;
    stats.forEach(report=>{if(report.type==="outbound-rtp"&&!report.isRemote)bytes+=Number(report.bytesSent||0);});
    const now=performance.now();const rate=previousTime?Math.max(0,Math.round((bytes-previous)*8/(now-previousTime))):0;
    previous=bytes;previousTime=now;
    setMetrics({bitrate:rate,duration:Math.floor((Date.now()-startedAt.current)/1000),connection:s.pc.connectionState});
   }catch{/* Peer may have closed between intervals. */}
  };
  void poll();
  const i=setInterval(()=>void poll(),2000);
  return()=>clearInterval(i);
 },[phase]);
 async function start(){
  if(busy.current||session.current)return;
  busy.current=true;
  updatePhase("connecting");
  let local:RTCSession|null=null;
  try{
   if(!canvasRef.current?.captureStream)throw new Error("O navegador não suporta emitir o canvas. Experimenta Chrome ou Edge num computador.");
   if(typeof RTCPeerConnection==="undefined")throw new Error("WebRTC não disponível neste navegador.");
   const target=validateWhipURL(url);
   const audio=new AudioContext();await audio.resume();
   const destination=audio.createMediaStreamDestination();
   const silent=audio.createOscillator(),silentGain=audio.createGain();
   silentGain.gain.value=0;silent.connect(silentGain);silentGain.connect(destination);silent.start();
   const capture=canvasRef.current.captureStream(30);
   const stream=new MediaStream([...capture.getVideoTracks(),...destination.stream.getAudioTracks()]);
   const pc=new RTCPeerConnection();
   const controller=new AbortController();
   local={pc,stream,url:target,sessionUrl:null,token:token.trim(),controller,audio,destination,silent,silentGain,inputs:[]};
   session.current=local;
   refreshAudio();
   stream.getTracks().forEach(track=>pc.addTransceiver(track,{direction:"sendonly"}));
   pc.onconnectionstatechange=()=>{
    if(session.current!==local)return;
    if(pc.connectionState==="connected"){
     if(currentPhase.current!=="live")statusRef.current("Emissão WebRTC ligada ao servidor. Confirma no painel do teu fornecedor se está visível aos espectadores.");
     updatePhase("live");
    }else if(pc.connectionState==="disconnected"||pc.connectionState==="failed"){
     updatePhase("reconnecting");
     statusRef.current("Ligação instável ou perdida: verifica a rede e o servidor WHIP. A emissão pode ter parado.");
    }else if(pc.connectionState==="closed"){
     updatePhase("idle");
    }
   };
   const offer=await pc.createOffer();
   await pc.setLocalDescription(offer);
   await waitForIce(pc);
   if(session.current!==local)throw new Error("Emissão cancelada.");
   const headers:HeadersInit={"Content-Type":"application/sdp"};
   if(local.token)headers.Authorization="Bearer "+local.token;
   const res=await fetch(target,{method:"POST",headers,body:pc.localDescription?.sdp||offer.sdp||"",signal:controller.signal});
   if(res.status!==201)throw new Error("O servidor WHIP devolveu HTTP "+res.status+". Confirma que o endpoint aceita publicação WebRTC e a credencial.");
   const location=res.headers.get("Location");
   if(location){const sessionLocation=new URL(location,target).toString();
    if(new URL(sessionLocation).origin!==new URL(target).origin)throw new Error("O servidor WHIP devolveu uma sessão noutro domínio. Por segurança a emissão não foi iniciada.");
    local.sessionUrl=sessionLocation;
   }
   const answer=await res.text();
   if(session.current!==local)throw new Error("Emissão cancelada.");
   await pc.setRemoteDescription({type:"answer",sdp:answer});
   startedAt.current=Date.now();
   setShowSettings(false);
   statusRef.current("Sinal enviado ao servidor WHIP. A verificar a ligação WebRTC…");
  }catch(error){
   const cancelled=error instanceof DOMException&&error.name==="AbortError";
   if(!cancelled)statusRef.current(failMessage(error));
   if(local&&session.current===local)session.current=null;
   if(local)await cleanup(local);
   updatePhase("idle");
  }finally{busy.current=false;}
 }
 const connected=phase==="live";
 return <section className="section-panel stream-section broadcast-station" id="go-live">
  <div className="panel-heading"><div><h2><Radio size={19}/> Emitir em direto</h2><p>Transmite o vídeo do estúdio pela Internet usando WebRTC / WHIP.</p></div><span className={connected?"broadcast-status live":phase==="idle"?"broadcast-status":"broadcast-status wait"}><span className="stream-dot"/>{connected?"NO AR":phase==="connecting"?"A LIGAR":phase==="reconnecting"?"SEM SINAL":"OFFLINE"}</span></div>
  <div className="broadcast-topline"><div><small>SERVIDOR</small><strong>{phase==="idle"?"À espera de ligação":"Ligação WHIP"}</strong></div><div><small>TEMPO EM DIRETO</small><strong>{secondsToTime(metrics.duration)}</strong></div><div><small>ENVIO</small><strong>{(metrics.bitrate/1000).toFixed(0)} kbps</strong></div></div>
  {phase==="idle"&&<><button type="button" className="broadcast-disclosure" onClick={()=>setShowSettings(v=>!v)}><Link2 size={16}/> {showSettings?"Ocultar configuração":"Configurar destino WHIP"} <span>{showSettings?"−":"+"}</span></button>
    {showSettings&&<div className="broadcast-fields"><div className="form-field"><label>Servidor WHIP (endereço HTTPS de publicação)</label><input type="password" autoComplete="off" spellCheck={false} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://fornecedor.exemplo/.../publish" aria-label="URL privado do destino WHIP"/></div>
     <div className="form-field"><label>Bearer Token (apenas se o fornecedor pedir)</label><input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder="Deixa vazio se estiver incluído no URL"/></div>
     <p className="muted-info"><ShieldCheck size={14} style={{verticalAlign:"middle"}}/> Estas credenciais permanecem nesta página enquanto a mantiveres aberta. Não são guardadas no Supabase nem enviadas à LUMI; o navegador liga diretamente ao teu fornecedor de vídeo.</p>
    </div>}
   </>}
  <div className="stream-controls"><button className={phase==="idle"?"btn broadcast-button":"stream-control stop broadcast-button"} onClick={phase==="idle"?start:()=>void stop()} disabled={phase==="connecting"||(!url.trim()&&phase==="idle")} type="button">{phase==="idle"?<><Radio size={17}/> ENTRAR EM DIRETO</>:phase==="connecting"?<><Wifi size={16}/> A ligar…</>:<><Square size={15}/> TERMINAR TRANSMISSÃO</>}</button></div>
  {phase!=="idle"&&<p className="muted-info"><Wifi size={13} style={{verticalAlign:"middle"}}/> {metrics.connection==="connected"?"Servidor ligado":"Ligação WebRTC: "+metrics.connection}. A mudança de cenas permanece ativa durante a emissão.</p>}
  <div className="broadcast-note"><Globe size={17}/><p><strong>Para Twitch, YouTube, Kick e vários canais:</strong> usa um fornecedor de vídeo com entrada WHIP e saídas RTMP/simulcast para as plataformas pretendidas. Um simples URL RTMP ou uma stream key da Twitch não funcionam diretamente neste campo.</p></div>
  <div className="broadcast-links"><a href="https://developers.cloudflare.com/stream/examples/browser-based-webrtc/" target="_blank" rel="noopener noreferrer"><Cloud size={15}/> Como obter um destino WHIP <ExternalLink size={13}/></a><a href="https://obsproject.com/kb/whip-streaming-guide" target="_blank" rel="noopener noreferrer"><CircleHelp size={15}/> O que é WHIP? <ArrowUpRight size={13}/></a></div>
  <div className="broadcast-mobile"><Smartphone size={16}/><p><strong>Streaming fora de casa:</strong> abre a LUMI no telemóvel, ativa câmara + microfone e usa a entrada WHIP do teu fornecedor. Para uma troca PC → IRL sem corte, é necessário um servidor de ingestão com handoff; esse serviço ainda não faz parte desta versão.</p></div>
  <p className="muted-info">É necessária uma entrada WHIP válida e compatível com CORS. A emissão depende da ligação ao servidor; não foi testada com a tua conta Twitch ou YouTube. Evita fechar esta página durante a live.</p>
 </section>;
}
