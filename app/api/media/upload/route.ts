import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { randomUUID } from "node:crypto";
const permitted={
 avatar_front:["image/jpeg","image/png","image/webp"],
 avatar_left:["image/jpeg","image/png","image/webp"],
 avatar_right:["image/jpeg","image/png","image/webp"],
 avatar_consent:["video/mp4","video/webm"],
 clip:["video/mp4","video/webm"],
 music:["audio/mpeg","audio/wav"],
 video:["video/mp4","video/webm"]
} as const;
const exts:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","video/mp4":"mp4","video/webm":"webm","audio/mpeg":"mp3","audio/wav":"wav"};
export async function POST(req:Request){
 const auth=await authenticatedUser();if(!auth)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const form=await req.formData().catch(()=>null),kind=form?.get("kind"),file=form?.get("file"),rights=form?.get("rights");
 if(typeof kind!=="string"||!(kind in permitted)||!(file instanceof File)||rights!=="true")return NextResponse.json({error:"Ficheiro, categoria e confirmação de direitos obrigatórios."},{status:400});
 const type=file.type.toLowerCase();
 if(!(permitted[kind as keyof typeof permitted] as readonly string[]).includes(type))return NextResponse.json({error:"Tipo de ficheiro não suportado."},{status:415});
 const max=kind.startsWith("avatar_")&&kind!=="avatar_consent"?8_000_000:kind==="music"?15_000_000:25_000_000;
 if(file.size<1||file.size>max)return NextResponse.json({error:"O ficheiro excede o limite (imagens 8 MB, música 15 MB, vídeo 25 MB)."}, {status:413});
 const {count}=await auth.db.from("media_assets").select("*",{count:"exact",head:true}).eq("user_id",auth.user.id);
 if((count||0)>=25)return NextResponse.json({error:"Limite beta: 25 ficheiros por conta."},{status:403});
 const path=auth.user.id+"/"+kind+"/"+randomUUID()+"."+exts[type];
 const db=adminDb();
 const {error:uploadErr}=await db.storage.from("lumi-private").upload(path,await file.arrayBuffer(),{contentType:type,cacheControl:"3600",upsert:false});
 if(uploadErr)return NextResponse.json({error:"Erro ao armazenar ficheiro. Confirma que criaste o bucket privado."},{status:500});
 const {data,error}=await db.from("media_assets").insert({user_id:auth.user.id,kind,storage_path:path,original_name:file.name.slice(0,200),rights_confirmed:true}).select("id,kind,original_name").single();
 if(error){await db.storage.from("lumi-private").remove([path]);return NextResponse.json({error:"Falha ao registar o ficheiro."},{status:500});}
 return NextResponse.json({asset:data},{status:201});
}