const fs = require('fs');

const path = 'src/pages/ProjectView.jsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes("import toast from 'react-hot-toast';")) {
  content = content.replace("import React", "import React\nimport toast from 'react-hot-toast';");
}

// Erros
content = content.replace(/alert\(\s*['"]Erro(.*?)\)/g, "toast.error('Erro$1)");
content = content.replace(/alert\(\s*`Erro(.*?)`\)/g, "toast.error(`Erro$1`)");
content = content.replace(/alert\(\s*err\.message\s*\)/g, "toast.error(err.message)");
content = content.replace(/alert\(\s*e\.message\s*\)/g, "toast.error(e.message)");
content = content.replace(/alert\(\s*e\s*\)/g, "toast.error(e)");

// Outros textos (feedback da IA, avisos)
content = content.replace(/alert\(\s*"Feedback da IA:(.*?)\)/g, "toast.success(\"Feedback da IA:$1)");
content = content.replace(/alert\(\s*"Selecione uma Feature Pai(.*?)\)/g, "toast.error(\"Selecione uma Feature Pai$1)");
content = content.replace(/alert\(\s*"Nenhuma história na coluna 'Pacote Sprint'(.*?)\)/g, "toast.error(\"Nenhuma história na coluna 'Pacote Sprint'$1)");
content = content.replace(/alert\(\s*"Histórias de Sprints já executadas(.*?)\)/g, "toast.error(\"Histórias de Sprints já executadas$1)");

// O resto como toast.success (para simplificar avisos gerais)
content = content.replace(/alert\(/g, "toast.success(");

fs.writeFileSync(path, content, 'utf8');
console.log('Alerts substituted with toasts in ProjectView.jsx');
