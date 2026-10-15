"use client";
import {useEffect,useRef,useState,type ChangeEvent,type RefObject} from "react";
import {Camera,Check,CirclePlay,Clapperboard,Download,Film,ImagePlus,Pause,RotateCcw,Sparkles,Video,VideoOff,WandSparkles} from "lucide-react";
type Style="drone"|"orbit"|"whip"|"zoom"|"dissolve"|"push";
type Direction="left"|"right"|"up"|"down"|"center";
type Plan={style:Style;seconds:number;direction:Direction;description:string};
const styles:{id:Style;label:string;description:string}[]=[
 {id:"drone",label:"Drone digital",description:"Voo simulado com zoom e movimento panorâmico"},
 {id:"orbit",label:"Órbita 2.5D",description:"Movimento circular e parallax digital"},
 {id:"whip",label:"Whip pan",description:"Movimento lateral rápido entre câmaras"},
 {id:"zoom",label:"Zoom de cinema",description:"Aproximação com transição dinâmica"},
 {id:"dissolve",label:"Dissolvência",description:"Troca suave entre planos"},
 {id:"push",label:"Deslizamento",description:"Empurra uma imagem para revelar outra"}
];
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{const x=clamp(n);return x*x*(3-2*x);};
type Props={botTitle?:string;initialPrompt?:string;onClose:()=>void};
type Source="a"|"b";
function cover(ctx:CanvasRenderingContext2D,video:HTMLVideoElement,x:number,y:number,w:number,h:number,scale=1,dx=0,dy=0,angle=0,alpha=1){
 if(video.readyState<2||!video.videoWidth||!video.videoHeight)return;
 const s=Math.max(w/video.videoWidth,h/video.videoHeight);
 const ww=video.videoWidth*s,hh=video.videoHeight*s;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.globalAlpha=clamp(alpha);
 ctx.translate(x+w/2+dx,y+h/2+dy);ctx.rotate(angle);ctx.scale(scale,scale);
 ctx.drawImage(video,-ww/2,-hh/2,ww,hh);
 ctx.restore();
}
function paint(ctx:CanvasRenderingContext2D,first:HTMLVideoElement|null,second:HTMLVideoElement|null,plan:Plan,p:number){
 const w=1280,h=720;
 const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,"#111428");bg.addColorStop(1,"#2b1643");ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 const a=first?.readyState&&first.readyState>=2?first:null;
 const b=second?.readyState&&second.readyState>=2?second:null;
 const progress=ease(p);
 if(a){
  const q=progress,blend=ease((q-.35)/.3);
  const dir=plan.direction==="right"?1:plan.direction==="left"?-1:1;
  let aa={scale:1,dx:0,dy:0,angle:0};
  let bb={scale:1,dx:0,dy:0,angle:0};
  switch(plan.style){
   case "drone":aa={scale:1.05+.32*q,dx:-115*q*dir,dy:-85*q,angle:-.035*q};bb={scale:1.32-.22*blend,dx:145*(1-blend)*dir,dy:80*(1-blend),angle:.035*(1-blend)};break;
   case "orbit":aa={scale:1.16,dx:125*Math.sin(q*Math.PI*1.25),dy:48*Math.cos(q*Math.PI*1.25),angle:.055*Math.sin(q*Math.PI)};bb={scale:1.17,dx:-100*(1-blend),dy:35*(1-blend),angle:-.05*(1-blend)};break;
   case "whip":aa={scale:1.03,dx:-w*blend*dir,dy:0,angle:-.015*blend};bb={scale:1.03,dx:w*(1-blend)*dir,dy:0,angle:.015*(1-blend)};break;
   case "zoom":aa={scale:1+1.05*blend,dx:0,dy:0,angle:0};bb={scale:1.78-.78*blend,dx:0,dy:0,angle:0};break;
   case "push":aa={scale:1.02,dx:-w*blend*dir,dy:0,angle:0};bb={scale:1.02,dx:w*(1-blend)*dir,dy:0,angle:0};break;
   case "dissolve":aa={scale:1+.07*q,dx:0,dy:0,angle:0};bb={scale:1.09-.09*blend,dx:0,dy:0,angle:0};break;
  }
  cover(ctx,a,0,0,w,h,aa.scale,aa.dx,aa.dy,aa.angle);
  if(b){
   cover(ctx,b,0,0,w,h,bb.scale,bb.dx,bb.dy,bb.angle,plan.style==="push"||plan.style==="whip"?1:blend);
  }else if(plan.style==="zoom"||plan.style==="drone"||plan.style==="orbit"){
   // One camera: keep movement within a single image, no synthetic 3D scene.
  }
 }else{
  ctx.fillStyle="#383456";ctx.beginPath();ctx.arc(w*.67,h*.44,240,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#ebe8fc";ctx.font="bold 62px sans-serif";ctx.textAlign="center";ctx.fillText("LUMI CINEMATIC",w/2,h/2-30);
  ctx.font="27px sans-serif";ctx.fillStyle="#b7aecf";ctx.fillText("Escolhe uma câmara ou um vídeo para começar",w/2,h/2+32);ctx.textAlign="left";
 }
 const shade=ctx.createLinearGradient(0,0,0,180);shade.addColorStop(0,"#05050dd3");shade.addColorStop(1,"#05050d00");ctx.fillStyle=shade;ctx.fillRect(0,0,w,190);
 ctx.fillStyle="#eee8ff";ctx.textAlign="left";ctx.font="bold 25px sans-serif";ctx.fillText("✦ LUMI CINEMATIC",30,44);
 ctx.fillStyle="#d2b8ff";ctx.font="18px sans-serif";const chosen=styles.find(s=>s.id===plan.style);ctx.fillText((chosen?.label||"Transição")+" · "+(b?"DUAS FONTES":"UMA FONTE"),30,77);
 ctx.fillStyle="#0a0a13af";ctx.fillRect(0,h-44,w,44);ctx.fillStyle="#bca0ff";ctx.fillRect(0,h-44,w*p,5);
 ctx.font="16px sans-serif";ctx.fillStyle="#ede5ff";ctx.fillText("EFEITO DIGITAL · PRÉ-VISUALIZAÇÃO",25,h-15);
}
function stopStream(stream:MediaStream|null){stream?.getTracks().forEach(t=>t.stop());}
export default function CinematicLab({botTitle,initialPrompt,onClose}:Props){
 const canvas=useRef<HTMLCanvasElement>(null);
 const aVideo=useRef<HTMLVideoElement>(null),bVideo=useRef<HTMLVideoElement>(null);
 const cameraA=useRef<MediaStream|null>(null),cameraB=useRef<MediaStream|null>(null);
 const urlA=useRef<string|null>(null),urlB=useRef<string|null>(null);
 const [sourceA,setSourceA]=useState("Sem fonte"),[sourceB,setSourceB]=useState("Sem segunda fonte");
 const [prompt,setPrompt]=useState(initialPrompt||"Faz uma transição cinematográfica estilo drone, com movimento aéreo suave, em 6 segundos.");
 const [plan,setPlan]=useState<Plan>({style:"drone",seconds:6,direction:"left",description:"Movimento panorâmico e zoom digital."});
 const planRef=useRef(plan);
 const [playing,setPlaying]=useState(false),playingRef=useRef(false);
 const [exporting,setExporting]=useState(false),exportingRef=useRef(false);
 const [progress,setProgress]=useState(0),progressRef=useRef(0);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("Escolhe um ou dois vídeos, ou liga uma ou duas câmaras.");
 const previous=useRef(0),lastUI=useRef(0),recorder=useRef<MediaRecorder|null>(null);
 const blobs=useRef<Blob[]>([]);
 const loaded=sourceA!=="Sem fonte";
 function updatePlan(next:Partial<Plan>){setPlan(old=>({...old,...next}));}
 useEffect(()=>{planRef.current=plan;},[plan]);
 useEffect(()=>{
  let raf=0;
  function frame(t:number){
   const ctx=canvas.current?.getContext("2d");
   if(playingRef.current){
    const seconds=planRef.current.seconds||6;
    const step=previous.current?Math.min((t-previous.current)/1000,0.15):0;
    progressRef.current=Math.min(1,progressRef.current+step/seconds);
    if(progressRef.current>=1){
     playingRef.current=false;setPlaying(false);
     if(exportingRef.current&&recorder.current?.state==="recording"){
      setTimeout(()=>{if(recorder.current?.state==="recording")recorder.current.stop();},140);
     }
    }
   }
   previous.current=t;
   if(ctx&&canvas.current){
    paint(ctx,aVideo.current,bVideo.current,planRef.current,progressRef.current);
   }
   if(t-lastUI.current>=90){setProgress(progressRef.current);lastUI.current=t;}
   raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  return()=>cancelAnimationFrame(raf);
 },[]);
 useEffect(()=>()=>{stopStream(cameraA.current);stopStream(cameraB.current);if(urlA.current)URL.revokeObjectURL(urlA.current);if(urlB.current)URL.revokeObjectURL(urlB.current);if(recorder.current?.state==="recording")recorder.current.stop();},[]);
 function resetStream(source:Source){
  const video=source==="a"?aVideo.current:bVideo.current;
  const current=source==="a"?cameraA:cameraB;
  const uri=source==="a"?urlA:urlB;
  stopStream(current.current);current.current=null;
  if(uri.current)URL.revokeObjectURL(uri.current);uri.current=null;
  if(video){video.pause();video.srcObject=null;video.removeAttribute("src");video.load();}
 }
 function upload(source:Source,event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0];event.target.value="";
  if(!file)return;
  if(!file.type.startsWith("video/")){setMessage("Escolhe um ficheiro de vídeo compatível.");return;}
  if(file.size>250*1024*1024){setMessage("Ficheiro demasiado grande. Usa um vídeo com menos de 250 MB.");return;}
  resetStream(source);
  const uri=URL.createObjectURL(file);
  if(source==="a"){urlA.current=uri;setSourceA(file.name);}else{urlB.current=uri;setSourceB(file.name);}
  const v=source==="a"?aVideo.current:bVideo.current;
  if(v){v.src=uri;v.muted=true;v.loop=true;v.playsInline=true;void v.play().catch(()=>{setMessage("Carrega em Pré-visualizar para iniciar o vídeo.");});}
  setMessage("Vídeo carregado apenas no teu navegador. Não é enviado ao servidor.");
 }
 async function camera(source:Source,facing:"user"|"environment"){
  if(!navigator.mediaDevices?.getUserMedia){setMessage("Este navegador não permite aceder à câmara.");return;}
  try{
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720}},audio:false});
   resetStream(source);
   const v=source==="a"?aVideo.current:bVideo.current;
   if(source==="a"){cameraA.current=stream;setSourceA("Câmara "+(facing==="user"?"frontal":"traseira"));}
   else {cameraB.current=stream;setSourceB("Câmara "+(facing==="user"?"frontal":"traseira"));}
   if(v){v.srcObject=stream;v.muted=true;v.playsInline=true;void v.play().catch(()=>{});}
   stream.getVideoTracks()[0]?.addEventListener("ended",()=>{setMessage("Uma das câmaras foi desligada.");});
   setMessage("Câmara ligada. Alguns dispositivos não permitem duas câmaras em simultâneo.");
  }catch(error){setMessage(error instanceof Error?error.message:"A câmara não está disponível.");}
 }
 function remove(source:Source){resetStream(source);if(source==="a")setSourceA("Sem fonte");else setSourceB("Sem segunda fonte");}
 async function planFromPrompt(){
  if(prompt.trim().length<8){setMessage("Descreve o movimento pretendido com mais detalhe.");return;}
  setBusy(true);
  try{
   const res=await fetch("/api/bots/cinematic/plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,sources:sourceB==="Sem segunda fonte"?1:2})});
   const data=await res.json();
   if(!res.ok)throw new Error(data.error||"Falha a preparar a transição.");
   updatePlan(data.plan);
   progressRef.current=0;playingRef.current=false;setPlaying(false);
   setMessage(data.engine==="ai"?"IA: "+data.plan.description:data.notice||"Estilo preparado com regras locais, sem IA externa.");
  }catch(error){setMessage(error instanceof Error?error.message:"Não foi possível preparar o efeito.");}
  finally{setBusy(false);}
 }
 function togglePlay(){
  if(!loaded){setMessage("Liga uma câmara ou escolhe um vídeo para começar.");return;}
  if(progressRef.current>=1)progressRef.current=0;
  if(!playingRef.current){void aVideo.current?.play().catch(()=>{});void bVideo.current?.play().catch(()=>{});}
  playingRef.current=!playingRef.current;setPlaying(playingRef.current);previous.current=0;
 }
 function restart(){progressRef.current=0;playingRef.current=false;setPlaying(false);setProgress(0);}
 function exportVideo(){
  if(!loaded){setMessage("Precisas de pelo menos uma fonte de vídeo.");return;}
  if(typeof MediaRecorder==="undefined"||!canvas.current?.captureStream){setMessage("O teu navegador não suporta exportar vídeo do canvas. Experimenta Chrome/Edge num computador.");return;}
  if(exportingRef.current)return;
  try{
   const stream=canvas.current.captureStream(30);
   const supported=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];
   const mime=supported.find(type=>MediaRecorder.isTypeSupported(type));
   const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
   recorder.current=rec;blobs.current=[];
   rec.ondataavailable=e=>{if(e.data.size>0)blobs.current.push(e.data);};
   rec.onerror=()=>setMessage("Ocorreu um erro durante a exportação.");
   rec.onstop=()=>{
    const blob=new Blob(blobs.current,{type:rec.mimeType||"video/webm"});
    if(blob.size){const objectUrl=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=objectUrl;anchor.download="lumi-cinematic-"+Date.now()+".webm";document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),30000);setMessage("Transição exportada em WebM (sem áudio).");}
    else setMessage("A exportação terminou sem vídeo.");
    stream.getTracks().forEach(t=>t.stop());setExporting(false);exportingRef.current=false;
   };
   progressRef.current=0;previous.current=0;playingRef.current=true;setPlaying(true);
   exportingRef.current=true;setExporting(true);
   void aVideo.current?.play().catch(()=>{});void bVideo.current?.play().catch(()=>{});
   rec.start(500);
   setMessage("A exportar a transição. Mantém este separador aberto.");
  }catch(error){exportingRef.current=false;setExporting(false);setMessage(error instanceof Error?error.message:"Exportação não suportada.");}
 }
 return <div className="cinema-lab">
  <div className="cinema-header"><div><div className="section-kicker"><WandSparkles size={15}/> LUMI CAMERA LAB · BETA</div><h2>Diretor de transições cinematográficas</h2><p>Bot: {botTitle||"Câmara cinematográfica"} · Uma ou duas câmaras ou vídeos.</p></div><button className="stream-control" onClick={onClose} type="button">Fechar editor</button></div>
  <div className="cinema-layout">
   <div className="cinema-primary">
    <div className="stream-preview-top"><span>PRÉ-VISUALIZAÇÃO · EFEITO DIGITAL</span><span>1280 × 720</span></div>
    <canvas ref={canvas} width={1280} height={720} className="stream-canvas" aria-label="Pré-visualização das transições cinematográficas"/>
    <video ref={aVideo} muted playsInline loop style={{display:"none"}}/>
    <video ref={bVideo} muted playsInline loop style={{display:"none"}}/>
    <div className="cinema-scrubber"><input aria-label="Posição da transição" type="range" min="0" max="100" value={Math.round(progress*100)} onChange={e=>{progressRef.current=Number(e.target.value)/100;playingRef.current=false;setPlaying(false);setProgress(progressRef.current);}}/><span>{(progress*plan.seconds).toFixed(1)}s / {plan.seconds}s</span></div>
    <div className="stream-controls"><button className="stream-control" onClick={togglePlay} disabled={!loaded||exporting}>{playing?<><Pause size={16}/> Pausar</>:<><CirclePlay size={16}/> Pré-visualizar</>}</button><button className="stream-control" onClick={restart} disabled={exporting}><RotateCcw size={16}/> Reiniciar</button><button className="btn" onClick={exportVideo} disabled={!loaded||exporting}><Download size={16}/>{exporting?"A exportar…":"Exportar vídeo"}</button></div>
    <div className="notice" role="status">{message}</div>
    <p className="muted-info">O efeito «drone» simula digitalmente movimentos e zoom na imagem original; não cria filmagens reais de drone nem gera um cenário 3D. A exportação é um vídeo WebM sem áudio, apenas no teu dispositivo.</p>
   </div>
   <div className="cinema-secondary">
    <section className="section-panel stream-section">
     <h3><Camera size={18}/> Fontes de imagem</h3>
     {(["a","b"] as const).map(source=><div className="cinema-source" key={source}>
      <div className="cinema-source-head"><strong>{source==="a"?"Câmara / Vídeo 1":"Câmara / Vídeo 2 (opcional)"}</strong><span>{source==="a"?sourceA:sourceB}</span></div>
      <div className="cinema-source-buttons"><label className="stream-control"><ImagePlus size={14}/> Carregar vídeo<input type="file" accept="video/*" onChange={e=>upload(source,e)} hidden/></label><button className="stream-control" type="button" onClick={()=>void camera(source,"user")}><Camera size={14}/> Frontal</button><button className="stream-control" type="button" onClick={()=>void camera(source,"environment")}><Video size={14}/> Traseira</button><button className="stream-control" type="button" onClick={()=>remove(source)}><VideoOff size={14}/> Limpar</button></div>
     </div>)}
     <p className="muted-info">Podes combinar dois vídeos, duas câmaras quando suportadas, ou uma câmara e um vídeo. No iPad, alguns modelos só permitem uma câmara de cada vez.</p>
    </section>
    <section className="section-panel stream-section">
     <h3><Sparkles size={18}/> Pede uma transição</h3>
     <div className="form-field"><label>Descreve o efeito em linguagem natural</label><textarea value={prompt} maxLength={600} rows={3} onChange={e=>setPrompt(e.target.value)} placeholder="Quero voar da primeira câmara para a segunda como um drone, muito suave…"/></div>
     <button className="btn full" onClick={planFromPrompt} disabled={busy||exporting}><WandSparkles size={16}/>{busy?"A preparar…":"Preparar transição com IA"}</button>
     <p className="muted-info">Se a chave da IA ainda não estiver configurada, a LUMI seleciona um efeito através de regras locais e identifica-o claramente.</p>
    </section>
    <section className="section-panel stream-section">
     <h3><Film size={18}/> Controlos de realização</h3>
     <div className="form-field"><label>Tipo de transição</label><select value={plan.style} onChange={e=>updatePlan({style:e.target.value as Style})}>{styles.map(s=><option value={s.id} key={s.id}>{s.label}</option>)}</select></div>
     <div className="form-field"><label>Duração: {plan.seconds} segundos</label><input type="range" min="2" max="12" step="1" value={plan.seconds} onChange={e=>updatePlan({seconds:Number(e.target.value)})}/></div>
     <div className="form-field"><label>Sentido do movimento</label><select value={plan.direction} onChange={e=>updatePlan({direction:e.target.value as Direction})}><option value="center">Centro</option><option value="left">Esquerda</option><option value="right">Direita</option><option value="up">Cima</option><option value="down">Baixo</option></select></div>
     <p className="muted-info"><Check size={14} style={{verticalAlign:"middle"}}/> {styles.find(s=>s.id===plan.style)?.description}</p>
    </section>
   </div>
  </div>
 </div>;
}
