import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import { Plus, X, Folder, Github } from 'lucide-react';

export function Dashboard() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newGitRepo, setNewGitRepo] = useState('');
  const [newGitToken, setNewGitToken] = useState('');

  if (!user) return <Navigate to="/login" />;

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const list = await apiClient.projects.getList();
      setProjects(list);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const project = await apiClient.projects.create(newProjectName, newGitRepo, newGitToken);
      setProjects([...projects, project]);
      setIsModalOpen(false);
      setNewProjectName('');
      setNewGitRepo('');
      setNewGitToken('');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Meus Projetos 
            <span style={{ fontSize: '0.8rem', background: 'var(--accent-blue)', color: 'white', padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold' }}>v1.1 (Stable)</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Bem vindo, {user.email}</p>
        </div>
        <button onClick={logout} className="btn" style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'white' }}>
          Sair
        </button>
      </div>

      {loading ? (
        <p>Carregando projetos...</p>
      ) : projects.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <Folder size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ margin: '0 0 8px 0' }}>Você ainda não possui projetos.</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Crie seu primeiro projeto para começar a gerenciar agentes autônomos.</p>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Criar Novo Projeto
          </button>
        </div>
      ) : (
        <div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ marginBottom: '24px' }}>
            <Plus size={18} /> Novo Projeto
          </button>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {projects.map(proj => (
              <Link to={`/project/${proj.id}`} key={proj.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="glass-panel" style={{ padding: '24px', cursor: 'pointer', transition: 'transform 0.2s ease', ':hover': { transform: 'translateY(-4px)' } }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem' }}>{proj.name}</h3>
                  {proj.git_repo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      <Github size={16} />
                      {proj.git_repo}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ padding: '32px', width: '100%', maxWidth: '400px', position: 'relative' }}>
            <button 
              onClick={() => setIsModalOpen(false)} 
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <h2 style={{ margin: '0 0 24px 0' }}>Novo Projeto</h2>
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Nome do Projeto</label>
                <input required className="input-field" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Ex: App de Delivery" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Repositório GitHub (Opcional)</label>
                <input className="input-field" value={newGitRepo} onChange={e => setNewGitRepo(e.target.value)} placeholder="Ex: usuario/meu-repo" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Token do GitHub (Opcional)</label>
                <input type="password" className="input-field" value={newGitToken} onChange={e => setNewGitToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" />
                <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Necessário para exportação automática do PRD.</p>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', padding: '14px' }}>Criar Projeto</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
