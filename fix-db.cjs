const fs = require('fs');

try {
  let srv = fs.readFileSync('server.js', 'utf8');

  // Fix race condition in prd
  const srvFind1 = 'const prdContent = completion.choices[0].message.content;\n    \n    const index = db.features.findIndex(f => f.id === feature_id);\n    db.features[index].prd_content = prdContent;\n    await writeDB(db);';
  const srvReplace1 = 'const prdContent = completion.choices[0].message.content;\n    const currentDb = await readDB();\n    const index = currentDb.features.findIndex(f => f.id === feature_id);\n    if (index !== -1) currentDb.features[index].prd_content = prdContent;\n    await writeDB(currentDb);';
  srv = srv.replace(srvFind1, srvReplace1);

  // Add existing stories logic
  const promptFind = 'const prompt = `**Role:** Especialista em Gestão de Produtos Avançada';
  const existingCardsCode = 'const existingCards = db.cards.filter(c => c.feature_id === feature_id);\n    const existingCardsStr = existingCards.length > 0 ? `\\n\\nHistórias Existentes para esta Feature:\\n${existingCards.map(c => `ID: ${c.id} | Título: ${c.title} | Contexto: ${c.description}`).join(`\\n`)}\\nIMPORTANTE: Se as histórias acima já cobrem o escopo, NÃO crie histórias redundantes. Em vez disso, refine ESTAS histórias, retornando-as no JSON e incluindo o "card_id" correspondente de cada uma no objeto.` : "";\n\n    const prompt = `**Role:** Especialista em Gestão de Produtos Avançada';
  srv = srv.replace(promptFind, existingCardsCode);

  srv = srv.replace('${project.project_context ? `\\nInformações Globais e Restrições do Projeto:\\n${project.project_context}\\n` : \'\'}', '${project.project_context ? `\\nInformações Globais e Restrições do Projeto:\\n${project.project_context}\\n` : \'\'}${existingCardsStr}');

  srv = srv.replace('"title": "string",', '"card_id": "string (MANTER o ID original da história se estiver refinando uma história existente, senão null)",\n        "title": "string",');

  // Fix race condition in import-document
  const importDocFind = 'await writeDB(db);\n\n    res.json({ success: true, featuresCount: createdFeatures.length, cardsCount: createdCards.length });';
  const importDocReplace = 'const currentDb = await readDB();\n    currentDb.features.push(...db.features.slice(currentDb.features.length));\n    currentDb.cards.push(...db.cards.slice(currentDb.cards.length));\n    await writeDB(currentDb);\n    res.json({ success: true, featuresCount: createdFeatures.length, cardsCount: createdCards.length });';
  srv = srv.replace(importDocFind, importDocReplace);

  // Fix race condition in /api/ai/spec
  const specFind = 'db.cards[index].spec_content = newSpecContent;\n    await writeDB(db);';
  const specReplace = 'const currentDbSpec = await readDB();\n    const specIndex = currentDbSpec.cards.findIndex(c => c.id === card_id);\n    if (specIndex !== -1) currentDbSpec.cards[specIndex].spec_content = newSpecContent;\n    await writeDB(currentDbSpec);';
  srv = srv.replace(specFind, specReplace);

  fs.writeFileSync('server.js', srv);

  let pv = fs.readFileSync('src/pages/ProjectView.jsx', 'utf8');
  const pvFind = 'const newCards = [];\n            for (const story of parsed.refinedStories) {\n              const storyCard = await apiClient.cards.create({\n                feature_id: featureId,\n                title: story.title,\n                description: `🤖 **História Gerada Automaticamente**\\n\\n${story.businessNarrative}`,\n                spec_content: JSON.stringify({ refinedStories: [story] }, null, 2)\n              });\n              newCards.push(storyCard);\n            }\n            setCards(prev => [...prev, ...newCards]);\n            alert(`Análise concluída! ${parsed.refinedStories.length} histórias foram automaticamente extraídas para o Backlog de Histórias.`);';
  const pvReplace = 'let createdCount = 0;\n            let updatedCount = 0;\n            for (const story of parsed.refinedStories) {\n              if (story.card_id && String(story.card_id) !== \'null\') {\n                try {\n                  await apiClient.cards.update(story.card_id, {\n                    spec_content: JSON.stringify({ refinedStories: [story] }, null, 2)\n                  });\n                  updatedCount++;\n                } catch(e) { console.error(\'Error updating card\', e); }\n              } else {\n                try {\n                  await apiClient.cards.create({\n                    feature_id: featureId,\n                    title: story.title,\n                    description: `🤖 **História Gerada Automaticamente**\\n\\n${story.businessNarrative}`,\n                    spec_content: JSON.stringify({ refinedStories: [story] }, null, 2)\n                  });\n                  createdCount++;\n                } catch(e) { console.error(\'Error creating card\', e); }\n              }\n            }\n            loadData();\n            alert(`Análise concluída! ${createdCount} novas histórias e ${updatedCount} histórias existentes foram detalhadas com specs.`);';
  pv = pv.replace(pvFind, pvReplace);
  fs.writeFileSync('src/pages/ProjectView.jsx', pv);

  console.log("Success");
} catch(e) {
  console.error(e);
}
