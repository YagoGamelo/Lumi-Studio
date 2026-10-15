"use client";
import {useMemo,useState} from "react";
import {ArrowRight, Check, Search, Sparkles} from "lucide-react";
import {BOT_TEMPLATES,type BotTemplate} from "@/lib/bots/catalog";
const GROUPS=[{value:"todos",name:"Todos"},{value:"criar",name:"Criar conteúdo"},{value:"organizar",name:"Organizar"},{value:"ligar",name:"Ligar apps"},{value:"outros",name:"Outros"}] as const;
type Group=(typeof GROUPS)[number]["value"];
export default function BotCatalog({onSelect,selected}:{onSelect:(template:BotTemplate)=>void;selected:string}){
 const [group,setGroup]=useState<Group>("todos"),[search,setSearch]=useState("");
 const visible=useMemo(()=>{
  const query=search.toLocaleLowerCase("pt-PT").trim();
  return BOT_TEMPLATES.filter(x=>(group==="todos"||x.group===group)&&(!query||[x.title,x.description,...x.services].join(" ").toLocaleLowerCase("pt-PT").includes(query)));
 },[group,search]);
 return <section className="universal-catalog" aria-label="Biblioteca de bots universais">
  <div className="catalog-header"><div><div className="section-kicker"><Sparkles size={15}/> LUMI BUILDER</div><h2>Um bot para qualquer ideia.</h2><p>Começa do zero ou escolhe um exemplo. Todos são editáveis: tu decides o que o bot deve fazer.</p></div><div className="catalog-total"><strong>{BOT_TEMPLATES.length}+</strong><small>exemplos para personalizar</small></div></div>
  <div className="catalog-toolbar"><div className="catalog-filters" role="group" aria-label="Filtrar bots">{GROUPS.map(item=><button type="button" className={group===item.value?"active":""} onClick={()=>setGroup(item.value)} key={item.value}>{item.name}</button>)}</div><label className="catalog-search"><Search size={16}/><span className="sr-only">Pesquisar modelos</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar bots..." autoComplete="off"/></label></div>
  <div className="catalog-grid">{visible.map(item=><button key={item.id} type="button" className={"catalog-tile"+(selected===item.id?" selected":"")} onClick={()=>onSelect(item)}><span className="catalog-tile-top"><span className="catalog-emoji" aria-hidden="true">{item.icon}</span>{selected===item.id?<span className="catalog-chosen"><Check size={13}/> Selecionado</span>:<ArrowRight size={17}/>}</span><strong>{item.title}</strong><span className="catalog-description">{item.description}</span><span className="catalog-services">{item.services.length?item.services.slice(0,2).join(" · "):"Qualquer objetivo"}</span></button>)}</div>
  {visible.length===0&&<p className="catalog-empty">Não encontraste um modelo? Escolhe «Todos» ou escreve a tua ideia no editor. Podes criar bots de qualquer tema.</p>}
  <p className="muted-info catalog-disclaimer">Modelos de configuração, não bots já ativos. A execução, transferências reais, criação de vídeo por IA e publicação exigem os serviços e permissões correspondentes.</p>
 </section>;
}
