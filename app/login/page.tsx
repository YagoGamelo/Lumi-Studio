"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { browserDb } from "@/lib/supabase/browser";
export default function Login() {
  const [mode,setMode]=useState<"login"|"signup">("signup");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState(false);
  useEffect(()=>{
    const url=new URL(window.location.href);
    const ref=url.searchParams.get("ref");
    if(ref && /^[a-z0-9_]{3,20}$/i.test(ref)) localStorage.setItem("lumi_ref",ref.toLowerCase());
    if(url.searchParams.get("mode")==="login")setMode("login");
  },[]);
  async function withGoogle(){
    setBusy(true);setMessage("");
    const {error}=await browserDb().auth.signInWithOAuth({
      provider:"google",options:{redirectTo:window.location.origin+"/auth/callback?next=/onboarding"}
    });
    if(error){setError(true);setMessage(error.message);setBusy(false);}
  }
  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setMessage("");setError(false);
    const db=browserDb();
    const result=mode==="login"?await db.auth.signInWithPassword({email,password}):await db.auth.signUp({
      email,password,options:{emailRedirectTo:window.location.origin+"/auth/callback?next=/onboarding"}
    });
    if(result.error){setError(true);setMessage(result.error.message);}
    else if(result.data.session){window.location.assign("/onboarding");return;}
    else{setMessage("Verifica o teu email para confirmar a conta. Depois inicia sessão.");setMode("login");}
    setBusy(false);
  }
  return <main className="auth-shell"><div className="auth-art"><div className="auth-globe"><Sparkles size={76}/></div><h2>A tua imaginação é o início de tudo.</h2><p>Constrói o teu espaço criativo. Bots, conteúdo, automações e uma comunidade de criadores.</p></div><div className="auth-form-area"><div className="auth-inner"><Link href="/" className="logo"><span className="logo-symbol"><Sparkles size={20}/></span>LUMI<span className="logo-light">Studio</span></Link><h1>{mode==="signup"?"Cria algo extraordinário.":"Bem-vindo de volta."}</h1><p>{mode==="signup"?"Começa gratuitamente. O teu próximo bot está à espera.":"Continua de onde deixaste os teus projetos."}</p><div className="auth-card"><button className="google-button" onClick={withGoogle} disabled={busy}><span className="google-g">G</span> Continuar com Google</button><div className="divider-text">ou continua com o teu email</div><form onSubmit={submit}><div className="form-field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@exemplo.com" required/></div><div className="form-field"><label htmlFor="password">Palavra-passe</label><input id="password" type="password" autoComplete={mode==="login"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" minLength={8} required/></div><button className="btn full" type="submit" disabled={busy}>{busy?"A processar...":mode==="signup"?"Criar conta gratuita":"Iniciar sessão"} <ArrowRight size={16}/></button></form>{message&&<div className={"notice"+(error?" error":"")}>{message}</div>}<div className="toggle-auth">{mode==="signup"?"Já tens conta? ":"Ainda não tens conta? "}<button onClick={()=>{setMode(mode==="signup"?"login":"signup");setMessage("");}}>{mode==="signup"?"Entrar":"Criar conta"}</button></div><p className="smallprint"><ShieldCheck size={13} style={{verticalAlign:"middle"}}/> Os teus dados e integrações são controlados por ti. <LockKeyhole size={13} style={{verticalAlign:"middle"}}/> Nunca partilhes palavras-passe de redes sociais.</p></div></div></div></main>;
}