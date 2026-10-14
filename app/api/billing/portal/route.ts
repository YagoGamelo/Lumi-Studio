import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { stripeClient } from "@/lib/billing";
export async function POST(req:Request){
 const a=await authenticatedUser();if(!a)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const {data}=await a.db.from("profiles").select("stripe_customer_id").eq("id",a.user.id).single();
 if(!data?.stripe_customer_id)return NextResponse.json({error:"Ainda não tens subscrição."},{status:409});
 try{
 const stripe=stripeClient();
 const session=await stripe.billingPortal.sessions.create({customer:data.stripe_customer_id,return_url:(process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin)+"/dashboard?tab=billing"});
 return NextResponse.json({url:session.url});
 }catch{return NextResponse.json({error:"Portal ainda não configurado no Stripe."},{status:503});}
}