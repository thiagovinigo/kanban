---
name: kanban-state-management
description: Conhecimento especializado no gerenciamento de estado e cascatas de board do Kanban (ai-pm-saas).
---

# Kanban State Management Skill

- Quando atualizar um cartão no Kanban via Drag and Drop, atualize imediatamente o estado em memória (React) e garanta que as chamadas à API tratem os recálculos.
- Se a coluna (status) de uma história mudar para "Sprint" ou algo semelhante que indique execução, assegure-se de que a API (ou a lógica do DB) suba a Feature pai para "Em Andamento".
- O mesmo vale para conclusão: Feature só deve ir para "Done" ou equivalente se todos os filhos estiverem na última coluna.
