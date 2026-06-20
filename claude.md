# AI PM SaaS - AI Developer Guidelines

Welcome, AI Developer! You are working on the **AI PM SaaS (ScrumBan)** project. This document serves as your context guide.

## 🏗 Architecture & Stack
- **Frontend:** React, Vite, `react-beautiful-dnd`, Lucide React, React Markdown.
- **Backend:** Node.js, Express, OpenAI API (for PRD/Spec generation), `simple-git`.
- **Database:** Flat JSON file (`database.json`) acting as a temporary document store.
- **Authentication:** Simple JWT based authentication (hardcoded secret for MVP).

## 🧠 Core Domain Concepts
1. **Demands/Ideas:** Raw text inputted by the user.
2. **Features (Epics):** The parent entity. Features go through `col-backlog` -> `col-pm-review` -> `col-wip` -> `col-done`.
3. **Cards (Stories):** The child entity. They belong to a Feature. They go through `col-backlog` -> `col-spec` -> `col-sprint` -> `col-dev` -> `col-done`.
4. **Sprints:** Packages of Stories that are exported as `.md` files to a GitHub repository to be picked up by External Autonomous Agents.

## 📜 Architectural Rules & Behaviors
- **Auto-Extraction:** When a PRD is generated for a Feature, the JSON response is parsed and Stories are automatically created in the backlog.
- **State Coupling:** If any story of a Feature moves to a sprint/dev column, the Feature automatically moves to `Em Execução`. If all stories move to `Done`, the Feature moves to `Done`.
- **AI Generation (Markdown vs JSON):** 
  - `prd_content` (Features) and `spec_content` (Stories) usually hold JSON data. 
  - When the Tech Lead/QA Agent generates the TDD/Spec, the backend **appends** the Markdown to the existing JSON string (it does not overwrite it). The frontend handles this hybrid string in `RefinementVisualizer.jsx`.
- **UI Consistency:** We rely on CSS Variables (`var(--accent-purple)`, `var(--bg-glass)`) for styling. Do not use Tailwind CSS. Maintain the "glassmorphism" aesthetic.

## 🤝 Next Priorities
Refer to `todo.md` for the product roadmap. The next major technical milestone is closing the loop by implementing the GitHub webhook receiver (`/api/agent-hook`) to automatically move cards based on external agent PR statuses.
