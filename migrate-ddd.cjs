const fs = require('fs');

console.log(`
=========================================================
MIGRAÇÃO DE BANCO DE DADOS: SUPABASE (DOMAIN DRIVEN DESIGN)
=========================================================

Como estamos utilizando o Supabase, alterações estruturais (DDL) como adicionar colunas 
devem ser feitas com permissões de administrador (Service Role) ou diretamente no painel.

Por favor, abra o seu projeto no painel do Supabase (SQL Editor) e execute o seguinte comando:

---------------------------------------------------------
ALTER TABLE public.features ADD COLUMN IF NOT EXISTS ddd_content TEXT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS ddd_spec_content TEXT;
---------------------------------------------------------

Se você estiver rodando no modo fallback (sem Supabase, usando apenas memória),
nenhuma ação é necessária, o Javascript aceitará as novas propriedades dinamicamente.
`);

// Atualiza o supabase_schema.sql como documentação
let schema = fs.readFileSync('.gemini/antigravity/brain/56d1286c-1391-4726-bc9c-23670613c985/supabase_schema.sql', 'utf8');
if (!schema.includes('ddd_content TEXT')) {
  schema = schema.replace('prd_content TEXT, -- Markdown gerado pelo Agente PM', 'prd_content TEXT, -- Markdown gerado pelo Agente PM\n  ddd_content TEXT, -- Arquitetura DDD gerada pelo Arquiteto');
  schema = schema.replace('spec_content TEXT, -- Especificação Técnica / TDD gerada pela IA', 'spec_content TEXT, -- Especificação Técnica / TDD gerada pela IA\n  ddd_spec_content TEXT, -- Codigo DDD gerado pelo Agente DDD');
  fs.writeFileSync('.gemini/antigravity/brain/56d1286c-1391-4726-bc9c-23670613c985/supabase_schema.sql', schema);
  console.log("Arquivo supabase_schema.sql atualizado com sucesso!");
}

