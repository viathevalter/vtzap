import React, { useState, useEffect } from 'react';
import { Crosshair, Save, Play, Monitor, MousePointer2, Plus, Trash2 } from 'lucide-react';
import { CalibrationProfile } from '../types';

const INITIAL_PROFILE: CalibrationProfile = {
  id: '1',
  name: 'pc-escritorio-01',
  resolution: '1920x1080',
  points: [
    { id: 'p0', actionName: 'Barra de Endereço (URL)', x: 300, y: 50 },
    { id: 'p0_new', actionName: 'Botão Novo Chat (+)', x: 300, y: 120 },
    { id: 'p1', actionName: 'Buscar Contato', x: 240, y: 180 },
    { id: 'p1_clear', actionName: 'Botão Limpar Busca (X)', x: 340, y: 180 },
    { id: 'p7', actionName: 'Primeiro Resultado da Busca', x: 240, y: 250 },
    { id: 'p2', actionName: 'Caixa de Mensagem', x: 650, y: 950 },
    { id: 'p3', actionName: 'Botão Clipe (Anexar)', x: 610, y: 950 },
    { id: 'p4', actionName: 'Opção Foto/Vídeo', x: 610, y: 880 },
    { id: 'p5', actionName: 'Opção Documento', x: 610, y: 820 },
    { id: 'p6', actionName: 'Botão Enviar', x: 1850, y: 950 },
  ]
};

const Calibration: React.FC = () => {
  const [profiles, setProfiles] = useState<CalibrationProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<CalibrationProfile | null>(null);
  const [capturingId, setCapturingId] = useState<string | null>(null);

  // Fetch profiles from backend on component mount
  useEffect(() => {
    fetch('http://localhost:8000/api/profiles')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // Patch existing profiles with any newly added points (like the New Chat + button or Clear X)
          const patchedProfiles = data.map(profile => {
            // Start with all points from INITIAL_PROFILE to guarantee order and completeness
            const mergedPoints = INITIAL_PROFILE.points.map(initPoint => {
              // Find if this point already existed in the saved profile
              const savedPoint = profile.points.find((p: any) => p.id === initPoint.id);
              if (savedPoint) {
                // Keep the saved coordinates but update everything else (like actionName changes)
                return { ...initPoint, x: savedPoint.x, y: savedPoint.y };
              } else {
                // It's a brand new point, initialize with nulls
                return { ...initPoint, x: null, y: null };
              }
            });
            return { ...profile, points: mergedPoints };
          });

          setProfiles(patchedProfiles);
          setActiveProfile(patchedProfiles[0]); // Set the first profile as active
        } else {
          // If no profiles exist, create a default one
          const defaultProfile = { ...INITIAL_PROFILE, id: 'default-profile-' + Date.now(), name: 'Perfil Padrão' };
          setProfiles([defaultProfile]);
          setActiveProfile(defaultProfile);
        }
      })
      .catch(err => {
        console.error("Failed to load profiles", err);
        // Fallback if API fails: use a default profile
        const defaultProfile = { ...INITIAL_PROFILE, id: 'default-profile-' + Date.now(), name: 'Perfil Padrão' };
        setProfiles([defaultProfile]);
        setActiveProfile(defaultProfile);
      });
  }, []);

  const handleCapture = async (pointId: string) => {
    if (!activeProfile) return;

    setCapturingId(pointId);

    try {
      const response = await fetch('http://localhost:8000/api/calibration/capture');
      if (!response.ok) throw new Error('Falha ao capturar coordenada');

      const { x, y } = await response.json();

      setActiveProfile(prevActiveProfile => {
        if (!prevActiveProfile) return null;
        return {
          ...prevActiveProfile,
          points: prevActiveProfile.points.map(p => {
            if (p.id === pointId) {
              return { ...p, x, y };
            }
            return p;
          })
        };
      });
    } catch (error) {
      console.error('Erro de Calibração:', error);
      alert('Erro ao se comunicar com o servidor de automação. O backend está rodando?');
    } finally {
      setCapturingId(null);
    }
  };

  const handleNewProfile = () => {
    const profileName = prompt("Digite o nome do novo perfil de calibração:");
    if (!profileName) return;

    const newProfile: CalibrationProfile = {
      ...INITIAL_PROFILE,
      id: `profile-${Date.now()}`,
      name: profileName,
    };

    setProfiles([...profiles, newProfile]);
    setActiveProfile(newProfile);
  };

  const handleSaveProfile = async () => {
    if (!activeProfile) return;

    // Update the profile in the profiles array
    const updatedProfiles = profiles.map(p => p.id === activeProfile.id ? activeProfile : p);
    setProfiles(updatedProfiles);

    try {
      const res = await fetch('http://localhost:8000/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfiles)
      });
      if (res.ok) {
        alert("Configurações salvas com sucesso!");
      } else {
        throw new Error("Falha ao salvar no backend");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar as configurações.");
    }
  };

  const handleDeleteProfile = async () => {
    if (!activeProfile) return;
    if (profiles.length <= 1) {
      alert("Você não pode excluir o último perfil ativo. Crie um novo antes de excluir este.");
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o perfil "${activeProfile.name}"?`)) return;

    const updatedProfiles = profiles.filter(p => p.id !== activeProfile.id);
    setProfiles(updatedProfiles);
    setActiveProfile(updatedProfiles[0]);

    try {
      await fetch('http://localhost:8000/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfiles)
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calibração das Coordenadas</h1>
          <p className="text-slate-500 text-sm mt-1">Configure os pontos de clique do robô para a automação funcionar corretamente.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleNewProfile}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            <Plus size={16} />
            Novo Perfil
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Col: Profile & Capture List */}
        <div className="lg:col-span-2 space-y-6">

          {/* Profile Selector */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                <Monitor size={20} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Perfil Ativo</label>
                <select
                  className="font-medium text-slate-900 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                  value={activeProfile?.id || ''}
                  onChange={(e) => setActiveProfile(profiles.find(p => p.id === e.target.value) || null)}
                >
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.resolution})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
              Ref: {activeProfile?.resolution || 'N/A'}
            </div>
          </div>

          {/* Calibration Actions List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-700">Ações para Calibrar</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {activeProfile?.points.map((point) => (
                <div key={point.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${point.x !== null ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Crosshair size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{point.actionName}</p>
                      <p className="text-xs text-slate-400">
                        {point.x !== null ? `Definido: X=${point.x}, Y=${point.y}` : 'Não definido'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCapture(point.id)}
                    disabled={capturingId !== null}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${capturingId === point.id
                      ? 'bg-yellow-100 border-yellow-200 text-yellow-700 cursor-wait'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                      }`}
                  >
                    {capturingId === point.id ? 'Aguarde 3s...' : 'Capturar Posição'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Coordinates Table & Actions */}
        <div className="space-y-6">

          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MousePointer2 size={18} className="text-blue-400" />
              Resumo das Coordenadas
            </h3>
            <div className="text-sm space-y-3 font-mono">
              {activeProfile?.points.map(p => (
                <div key={p.id} className="flex justify-between border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                  <span className="text-slate-400 truncate max-w-[150px]">{p.actionName}</span>
                  <span className="text-blue-300">{p.x}, {p.y}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <button className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors">
              <Play size={18} />
              Testar Perfil (Dry Run)
            </button>
            <button
              onClick={handleSaveProfile}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all"
            >
              <Save size={18} />
              Salvar Configurações
            </button>
            <button
              onClick={handleDeleteProfile}
              className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg font-medium hover:bg-red-100 hover:text-red-700 transition-colors mt-2"
            >
              <Trash2 size={18} />
              Excluir Perfil Atual
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Calibration;