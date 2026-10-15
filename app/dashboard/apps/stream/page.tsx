import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowLeft,Bot,Clapperboard,Radio,Sparkles} from "lucide-react";
import {authenticatedUser} from "@/lib/auth";
import StreamStudio from "../../stream-studio";

export const dynamic="force-dynamic";
export const metadata={title:"LUMI Stream Studio | Aplicações LUMI"};
export default async function StreamApp(){
 const auth=await authenticatedUser();
 if(!auth)redirect("/login?next=/dashboard/apps/stream");
 const {db,user}=auth;
 const {data:profile}=await db.from("profiles").select("username").eq("id",user.id).maybeSingle();
 if(!profile?.username)redirect("/onboarding");
 const {data:bots}=await db.from("bots").select("id,title,instruction,category,frequency,status").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);
 return <main className="lumi-app-shell"><header className="lumi-app-top"><Link href="/dashboard?tab=apps" className="lumi-app-back"><ArrowLeft size={17}/> Voltar à LUMI</Link><span className="lumi-app-brand"><Sparkles size={17}/> LUMI <span>STREAM STUDIO</span></span><Link href="/dashboard?tab=bots" className="lumi-app-back"><Bot size={17}/> Os meus bots</Link></header><div className="lumi-app-body"><StreamStudio bots={bots||[]} username={profile.username}/></div></main>;
}
