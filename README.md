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
