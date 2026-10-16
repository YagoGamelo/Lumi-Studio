import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {getAiProviders} from "@/lib/ai/router";

export const dynamic="force-dynamic";
export async function GET(){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 return NextResponse.json({
  providers:getAiProviders(),
  note:"Configurado significa chave no servidor, não que a API tenha sido testada. Esta versão suporta texto, código, resumos e planos; não imagens ou ações externas."
 },{headers:{"Cache-Control":"private, no-store"}});
}
