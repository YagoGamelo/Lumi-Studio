/**
 * Catálogo público de ideias para bots. São modelos editáveis, não ações ativadas.
 * Integrações externas necessitam de ligação OAuth/API e consentimento do utilizador.
 */
export const botCategories=[
 "universal","automation","planner","research","content","video","stream","discord","social","shopping","business","education","investment"
] as const;
export const botCategoryLabels:Record<(typeof botCategories)[number],string>={
 universal:"Qualquer ideia",automation:"Automações",planner:"Organização",research:"Pesquisa",content:"Conteúdos",
 video:"Vídeos com IA",stream:"Streams",discord:"Discord",social:"Redes sociais",shopping:"Compras",
 business:"Negócios",education:"Educação",investment:"Finanças e notícias"
};
export type BotTemplate={id:string;name:string;category:(typeof botCategories)[number];emoji:string;description:string;instruction:string};
export const botTemplates:BotTemplate[]=[
 {id:"any",name:"Bot à minha maneira",category:"universal",emoji:"✨",description:"Parte de uma ideia e personaliza tudo.",instruction:"Quero criar um bot pessoal que receba instruções em linguagem natural, prepare passos concretos, peça autorização antes de ações externas e explique claramente o que pode ou não executar."},
 {id:"transfer",name:"Transferir entre serviços",category:"automation",emoji:"🔄",description:"Organizar um fluxo entre apps autorizadas.",instruction:"Quero um bot que identifique ficheiros ou conteúdo que tenho autorização para utilizar, planeie transferências entre serviços ligados por APIs oficiais, evite duplicados e só execute após eu confirmar o destino e as permissões."},
 {id:"calendar",name:"Organizador pessoal",category:"planner",emoji:"📅",description:"Agenda, tarefas e lembretes.",instruction:"Organiza compromissos, tarefas, prazos e rotinas num plano diário ou semanal. Apresenta prioridades e prepara lembretes. Só utiliza o calendário depois de eu autorizar a ligação."},
 {id:"research",name:"Investigador de IA",category:"research",emoji:"🔎",description:"Pesquisar, comparar e resumir fontes.",instruction:"Ajuda-me a pesquisar um tema, comparar fontes fiáveis, distinguir factos de opiniões, indicar datas e preparar resumos com referências verificáveis, sem inventar informação."},
 {id:"video",name:"Criador de vídeos com IA",category:"video",emoji:"🎬",description:"Ideias, guiões, cenas e plano de edição.",instruction:"Transforma uma ideia original num vídeo: cria conceito, guião, storyboard, lista de planos, voz-off e instruções de edição. Para renderizar ou publicar vídeo, pede acesso ao motor de vídeo e às contas autorizadas."},
 {id:"clips",name:"Editor de clips",category:"content",emoji:"✂️",description:"Preparar cortes para Shorts, Reels e TikTok.",instruction:"Ajuda a selecionar momentos de vídeos ou lives que me pertencem ou que posso reutilizar, preparar timestamps, legendas, cortes e formatos verticais para clips. Não descarrega nem publica material sem autorização."},
 {id:"stream",name:"Copiloto de streaming",category:"stream",emoji:"🎙️",description:"Cenas, alertas, guiões e momentos da live.",instruction:"Ajuda a preparar uma stream: planeia as cenas, os alertas, a introdução, as pausas e momentos para clips. Integra-se no LUMI Stream Studio após configuração, sem executar ações externas antes de autorizar."},
 {id:"discord",name:"Comunidade Discord",category:"discord",emoji:"💬",description:"Regras, dúvidas, avisos e moderação.",instruction:"Prepara respostas para perguntas frequentes de um servidor Discord, regras de comunidade, mensagens de boas-vindas e propostas de moderação. Precisa de um bot Discord autorizado para executar comandos."},
 {id:"social",name:"Gestor de redes sociais",category:"social",emoji:"📱",description:"Calendário editorial e posts.",instruction:"Organiza um calendário editorial para as minhas redes sociais, propõe ideias originais, textos, hashtags relevantes e versões por plataforma. A publicação só acontece após ligação das contas e aprovação."},
 {id:"shopping",name:"Assistente de compras",category:"shopping",emoji:"🛒",description:"Comparar produtos e preços.",instruction:"Ajuda-me a comparar produtos e preços com fontes atuais, condições de entrega e avaliações. Pede confirmação antes de qualquer compra e nunca acede a cartões sem integração segura."},
 {id:"business",name:"Assistente de negócio",category:"business",emoji:"📈",description:"Projetos, clientes e relatórios.",instruction:"Organiza tarefas de um pequeno negócio, cria planos, relatórios, resumos de clientes e propostas. Trata dados pessoais com autorização e evita partilhar informações confidenciais."},
 {id:"learning",name:"Tutor pessoal",category:"education",emoji:"🎓",description:"Planos de estudo e exercícios.",instruction:"Cria planos de estudo ajustados aos meus objetivos, explica conteúdos passo a passo, propõe exercícios e acompanha o progresso sem inventar fontes."},
 {id:"news",name:"Notícias financeiras",category:"investment",emoji:"📰",description:"Alertas e resumos informativos.",instruction:"Prepara resumos de notícias financeiras com fontes, datas e contexto, distinguindo factos de previsões. Não faz recomendações personalizadas de investimento nem executa transações."}
];
