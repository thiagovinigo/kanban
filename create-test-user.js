import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERRO: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos no .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  const email = 'teste@aicommittee.com';
  const password = 'senha-segura-123';

  console.log(`Criando usuário de teste...`);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("Erro ao criar usuário:", error.message);
    if (error.message.includes('User already registered')) {
        console.log(`\n✅ O usuário já existe!`);
        console.log(`Email: ${email}`);
        console.log(`Senha: ${password}`);
    }
  } else {
    console.log(`\n✅ Usuário de teste criado com sucesso!`);
    console.log(`Email: ${email}`);
    console.log(`Senha: ${password}`);
    // Check if email confirmation is required
    if (data?.user?.identities?.length === 0) {
        console.log(`\n⚠️ Atenção: Parece que este email já estava em uso ou requer confirmação.`);
    }
  }
}

createTestUser();
