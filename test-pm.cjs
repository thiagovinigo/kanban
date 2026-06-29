require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://upjxkzqgvyxvssjjwuaa.supabase.co',
  process.env.SUPABASE_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function run() {
  const { data: features } = await supabase.from('features').select('*').ilike('title', '%n8n%');
  if (!features || features.length === 0) {
    console.log("Feature 'n8n core nodes' não encontrada.");
    return;
  }
  
  const feature = features[0];
  const { data: cards } = await supabase.from('cards').select('*').eq('feature_id', feature.id);
  const { data: projects } = await supabase.from('projects').select('*').eq('id', feature.project_id);
  const project = projects[0];
  
  console.log(`[ANTES] Feature: ${feature.title}`);
  console.log(`[ANTES] Quantidade de histórias no BD: ${cards.length}`);
  cards.forEach(c => console.log(` - [${c.id}] ${c.title}`));
  
  console.log("\nIniciando chamada direta para OpenAI...");
  
  try {
    const existingCardsStr = cards.length > 0 ? `\n\nHistórias Existentes no Backlog para esta Feature:\n${cards.map(c => `ID: ${c.id} | Título: ${c.title} | Contexto: ${c.description}`).join(`\n`)}\n\nIMPORTANTE: O usuário já definiu a quantidade de histórias para esta feature. O seu trabalho como PM NÃO é criar novas histórias do zero, mas sim REFINAR EXAUSTIVAMENTE as histórias existentes acima. Você DEVE retornar o array "refinedStories" contendo EXATAMENTE as histórias listadas acima, usando o mesmo "card_id" de cada uma, mas preenchendo todos os campos avançados (PRD, BDD, estimativas). NÃO crie histórias adicionais a menos que o escopo global do projeto absolutamente exija para não quebrar a aplicação.` : "";

    const prompt = `**Role:** Especialista em Gestão de Produtos Avançada, Análise de Requisitos, Escrita de User Stories, Planejamento Técnico e Organização de Backlog.
**Task:** Analisar a Feature e dividi-la em User Stories menores e mais gerenciáveis. Você DEVE extrair DE FORMA EXAUSTIVA E COMPLETA TODAS as User Stories necessárias para cobrir a Feature de ponta a ponta. Não pule nenhum fluxo de sucesso, fluxo de erro, tratamento de exceção ou configuração necessária para que a feature funcione perfeitamente. Para cada User Story, gere uma estrutura completa: visão do usuário, narrativa de negócio, Critérios de Aceite (BDD), resumo, cenários de teste em três níveis, estimativa, detalhamento das tasks de desenvolvimento, análise de riscos e considerações.

Feature: "${feature.title}"
Contexto do Projeto: ${project.name}
${project.project_context ? `\nInformações Globais e Restrições do Projeto:\n${project.project_context}\n` : ''}${existingCardsStr}

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
    const prd = JSON.parse(prdContent);
    
    console.log(`\n[DEPOIS] PRD retornado pela IA.`);
    console.log(`[DEPOIS] Quantidade de histórias retornadas no JSON: ${prd.refinedStories ? prd.refinedStories.length : 0}`);
    
    if (prd.refinedStories) {
      prd.refinedStories.forEach(s => console.log(` - [card_id: ${s.card_id}] ${s.title}`));
    }
    
  } catch (err) {
    console.error("Falha ao chamar a API:", err);
  }
}

run();
