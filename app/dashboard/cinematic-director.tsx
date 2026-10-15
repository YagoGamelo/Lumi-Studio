"use client";

import {useEffect,useRef,useState,type ChangeEvent} from "react";
import {Camera,Clapperboard,Download,Film,Play,RefreshCcw,Sparkles,Video,VideoOff} from "lucide-react";

type Effect="drone"|"whip"|"orbit"|"dolly"|"fade";
type Shot=0|1;
type Transition={start:number;duration:number;effect:Effect;from:Shot;to:Shot};
const effectLabels:Record<Effect,string>={
 drone:"Drone virtual / subida aérea",whip:"Whip pan / varredura",orbit:"Órbita cinematográfica",
 dolly:"Dolly zoom / aproximação",fade:"Dissolução elegante"
};
type Plan={effect:Effect;seconds:number;explanation:string};
const dims={width:960,height:540};
function clamp(value:number){return Math.max(0,Math.min(1,value));}
function ease(value:number){const p=clamp(value);return p*p*(3-2*p);}
function cover(ctx:CanvasRenderingContext2D,video:HTMLVideoElement,w:number,h:number){
 const {videoWidth:vw,videoHeight:vh}=video;
 if(video.readyState<2||!vw||!vh)return false;
 const scale=Math.max(w/vw,h/vh),sw=vw*scale,sh=vh*scale;
 ctx.drawImage(video,(w-sw)/2,(h-sh)/2,sw,sh);
 return true;
}
export default function CinematicDirector(){
 const [sourcesCount,setSourcesCount]=useState<1|2>(1);
 const [sourceNames,setSourceNames]=useState<[string,string]>(["Cena de demonstração A","Cena de demonstração B"]);
 const [effect,setEffect]=useState<Effect>("drone"),[duration,setDuration]=useState(2.5);
 const [prompt,setPrompt]=useState("Faz uma transição estilo drone: sobe suavemente e revela o segundo plano em 3 segundos.");
 const [working,setWorking]=useState(false),[recording,setRecording]=useState(false);
 const [status,setStatus]=useState("Pronto. Usa um vídeo, uma câmara, ou a demonstração para testar.");
 const [lastPlan,setLastPlan]=useState<Plan|null>(null);
 const canvas=useRef<HTMLCanvasElement>(null),videos=useRef<[HTMLVideoElement|null,HTMLVideoElement|null]>([null,null]);
 const streams=useRef<[MediaStream|null,MediaStream|null]>([null,null]);
 const urls=useRef<[string|null,string|null]>([null,null]);
 const transition=useRef<Transition|null>(null);
 const active=useRef<Shot>(0);
 const countRef=useRef<1|2>(1);
 const frame=useRef<number>(0);
 useEffect(()=>{countRef.current=sourcesCount;},[sourcesCount]);
 useEffect(()=>{
  let raf=0;
  const paint=(now:number)=>{
   const el=canvas.current;const ctx=el?.getContext("2d");
   if(!ctx){raf=requestAnimationFrame(paint);return;}
   const w=dims.width,h=dims.height;
   ctx.fillStyle="#0e1121";ctx.fillRect(0,0,w,h);
   const shot=(index:Shot,alpha:number,zoom=1,x=0,y=0,rotate=0)=>{
    ctx.save();ctx.globalAlpha=clamp(alpha);
    ctx.translate(w/2+x,h/2+y);ctx.rotate(rotate);ctx.scale(zoom,zoom);ctx.translate(-w/2,-h/2);
    const source=index===1&&countRef.current===2?videos.current[1]:videos.current[0];
    const fallback=index===1&&(!source||source.readyState<2)?videos.current[0]:source;
    if(!fallback||!cover(ctx,fallback,w,h)){
     const grad=ctx.createLinearGradient(0,0,w,h);
     grad.addColorStop(0,index===0?"#263557":"#48346f");grad.addColorStop(1,index===0?"#0f2237":"#152f48");
     ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
     ctx.fillStyle=index===0?"#799dd350":"#b79bfa50";
     ctx.beginPath();ctx.arc(index===0?700:300,150,160,0,Math.PI*2);ctx.fill();
     ctx.fillStyle="#152339";ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,370);ctx.lineTo(150,240);ctx.lineTo(320,430);ctx.lineTo(470,275);ctx.lineTo(710,425);ctx.lineTo(900,270);ctx.lineTo(w,h);ctx.fill();
     ctx.font="bold 40px sans-serif";ctx.fillStyle="#f7f5ff";ctx.textAlign="center";ctx.fillText(index===0?"PLANO A · DEMONSTRAÇÃO":"PLANO B · DEMONSTRAÇÃO",w/2,h/2);
     ctx.font="20px sans-serif";ctx.fillStyle="#c7c7e3";ctx.fillText("Carrega um vídeo ou ativa a câmara para o substituir",w/2,h/2+42);
    }
    ctx.restore();
   };
   const move=transition.current;
   if(move){
    const p=clamp((now-move.start)/move.duration),e=ease(p);
    if(move.effect==="drone"){
     shot(move.from,1-e*0.88,1+0.27*e,0,-105*e);
     shot(move.to,e,1.33-0.29*e,0,115*(1-e));
    }else if(move.effect==="whip"){
     shot(move.from,1-e,1.12,-w*0.95*e,0,-0.07*e);
     shot(move.to,e,1.12,w*0.95*(1-e),0,0.07*(1-e));
    }else if(move.effect==="orbit"){
     shot(move.from,1-e,1+0.22*e,-35*e,0,-0.08*e);
     shot(move.to,e,1.24-0.22*e,45*(1-e),0,0.08*(1-e));
    }else if(move.effect==="dolly"){
     shot(move.from,1-e,1+0.43*e,0,0);
     shot(move.to,e,1.46-0.46*e,0,0);
    }else{
     shot(move.from,1,1);
     shot(move.to,e,1);
    }
    if(p>=1){active.current=move.to;transition.current=null;}
   }else{
    shot(active.current,1,active.current===1&&countRef.current===1?1.14:1);
   }
   const shade=ctx.createLinearGradient(0,0,0,120);shade.addColorStop(0,"#080d1cae");shade.addColorStop(1,"#080d1c00");
   ctx.fillStyle=shade;ctx.fillRect(0,0,w,120);
   ctx.fillStyle="#f5f2ff";ctx.textAlign="left";ctx.font="bold 23px sans-serif";ctx.fillText("✦ LUMI CINEMATIC DIRECTOR",25,42);
   ctx.fillStyle="#d7c8fa";ctx.font="16px sans-serif";ctx.fillText("PREVISUALIZAÇÃO · TRANSIÇÕES 2D",25,70);
   const bottom=ctx.createLinearGradient(0,h-100,0,h);bottom.addColorStop(0,"#12172a00");bottom.addColorStop(1,"#12172ae3");
   ctx.fillStyle=bottom;ctx.fillRect(0,h-100,w,100);
   ctx.font="bold 17px sans-serif";ctx.fillStyle="#e8dfff";ctx.textAlign="right";
   ctx.fillText(move?effectLabels[move.effect]:(active.current===0?"Plano A":"Plano B / virtual"),w-24,h-26);
   raf=requestAnimationFrame(paint);
  };
  raf=requestAnimationFrame(paint);
  frame.current=raf;
  return()=>{
   cancelAnimationFrame(raf);
   streams.current.forEach(stream=>stream?.getTracks().forEach(track=>track.stop()));
   urls.current.forEach(url=>{if(url)URL.revokeObjectURL(url);});
  };
 },[]);
 function release(index:Shot){
  streams.current[index]?.getTracks().forEach(t=>t.stop());streams.current[index]=null;
  if(urls.current[index])URL.revokeObjectURL(urls.current[index]!);urls.current[index]=null;
  const v=videos.current[index];if(v){v.pause();v.srcObject=null;v.removeAttribute("src");v.load();}
 }
 function upload(event:ChangeEvent<HTMLInputElement>,index:Shot){
  const file=event.currentTarget.files?.[0];if(!file)return;
  release(index);
  const url=URL.createObjectURL(file);urls.current[index]=url;
  const video=videos.current[index];if(video){video.src=url;video.loop=true;video.muted=true;void video.play().catch(()=>setStatus("Toca no vídeo para autorizar a reprodução no navegador."));}
  setSourceNames(names=>names.map((n,i)=>i===index?file.name:n) as [string,string]);
  setStatus("Vídeo "+(index===0?"A":"B")+" carregado apenas neste navegador.");
  event.currentTarget.value="";
 }
 async function camera(index:Shot){
  if(!navigator.mediaDevices?.getUserMedia){setStatus("Este dispositivo não permite abrir câmaras neste navegador.");return;}
  try{
   const cameraList=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==="videoinput");
   const opts:MediaStreamConstraints={audio:false,video:index===1&&cameraList.length>1?{deviceId:{ideal:cameraList[1].deviceId}}:{facingMode:"user"}};
   const stream=await navigator.mediaDevices.getUserMedia(opts);
   release(index);streams.current[index]=stream;
   const video=videos.current[index];if(video){video.srcObject=stream;video.muted=true;void video.play().catch(()=>{});}
   setSourceNames(names=>names.map((n,i)=>i===index?"Câmara "+(index===0?"A":"B"):n) as [string,string]);
   setStatus("Câmara "+(index===0?"A":"B")+" ativa. Podes desligá-la carregando em «Limpar».");
  }catch(error){setStatus("Não foi possível abrir a câmara: "+(error instanceof Error?error.message:"permissão negada"));}
 }
 function clear(index:Shot){
  release(index);
  setSourceNames(names=>names.map((n,i)=>i===index?"Cena de demonstração "+(index===0?"A":"B"):n) as [string,string]);
  setStatus("Fonte removida. A demonstração é apenas um cenário ilustrativo.");
 }
 function start(e:Effect=effect,seconds:number=duration){
  transition.current={start:performance.now(),duration:Math.max(1,Math.min(6,seconds))*1000,effect:e,from:active.current,to:active.current===0?1:0};
  setStatus("A reproduzir: "+effectLabels[e]+". "+(sourcesCount===1?"Com uma câmara, a mudança de ângulo é virtual.":"Com duas fontes, o efeito muda de plano."));
 }
 async function ask(){
  if(working||prompt.trim().length<6)return;
  setWorking(true);
  try{
   const res=await fetch("/api/bots/cinematic/plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
   const payload=await res.json();
   if(!res.ok)throw new Error(payload.error||"Não foi possível preparar a transição.");
   const plan=payload.plan as Plan;
   setEffect(plan.effect);setDuration(plan.seconds);setLastPlan(plan);
   start(plan.effect,plan.seconds);
   setStatus((payload.source==="ai"?"A IA preparou o efeito: ":"Pedido interpretado por regras: ")+plan.explanation);
  }catch(error){setStatus(error instanceof Error?error.message:"Falha ao interpretar o pedido.");}
  finally{setWorking(false);}
 }
 function exportVideo(){
  if(recording)return;
  if(!canvas.current?.captureStream||typeof MediaRecorder==="undefined"){setStatus("Este navegador não permite exportar esta demonstração. Experimenta Chrome ou Edge.");return;}
  if(transition.current){setStatus("Termina a transição atual antes de exportar.");return;}
  let stream:MediaStream|null=null;
  try{
   const formats=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm","video/mp4"];
   const mime=formats.find(f=>MediaRecorder.isTypeSupported(f));
   stream=canvas.current.captureStream(30);
   const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
   const chunks:Blob[]=[];
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onstop=()=>{
    if(chunks.length){
     const type=recorder.mimeType||"video/webm",blob=new Blob(chunks,{type}),url=URL.createObjectURL(blob);
     const a=document.createElement("a");a.href=url;a.download="lumi-cinematic-"+Date.now()+(type.includes("mp4")?".mp4":".webm");document.body.appendChild(a);a.click();a.remove();
     window.setTimeout(()=>URL.revokeObjectURL(url),30000);
     setStatus("Vídeo da transição transferido para o dispositivo. A exportação não inclui som.");
    }else setStatus("Não foi possível exportar o vídeo.");
    stream?.getTracks().forEach(track=>track.stop());setRecording(false);
   };
   recorder.onerror=()=>setStatus("Erro ao gravar o vídeo.");
   recorder.start(250);setRecording(true);start();
   window.setTimeout(()=>{if(recorder.state==="recording")recorder.stop();},duration*1000+600);
  }catch(error){stream?.getTracks().forEach(t=>t.stop());setRecording(false);setStatus("Erro na exportação: "+(error instanceof Error?error.message:"gravação indisponível"));}
 }
 return <section className="section-panel cinematic-lab">
  <div className="panel-heading"><div><div className="section-kicker"><Film size={14}/> TESTE DO BOT · DIRETOR CINEMATOGRÁFICO</div><h2>Descreve a transição. Vê o resultado.</h2><p>Simulação 2D em tempo real com uma ou duas câmaras/vídeos.</p></div><Clapperboard size={26} color="#b59afa"/></div>
  <div className="cinematic-stage"><canvas ref={canvas} width={dims.width} height={dims.height} aria-label="Pré-visualização da transição cinematográfica"/>
   <video ref={el=>{videos.current[0]=el;}} muted playsInline loop style={{display:"none"}}/>
   <video ref={el=>{videos.current[1]=el;}} muted playsInline loop style={{display:"none"}}/></div>
  <div className="cinematic-fields">
   <div className="form-field"><label>Quantas câmaras ou fontes?</label><select value={sourcesCount} onChange={e=>{const num=Number(e.target.value) as 1|2;setSourcesCount(num);countRef.current=num;active.current=0;transition.current=null;}}><option value={1}>Uma câmara — movimento virtual</option><option value={2}>Duas câmaras — passagem entre planos</option></select></div>
   <div className="form-field"><label>Efeito de cinema</label><select value={effect} onChange={e=>setEffect(e.target.value as Effect)}>{(Object.keys(effectLabels) as Effect[]).map(key=><option key={key} value={key}>{effectLabels[key]}</option>)}</select></div>
   <div className="form-field"><label>Duração da transição</label><select value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[1,1.5,2,2.5,3,4,5,6].map(s=><option key={s} value={s}>{s} segundos</option>)}</select></div>
  </div>
  <div className="cinematic-source-grid">
   {([0,1] as Shot[]).filter(i=>i===0||sourcesCount===2).map(index=><div className="cinematic-source" key={index}><strong>Fonte {index===0?"A":"B"}</strong><small>{sourceNames[index]}</small><div className="stream-controls"><label className="stream-control"><Video size={15}/> Enviar vídeo<input type="file" accept="video/*" hidden onChange={e=>upload(e,index)}/></label><button className="stream-control" type="button" onClick={()=>camera(index)}><Camera size={15}/> Câmara</button><button className="stream-control" type="button" onClick={()=>clear(index)}><VideoOff size={15}/> Limpar</button></div></div>)}
  </div>
  <div className="form-field"><label htmlFor="cinematic-prompt">Diz ao teu bot o que queres ver</label><textarea id="cinematic-prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Faz uma subida cinematográfica estilo drone, passa para a segunda câmara e aproxima suavemente durante 3 segundos…"/></div>
  <div className="stream-controls cinematic-buttons"><button className="btn" type="button" disabled={working||recording||prompt.trim().length<6} onClick={ask}><Sparkles size={16}/>{working?"A preparar…":"Pedir transição ao bot"}</button><button className="stream-control" type="button" disabled={recording} onClick={()=>start()}><Play size={16}/> Testar efeito escolhido</button><button className="stream-control" type="button" disabled={recording} onClick={exportVideo}><Download size={16}/>{recording?"A exportar…":"Exportar clip"}</button></div>
  {lastPlan&&<p className="cinematic-director-note"><Sparkles size={16}/> {lastPlan.explanation}</p>}
  <p role="status" className="muted-info cinematic-status">{status}</p>
  <p className="muted-info">Os vídeos e a câmara ficam neste dispositivo. Estes efeitos usam transformações 2D (zoom, rotação e mistura), não filmagens aéreas reais nem geração de novas perspetivas 3D. A interpretação por IA funciona quando a API de IA está configurada; sem ela, o pedido é interpretado por regras locais no servidor. Usa apenas vídeos teus ou licenciados.</p>
 </section>;
}
