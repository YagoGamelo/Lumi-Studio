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
