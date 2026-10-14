import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { stripeClient } from "@/lib/billing";
import { z } from "zod";
const schema=z.object({amount_cents:z.number().int().min(1000).max(1000000)});
export async function POST(req:Request){
 const a=await authenticatedUser();if(!a)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Montante inválido"},{status:400});
 const {data:profile}=await a.db.from("profiles").select("stripe_customer_id").eq("id",a.user.id).maybeSingle();
 if(!profile?.stripe_customer_id)return NextResponse.json({error:"Precisas de ter uma conta de faturação ativa."},{status:409});
 const db=adminDb();
 const {data:id,error}=await db.rpc("reserve_referral_funds",{p_user:a.user.id,p_kind:"subscription_credit",p_amount:parsed.data.amount_cents});
 if(error||!id)return NextResponse.json({error:error?.message||"Saldo não disponível"},{status:409});
 try{
 const stripe=stripeClient();
 const credit=await stripe.customers.createBalanceTransaction(profile.stripe_customer_id,{
   amount:-parsed.data.amount_cents,currency:"eur",description:"Crédito afiliado LUMI "+id
 },{idempotencyKey:"lumi_credit_"+id});
 await db.from("referral_movements").update({status:"completed",provider_ref:credit.id}).eq("id",id);
 return NextResponse.json({ok:true});
 }catch{
 await db.from("referral_movements").update({status:"failed"}).eq("id",id);
 return NextResponse.json({error:"Não foi possível aplicar o crédito."},{status:503});
 }
}