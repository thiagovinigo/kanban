import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ShieldAlert, CheckCircle, Code, Layers } from 'lucide-react';

export function RefinementVisualizer({ prdContent, onCreateStories, isCreatingStories }) {
  let data = null;
  
  try {
    data = JSON.parse(prdContent);
  } catch (err) {
    // Fallback: If it's a mix of legacy JSON and appended Markdown from QA agent
    const match = prdContent.match(/^(\{[\s\S]*?\})\s*(###[\s\S]*)$/);
    if (match) {
      try {
        data = JSON.parse(match[1]);
        if (data && !data.refinedStories && data.title) {
          data = { refinedStories: [data] };
        }
        if (data && data.refinedStories && data.refinedStories.length > 0) {
          data.refinedStories[0].qaTestScenarios = match[2];
        }
      } catch(e) {
        data = null;
      }
    }
  }

  // Handle single story JSON that was parsed cleanly
  if (data && !data.refinedStories && data.title) {
    data = { refinedStories: [data] };
  }

  if (!data || !data.refinedStories) {
    return (
      <div className="markdown-content" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
        <ReactMarkdown>{prdContent}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Histórias de Usuário Refinadas ({data.refinedStories.length})</h3>
        {onCreateStories && (
          <button 
            className="btn btn-primary" 
            onClick={() => onCreateStories(data.refinedStories)}
            disabled={isCreatingStories}
          >
            {isCreatingStories ? 'Gerando Cartões...' : 'Exportar para Backlog (Criar PBIs)'}
          </button>
        )}
      </div>

      {data.divisionAnalysis && (
        <div style={{ background: 'rgba(255, 165, 0, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 165, 0, 0.3)' }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-orange)' }}>Análise de Divisão</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{data.divisionAnalysis}</p>
        </div>
      )}

      {data.refinedStories.map((story, i) => (
        <div key={i} style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--accent-purple)', fontSize: '1.25rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>História {i + 1}:</span> {story.title}
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Persona:</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{story.userPersona}</p>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Estimativa:</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {story.storyEstimate}
                {story.storyEstimateJustification && <span style={{display:'block', fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'4px'}}>{story.storyEstimateJustification}</span>}
              </p>
            </div>
            {story.epicSuggestion && (
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Sugestão de Épico:</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{story.epicSuggestion}</p>
              </div>
            )}
            {story.featureSuggestion && (
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Sugestão de Feature:</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{story.featureSuggestion}</p>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Narrativa de Negócio</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{story.businessNarrative}</p>
          </div>

          {story.interfaceDetails && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Detalhes de Interface</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{story.interfaceDetails}</p>
            </div>
          )}

          {story.questions && story.questions.length > 0 && (
            <div style={{ marginBottom: '24px', background: 'rgba(236, 72, 153, 0.1)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #ec4899' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#ec4899' }}>Dúvidas em Aberto</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {story.questions.map((q, idx) => <li key={idx}>{q}</li>)}
              </ul>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '24px' }}>
            {/* Gherkin */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} /> Critérios de Aceite (BDD)
              </h4>
              <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                {story.acceptanceCriteria}
              </div>
            </div>

            {/* Test Scenarios */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code size={16} /> Cenários de Teste (Cypress / Unit / Integration)
              </h4>
              <div className="markdown-content" style={{ fontSize: '0.85rem' }}>
                <ReactMarkdown>{`**E2E (Cypress)**\n\n${story.testScenarios?.e2e || 'N/A'}\n\n**Integração**\n\n${story.testScenarios?.integration || 'N/A'}\n\n**Unitários**\n\n${story.testScenarios?.unit || 'N/A'}`}</ReactMarkdown>
              </div>
            </div>

            {/* QA Test Scenarios (if enriched) */}
            {story.qaTestScenarios && (
              <div style={{ background: 'rgba(20,184,166,0.1)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent-teal)' }}>
                <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Code size={16} /> Cenários de Teste Incrementados (Agente QA)
                </h4>
                <div className="markdown-content" style={{ fontSize: '0.85rem' }}>
                  <ReactMarkdown>{story.qaTestScenarios}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Development Tasks */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} /> Tasks de Desenvolvimento
              </h4>
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {story.developmentTasks?.map((task, idx) => (
                  <li key={idx} style={{ marginBottom: '12px' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{task.name} ({task.estimate})</strong>
                    {task.responsibility && <span style={{ marginLeft: '8px', padding: '2px 6px', background: 'var(--bg-primary)', borderRadius: '4px', fontSize: '0.7rem' }}>{task.responsibility}</span>}
                    <div style={{ marginTop: '4px' }}>{task.description}</div>
                    {task.justification && <div style={{ marginTop: '2px', color: 'var(--text-muted)' }}><em>Justificativa:</em> {task.justification}</div>}
                    {task.technicalJustification && <div style={{ marginTop: '2px', color: 'var(--text-muted)' }}><em>Técnica:</em> {task.technicalJustification}</div>}
                  </li>
                ))}
              </ul>
              {story.tasksTotalEstimate && (
                <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <strong>Estimativa Total das Tasks:</strong> {story.tasksTotalEstimate}
                </div>
              )}
            </div>

            {/* Risk Analysis */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={16} /> Análise de Riscos & Considerações
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {story.riskAnalysis?.map((risk, idx) => {
                  let badgeColor = 'bg-gray-600';
                  if (risk.severity === 'alta') badgeColor = '#ef4444'; // red
                  if (risk.severity === 'média') badgeColor = '#f59e0b'; // yellow
                  if (risk.severity === 'baixa') badgeColor = '#10b981'; // green

                  return (
                    <div key={idx} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', borderLeft: `4px solid ${badgeColor}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{risk.type}</strong>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: badgeColor, borderRadius: '4px', color: 'white' }}>{risk.severity?.toUpperCase() || 'N/A'}</span>
                      </div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{risk.description}</p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--accent-teal)' }}><strong style={{ color: 'var(--text-primary)' }}>Mitigação:</strong> {risk.mitigationSuggestion}</p>
                    </div>
                  );
                })}
              </div>

              {story.potentialEdgeCases && story.potentialEdgeCases.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Edge Cases (Casos Extremos)</strong>
                  <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {story.potentialEdgeCases.map((ec, idx) => <li key={idx}>{ec}</li>)}
                  </ul>
                </div>
              )}

              {story.technicalConsiderations && story.technicalConsiderations.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Considerações Técnicas</strong>
                  <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {story.technicalConsiderations.map((tc, idx) => <li key={idx}>{tc}</li>)}
                  </ul>
                </div>
              )}

              {story.identifiedDependencies && story.identifiedDependencies.length > 0 && (
                <div>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Dependências Identificadas</strong>
                  <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {story.identifiedDependencies.map((dep, idx) => <li key={idx}>{dep}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
        </div>
      ))}
    </div>
  );
}
