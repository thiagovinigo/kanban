const fs = require('fs');
let pv = fs.readFileSync('src/pages/ProjectView.jsx', 'utf8');

const regex = /\{activeTab === 'context' && \([\s\S]*?\{activeTab === 'docs' && \(/m;
const match = pv.match(regex);
if (match) {
  const newChunk = `{activeTab === 'context' && (
        <div className="glass-panel" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Contexto Global do Projeto</h3>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                Este contexto é gerado automaticamente, mas você pode editá-lo manualmente para adicionar detalhes de novas features.
              </p>
            </div>
            <button 
              type="button" 
              className="btn" 
              onClick={() => setIsEditingContext(!isEditingContext)}
              style={{ background: isEditingContext ? 'var(--bg-secondary)' : 'var(--accent-purple)', color: 'white', display: 'flex', gap: '8px', alignItems: 'center' }}
            >
              {isEditingContext ? <><Eye size={16} /> Visualizar Formatado</> : <><FileText size={16} /> Editar Contexto</>}
            </button>
          </div>
          
          {isEditingContext ? (
            <form onSubmit={(e) => { handleSaveSettings(e); setIsEditingContext(false); }}>
              <div style={{ marginBottom: '16px' }}>
                <textarea 
                  className="input-field" 
                  rows="20" 
                  placeholder="Cole o contexto do projeto, links, descrições, glossário..." 
                  value={formData.project_context} 
                  onChange={e => setFormData({...formData, project_context: e.target.value})}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Salvar Contexto
              </button>
            </form>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-glass)', minHeight: '300px' }}>
              {formData.project_context ? (
                <div className="markdown-body" style={{ color: 'var(--text-primary)' }}>
                  <ReactMarkdown>{formData.project_context}</ReactMarkdown>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '40px' }}>
                  <p>Nenhum contexto definido ainda.</p>
                  <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Vá na aba "Painel de Features" e use a função "Importar com IA" ou clique em "Editar Contexto" para escrever manualmente.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'docs' && (`

  pv = pv.replace(regex, newChunk);
  fs.writeFileSync('src/pages/ProjectView.jsx', pv);
  console.log("Fixed JSX");
} else {
  console.log("Could not find chunk");
}
