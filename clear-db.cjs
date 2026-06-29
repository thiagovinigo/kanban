require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://upjxkzqgvyxvssjjwuaa.supabase.co',
  process.env.SUPABASE_KEY
);

async function run() {
  console.log('Limpando projetos...');
  const { error: cardsErr } = await supabase.from('cards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error: featErr } = await supabase.from('features').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error: projErr } = await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (cardsErr) console.error('Erro cards:', cardsErr);
  if (featErr) console.error('Erro features:', featErr);
  if (projErr) console.error('Erro projects:', projErr);
  
  console.log('Feito!');
}
run();
