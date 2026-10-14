import { redirect } from "next/navigation";
import { authenticatedUser } from "@/lib/auth";
import Dashboard from "./workspace";
export const dynamic="force-dynamic";
export default async function DashboardPage() {
  const auth=await authenticatedUser();
  if(!auth)redirect("/login");
  const {db,user}=auth;
  const {data:profile}=await db.from("profiles").select("id,username,stripe_customer_id,stripe_connect_id").eq("id",user.id).maybeSingle();
  if(!profile?.username)redirect("/onboarding");
  const [botRows,commissionRows,movementRows]=await Promise.all([
    db.from("bots").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100),
    db.from("referral_commissions").select("amount_cents,available_at,status").eq("earner_id",user.id),
    db.from("referral_movements").select("amount_cents,status,kind").eq("user_id",user.id)
  ]);
  const now=Date.now();
  const commissions=commissionRows.data||[];
  const movements=movementRows.data||[];
  const earned=commissions.filter(x=>x.status!=="reversed").reduce((a,x)=>a+x.amount_cents,0);
  const pending=commissions.filter(x=>x.status==="pending" && new Date(x.available_at).getTime()>now).reduce((a,x)=>a+x.amount_cents,0);
  const locked=movements.filter(x=>x.status==="reserved"||x.status==="completed").reduce((a,x)=>a+x.amount_cents,0);
  const available=Math.max(0,earned-pending-locked);
  return <Dashboard initialBots={botRows.data||[]} username={profile.username} email={user.email||""} stats={{earned,pending,available}} hasConnect={Boolean(profile.stripe_connect_id)} />;
}