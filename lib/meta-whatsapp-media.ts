import "server-only";

/** Meta Cloud API delivers a media ID, never the actual image in a webhook.
 * Only a signed, configured Meta webhook can invoke this function.
 * Downloaded bytes are sent once to the configured vision model; never persisted.
 */
export async function metaImageDataUrl(id:string,phoneNumberId:string,apiToken:string,version:string){
 if(!/^\d{8,30}$/.test(id))throw new Error("Identificador de imagem inválido.");
 if(!/^\d{6,25}$/.test(phoneNumberId))throw new Error("Número WhatsApp inválido.");
 if(!/^v\d{2,3}\.\d$/.test(version))throw new Error("Versão Meta Graph inválida.");
 const metadata=await fetch("https://graph.facebook.com/"+version+"/"+encodeURIComponent(id)+"?phone_number_id="+encodeURIComponent(phoneNumberId),{
  headers:{Authorization:"Bearer "+apiToken},cache:"no-store",signal:AbortSignal.timeout(8000)
 });
 if(!metadata.ok)throw new Error("O WhatsApp não permitiu obter a fotografia.");
 const media=await metadata.json() as {url?:string;mime_type?:string;file_size?:number};
 if(!media.url||!["image/png","image/jpeg"].includes(media.mime_type||""))throw new Error("Envia uma imagem JPG ou PNG.");
 if(typeof media.file_size==="number"&&media.file_size>5_000_000)throw new Error("A fotografia é demasiado grande (máximo 5 MB).");
 const link=new URL(media.url);
 const h=link.hostname.toLowerCase();
 const allowed=h==="lookaside.fbsbx.com"||h.endsWith(".fbcdn.net")||h.endsWith(".whatsapp.net");
 if(link.protocol!=="https:"||!allowed||link.username||link.password)throw new Error("Origem da fotografia não autorizada.");
 const res=await fetch(link.toString(),{headers:{Authorization:"Bearer "+apiToken},
  cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw new Error("O WhatsApp não permitiu descarregar a fotografia.");
 const size=Number(res.headers.get("content-length")||0);
 if(size>5_000_000)throw new Error("Imagem demasiado grande.");
 const buffer=Buffer.from(await res.arrayBuffer());
 if(buffer.byteLength>5_000_000)throw new Error("Imagem demasiado grande.");
 const jpeg=buffer.length>3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff;
 const png=buffer.length>8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(!jpeg&&!png)throw new Error("A imagem recebida não é JPG nem PNG.");
 return "data:"+(jpeg?"image/jpeg":"image/png")+";base64,"+buffer.toString("base64");
}
