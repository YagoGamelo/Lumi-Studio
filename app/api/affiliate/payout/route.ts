import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { stripeClient } from "@/lib/billing";
import { z } from "zod";
const schema=z.object({amount_cents:z.number().int().min(1000).max(1000000)});
export async function POST(req:Request){
 const a=await authenticatedUser();if(!a)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Montante inválido."},{status:400});
 const db=adminDb(),stripe=stripeClient();
 const {data:profile}=await a.db.from("profiles").select("stripe_connect_id").eq("id",a.user.id).maybeSingle();
 if(!profile?.stripe_connect_id)return NextResponse.json({error:"Configura primeiro a tua conta de pagamentos."},{status:409});
 try{
 const account=await stripe.accounts.retrieve(profile.stripe_connect_id);
 if(!account.payouts_enabled||!account.details_submitted)return NextResponse.json({error:"Termina a verificação de identidade Stripe Connect."},{status:403});
 const {data:id,error}=await db.rpc("reserve_referral_funds",{p_user:a.user.id,p_kind:"payout",p_amount:parsed.data.amount_cents});
 if(error||!id)return NextResponse.json({error:error?.message||"Saldo não disponível."},{status:409});
 try{
   const transfer=await stripe.transfers.create({amount:parsed.data.amount_cents,currency:"eur",destination:profile.stripe_connect_id,metadata:{lumi_movement_id:id}},{idempotencyKey:"lumi_payout_"+id});
   await db.from("referral_movements").update({status:"completed",provider_ref:transfer.id}).eq("id",id);
   return NextResponse.json({ok:true,transfer_id:transfer.id});
 }catch(e){
   await db.from("referral_movements").update({status:"failed"}).eq("id",id);
   return NextResponse.json({error:"Transferência não efetuada. Verifica fundos e configuração."},{status:503});
 }
 }catch{return NextResponse.json({error:"Stripe indisponível."},{status:503});}
}