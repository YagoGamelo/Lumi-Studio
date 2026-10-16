import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {getAiProviders} from "@/lib/ai/router";

export const dynamic="force-dynamic";
export async function GET(){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 return NextResponse.json({
  providers:getAiProviders(),
  note:"Configurado significa chave no servidor, não que a API tenha sido testada. A LUMI AI combina modelos de texto externos com um modelo próprio opcional. A biblioteca só é consultada com autorização; imagens, vídeos e ações externas ainda requerem integrações separadas."
 },{headers:{"Cache-Control":"private, no-store"}});
}
