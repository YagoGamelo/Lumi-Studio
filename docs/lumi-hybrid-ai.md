# LUMI AI — arquitetura híbrida (primeira fase)

**LUMI AI** é a identidade e a experiência central do produto, não um modelo fundacional treinado de raiz. Usa um modelo escolhido e alojado pela LUMI (com pesos disponíveis), ou OpenAI/Claude/Gemini. A lógica de seleção, conhecimento opcional e limites pertencem à LUMI Studio.

## Já implementado
- Router com fornecedor lumi: endpoint privado HTTPS autenticado compatível com OpenAI /v1/chat/completions.
- A LUMI dá prioridade ao modelo próprio em conversa, planeamento e resumos, quando este estiver configurado; programação privilegia Claude/OpenAI. O utilizador pode escolher o motor.
- Identidade LUMI AI no painel independentemente da IA subjacente.
- Biblioteca privada por utilizador com Supabase RLS: adicionar, listar e eliminar até 50 notas.
- Consulta da biblioteca desligada por defeito; ao autorizar num pedido, seleciona até três notas por palavras-chave, nunca utilizadas para treino.
- Nenhum treino, instalação de modelos, execução externa ou expansão autónoma de raízes nesta PR.

## Servidor do modelo próprio
O Qwen3 4B disponibiliza pesos sob licença Apache 2.0 e pode ser executado com Ollama.

1. Instalar Ollama a partir de https://ollama.com/download num computador ou servidor com recursos suficientes.
2. Executar o comando: ollama pull qwen3:4b
3. Verificar localmente com: ollama run qwen3:4b
4. Implementar um gateway de inferência protegido por HTTPS, autenticação Bearer, limites de uso e firewall. NÃO expor diretamente a porta local 11434 do Ollama na internet — não dispõe de autenticação local.
5. Na Vercel, criar variáveis privadas (nunca NEXT_PUBLIC_):
   - LUMI_MODEL_BASE_URL = https://inferencia.exemplo.pt/v1 (endereço ilustrativo, não existe)
   - LUMI_MODEL_API_KEY = segredo de autenticação do gateway
   - LUMI_MODEL_ID = qwen3:4b
   - LUMI_AI_DEFAULT_PROVIDER = lumi (opcional)
6. Voltar a publicar a app e testar pelo Painel → LUMI AI.

A URL exige HTTPS, path /v1, nome de host público, sem porta personalizada e sem credenciais embutidas. Não pode ser fornecida por pedidos dos visitantes. O modelo NÃO corre dentro do site Vercel. Alojar um modelo próprio pode ter custos de hardware, GPU, eletricidade e largura de banda.

## Ativar biblioteca privada
1. Abrir o ficheiro adicional supabase/lumi-knowledge.sql nesta PR.
2. Copiá-lo para Supabase → SQL Editor → New query → Run. Não elimina nem substitui as migrações antigas.
3. Guardar uma nota no painel LUMI AI.
4. Ativar explicitamente a caixa "Consultar notas relevantes da minha biblioteca neste pedido" quando desejar enviar excertos ao modelo selecionado.
5. Eliminar as notas que já não sejam necessárias. As conversas não são usadas para alimentar a biblioteca automaticamente.

As notas são tratadas como dados não confiáveis, não como instruções da IA. Não guardar segredos. Mesmo notas privadas podem ser enviadas à IA externa escolhida SE o utilizador autorizar a consulta.

## Custos, segurança e limitações
- Mantém limite de 20 tentativas de IA por utilizador/dia via migração anterior supabase/ai-router.sql. Não é teto monetário real.
- Chave configurada não garante acesso ou créditos. Se o motor falhar não há fallback automático para evitar custos e partilhas inesperadas.
- Não copia conhecimentos internos dos modelos comerciais nem faz treino autónomo.
- Novas ferramentas e raízes deverão passar por proposta, testes e revisão antes de serem ativadas.
- PR #11 (motor de rascunhos) e PR #12 (catálogo de evolução) permanecem independentes desta alteração.

## Referências
- https://ollama.com/library/qwen3
- https://github.com/ollama/ollama/blob/main/docs/api/openai-compatibility.mdx
- https://github.com/ollama/ollama/blob/main/docs/api/authentication.mdx
- https://huggingface.co/Qwen/Qwen3-4B
