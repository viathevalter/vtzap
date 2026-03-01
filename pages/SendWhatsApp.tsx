import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Image as ImageIcon,
  FileText,
  Trash2,
  Send,
  Clock,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileBox,
  Layout,
  MessageSquarePlus,
  X
} from 'lucide-react';
import { LogEntry, Template, TemplateType } from '../types';

// Mock Data
const MOCK_LOGS: LogEntry[] = [
  { id: '1', name: 'João Silva', phone: '11999998888', status: 'success', timestamp: '10:00' },
  { id: '2', name: 'Maria Souza', phone: '11988887777', status: 'failed', errorDetails: 'Timeout ao buscar contato', timestamp: '10:01' },
  { id: '3', name: 'Empresa XYZ', phone: '11977776666', status: 'success', timestamp: '10:02' },
];

const MOCK_TEMPLATES: Template[] = [
  { id: '1', name: 'Cobrança Amigável', category: 'Financeiro', type: TemplateType.TEXT_PDF, content: 'Olá {nome}, sua fatura venceu.', attachmentPdf: 'fatura.pdf' },
  { id: '2', name: 'Promoção', category: 'Marketing', type: TemplateType.TEXT_IMAGE, content: 'Oferta imperdível!', attachmentImage: 'banner.png' },
];

const SendWhatsApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'manual' | 'template' | 'cobranca'>('manual');

  // Shared State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [contactsFile, setContactsFile] = useState<File | null>(null);
  const [contactsFileName, setContactsFileName] = useState<string | null>(null);
  const [contacts, setContacts] = useState<any[]>([]); // Contacts from preview
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  // Templates State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Loading States
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  // Manual Mode State
  const [manualMessage, setManualMessage] = useState('');
  const [manualAttachmentImage, setManualAttachmentImage] = useState('');
  const [manualAttachmentPdf, setManualAttachmentPdf] = useState('');

  // Cobranca State
  const [cobrancaMessage, setCobrancaMessage] = useState('Olá {nome}, identificamos que a sua fatura no valor de R$ {valor} vence no dia {vencimento}. Para realizar o pagamento acesse: {link}');
  const [selectedDueDate, setSelectedDueDate] = useState<string>('all');
  const [minDelay, setMinDelay] = useState<number>(10);
  const [maxDelay, setMaxDelay] = useState<number>(20);

  // Scheduling State
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduledJobs, setScheduledJobs] = useState<any[]>([]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Fetch Templates & Profiles on Mount
  React.useEffect(() => {
    fetch('http://localhost:8000/api/templates')
      .then(res => res.json())
      .then(data => setTemplates(data))
      .catch(err => console.error("Error loading templates", err));

    fetch('http://localhost:8000/api/profiles')
      .then(res => res.json())
      .then(data => {
        setProfiles(data);
        if (data.length > 0) setSelectedProfileId(data[0].id);
      })
      .catch(err => console.error("Error loading profiles", err));
  }, []);

  // Poll Scheduled Jobs
  React.useEffect(() => {
    const fetchScheduled = () => {
      fetch('http://localhost:8000/api/jobs')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Update scheduled list
            setScheduledJobs(data.filter((j: any) => j.status === 'scheduled'));

            // If we are waiting for a job to start, and one just started running, lock onto it
            if (!jobId) {
              const activeJob = data.find((j: any) => j.status === 'running');
              if (activeJob) {
                setJobId(activeJob.id);
                setIsSending(true);
              }
            }
          }
        })
        .catch(err => console.error(err));
    };
    fetchScheduled();
    const interval = setInterval(fetchScheduled, 5000);
    return () => clearInterval(interval);
  }, [jobId]);

  // Poll Job Status
  React.useEffect(() => {
    let interval: any;
    if (jobId) {
      interval = setInterval(() => {
        fetch(`http://localhost:8000/api/job/${jobId}`)
          .then(res => res.json())
          .then(data => {
            setLogs(data.results.map((r: any, idx: number) => ({
              id: idx.toString(),
              name: r.name,
              phone: r.phone,
              status: r.status,
              errorDetails: r.error,
              timestamp: new Date().toLocaleTimeString()
            })));
            if (data.status === 'completed' || data.status === 'stopped') {
              setIsSending(false);
              clearInterval(interval);
            }
          })
          .catch(err => console.error(err));
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [jobId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setContactsFile(file);
    setContactsFileName(file.name);
    setIsLoadingFile(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/api/preview', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setContacts(data);
      setContactsFileName(file.name + ` (${data.length} contatos)`);
    } catch (error) {
      console.error(error);
      alert('Erro ao processar arquivo');
      setContactsFile(null);
      setContactsFileName(null);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleSend = async () => {
    if (!contactsFile || !selectedProfileId) return;
    if (activeTab === 'template' && !selectedTemplateId) return;

    let tempTemplateId = selectedTemplateId;

    let contactsToSend = contactsToProcess;
    if (activeTab === 'cobranca' && contactsToSend.length === 0) {
      alert('Nenhum contato encontrado para esta data de vencimento.');
      return;
    }

    if (activeTab === 'manual' || activeTab === 'cobranca') {
      try {
        let type = TemplateType.TEXT;
        if (manualAttachmentImage && manualAttachmentPdf) type = TemplateType.TEXT_IMAGE_PDF;
        else if (manualAttachmentImage) type = TemplateType.TEXT_IMAGE;
        else if (manualAttachmentPdf) type = TemplateType.TEXT_PDF;

        const manualTemp: Template = {
          id: "manual-" + Date.now(),
          name: (activeTab === 'cobranca' ? "Cobrança " : "Manual Send ") + new Date().toLocaleString(),
          category: "Urgente",
          type: type,
          content: activeTab === 'cobranca' ? cobrancaMessage : manualMessage,
          attachmentImage: activeTab === 'cobranca' ? undefined : (manualAttachmentImage || undefined),
          attachmentPdf: activeTab === 'cobranca' ? undefined : (manualAttachmentPdf || undefined)
        };
        await fetch('http://localhost:8000/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([...templates, manualTemp])
        });
        tempTemplateId = manualTemp.id;
      } catch (e) {
        alert("Erro ao preparar envio");
        return;
      }
    }

    let scheduled_at = undefined;
    if (isScheduled && scheduleDate && scheduleTime) {
      // Local ISO string to pass to the backend
      scheduled_at = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    }

    if (!scheduled_at) {
      setIsSending(true);
    }

    try {
      const res = await fetch('http://localhost:8000/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: contactsToSend,
          templateId: tempTemplateId,
          profileId: selectedProfileId,
          delay: 2,
          minDelay: minDelay,
          maxDelay: maxDelay,
          scheduled_at: scheduled_at
        })
      });
      const data = await res.json();

      if (!scheduled_at) {
        setJobId(data.jobId);
      } else {
        fetch('http://localhost:8000/api/jobs')
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setScheduledJobs(data.filter((j: any) => j.status === 'scheduled'));
            }
          })
          .catch(err => console.error(err));

        alert('Lote agendado com sucesso! Você pode continuar adicionando outros lotes para outras datas de vencimento.');
      }
    } catch (e) {
      console.error(e);
      if (!scheduled_at) setIsSending(false);
      alert("Erro ao iniciar envio");
    }
  };

  const handleStop = async () => {
    if (!jobId) return;
    try {
      await fetch(`http://localhost:8000/api/job/${jobId}/stop`, {
        method: 'POST'
      });
      setIsSending(false);
    } catch (e) {
      console.error("Erro ao parar envio", e);
    }
  };

  const handleCancelScheduled = async (id: string) => {
    if (!confirm('Deseja cancelar este agendamento?')) return;
    try {
      await fetch(`http://localhost:8000/api/job/${id}/stop`, {
        method: 'POST'
      });
      setScheduledJobs(prev => prev.filter(j => j.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Computed Validation
  const isTemplateValid = () => {
    if (!selectedTemplate) return false;
    if (selectedTemplate.type === TemplateType.TEXT_IMAGE && !selectedTemplate.attachmentImage) return false;
    if (selectedTemplate.type === TemplateType.TEXT_PDF && !selectedTemplate.attachmentPdf) return false;
    if (selectedTemplate.type === TemplateType.TEXT_IMAGE_PDF && (!selectedTemplate.attachmentImage || !selectedTemplate.attachmentPdf)) return false;
    return true;
  };

  const getPreviewData = () => {
    const isManual = activeTab === 'manual';
    const isCobranca = activeTab === 'cobranca';
    let msg = '';
    if (isManual) msg = manualMessage;
    else if (isCobranca) msg = cobrancaMessage;
    else msg = (selectedTemplate?.content || '');

    let imgs: string[] = [];
    let pdfs: string[] = [];

    if (isManual) {
      if (manualAttachmentImage) imgs.push(manualAttachmentImage);
      if (manualAttachmentPdf) pdfs.push(manualAttachmentPdf);
    } else {
      if (selectedTemplate?.attachmentImage) imgs.push(selectedTemplate.attachmentImage);
      if (selectedTemplate?.attachmentPdf) pdfs.push(selectedTemplate.attachmentPdf);
    }

    return { msg, imgs, pdfs };
  };

  const { msg, imgs, pdfs } = getPreviewData();

  let contactsToProcess = contacts;
  if (activeTab === 'cobranca' && selectedDueDate !== 'all') {
    contactsToProcess = contacts.filter(c => c.due_date === selectedDueDate);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in relative">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Enviar WhatsApp</h1>
        <p className="text-slate-500 text-sm mt-1">Escolha o modo de envio e configure sua campanha.</p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'manual'
            ? 'border-blue-600 text-blue-600 bg-blue-50/50'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
        >
          <MessageSquarePlus size={18} />
          Envio Rápido (Manual)
        </button>
        <button
          onClick={() => setActiveTab('template')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'template'
            ? 'border-blue-600 text-blue-600 bg-blue-50/50'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
        >
          <Layout size={18} />
          Envio por Template
        </button>
        <button
          onClick={() => setActiveTab('cobranca')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'cobranca'
            ? 'border-green-600 text-green-600 bg-green-50/50'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
        >
          <FileSpreadsheet size={18} />
          Envio de Cobrança
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left Column: Input Form */}
        <div className="xl:col-span-2 space-y-6">

          {/* TAB: MANUAL */}
          {activeTab === 'manual' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6 animate-fade-in">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Mensagem</h3>
                <textarea
                  className="w-full h-40 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm text-slate-900 bg-white resize-none"
                  placeholder="Digite sua mensagem aqui... Use {nome} para personalizar."
                  value={manualMessage}
                  onChange={(e) => setManualMessage(e.target.value)}
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Anexos Opcionais</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Caminho da Imagem</label>
                  <div className="flex gap-2">
                    <div className="w-full flex items-center px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm focus-within:ring-2 focus-within:ring-purple-100 focus-within:border-purple-400 transition-all">
                      <ImageIcon size={16} className="text-purple-500 mr-2" />
                      <input
                        type="text"
                        className="bg-transparent border-none w-full p-0 text-slate-900 focus:ring-0 placeholder-slate-400"
                        placeholder="ex: C:/imagens/promo.png"
                        value={manualAttachmentImage}
                        onChange={e => setManualAttachmentImage(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Caminho do PDF</label>
                  <div className="flex gap-2">
                    <div className="w-full flex items-center px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm focus-within:ring-2 focus-within:ring-red-100 focus-within:border-red-400 transition-all">
                      <FileText size={16} className="text-red-500 mr-2" />
                      <input
                        type="text"
                        className="bg-transparent border-none w-full p-0 text-slate-900 focus:ring-0 placeholder-slate-400"
                        placeholder="ex: C:/docs/boleto.pdf"
                        value={manualAttachmentPdf}
                        onChange={e => setManualAttachmentPdf(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TEMPLATE */}
          {activeTab === 'template' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Selecione o Template</label>
                <select
                  className="w-full border-slate-300 rounded-lg text-sm bg-white text-slate-900"
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">-- Escolha um template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>

              {selectedTemplate && (
                <div className="bg-slate-50 border-l-4 border-blue-500 p-6 rounded-r-xl shadow-sm border-y border-r border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-800">{selectedTemplate.name}</h3>
                    <span className="text-xs font-mono bg-slate-200 text-slate-600 px-2 py-1 rounded">{selectedTemplate.type}</span>
                  </div>

                  <p className="text-sm text-slate-600 italic whitespace-pre-wrap mb-4 bg-white p-3 rounded border border-slate-200">
                    "{selectedTemplate.content}"
                  </p>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Anexos Vinculados</h4>
                    <div className="flex gap-3">
                      {selectedTemplate.attachmentImage ? (
                        <div className="flex items-center gap-2 text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-200">
                          <ImageIcon size={14} />
                          {selectedTemplate.attachmentImage}
                        </div>
                      ) : selectedTemplate.type.includes('IMAGE') ? (
                        <div className="flex items-center gap-2 text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg border border-red-200 font-bold">
                          <AlertCircle size={14} /> Faltando Imagem
                        </div>
                      ) : null}

                      {selectedTemplate.attachmentPdf ? (
                        <div className="flex items-center gap-2 text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg border border-red-200">
                          <FileText size={14} />
                          {selectedTemplate.attachmentPdf}
                        </div>
                      ) : selectedTemplate.type.includes('PDF') ? (
                        <div className="flex items-center gap-2 text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg border border-red-200 font-bold">
                          <AlertCircle size={14} /> Faltando PDF
                        </div>
                      ) : null}

                      {!selectedTemplate.attachmentImage && !selectedTemplate.attachmentPdf && (
                        <span className="text-xs text-slate-400">Nenhum anexo.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: COBRANÇA */}
          {activeTab === 'cobranca' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6 animate-fade-in border-t-4 border-t-green-500">
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 flex items-start gap-3">
                <AlertCircle className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-orange-800 text-sm">Modo Anti-Spam (Envios em Massa)</h4>
                  <p className="text-orange-700 text-xs mt-1">Este modo é projetado para listas de cobrança gigantes. Configure corretamente as <b>Pausas (Delays)</b> entre cada envio para evitar o banimento do seu número no WhatsApp.</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Mensagem de Cobrança Padrão</h3>
                <textarea
                  className="w-full h-28 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-100 focus:border-green-400 text-sm text-slate-900 bg-white resize-none"
                  placeholder="Olá {nome}, sua fatura de R$ {valor} vence no dia {vencimento}. Link: {link}"
                  value={cobrancaMessage}
                  onChange={(e) => setCobrancaMessage(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-2">Variáveis Suportadas: <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-bold">{'{nome}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-red-600 font-bold">{'{vencimento}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-green-600 font-bold">{'{valor}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-600 font-bold">{'{link}'}</code></p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Pausa Mínima (segundos)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-100 focus:border-green-400"
                    placeholder="Ex: 30"
                    value={minDelay}
                    onChange={e => setMinDelay(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Pausa Máxima (segundos)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-100 focus:border-green-400"
                    placeholder="Ex: 60"
                    value={maxDelay}
                    onChange={e => setMaxDelay(Number(e.target.value))}
                  />
                </div>
              </div>

            </div>
          )}

          {/* Common: Contacts Upload */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Base de Contatos (Obrigatório)</h3>
            <label
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group ${contactsFileName ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:bg-slate-50 hover:border-blue-400'
                }`}
            >
              <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${contactsFileName ? 'bg-green-200 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {contactsFileName ? <CheckCircle2 size={24} /> : <FileSpreadsheet size={24} />}
              </div>
              <p className="text-slate-900 font-medium">{contactsFileName || 'Clique ou arraste seu Excel/CSV aqui'}</p>
              {isLoadingFile && <p className="text-blue-500 text-xs mt-1">Processando...</p>}
            </label>

            {/* If Cobrança, show Due Date filter */}
            {activeTab === 'cobranca' && contacts.length > 0 && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Filtrar Base por Data de Vencimento</h3>
                <select
                  className="w-full border-slate-300 rounded-lg text-sm bg-white text-slate-900"
                  value={selectedDueDate}
                  onChange={e => setSelectedDueDate(e.target.value)}
                >
                  <option value="all">Todas as Datas ({contacts.length} contatos)</option>
                  {Array.from(new Set(contacts.filter(c => c.due_date).map(c => c.due_date))).sort().map(date => {
                    const count = contacts.filter(c => c.due_date === date).length;
                    return (
                      <option key={date as string} value={date as string}>{date as string} ({count} contatos)</option>
                    );
                  })}
                </select>
                <p className="text-xs text-slate-500 mt-2">Dica: Selecione a data exata da fatura que você deseja cobrar hoje. Apenas os contatos da data selecionada receberão a mensagem.</p>
              </div>
            )}

            {/* Scheduling Section */}
            <div className="mt-6 border-t border-slate-200 pt-6">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-slate-700">Agendar Envio para Outra Data/Hora</span>
              </label>

              {isScheduled && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Data do Envio</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                      required={isScheduled}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Hora do Envio</label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      required={isScheduled}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Perfil de Calibração</h3>
              <select
                className="w-full border-slate-300 rounded-lg text-sm bg-white text-slate-900"
                value={selectedProfileId}
                onChange={e => setSelectedProfileId(e.target.value)}
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.resolution})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Log */}
        <div className="space-y-6">

          {/* Action Buttons */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3 sticky top-6">
            {!isSending ? (
              <button
                onClick={handleSend}
                disabled={!contactsFile || !selectedProfileId || (activeTab === 'template' && !selectedTemplateId) || (isScheduled && (!scheduleDate || !scheduleTime))}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 active:transform active:scale-95 transition-all disabled:opacity-50 shadow-md shadow-blue-500/20"
              >
                {isScheduled ? <Clock size={20} /> : <Send size={20} />}
                {isScheduled ? 'Agendar Envio' : 'Iniciar Envio de Mensagens'}
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 shadow-md shadow-red-200 transition-all hover:translate-y-[-1px]"
              >
                <XCircle size={18} />
                Parar Envio
              </button>
            )}

            {activeTab === 'template' && selectedTemplate && !isTemplateValid() && (
              <div className="text-xs text-red-500 text-center font-medium bg-red-50 p-2 rounded border border-red-100">
                ⚠️ Template exige anexo obrigatório. Verifique a configuração.
              </div>
            )}

            <button className="w-full flex items-center justify-center gap-2 border border-orange-200 text-orange-600 py-3 rounded-lg font-medium hover:bg-orange-50 transition-colors">
              <RefreshCw size={18} />
              Reenviar Falhas
            </button>
          </div>

          {/* Scheduled Jobs Section */}
          {scheduledJobs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-blue-100 bg-blue-50 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                  <Clock size={16} className="text-blue-600" /> Agendamentos Pendentes
                </h3>
                <span className="text-xs font-medium bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">{scheduledJobs.length}</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {scheduledJobs.map(job => {
                  const sDate = job.scheduled_at ? new Date(job.scheduled_at) : null;
                  const firstContact = job.results && job.results.length > 0 ? job.results[0] : null;

                  return (
                    <div key={job.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        {sDate && (
                          <div className="text-sm font-bold text-slate-800">
                            Agendado para: {sDate.toLocaleDateString()} às {sDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        <div className="text-xs text-slate-500 mt-1 flex gap-2 items-center">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{job.total} contatos</span>
                          {firstContact && firstContact.due_date && (
                            <span className="text-blue-600">Ref Venc: {firstContact.due_date}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelScheduled(job.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors border border-transparent hover:border-red-200 text-xs font-medium flex-shrink-0"
                      >
                        Cancelar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Logs / Contacts Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-700">
                {isSending || logs.length > 0 ? "Log de Envio" : "Pré-visualização do Lote"}
              </h3>
              <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                {isSending || logs.length > 0 ? logs.length : contactsToProcess.length} Total
              </span>
            </div>

            <div className="overflow-y-auto flex-1 p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-500">Nome/Tel</th>
                    <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isSending || logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 group">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{log.name}</div>
                          <div className="text-xs text-slate-400">{log.phone}</div>
                          {log.errorDetails && (
                            <div className="text-xs text-red-500 mt-1 line-clamp-2">{log.errorDetails.substring(0, 50)}...</div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <div className="flex items-center gap-2 mt-1">
                            {log.status === 'success' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                                <CheckCircle2 size={12} /> Enviado
                              </span>
                            )}
                            {log.status === 'failed' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-100">
                                <XCircle size={12} /> Falha
                              </span>
                            )}
                            {log.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                                <AlertCircle size={12} /> Fila
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    contactsToProcess.map((contact, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 group">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{contact.name}</div>
                          <div className="text-xs text-slate-400">{contact.phone}</div>
                          {activeTab === 'cobranca' && contact.due_date && (
                            <div className="text-xs text-blue-600 mt-1">Venc: {contact.due_date} | R$ {contact.value}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                            Aguardando Ação
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                  {contacts.length === 0 && logs.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-8 text-center text-slate-500 text-sm">
                        Nenhum contato carregado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {
        isPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Eye size={20} className="text-blue-500" />
                  Pré-visualização do Envio
                </h2>
                <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Contacts Summary */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="text-blue-600" />
                    <div>
                      <p className="text-sm font-bold text-blue-900">Lista Carregada</p>
                      <p className="text-xs text-blue-600">50 contatos detectados</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-white text-blue-600 px-2 py-1 rounded border border-blue-200">OK</span>
                </div>

                {/* Message Preview */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mensagem (Exemplo: Contato #1)</h3>
                  <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 text-sm text-slate-700 relative">
                    <p>
                      {msg
                        .replace('{nome}', contacts[0]?.name || 'Fulano de Tal')
                        .replace('{vencimento}', contacts[0]?.due_date || '12/10/2023')
                        .replace('{valor}', contacts[0]?.value || '150,00')
                        .replace('{link}', contacts[0]?.link || 'https://link-exemplo.com')
                      }
                    </p>
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                </div>

                {/* Attachments List */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Anexos Confirmados</h3>
                  <div className="space-y-2">
                    {imgs.map((img, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 border border-slate-200 rounded bg-white text-sm">
                        <ImageIcon size={16} className="text-purple-500" />
                        <span>{img}</span>
                      </div>
                    ))}
                    {pdfs.map((pdf, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 border border-slate-200 rounded bg-white text-sm">
                        <FileText size={16} className="text-red-500" />
                        <span>{pdf}</span>
                      </div>
                    ))}
                    {imgs.length === 0 && pdfs.length === 0 && (
                      <p className="text-sm text-slate-400 italic">Sem anexos.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button onClick={() => setIsPreviewOpen(false)} className="w-full bg-slate-800 text-white py-2 rounded-lg font-medium hover:bg-slate-900">
                  Fechar e Ajustar
                </button>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
};

export default SendWhatsApp;