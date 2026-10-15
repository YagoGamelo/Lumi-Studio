/**
 * Universal bot taxonomy and starter examples.
 * The templates create editable DRAFTS, not active integrations.
 * Keep IDs in sync with /api/bots and the AI planning schema.
 */
export const BOT_CATEGORIES=[
 "universal","automation","transfer","planner","research","video_ai","cinematic","stream_ai",
 "stream","discord","content","social","shopping","investment","coding"
] as const;
export type BotCategory=(typeof BOT_CATEGORIES)[number];
export const BOT_CATEGORY_LABELS:Record<BotCategory,string>={
 universal:"Bot universal",automation:"Automatizações",transfer:"Transferir entre apps",
 planner:"Organização",research:"Pesquisa",video_ai:"Vídeo com IA",cinematic:"Transições cinematográficas",
 stream_ai:"Streams com IA",stream:"Streaming",discord:"Discord",
 content:"Conteúdo e clips",social:"Redes sociais",shopping:"Compras",
 investment:"Notícias financeiras",coding:"Programação"
};
export type BotTemplate={
 id:string;category:BotCategory;title:string;description:string;
 prompt:string;services:string[];icon:string;group:"criar"|"organizar"|"ligar"|"outros"
};
export const BOT_TEMPLATES:BotTemplate[]=[
 {id:"universal",category:"universal",title:"O meu bot personalizado",icon:"✦",group:"outros",
 description:"Cria um assistente para qualquer ideia e escolhe o que pode fazer.",
 prompt:"Quero um assistente personalizável que compreenda os meus objetivos, proponha passos concretos, pergunte antes de executar ações externas e me deixe aprovar cada tarefa.",
 services:[]},
 {id:"video",category:"video_ai",title:"Criador de vídeos com IA",icon:"🎬",group:"criar",
 description:"Ideias, guiões, storyboard, voz e plano de edição de vídeos originais.",
 prompt:"Cria um bot que prepara ideias, guiões, storyboard, indicações de voz, legendas e um plano de montagem de vídeos originais. A geração e renderização do vídeo devem exigir um fornecedor autorizado e revisão antes de publicar.",
 services:["Gerador de vídeo","Voz/legendas","YouTube"]},
 {id:"cinematic",category:"cinematic",title:"Diretor de câmaras cinematográficas",icon:"🎥",group:"criar",
 description:"Pede transições estilo drone, órbita, whip ou zoom com uma ou duas câmaras.",
 prompt:"Cria um bot diretor de câmaras que, com vídeo de uma ou duas câmaras autorizadas, prepare transições cinematográficas ao meu pedido. Quero estilos tipo drone digital, movimento orbital, whip pan, zoom e dissolvência, com controlo da duração, pré-visualização e exportação. Deve distinguir movimentos simulados digitalmente de vídeo 3D gerado por IA.",
 services:["Câmaras","LUMI Camera Lab","Vídeo"]},
 {id:"lives",category:"stream_ai",title:"Produtor de lives com IA",icon:"📡",group:"criar",
 description:"Planeia lives, cenas, títulos, alertas e momentos de interação.",
 prompt:"Cria um produtor de streams com IA que prepara o guião da live, uma sequência de cenas, pausas, títulos, alertas, highlights e sugestões de interações. Não inicia nem publica uma transmissão sem autorização explícita.",
 services:["LUMI Stream Studio","Twitch","YouTube"]},
 {id:"clips",category:"content",title:"Editor de clips",icon:"✂️",group:"criar",
 description:"Seleciona os melhores momentos de lives próprias e prepara cortes.",
 prompt:"Cria um bot que organiza gravações das minhas próprias lives, sugere momentos interessantes, títulos, legendas e cortes para vídeos curtos, respeitando autorizações, direitos de autor e revisão antes de publicar.",
 services:["Twitch","Ferramentas de vídeo"]},
 {id:"stream",category:"stream",title:"Assistente de streaming",icon:"🎙️",group:"criar",
 description:"Moderação, cenas, overlays e ajuda durante as transmissões.",
 prompt:"Cria um bot de stream que prepara comandos, alertas, mensagens de moderação e propostas de mudança de cena no LUMI Stream Studio. Nunca modifica a live sem permissões e confirmação quando necessária.",
 services:["LUMI Stream Studio","OBS","Streamlabs"]},
 {id:"shop-support",category:"universal",title:"Atendimento para lojas com IA",icon:"🛍️",group:"ligar",
 description:"Responde a clientes, tira dúvidas, regista conversas e chama uma pessoa quando necessário.",
 prompt:"Cria um bot de atendimento para a minha loja. Quero que responda com educação a perguntas de clientes sobre produtos, horários, envios, devoluções e serviços, usando apenas informações oficiais que eu fornecer. Não inventes preços nem encomendas. Se não souber, pede ajuda da equipa humana. Guarda as conversas de forma privada e só responde em WhatsApp, SMS ou website quando o canal estiver devidamente autorizado.",
 services:["LUMI Atendimento","Website","WhatsApp","SMS"]},
 {id:"shop-phone",category:"universal",title:"Assistente de chamadas para negócios",icon:"☎️",group:"ligar",
 description:"Atende chamadas com autorização e mantém registos privados, sem gravar áudio por defeito.",
 prompt:"Cria um bot telefónico de atendimento que cumprimente os clientes, identifique-se como assistente de IA, explique o tratamento dos dados, peça autorização antes de transcrever a conversa e responda a dúvidas comuns com base nas informações do meu negócio. Mantém um registo de chamadas e um resumo mínimo do pedido, sem gravação de áudio por defeito. Encaminha os pedidos difíceis a uma pessoa e respeita o consentimento.",
 services:["LUMI Atendimento","Telefonia","Registo de chamadas"]},
 {id:"discord",category:"discord",title:"Moderador Discord",icon:"💬",group:"ligar",
 description:"Respostas a dúvidas, regras e ajuda à comunidade.",
 prompt:"Cria um bot para o meu servidor Discord que ajude com as regras, respostas frequentes, moderação e boas-vindas, apenas com permissões mínimas autorizadas pelo administrador do servidor.",
 services:["Discord"]},
 {id:"alerts",category:"planner",title:"Bot de informações e alarmes",icon:"⏰",group:"organizar",
 description:"Resumos, lembretes e informações às horas escolhidas por SMS, WhatsApp e calendário.",
 prompt:"Cria um bot de informações que me permita escolher o tema, os horários e os dias em que recebo os resumos. Quero poder optar pela caixa de entrada da LUMI, por SMS ou WhatsApp no meu número verificado, e por alarmes de calendário. Não inventes notícias atuais sem fontes verificadas; todos os canais exigem autorização e posso desativar os alertas quando quiser.",
 services:["LUMI Alerts","SMS","WhatsApp","Calendário"]},
 {id:"transfer",category:"transfer",title:"Transferências entre plataformas",icon:"↗",group:"ligar",
 description:"Planeia movimentos de ficheiros ou dados entre apps autorizadas.",
 prompt:"Cria um bot para transferir ficheiros do meu Google Drive para a minha Dropbox, após eu ligar ambas as contas com as permissões necessárias. Deve confirmar ficheiros, destinos, privacidade e possíveis substituições antes de transferir.",
 services:["Google Drive","Dropbox"]},
 {id:"automation",category:"automation",title:"Automações entre apps",icon:"⚡",group:"ligar",
 description:"Liga acontecimentos, condições e ações entre serviços.",
 prompt:"Cria um bot que recebe um evento autorizado de uma aplicação, aplica regras de validação e prepara uma ação numa segunda aplicação. Deve oferecer um modo de teste e pedir permissão antes de alterar ou partilhar dados.",
 services:["Webhooks","Apps autorizadas"]},
 {id:"planner",category:"planner",title:"Organizador pessoal",icon:"📅",group:"organizar",
 description:"Agenda, tarefas, lembretes e planeamento da semana.",
 prompt:"Cria um assistente de organização que me ajude a planear semanas, priorizar tarefas, propor horários e preparar lembretes. Confirma comigo antes de criar eventos em calendários externos.",
 services:["Google Calendar"]},
 {id:"research",category:"research",title:"Pesquisador inteligente",icon:"🔎",group:"organizar",
 description:"Pesquisa, resume e organiza informação com fontes.",
 prompt:"Cria um bot de pesquisa que analisa perguntas, organiza fontes verificáveis, resume os resultados com referências e identifica informações incertas, sem inventar notícias.",
 services:["Pesquisa na Web"]},
 {id:"social",category:"social",title:"Gestor de redes sociais",icon:"📱",group:"criar",
 description:"Calendário editorial, legendas e publicações para aprovação.",
 prompt:"Cria um bot que organiza um calendário de posts para as minhas redes sociais, prepara ideias, legendas e imagens, e só publica depois de rever e aprovar o conteúdo através de ligações oficiais.",
 services:["Instagram","TikTok","YouTube"]},
 {id:"shopping",category:"shopping",title:"Assistente de compras",icon:"🛍️",group:"organizar",
 description:"Compara alternativas segundo preço e requisitos.",
 prompt:"Cria um bot que recebe os meus requisitos de compras, compara opções e preços verificáveis e mostra vantagens e desvantagens. Nunca compra nem paga sem a minha aprovação.",
 services:["Lojas autorizadas"]},
 {id:"investment",category:"investment",title:"Notícias de mercados",icon:"📈",group:"organizar",
 description:"Alertas informativos e resumos, sem aconselhamento financeiro.",
 prompt:"Cria um bot de acompanhamento informativo dos mercados que prepara resumos com datas e fontes e avisa quando determinados eventos ocorrerem. Não dá aconselhamento de investimento nem executa ordens.",
 services:["Fontes de mercado licenciadas"]},
 {id:"coding",category:"coding",title:"Assistente de programação",icon:"⌘",group:"outros",
 description:"Planeia projetos, escreve exemplos e revê código.",
 prompt:"Cria um bot de programação que me ajuda a decompor projetos, explicar erros, sugerir testes e rever código. Não publica nem altera repositórios sem autenticação e autorização.",
 services:["GitHub"]}
];
