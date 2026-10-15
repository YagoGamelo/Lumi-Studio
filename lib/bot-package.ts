type PortableBot={id:string;title:string;instruction:string;category:string;frequency:string};
export type BotTarget="server"|"discord"|"website";
const agent=String.raw`
import {readFileSync} from "node:fs";

const bot=JSON.parse(readFileSync(new URL("./bot.json",import.meta.url),"utf8"));
const apiKey=process.env.OPENAI_API_KEY;
const model=process.env.OPENAI_MODEL||"gpt-4.1-mini";
if(!apiKey)throw new Error("Define OPENAI_API_KEY como variável de ambiente antes de iniciar.");

export async function askBot(message){
 if(typeof message!=="string"||message.trim().length<1||message.length>2500)throw new Error("Mensagem inválida: usa até 2500 caracteres.");
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),20000);
 try{
  const result=await fetch("https://api.openai.com/v1/chat/completions",{
   method:"POST",
   headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
   body:JSON.stringify({model,max_tokens:700,messages:[
    {role:"system",content:"És o bot personalizado "+bot.title+". Instruções do criador: "+bot.instruction+"\nResponde de forma útil, segura e clara, em português, salvo pedido em contrário. Tens apenas capacidade de gerar texto. Não finjas que instalaste apps, moveste ficheiros, editaste vídeos ou executaste ações externas. Quando uma tarefa exigir integração, explica o que seria preciso autorizar."},
    {role:"user",content:message}
   ]}),
   signal:controller.signal
  });
  const data=await result.json();
  if(!result.ok)throw new Error("Fornecedor IA: HTTP "+result.status+" "+String(data.error?.message||"").slice(0,100));
  return String(data.choices?.[0]?.message?.content||"Não consegui preparar uma resposta.").slice(0,4000);
 }finally{clearTimeout(timeout);}
}
`;
const server=String.raw`
import {createServer} from "node:http";
import {readFileSync} from "node:fs";
import {timingSafeEqual} from "node:crypto";
import {askBot} from "./agent.mjs";

const port=Number(process.env.PORT||3000);
const secret=process.env.BOT_ACCESS_TOKEN||"";
const allowPublicWidget=process.env.BOT_PUBLIC_WIDGET==="1";
if(!allowPublicWidget && secret.length<24)throw new Error("Define BOT_ACCESS_TOKEN com pelo menos 24 caracteres no ambiente.");
const usage=new Map();

function json(res,code,payload){
 res.writeHead(code,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
 res.end(JSON.stringify(payload));
}
function authorized(req){
 const header=String(req.headers.authorization||"");
 const expected="Bearer "+secret;
 return secret.length>=24 && Buffer.byteLength(header)===Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(header),Buffer.from(expected));
}
async function input(req){
 let body="";for await(const part of req){body+=part.toString("utf8");if(Buffer.byteLength(body)>12000)throw new Error("Pedido demasiado grande");}
 return JSON.parse(body);
}
function rateOk(ip){
 const key=String(ip||"anon"),now=Date.now();
 const row=usage.get(key);if(!row||now-row.start>60000){usage.set(key,{start:now,count:1});return true;}
 row.count++;return row.count<=12;
}
const app=createServer(async(req,res)=>{
 const path=new URL(req.url||"/","http://localhost").pathname;
 if(req.method==="GET"&&path==="/health"){json(res,200,{ok:true});return;}
 if(req.method==="GET"&&path==="/widget.js"){
  if(!allowPublicWidget){json(res,403,{error:"Widget público desativado"});return;}
  res.writeHead(200,{"Content-Type":"text/javascript; charset=utf-8","X-Content-Type-Options":"nosniff"});
  res.end(readFileSync(new URL("./widget.js",import.meta.url),"utf8"));return;
 }
 if(req.method==="GET"&&(path==="/"||path==="/widget")){
  if(!allowPublicWidget){json(res,403,{error:"Widget público desativado"});return;}
  res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors *","X-Content-Type-Options":"nosniff"});
  res.end(readFileSync(new URL("./widget.html",import.meta.url),"utf8"));return;
 }
 if(req.method!=="POST"||path!=="/api/message"){json(res,404,{error:"Rota não encontrada"});return;}
 if(!allowPublicWidget&&!authorized(req)){json(res,401,{error:"Token inválido"});return;}
 if(!rateOk(req.socket.remoteAddress)){json(res,429,{error:"Demasiados pedidos. Tenta daqui a um minuto."});return;}
 try{const body=await input(req);const answer=await askBot(body.message);json(res,200,{answer});}
 catch(err){json(res,400,{error:err instanceof Error?err.message:"Erro"});}
});
app.listen(port,"0.0.0.0",()=>console.log("Bot LUMI ativo na porta "+port));
`;
const widget=String.raw`<!doctype html>
<html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font:15px system-ui;background:#101527;color:#f7f4ff;margin:0}
*{box-sizing:border-box}.app{height:100vh;display:flex;flex-direction:column;padding:14px;gap:12px}
header{font-weight:800;border-bottom:1px solid #38304e;padding-bottom:12px}
.messages{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px}
.msg{white-space:pre-wrap;line-height:1.5;padding:11px 13px;border-radius:12px;background:#242c41;max-width:90%}.mine{align-self:flex-end;background:#4c3b80}
form{display:flex;gap:7px}input{min-width:0;flex:1;padding:11px;background:#252c3f;color:white;border:1px solid #574875;border-radius:8px}
button{background:#7654d8;color:white;border:0;border-radius:8px;padding:9px 13px;cursor:pointer}
</style></head><body><div class="app">
<header>✦ LUMI · Bot personalizado</header>
<div id="messages" class="messages" aria-live="polite"></div>
<form id="chat"><input id="message" placeholder="Escreve uma mensagem..." maxlength="2500" required aria-label="Mensagem"><button id="send">Enviar</button></form>
</div><script src="/widget.js"></script></body></html>`;
const widgetScript=String.raw`const form=document.querySelector("#chat");
const messages=document.querySelector("#messages");
const input=document.querySelector("#message");
const send=document.querySelector("#send");
function line(content,mine){
 const p=document.createElement("p");p.className="msg"+(mine?" mine":"");p.textContent=String(content);messages.appendChild(p);messages.scrollTop=messages.scrollHeight;
}
line("Olá! Sou um bot criado com a LUMI. Como posso ajudar?",false);
form.addEventListener("submit",async e=>{
 e.preventDefault();const message=input.value.trim();if(!message)return;
 line(message,true);input.value="";send.disabled=true;
 try{
  const res=await fetch("/api/message",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message})});
  const data=await res.json();line(res.ok?data.answer:"Erro: "+data.error,false);
 }catch{line("Não foi possível contactar o bot.",false);}
 finally{send.disabled=false;input.focus();}
});
`;
const discord=String.raw`
import {createServer} from "node:http";
import {createPublicKey,timingSafeEqual,verify} from "node:crypto";
import {askBot} from "./agent.mjs";
const publicKey=process.env.DISCORD_PUBLIC_KEY||"";
const appId=process.env.DISCORD_APPLICATION_ID||"";
if(!/^[0-9a-f]{64}$/i.test(publicKey)||!/^\d{17,22}$/.test(appId))throw new Error("Define DISCORD_PUBLIC_KEY e DISCORD_APPLICATION_ID.");
const key=createPublicKey({key:Buffer.concat([Buffer.from("302a300506032b6570032100","hex"),Buffer.from(publicKey,"hex")]),format:"der",type:"spki"});
const port=Number(process.env.PORT||3000);
function response(res,status,body){
 res.writeHead(status,{"Content-Type":"application/json","Cache-Control":"no-store"});
 res.end(JSON.stringify(body));
}
async function readRaw(req){
 const chunks=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>100000)throw new Error("Pedido excede o limite");chunks.push(chunk);}
 return Buffer.concat(chunks);
}
function valid(req,raw){
 const signature=String(req.headers["x-signature-ed25519"]||"");
 const timestamp=String(req.headers["x-signature-timestamp"]||"");
 if(!/^[a-f0-9]{128}$/i.test(signature)||!/^\d{10}$/.test(timestamp))return false;
 if(Math.abs(Date.now()/1000-Number(timestamp))>300)return false;
 return verify(null,Buffer.concat([Buffer.from(timestamp),raw]),key,Buffer.from(signature,"hex"));
}
async function editReply(token,prompt){
 try{
  const content=(await askBot(prompt)).slice(0,1850);
  await fetch("https://discord.com/api/v10/webhooks/"+appId+"/"+encodeURIComponent(token)+"/messages/@original",{
   method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({content,allowed_mentions:{parse:[]}})
  });
 }catch{
  await fetch("https://discord.com/api/v10/webhooks/"+appId+"/"+encodeURIComponent(token)+"/messages/@original",{
   method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:"Não consegui responder agora.",allowed_mentions:{parse:[]}})
  }).catch(()=>{});
 }
}
const app=createServer(async(req,res)=>{
 if(req.method==="GET"&&req.url==="/health"){response(res,200,{ok:true});return;}
 if(req.method!=="POST"||req.url!=="/interactions"){response(res,404,{error:"Not found"});return;}
 try{
  const raw=await readRaw(req);
  if(!valid(req,raw)){response(res,401,{error:"Invalid signature"});return;}
  const data=JSON.parse(raw.toString("utf8"));
  if(data.type===1){response(res,200,{type:1});return;}
  if(data.type!==2||data.data?.name!=="perguntar"){response(res,200,{type:4,data:{content:"Comando desconhecido",flags:64}});return;}
  const prompt=String(data.data.options?.find(o=>o.name==="mensagem")?.value||"").slice(0,2500);
  if(!prompt){response(res,200,{type:4,data:{content:"Escreve uma mensagem.",flags:64}});return;}
  response(res,200,{type:5});
  void editReply(String(data.token),prompt);
 }catch{if(!res.headersSent)response(res,400,{error:"Invalid interaction"});}
});
app.listen(port,"0.0.0.0",()=>console.log("Bot Discord da LUMI na porta "+port));
`;
const register=String.raw`
const id=process.env.DISCORD_APPLICATION_ID||"";
const token=process.env.DISCORD_BOT_TOKEN||"";
const guild=process.env.DISCORD_GUILD_ID||"";
if(!/^\d{17,22}$/.test(id)||!token||!/^\d{17,22}$/.test(guild))throw new Error("Configura DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN e DISCORD_GUILD_ID.");
const res=await fetch("https://discord.com/api/v10/applications/"+id+"/guilds/"+guild+"/commands",{
 method:"PUT",headers:{"Authorization":"Bot "+token,"Content-Type":"application/json"},
 body:JSON.stringify([{name:"perguntar",description:"Faz uma pergunta ao bot da LUMI",type:1,
 options:[{name:"mensagem",description:"A tua pergunta",type:3,required:true,max_length:1500}]}])
});
if(!res.ok)throw new Error("Discord "+res.status+": "+(await res.text()).slice(0,300));
console.log("Comando /perguntar registado com sucesso.");
`;

export function createPortableBotFiles(bot:PortableBot,target:BotTarget){
 const name=(bot.title||"bot-lumi").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9-]+/g,"-").slice(0,40).replace(/^-|-$/g,"")||"bot-lumi";
 const manifest=JSON.stringify({id:bot.id,name:bot.title,description:bot.instruction,category:bot.category,frequency:bot.frequency,version:"1.0.0",origin:"LUMI Studio",capabilities:["text_response"],external_actions_implemented:false},null,2);
 const files=[{name:"bot.json",content:JSON.stringify({title:bot.title,instruction:bot.instruction,category:bot.category},null,2)},{name:"lumi-manifest.json",content:manifest},{name:"agent.mjs",content:agent}];
 const isDiscord=target==="discord";
 const isWidget=target==="website";
 files.push({name:"server.mjs",content:isDiscord?discord:server});
 files.push({name:"package.json",content:JSON.stringify({name,version:"1.0.0",private:true,type:"module",scripts:{start:"node --env-file=.env server.mjs",register:isDiscord?"node --env-file=.env register.mjs":"node server.mjs"},engines:{node:">=22"}},null,2)});
 const config=isDiscord?
"OPENAI_API_KEY=\nOPENAI_MODEL=gpt-4.1-mini\nDISCORD_APPLICATION_ID=\nDISCORD_PUBLIC_KEY=\nDISCORD_BOT_TOKEN=\nDISCORD_GUILD_ID=\nPORT=3000\n":
"OPENAI_API_KEY=\nOPENAI_MODEL=gpt-4.1-mini\nBOT_ACCESS_TOKEN=COLOCA_UM_TOKEN_PRIVADO_COM_PELO_MENOS_24_CARACTERES\nBOT_PUBLIC_WIDGET="+(isWidget?"1":"0")+"\nPORT=3000\n";
 files.push({name:".env.example",content:config});
 if(isDiscord)files.push({name:"register.mjs",content:register});
 if(isWidget){
  files.push({name:"widget.html",content:widget});
  files.push({name:"widget.js",content:widgetScript});
 }
 const readme=isDiscord?
"# Bot LUMI para Discord\n\n1. Cria uma aplicação em https://discord.com/developers/applications.\n2. Copia .env.example para .env e preenche OPENAI_API_KEY, DISCORD_APPLICATION_ID, DISCORD_PUBLIC_KEY, DISCORD_BOT_TOKEN e DISCORD_GUILD_ID. Guarda o ficheiro fora do GitHub.\n3. Num servidor Node.js 22+ com HTTPS público, executa npm start.\n4. Em Discord Developer Portal, define Interactions Endpoint URL para https://TEU-SERVIDOR/interactions. É necessário que o servidor esteja acessível para validação de assinatura.\n5. Convida a aplicação ao servidor com os âmbitos applications.commands e bot, e executa npm run register para instalar o comando /perguntar no teu servidor.\n6. Usa /perguntar mensagem:... . O bot responde por texto com a tua instrução LUMI.\n\nSegurança: o servidor verifica assinaturas Ed25519 do Discord em cada pedido. Não partilhes o Bot Token, as tuas chaves nem o .env. O bot não executa automaticamente ações externas, só gera respostas de texto. O alojamento HTTPS e as credenciais têm de ser configurados por ti.\n":
isWidget?
"# Widget LUMI para websites\n\n1. Instala Node.js 22+ num servidor acessível por HTTPS (Render, Railway, VPS ou outro).\n2. Copia .env.example para .env, coloca OPENAI_API_KEY no servidor e define o PORT, se necessário.\n3. Executa npm start. O widget fica em https://TEU-SERVIDOR/widget.\n4. No teu site, adiciona: <iframe src=\"https://TEU-SERVIDOR/widget\" title=\"Bot LUMI\" width=\"400\" height=\"550\"></iframe>.\n\nAVISO: BOT_PUBLIC_WIDGET=1 expõe um endpoint público de IA com custos. Há uma limitação básica em memória de 12 pedidos/min por IP; usa um gateway com limites de custo, proteção contra abuso e monitorização antes de publicares. Nunca coloques OPENAI_API_KEY no iframe nem no browser. Não usa dados pessoais ou ações externas sem integração autorizada.\n":
"# Bot LUMI para automações e outros programas\n\n1. Instala Node.js 22+ num servidor (Railway, Render, VPS, PC ligado ou outro).\n2. Copia .env.example para .env, preenche OPENAI_API_KEY e cria BOT_ACCESS_TOKEN com pelo menos 24 caracteres.\n3. Executa npm start (localmente em http://localhost:3000).\n4. No Make, n8n, Zapier ou outra aplicação com HTTP/webhooks, envia POST para https://TEU-SERVIDOR/api/message com headers Authorization: Bearer BOT_ACCESS_TOKEN e Content-Type: application/json. Corpo: {\"message\":\"Quero um resumo sobre ...\"}.\n5. A resposta JSON contém {\"answer\":\"...\"}. GET /health devolve {\"ok\":true}.\n\nIMPORTANTE: o bot gera respostas textuais; não pode editar ficheiros, executar ferramentas nem aceder a outras contas até adicionares APIs com permissões explícitas. Guarda o token e a OPENAI_API_KEY apenas no servidor e utiliza HTTPS fora de localhost. Coloca limites de custo e monitorização.\n";
 files.push({name:"README.md",content:readme});
 return files;
}
