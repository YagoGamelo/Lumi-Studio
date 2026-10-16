# LUMI AI — chat principal e fábrica de bots

## Visão
A LUMI AI é a única identidade pública do assistente. Um Router no servidor escolhe entre o modelo LUMI (quando alojado), OpenAI, Gemini e Claude. A aplicação não reproduz pesos, arquitetura proprietária, datasets privados nem tecnologia interna do ChatGPT.
O objetivo é raciocinar melhor sobre bots com ferramentas autorizadas, pesquisa fundamentada, contextos controlados, testes de regressão e evolução versionada. Não existe garantia de superar todas as outras IAs.

## Implementado
- Chat amplo e adaptável para computador, iPad e telemóvel; na interface só aparece a LUMI AI.
- Conversas privadas e retomáveis, com lista de histórico e eliminação.
- Até 40 conversas e 100 mensagens por conversa em beta; contexto para o modelo limitado às últimas oito mensagens, com truncagem.
- Especialização no LUMI Builder: objetivo, raízes/capacidades, conectores, permissões, custos, segurança, testes e próximos passos.
- A biblioteca pessoal existente é opcional, desligada por defeito, e não alimenta treino.
- Limite existente de 20 tentativas de IA por dia continua em vigor.

## Ativação no telemóvel ou iPad
1. Abrir o novo ficheiro supabase/lumi-conversations.sql no GitHub.
2. Copiar tudo e executar em Supabase → SQL Editor → New query → Run. É uma migração ADICIONAL; não apaga tabelas anteriores.
3. Só depois integrar a PR e publicar na Vercel; abrir /dashboard?tab=ai.
4. Enviar mensagem e abrir Histórico para retomar ou eliminar a conversa.
5. Se houver aviso de falha a guardar, a resposta pode não estar disponível depois de fechar a página.

## Privacidade
- Row-level security (RLS) impede ler ou eliminar conversas de outras contas. Mensagens têm ligação composta ao dono da conversa.
- Histórico guardado no Supabase é usado como contexto da mesma conversa e é enviado ao fornecedor de inferência escolhido quando se gera uma resposta; respeitar a política do fornecedor.
- Não é utilizado para treinar o modelo LUMI nem para alimentar índices de descoberta externa.
- Não guardar segredos, chaves ou dados sensíveis no chat. A descrição textual de um bot não o instala ou executa.
- A aplicação valida limites, autenticação, ownership, consentimento para notas e quotas antes da chamada ao motor.

## Evolução: fábrica extensível de bots
1. Criar cenários fixos para avaliar planos de bot: Discord, WhatsApp, agenda, Twitch, vídeos e fluxos entre apps.
2. Medir correção das capacidades, dependências, autorizações, custos, testes e utilidade.
3. Consultar documentação de integrações e conteúdo externo com licenças e permissões adequadas, sem aprender com conversas privadas.
4. Comparar modelos para escolher custo/qualidade/latência por tarefa. Respostas de IAs comerciais não são automaticamente datasets de treino autorizados.
5. Propor novas raízes em branches com testes e revisão, nunca atualizações autónomas diretas em produção.
6. No futuro, ajustar um modelo de pesos disponíveis com dados licenciados, avaliações independentes e rollback.

A ideia de infinitos bots é um objetivo de escalabilidade; a beta atual ainda tem limites concretos de rascunhos e execução.

## Ficheiros
- supabase/lumi-conversations.sql
- app/api/ai/chat/route.ts
- app/api/ai/conversations/route.ts
- app/api/ai/conversations/[id]/route.ts
- lib/ai/router.ts
- app/dashboard/ai-router-panel.tsx
- app/globals.css
