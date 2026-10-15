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

## Plataforma universal e aplicações separadas

A LUMI é principalmente um **criador de bots universais**. O utilizador pode descrever qualquer objetivo em linguagem natural, escolher um exemplo editável ou criar instruções completamente novas. Os templates em `lib/bot-catalog.ts` cobrem organização, investigação, tarefas, automatizações entre serviços autorizados, vídeo/clip com IA, Discord, streaming, social, negócios e educação. As categorias são partilhadas entre interface, criação e planeamento IA.

**Estrutura do produto:**
- `/dashboard?tab=bots`: LUMI Builder e galeria de 14 modelos de bots.
- `/dashboard?tab=apps`: catálogo de aplicações especializadas e opcionais.
- `/dashboard/apps/content`: LUMI Creator Studio, espaço separado para guiões e projetos de conteúdo.
- `/dashboard/apps/stream`: LUMI Stream Studio, programa especializado com cenas, gravação e WHIP.
- A navegação antiga `/dashboard?tab=studio` e `/dashboard?tab=stream` redireciona para as novas páginas para preservar bookmarks.

**O que está funcional agora:** login, criar/guardar/eliminar rascunhos de bots (máx. 3 na versão gratuita), modelos e planos de IA quando `OPENAI_API_KEY` está configurada; ferramentas beta do Stream Studio; guiões com API configurada.

**O que ainda NÃO está pronto:** execução autónoma de todos os bots; transferências reais entre Google Drive/Dropbox/outros serviços; edição/renderização completa de vídeos com IA; agendamento/publicação nas redes; alteração automática de cenas por bot; execução de bots Discord. Para isso são necessárias APIs oficiais, OAuth, motores de processamento, filas de tarefas, isolamento de permissões e custos por utilização.

Não executar transferências nem atuar sobre serviços de terceiros sem o consentimento e as permissões adequadas.


### Novo modelo — Bot Diretor Cinematográfico IA

No **LUMI Builder**, escolhe «Diretor Cinematográfico IA» na galeria. O modelo prepara um bot editável com instruções para criar efeitos de transição entre uma ou duas câmaras e renderiza uma demonstração logo abaixo do formulário.

- Fontes: 1 ou 2 ficheiros de vídeo locais, câmaras do navegador quando suportadas, ou cenário de demonstração.
- Comandos em português, por exemplo «faz uma subida estilo drone de 3 segundos e muda para a segunda câmara». A rota autenticada POST /api/bots/cinematic/plan usa IA via OPENAI_API_KEY quando configurada; se não estiver, interpreta palavras-chave localmente no servidor.
- Efeitos implementados por canvas: elevação virtual estilo drone, whip-pan, órbita simulada, dolly zoom e crossfade.
- O botão «Exportar clip» cria um vídeo local através de MediaRecorder, quando o navegador suporta esse recurso. A exportação não contém som e não faz upload dos vídeos de origem para a LUMI.
- As imagens das câmaras/vídeos ficam no browser e não são enviadas à IA. Apenas o pedido textual pode ser analisado pelo fornecedor IA, se configurado.

**Limitação essencial:** estes efeitos são transforms e misturas 2D de imagens existentes. Um "drone virtual" não é uma filmagem aérea real e não inventa uma nova perspetiva física. Geração volumétrica 3D ou novos ângulos realistas exigem um modelo de vídeo/depth adicional e são trabalho futuro. O bot é configurável e a demonstração funciona de forma limitada, mas não existe execução autónoma nem controlo remoto de dispositivos/câmaras.
