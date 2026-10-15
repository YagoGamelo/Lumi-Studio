"use client";
import {useEffect,useState} from "react";
import {browserDb} from "@/lib/supabase/browser";

type State={title:string;handle:string;accent:string;scene:string;message:string};
type Props=State&{token:string};
function validHex(s:string){return /^#[a-f0-9]{6}$/i.test(s)?s:"#997bff";}
export default function OverlayPlayer(props:Props){
 const [data,setData]=useState<State>(props);
 useEffect(()=>{
  if(!props.token)return;
  let cancelled=false;
  const poll=async()=>{
   try{
    const {data:rows,error}=await browserDb().rpc("stream_overlay_by_token",{p_token:props.token});
    if(!cancelled&&!error&&Array.isArray(rows)&&rows[0]){
     const row=rows[0] as Partial<State>;
     setData({title:String(row.title||""),handle:String(row.handle||""),scene:String(row.scene||""),message:String(row.message||""),accent:validHex(String(row.accent||""))});
    }
   }catch{/* The standalone overlay still renders the static fallback without a database connection. */}
  };
  void poll();const interval=setInterval(()=>void poll(),3000);
  return()=>{cancelled=true;clearInterval(interval);};
 },[props.token]);
 const accent=validHex(data.accent);
 return <>
  <style>{"html,body{background:transparent!important;overflow:hidden!important}body{margin:0!important}*{box-sizing:border-box}"}</style>
  <main className="lumi-overlay" aria-label="Overlay de stream LUMI Studio">
   <div className="lumi-overlay-top"><span className="lumi-overlay-live" style={{borderColor:accent,color:accent}}>● {data.scene||"EM DIRETO"}</span><div className="lumi-overlay-header"><strong>{data.title||"LUMI Stream"}</strong><span>{data.handle}</span></div></div>
   <div className="lumi-overlay-footer" style={{borderLeftColor:accent}}><span className="lumi-overlay-message">{data.message||"Bem-vindos à live!"}</span><span className="lumi-overlay-brand">✦ LUMI STUDIO</span></div>
  </main>
 </>;
}
