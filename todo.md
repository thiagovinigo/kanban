# AI PM SaaS (ScrumBan) - Validação de Produto e Roadmap

## 🎯 Visão Geral como Especialista de Produto
O sistema atual se posiciona como um **"Orquestrador de Requisitos para IA Autônoma"**, preenchendo a lacuna entre a área de negócios (ideias brutas) e a engenharia automatizada (Agentes Dev). Ao invés de focar em escrever código, o produto foca em **escrever contratos perfeitos** (PRDs, BDDs, TDDs).

### ✅ Prós (Vantagens Competitivas)
* **Shift-Left Automático:** A qualidade é garantida antes mesmo do código ser escrito, graças à geração automática de Critérios de Aceite em Gherkin e TDDs.
* **Fatiamento Vertical Inteligente:** A quebra de Épicos em Histórias de Usuário reduz drasticamente o trabalho cognitivo do Product Manager.
* **Integração Nativa com Git:** A ponte direta com repositórios transforma o Kanban em uma verdadeira "esteira de produção" para agentes autônomos externos (Copilot Workspace, Devin, etc).
* **Interface Visual Integrada:** Diferente de ferramentas puramente de chat, a interface ScrumBan (Kanban) oferece controle de estado visual robusto.

### ❌ Contras (Pontos de Atenção)
* **Comunicação Unidirecional (One-Way Sync):** O sistema envia demandas para o Git, mas ainda não "escuta" o que acontece lá. Se o agente externo fecha o PR, o Kanban não atualiza sozinho.
* **Arquitetura de Dados Temporária:** O uso de `database.json` é excelente para PoC/MVP, mas inviabiliza escalabilidade, concorrência e deploy multi-tenant em produção.
* **Gestão de Dependências:** O sistema ainda não mapeia visualmente ou bloqueia histórias que dependem de outras (Ex: "O Front-end de Login depende da API de Auth").

---

## 🚀 Roadmap de Novas Features (Baseado no Mercado)

### 1. Curto Prazo (Fechamento do Ciclo)
- [ ] **Webhook de Retorno (`/api/agent-hook`):** Criar um endpoint que escute Webhooks do GitHub. Quando o Agente Externo criar um Pull Request e passar nos testes, a história move automaticamente para `✅ Done`.
- [ ] **Chat Contextual por História:** Permitir que o usuário converse com a IA sobre um card específico para refinar apenas aquela história sem regerar tudo.

### 2. Médio Prazo (Escala e Governança)
- [ ] **Migração para Banco Relacional (Supabase/PostgreSQL):** Substituir o `database.json` por um banco de dados real para suportar múltiplos times e usuários simultâneos.
- [ ] **Painel de Métricas (DORA/Agile):** Gráficos de *Lead Time* (tempo desde a criação até o Done) e *Cycle Time* (tempo em Execução).
- [ ] **Grafo de Dependências:** Mostrar visualmente quais histórias bloqueiam quais.

### 3. Longo Prazo (Visão de Produto)
- [ ] **Multi-Agentes Personalizados:** Permitir que o usuário crie "Agentes Especialistas" no sistema (Ex: "Agente de Segurança", "Agente de SEO") que dão pitacos e aprovam o PRD antes de ir para a Sprint.
- [ ] **Estimativa Dinâmica (AI Planning Poker):** A IA sugere Story Points baseada no histórico de complexidade de entregas anteriores.
