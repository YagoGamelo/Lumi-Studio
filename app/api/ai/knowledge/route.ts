import {NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/auth";
import {z} from "zod";

export const dynamic="force-dynamic";
const itemSchema=z.object({
 title:z.string().trim().min(3).max(80),
 content:z.string().trim().min(10).max(1500)
});
const deleteSchema=z.object({id:z.string().uuid()});

export async function GET(){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const {data,error}=await auth.db.from("lumi_knowledge")
  .select("id,title,content,created_at")
  .eq("user_id",auth.user.id).order("created_at",{ascending:false}).limit(50);
 if(error)return NextResponse.json({error:"Biblioteca indisponível. Executa a migração supabase/lumi-knowledge.sql."},{status:503});
 return NextResponse.json({items:data||[]},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(req:Request){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const parsed=itemSchema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Título ou texto inválido."},{status:400});
 const {count,error:countError}=await auth.db.from("lumi_knowledge")
  .select("id",{count:"exact",head:true}).eq("user_id",auth.user.id);
 if(countError)return NextResponse.json({error:"Biblioteca indisponível. Executa a migração SQL."},{status:503});
 if((count||0)>=50)return NextResponse.json({error:"Limite beta de 50 notas atingido."},{status:403});
 const {data,error}=await auth.db.from("lumi_knowledge")
  .insert({...parsed.data,user_id:auth.user.id})
  .select("id,title,content,created_at").single();
 if(error)return NextResponse.json({error:"Não foi possível guardar a nota."},{status:503});
 return NextResponse.json({item:data},{status:201,headers:{"Cache-Control":"private, no-store"}});
}

export async function DELETE(req:Request){
 const auth=await authenticatedUser();
 if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const parsed=deleteSchema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Nota inválida."},{status:400});
 const {error}=await auth.db.from("lumi_knowledge")
  .delete().eq("id",parsed.data.id).eq("user_id",auth.user.id);
 if(error)return NextResponse.json({error:"Não foi possível eliminar a nota."},{status:503});
 return NextResponse.json({deleted:true},{headers:{"Cache-Control":"private, no-store"}});
}
