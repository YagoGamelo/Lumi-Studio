import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripeClient } from "@/lib/billing";
import { adminDb } from "@/lib/supabase/admin";
export async function POST(req:Request){
 const signature=req.headers.get("stripe-signature"),secret=process.env.STRIPE_WEBHOOK_SECRET;
 if(!signature||!secret)return NextResponse.json({error:"Webhook não configurado."},{status:400});
 const stripe=stripeClient();let event:Stripe.Event;
 try{event=stripe.webhooks.constructEvent(await req.text(),signature,secret);}catch{return NextResponse.json({error:"Assinatura inválida"},{status:400});}
 const db=adminDb();
 try{
 if(event.type==="checkout.session.completed"){
   const s=event.data.object as Stripe.Checkout.Session;
   if(s.client_reference_id&&typeof s.customer==="string"){
     await db.from("profiles").update({stripe_customer_id:s.customer}).eq("id",s.client_reference_id);
   }
 }
 if(event.type==="invoice.paid"){
   const invoice=event.data.object as Stripe.Invoice;
   const cust=typeof invoice.customer==="string"?invoice.customer:invoice.customer?.id;
   if(cust && invoice.id){
     const {data:buyer}=await db.from("profiles").select("id,referred_by").eq("stripe_customer_id",cust).maybeSingle();
     const paid=Math.max(0,invoice.amount_paid||0);
     // Use actual collected amount, never original list price; cap at tax-exclusive invoice total if available.
     const value=Math.max(0,Math.min(paid,typeof invoice.total_excluding_tax==="number"?invoice.total_excluding_tax:paid));
     if(buyer?.referred_by&&buyer.referred_by!==buyer.id&&value>0){
       const commission=Math.round(value*0.30);
       const {error}=await db.from("referral_commissions").upsert({
         earner_id:buyer.referred_by,buyer_id:buyer.id,invoice_id:invoice.id,amount_cents:commission,
         status:"pending",available_at:new Date(Date.now()+30*86400000).toISOString()
       },{onConflict:"invoice_id",ignoreDuplicates:true});
       if(error)throw error;
     }
   }
 }
 if(event.type==="credit_note.created"){
   const note=event.data.object as Stripe.CreditNote;
   if(typeof note.invoice==="string")await db.from("referral_commissions").update({status:"reversed"}).eq("invoice_id",note.invoice);
 }
 if(event.type==="invoice.voided"){
   const invoice=event.data.object as Stripe.Invoice;
   await db.from("referral_commissions").update({status:"reversed"}).eq("invoice_id",invoice.id);
 }
 return NextResponse.json({received:true});
 }catch(e){console.error("Webhook processing error",event.id,e);return NextResponse.json({error:"Erro no processamento; o Stripe pode repetir."},{status:500});}
}