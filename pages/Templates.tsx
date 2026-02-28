import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Tag, Image as ImageIcon, FileText, X } from 'lucide-react';
import { Template, TemplateType } from '../types';

const INITIAL_TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Cobrança Amigável',
    category: 'Financeiro',
    type: TemplateType.TEXT_PDF,
    content: 'Olá {nome}, tudo bem? Notamos que sua fatura venceu dia {data}. Segue o boleto atualizado.',
    attachmentPdf: 'boleto_padrao.pdf'
  },
  {
    id: '2',
    name: 'Boas-vindas Colaborador',
    category: 'RH',
    type: TemplateType.TEXT,
    content: 'Seja bem-vindo(a) ao time, {nome}! Estamos muito felizes em ter você conosco.'
  },
  {
    id: '3',
    name: 'Promoção Relâmpago',
    category: 'Marketing',
    type: TemplateType.TEXT_IMAGE,
    content: 'Olá {nome}! Só hoje temos descontos de até 50% em toda a loja. Aproveite!',
    attachmentImage: 'banner_promo_50.png'
  },
];

const categoryColors: Record<string, string> = {
  'RH': 'bg-purple-100 text-purple-700 border-purple-200',
  'Financeiro': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Operação': 'bg-blue-100 text-blue-700 border-blue-200',
  'Urgente': 'bg-red-100 text-red-700 border-red-200',
  'Marketing': 'bg-amber-100 text-amber-700 border-amber-200',
};

const TemplateBadge: React.FC<{ type: TemplateType }> = ({ type }) => {
  const labels = {
    [TemplateType.TEXT]: 'Texto',
    [TemplateType.TEXT_IMAGE]: 'Texto + Imagem',
    [TemplateType.TEXT_PDF]: 'Texto + PDF',
    [TemplateType.TEXT_IMAGE_PDF]: 'Texto + IMG + PDF'
  };

  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-200 text-slate-600 border border-slate-300">
      {labels[type]}
    </span>
  );
};

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Template>>({
    name: '',
    category: 'Marketing',
    type: TemplateType.TEXT,
    content: '',
    attachmentImage: '',
    attachmentPdf: ''
  });

  useEffect(() => {
    fetch('http://localhost:8000/api/templates')
      .then(res => res.json())
      .then(data => setTemplates(data))
      .catch(err => console.error("Error loading templates", err));
  }, []);

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const highlightVariables = (text: string) => {
    const parts = text.split(/(\{.*?\})/g);
    return parts.map((part, index) => {
      if (part.startsWith('{') && part.endsWith('}')) {
        return <span key={index} className="bg-yellow-100 text-yellow-800 font-mono px-1 rounded text-xs border border-yellow-200">{part}</span>;
      }
      return part;
    });
  };

  const handleOpenModal = (template?: Template) => {
    if (template) {
      setFormData({ ...template });
      setEditingId(template.id);
    } else {
      setFormData({
        name: '',
        category: 'Marketing',
        type: TemplateType.TEXT,
        content: '',
        attachmentImage: '',
        attachmentPdf: ''
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    // Basic Validations
    if (!formData.name || !formData.content) {
      alert("Nome e Mensagem são obrigatórios.");
      return;
    }

    // Type specific validation
    if ((formData.type === TemplateType.TEXT_IMAGE || formData.type === TemplateType.TEXT_IMAGE_PDF) && !formData.attachmentImage) {
      alert("Para este tipo de template, a Imagem é obrigatória.");
      return;
    }
    if ((formData.type === TemplateType.TEXT_PDF || formData.type === TemplateType.TEXT_IMAGE_PDF) && !formData.attachmentPdf) {
      alert("Para este tipo de template, o PDF é obrigatório.");
      return;
    }

    let updatedTemplates = [...templates];
    let newTemplate = { ...formData } as Template;

    if (editingId) {
      newTemplate.id = editingId;
      updatedTemplates = updatedTemplates.map(t => t.id === editingId ? newTemplate : t);
    } else {
      newTemplate.id = Date.now().toString();
      updatedTemplates.push(newTemplate);
    }

    try {
      await fetch('http://localhost:8000/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTemplates)
      });
      setTemplates(updatedTemplates);
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar template");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este template?")) {
      const updated = templates.filter(t => t.id !== id);
      try {
        await fetch('http://localhost:8000/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        });
        setTemplates(updated);
      } catch (e) {
        console.error(e);
        alert("Erro ao excluir template");
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus Templates</h1>
          <p className="text-slate-500 text-sm mt-1">Crie receitas de envio com validação automática de anexos.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 shadow-md shadow-blue-200 transition-all"
        >
          <Plus size={18} />
          Novo Template
        </button>
      </header>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-slate-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
          placeholder="Buscar templates por nome ou conteúdo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${categoryColors[template.category] || 'bg-slate-100 text-slate-800'}`}>
                  {template.category}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => handleOpenModal(template)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(template.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <TemplateBadge type={template.type} />
              </div>

              <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-1" title={template.name}>{template.name}</h3>
              <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[80px] mb-3">
                {highlightVariables(template.content)}
              </div>

              {/* Attachments Preview */}
              <div className="flex flex-col gap-1">
                {template.attachmentImage && (
                  <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100">
                    <ImageIcon size={12} />
                    <span className="truncate">{template.attachmentImage}</span>
                  </div>
                )}
                {template.attachmentPdf && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
                    <FileText size={12} />
                    <span className="truncate">{template.attachmentPdf}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex items-center gap-2 text-xs text-slate-400">
              <Tag size={12} />
              <span>ID: {template.id}</span>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <Search size={24} />
            </div>
            <h3 className="text-slate-900 font-medium">Nenhum template encontrado</h3>
          </div>
        )}
      </div>

      {/* Modal Edit/Create */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Editar Template' : 'Novo Template'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Template</label>
                  <input
                    type="text"
                    className="w-full border-slate-300 rounded-lg text-sm bg-white text-slate-900"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                  <select
                    className="w-full border-slate-300 rounded-lg text-sm bg-white text-slate-900"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                  >
                    <option value="RH">RH</option>
                    <option value="Financeiro">Financeiro</option>
                    <option value="Operação">Operação</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Envio (Define Anexos)</label>
                <select
                  className="w-full border-slate-300 rounded-lg text-sm font-medium text-slate-900 bg-white"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as TemplateType })}
                >
                  <option value={TemplateType.TEXT}>Apenas Texto</option>
                  <option value={TemplateType.TEXT_IMAGE}>Texto + Imagem (Obrigatória)</option>
                  <option value={TemplateType.TEXT_PDF}>Texto + PDF (Obrigatório)</option>
                  <option value={TemplateType.TEXT_IMAGE_PDF}>Texto + Imagem + PDF (Ambos Obrigatórios)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mensagem</label>
                <textarea
                  className="w-full border-slate-300 rounded-lg text-sm h-32 bg-white text-slate-900"
                  placeholder="Use {nome} ou {data} para variáveis..."
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                />
              </div>

              {/* Dynamic Attachment Fields */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Anexos Necessários</h3>

                {(formData.type === TemplateType.TEXT_IMAGE || formData.type === TemplateType.TEXT_IMAGE_PDF) && (
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-1">Caminho da Imagem *</label>
                    <div className="flex gap-2">
                      <div className="w-full flex items-center px-3 py-2 border border-purple-200 rounded-lg bg-purple-50 text-sm">
                        <ImageIcon size={16} className="text-purple-500 mr-2" />
                        <input
                          type="text"
                          className="bg-transparent border-none w-full p-0 text-slate-900 focus:ring-0 placeholder-purple-300"
                          placeholder="ex: C:/imagens/promo.png"
                          value={formData.attachmentImage || ''}
                          onChange={e => setFormData({ ...formData, attachmentImage: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(formData.type === TemplateType.TEXT_PDF || formData.type === TemplateType.TEXT_IMAGE_PDF) && (
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-1">Caminho do PDF *</label>
                    <div className="flex gap-2">
                      <div className="w-full flex items-center px-3 py-2 border border-red-200 rounded-lg bg-red-50 text-sm">
                        <FileText size={16} className="text-red-500 mr-2" />
                        <input
                          type="text"
                          className="bg-transparent border-none w-full p-0 text-slate-900 focus:ring-0 placeholder-red-300"
                          placeholder="ex: C:/docs/boleto.pdf"
                          value={formData.attachmentPdf || ''}
                          onChange={e => setFormData({ ...formData, attachmentPdf: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {formData.type === TemplateType.TEXT && (
                  <p className="text-sm text-slate-400 italic">Este tipo de template não permite anexos.</p>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-all">Salvar Template</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Templates;