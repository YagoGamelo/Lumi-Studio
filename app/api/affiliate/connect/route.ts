import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { stripeClient } from "@/lib/billing";
export async function POST(req:Request){
 const a=await authenticatedUser();if(!a)return NextResponse.json({error:"Inicia sessão."},{status:401});
 try{
 const stripe=stripeClient(),db=adminDb();
 const {data:profile}=await a.db.from("profiles").select("stripe_connect_id").eq("id",a.user.id).single();
 let account=profile?.stripe_connect_id;
 if(!account){
   const created=await stripe.accounts.create({type:"express",country:"PT",email:a.user.email,capabilities:{transfers:{requested:true}},metadata:{lumi_user_id:a.user.id}});
   account=created.id;
   await db.from("profiles").update({stripe_connect_id:account}).eq("id",a.user.id);
 }
 const origin=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;
 const link=await stripe.accountLinks.create({
   account,refresh_url:origin+"/dashboard?tab=affiliates&status=retry",return_url:origin+"/dashboard?tab=affiliates&status=return",type:"account_onboarding"
 });
 return NextResponse.json({url:link.url});
 }catch(e){console.error(e);return NextResponse.json({error:"Verificação Stripe Connect indisponível."},{status:503});}
}