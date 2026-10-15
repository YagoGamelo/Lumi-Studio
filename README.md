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
