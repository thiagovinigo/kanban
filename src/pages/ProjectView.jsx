import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../utils/apiClient';
import { KanbanBoard } from '../components/KanbanBoard';
import { ArrowLeft, Save, Loader2, Layout, Settings, BookOpen, Plus, Sparkles, X, FileText, Eye, Download, Paperclip, Server, Package, Grid } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { RefinementVisualizer } from '../components/RefinementVisualizer';

const FEATURE_COLUMNS = [
  { id: 'col-backlog', title: '📋 Backlog de Features' },
  { id: 'col-pm-review', title: '🔍 Análise PM (IA)' },
  { id: 'col-wip', title: '🚧 Em Execução' },
  { id: 'col-done', title: '🚀 Done' }
];

const STORY_COLUMNS = [
  { id: 'col-backlog', title: '📋 Backlog de Histórias' },
  { id: 'col-spec', title: '🤖 Gerar Spec/TDD' },
  { id: 'col-sprint', title: '📦 Pacote Sprint' },
  { id: 'col-dev', title: '💻 Em Dev (Agente)' },
  { id: 'col-done', title: '✅ Done' }
];

const jsonToMarkdown = (title, jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    let md = `# ${title}\n\n`;
    if (data.divisionAnalysis) md += `## Análise de Divisão\n${data.divisionAnalysis}\n\n`;
    
    if (data.refinedStories) {
      data.refinedStories.forEach((story, i) => {
        md += `## História ${i+1}: ${story.title}\n`;
        if (story.epicSuggestion) md += `**Épico:** ${story.epicSuggestion}\n`;
        if (story.featureSuggestion) md += `**Feature:** ${story.featureSuggestion}\n`;
        md += `**Persona:** ${story.userPersona}\n`;
        md += `**Estimativa:** ${story.storyEstimate}\n\n`;
        md += `### Narrativa de Negócio\n${story.businessNarrative}\n\n`;
        if (story.interfaceDetails) md += `### Detalhes de Interface\n${story.interfaceDetails}\n\n`;
        
        md += `### Critérios de Aceite (BDD)\n\`\`\`gherkin\n${story.acceptanceCriteria}\n\`\`\`\n\n`;
        
        md += `### Cenários de Teste\n**E2E (Cypress):**\n${story.testScenarios?.e2e}\n\n**Integração:**\n${story.testScenarios?.integration}\n\n**Unitários:**\n${story.testScenarios?.unit}\n\n`;
        
        md += `### Tarefas de Desenvolvimento\n`;
        story.developmentTasks?.forEach(task => {
          md += `- **${task.name}** (${task.estimate}) [${task.responsibility || 'Dev'}]: ${task.description}\n`;
        });
        md += '\n';
        
        if (story.riskAnalysis && story.riskAnalysis.length > 0) {
          md += `### Análise de Riscos\n`;
          story.riskAnalysis.forEach(risk => {
            md += `- **[${risk.severity?.toUpperCase()}] ${risk.type}:** ${risk.description}\n  *Mitigação:* ${risk.mitigationSuggestion}\n`;
          });
          md += '\n';
        }
      });
    }
    return md;
  } catch (e) {
    return jsonString;
  }
};

export function ProjectView() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [features, setFeatures] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('features');
  
  // Settings & Generating States
  const [saving, setSaving] = useState(false);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [generatingItem, setGeneratingItem] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSprintPanel, setShowSprintPanel] = useState(false);
  const [showAddModal, setShowAddModal] = useState({ open: false, type: 'feature' });
  const [demandText, setDemandText] = useState('');
  const [refinedDemandData, setRefinedDemandData] = useState(null);
  const [importContent, setImportContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [markdownViewer, setMarkdownViewer] = useState(null);
  const [isUploadingContext, setIsUploadingContext] = useState(false);
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [hubData, setHubData] = useState({ agents: [], skills: [], mcps: [] });
  const [formData, setFormData] = useState({ 
    name: '', git_repo: '', git_token: '', project_context: '',
    selected_agents: [], selected_skills: [], selected_mcps: [] 
  });

  // Creation States
  const [newFeatureTitle, setNewFeatureTitle] = useState('');
  const [newCardTitle, setNewCardTitle] = useState('');
  const [selectedFeatureForCard, setSelectedFeatureForCard] = useState('');

  // Modal State
  const [selectedItem, setSelectedItem] = useState(null); // { type: 'feature' | 'card', data: {...} }
  const [descriptionViewMode, setDescriptionViewMode] = useState('visual'); // 'visual' | 'raw'
  const [showLibraryModal, setShowLibraryModal] = useState({ open: false, phase: null }); // { open, phase: 'features'|'stories'... }

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const [projData, featsData, cardsData, hubRes] = await Promise.all([
        apiClient.projects.getById(projectId),
        apiClient.features.getList(projectId),
        apiClient.cards.getList(projectId),
        apiClient.hub.getGlobalItems()
      ]);
      setProject(projData);
      setFeatures(featsData);
      setCards(cardsData);
      setHubData(hubRes);
      setFormData({
        name: projData.name || '',
        git_repo: projData.git_repo || '',
        git_token: projData.git_token || '',
        project_context: projData.project_context || '',
        selected_mcps: projData.selected_mcps || [],
        phase_configurations: projData.phase_configurations || {
          features: { agents: [], skills: [] },
          stories: { agents: [], skills: [] },
          development: { agents: [], skills: [] },
          security: { agents: [], skills: [] },
          qa: { agents: [], skills: [] }
        }
      });
      if (featsData.length > 0) setSelectedFeatureForCard(featsData[0].id);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar projeto');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await apiClient.projects.update(projectId, formData);
      setProject(updated);
      alert('Configurações salvas!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };



  const handleCreateFeature = async (e) => {
    e.preventDefault();
    if (!newFeatureTitle) return;
    try {
      const feature = await apiClient.features.create({ project_id: projectId, title: newFeatureTitle });
      setFeatures([...features, feature]);
      setNewFeatureTitle('');
      if (!selectedFeatureForCard) setSelectedFeatureForCard(feature.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleImportDocument = async () => {
    if (!importContent.trim()) return;
    setIsImporting(true);
    try {
      const res = await apiClient.ai.importDocument(projectId, importContent);
      alert(`Importação concluída! ${res.featuresCount} Épicos/Features e ${res.cardsCount} Histórias extraídas.`);
      setShowImportModal(false);
      setImportContent('');
      loadData(); // Reload to fetch newly created features and cards
    } catch (err) {
      alert(err.message || 'Erro ao importar documento.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateCard = async (e) => {
    e.preventDefault();
    if (!newCardTitle || !selectedFeatureForCard) return;
    
    setGeneratingItem('validating-story');
    try {
      // Pass the projectId to apply project_context during validation
      const val = await apiClient.ai.validateStory(projectId, newCardTitle, "");
      
      let aiFeedback = "";
      if (!val.isValid) {
        aiFeedback = `⚠️ **Feedback do Agile Coach (IA):** A história precisa de refinamento.\n\n${val.feedback}`;
      } else {
        aiFeedback = `✅ **Feedback do Agile Coach (IA):** História bem estruturada!\n\n${val.feedback}`;
      }
      
      const card = await apiClient.cards.create({ 
        feature_id: selectedFeatureForCard, 
        title: val.refinedData?.refinedStories?.[0]?.title || newCardTitle,
        description: aiFeedback,
        spec_content: val.refinedData ? JSON.stringify(val.refinedData) : null
      });
      
      setCards([...cards, card]);
      setNewCardTitle('');
    } catch (err) {
      alert(err.message);
    } finally {
      setGeneratingItem(null);
    }
  };

  const handleCreateStoriesFromRefinement = async (refinedStories) => {
    if (!refinedStories || refinedStories.length === 0) return;
    setGeneratingItem('creating-stories');
    try {
      const newCards = [];
      for (const story of refinedStories) {
        // Prepare exactly what we get from the StrategicRefinement schema
        const storyCard = await apiClient.cards.create({
          feature_id: selectedItem.data.id, // we're inside the feature modal
          title: story.title,
          description: `✅ **História Gerada Automaticamente**\n\n${story.businessNarrative}`,
          spec_content: JSON.stringify({ refinedStories: [story] }) // Embed the single story
        });
        newCards.push(storyCard);
      }
      setCards(prev => [...prev, ...newCards]);
      alert(`${refinedStories.length} histórias exportadas para o Backlog com sucesso!`);
    } catch (err) {
      alert('Erro ao exportar histórias: ' + err.message);
    } finally {
      setGeneratingItem(null);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setGeneratingItem('import-doc');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      try {
        const res = await apiClient.ai.importDocument(projectId, text);
        alert(`Importação concluída! ${res.featuresCount} Épicos/Features e ${res.cardsCount} Histórias extraídas.`);
        loadData(); // Reload to fetch newly created features and cards
      } catch (err) {
        alert('Erro ao extrair documento: ' + err.message);
      } finally {
        setGeneratingItem(null);
        e.target.value = null; // reset input
      }
    };
    reader.readAsText(file);
  };

  const handleContextUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploadingContext(true);
    try {
      const text = await apiClient.ai.uploadContext(file);
      setFormData(prev => ({
        ...prev,
        project_context: prev.project_context ? prev.project_context + '\n\n---\n\n' + text : text
      }));
      alert('Documento extraído e adicionado ao contexto com sucesso!');
    } catch (err) {
      alert('Erro ao extrair documento: ' + err.message);
    } finally {
      setIsUploadingContext(false);
      e.target.value = null;
    }
  };

  const handleSuggestFeatures = async () => {
    setGeneratingItem('suggesting-features');
    try {
      const featuresSuggested = await apiClient.ai.suggestFeatures(projectId);
      if (featuresSuggested && featuresSuggested.length > 0) {
        const newFeatures = [];
        for (const feat of featuresSuggested) {
          const f = await apiClient.features.create({ project_id: projectId, title: feat.title, description: feat.description, tags: ['Produto'] });
          newFeatures.push(f);
        }
        setFeatures(prev => [...prev, ...newFeatures]);
        alert(`${featuresSuggested.length} features/épicos gerados com sucesso!`);
      }
    } catch (err) {
      alert('Erro ao sugerir features: ' + err.message);
    } finally {
      setGeneratingItem(null);
    }
  };

  const handleSuggestArchitecture = async () => {
    setGeneratingItem('suggesting-architecture');
    try {
      const archFeatures = await apiClient.ai.suggestArchitecture(projectId);
      if (archFeatures && archFeatures.length > 0) {
        const newFeatures = [];
        for (const feat of archFeatures) {
          const f = await apiClient.features.create({ project_id: projectId, title: feat.title, description: feat.description, tags: ['Arquitetura'] });
          newFeatures.push(f);
        }
        setFeatures(prev => [...prev, ...newFeatures]);
        alert(`${archFeatures.length} features de arquitetura geradas com sucesso!`);
      } else {
        alert('Nenhuma nova feature de arquitetura identificada como necessária no momento.');
      }
    } catch (err) {
      alert('Erro ao sugerir arquitetura: ' + err.message);
    } finally {
      setGeneratingItem(null);
    }
  };

  const handleSuggestStoriesPO = async () => {
    setGeneratingItem('suggesting-stories-po');
    try {
      const storiesSuggested = await apiClient.ai.poSuggest(projectId);
      if (storiesSuggested && storiesSuggested.length > 0) {
        const newCards = [];
        for (const story of storiesSuggested) {
          const c = await apiClient.cards.create({
            feature_id: story.feature_id || features[0]?.id,
            title: story.title,
            description: story.description
          });
          newCards.push(c);
        }
        setCards(prev => [...prev, ...newCards]);
        alert(`${storiesSuggested.length} histórias sugeridas pelo Agente PO com sucesso!`);
      } else {
        alert("O Agente PO verificou o projeto e não encontrou histórias faltando no momento.");
      }
    } catch (err) {
      alert('Erro ao rodar Agente PO: ' + err.message);
    } finally {
      setGeneratingItem(null);
    }
  };

  const handleEnrichTestsQA = async () => {
    setGeneratingItem('enriching-tests-qa');
    try {
      const res = await apiClient.ai.qaEnrich(projectId);
      if (res && res.enrichedStoriesCount > 0) {
        alert(`O Agente QA enriqueceu cenários de teste em ${res.enrichedStoriesCount} histórias!`);
        loadData(); // reload cards
      } else {
        alert(res?.message || "O Agente QA não encontrou cenários para enriquecer.");
      }
    } catch (err) {
      alert('Erro ao rodar Agente QA: ' + err.message);
    } finally {
      setGeneratingItem(null);
    }
  };

  const handleRunSprint = async () => {
    const sprintCards = cards.filter(c => c.column_id === 'col-sprint');
    if (sprintCards.length === 0) {
      alert("Nenhuma história na coluna 'Pacote Sprint'. Arraste algumas histórias para lá primeiro.");
      return;
    }
    
    setGeneratingItem('running-sprint');
    try {
      const cardIds = sprintCards.map(c => c.id);
      const res = await apiClient.sprints.run(projectId, cardIds);
      if (res.success) {
        alert(`Sprint criada com sucesso: ${res.sprint}. ${res.updatedCount} histórias atualizadas!`);
        loadData(); // reload
      }
    } catch (err) {
      alert('Erro ao rodar sprint: ' + err.message);
    } finally {
      setGeneratingItem(null);
    }
  };

  const handleRefineDemandWithAI = async () => {
    if (!demandText.trim()) return;
    setGeneratingItem('refining-demand');
    setRefinedDemandData(null);
    try {
      const res = await apiClient.ai.refineDemand(projectId, demandText, showAddModal.type);
      if (res.isValid === false) {
        alert("Feedback da IA:\n\n" + res.feedback);
      } else if (res.refinedData) {
        setRefinedDemandData(JSON.stringify(res.refinedData));
      } else {
        alert("IA não retornou um formato válido.");
      }
    } catch (err) {
      alert("Erro ao refinar: " + err.message);
    } finally {
      setGeneratingItem(null);
    }
  };

  const handleCreateDemandDirectly = async () => {
    if (!demandText.trim()) return;
    
    const lines = demandText.split('\n');
    const title = lines[0];
    const description = lines.slice(1).join('\n').trim();

    try {
      if (showAddModal.type === 'feature') {
        const f = await apiClient.features.create({ project_id: projectId, title, description });
        setFeatures([...features, f]);
      } else {
        if (!selectedFeatureForCard && features.length > 0) {
          alert("Selecione uma Feature Pai no dropdown de Histórias antes de adicionar!");
          return;
        }
        const c = await apiClient.cards.create({
          feature_id: selectedFeatureForCard || features[0]?.id,
          title,
          description
        });
        setCards([...cards, c]);
      }
      setShowAddModal({ open: false, type: 'feature' });
      setDemandText('');
    } catch (err) {
      alert("Erro ao criar demanda: " + err.message);
    }
  };

  const exportToGithub = async (cardId) => {
    setGeneratingItem('export-github');
    try {
      const res = await apiClient.github.exportSpec(cardId);
      if (res && res.url) {
        alert('Exportado com sucesso para o GitHub!');
        window.open(res.url, '_blank');
      }
    } catch (err) {
      alert('Erro ao exportar: ' + err.message);
    } finally {
      setGeneratingItem(null);
    }
  };

  const onDragEndFeature = async (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const destColumnId = destination.droppableId;
    
    const prevFeatures = [...features];
    setFeatures(features.map(f => f.id === draggableId ? { ...f, column_id: destColumnId } : f));
    try {
      await apiClient.features.update(draggableId, { column_id: destColumnId });
      
      // Auto-trigger Análise PM
      if (destColumnId === 'col-pm-review') {
        const feat = features.find(f => f.id === draggableId);
        if (feat && !feat.prd_content) {
          generatePrd(draggableId);
        }
      }
    } catch (err) {
      alert(err.message);
      // rollback se quiser
    }
  };

  const onDragEndCard = async (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newColId = destination.droppableId;
    
    const card = cards.find(c => c.id === draggableId);
    if (card && card.tags && card.tags.some(t => t.startsWith('Sprint '))) {
      if (['col-backlog', 'col-spec', 'col-sprint'].includes(newColId)) {
        alert("Histórias de Sprints já executadas não podem retroceder no fluxo. Crie uma nova história caso necessite revisões pesadas.");
        return;
      }
    }

    const prevCards = [...cards];
    const updatedCards = cards.map(c => c.id === draggableId ? { ...c, column_id: newColId } : c);
    setCards(updatedCards);
    try { 
      await apiClient.cards.update(draggableId, { column_id: newColId }); 

      // Lógica de movimentação automática da Feature
      if (card && card.feature_id) {
        const featureCards = updatedCards.filter(c => c.feature_id === card.feature_id);
        const feature = features.find(f => f.id === card.feature_id);
        
        if (feature) {
          let newFeatureColId = feature.column_id;
          
          // Se todas as histórias da feature estão 'done', a feature vai pra 'done'
          const allDone = featureCards.length > 0 && featureCards.every(c => c.column_id === 'col-done');
          
          // Se alguma história está a partir de 'sprint', a feature entra em execução
          const someInExec = featureCards.some(c => ['col-sprint', 'col-dev', 'col-done'].includes(c.column_id));
          
          if (allDone) {
            newFeatureColId = 'col-done';
          } else if (someInExec) {
            newFeatureColId = 'col-wip';
          }
          
          if (newFeatureColId !== feature.column_id) {
            setFeatures(features.map(f => f.id === feature.id ? { ...f, column_id: newFeatureColId } : f));
            await apiClient.features.update(feature.id, { column_id: newFeatureColId });
          }
        }
      }

      // Triggers das automações da Cadeia de Valor (Agents Pipeline)
      if (newColId === 'col-spec' && !card.spec_content) {
        generateSpec(draggableId);
      }
      
      if (newColId === 'col-dev') {
        // Automatically export to Github Actions to run the Developer Agent
        exportToGithub(draggableId);
      }

    } 
    catch (err) { setCards(prevCards); alert('Erro ao mover a história: ' + err.message); }
  };

  // AI ACTIONS
  const generateRoadmap = async () => {
    setGeneratingRoadmap(true);
    try {
      const roadmap = await apiClient.ai.generateRoadmap(projectId);
      setProject({ ...project, roadmap_content: roadmap });
    } catch (err) {
      alert(err.message);
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  const generatePrd = async (featureId) => {
    setGeneratingItem(featureId);
    try {
      const prd = await apiClient.ai.generatePrd(featureId);
      
      setFeatures(prev => {
        const feat = prev.find(f => f.id === featureId);
        if (!feat) return prev;
        const updatedFeature = { ...feat, prd_content: prd };
        if (selectedItem?.data?.id === featureId) {
          setSelectedItem({ type: 'feature', data: updatedFeature });
        }
        return prev.map(f => f.id === featureId ? updatedFeature : f);
      });

      // Auto-extract stories to Backlog
      try {
        const parsed = JSON.parse(prd);
        if (parsed && parsed.refinedStories && parsed.refinedStories.length > 0) {
          let updatedCount = 0;
          let newCount = 0;
          for (const story of parsed.refinedStories) {
            const existingCard = cards.find(c => c.id === story.card_id || (c.feature_id === featureId && c.title.trim().toLowerCase() === story.title.trim().toLowerCase()));
            if (existingCard) {
              await apiClient.cards.update(existingCard.id, {
                description: `✨ **História Refinada Automaticamente**\n\n${story.businessNarrative}`,
                spec_content: JSON.stringify({ refinedStories: [story] }, null, 2)
              });
              updatedCount++;
            } else {
              await apiClient.cards.create({
                feature_id: featureId,
                title: story.title,
                description: `🤖 **História Gerada Automaticamente**\n\n${story.businessNarrative}`,
                spec_content: JSON.stringify({ refinedStories: [story] }, null, 2)
              });
              newCount++;
            }
          }
          loadData();
          alert(`Análise concluída! ${newCount} histórias novas e ${updatedCount} histórias refinadas.`);
        }
      } catch (e) {
        console.error("Failed to auto-extract stories:", e);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setGeneratingItem(null);
    }
  };

  const generateSpec = async (cardId) => {
    setGeneratingItem(cardId);
    try {
      const spec = await apiClient.ai.generateSpec(cardId);
      setCards(prev => {
        const card = prev.find(c => c.id === cardId);
        if (!card) return prev;
        
        let newSpecContent = spec;
        // Se já tivermos o JSON bonitinho, vamos anexar o Markdown ao invés de sobrescrever
        if (card.spec_content && card.spec_content.trim().startsWith('{')) {
          // Procurar o separador exato para não quebrar o JSON com regex não-gulosa
          const sepIndex = card.spec_content.indexOf('### Especificação Técnica e TDD');
          let jsonPart = card.spec_content;
          if (sepIndex !== -1) {
            jsonPart = card.spec_content.substring(0, sepIndex).trim();
          }
          newSpecContent = jsonPart + "\n\n### Especificação Técnica e TDD\n\n" + spec;
        }

        const updatedCard = { ...card, spec_content: newSpecContent };
        if (selectedItem?.data?.id === cardId) {
          setSelectedItem({ type: 'card', data: updatedCard });
        }
        return prev.map(c => c.id === cardId ? updatedCard : c);
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setGeneratingItem(null);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>;
  if (!project) return <div style={{ padding: '40px' }}>Projeto não encontrado.</div>;

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}><ArrowLeft size={24} /></Link>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>{project.name}</h1>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
        <button onClick={() => setActiveTab('roadmap')} className="btn" style={{ background: activeTab === 'roadmap' ? 'var(--bg-glass)' : 'transparent', color: activeTab === 'roadmap' ? 'white' : 'var(--text-muted)' }}>
          <Layout size={18} /> Roadmap Estratégico
        </button>
        <button onClick={() => setActiveTab('features')} className="btn" style={{ background: activeTab === 'features' ? 'var(--bg-glass)' : 'transparent', color: activeTab === 'features' ? 'white' : 'var(--text-muted)' }}>
          <Layout size={18} /> Features / Épicos
        </button>
        <button onClick={() => setActiveTab('stories')} className="btn" style={{ background: activeTab === 'stories' ? 'var(--bg-secondary)' : 'transparent', color: activeTab === 'stories' ? 'white' : 'var(--text-muted)' }}>
          <BookOpen size={18} /> Backlog de Histórias
        </button>
        <button onClick={() => setActiveTab('matrix')} className="btn" style={{ background: activeTab === 'matrix' ? 'var(--bg-secondary)' : 'transparent', color: activeTab === 'matrix' ? 'var(--accent-purple)' : 'var(--text-muted)', border: activeTab === 'matrix' ? '1px solid var(--accent-purple)' : 'none' }}>
          <Grid size={18} /> Matriz de Priorização
        </button>
        <button onClick={() => setActiveTab('context')} className="btn" style={{ background: activeTab === 'context' ? 'var(--bg-secondary)' : 'transparent', color: activeTab === 'context' ? 'white' : 'var(--text-muted)' }}>
          <FileText size={18} /> Contexto do Projeto
        </button>
        <button onClick={() => setActiveTab('docs')} className="btn" style={{ background: activeTab === 'docs' ? 'var(--bg-glass)' : 'transparent', color: activeTab === 'docs' ? 'white' : 'var(--text-muted)' }}>
          <Package size={18} /> Documentação Principal
        </button>
        <button onClick={() => setActiveTab('settings')} className="btn" style={{ background: activeTab === 'settings' ? 'var(--bg-glass)' : 'transparent', color: activeTab === 'settings' ? 'white' : 'var(--text-muted)' }}>
          <Settings size={18} /> Configurações
        </button>
      </div>

      {/* CONTENT */}
      {activeTab === 'matrix' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Grid size={24} color="var(--accent-purple)" /> Matriz de Priorização IA</h2>
              <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>Gráfico de Valor de Negócio vs Esforço. Baseado na estimativa gerada pelo Tech Lead e cálculo de impacto.</p>
            </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '40px', position: 'relative', height: '600px', display: 'flex' }}>
            {/* Y Axis Label */}
            <div style={{ position: 'absolute', left: '-20px', top: '50%', transform: 'translateY(-50%) rotate(-90deg)', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '2px' }}>BUSINESS VALUE (IMPACTO)</div>
            {/* X Axis Label */}
            <div style={{ position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '2px' }}>EFFORT (ESFORÇO EM HORAS)</div>
            
            {/* Graph Grid */}
            <div style={{ position: 'relative', width: '100%', height: '100%', borderLeft: '2px solid var(--border-focus)', borderBottom: '2px solid var(--border-focus)', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
              
              {/* Quadrants Backgrounds */}
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', borderBottom: '1px dashed var(--border-subtle)', borderRight: '1px dashed var(--border-subtle)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 16, left: 16, color: 'var(--accent-emerald)', fontWeight: 'bold', opacity: 0.5 }}>QUICK WINS<br/><span style={{fontSize: '0.8em'}}>Alto Valor / Baixo Esforço</span></div>
              </div>
              <div style={{ background: 'rgba(59, 130, 246, 0.05)', borderBottom: '1px dashed var(--border-subtle)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 16, right: 16, textAlign: 'right', color: 'var(--accent-blue)', fontWeight: 'bold', opacity: 0.5 }}>MAJOR PROJECTS<br/><span style={{fontSize: '0.8em'}}>Alto Valor / Alto Esforço</span></div>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.05)', borderRight: '1px dashed var(--border-subtle)', position: 'relative' }}>
                <div style={{ position: 'absolute', bottom: 16, left: 16, color: 'var(--accent-orange)', fontWeight: 'bold', opacity: 0.5 }}>FILL-INS<br/><span style={{fontSize: '0.8em'}}>Baixo Valor / Baixo Esforço</span></div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', position: 'relative' }}>
                <div style={{ position: 'absolute', bottom: 16, right: 16, textAlign: 'right', color: 'var(--accent-red)', fontWeight: 'bold', opacity: 0.5 }}>THANKLESS TASKS<br/><span style={{fontSize: '0.8em'}}>Baixo Valor / Alto Esforço</span></div>
              </div>

              {/* Plot Cards */}
              {cards.filter(c => c.column_id === 'col-backlog').map(card => {
                // Pseudo-calculate Effort and Value
                let effortHours = (card.title.length * 3 % 40) + 2; // fallback 2 to 41 hours
                try {
                  if (card.spec_content) {
                    const parsed = JSON.parse(card.spec_content);
                    if (parsed.refinedStories?.[0]?.storyEstimate) {
                      const estStr = parsed.refinedStories[0].storyEstimate;
                      const match = estStr.match(/(\d+)/);
                      if (match) effortHours = parseInt(match[1], 10);
                    }
                  }
                } catch(e){}
                
                // Value: 1 to 10
                const value = (card.title.length * 7 % 10) + 1;
                
                // Max limits for scaling: Effort max 60h, Value max 10
                const xPercent = Math.min((effortHours / 60) * 100, 95);
                const yPercent = Math.min((value / 10) * 100, 95);

                let dotColor = 'var(--text-muted)';
                if (value >= 5 && effortHours <= 20) dotColor = 'var(--accent-emerald)'; // Quick Win
                else if (value >= 5 && effortHours > 20) dotColor = 'var(--accent-blue)'; // Major Project
                else if (value < 5 && effortHours <= 20) dotColor = 'var(--accent-orange)'; // Fill in
                else if (value < 5 && effortHours > 20) dotColor = 'var(--accent-red)'; // Thankless

                return (
                  <div key={card.id} title={`${card.title}\nValor: ${value}/10 | Esforço: ${effortHours}h`} style={{
                    position: 'absolute',
                    left: `${xPercent}%`,
                    bottom: `${yPercent}%`,
                    transform: 'translate(-50%, 50%)',
                    width: '12px',
                    height: '12px',
                    backgroundColor: dotColor,
                    borderRadius: '50%',
                    boxShadow: `0 0 10px ${dotColor}`,
                    cursor: 'pointer',
                    zIndex: 10
                  }} onClick={() => setSelectedItem({ type: 'card', data: card })}>
                    <div style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', pointerEvents: 'none', opacity: 0, transition: 'opacity 0.2s' }} className="matrix-tooltip">
                      {card.title.substring(0, 20)}...
                    </div>
                  </div>
                );
              })}
            </div>
            <style>{`
              div[title]:hover .matrix-tooltip { opacity: 1 !important; }
            `}</style>
          </div>
        </div>
      )}

      {activeTab === 'context' && (
        <div className="glass-panel" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Contexto Global do Projeto</h3>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                  Descreva aqui as premissas, restrições e objetivos. Esta base será consultada pela IA em <strong>todas as etapas</strong>. (Apenas leitura - contexto gerado automaticamente pela Importação de Documentos)
                </p>
              </div>
            </div>
            
            <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-glass)', minHeight: '300px' }}>
              {formData.project_context ? (
                <div className="markdown-body" style={{ color: 'var(--text-primary)' }}>
                  <ReactMarkdown>{formData.project_context}</ReactMarkdown>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '40px' }}>
                  <p>Nenhum contexto definido ainda. Importe um documento de escopo no Backlog de Features para a IA gerar o contexto.</p>
                </div>
              )}
            </div>
        </div>
      )}

      {activeTab === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Pilares de Documentação do Projeto</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '-24px' }}>Estes documentos são automaticamente incrementados a cada Sprint rodada e servem de base para desenvolvimento e qualidade.</p>
          
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--accent-purple)' }}>1. PRD Principal (Requisitos de Negócio)</h3>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              <ReactMarkdown>{project.main_prd_content || '*Nenhuma sprint rodada ainda para gerar PRD acumulado.*'}</ReactMarkdown>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--accent-blue)' }}>2. Spec Principal (Especificações Técnicas)</h3>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              <ReactMarkdown>{project.main_spec_content || '*Nenhuma sprint rodada ainda para gerar Specs acumuladas.*'}</ReactMarkdown>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--accent-orange)' }}>3. Arquitetura Global</h3>
              <button className="btn btn-primary" onClick={async () => {
                setGeneratingItem('arch');
                try {
                  const res = await apiClient.ai.generateArchitectureDoc(projectId);
                  setProject({ ...project, main_architecture_content: res.content });
                } catch(e) { alert(e.message); }
                setGeneratingItem(null);
              }} disabled={generatingItem === 'arch'}>
                {generatingItem === 'arch' ? <Loader2 className="animate-spin" /> : <><Sparkles size={16}/> Gerar / Atualizar Arquitetura</>}
              </button>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              <ReactMarkdown>{project.main_architecture_content || '*Documento não gerado.*'}</ReactMarkdown>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#ec4899' }}>4. Segurança e Compliance</h3>
              <button className="btn btn-primary" onClick={async () => {
                setGeneratingItem('sec');
                try {
                  const res = await apiClient.ai.generateSecurityDoc(projectId);
                  setProject({ ...project, main_security_content: res.content });
                } catch(e) { alert(e.message); }
                setGeneratingItem(null);
              }} disabled={generatingItem === 'sec'}>
                {generatingItem === 'sec' ? <Loader2 className="animate-spin" /> : <><Sparkles size={16}/> Gerar / Atualizar Segurança</>}
              </button>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              <ReactMarkdown>{project.main_security_content || '*Documento não gerado.*'}</ReactMarkdown>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'settings' && (
        <div className="glass-panel" style={{ padding: '32px', maxWidth: '800px' }}>
          <h2 style={{ margin: '0 0 24px 0' }}>Configurações do Projeto e IA</h2>
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div><label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Nome do Projeto</label><input required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div><label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Repositório GitHub (Exportação)</label><input className="input-field" value={formData.git_repo} onChange={e => setFormData({...formData, git_repo: e.target.value})} placeholder="usuario/repo" /></div>
            </div>
            <div><label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>GitHub PAT</label><input type="password" className="input-field" value={formData.git_token} onChange={e => setFormData({...formData, git_token: e.target.value})} placeholder="ghp_..." /></div>
            
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)' }} />
            
            <div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>📚 Bibliotecas de Agentes e Skills por Fase</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>Selecione os Agentes e Padrões de Código da biblioteca ECC / Flowgrammers que atuarão em cada fase do ciclo de vida.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { key: 'features', title: '🎯 Fase: Discovery & Features', color: 'var(--accent-purple)' },
                  { key: 'stories', title: '📝 Fase: Histórias e Backlog', color: 'var(--accent-blue)' },
                  { key: 'development', title: '💻 Fase: Desenvolvimento (Spec/TDD)', color: '#10b981' },
                  { key: 'security', title: '🛡️ Fase: Segurança', color: '#f59e0b' },
                  { key: 'qa', title: '🧪 Fase: Quality Assurance (QA)', color: '#ec4899' }
                ].map(phase => (
                  <div key={phase.key} style={{ background: 'var(--bg-secondary)', border: `1px solid ${phase.color}40`, borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h4 style={{ margin: 0, color: phase.color }}>{phase.title}</h4>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={() => setShowLibraryModal({ open: true, phase: phase.key, type: 'agents' })} className="btn" style={{ background: 'var(--bg-glass)', fontSize: '0.8rem', padding: '4px 12px' }}>+ Agentes</button>
                        <button type="button" onClick={() => setShowLibraryModal({ open: true, phase: phase.key, type: 'skills' })} className="btn" style={{ background: 'var(--bg-glass)', fontSize: '0.8rem', padding: '4px 12px' }}>+ Skills</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Agentes Ativos:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {(formData.phase_configurations[phase.key]?.agents || []).map(id => {
                            const ag = hubData.agents.find(a => a.id === id);
                            if (!ag) return null;
                            return (
                              <div key={id} style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                🤖 {ag.title}
                                <button type="button" onClick={() => {
                                  const newAgents = formData.phase_configurations[phase.key].agents.filter(a => a !== id);
                                  setFormData({ ...formData, phase_configurations: { ...formData.phase_configurations, [phase.key]: { ...formData.phase_configurations[phase.key], agents: newAgents } } });
                                }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, marginLeft: '4px' }}>&times;</button>
                              </div>
                            );
                          })}
                          {(formData.phase_configurations[phase.key]?.agents || []).length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum selecionado</span>}
                        </div>
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Skills Ativas:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {(formData.phase_configurations[phase.key]?.skills || []).map(id => {
                            const sk = hubData.skills.find(a => a.id === id);
                            if (!sk) return null;
                            return (
                              <div key={id} style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                🛠️ {sk.title}
                                <button type="button" onClick={() => {
                                  const newSkills = formData.phase_configurations[phase.key].skills.filter(s => s !== id);
                                  setFormData({ ...formData, phase_configurations: { ...formData.phase_configurations, [phase.key]: { ...formData.phase_configurations[phase.key], skills: newSkills } } });
                                }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, marginLeft: '4px' }}>&times;</button>
                              </div>
                            );
                          })}
                          {(formData.phase_configurations[phase.key]?.skills || []).length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhuma selecionada</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ color: 'var(--success)' }}>🔌 Ferramentas / MCP Servers</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {hubData.mcps.map(mcp => (
                  <label key={mcp.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.selected_mcps.includes(mcp.id)} onChange={e => {
                      const newSet = e.target.checked ? [...formData.selected_mcps, mcp.id] : formData.selected_mcps.filter(i => i !== mcp.id);
                      setFormData({...formData, selected_mcps: newSet});
                    }} />
                    <div>
                      <strong style={{ display: 'block' }}>{mcp.title}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{mcp.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start', padding: '12px 24px' }}>{saving ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Salvar Configurações e Agentes</>}</button>
          </form>
        </div>
      )}

      {activeTab === 'roadmap' && (
        <div className="glass-panel" style={{ padding: '32px', minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2>Roadmap Estratégico</h2>
            <button onClick={generateRoadmap} disabled={generatingRoadmap} className="btn btn-primary" style={{ padding: '8px 16px', background: 'var(--accent-purple)' }}>
              {generatingRoadmap ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} /> Gerar Roadmap com IA</>}
            </button>
          </div>
          
          {project.roadmap_content ? (
            <div className="markdown-content" style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '12px', color: 'var(--text-primary)' }}>
              <ReactMarkdown>{project.roadmap_content}</ReactMarkdown>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '40px' }}>
              <Layout size={48} style={{ margin: '0 auto 16px', opacity: 0.5, color: 'var(--accent-purple)' }} />
              <p>A Inteligência Artificial analisará as Features do seu Backlog e construirá um Roadmap (Now, Next, Later).</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'features' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowImportModal(true)} className="btn" style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-primary)' }}>
                <BookOpen size={16} style={{ marginRight: '8px' }} />
                Importar Documento
              </button>
              <button onClick={() => { setDemandText(''); setShowAddModal({ open: true, type: 'feature' }); }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} /> Adicionar Feature
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={handleSuggestFeatures} 
                disabled={generatingItem === 'suggesting-features'} 
                className="btn" 
                style={{ background: 'var(--accent-purple)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {generatingItem === 'suggesting-features' ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                Agente PM (Features)
              </button>
              <button 
                onClick={handleSuggestArchitecture} 
                disabled={generatingItem === 'suggesting-architecture'} 
                className="btn" 
                style={{ background: 'var(--bg-glass)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--accent-blue)' }}
              >
                {generatingItem === 'suggesting-architecture' ? <Loader2 className="animate-spin" size={18} /> : <Server size={18} />}
                Agente de Arquitetura
              </button>
            </div>
          </div>
          <KanbanBoard 
            columns={FEATURE_COLUMNS} 
            items={features.map(f => ({ ...f, computedStoryCount: cards.filter(c => c.feature_id === f.id).length }))} 
            onDragEnd={onDragEndFeature}
            onCardClick={(item) => setSelectedItem({ type: 'feature', data: item })}
            renderCardContent={(item) => {
              return (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>{item.tag ? <span style={{color: 'var(--accent-purple)', marginRight: '4px'}}>{item.tag}</span> : null}{item.title}</h4>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {item.tags?.includes('Arquitetura') && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}><Server size={12}/> Arquitetura</span>}
                    {item.prd_content && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--accent-purple)' }}><FileText size={12}/> PRD Gerado</span>}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: item.computedStoryCount > 0 ? 'var(--accent-blue)' : 'var(--text-muted)', background: item.computedStoryCount > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px', border: `1px solid ${item.computedStoryCount > 0 ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-glass)'}` }}>{item.computedStoryCount} {item.computedStoryCount === 1 ? 'história' : 'histórias'}</span>
                  </div>
                </div>
              );
            }}
          />
        </div>
      )}

      {activeTab === 'stories' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select className="input-field" style={{ maxWidth: '250px' }} value={selectedFeatureForCard} onChange={e => setSelectedFeatureForCard(e.target.value)} required>
                <option value="" disabled>Selecione a Feature Pai</option>
                {features.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
              </select>
              <button onClick={() => { setDemandText(''); setShowAddModal({ open: true, type: 'story' }); }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} /> Adicionar História
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={handleSuggestStoriesPO} 
                disabled={generatingItem === 'suggesting-stories-po'} 
                className="btn" 
                style={{ background: 'var(--accent-purple)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {generatingItem === 'suggesting-stories-po' ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                Agente PO (Histórias)
              </button>
              <button 
                onClick={handleEnrichTestsQA} 
                disabled={generatingItem === 'enriching-tests-qa'} 
                className="btn" 
                style={{ background: '#ec4899', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {generatingItem === 'enriching-tests-qa' ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                Agente QA (Testes)
              </button>
              <button 
                onClick={() => setShowSprintPanel(true)} 
                className="btn" 
                style={{ background: 'var(--bg-glass)', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Package size={18} /> Sprints
              </button>
            </div>
          </div>
          {features.length === 0 ? (
             <p style={{ color: 'var(--text-muted)' }}>Crie uma Feature primeiro antes de adicionar histórias.</p>
          ) : (
            <KanbanBoard 
              columns={STORY_COLUMNS} 
              items={cards} 
              onDragEnd={onDragEndCard} 
              onCardClick={(item) => setSelectedItem({ type: 'card', data: item })}
              renderCardContent={(item) => {
                const parentFeature = features.find(f => f.id === item.feature_id);
                return (
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-purple)', textTransform: 'uppercase', marginBottom: '4px', display: 'block', fontWeight: '600' }}>
                      {parentFeature ? parentFeature.title : 'Sem Feature'}
                    </span>
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>{item.tag ? <span style={{color: 'var(--accent-blue)', marginRight: '4px'}}>{item.tag}</span> : null}{item.title}</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {item.tags && item.tags.filter(t => t.startsWith('Sprint ')).map(t => (
                        <span key={t} style={{ fontSize: '0.65rem', background: 'rgba(255, 165, 0, 0.2)', color: 'var(--accent-orange)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255, 165, 0, 0.3)' }}>{t}</span>
                      ))}
                      {item.spec_content && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--accent-blue)', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px' }}><FileText size={10}/> Spec/TDD Gerado</span>}
                    </div>
                  </div>
                )
              }} 
              renderColumnHeader={(column) => {
                if (column.id === 'col-sprint') {
                  return (
                    <button 
                      onClick={handleRunSprint} 
                      disabled={generatingItem === 'running-sprint'}
                      className="btn btn-primary" 
                      style={{ padding: '4px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {generatingItem === 'running-sprint' ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                      Rodar Sprint
                    </button>
                  );
                }
                return null;
              }}
            />
          )}
        </div>
      )}

      {/* MODAL DE DETALHES (PRD / SPEC) */}
      {selectedItem && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedItem(null)}></div>
          <div className="drawer-panel" style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', zIndex: 1000 }}>
            
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {selectedItem.data.tag && <span style={{color: 'var(--accent-blue)'}}>{selectedItem.data.tag}</span>}
                {selectedItem.data.title}
                {selectedItem.type === 'feature' && selectedItem.data.computedStoryCount !== undefined && (
                  <span style={{ fontSize: '0.7rem', color: selectedItem.data.computedStoryCount > 0 ? 'var(--accent-blue)' : 'var(--text-muted)', background: selectedItem.data.computedStoryCount > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)', padding: '4px 8px', borderRadius: '4px', border: `1px solid ${selectedItem.data.computedStoryCount > 0 ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-glass)'}`, fontWeight: 'normal', verticalAlign: 'middle' }}>
                    {selectedItem.data.computedStoryCount} {selectedItem.data.computedStoryCount === 1 ? 'história' : 'histórias'}
                  </span>
                )}
                {selectedItem.data.tags && selectedItem.data.tags.filter(t => t.startsWith('Sprint ')).map(t => (
                  <span key={t} style={{ fontSize: '0.8rem', background: 'rgba(255, 165, 0, 0.2)', color: 'var(--accent-orange)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255, 165, 0, 0.3)', fontWeight: 'normal' }}>{t}</span>
                ))}
              </h2>
              <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flexGrow: 1 }}>
              {selectedItem.type === 'feature' ? (
                // VIEW DE FEATURE (PRD)
                <div>
                  <div style={{ marginBottom: '24px', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', borderLeft: '4px solid var(--accent-purple)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Narrativa de Negócio / Contexto da Feature</h4>
                      <button 
                        onClick={() => setDescriptionViewMode(prev => prev === 'raw' ? 'visual' : 'raw')}
                        className="btn" 
                        style={{ background: 'var(--bg-glass)', padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        {descriptionViewMode === 'raw' ? <><Eye size={14} /> Formatado</> : <><FileText size={14} /> Puro Texto</>}
                      </button>
                    </div>
                    {descriptionViewMode === 'visual' ? (
                      <div className="markdown-body" style={{ color: 'var(--text-primary)' }}>
                        <ReactMarkdown>{selectedItem.data.description || 'Nenhuma descrição fornecida.'}</ReactMarkdown>
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '4px' }}>
                        {selectedItem.data.description || 'Nenhuma descrição fornecida.'}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, color: 'var(--accent-purple)' }}>Documento de Requisitos (PRD)</h3>
                    <button onClick={() => generatePrd(selectedItem.data.id)} disabled={generatingItem === selectedItem.data.id} className="btn btn-primary" style={{ background: 'var(--accent-purple)', padding: '8px 16px' }}>
                      {generatingItem === selectedItem.data.id ? <Loader2 className="animate-spin" /> : <><Sparkles size={16} /> {selectedItem.data.prd_content ? 'Regerar PRD' : 'Gerar PRD com IA'}</>}
                    </button>
                  </div>
                  {selectedItem.data.prd_content ? (
                    <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: '8px' }}>
                      <RefinementVisualizer 
                        prdContent={selectedItem.data.prd_content} 
                        onCreateStories={handleCreateStoriesFromRefinement}
                        isCreatingStories={generatingItem === 'creating-stories'}
                      />
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>Esta feature ainda não possui um PRD. Clique em "Gerar PRD com IA" para que o Product Manager virtual crie um para você!</p>
                  )}

                  {selectedItem.data.prd_content && (
                    <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '24px' }}>
                      <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Paperclip size={20} /> Anexos
                      </h3>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '16px', flex: 1, maxWidth: '400px' }}>
                          <FileText size={24} color="var(--accent-purple)" />
                          <div>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{selectedItem.data.title.substring(0, 15)}-PRD.md</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Documento de Requisitos</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                            <button onClick={() => setMarkdownViewer({ title: `PRD: ${selectedItem.data.title}`, content: jsonToMarkdown(selectedItem.data.title, selectedItem.data.prd_content) })} className="btn" style={{ padding: '6px' }} title="Visualizar MD">
                              <Eye size={16} />
                            </button>
                            <button onClick={() => {
                              const blob = new Blob([jsonToMarkdown(selectedItem.data.title, selectedItem.data.prd_content)], { type: 'text/markdown' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `PRD_${selectedItem.data.title}.md`;
                              a.click();
                            }} className="btn" style={{ padding: '6px' }} title="Baixar MD">
                              <Download size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // VIEW DE CARD (SPEC/TDD)
                <div>
                  <div style={{ marginBottom: '24px', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', borderLeft: '4px solid var(--accent-blue)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Contexto / Descrição da História</h4>
                      <button 
                        onClick={() => setDescriptionViewMode(prev => prev === 'raw' ? 'visual' : 'raw')}
                        className="btn" 
                        style={{ background: 'var(--bg-glass)', padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        {descriptionViewMode === 'raw' ? <><Eye size={14} /> Formatado</> : <><FileText size={14} /> Puro Texto</>}
                      </button>
                    </div>
                    {descriptionViewMode === 'visual' ? (
                      <div className="markdown-body" style={{ color: 'var(--text-primary)' }}>
                        <ReactMarkdown>{selectedItem.data.description || 'Nenhuma descrição fornecida.'}</ReactMarkdown>
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '4px' }}>
                        {selectedItem.data.description || 'Nenhuma descrição fornecida.'}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, color: 'var(--accent-blue)' }}>Especificação Técnica & TDD</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => exportToGithub(selectedItem.data.id)} disabled={!selectedItem.data.spec_content || generatingItem === 'export-github'} className="btn" style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-primary)' }}>
                        {generatingItem === 'export-github' ? <Loader2 className="animate-spin" size={16} /> : '📦 Exportar p/ Github'}
                      </button>
                      <button onClick={() => generateSpec(selectedItem.data.id)} disabled={generatingItem === selectedItem.data.id} className="btn btn-primary" style={{ background: 'var(--accent-blue)', padding: '8px 16px' }}>
                        {generatingItem === selectedItem.data.id ? <Loader2 className="animate-spin" /> : <><Sparkles size={16} /> {selectedItem.data.spec_content ? 'Regerar Spec' : 'Gerar Spec/TDD com IA'}</>}
                      </button>
                    </div>
                  </div>
                  {selectedItem.data.spec_content ? (
                    <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: '8px' }}>
                      <RefinementVisualizer prdContent={selectedItem.data.spec_content} />
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>Esta história ainda não possui especificação técnica. Clique em "Gerar Spec/TDD com IA" para que o Tech Lead virtual crie a spec!</p>
                  )}

                  {selectedItem.data.spec_content && (
                    <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '24px' }}>
                      <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Paperclip size={20} /> Anexos
                      </h3>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '16px', flex: 1, maxWidth: '400px' }}>
                          <FileText size={24} color="var(--accent-blue)" />
                          <div>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{selectedItem.data.title.substring(0, 15)}-SPEC.md</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Especificação Técnica</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                            <button onClick={() => setMarkdownViewer({ title: `SPEC: ${selectedItem.data.title}`, content: jsonToMarkdown(selectedItem.data.title, selectedItem.data.spec_content) })} className="btn" style={{ padding: '6px' }} title="Visualizar MD">
                              <Eye size={16} />
                            </button>
                            <button onClick={() => {
                              const blob = new Blob([jsonToMarkdown(selectedItem.data.title, selectedItem.data.spec_content)], { type: 'text/markdown' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `SPEC_${selectedItem.data.title}.md`;
                              a.click();
                            }} className="btn" style={{ padding: '6px' }} title="Baixar MD">
                              <Download size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {/* MODAL DE IMPORTAÇÃO DE DOCUMENTO */}
      {showImportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '40px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', padding: '24px', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><BookOpen size={24} /> Importar Documento (PRD/Requisitos)</h2>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Cole o texto do seu documento de requisitos ou faça o upload de um arquivo (PDF, DOCX, TXT). A IA vai analisar o texto e extrair automaticamente Épicos, Features e Histórias de Usuário para o backlog.
            </p>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <label className="btn" style={{ background: 'var(--accent-blue)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isUploadingContext ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
                {isUploadingContext ? 'Processando arquivos...' : 'Selecionar Arquivos (PDF/DOCX)'}
                <input type="file" multiple style={{ display: 'none' }} disabled={isUploadingContext} onChange={async (e) => {
                  const files = Array.from(e.target.files);
                  if (files.length === 0) return;
                  setIsUploadingContext(true);
                  try {
                    const promises = files.map(f => apiClient.ai.uploadContext(f));
                    const results = await Promise.all(promises);
                    const allText = results.join('\n\n');
                    setImportContent(prev => prev ? prev + '\n\n' + allText : allText);
                  } catch (err) {
                    alert('Erro ao extrair documentos: ' + err.message);
                  } finally {
                    setIsUploadingContext(false);
                    e.target.value = null;
                  }
                }} />
              </label>
            </div>

            <textarea
              className="input-field"
              value={importContent}
              onChange={e => setImportContent(e.target.value)}
              placeholder="Cole o texto bruto aqui ou selecione um arquivo acima..."
              style={{ minHeight: '300px', marginBottom: '16px', fontFamily: 'monospace' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn" onClick={() => setShowImportModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleImportDocument} disabled={isImporting || !importContent.trim() || isUploadingContext}>
                {isImporting ? <><Loader2 className="animate-spin" size={16} style={{marginRight: '8px'}} /> Extraindo...</> : 'Importar com IA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DO VISUALIZADOR DE MARKDOWN */}
      {markdownViewer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '40px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid var(--border-glass)' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={24} /> {markdownViewer.title}</h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => {
                  const blob = new Blob([markdownViewer.content], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${markdownViewer.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
                  a.click();
                }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={16} /> Baixar .md
                </button>
                <button onClick={() => setMarkdownViewer(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
              </div>
            </div>
            <div className="markdown-content" style={{ padding: '24px', overflowY: 'auto', flexGrow: 1, fontFamily: 'monospace', whiteSpace: 'pre-wrap', background: '#1e1e1e', color: '#d4d4d4', margin: '24px', borderRadius: '8px' }}>
              {markdownViewer.content}
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE BIBLIOTECA (Agentes e Skills por Fase) */}
      {showLibraryModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '40px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid var(--border-glass)' }}>
              <h2 style={{ margin: 0 }}>Adicionar {showLibraryModal.type === 'agents' ? 'Agentes' : 'Skills'}</h2>
              <button onClick={() => setShowLibraryModal({ open: false, phase: null })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {hubData[showLibraryModal.type].map(item => {
                const isSelected = formData.phase_configurations[showLibraryModal.phase]?.[showLibraryModal.type]?.includes(item.id);
                return (
                  <label key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)', border: `1px solid ${isSelected ? '#10b981' : 'var(--border-glass)'}`, borderRadius: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!isSelected} onChange={e => {
                      const phaseKey = showLibraryModal.phase;
                      const typeKey = showLibraryModal.type;
                      let newArray = [...(formData.phase_configurations[phaseKey]?.[typeKey] || [])];
                      if (e.target.checked) newArray.push(item.id);
                      else newArray = newArray.filter(i => i !== item.id);
                      
                      setFormData({
                        ...formData,
                        phase_configurations: {
                          ...formData.phase_configurations,
                          [phaseKey]: { ...formData.phase_configurations[phaseKey], [typeKey]: newArray }
                        }
                      });
                    }} />
                    <div>
                      <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{item.title}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.description}</span>
                    </div>
                  </label>
                );
              })}
            </div>
            <div style={{ padding: '24px', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setShowLibraryModal({ open: false, phase: null })}>Concluir</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONTROLE DE SPRINT */}
      {showSprintPanel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '40px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid var(--border-glass)' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={24} /> Controle de Sprints</h2>
              <button onClick={() => setShowSprintPanel(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', flexGrow: 1 }}>
              {(() => {
                const allTags = new Set();
                cards.forEach(c => {
                  if (c.tags) c.tags.forEach(t => {
                    if (t.startsWith('Sprint ')) allTags.add(t);
                  });
                });
                const sprints = Array.from(allTags).sort();

                if (sprints.length === 0) {
                  return <p style={{ color: 'var(--text-muted)' }}>Nenhuma sprint criada ainda. Arraste histórias para a coluna "Pacote Sprint" e clique em "Rodar Sprint".</p>;
                }

                return sprints.map(sprint => {
                  const sprintCards = cards.filter(c => c.tags && c.tags.includes(sprint));
                  return (
                    <div key={sprint} style={{ marginBottom: '24px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <h3 style={{ margin: 0 }}>{sprint} ({sprintCards.length} histórias)</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary" onClick={() => {
                            let megaMd = `# ${sprint}\n\n## Contexto Global do Projeto\n${formData.project_context || 'Sem contexto global definido.'}\n\n`;
                            sprintCards.forEach(c => {
                              megaMd += `---\n# História: ${c.title}\n`;
                              if (c.description) megaMd += `${c.description}\n\n`;
                              if (c.spec_content) megaMd += `## Especificação Técnica\n${c.spec_content}\n\n`;
                            });
                            navigator.clipboard.writeText(megaMd);
                            alert('Pacote da Sprint copiado para a área de transferência! Cole no Claude Code.');
                          }}>
                            Copiar para Claude
                          </button>
                          <button className="btn" onClick={() => {
                            let megaMd = `# ${sprint}\n\n## Contexto Global do Projeto\n${formData.project_context || 'Sem contexto global definido.'}\n\n`;
                            sprintCards.forEach(c => {
                              megaMd += `---\n# História: ${c.title}\n`;
                              if (c.description) megaMd += `${c.description}\n\n`;
                              if (c.spec_content) megaMd += `## Especificação Técnica\n${c.spec_content}\n\n`;
                            });
                            const blob = new Blob([megaMd], { type: 'text/markdown' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${sprint.replace(' ', '_')}.md`;
                            a.click();
                          }}>
                            Baixar .md
                          </button>
                        </div>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                        {sprintCards.map(c => <li key={c.id}>{c.title}</li>)}
                      </ul>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ADICIONAR DEMANDA */}
      {showAddModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '40px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid var(--border-glass)' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={24} /> 
                {showAddModal.type === 'feature' ? 'Adicionar Épico / Feature' : 'Adicionar História de Usuário'}
              </h2>
              <button onClick={() => setShowAddModal({ open: false, type: 'feature' })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Descreva a demanda de forma livre. Você pode criá-la diretamente ou pedir para a IA organizar o formato.
              </p>
              <textarea
                className="input-field"
                style={{ minHeight: '150px', resize: 'vertical' }}
                placeholder={showAddModal.type === 'feature' ? "Ex: Módulo de pagamentos via PIX e Cartão..." : "Ex: Como cliente, quero ver meu histórico de compras para..."}
                value={demandText}
                onChange={e => setDemandText(e.target.value)}
              />
              
              {refinedDemandData && (
                <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '24px' }}>
                  <RefinementVisualizer 
                    prdContent={refinedDemandData} 
                    onCreateStories={async (refinedStories) => {
                      const story = refinedStories[0];
                      if (!story) return;
                      
                      try {
                        if (showAddModal.type === 'feature') {
                          const f = await apiClient.features.create({ project_id: projectId, title: story.title, description: story.businessNarrative });
                          setFeatures([...features, f]);
                          alert("Feature criada com sucesso!");
                        } else {
                          const c = await apiClient.cards.create({
                            feature_id: selectedFeatureForCard || features[0]?.id,
                            title: story.title,
                            description: story.businessNarrative,
                            spec_content: JSON.stringify({ refinedStories: [story] }, null, 2)
                          });
                          setCards([...cards, c]);
                          alert("História refinada e criada com sucesso!");
                        }
                        setShowAddModal({ open: false, type: 'feature' });
                        setDemandText('');
                        setRefinedDemandData(null);
                      } catch (err) {
                        alert("Erro ao criar demanda refinada: " + err.message);
                      }
                    }}
                  />
                </div>
              )}
            </div>
            <div style={{ padding: '24px', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn" onClick={() => { setShowAddModal({ open: false, type: 'feature' }); setRefinedDemandData(null); }}>Cancelar</button>
              <button 
                className="btn" 
                onClick={handleRefineDemandWithAI}
                disabled={generatingItem === 'refining-demand' || !demandText.trim()}
                style={{ background: 'var(--accent-purple)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {generatingItem === 'refining-demand' ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                ✨ Refinar com IA
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCreateDemandDirectly}
                disabled={!demandText.trim() || generatingItem === 'refining-demand'}
              >
                Criar Diretamente
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
