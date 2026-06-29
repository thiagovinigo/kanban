require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://upjxkzqgvyxvssjjwuaa.supabase.co',
  process.env.SUPABASE_KEY
);

async function run() {
  const { data: features } = await supabase.from('features').select('*').ilike('title', '%Curadoria%');
  if (!features || features.length === 0) {
    console.log("Feature não encontrada.");
    return;
  }
  
  const feature = features[0];
  const { data: cards } = await supabase.from('cards').select('*').eq('feature_id', feature.id);
  
  console.log(`Feature: ${feature.title}`);
  console.log(`Quantidade de histórias no BD: ${cards.length}`);
  cards.forEach(c => console.log(` - [${c.id}] ${c.title}`));
  
  if (feature.prd_content) {
    const prd = JSON.parse(feature.prd_content);
    console.log(`\nPRD gerado tem ${prd.refinedStories ? prd.refinedStories.length : 0} histórias:`);
    if (prd.refinedStories) {
      prd.refinedStories.forEach(s => console.log(` - [${s.card_id}] ${s.title}`));
    }
  }
}

run();
