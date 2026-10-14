"use client";
import { FormEvent,useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, AtSign, CheckCircle2, Gift, ShieldCheck, Sparkles } from "lucide-react";
import { browserDb } from "@/lib/supabase/browser";
export default function Onboarding() {
  const router=useRouter();
  const [username,setUsername]=useState("");
  const [referral,setReferral]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(()=>{
    setReferral(localStorage.getItem("lumi_ref")||"");
    browserDb().auth.getUser().then(async ({data:{user}})=>{
      if(!user){router.replace("/login");return;}
      const {data}=await browserDb().from("profiles").select("username").eq("id",user.id).maybeSingle();
      if(data?.username)router.replace("/dashboard");
    });
  },[router]);
  async function submit(event:FormEvent){
    event.preventDefault();setBusy(true);setMessage("");
    const res=await fetch("/api/profile/complete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:username.toLowerCase().trim(),referral:referral.toLowerCase().trim()})});
    const data=await res.json();
    if(res.ok){localStorage.removeItem("lumi_ref");router.replace("/dashboard");router.refresh();}
    else setMessage(data.error||"Não foi possível guardar o teu nome.");
    setBusy(false);
  }
  return <main className="auth-shell"><div className="auth-art"><div className="auth-globe"><AtSign size={72}/></div><h2>O teu nome. A tua marca. O teu código.</h2><p>O teu username é único e também será o teu código de afiliado. Recomenda a LUMI e recebe uma percentagem das subscrições elegíveis.</p></div><div className="auth-form-area"><div className="auth-inner"><Link href="/" className="logo"><span className="logo-symbol"><Sparkles size={20}/></span>LUMI<span className="logo-light">Studio</span></Link><h1>Falta só um detalhe.</h1><p>Escolhe o teu nome de utilizador para desbloquear o teu espaço.</p><form className="auth-card" onSubmit={submit}><div className="form-field"><label htmlFor="username">Nome de utilizador</label><input id="username" autoComplete="off" autoCapitalize="none" value={username} maxLength={20} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,""))} placeholder="exemplo: criadorlumi" required minLength={3}/></div><p className="muted-info"><AtSign size={13} style={{verticalAlign:"middle"}}/> 3–20 caracteres, começa por letra. Letras minúsculas, números e _.</p><div className="notice"><Gift size={15} style={{verticalAlign:"middle"}}/> O teu código de afiliado será <strong>{username||"teunome"}</strong>. Ganhas 30% sobre pagamentos elegíveis indicados por ti.</div><div className="form-field"><label htmlFor="referral">Tens um código de convite? (opcional)</label><input id="referral" value={referral} onChange={e=>setReferral(e.target.value)} placeholder="Código de quem te convidou"/></div>{message&&<div className="notice error">{message}</div>}<button type="submit" className="btn full" disabled={busy}>{busy?"A guardar...":"Entrar na LUMI"} <ArrowRight size={17}/></button><p className="smallprint"><ShieldCheck size={14} style={{verticalAlign:"middle"}}/> Não podes usar o teu próprio código. A indicação é registada uma vez.</p></form></div></div></main>;
}