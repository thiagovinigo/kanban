const fs = require('fs');
const path = 'src/pages/ProjectView.jsx';
let content = fs.readFileSync(path, 'utf8');

// The original script did: "toast.error('Erro$1)" where $1 was something like ` ao criar demanda: " + err.message`
// We need to fix quotes. Let's just find `toast.error('Erro(.*?)");` or similar and match the quote.
// A simpler way is to replace `toast.error('Erro` with `toast.error("Erro` and if it ends with `')` change to `")`.
// Actually, let's just use `toast.error("Erro` everywhere and ensure the closing quote matches.

content = content.replace(/toast\.error\('Erro(.*?)"( \+.*?)?\)/g, 'toast.error("Erro$1"$2)');
content = content.replace(/toast\.success\('Importação(.*?)"( \+.*?)?\)/g, 'toast.success("Importação$1"$2)');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed quotes in ProjectView.jsx');
