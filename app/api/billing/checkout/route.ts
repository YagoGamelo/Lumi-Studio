import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { plans,priceId,PlanKey,stripeClient } from "@/lib/billing";
import { z } from "zod";
const schema=z.object({plan:z.enum(["creator_monthly","creator_yearly","pro_monthly","pro_yearly"])});
export async function POST(req:Request){
 const a=await authenticatedUser();if(!a)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const body=schema.safeParse(await req.json().catch(()=>null));
 if(!body.success)return NextResponse.json({error:"Plano inválido"},{status:400});
 const {data:profile}=await a.db.from("profiles").select("id,username,stripe_customer_id").eq("id",a.user.id).maybeSingle();
 if(!profile?.username)return NextResponse.json({error:"Cria primeiro o username."},{status:409});
 try{
 const stripe=stripeClient(),db=adminDb();let customer=profile.stripe_customer_id as string|null;
 if(!customer){
   const created=await stripe.customers.create({email:a.user.email,metadata:{lumi_user_id:a.user.id}});
   customer=created.id;
   await db.from("profiles").update({stripe_customer_id:customer}).eq("id",a.user.id).is("stripe_customer_id",null);
 }
 const origin=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;
 const session=await stripe.checkout.sessions.create({
   mode:"subscription",customer,line_items:[{price:priceId(body.data.plan as PlanKey),quantity:1}],
   success_url:origin+"/dashboard?tab=billing&payment=success",
   cancel_url:origin+"/dashboard?tab=billing&payment=cancelled",
   allow_promotion_codes:false,
   client_reference_id:a.user.id,
   subscription_data:{metadata:{lumi_user_id:a.user.id}},
   metadata:{lumi_user_id:a.user.id}
 });
 return NextResponse.json({url:session.url});
 }catch(e){console.error("Billing checkout",e instanceof Error?e.message:e);return NextResponse.json({error:"Pagamentos ainda não configurados ou indisponíveis."},{status:503});}
}