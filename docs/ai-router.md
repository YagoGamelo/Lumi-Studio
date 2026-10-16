# LUMI AI Router (beta)

## O que está implementado
- Seleção de fornecedor de geração de **texto** entre OpenAI, Claude (Anthropic) e Gemini (Google).
- Preferências determinísticas por tarefa: conversa/planeamento (OpenAI), programação (Claude), resumos (Gemini); só seleciona fornecedores com chave presente.
- Integração em POST /api/bots/plan, com validação de capacidades e fallback gratuito por regras.
- GET /api/ai/providers e POST /api/ai/chat para o painel **LUMI IA**.
- Autenticação Supabase e limite atómico de 20 tentativas por utilizador por dia UTC (partilhado entre chat e planeamento).
- Timeout de 18 segundos, sem retries automáticos para evitar consumo duplicado.
- Nenhuma chave de API é enviada ao browser; as credenciais são usadas apenas no servidor.

## Ativar na Vercel (variáveis **privadas**, não usar prefixo NEXT_PUBLIC_)
Configura ao menos uma das variáveis:
- OPENAI_API_KEY (modelo opcional OPENAI_MODEL; por defeito gpt-4.1-mini)
- ANTHROPIC_API_KEY (modelo opcional ANTHROPIC_MODEL; por defeito claude-sonnet-4-6)
- GEMINI_API_KEY (modelo opcional GEMINI_MODEL; por defeito gemini-2.5-flash)
- LUMI_AI_DEFAULT_PROVIDER=openai|anthropic|gemini (opcional; afeta apenas a preferência da conversa).

Modelos/preços/permissões podem mudar. A presença da variável de ambiente só indica que está configurada: testa cada fornecedor separadamente no painel.

## Migração de Supabase obrigatória para chamadas de IA
Executa **supabase/ai-router.sql** em Supabase → SQL Editor. É uma migração **adicional**, não volta a executar schema.sql nem apaga tabelas. Cria contador diário com RLS e função RPC restrita por utilizador. Sem esta migração, as chamadas externas ficam bloqueadas, e o planeamento por regras mantém-se disponível.

## Exemplo
Na LUMI: Painel → LUMI IA → escolhe “Automática” e “Programar” → escreve o teu pedido. A LUMI escolhe Claude se configurado; caso contrário OpenAI ou Gemini. O resultado informa o fornecedor realmente escolhido.

O Universal Builder usa a mesma seleção com tarefa “plan” e continua a devolver árvores validadas de capacidades. Não executa as árvores; o motor local de rascunhos está numa PR separada.

## Limites e próximos passos
- **Suporta apenas texto** neste módulo: não dá acesso automático a edição de imagens, vídeos, pesquisa web, voz, WhatsApp, Twitch, TikTok nem operações sobre contas. Cada ação necessita do respetivo adaptador, credenciais, autorização e testes.
- Não é aprendizagem automática contínua, nem benchmark ao vivo: as preferências atuais são regras explícitas.
- Não existe fallback automático para outro fornecedor após uma falha (pode ter custos inesperados e divulgar pedidos adicionais).
- O limite de 20 tentativas controla chamadas da aplicação, **não constitui um teto monetário garantido**; configurar também limites e alertas de faturação nos fornecedores.
- Não guardar prompts/respostas no banco neste módulo. Tratar os dados enviados segundo as políticas de cada fornecedor.
- Antes de produção comercial: adicionar observabilidade segura, testes de carga, revisão de gastos e limites de faturação dos fornecedores.

Documentação oficial:
- https://platform.openai.com/docs/api-reference/chat
- https://docs.anthropic.com/en/api/messages
- https://ai.google.dev/api/generate-content
