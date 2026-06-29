const fs = require('fs');
let pv = fs.readFileSync('src/pages/ProjectView.jsx', 'utf8');

const find = '      try { \n        await apiClient.cards.update(draggableId, { column_id: newColId }); \n\n        // Lógica de movimentação automática da Feature';
const replace = '      try { \n        await apiClient.cards.update(draggableId, { column_id: newColId }); \n\n        if (newColId === \'col-spec\') {\n          if (!card.spec_content || !card.spec_content.includes(\'Especificação Técnica e TDD\')) {\n            generateSpec(draggableId);\n          }\n        }\n\n        // Lógica de movimentação automática da Feature';

pv = pv.replace(find, replace);
fs.writeFileSync('src/pages/ProjectView.jsx', pv);
console.log('Fixed auto-trigger');
