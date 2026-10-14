"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import { ArrowRight,ArrowUpRight,Bot,Camera,Check,CheckCircle2,Clapperboard,CloudUpload,Download,ExternalLink,FileVideo,ImageIcon,Music,Pause,Play,Plus,RefreshCcw,ScanFace,ShieldCheck,Sparkles,Twitch,UploadCloud,Video,VideoIcon,Youtube } from "lucide-react";
type Asset={id:string,kind:string,original_name:string,created_at:string};
type Project={id:string,name:string,topic:string,style:string,script:string,status:string,output_url?:string};
type Clip={id:string,title:string,url:string,thumbnail_url:string,view_count:number};
type Angle="avatar_front"|"avatar_left"|"avatar_right";
const angles:{kind:Angle,title:string,desc:string}[]=[
 {kind:"avatar_front",title:"Frente",desc:"Olha para a câmara."},
 {kind:"avatar_left",title:"Perfil esquerdo",desc:"Vira a cabeça lentamente para a tua esquerda."},
 {kind:"avatar_right",title:"Perfil direito",desc:"Vira a cabeça para a tua direita."}
];
export default function Studio(){
 const [tab,setTab]=useState<"create"|"library"|"avatar"|"twitch"|"publish">("create");
 const [topic,setTopic]=useState(""),[name,setName]=useState(""),[style,setStyle]=useState("informativo"),[source,setSource]=useState("");
 const [projects,setProjects]=useState<Project[]>([]),[assets,setAssets]=useState<Asset[]>([]),[clips,setClips]=useState<Clip[]>([]);
 const [selected,setSelected]=useState(""),[renderId,setRenderId]=useState(""),[avatarId,setAvatarId]=useState("");
 const [privacyChecked,setPrivacyChecked]=useState(false),[status,setStatus]=useState(""),[busy,setBusy]=useState(false);
 const [camera,setCamera]=useState(false),[camError,setCamError]=useState("");
 const [ytVideo,setYtVideo]=useState(""),[ytTitle,setYtTitle]=useState(""),[ytDesc,setYtDesc]=useState("");
 const [publishDate,setPublishDate]=useState(""),[synthetic,setSynthetic]=useState(true),[publishApproved,setPublishApproved]=useState(false);
 const stream=useRef<MediaStream|null>(null),video=useRef<HTMLVideoElement|null>(null);
 const refresh=useCallback(async()=>{
   const [a,p]=await Promise.all([fetch("/api/media"),fetch("/api/studio/projects")]);
   if(a.ok)setAssets((await a.json()).assets||[]);
   if(p.ok)setProjects((await p.json()).projects||[]);
 },[]);
 useEffect(()=>{refresh();return ()=>{stream.current?.getTracks().forEach(t=>t.stop());};},[refresh]);
 async function post(path:string,data:unknown){
  const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
  const result=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(result.error||"Falhou.");
  return result;
 }
 async function create(){
  if(!name.trim()||!topic.trim())return;
  setBusy(true);setStatus("");
  try{const res=await post("/api/studio/projects",{name,topic,style,...(source.trim()?{source_url:source.trim()}:{})});
   setProjects(old=>[res.project,...old]);setRenderId(res.project.id);setStatus("Guião criado! Podes lê-lo na lista de projetos.");
  }catch(e){setStatus((e as Error).message);}finally{setBusy(false);}
 }
 async function uploadFile(file:File,kind:string){
  if(!privacyChecked){setStatus("Confirma primeiro que tens direitos e consentimento para o material.");return;}
  setBusy(true);setStatus("");
  try{
   const data=new FormData();data.set("kind",kind);data.set("file",file);data.set("rights","true");
   const res=await fetch("/api/media/upload",{method:"POST",body:data});
   const json=await res.json().catch(()=>({}));if(!res.ok)throw new Error(json.error||"Falha no upload");
   await refresh();setStatus("Ficheiro privado guardado: "+file.name);
  }catch(e){setStatus((e as Error).message);}finally{setBusy(false);}
 }
 async function startCamera(){
  setCamError("");
  try{stream.current=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:1280,height:720},audio:false});setCamera(true);
    setTimeout(()=>{if(video.current&&stream.current){video.current.srcObject=stream.current;video.current.play().catch(()=>{});}},100);
  }catch{setCamError("Não foi possível abrir a câmara. Usa HTTPS e permite o acesso nas definições do navegador.");}
 }
 function stopCamera(){stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setCamera(false);}
 async function capture(kind:Angle){
  if(!video.current||!camera)return;
  const canvas=document.createElement("canvas");canvas.width=640;canvas.height=480;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  ctx.drawImage(video.current,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",0.9));
  if(blob)await uploadFile(new File([blob],kind+".jpg",{type:"image/jpeg"}),kind);
 }
 async function loadClips(){
  setStatus("");setBusy(true);
  try{const r=await fetch("/api/twitch/clips");const j=await r.json();if(!r.ok)throw new Error(j.error);setClips(j.clips||[]);}
  catch(e){setStatus((e as Error).message);}finally{setBusy(false);}
 }
 async function importClip(id:string){
  setBusy(true);setStatus("");
  try{await post("/api/twitch/import",{clip_id:id});await refresh();setStatus("Clip importado para a biblioteca privada.");}
  catch(e){setStatus((e as Error).message);}finally{setBusy(false);}
 }
 async function fileLink(id:string){
  const r=await fetch("/api/media/"+id+"/link");const j=await r.json();
  if(!r.ok){setStatus(j.error||"Erro");return;}
  window.open(j.url,"_blank","noopener,noreferrer");
 }
 async function render(){
  if(!renderId||!avatarId.trim())return;
  setBusy(true);setStatus("");
  try{await post("/api/studio/render",{project_id:renderId,provider_avatar_id:avatarId});setStatus("Vídeo enviado para renderização no fornecedor. Podes verificar o estado.");await refresh();}
  catch(e){setStatus((e as Error).message);}finally{setBusy(false);}
 }
 async function checkRender(id:string){
  setBusy(true);
  try{const r=await fetch("/api/studio/status?id="+encodeURIComponent(id));const j=await r.json();
   if(!r.ok)throw new Error(j.error);await refresh();setStatus("Estado: "+j.project.status+(j.project.output_url?" · Vídeo pronto para ver":""));
  }catch(e){setStatus((e as Error).message);}finally{setBusy(false);}
 }
 async function publish(){
  if(!publishApproved){setStatus("Tens de confirmar autorização e rever o conteúdo.");return;}
  setBusy(true);setStatus("");
  try{const j=await post("/api/youtube/upload",{
    asset_id:ytVideo,title:ytTitle,description:ytDesc,
    ...(publishDate?{publish_at:new Date(publishDate).toISOString()}:{}),
    synthetic,approved:true
  });setStatus("Upload autorizado e concluído: https://youtu.be/"+j.video_id+" · Mantido privado"+(j.scheduled?", com publicação agendada.":"."));
  }catch(e){setStatus((e as Error).message);}finally{setBusy(false);}
 }
 const videos=assets.filter(x=>x.kind==="video"||x.kind==="clip");
 const captureCount=angles.filter(x=>assets.some(a=>a.kind===x.kind)).length;
 return <div className="studio-workspace">
  <div className="heading-row"><div><div className="section-kicker"><Clapperboard size={15}/> LUMI CONTENT STUDIO</div><h1>O teu estúdio de IA.</h1><p>Do conceito ao conteúdo: guiões, avatares, música, clips e publicação autorizada.</p></div><div className="pill">BETA · CRIAÇÃO</div></div>
  <div className="tabs">{[
   {id:"create",label:"Criar vídeo",icon:Sparkles},
   {id:"library",label:"Biblioteca",icon:FileVideo},
   {id:"avatar",label:"O meu avatar",icon:ScanFace},
   {id:"twitch",label:"Twitch clips",icon:Twitch},
   {id:"publish",label:"YouTube",icon:Youtube}
  ].map(x=><button key={x.id} className={"tab"+(tab===x.id?" active":"")} onClick={()=>{setTab(x.id as typeof tab);setStatus("");}}><x.icon size={15} style={{verticalAlign:"middle",marginRight:7}}/>{x.label}</button>)}</div>
  {status&&<div className="notice" role="status" style={{marginBottom:15,whiteSpace:"pre-wrap"}}>{status}</div>}
  {tab==="create"&&<div className="builder">
   <div className="section-panel" style={{marginTop:0}}><div className="panel-heading"><div><h2>Gerador de guiões</h2><p>Cria uma ideia de vídeo com a ajuda de um modelo de IA.</p></div><Sparkles size={20} color="#b4a3ff"/></div>
   <div className="form-field"><label>Nome do projeto</label><input placeholder="Ex.: Resumo do meu canal gaming" value={name} onChange={e=>setName(e.target.value)}/></div>
   <div className="form-field"><label>Sobre o que será o vídeo?</label><textarea rows={5} placeholder="Explica o tema, o público, o tom e o que queres abordar..." value={topic} onChange={e=>setTopic(e.target.value)} maxLength={600}/></div>
   <div className="form-field"><label>Estilo</label><select value={style} onChange={e=>setStyle(e.target.value)}><option value="informativo">Informativo</option><option value="gaming">Gaming</option><option value="react">React / Comentário original</option><option value="humor">Humor</option><option value="educativo">Educativo</option></select></div>
   <div className="form-field"><label>URL de referência (opcional)</label><input placeholder="https://..." value={source} onChange={e=>setSource(e.target.value)}/></div>
   <p className="muted-info" style={{marginBottom:14}}>A URL é guardada como referência, mas o vídeo não é descarregado automaticamente. Usa clips próprios ou licenciados.</p>
   <button className="btn full" onClick={create} disabled={busy||!name.trim()||topic.trim().length<5}><WandSparkles size={16}/> Gerar guião</button></div>
   <div><div className="section-panel" style={{marginTop:0}}><h2>Os teus projetos</h2><p className="muted-info" style={{margin:"10px 0 18px"}}>Cada guião está pronto para rever e pode ser enviado para renderização com um avatar licenciado.</p>{projects.length===0?<p className="muted-info">Ainda não criaste nenhum guião.</p>:projects.map(p=><details key={p.id} style={{borderTop:"1px solid #303749",padding:"14px 0"}}><summary style={{cursor:"pointer"}}><strong>{p.name}</strong> <span className="pill">{p.status}</span></summary><p className="muted-info" style={{whiteSpace:"pre-wrap",marginTop:10,maxHeight:240,overflow:"auto"}}>{p.script}</p>{p.output_url&&<a className="tiny-btn" href={p.output_url} target="_blank" rel="noreferrer">Ver vídeo <ExternalLink size={13}/></a>}{p.status==="rendering"&&<button className="tiny-btn" onClick={()=>checkRender(p.id)}>Atualizar estado <RefreshCcw size={13}/></button>}{p.status==="script_ready"&&<button className="tiny-btn" onClick={()=>{setRenderId(p.id);setTab("avatar");}}>Criar vídeo com avatar <ArrowRight size={13}/></button>}</details>)}</div></div></div>}
  {tab==="library"&&<div className="builder"><div className="section-panel" style={{marginTop:0}}><h2>Carregar media</h2><p className="muted-info" style={{margin:"10px 0 20px"}}>Guarda vídeos, música e imagens num espaço privado. Suporta ficheiros até 25 MB nesta beta.</p>
  <label style={{display:"flex",gap:9,alignItems:"center",marginBottom:18,fontSize:12}}><input type="checkbox" checked={privacyChecked} onChange={e=>setPrivacyChecked(e.target.checked)}/> Confirmo que tenho direitos para usar os ficheiros enviados e consentimento das pessoas envolvidas.</label>
  {[{kind:"video",label:"Adicionar vídeo",accept:"video/mp4,video/webm",icon:Video},{kind:"clip",label:"Adicionar clip",accept:"video/mp4,video/webm",icon:FileVideo},{kind:"music",label:"Adicionar música licenciada",accept:"audio/mpeg,audio/wav",icon:Music}].map(x=><div className="template-button" key={x.kind} style={{marginTop:12}}><span className="bot-icon"><x.icon size={19}/></span><span style={{flex:1}}><strong>{x.label}</strong><small>{x.accept}</small></span><label className="tiny-btn" style={{cursor:"pointer"}}>Escolher<input type="file" accept={x.accept} style={{display:"none"}} disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)uploadFile(f,x.kind);e.target.value="";}}/></label></div>)}</div>
   <div className="section-panel" style={{marginTop:0}}><h2>Os teus ficheiros</h2><p className="muted-info" style={{margin:"10px 0 18px"}}>Os links de acesso expiram ao fim de 3 minutos. Guarda apenas conteúdo permitido.</p>{assets.length===0?<p className="muted-info">A biblioteca está vazia.</p>:assets.map(a=><div className="template-button" key={a.id} style={{marginBottom:8,justifyContent:"space-between"}}><span><strong>{a.original_name}</strong><small>{a.kind}</small></span><button className="tiny-btn" onClick={()=>fileLink(a.id)}><ExternalLink size={14}/> Ver</button></div>)}</div></div>}
  {tab==="avatar"&&<div className="builder"><div className="section-panel" style={{marginTop:0}}><div className="panel-heading"><div><h2>Captura guiada do rosto</h2><p>Frente, perfil esquerdo e direito, com vídeo de consentimento.</p></div><ScanFace size={24} color="#b19aff"/></div>
   <p className="muted-info" style={{marginBottom:14}}>Uma fotografia não cria um rosto 3D de 360° verdadeiro. Esta captura prepara referências visuais; um fornecedor de avatar deve verificar o rosto e o consentimento antes de gerar vídeo.</p>
   <label style={{display:"flex",gap:9,alignItems:"center",fontSize:12,marginBottom:15}}><input type="checkbox" checked={privacyChecked} onChange={e=>setPrivacyChecked(e.target.checked)}/> Sou a pessoa retratada, ou tenho autorização expressa para o seu uso.</label>
   {!camera?<button className="btn" onClick={startCamera}><Camera size={16}/> Ativar câmara</button>:<><video ref={video} autoPlay playsInline muted style={{width:"100%",borderRadius:14,margin:"15px 0",background:"#05070f",transform:"scaleX(-1)"}}/><div style={{display:"grid",gap:9}}>{angles.map(x=><button className="btn-outline full" onClick={()=>capture(x.kind)} key={x.kind} disabled={!privacyChecked||busy}><Camera size={15}/> Capturar {x.title} {assets.some(a=>a.kind===x.kind)?"✓":""}</button>)}</div><button className="tiny-btn" style={{marginTop:12}} onClick={stopCamera}><Pause size={13}/> Desligar câmara</button></>}
   {camError&&<div className="notice error">{camError}</div>}
   <p className="muted-info" style={{marginTop:17}}>Ângulos registados: {captureCount}/3. Não significa que já foi criado um avatar animado.</p>
   <div className="form-field"><label>Vídeo de consentimento, gravado pela pessoa retratada</label><input type="file" accept="video/mp4,video/webm" onChange={e=>{const f=e.target.files?.[0];if(f)uploadFile(f,"avatar_consent");e.target.value="";}}/></div><p className="muted-info">Para um Digital Twin, o fornecedor pode exigir o seu próprio vídeo de consentimento, gravado com o texto e método exatos que indicar.</p></div>
   <div className="section-panel" style={{marginTop:0}}><h2>Transformar um guião em vídeo</h2><p className="muted-info" style={{margin:"12px 0"}}>Podes renderizar com um avatar já aprovado na tua conta HeyGen. A criação de um avatar facial a partir das fotografias necessita do fluxo oficial de Digital Twin do fornecedor.</p>
   <div className="form-field"><label>Projeto com guião</label><select value={renderId} onChange={e=>setRenderId(e.target.value)}><option value="">Selecionar projeto</option>{projects.filter(x=>x.status==="script_ready").map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
   <div className="form-field"><label>ID do avatar licenciado na HeyGen</label><input value={avatarId} onChange={e=>setAvatarId(e.target.value)} placeholder="ID do avatar aprovado"/></div><button className="btn full" disabled={busy||!renderId||!avatarId} onClick={render}><Video size={16}/> Renderizar com HeyGen</button><p className="muted-info" style={{marginTop:12}}>O fornecedor cobra pela geração. Configura a API em Integrações antes de utilizar esta função.</p></div></div>}
  {tab==="twitch"&&<div className="section-panel" style={{marginTop:0}}><div className="panel-heading"><div><h2>Os clips da tua Twitch</h2><p>Importa clips do canal associado, usando a autorização da Twitch.</p></div><Twitch color="#a890ff"/></div><a className="btn-outline" href="/api/connections/twitch/start">Ligar conta Twitch <ArrowUpRight size={16}/></a> <button className="btn" style={{marginLeft:8}} disabled={busy} onClick={loadClips}><RefreshCcw size={16}/> Ver clips</button>
   <div className="bot-grid" style={{marginTop:24}}>{clips.map(c=><div className="bot-card" key={c.id}><img src={c.thumbnail_url} alt="Miniatura do clip" style={{width:"100%",aspectRatio:"16/9",objectFit:"cover",borderRadius:9}}/><h3>{c.title}</h3><p>{c.view_count} visualizações</p><div style={{display:"flex",justifyContent:"space-between",marginTop:14}}><a className="tiny-btn" href={c.url} target="_blank" rel="noreferrer">Abrir <ExternalLink size={13}/></a><button className="tiny-btn" disabled={busy} onClick={()=>importClip(c.id)}>Importar <Download size={13}/></button></div></div>)}</div>{clips.length===0&&<p className="muted-info" style={{marginTop:20}}>Liga a Twitch e clica em Ver clips. Os clips de terceiros não são importados sem autorização.</p>}</div>}
  {tab==="publish"&&<div className="builder"><div className="section-panel" style={{marginTop:0}}><h2>Publicar no YouTube</h2><p className="muted-info" style={{margin:"12px 0 18px"}}>A publicação exige ligação OAuth e aprovação expressa. O vídeo é enviado como privado ou agendado.</p><a className="btn-outline" href="/api/connections/youtube/start"><Youtube size={17}/> Ligar canal YouTube</a>
   <div className="form-field"><label>Vídeo para publicar</label><select value={ytVideo} onChange={e=>setYtVideo(e.target.value)}><option value="">Selecionar vídeo da biblioteca</option>{videos.map(v=><option value={v.id} key={v.id}>{v.original_name}</option>)}</select></div>
   <div className="form-field"><label>Título</label><input maxLength={100} value={ytTitle} onChange={e=>setYtTitle(e.target.value)}/></div>
   <div className="form-field"><label>Descrição</label><textarea maxLength={3000} rows={4} value={ytDesc} onChange={e=>setYtDesc(e.target.value)}/></div>
   <div className="form-field"><label>Publicação programada (opcional)</label><input type="datetime-local" value={publishDate} onChange={e=>setPublishDate(e.target.value)}/></div>
   <label style={{display:"flex",alignItems:"center",gap:9,fontSize:12,margin:"15px 0"}}><input type="checkbox" checked={synthetic} onChange={e=>setSynthetic(e.target.checked)}/> Contém mídia sintética realista: declarar ao YouTube.</label>
   <label style={{display:"flex",alignItems:"center",gap:9,fontSize:12,margin:"15px 0"}}><input type="checkbox" checked={publishApproved} onChange={e=>setPublishApproved(e.target.checked)}/> Revisei o conteúdo e autorizo o envio para o meu canal.</label>
   <button className="btn full" disabled={busy||!ytVideo||!ytTitle.trim()||!publishApproved} onClick={publish}><UploadCloud size={16}/> Enviar vídeo autorizado</button></div>
   <div className="section-panel" style={{marginTop:0}}><h2>Antes de publicar</h2><p className="muted-info" style={{marginTop:15}}>Todos os envios são inicialmente privados. Se agendares, o YouTube aplica a data programada quando as regras e auditoria do teu projeto o permitirem.</p><p className="muted-info" style={{marginTop:15}}>Projetos não verificados pela Google podem ter restrições à publicação pública. O upload de vídeos até 25 MB é suportado nesta beta.</p><div className="notice" style={{marginTop:18}}><ShieldCheck size={15}/> Não publicamos automaticamente sem autorização explícita.</div></div></div>}
 </div>;
