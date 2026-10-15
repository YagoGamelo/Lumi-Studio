# LUMI Studio

Projeto Next.js + Supabase em desenvolvimento. O **registo de contas reais precisa de um projeto Supabase**: a página visual por si só não cria utilizadores.

## Ativar o registo por email (sem pagar)

1. Abre https://supabase.com/dashboard e cria um projeto.
2. Dentro do projeto: **SQL Editor > New query**. Copia o conteúdo de `supabase/schema.sql`, executa e verifica se não há erros.
3. Abre **Project Settings / API** ou **Connect** para obter o **Project URL** e a **publishable key** (ou anon key compatível).
4. No teu computador, cria `.env.local` na raiz do projeto, sem o publicar no GitHub:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=COLOCA_AQUI_A_CHAVE_PUBLICA
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

5. Em **Supabase > Authentication > Providers**, ativa Email. Em **Authentication > URL Configuration**, define:
   - **Site URL**: `http://localhost:3000` (para testar no teu computador)
   - **Redirect URLs**: `http://localhost:3000/auth/callback`
   - Adiciona também `https://TEU-SITE.vercel.app/auth/callback` caso publiques na Vercel; define então Site URL para o domínio público.
6. Inicia `npm install` e `npm run dev`. Cria conta e verifica o email de confirmação antes de iniciar sessão.
7. O username só é criado na página de onboarding após a autenticação.

**Se usares Vercel:** define as mesmas variáveis em **Project > Settings > Environment Variables** (Production e Preview, conforme o ambiente) e faz **Redeploy**, pois variáveis `NEXT_PUBLIC_` são integradas na build.

## Ativar 'Continuar com Google' (opcional)

1. Google Cloud Console: cria projeto, configura o consentimento OAuth e cria OAuth Client ID para aplicação web.
2. Na Google Cloud, define o redirect URI **exato do Supabase** fornecido na área **Authentication > Providers > Google** (normalmente `https://PROJECT-REF.supabase.co/auth/v1/callback`).
3. No Supabase, ativa o fornecedor Google e coloca o Client ID e Client Secret **no painel Supabase**, nunca em ficheiros públicos.
4. Em **Authentication > URL Configuration**, autoriza o URL `https://TEU-SITE/auth/callback` da aplicação.
5. Volta a testar a autenticação.

## Se não funcionar

- **"Supabase não configurado"**: verifica as duas variáveis públicas e reinicia/reinstala a build.
- **"Email not confirmed"**: abre o email de confirmação (pasta de spam).
- **"Invalid login credentials"**: confirma endereço, palavra-passe e validação da conta.
- **"Provider is not enabled"**: ativa Google no painel Supabase.
- **Erro ao escolher username**: confirma que o SQL foi executado, que o username é único e que são 3–20 caracteres, começando por letra.
- **Redirecionamento falhou**: o domínio completo com protocolo e rota `/auth/callback` tem de estar nas Redirect URLs.

Não partilhes comigo, nem num issue do GitHub, tokens privados, service_role, palavras-passe ou Client Secrets.

## Funcionalidades desta versão

- Landing page e painel com identidade LUMI.
- Estrutura de login por Google/email e perfil com username.
- Rascunhos de bots, painel de estúdio e programa de afiliados (base).
- **Ainda por validar:** execução integral dos bots, agendamento, vídeo, avatares 360°, redes sociais e pagamentos de afiliados. Não lançar comercialmente até concluir integração e testes.

Referências oficiais:
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://nextjs.org/docs/app/guides/environment-variables


## Novo: LUMI Stream Studio (beta)

Depois de entrar e escolher um username, abre **Painel → Stream Studio** (`/dashboard?tab=stream`).

Funcionalidades já implementadas no navegador:
- Criar/escolher cenas (A começar, Em direto, Já volto, IRL, A terminar) e cenas personalizadas.
- Pedir autorização de captura de ecrã, câmara e microfone; compor a imagem numa pré-visualização 16:9.
- Gravar o vídeo composto para o dispositivo, incluindo áudio quando suportado por MediaRecorder e pelo navegador (Chrome/Edge no computador recomendado).
- Personalizar título, cor e aviso; guardar cenas localmente e exportar configuração JSON.
- Associar bots de rascunho à stream e mostrar avisos manuais, sem fingir que os bots já correm externamente.
- Criar um URL público **Browser Source** em /overlay/stream para OBS Studio/Streamlabs (camada transparente). Podes usar o overlay mesmo sem o SQL adicional, mas nesse caso é estático.
- Preparar convite OAuth2 da **tua própria aplicação Discord** usando só o Client ID público (nunca Bot Token), com permissões mínimas de ver canais + enviar mensagens.

### Ativar o overlay com atualização ao vivo

1. No Supabase deste projeto, abre **SQL Editor → New query**.
2. Executa o conteúdo completo de **supabase/stream.sql**, **não** o schema.sql inicial. É uma migração adicional que cria a tabela stream_profiles e a função restrita de leitura por token.
3. No **Stream Studio**, clica **Ativar sincronização em tempo real**. Isto cria um token aleatório privado e grava as definições por utilizador com RLS.
4. Clica **Copiar link do overlay** novamente e cola no OBS/Streamlabs: **Fontes → Browser Source / Fonte de navegador**. Resolução aconselhada: 1920 × 1080.
5. A partir daí, o overlay consulta periodicamente (cerca de 3 s) as alterações de cena, título e mensagem. Mantém o link do overlay em privado.

A sincronização **não transmite vídeo**: o OBS/Streamlabs continua a enviar a live para o destino. O botão **Gravar vídeo** grava apenas no dispositivo do utilizador. A app **não é um substituto completo de OBS** e não oferece emissão RTMP/SRT/WebRTC, chat real Twitch/YouTube, controlo OBS por WebSocket, execução de bots Discord, cortes/edição automática ou passagem sem interrupção PC↔IRL. Esses módulos exigem serviços, integrações autenticadas, ingestão/relay de vídeo, políticas de segurança e testes em dispositivos físicos antes de estarem disponíveis.

**Nota técnica e de segurança:** a tabela de overlay só pode ser alterada pelo respetivo dono autenticado; a função pública devolve apenas campos visuais ao receber o token longo aleatório, e não devolve dados da conta. Nunca colocar tokens de Discord, chaves de stream, OAuth secrets ou a chave service_role em fontes browser ou variáveis NEXT_PUBLIC_.

Referências:
- https://obsproject.com/kb/browser-source
- https://discord.com/developers/docs/topics/oauth2
- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
- https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder


## LUMI GO LIVE — emissão direta a partir do navegador (beta)

O painel **Stream Studio** inclui agora o módulo **Emitir em direto**, que compõe as cenas do editor num canvas 1280×720 (30 fps) e envia vídeo e áudio por **WebRTC/WHIP**, sem OBS nem Streamlabs. Usa Chrome/Edge num computador para o primeiro teste. Em dispositivos móveis, a captura de ecrã pode não ser suportada, mas a câmara/microfone podem funcionar conforme navegador e permissões.

### Fazer uma live real

1. Entra em /dashboard?tab=stream e escolhe a cena **Em direto** ou **IRL**.
2. Liga a câmara e/ou a captura de ecrã, e o microfone. Confirma a pré-visualização.
3. Cria uma entrada **WebRTC/WHIP** num fornecedor compatível (por exemplo, [Cloudflare Stream WebRTC](https://developers.cloudflare.com/stream/examples/browser-based-webrtc/)). Consulta os preços/condições do fornecedor. Algumas entradas necessitam de uma chave privada na URL; outras fornecem um Bearer Token.
4. Introduz o **URL de publicação WHIP (https://)** no campo privado do módulo. Se necessário, coloca o Bearer Token no segundo campo. O app **não guarda nem transmite estas credenciais aos servidores LUMI**: o navegador contacta diretamente o servidor WHIP.
5. Carrega em **Entrar em direto**. O botão muda para **Terminar transmissão** quando houver sessão. Verifica o indicador **NO AR**, velocidade de envio e o painel do teu fornecedor. O envio para a entrada não significa, por si só, que a live esteja pública numa rede social.
6. O vídeo e o áudio enviados continuam a refletir as mudanças de cena e os avisos do estúdio. Para terminar, carrega **Terminar transmissão**: a app pede DELETE da sessão WHIP e fecha o WebRTC.

**Múltiplos destinos:** serviços como Cloudflare Stream podem configurar **simulcast/outputs** para Twitch, YouTube e outras plataformas. Essa configuração é realizada no fornecedor; a LUMI ainda não gere destinos RTMP nem chaves das redes sociais. Ver https://developers.cloudflare.com/stream/stream-live/simulcasting/.

**PC → IRL:** é possível abrir a LUMI num telemóvel com conta autenticada, ativar a câmara e iniciar uma sessão WHIP. **Não é ainda um handoff automático sem corte**: isso exige um serviço de ingestão central com controlo da fonte ativa, relay ininterrupto, reconexão e failover. Dois dispositivos não devem publicar simultaneamente para a mesma entrada WHIP sem suporte explícito do fornecedor.

**Segurança:** não coloques URLs WHIP secretos, stream keys, credenciais, Bot Tokens ou Bearer Tokens no GitHub, imagens públicas, chats ou ficheiros de overlay. O URL WHIP e o Bearer Token são mantidos em memória apenas enquanto a página estiver aberta. Nunca colocar estes valores em variáveis NEXT_PUBLIC_.

**Limitações:** a qualidade depende do navegador, hardware e rede; não há garantia de estabilidade para 24/7, transmissão multiplataforma sem serviço, gravação na nuvem, reconexão automática com failover, plugins nativos OBS ou captura direta de jogos protegidos. Fazer testes privados antes de emitir publicamente.

Referências técnicas: [RFC 9725 WHIP](https://www.rfc-editor.org/rfc/rfc9725.html), [Cloudflare Stream browser WHIP](https://developers.cloudflare.com/stream/examples/browser-based-webrtc/), [OBS WHIP](https://obsproject.com/kb/whip-streaming-guide).


## LUMI = plataforma de bots universais (produto principal)

A LUMI **não é um site centrado em streaming**. O produto central é o **LUMI Builder**, onde qualquer pessoa descreve uma ideia em linguagem natural, adapta a categoria, edita instruções e guarda um bot universal como rascunho.

- **Criar bots universais:** /dashboard?tab=bots. Biblioteca filtrável de 15 modelos iniciais; é possível descrever livremente bots de outros temas. Limite beta: 10 rascunhos por conta.
- **Conteúdo com IA:** exemplos de produtor de vídeos, clips, publicações, guiões, vozes, legendas e storyboard.
- **Streams com IA:** exemplos para preparação de lives, cenas e alertas.
- **Transferir ficheiros entre aplicações:** modelos que especificam origem, destino, regras, aprovações e permissões de cada conta.
- **Organização e produtividade:** agenda, pesquisa, tarefas, compras e notícias.
- **Discord, automações, social e programação:** outros tipos de bots personalizáveis.
- **Ferramentas complementares independentes:** /dashboard?tab=studio para Creator Studio e /dashboard?tab=stream para Stream Studio. Os bots de streaming podem ser associados ao Stream Studio, mas ninguém precisa de o abrir para utilizar a plataforma universal.

**Estado de desenvolvimento:** escolher um exemplo preenche o formulário do bot; guardar cria um rascunho na tabela existente public.bots. A IA de planificação depende de OPENAI_API_KEY no servidor. Um bot de vídeo com IA **não** gera ainda vídeo final; um bot de transferências **não** move ficheiros automaticamente entre sites; bots de Discord e redes sociais **não** têm execução ativa. Ações reais exigem conectores OAuth, motores de tarefas, fornecedores externos, permissões por utilizador, custos controlados, auditoria, confirmação para ações destrutivas e testes de segurança. Não pedir aos utilizadores que partilhem palavras-passe ou tokens no texto das instruções.

**Estrutura de produto:** LUMI Builder = plataforma principal. Creator Studio e Stream Studio = programas opcionais dentro do mesmo site. A identidade, conta e lista de bots são comuns.


### Bot diretor de câmaras e transições cinematográficas

Na biblioteca de bots universais escolhe **Diretor de câmaras cinematográficas** e guarda o rascunho na tua conta. O botão **Experimentar transições cinematográficas** (ou **Abrir editor** num bot guardado) abre o LUMI Camera Lab sem sair do LUMI Builder.

- Aceita **uma ou duas fontes**, através de dois vídeos locais ou câmaras com acesso permitido pelo navegador. Em alguns dispositivos (incluindo iPads) a captura simultânea de duas câmaras não é suportada.
- Permite pedir em linguagem natural uma transição tipo **drone digital, órbita 2.5D, whip pan, zoom, dissolvência ou deslizamento** e escolher duração e sentido do movimento.
- Planeamento com IA: POST autenticado /api/bots/cinematic/plan chama OPENAI_API_KEY, se disponível. Sem chave, usa **regras locais** e avisa explicitamente que não executou IA externa.
- A ferramenta apresenta uma pré-visualização de canvas em 1280×720 e exporta o resultado como **WebM sem áudio**, quando o navegador suporta MediaRecorder/captureStream. Ficheiros de vídeo são processados no navegador, sem upload para LUMI.
- **Não gera cenários novos, movimentos físicos de drone, profundidade 3D real, nem é um editor multicâmara profissional**. Para efeitos generativos de outra cena, tracking de profundidade, continuidade realista e sincronização profissional de áudio é necessária infraestrutura adicional e testes.

O editor não publica automaticamente, não emite cenas ao vivo e não armazena media privados no servidor.

## Bot de informações programadas — LUMI Alerts

Em `/dashboard?tab=alerts`, escolhe um bot universal já criado, a mensagem ou tema, hora, frequência e canal de entrega. A interface permite consultar a caixa de entrada, pausar, reativar, eliminar e exportar cada alerta como alarme do calendário (`.ics`). A galeria de bots inclui o modelo «Bot de informações e alarmes».

### 1. Ativar no Supabase

Executa `supabase/alerts.sql` uma vez no SQL Editor do projeto Supabase, além do schema inicial. Este ficheiro acrescenta tabelas com permissões por utilizador, números verificados e reservas atómicas de tarefas. Não voltes a executar o `schema.sql` inicial.

### 2. Processamento automático dos horários

Define as variáveis **privadas** na Vercel: `SUPABASE_SERVICE_ROLE_KEY` (nunca NEXT_PUBLIC_) e `CRON_SECRET` (pelo menos 24 caracteres aleatórios). Opcionalmente configura `OPENAI_API_KEY` para resumir informações gerais — sem acesso a notícias em tempo real, não inventar notícias atuais.

Configura um agendador que faça **POST a cada minuto** para `https://TEU-SITE/api/internal/alerts/dispatch` com o cabeçalho `Authorization: Bearer CRON_SECRET`. Este endpoint é privado, reserva até cinco alertas por execução, grava na caixa de entrada e, para canais externos, envia ao fornecedor. Sem o agendador **os alertas ficam guardados mas não são entregues automaticamente**.

**Atenção ao Vercel Hobby:** o cron integrado tem frequência mínima diária e precisão aproximada de uma hora, por isso não chega para envios a horários personalizados. Usa um serviço de cron externo compatível com minuto, um worker persistente noutro serviço, ou um plano que permita execução por minuto.

### 3. SMS e WhatsApp

Precisas de um fornecedor de mensagens, por exemplo Twilio, configurado com os seguintes segredos privados:

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`: permitem confirmar a posse do número por código SMS;
- `TWILIO_FROM_NUMBER`: remetente SMS autorizado;
- `TWILIO_WHATSAPP_FROM`: remetente WhatsApp Business, no formato `whatsapp:+...`;
- `TWILIO_WHATSAPP_CONTENT_SID`: modelo WhatsApp previamente aprovado, contendo como variável 1 o nome do bot e um convite para abrir as informações na LUMI.

Os utilizadores só podem configurar SMS/WhatsApp para o seu número verificado. A ativação de WhatsApp exige consentimento explícito. Podem pausar alertas e desligar o número. Verificação e envio têm custos. Mensagens iniciadas pela empresa fora da janela de atendimento de 24 horas exigem templates aprovados; por isso o conteúdo completo fica na caixa de entrada LUMI e a mensagem WhatsApp é um aviso com template.

### 4. Alarmes sem a página aberta

Em cada horário guardado, usa o botão **Alarme .ics** para importar um evento recorrente com VALARM numa aplicação de calendário compatível. A vibração ou o som dependem do calendário/definições do dispositivo. O inbox da LUMI não envia push em segundo plano nesta fase.

### Limites e segurança

- Até 10 alertas por utilizador nesta beta; envio externo não está ativo até a migração, o processador e o fornecedor estarem configurados.
- Informações atualizadas exigem fontes/APIs oficiais de notícias, preços ou dados; o modelo textual isolado não consegue verificar acontecimentos atuais.
- Os números e os horários estão protegidos na base de dados; as chaves do fornecedor nunca são enviadas para o browser.
- Não enviar mensagens para terceiros sem autorização. Opt-in e confirmação de número são obrigatórios.

Referências: https://www.twilio.com/docs/verify/api ; https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates ; https://vercel.com/docs/cron-jobs/usage-and-pricing

## LUMI Atendimento — bots universais para lojas, mensagens e chamadas

Novo separador no painel: `/dashboard?tab=support`. O criador LUMI continua a permitir bots de qualquer tipo. Os modelos «Atendimento para lojas com IA» e «Assistente de chamadas para negócios» são exemplos editáveis de bots universais.

### Funcionalidades nesta primeira versão

- Configurar loja, informações oficiais (horários, produtos, regras, envios etc.), mensagem de boas-vindas e bot personalizado da conta.
- Ativar link público em `/atendimento/SEU-TOKEN` e incluir no website através de iframe. Clientes escrevem; a IA prepara uma resposta a partir da informação fornecida, com passagem para atendimento humano em caso de dúvida.
- Isolamento entre clientes: cada conversa tem chave privada própria guardada apenas na sessão do navegador. Proprietário vê histórico no painel, responde manualmente e pode fechar ou eliminar a conversa.
- Registar manualmente chamadas e notas de atendimento; a tabela guarda apenas últimos quatro dígitos do número e não grava áudio. O registo de chamadas Twilio pode ser preenchido por webhooks após integração.
- Os webhooks Twilio opcionais permitem responder a mensagens SMS/WhatsApp recebidas, e atender chamadas com anúncio de uso de IA e consentimento antes da transcrição da fala. **Não** grava o áudio. A transcrição de um pedido só é guardada após consentimento da pessoa.

### 1. Ativar Supabase

Executar **uma vez** `supabase/support.sql` no SQL Editor do Supabase. É uma migração adicional: NÃO repetir `supabase/schema.sql`.

### 2. Chaves privadas na Vercel

Na Vercel > lumi-studio > Settings > Environment Variables, definir em Production:

- `SUPABASE_SERVICE_ROLE_KEY` — obter nas chaves secretas do Supabase; NUNCA partilhar, publicar, colocar em NEXT_PUBLIC_ ou guardar no GitHub.
- `OPENAI_API_KEY` (opcional mas necessária para as respostas inteligentes. Sem ela, o chat devolve uma mensagem de espera e encaminha para uma pessoa). Pode também usar `OPENAI_MODEL` para selecionar um modelo compatível.

Voltar a publicar na Vercel depois de atualizar as variáveis. A atualização do GitHub, por si só, não ativa as tabelas nem os serviços.

### 3. Ligar telefone e WhatsApp/SMS (opcional, piloto de uma loja)

A ligação dos webhooks Twilio é **opcional e não está ativa só por instalar a LUMI**. Para um piloto, configurar um número próprio e os seguintes segredos privados na Vercel:

- `TWILIO_AUTH_TOKEN` — token secreto da conta Twilio.
- `TWILIO_SUPPORT_BASE_URL` — URL público EXATO usado para validar assinaturas, por exemplo `https://lumi-studio-two.vercel.app` (sem barra final).
- `TWILIO_SUPPORT_OWNER_ID` — identificador de utilizador Supabase ao qual pertence a loja piloto; atribuir no servidor, nunca aceitar de pedidos públicos.
- `TWILIO_SUPPORT_MESSAGING_TO` — número/canal de destino da conta Twilio, no formato `+...` para SMS ou `whatsapp:+...` para WhatsApp, exatamente como aparece nos webhooks.
- `TWILIO_SUPPORT_VOICE_TO` — número Twilio de destino das chamadas, em formato internacional.

Configurar na consola Twilio:

- **Incoming Messages**: POST `https://TEU-DOMINIO/api/support/twilio/message`.
- **A Call Comes In**: POST `https://TEU-DOMINIO/api/support/twilio/voice`.
- **Call Status Callback**: POST `https://TEU-DOMINIO/api/support/twilio/call-status`.

Os webhooks verificam a assinatura X-Twilio-Signature, restringem destinatário e perfil autorizados, e recusam pedidos não autenticados. Esta primeira configuração é para um único proprietário/número por implantação; para múltiplas lojas com números independentes é necessária gestão de vários números, aquisição e associação segura de contas Twilio.

**Importante:** WhatsApp e SMS só recebem e respondem a pedidos iniciados pelo cliente num canal configurado. Não há envio de campanhas nem mensagens não solicitadas. A operação WhatsApp exige cumprir as regras da Meta/Twilio. A transcrição de fala pode exigir avisos e consentimento específicos segundo o país; a implementação pede confirmação antes de usar reconhecimento vocal, mas é necessário validar o fluxo juridicamente antes de uso comercial. Chamadas de emergência não são suportadas.

### Limitações e privacidade

- Não afirma conhecer preços, stocks nem políticas que a loja não inseriu. Se a IA não souber, sinaliza para atendimento humano.
- O sistema não instala bots automaticamente no WhatsApp, Instagram, redes telefónicas ou caixas de mensagens alheias; cada serviço requer uma API, permissões e contrato.
- Mensagens e resumos de chamadas ficam guardados na base de dados e só são visíveis ao proprietário. O utilizador pode eliminar registos no painel. É necessária política de retenção, privacidade e eventual DPA antes de uso com clientes reais.
- Há limites básicos de pedidos e mensagens para controlar custos na beta. Para produção são necessárias proteções antiabuso/rate limit persistentes e testes de carga.

Documentação: https://www.twilio.com/docs/usage/webhooks/webhooks-security ; https://www.twilio.com/docs/messaging/twiml ; https://www.twilio.com/docs/voice/twiml/gather

## LUMI sem Twilio: SMS com Android e WhatsApp oficial

### SMS: TextBee Free (sem assinatura Twilio)

A LUMI tem agora um transporte SMS alternativo ao Twilio. O fornecedor open source [TextBee](https://textbee.dev/) usa **o teu Android e o SIM que já tens**, através de uma API autenticada. Oferece [plano gratuito](https://textbee.dev/pricing) de 50 SMS/dia e 300 mensagens/mês (enviadas e recebidas; limites atuais verificados em outubro de 2026). **Os SMS continuam sujeitos ao teu tarifário e a eventuais restrições de uso do operador**, e o dispositivo Android deve estar ligado e ter ligação à Internet.

1. Criar uma conta gratuita em `https://textbee.dev/`, sem cartão bancário, e confirmar o email.
2. Instalar a app TextBee no Android, autorizar o SMS e ligar o telemóvel à conta conforme o painel.
3. Criar uma API Key em TextBee, sem a partilhar.
4. Em **Vercel > lumi-studio > Settings > Environment Variables**, guardar como **Secret / Production** a variável `TEXTBEE_API_KEY` (o valor vem do TextBee). NUNCA usar `NEXT_PUBLIC_TEXTBEE_API_KEY`.
5. Se ainda não tiveres executado a migração `supabase/alerts.sql` no Supabase, executa-a primeiro. Executa **uma única vez** a migração adicional **`supabase/alerts-free-sms.sql`**. Não apagar nenhuma tabela antiga.
6. Fazer **Redeploy** da LUMI na Vercel.
7. Na LUMI, entra em **Alertas e lembretes → O teu telemóvel**, confirma a autorização, pede o código e verifica. Agora já podes criar um bot e selecionar **SMS**. É necessário um agendador externo ativo para envios automáticos às horas guardadas.

O envio de código passa a usar TextBee se `TEXTBEE_API_KEY` estiver configurada, caso contrário mantém o Twilio opcional. Os códigos TextBee têm 6 dígitos, validade de 10 minutos, limite de tentativas e apenas um hash privado na base de dados. Não guardar códigos PIN nem chaves no frontend. Se o plano gratuito terminar ou o telemóvel ficar desligado, os SMS não são entregues.

### WhatsApp sem mensagens pagas automáticas

**Alertas programados:** o canal WhatsApp gratuito guarda o aviso na caixa de entrada LUMI. Quando o processador de agendamento o criar, a opção **«Abrir e enviar pelo WhatsApp»** abre uma mensagem pré-escrita endereçada ao teu número verificado para **envio manual**. A LUMI não envia essa mensagem automaticamente; o utilizador confirma. Assim evita enviar templates comerciais que a Meta pode cobrar.

**Respostas de atendimento (opcional, automático):** foi preparado um webhook da **WhatsApp Business Cloud API oficial**, e não uma integração não autorizada com o WhatsApp Web. Como a Meta anunciou em 1 de outubro de 2026, há uma franquia de 1000 mensagens de serviço gratuitas/mês por número de negócio; depois dessa franquia, mensagens são cobradas. O conector só responde a mensagens recebidas de clientes e limita as tentativas a um teto local configurado (100/mês por omissão). **Não garante custo zero**, pois não conhece outras mensagens enviadas na mesma conta e o negócio pode estar sujeito a custos/configuração Meta. Não ativa nada sozinho: está desligado até autorização explícita.

Para testar o conector Meta no **atendimento de uma única loja**:

1. Criar uma aplicação Meta com produto WhatsApp Business, um WhatsApp Business Account e um número empresarial autorizado. Confirmar no Meta Business o acesso e os custos antes de emitir.
2. Executar no Supabase `supabase/whatsapp-free-replies.sql` (migração adicional, não repetir schema.sql).
3. Na Vercel guardar **Secrets / Production**: `META_WA_PHONE_NUMBER_ID`, `META_WA_OWNER_ID` (user ID UUID Supabase da loja piloto), `META_WA_ACCESS_TOKEN`, `META_WA_APP_SECRET`, `META_WA_VERIFY_TOKEN` (frase aleatória tua) e `META_WA_GRAPH_VERSION` (versão Graph API atual fornecida no Meta Developer Dashboard). Opcional: `META_WA_FREE_REPLIES_PER_MONTH=100`. Nunca colocar tokens no browser.
4. Configurar o callback público `https://lumi-studio-two.vercel.app/api/support/meta/whatsapp` com GET de verificação e POST assinados, subscrever mensagens do WhatsApp Business Account.
5. **Apenas depois de confirmares o orçamento**, adicionar `META_WA_FREE_REPLIES_ENABLED=true` e fazer Redeploy. Sem esta variável ou se o limite local estiver esgotado, nenhuma resposta automática é enviada pela API Meta.

A LUMI valida `x-hub-signature-256`, ignora webhooks repetidos, guarda mensagens na caixa privada da loja, responde com o motor de atendimento existente e regista as tentativas numa tabela protegida. O limite de 100 é **local** e não conhece outras ferramentas ligadas à mesma conta, pelo que é obrigatório vigiar os gastos no Meta. Para mensagens programadas fora da janela de atendimento não há garantia de gratuidade; essas mensagens continuam manuais na versão sem custos.

### Alternativa WhatsApp Business gratuita sem APIs

A aplicação WhatsApp Business no próprio telemóvel é gratuita e pode configurar mensagens básicas de saudação e ausência. Não dá, por si só, a capacidade de integrar automaticamente todos os horários e agentes LUMI. Não usamos bibliotecas de automação não oficial do WhatsApp Web para evitar bloqueios de contas e problemas de privacidade.

Referências: `https://textbee.dev/docs/getting-started`, `https://textbee.dev/pricing`, `https://whatsappbusiness.com/resources/faq/`, `https://www.postman.com/meta/whatsapp-business-platform/`.
