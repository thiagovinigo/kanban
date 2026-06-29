const fs = require('fs');
let pv = fs.readFileSync('src/pages/ProjectView.jsx', 'utf8');

const badStructure = `      {activeTab === 'context' && (
        <div className="glass-panel" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div className="glass-panel" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>`;

const goodStructure = `      {activeTab === 'context' && (
        <div className="glass-panel" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>`;

pv = pv.replace(badStructure, goodStructure);

// Remove the extra closing div and closing bracket
const extraDiv = `          </div>
        </div>
      )}

      {activeTab === 'docs' && (`;

const goodDiv = `          </div>
      )}

      {activeTab === 'docs' && (`;

pv = pv.replace(extraDiv, goodDiv);

fs.writeFileSync('src/pages/ProjectView.jsx', pv);
console.log('Fixed duplicate div');
