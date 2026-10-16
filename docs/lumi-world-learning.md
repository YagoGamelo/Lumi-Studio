# LUMI Mundo — aprender com o exterior, não com conversas

## Objetivo
A LUMI AI deve descobrir informação de fontes externas autorizadas, verificar evidências, criar hipóteses, executar testes num ambiente seguro e propor melhorias. Conversas e notas pessoais não alimentam o treino. A biblioteca pessoal continua separada, opt-in e sem treino.

Separação fundamental:
1. Descoberta: referências e metadados.
2. Conhecimento fundamentado: conteúdo utilizável com permissão, proveniência, data e verificação.
3. Testes: experiências reproduzíveis, métricas, regressões e revisão.
4. Treino: atualização de pesos do modelo próprio, só com dados elegíveis e versões validadas.

## Implementado nesta primeira etapa
- Descoberta a partir de dois feeds RSS oficiais aprovados no código: arXiv cs.AI e NASA News.
- Worker agendado 1 vez/dia com CRON_SECRET e SUPABASE_SERVICE_ROLE_KEY, sem chamadas a IAs pagas.
- Guarda só título, URL e data, nunca vídeos, lives, áudio, artigos completos, conversas ou prompts.
- Até 12 publicações por fonte, 450 KB por feed, timeouts, domínios fixos e retenção de 60 dias.
- SQL com RLS: dados de fontes públicas só podem ser lidos por contas autenticadas; apenas worker escreve.
- Painel LUMI Mundo mostra ligações às fontes; no chat usa até quatro títulos relevantes como INDÍCIOS, nunca factos.
- A biblioteca pessoal da LUMI permanece desligada por defeito, sem treino.

## Ativação no iPad/telemóvel
1. Depois de rever e integrar esta PR, abrir supabase/lumi-world.sql no GitHub e executar como migração ADICIONAL no Supabase SQL Editor. Não substitui as anteriores.
2. Na Vercel, em Settings → Environment Variables, confirmar os segredos privados:
   - SUPABASE_SERVICE_ROLE_KEY: chave service_role do Supabase, apenas no servidor. Pode já estar configurada para o módulo de alertas.
   - CRON_SECRET: segredo aleatório de pelo menos 24 caracteres. Pode já existir no módulo de alertas. Vercel autentica os crons com esta variável.
   - NEXT_PUBLIC_SUPABASE_URL: já necessária para a aplicação.
3. Fazer Redeploy. vercel.json agenda uma consulta diária às 09:00 UTC. Não exige computador. Na versão gratuita verificar limites de agendamento e execução.
4. Painel → LUMI IA → LUMI Mundo: as descobertas aparecem após o primeiro ciclo agendado. Não se deve interpretar o título como prova de todo o artigo.

## Próximas fases ainda não implementadas
- YouTube: descoberta por YouTube Data API, com direitos e limites. Não descarregar vídeos/legendas indiscriminadamente nem fazer scraping; a API de download de legendas exige permissão de edição.
- Twitch: integração oficial Helix/EventSub e autorização; não é possível observar todas as lives de forma ilimitada.
- Web: apenas fontes cujas licenças/termos permitam recolha e utilização; cumprir robots, direitos, limites e privacidade.
- Comparação com OpenAI/Gemini/Claude: consultar para resolver tarefas dentro dos termos de uso; respostas comerciais não são um dataset livre para treinar concorrentes.
- Experiências: ambiente sandbox isolado, avaliações verificáveis, orçamentos e aprovação humana antes de alterar modelos, código ou raízes.
- Treino futuro: pesos abertos e datasets licenciados, controlo de versões, avaliações independentes, rollback, custos de GPU e análise jurídica.

## Limites honestos
Esta v1 não leu artigos completos, não vê vídeos e não altera pesos. Só indexa metadados e verifica domínios, formatos e duplicações. Não há autoaprendizagem nem testes cognitivos autónomos ainda.

Referências oficiais:
- https://github.com/arXiv/arxiv-docs/blob/develop/source/help/rss.md
- https://www.nasa.gov/rss-feeds/
- https://developers.google.com/youtube/terms/developer-policies
- https://developers.google.com/youtube/v3/docs/captions/download
- https://dev.twitch.tv/docs/
- https://digital-strategy.ec.europa.eu/en/faqs/guidelines-obligations-general-purpose-ai-providers
