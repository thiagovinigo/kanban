import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import OpenAI from 'openai';
import multer from 'multer';
import mammoth from 'mammoth';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config({ path: '.env.local' });

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-local-key';
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// OpenAI Init
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Database JSON Handler
const DB_FILE = './database.json';

const GLOBAL_HUB_DATA = {
  projects: [],
  features: [],
  cards: [],
  users: [],
  agents: [
    { id: 'scrum-master', title: 'Scrum Master Bot', description: 'Facilita cerimônias, remove impedimentos e garante regras do Kanban.' },
    { id: 'po-copilot', title: 'Product Owner Copilot', description: 'Fatia épicos, escreve critérios de aceite claros.' },
    { id: 'flow-metrics', title: 'Flow Metrics AI', description: 'Analisa o fluxo, bloqueios e prevê prazos usando throughput.' },
    { id: 'code-architect', title: 'Code Architect', description: 'Pensa na arquitetura do sistema, design patterns e infraestrutura.' },
    { id: 'code-reviewer', title: 'Code Reviewer', description: 'Garante que o código está limpo, coberto por testes e seguindo SOLID.' },
    { id: 'qa-engineer', title: 'QA Engineer', description: 'Cria planos de teste, valida BDD e encontra corner-cases.' }
  ],
  skills: [
    { id: 'react', title: 'React Expert', description: 'Hooks, Context, Componentização, Vite.' },
    { id: 'nodejs', title: 'Node.js Backend', description: 'Express, API REST, Integrações.' },
    { id: 'clean-code', title: 'Clean Code & TDD', description: 'Uncle Bob, Testes unitários com Jest/Vitest.' }
  ],
  mcps: [
    { id: 'mcp-github', title: 'GitHub', description: 'Lê repositórios, cria branches e faz commits.', config: 'npx -y @modelcontextprotocol/server-github' },
    { id: 'mcp-tfs', title: 'Azure DevOps', description: 'Acesso a repos e boards do TFS.', config: 'npx -y @microsoft/azure-devops-mcp' }
  ]
};

async function initDB() {
  try {
    await fs.access(DB_FILE);
  } catch (error) {
    await fs.writeFile(DB_FILE, JSON.stringify(GLOBAL_HUB_DATA, null, 2));
    console.log("📦 JSON Database initialized with Global Hub Data.");
  }
}
initDB();

async function readDB() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    let db = JSON.parse(data);
    
    let modified = false;
    if (!db.agents) { db.agents = GLOBAL_HUB_DATA.agents; modified = true; }
    if (!db.skills) { db.skills = GLOBAL_HUB_DATA.skills; modified = true; }
    if (!db.mcps) { db.mcps = GLOBAL_HUB_DATA.mcps; modified = true; }
    if (!db.users) { db.users = []; modified = true; }
    if (modified) await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    
    return db;
  } catch (err) {
    await fs.writeFile(DB_FILE, JSON.stringify(GLOBAL_HUB_DATA, null, 2));
    return GLOBAL_HUB_DATA;
  }
}

async function writeDB(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

// Middleware de Autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- HUB ROUTES ---
app.get('/api/hub', authenticateToken, async (req, res) => {
  const db = await readDB();
  res.json({
    agents: db.agents,
    skills: db.skills,
    mcps: db.mcps
  });
});

// Autenticação - Cadastro
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  const db = await readDB();
  
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email já cadastrado.' });
  }

  const newUser = { id: Date.now().toString(), email, password };
  db.users.push(newUser);
  await writeDB(db);

  const token = jwt.sign({ id: newUser.id, email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: newUser.id, email } });
});

// Autenticação - Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const db = await readDB();
  
  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(400).json({ error: 'Email ou senha inválidos.' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email } });
});

// Checar sessão
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const db = await readDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.sendStatus(404);
  res.json({ user: { id: user.id, email: user.email } });
});

// Listar Projetos
app.get('/api/projects', authenticateToken, async (req, res) => {
  const db = await readDB();
  const userProjects = db.projects.filter(p => p.user_id === req.user.id);
  res.json({ projects: userProjects });
});

// Criar Projeto
app.post('/api/projects', authenticateToken, async (req, res) => {
  const { name, git_repo, git_token, phase_configurations } = req.body;
  if (!name) return res.status(400).json({ error: 'O nome do projeto é obrigatório.' });

  const db = await readDB();
  const newProject = {
    id: Date.now().toString(),
    user_id: req.user.id,
    name,
    git_repo: git_repo || '',
    git_token: git_token || '',
    created_at: new Date().toISOString(),
    phase_configurations: phase_configurations || {
      features: { agents: ['po-copilot', 'code-architect'], skills: [] },
      stories: { agents: ['scrum-master'], skills: [] },
      development: { agents: ['code-architect'], skills: ['react', 'nodejs', 'clean-code'] },
      security: { agents: ['security-auditor'], skills: [] },
      qa: { agents: ['qa-engineer'], skills: [] }
    }
  };
  
  db.projects.push(newProject);
  await writeDB(db);
  res.json({ project: newProject });
});

// Obter Projeto
app.get('/api/projects/:id', authenticateToken, async (req, res) => {
  const db = await readDB();
  const project = db.projects.find(p => p.id === req.params.id && p.user_id === req.user.id);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
  res.json({ project });
});

// Atualizar Projeto
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
  const db = await readDB();
  const index = db.projects.findIndex(p => p.id === req.params.id && p.user_id === req.user.id);
  if (index === -1) return res.status(404).json({ error: 'Projeto não encontrado.' });
  
  db.projects[index] = { ...db.projects[index], ...req.body };
  await writeDB(db);
  res.json({ project: db.projects[index] });
});

// --- FEATURES ---
app.get('/api/features', authenticateToken, async (req, res) => {
  const { project_id } = req.query;
  const db = await readDB();
  const features = db.features.filter(f => f.project_id === project_id);
  res.json({ features });
});

app.post('/api/features', authenticateToken, async (req, res) => {
  const { project_id, title, description, column_id, tags } = req.body;
  const db = await readDB();
  
  const projectFeatures = db.features.filter(f => f.project_id === project_id);
  const maxFeatNumber = projectFeatures.reduce((max, f) => {
    if (f.tag && f.tag.startsWith('FEAT-')) {
      const num = parseInt(f.tag.split('-')[1]);
      return num > max ? num : max;
    }
    return max;
  }, 0);
  const newTag = `FEAT-${maxFeatNumber + 1}`;

  const newFeature = {
    id: Date.now().toString(),
    project_id,
    tag: newTag,
    title,
    description: description || '',
    column_id: column_id || 'col-backlog',
    tags: tags || [],
    prd_content: null,
    created_at: new Date().toISOString()
  };
  
  db.features.push(newFeature);
  await writeDB(db);
  res.json({ feature: newFeature });
});

app.put('/api/features/:id', authenticateToken, async (req, res) => {
  const db = await readDB();
  const index = db.features.findIndex(f => f.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Feature não encontrada.' });
  
  db.features[index] = { ...db.features[index], ...req.body };
  await writeDB(db);
  res.json({ feature: db.features[index] });
});

// --- CARDS (HISTÓRIAS) ---
app.get('/api/cards', authenticateToken, async (req, res) => {
  const { project_id } = req.query;
  const db = await readDB();
  const projectFeatures = db.features.filter(f => f.project_id === project_id).map(f => f.id);
  const cards = db.cards.filter(c => projectFeatures.includes(c.feature_id));
  res.json({ cards });
});

app.post('/api/cards', authenticateToken, async (req, res) => {
  const { feature_id, title, description, column_id, spec_content } = req.body;
  const db = await readDB();
  
  const feature = db.features.find(f => f.id === feature_id);
  const project_id = feature ? feature.project_id : null;
  
  let newTag = `US-${Date.now().toString().slice(-4)}`; // fallback
  if (project_id) {
    const projectFeatures = db.features.filter(f => f.project_id === project_id).map(f => f.id);
    const projectCards = db.cards.filter(c => projectFeatures.includes(c.feature_id));
    const maxUsNumber = projectCards.reduce((max, c) => {
      if (c.tag && c.tag.startsWith('US-')) {
        const num = parseInt(c.tag.split('-')[1]);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    newTag = `US-${maxUsNumber + 1}`;
  }

  const newCard = {
    id: Date.now().toString(),
    feature_id,
    tag: newTag,
    title,
    description: description || '',
    column_id: column_id || 'col-backlog',
    spec_content: spec_content || null,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  
  db.cards.push(newCard);
  await writeDB(db);
  res.json({ card: newCard });
});

app.put('/api/cards/:id', authenticateToken, async (req, res) => {
  const db = await readDB();
  const index = db.cards.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Card não encontrado.' });
  
  db.cards[index] = { ...db.cards[index], ...req.body };
  await writeDB(db);
  res.json({ card: db.cards[index] });
});

// --- AI ROUTES ---
app.post('/api/ai/roadmap', authenticateToken, async (req, res) => {
  if (!openai) return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no servidor.' });
  const { project_id } = req.body;
  
  const db = await readDB();
  const project = db.projects.find(p => p.id === project_id);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
  
  const features = db.features.filter(f => f.project_id === project_id);
  
  try {
    const prompt = `Atue como um Head de Produto (CPO). Analise o projeto "${project.name}" que possui os seguintes épicos/features:
${features.map(f => `- ${f.title}`).join('\n')}

Seu objetivo é criar um Roadmap Estratégico (Now, Next, Later) em formato Markdown. 
Organize logicamente o que deve ser feito primeiro (Now), o que vem em seguida (Next), e o que fica pro futuro (Later). 
Use um tom profissional. Leve em conta também o contexto técnico (Plugins/MCP): ${project.plugins || 'Nenhum'}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }]
    });

    const roadmapContent = completion.choices[0].message.content;
    
    const index = db.projects.findIndex(p => p.id === project_id);
    db.projects[index].roadmap_content = roadmapContent;
    await writeDB(db);

    res.json({ roadmap: roadmapContent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao gerar o Roadmap com a IA.' });
  }
});

app.post('/api/ai/prd', authenticateToken, async (req, res) => {
  if (!openai) return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no servidor.' });
  const { feature_id } = req.body;
  
  const db = await readDB();
  const feature = db.features.find(f => f.id === feature_id);
  if (!feature) return res.status(404).json({ error: 'Feature não encontrada.' });
  
  const project = db.projects.find(p => p.id === feature.project_id);

  const config = project.phase_configurations?.features || { agents: [], skills: [] };
  const selectedAgents = (config.agents || []).map(id => db.agents?.find(a => a.id === id)).filter(Boolean).map(a => `- ${a.title}: ${a.description}`).join('\n');
  const selectedSkills = (config.skills || []).map(id => db.skills?.find(a => a.id === id)).filter(Boolean).map(a => `- ${a.title}: ${a.description}`).join('\n');

  try {
    const existingCards = db.cards.filter(c => c.feature_id === feature_id);
    const existingCardsStr = existingCards.length > 0 ? `\n\nHistórias Existentes para esta Feature:\n${existingCards.map(c => `ID: ${c.id} | Título: ${c.title} | Contexto: ${c.description}`).join(`\n`)}\nIMPORTANTE: As histórias acima provavelmente são rascunhos ou placeholders muito amplos. Você DEVE obrigatoriamente quebrar a Feature em múltiplas histórias menores. Você PODE usar o "card_id" de uma história existente no seu array "refinedStories" para atualizá-la (cobrindo uma parte do fluxo), mas você DEVE gerar novas histórias ADICIONAIS (com card_id: null) para cobrir o restante do escopo que foi extraído na sua Análise de Divisão.` : "";

    const prompt = `**Role:** Especialista em Gestão de Produtos Avançada, Análise de Requisitos, Escrita de User Stories, Planejamento Técnico e Organização de Backlog.
**Task:** Analisar a Feature e dividi-la em User Stories menores e mais gerenciáveis. Você DEVE extrair DE FORMA EXAUSTIVA E COMPLETA TODAS as User Stories necessárias para cobrir a Feature de ponta a ponta. Não pule nenhum fluxo de sucesso, fluxo de erro, tratamento de exceção ou configuração necessária para que a feature funcione perfeitamente. Para cada User Story, gere uma estrutura completa: visão do usuário, narrativa de negócio, Critérios de Aceite (BDD), resumo, cenários de teste em três níveis, estimativa, detalhamento das tasks de desenvolvimento, análise de riscos e considerações.

Feature: "${feature.title}"
Contexto do Projeto: ${project.name}
${project.project_context ? `\nInformações Globais e Restrições do Projeto:\n${project.project_context}\n` : ''}${existingCardsStr}

Agentes Especialistas Ativados:
${selectedAgents || 'Nenhum'}

Skills Técnicas Ativadas:
${selectedSkills || 'Nenhuma'}

**REGRAS:**
1. **Avaliação e Divisão:** Preencha 'divisionAnalysis' justificando a quebra exaustiva da feature.
2. **Formatação BDD:** Critérios de Aceite estritamente em Gherkin.
3. **IDIOMA OBRIGATÓRIO:** Toda a sua resposta, explicações e textos gerados DEVEM estar estritamente em PORTUGUÊS DO BRASIL (PT-BR).
4. **Cenários de Teste:** Níveis E2E (Cypress), Integração e Unitário.
5. **Análise de Riscos:** 'type' (Técnico, Negócio, Usabilidade, Compliance, Rollout), 'severity' (baixa, média, alta) e mitigação.
6. **Estimativas:** TODAS as estimativas (de histórias e de tasks) devem ser dadas obrigatoriamente em HORAS (ex: "4h", "8h", "16h") e NÃO em story points.
7. **Formato:** Responda SEMPRE em português e estritamente no JSON SCHEMA abaixo.

**JSON SCHEMA OBRIGATÓRIO:**
{
  "divisionAnalysis": "string",
  "refinedStories": [
    {
      "card_id": "string (ID existente ou nulo se for nova)",
      "title": "string",
      "epicSuggestion": "string",
      "featureSuggestion": "string",
      "userPersona": "string",
      "businessNarrative": "string",
      "interfaceDetails": "string",
      "acceptanceCriteria": "string (formato Gherkin)",
      "acceptanceCriteriaSummary": "string (bullet list)",
      "testScenarios": {
        "e2e": "string",
        "integration": "string",
        "unit": "string"
      },
      "storyEstimate": "string (Ex: 8h)",
      "storyEstimateJustification": "string",
      "tasksTotalEstimate": "string (Ex: 8h)",
      "developmentTasks": [
        {
          "name": "string",
          "responsibility": "string",
          "description": "string",
          "justification": "string",
          "estimate": "string (Ex: 2h)",
          "technicalJustification": "string"
        }
      ],
      "questions": ["string"],
      "potentialEdgeCases": ["string"],
      "technicalConsiderations": ["string"],
      "identifiedDependencies": ["string"],
      "riskAnalysis": [
        {
          "type": "Técnico|Negócio|Usabilidade|Compliance|Rollout",
          "severity": "baixa|média|alta",
          "description": "string",
          "mitigationSuggestion": "string"
        }
      ]
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const prdContent = completion.choices[0].message.content;
    
    const index = db.features.findIndex(f => f.id === feature_id);
    db.features[index].prd_content = prdContent;
    await writeDB(db);

    res.json({ prd_content: prdContent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao gerar o PRD.' });
  }
});

app.post('/api/ai/spec', authenticateToken, async (req, res) => {
  if (!openai) return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no servidor.' });
  const { card_id } = req.body;
  
  const db = await readDB();
  const card = db.cards.find(c => c.id === card_id);
  if (!card) return res.status(404).json({ error: 'Card não encontrado.' });
  
  const feature = db.features.find(f => f.id === card.feature_id);
  const project = db.projects.find(p => p.id === feature.project_id);

  const devConfig = project.phase_configurations?.development || { agents: [], skills: [] };
  const secConfig = project.phase_configurations?.security || { agents: [], skills: [] };
  const qaConfig = project.phase_configurations?.qa || { agents: [], skills: [] };
  
  const allAgents = [...(devConfig.agents||[]), ...(secConfig.agents||[]), ...(qaConfig.agents||[])];
  const allSkills = [...(devConfig.skills||[]), ...(secConfig.skills||[]), ...(qaConfig.skills||[])];

  const selectedAgents = allAgents.map(id => db.agents?.find(a => a.id === id)).filter(Boolean).map(a => `- ${a.title}: ${a.description}`).join('\n');
  const selectedSkills = allSkills.map(id => db.skills?.find(a => a.id === id)).filter(Boolean).map(a => `- ${a.title}: ${a.description}`).join('\n');

  try {
    const prompt = `Atue como um Tech Lead / Arquiteto de Software.
Você precisa gerar uma Especificação Técnica + Casos de Teste (TDD) para a História de Usuário: "${card.title}".
A história pertence ao Épico: "${feature.title}".
Contexto Global do Projeto:
${project.project_context ? project.project_context + '\n' : '(Não fornecido)\n'}
Aqui está o PRD do Épico para contexto:
${feature.prd_content ? feature.prd_content.substring(0, 1000) + '...' : '(Vazio)'}

Agentes de Engenharia e QA Ativados:
${selectedAgents || 'Nenhum'}

Padrões de Código e Skills:
${selectedSkills || 'Nenhuma'}

Estrutura da Especificação (em Markdown):
1. **Visão Técnica da História**
2. **Modelagem de Dados / API**
3. **Comportamento Esperado (BDD / Gherkin)**
4. **Casos de Teste TDD (O que um agente autônomo deve testar)**

Retorne APENAS o Markdown.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }]
    });

    const specContent = completion.choices[0].message.content;
    
    const index = db.cards.findIndex(c => c.id === card_id);
    let newSpecContent = specContent;
    
    // Se já houver um spec_content em JSON, anexar o Markdown ao invés de sobrescrever
    const existingSpec = db.cards[index].spec_content;
    if (existingSpec && existingSpec.trim().startsWith('{')) {
      const match = existingSpec.match(/^(\{[\s\S]*?\})/);
      const jsonPart = match ? match[1] : existingSpec;
      newSpecContent = jsonPart + "\n\n### Especificação Técnica e TDD\n\n" + specContent;
    }
    
    db.cards[index].spec_content = newSpecContent;
    await writeDB(db);

    res.json({ spec_content: newSpecContent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao gerar a Spec/TDD.' });
  }
});

app.post('/api/ai/extract-features', authenticateToken, async (req, res) => {
  if (!openai) return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no servidor.' });
  const { document_text } = req.body;

  try {
    const prompt = `Atue como um Product Manager. Analise o seguinte documento de escopo/requisitos e extraia as principais Features/Épicos necessários para o projeto.
Retorne APENAS um JSON válido contendo um objeto com uma propriedade 'features' que é um array de objetos, onde cada objeto tem 'title' e 'description'. Exemplo:
{
  "features": [
    { "title": "Autenticação de Usuários", "description": "Login com email, senha e Google." }
  ]
}

DOCUMENTO:
${document_text.substring(0, 15000)}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json({ result: result.features });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao extrair features do documento.' });
  }
});

// Upload Document for Context
app.post('/api/upload-context', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

  try {
    let text = '';
    const ext = req.file.originalname.split('.').pop().toLowerCase();

    if (ext === 'pdf') {
      const pdfData = await pdfParse(req.file.buffer);
      text = pdfData.text;
    } else if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    } else {
      text = req.file.buffer.toString('utf-8');
    }

    res.json({ text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao processar arquivo.' });
  }
});

// Suggest Features based on Context
app.post('/api/ai/suggest-features', authenticateToken, async (req, res) => {
  if (!openai) return res.status(500).json({ error: 'OPENAI_API_KEY não configurada.' });
  const { project_id } = req.body;

  try {
    const db = await readDB();
    const project = db.projects.find(p => p.id === project_id);
    
    if (!project || !project.project_context) {
      return res.status(400).json({ error: 'Projeto sem contexto global definido.' });
    }

    const projectFeatures = db.features.filter(f => f.project_id === project_id);
    const existingFeaturesList = projectFeatures.map(f => `- ${f.title}`).join('\n');

    const config = project.phase_configurations?.features || { agents: [], skills: [] };
    const selectedAgents = (config.agents || []).map(id => db.agents?.find(a => a.id === id)).filter(Boolean).map(a => `- ${a.title}: ${a.description}`).join('\n');

    const prompt = `Você é um Agente PM (Product Manager) sênior.
Leia o Contexto Global do Projeto abaixo e sugira uma lista de Épicos e Features essenciais para começar a construir o sistema.
Não seja genérico. Gere itens específicos e baseados nas regras e contexto passados.

Agentes Especialistas Ativados nesta fase:
${selectedAgents || 'Nenhum'}

Contexto Global do Projeto:
${project.project_context}

IMPORTANTE: O projeto já possui as seguintes features criadas:
${existingFeaturesList || 'Nenhuma feature criada ainda.'}

ATUAÇÃO COMO AGENTE DE PREVENÇÃO DE DUPLICATAS:
Você NÃO deve sugerir features que já existam na lista acima, nem features com escopo sobreposto.

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "suggestedFeatures": [
    {
      "title": "string (Título claro da feature ou épico)",
      "description": "string (Narrativa de negócio curta justificando a feature)"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }]
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao sugerir features com IA.' });
  }
});

// Agente PO: Sugerir Histórias
app.post('/api/ai/po-suggest', authenticateToken, async (req, res) => {
  if (!openai) return res.status(500).json({ error: 'OPENAI_API_KEY não configurada.' });
  const { project_id } = req.body;

  try {
    const db = await readDB();
    const project = db.projects.find(p => p.id === project_id);
    
    if (!project || !project.project_context) {
      return res.status(400).json({ error: 'Projeto sem contexto global definido.' });
    }

    const projectFeatures = db.features.filter(f => f.project_id === project_id);
    const featureIds = projectFeatures.map(f => f.id);
    const projectCards = db.cards.filter(c => featureIds.includes(c.feature_id) && ['col-backlog', 'col-spec'].includes(c.column_id));
    
    const config = project.phase_configurations?.stories || { agents: [], skills: [] };
    const selectedAgents = (config.agents || []).map(id => db.agents?.find(a => a.id === id)).filter(Boolean).map(a => `- ${a.title}: ${a.description}`).join('\n');

    const prompt = `Você é o Agente PO (Product Owner).
Sua missão é ler o Contexto Global do Projeto, a lista de Features criadas, e o Backlog de Histórias atual, e verificar se FALTA alguma história importante.
Não sugira histórias que já foram criadas ou que cobrem o mesmo escopo. Retorne um array vazio se não faltar nada.

Contexto Global:
${project.project_context}

Features Atuais:
${projectFeatures.map(f => `- [${f.id}] ${f.title}`).join('\n') || 'Nenhuma feature'}

Histórias Atuais no Backlog:
${projectCards.map(c => `- ${c.title} (Feature Pai: ${c.feature_id})`).join('\n') || 'Nenhuma história'}

Agentes de Apoio:
${selectedAgents || 'Nenhum'}

Se faltarem histórias, sugira-as associando-as ao ID de uma Feature Pai existente (ou null se for solta).
Retorne APENAS JSON válido nesta estrutura:
{
  "suggestedStories": [
    {
      "feature_id": "string (id da feature pai correspondente)",
      "title": "string (Título da história. Ex: Como usuário...)",
      "description": "string (Narrativa e regras de negócio da história)"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }]
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao sugerir histórias com Agente PO.' });
  }
});

// Agente QA: Enriquecer Cenários de Teste
app.post('/api/ai/qa-enrich', authenticateToken, async (req, res) => {
  if (!openai) return res.status(500).json({ error: 'OPENAI_API_KEY não configurada.' });
  const { project_id } = req.body;

  try {
    const db = await readDB();
    const project = db.projects.find(p => p.id === project_id);
    
    if (!project) {
      return res.status(400).json({ error: 'Projeto não encontrado.' });
    }

    const projectFeatures = db.features.filter(f => f.project_id === project_id);
    const featureIds = projectFeatures.map(f => f.id);
    const projectCards = db.cards.filter(c => featureIds.includes(c.feature_id) && ['col-backlog', 'col-spec'].includes(c.column_id));
    
    if (projectCards.length === 0) {
      return res.json({ enrichedStoriesCount: 0, message: "Nenhuma história para enriquecer." });
    }

    const config = project.phase_configurations?.qa || { agents: [], skills: [] };
    const selectedAgents = (config.agents || []).map(id => db.agents?.find(a => a.id === id)).filter(Boolean).map(a => `- ${a.title}: ${a.description}`).join('\n');

    // Mapear apenas histórias que precisam de QA ou não tem cenários completos
    const cardsToEnrich = projectCards.filter(c => !c.spec_content || !c.spec_content.includes('Cenários de Teste')); // Ou podemos mandar tudo. Para não quebrar token limit, vamos fazer lote ou pedir um patch JSON.
    // Como a instrução é "verificar todos os cenários e incrementá-las", vamos fazer um loop ou enviar até X histórias.
    
    // Para simplificar e evitar exceder limite de tokens:
    // Retornaremos um JSON pedindo para atualizar cenários em lote, ou apenas processaremos 5 histórias por vez.
    const prompt = `Você é o Agente QA (Engenheiro de Qualidade).
Sua missão é revisar o backlog de histórias abaixo e garantir que tenham Cenários de Teste (E2E, Integração e Unitário) abrangentes.
Apenas forneça os cenários de teste incrementados para as histórias.

Histórias:
${projectCards.map(c => `ID: ${c.id}\nTítulo: ${c.title}\nDescrição: ${c.description || 'Nenhuma'}`).join('\n---\n')}

Agentes de Apoio:
${selectedAgents || 'Nenhum'}

Retorne JSON no formato:
{
  "enrichedStories": [
    {
      "id": "string (ID da história)",
      "testScenarios": "string (Formato Markdown contendo E2E, Integração e Unitários)"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }]
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    // Atualiza os cards no DB
    let count = 0;
    if (result.enrichedStories) {
      for (const update of result.enrichedStories) {
        const idx = db.cards.findIndex(c => c.id === update.id);
        if (idx !== -1) {
          // Se não existir spec_content, cria. Senão, anexa os testes.
          if (!db.cards[idx].spec_content) {
            db.cards[idx].spec_content = "### Cenários de Teste (Agente QA)\n\n" + update.testScenarios;
          } else {
            let currentSpec = db.cards[idx].spec_content;
            
            // Tenta ver se é um JSON. Se for, insere direto no JSON para não quebrar a UI rica.
            try {
              let parsed = JSON.parse(currentSpec);
              if (parsed && typeof parsed === 'object') {
                // If it's wrapped in refinedStories
                if (parsed.refinedStories && parsed.refinedStories.length > 0) {
                  parsed.refinedStories[0].qaTestScenarios = update.testScenarios;
                } else {
                  // It's a single story JSON
                  parsed.qaTestScenarios = update.testScenarios;
                }
                currentSpec = JSON.stringify(parsed);
              }
            } catch (e) {
              // Já é string normal / markdown. Verifica se misturou JSON quebrado (legado)
              const match = currentSpec.match(/^(\{[\s\S]*?\})\s*(###[\s\S]*)$/);
              if (match) {
                try {
                  const p = JSON.parse(match[1]);
                  if (p.refinedStories && p.refinedStories.length > 0) {
                    p.refinedStories[0].qaTestScenarios = match[2] + "\n\n" + update.testScenarios;
                  } else {
                    p.qaTestScenarios = match[2] + "\n\n" + update.testScenarios;
                  }
                  currentSpec = JSON.stringify(p);
                } catch(err2) {}
              } else {
                // Puramente markdown
                if (!currentSpec.includes(update.testScenarios)) {
                  currentSpec += "\n\n### Cenários de Teste Incrementados (Agente QA)\n\n" + update.testScenarios;
                }
              }
            }

            db.cards[idx].spec_content = currentSpec;
          }
          count++;
        }
      }
      await writeDB(db);
    }

    res.json({ enrichedStoriesCount: count, message: "Cenários atualizados com sucesso." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao enriquecer testes com Agente QA.' });
  }
});

// Suggest Architecture based on Context
app.post('/api/ai/suggest-architecture', authenticateToken, async (req, res) => {
  if (!openai) return res.status(500).json({ error: 'OPENAI_API_KEY não configurada.' });
  const { project_id } = req.body;

  try {
    const db = await readDB();
    const project = db.projects.find(p => p.id === project_id);
    
    if (!project || !project.project_context) {
      return res.status(400).json({ error: 'Projeto sem contexto global definido.' });
    }

    const projectFeatures = db.features.filter(f => f.project_id === project_id);
    const existingFeaturesList = projectFeatures.map(f => `- ${f.title}`).join('\n');

    const prompt = `Você é um Arquiteto de Software sênior, especialista em cloud, segurança e design de sistemas.
Leia o Contexto Global do Projeto abaixo e sugira uma lista de Épicos ou Features Técnicas/Arquiteturais (ex: Configuração de CI/CD, Modelagem de Banco, Autenticação JWT, Regras de Segurança, Provisionamento Cloud) que são fundamentais para viabilizar este projeto.
Não sugira features de negócio puras (ex: "Tela de Login" ou "Carrinho"), mas sim fundações de arquitetura.

Contexto Global do Projeto:
${project.project_context}

IMPORTANTE: O projeto já possui as seguintes features (técnicas ou não) criadas:
${existingFeaturesList || 'Nenhuma feature criada ainda.'}

ATUAÇÃO COMO AGENTE DE ANÁLISE INCREMENTAL E PREVENÇÃO DE DUPLICATAS:
Analise as features já existentes. Se o projeto já possuir as fundações arquiteturais necessárias (ou se não houver contexto/features suficientes para justificar novas adições técnicas), você DEVE retornar uma lista vazia "[]" no JSON.
Você NÃO deve sugerir features que já existam na lista acima, nem features com escopo sobreposto. Só gere novas features se elas forem uma real adição necessária.

REGRAS DE FORMATAÇÃO:
NÃO inclua nenhum tipo de prefixo, tag, rótulo ou colchetes no título da feature (exemplo: NÃO use "[Arq]", "[Arquitetura]", "Feature Técnica:", etc). Retorne apenas o nome direto da feature.

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "features": [
    {
      "title": "string (Ex: Configuração de CI/CD Pipeline)",
      "description": "string (Narrativa técnica justificando essa feature arquitetural para o projeto)"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }]
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao sugerir arquitetura com IA.' });
  }
});

app.post('/api/ai/validate-story', authenticateToken, async (req, res) => {
  if (!openai) return res.status(500).json({ error: 'OPENAI_API_KEY não configurada.' });
  const { title, description, project_id } = req.body;

  try {
    const db = await readDB();
    const project = project_id ? db.projects.find(p => p.id === project_id) : null;
    const projectContextStr = project?.project_context ? `\nContexto do Projeto:\n${project.project_context}\n` : '';

    let existingStoriesStr = '';
    if (project_id) {
      const projectFeatures = db.features.filter(f => f.project_id === project_id).map(f => f.id);
      const projectCards = db.cards.filter(c => projectFeatures.includes(c.feature_id));
      existingStoriesStr = projectCards.map(c => `- [${c.tag || 'US'}] ${c.title}`).join('\n');
    }

    const prompt = `**Role:** Especialista em Gestão de Produtos Avançada e Engenharia de Software.
**Task:** Avaliar, validar e refinar a seguinte História de Usuário recém-adicionada.
Título: ${title}
Descrição: ${description}
${projectContextStr}

**IMPORTANTE: O projeto já possui as seguintes histórias criadas:**
${existingStoriesStr || 'Nenhuma história criada ainda.'}

**ATUAÇÃO COMO AGENTE DE PREVENÇÃO DE DUPLICATAS:**
Você deve verificar se a história enviada acima (Título/Descrição) NÃO é uma duplicata exata ou uma variação óbvia de alguma das histórias que já existem no projeto. Se for duplicada, retorne "isValid": false e explique no "feedback" que a história já existe e não deve ser criada.

**REGRAS:**
1. **Validação e Duplicidade:** Se for duplicada ou não fizer sentido, "isValid": false e explique no feedback.
2. **Formatação BDD:** Critérios de Aceite estritamente em Gherkin.
3. **Cenários de Teste:** Níveis E2E (Cypress), Integração e Unitário.
4. **Análise de Riscos:** 'type' (Técnico, Negócio, Usabilidade, Compliance, Rollout), 'severity' (baixa, média, alta) e mitigação.
5. **Estimativas:** TODAS as estimativas devem ser dadas obrigatoriamente em HORAS (ex: "4h", "8h", "16h") e NÃO em story points.
6. **Formato:** Responda SEMPRE em português e estritamente no JSON SCHEMA abaixo.

**JSON SCHEMA OBRIGATÓRIO:**
{
  "isValid": true|false,
  "feedback": "Um parágrafo de feedback sobre a escrita da história.",
  "refinedData": {
    "refinedStories": [
      {
        "title": "string (versão melhorada do título)",
        "userPersona": "string",
        "businessNarrative": "string",
        "acceptanceCriteria": "string (formato Gherkin)",
        "acceptanceCriteriaSummary": "string (bullet list)",
        "testScenarios": {
          "e2e": "string",
          "integration": "string",
          "unit": "string"
        },
        "storyEstimate": "string (Ex: 8h)",
        "developmentTasks": [
          {
            "name": "string",
            "description": "string",
            "estimate": "string (Ex: 2h)"
          }
        ],
        "riskAnalysis": [
          {
            "type": "Técnico|Negócio|Usabilidade|Compliance|Rollout",
            "severity": "baixa|média|alta",
            "description": "string",
            "mitigationSuggestion": "string"
          }
        ]
      }
    ]
  }
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao validar a história.' });
  }
});

app.post('/api/github/export', authenticateToken, async (req, res) => {
  const { card_id } = req.body;
  
  const db = await readDB();
  const card = db.cards.find(c => c.id === card_id);
  if (!card) return res.status(404).json({ error: 'Card não encontrado.' });
  if (!card.spec_content) return res.status(400).json({ error: 'Card não possui especificação gerada.' });
  
  const feature = db.features.find(f => f.id === card.feature_id);
  const project = db.projects.find(p => p.id === feature.project_id);

  if (!project.git_repo || !project.git_token) {
    return res.status(400).json({ error: 'Projeto não configurou git_repo ou git_token nas configurações.' });
  }

  try {
    const { Octokit } = await import('octokit');
    const octokit = new Octokit({ auth: project.git_token });
    const [owner, repo] = project.git_repo.split('/');
    if (!owner || !repo) {
      return res.status(400).json({ error: 'Formato do repositório inválido. Use "usuario/repo".' });
    }

    // Gerar um arquivo consolidado com o contexto para o Agente Local
    const config = project.phase_configurations?.features || { agents: [], skills: [] };
    const selectedAgents = (config.agents || []).map(id => db.agents?.find(a => a.id === id)).filter(Boolean).map(a => `- ${a.title}: ${a.description}`).join('\n');
    const selectedSkills = (config.skills || []).map(id => db.skills?.find(a => a.id === id)).filter(Boolean).map(a => `- ${a.title}: ${a.description}`).join('\n');
    
    const fileContent = `<!-- 
Auto-Generated by AI PM SaaS
Epic: ${feature.title}
Story: ${card.title}

Agents: 
${selectedAgents}

Skills:
${selectedSkills}
-->

${card.spec_content}
`;

    // Converte para base64
    const contentEncoded = Buffer.from(fileContent).toString('base64');
    const path = `.ai-specs/${card.id}.md`;
    const message = `docs(ai): export spec for ${card.title}`;

    // Checar se o arquivo já existe para pegar o SHA (necessário para update)
    let sha = undefined;
    try {
      const getRes = await octokit.request(`GET /repos/{owner}/{repo}/contents/{path}`, {
        owner, repo, path
      });
      sha = getRes.data.sha;
    } catch (e) {
      // Ignorar se não existir (404)
    }

    const response = await octokit.request(`PUT /repos/{owner}/{repo}/contents/{path}`, {
      owner,
      repo,
      path,
      message,
      content: contentEncoded,
      sha
    });

    res.json({ success: true, url: response.data.content.html_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao exportar para o GitHub. Verifique seu token e acesso.' });
  }
});

const PORT = process.env.PORT || 3001;
app.post('/api/ai/import-document', authenticateToken, async (req, res) => {
  const { project_id, content } = req.body;
  if (!project_id || !content) return res.status(400).json({ error: 'project_id e content são obrigatórios.' });

  try {
    const db = await readDB();
    const project = db.projects.find(p => p.id === project_id);
    const projectContextStr = project?.project_context ? `\n\nConsidere também o Contexto Global do Projeto ao extrair:\n${project.project_context}` : '';

    const contextPrompt = `Leia o documento abaixo e extraia o Contexto Global do Projeto de forma EXAUSTIVA e DETALHADA. NÃO FAÇA UM RESUMO EXECUTIVO. Preserve todas as nuances, premissas, regras gerais de negócio, restrições e visão do produto presentes no documento, garantindo o contexto máximo.
    Retorne APENAS JSON válido com a estrutura exata: { "project_context_summary": "string" }
    
Documento:
${content.substring(0, 25000)}`;

    const prompt = `Você é um Product Owner / Analista de Negócios Sênior especialista em extração de requisitos ágeis.
Leia o documento abaixo e liste de forma EXAUSTIVA e GRANULAR TODAS as funcionalidades, requisitos e histórias de usuário que podem ser extraídas do escopo.
Instruções rigorosas:
1. IDENTIFIQUE O MAIOR NÚMERO DE FEATURES POSSÍVEL E, DEPOIS, O MAIOR NÚMERO DE HISTÓRIAS SEM NENHUMA RESTRIÇÃO OU LIMITE DE QUANTIDADE! Não resuma absolutamente nada. Quebre fluxos complexos em múltiplas histórias.
2. Extraia tudo o que estiver implícito (regras de erro, empty states, fluxos de falha, cenários de exceção).
3. Agrupe as histórias logicamente em Épicos e Features correspondentes.
4. Para cada história identificada, analise e liste explicitamente quais são as Dependências (técnicas ou de outras histórias) e os Riscos associados (de negócio, técnicos, segurança, etc).
${projectContextStr}

    Retorne APENAS JSON válido com esta estrutura exata:
    {
      "stories": [
      { 
        "title": "string", 
        "epic": "string", 
        "feature": "string", 
        "description": "string (Descreva a história e inclua uma seção para 'Dependências:' e uma seção para 'Riscos:')", 
        "persona": "string" 
      }
    ]
  }

Documento:
${content.substring(0, 25000)}`;

    const [contextCompletion, storiesCompletion] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: contextPrompt + "\n\nIDIOMA OBRIGATÓRIO: Toda a sua resposta DEVE estar estritamente em PORTUGUÊS DO BRASIL (PT-BR)." }],
        response_format: { type: "json_object" },
        temperature: 0.2
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt + "\n\nIDIOMA OBRIGATÓRIO: Toda a sua resposta DEVE estar estritamente em PORTUGUÊS DO BRASIL (PT-BR)." }],
        response_format: { type: "json_object" },
        temperature: 0.2
      })
    ]);

    const contextParsed = JSON.parse(contextCompletion.choices[0].message.content);
    const parsed = JSON.parse(storiesCompletion.choices[0].message.content);
    parsed.project_context_summary = contextParsed.project_context_summary;

    if (parsed.project_context_summary) {
      const pIdx = db.projects.findIndex(p => p.id === project_id);
      if (pIdx !== -1) {
        if (!db.projects[pIdx].project_context) {
          db.projects[pIdx].project_context = parsed.project_context_summary;
        } else {
          db.projects[pIdx].project_context += '\n\n### Adicionado via Importador:\n' + parsed.project_context_summary;
        }
      }
    }

    const stories = parsed.stories || [];

    // db already loaded above
    const createdFeatures = [];
    const createdCards = [];

    // Group by feature
    const grouped = {};
    for (const story of stories) {
      if (!grouped[story.feature]) grouped[story.feature] = [];
      grouped[story.feature].push(story);
    }

    for (const featureName of Object.keys(grouped)) {
      const featureId = Date.now().toString() + Math.random().toString(36).substring(7);
      
      db.features.push({
        id: featureId,
        project_id,
        title: featureName,
        description: `Importado do documento (Épico sugerido: ${grouped[featureName][0].epic})`,
        column_id: 'col-ideas',
        prd_content: null,
        created_at: new Date().toISOString()
      });
      createdFeatures.push(featureName);

      for (const story of grouped[featureName]) {
        db.cards.push({
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          feature_id: featureId,
          title: story.title,
          description: `Como ${story.persona || 'usuário'}, quero ${story.title}.\nContexto: ${story.description}`,
          column_id: 'col-backlog',
          spec_content: null,
          status: 'pending',
          created_at: new Date().toISOString()
        });
        createdCards.push(story.title);
      }
    }

    await writeDB(db);

    res.json({ success: true, featuresCount: createdFeatures.length, cardsCount: createdCards.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao importar o documento.' });
  }
});

app.post('/api/ai/refine-demand', authenticateToken, async (req, res) => {
  const { text, type, project_id } = req.body;
  if (!text) return res.status(400).json({ error: 'O texto da demanda é obrigatório.' });

  try {
    const db = await readDB();
    const project = db.projects.find(p => p.id === project_id);
    const contextStr = project?.project_context ? `Contexto Global: ${project.project_context}` : '';

    const prompt = `Você é um Product Manager experiente.
O usuário enviou o seguinte texto bruto para criar um(a) ${type === 'feature' ? 'Épico/Feature' : 'História de Usuário'}.
Seu trabalho é refinar esse texto para um formato ágil profissional e extremamente detalhado.

Se for Feature: Refine como uma grande História de Usuário (Épico) que engloba o valor de negócio, com critérios de aceite de alto nível.
Se for História: Refine detalhadamente com critérios BDD.

Retorne APENAS um JSON válido com o seguinte formato exato:
{
  "isValid": true,
  "feedback": "Um parágrafo explicando as melhorias feitas no texto original.",
  "refinedData": {
    "refinedStories": [
      {
        "title": "string (versão melhorada do título)",
        "userPersona": "string",
        "businessNarrative": "string (descrição detalhada / narrativa)",
        "acceptanceCriteria": "string (formato Gherkin)",
        "testScenarios": {
          "e2e": "string",
          "integration": "string",
          "unit": "string"
        },
        "storyEstimate": "string (Ex: 8h)",
        "developmentTasks": [
          { "name": "string", "description": "string", "estimate": "string" }
        ],
        "riskAnalysis": [
          { "type": "Técnico|Negócio", "severity": "baixa|média|alta", "description": "string", "mitigationSuggestion": "string" }
        ]
      }
    ]
  }
}

Texto bruto do usuário:
"${text}"

${contextStr}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    res.json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao refinar demanda.' });
  }
});

app.post('/api/sprints/run', authenticateToken, async (req, res) => {
  const { project_id, card_ids } = req.body;
  if (!project_id || !card_ids || card_ids.length === 0) {
    return res.status(400).json({ error: 'project_id e array de card_ids são obrigatórios.' });
  }

  try {
    const db = await readDB();
    const projectIndex = db.projects.findIndex(p => p.id === project_id);
    const project = db.projects[projectIndex];
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
    
    const projectFeatures = db.features.filter(f => f.project_id === project_id).map(f => f.id);
    const projectCards = db.cards.filter(c => projectFeatures.includes(c.feature_id));
    
    let maxSprint = 0;
    for (const c of projectCards) {
      if (c.tags) {
        for (const t of c.tags) {
          const match = t.match(/^Sprint (\d+)$/i);
          if (match && parseInt(match[1]) > maxSprint) {
            maxSprint = parseInt(match[1]);
          }
        }
      }
    }
    
    const nextSprint = maxSprint + 1;
    const sprintTag = `Sprint ${nextSprint}`;

    let sprintPrdAddition = `\n\n---\n# ${sprintTag}\n\n`;
    let sprintSpecAddition = `\n\n---\n# ${sprintTag}\n\n`;

    let updatedCount = 0;
    for (const card of db.cards) {
      if (card_ids.includes(card.id)) {
        if (!card.tags) card.tags = [];
        if (!card.tags.includes(sprintTag)) card.tags.push(sprintTag);
        
        card.column_id = 'col-dev';
        updatedCount++;

        sprintPrdAddition += `### História: ${card.title}\n${card.description || 'Sem descrição.'}\n\n`;
        sprintSpecAddition += `### História: ${card.title}\n${card.spec_content || 'Sem especificação.'}\n\n`;
      }
    }

    if (!project.main_prd_content) project.main_prd_content = `# Documento de Requisitos (PRD Principal)\n\n## Contexto Global do Projeto\n${project.project_context || 'Sem contexto.'}\n\n`;
    if (!project.main_spec_content) project.main_spec_content = `# Especificações Técnicas Principais\n\n`;

    // Insert at the top (after the main titles)
    const prdParts = project.main_prd_content.split(/(## Contexto Global do Projeto[\s\S]*?\n\n)/);
    if (prdParts.length >= 3) {
      project.main_prd_content = prdParts[0] + prdParts[1] + sprintPrdAddition + prdParts.slice(2).join('');
    } else {
      project.main_prd_content += sprintPrdAddition;
    }

    const specParts = project.main_spec_content.split(/(# Especificações Técnicas Principais\n\n)/);
    if (specParts.length >= 3) {
      project.main_spec_content = specParts[0] + specParts[1] + sprintSpecAddition + specParts.slice(2).join('');
    } else {
      project.main_spec_content += sprintSpecAddition;
    }

    await writeDB(db);
    res.json({ success: true, sprint: sprintTag, updatedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao rodar a sprint.' });
  }
});

app.post('/api/ai/generate-architecture-doc', authenticateToken, async (req, res) => {
  const { project_id } = req.body;
  try {
    const db = await readDB();
    const projectIndex = db.projects.findIndex(p => p.id === project_id);
    const project = db.projects[projectIndex];
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });

    const prompt = `Você é um Arquiteto de Software Chefe. Escreva o documento completo de Arquitetura (em Markdown estruturado) para o projeto abaixo.
Inclua padrões, banco de dados, infraestrutura recomendada e componentes principais.

Contexto Global: ${project.project_context || ''}
PRD Principal Atual: ${project.main_prd_content || ''}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }]
    });

    project.main_architecture_content = completion.choices[0].message.content;
    await writeDB(db);
    res.json({ content: project.main_architecture_content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao gerar doc de arquitetura.' });
  }
});

app.post('/api/ai/generate-security-doc', authenticateToken, async (req, res) => {
  const { project_id } = req.body;
  try {
    const db = await readDB();
    const projectIndex = db.projects.findIndex(p => p.id === project_id);
    const project = db.projects[projectIndex];
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });

    const prompt = `Você é um Diretor de Segurança da Informação (CISO). Escreva o documento completo de Segurança e Compliance (em Markdown estruturado) para o projeto abaixo.
Inclua políticas de autenticação, criptografia, proteção de dados e OWASP top 10 relevantes.

Contexto Global: ${project.project_context || ''}
Arquitetura Principal: ${project.main_architecture_content || ''}
PRD Principal Atual: ${project.main_prd_content || ''}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }]
    });

    project.main_security_content = completion.choices[0].message.content;
    await writeDB(db);
    res.json({ content: project.main_security_content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao gerar doc de segurança.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
