import "server-only";
import Stripe from "stripe";
export const affiliateRate = 0.30;
export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe não configurado");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
export const plans = {
  creator_monthly: {name:"Creator",period:"mensal",amount:1990,priceEnv:"STRIPE_PRICE_CREATOR_MONTHLY"},
  creator_yearly: {name:"Creator",period:"anual",amount:19900,priceEnv:"STRIPE_PRICE_CREATOR_YEARLY"},
  pro_monthly: {name:"Pro",period:"mensal",amount:4990,priceEnv:"STRIPE_PRICE_PRO_MONTHLY"},
  pro_yearly: {name:"Pro",period:"anual",amount:49900,priceEnv:"STRIPE_PRICE_PRO_YEARLY"}
} as const;
export type PlanKey = keyof typeof plans;
export function priceId(key:PlanKey) {
  const id = process.env[plans[key].priceEnv];
  if (!id) throw new Error("Preço Stripe por configurar");
  return id;
}