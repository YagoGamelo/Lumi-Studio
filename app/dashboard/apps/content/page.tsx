import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowLeft,Bot,Clapperboard,Sparkles} from "lucide-react";
import {authenticatedUser} from "@/lib/auth";
import {StudioPanel} from "../../workspace";
export const dynamic="force-dynamic";
export const metadata={title:"LUMI Creator Studio | Aplicações LUMI"};
export default async function CreatorApp(){
 const auth=await authenticatedUser();
 if(!auth)redirect("/login?next=/dashboard/apps/content");
 const {data:profile}=await auth.db.from("profiles").select("username").eq("id",auth.user.id).maybeSingle();
 if(!profile?.username)redirect("/onboarding");
 return <main className="lumi-app-shell"><header className="lumi-app-top"><Link href="/dashboard?tab=apps" className="lumi-app-back"><ArrowLeft size={17}/> Voltar à LUMI</Link><span className="lumi-app-brand"><Sparkles size={17}/> LUMI <span>CREATOR STUDIO</span></span><Link href="/dashboard?tab=bots" className="lumi-app-back"><Bot size={17}/> Os meus bots</Link></header><div className="lumi-app-body creator-app-body"><StudioPanel/></div></main>;
}
