# AI PM SaaS - Global Rules

## Regras de Negócio do Kanban
1. **Cascata de Status:** Se uma História de Usuário for para "Sprint", a Feature pai DEVE ir para "Em Execução".
2. **Fechamento de Feature:** Uma Feature só pode ir para "Done" se todas as suas histórias filhas estiverem em "Done".
3. **Idioma Obrigatório:** Todo o conteúdo gerado (PRD, Spec, BDD) deve ser redigido em Português do Brasil (PT-BR).

## Regras de Engenharia (Stack)
1. **Frontend (Vite + React):** Utilizar React funcional. O design system baseia-se em Glassmorphism e CSS Modules / Inline Styles (evitar Tailwind sem autorização explícita). Ícones sempre com `lucide-react`.
2. **Backend (Node.js/Express):** Manter a API RESTful e limpa em `server.js`. Todas as rotas (exceto login/registro) devem usar o middleware `authenticateToken`.
3. **Banco de Dados (Local/JSON):** Para desenvolvimento, o banco é o arquivo `database.json`. A manipulação dele deve sempre envolver `readDB()` e `writeDB()`.
