const BASE_URL = '/api';

export const apiClient = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('ai_pm_token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro na requisição');
    }

    return data;
  },

  auth: {
    async login(email, password) {
      const data = await apiClient.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('ai_pm_token', data.token);
      return data.user;
    },
    
    async register(email, password) {
      const data = await apiClient.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('ai_pm_token', data.token);
      return data.user;
    },

    async me() {
      const data = await apiClient.request('/auth/me');
      return data.user;
    },

    logout() {
      localStorage.removeItem('ai_pm_token');
    }
  },

  projects: {
    async getList() {
      const data = await apiClient.request('/projects');
      return data.projects;
    },
    async getById(id) {
      const data = await apiClient.request(`/projects/${id}`);
      return data.project;
    },
    async create(name, git_repo, git_token) {
      const data = await apiClient.request('/projects', {
        method: 'POST',
        body: JSON.stringify({ name, git_repo, git_token })
      });
      return data.project;
    },
    async update(id, updates) {
      const data = await apiClient.request(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return data.project;
    }
  },

  features: {
    async getList(projectId) {
      const data = await apiClient.request(`/features?project_id=${projectId}`);
      return data.features;
    },
    async create(featureData) {
      const data = await apiClient.request('/features', {
        method: 'POST',
        body: JSON.stringify(featureData)
      });
      return data.feature;
    },
    async update(id, updates) {
      const data = await apiClient.request(`/features/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return data.feature;
    }
  },

  cards: {
    async getList(projectId) {
      const data = await apiClient.request(`/cards?project_id=${projectId}`);
      return data.cards;
    },
    async create(cardData) {
      const data = await apiClient.request('/cards', {
        method: 'POST',
        body: JSON.stringify(cardData)
      });
      return data.card;
    },
    async update(id, updates) {
      const data = await apiClient.request(`/cards/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return data.card;
    }
  },

  sprints: {
    async run(projectId, cardIds) {
      return await apiClient.request('/sprints/run', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, card_ids: cardIds })
      });
    }
  },

  ai: {
    async generateRoadmap(projectId) {
      const data = await apiClient.request('/ai/roadmap', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId })
      });
      return data.roadmap;
    },
    async generatePrd(featureId) {
      const data = await apiClient.request('/ai/prd', {
        method: 'POST',
        body: JSON.stringify({ feature_id: featureId })
      });
      return data.prd_content;
    },
    async generateSpec(cardId) {
      const data = await apiClient.request('/ai/spec', {
        method: 'POST',
        body: JSON.stringify({ card_id: cardId })
      });
      return data.spec_content;
    },
    async extractFeatures(text) {
      const data = await apiClient.request('/ai/extract-features', {
        method: 'POST',
        body: JSON.stringify({ document_text: text })
      });
      return data.result;
    },
    async validateStory(projectId, title, description) {
      const data = await apiClient.request('/ai/validate-story', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, title, description })
      });
      return data;
    },
    async refineDemand(projectId, text, type) {
      const data = await apiClient.request('/ai/refine-demand', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, text, type })
      });
      return data;
    },
    async generateArchitectureDoc(projectId) {
      const data = await apiClient.request('/ai/generate-architecture-doc', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId })
      });
      return data;
    },
    async generateSecurityDoc(projectId) {
      const data = await apiClient.request('/ai/generate-security-doc', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId })
      });
      return data;
    },
    async uploadContext(file) {
      const token = localStorage.getItem('ai_pm_token');
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-context', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro no upload do contexto');
      return data.text;
    },
    async suggestFeatures(projectId) {
      const data = await apiClient.request('/ai/suggest-features', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId })
      });
      return data.suggestedFeatures;
    },
    async suggestArchitecture(projectId) {
      const data = await apiClient.request('/ai/suggest-architecture', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId })
      });
      return data.features;
    },
    async importDocument(projectId, content) {
      const data = await apiClient.request('/ai/import-document', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, content })
      });
      return data;
    },
    async poSuggest(projectId) {
      const data = await apiClient.request('/ai/po-suggest', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId })
      });
      return data.suggestedStories;
    },
    async qaEnrich(projectId) {
      const data = await apiClient.request('/ai/qa-enrich', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId })
      });
      return data;
    }
  },

  hub: {
    async getGlobalItems() {
      return await apiClient.request('/hub');
    }
  },

  github: {
    async exportSpec(cardId) {
      return await apiClient.request('/github/export', {
        method: 'POST',
        body: JSON.stringify({ card_id: cardId })
      });
    }
  }
};
