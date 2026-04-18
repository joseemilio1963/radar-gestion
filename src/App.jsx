import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Building2, LogOut, ExternalLink, AlertTriangle, CheckCircle2, Shield, Calendar, Sparkles, FileText, RefreshCcw, Info } from 'lucide-react';

// Conexión profesional con tus llaves de Supabase
const supabaseUrl = "https://kygynasotwfhuqfiqgzj.supabase.co";
const supabaseAnonKey = "sb_publishable_3HBDFO02eCMowpwYnw2Pmw_L3Enp3N-";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const STATUS_META = {
    open: { label: 'Abierta', className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' },
    upcoming: { label: 'Próxima', className: 'bg-amber-500/15 text-amber-300 border border-amber-500/25' },
    closed: { label: 'Cerrada', className: 'bg-rose-500/15 text-rose-300 border border-rose-500/25' },
    unknown: { label: 'Por revisar', className: 'bg-slate-500/15 text-slate-300 border border-slate-500/25' }
};

const MATCH_META = {
    apta_clara: { label: 'Apta clara', className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' },
    apta_probable: { label: 'Apta probable', className: 'bg-blue-500/15 text-blue-300 border border-blue-500/25' },
    requiere_revision: { label: 'Requiere revisión', className: 'bg-amber-500/15 text-amber-300 border border-amber-500/25' },
    descartada: { label: 'Descartada', className: 'bg-rose-500/15 text-rose-300 border border-rose-500/25' }
};

// --- MOTOR DE MATCHING PROFESIONAL [cite: 358-370] ---
function calculateMatch(ayuda, profile) {
    let score = 0;
    const reasons = [];
    const blockers = [];
    if (!profile) return { score: 0, reasons: [], blockers: [], classification: 'requiere_revision' };

    const territory = ayuda.territory || [];
    if (territory.includes('nacional') || territory.includes(profile.province?.toLowerCase())) {
        score += 40; reasons.push('Ubicación geográfica compatible');
    } else { blockers.push('Fuera de ámbito territorial'); }

    if (profile.employees_count >= (ayuda.min_employees || 0) && profile.employees_count <= (ayuda.max_employees || 999)) {
        score += 30; reasons.push('Tramo de empleados correcto');
    } else { blockers.push('Rango de empleados fuera de límites'); }

    if (ayuda.estado === 'closed') { score = 0; blockers.push('Convocatoria cerrada'); }

    score = Math.min(100, score);
    let classification = score > 70 ? 'apta_clara' : score > 40 ? 'apta_probable' : 'requiere_revision';
    if (score === 0 || ayuda.estado === 'closed') classification = 'descartada';

    return { score, reasons, blockers, classification };
}

export default function App() {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [ayudas, setAyudas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authMode, setAuthMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) loadData(session.user.id);
            else setLoading(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) loadData(session.user.id);
        });
        return () => subscription.unsubscribe();
    }, []);

    async function loadData(userId) {
        setLoading(true);
        const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
        const { data: ayu } = await supabase.from('ayudas').select('*').order('updated_at', { ascending: false });

        // Perfil por defecto si es nuevo usuario
        setProfile(prof || { company_name: 'Nueva Empresa', employees_count: 1, province: 'valencia' });
        setAyudas(ayu || []);
        setLoading(false);
    }

    async function handleAuth(e) {
        e.preventDefault();
        const { error } = authMode === 'login'
            ? await supabase.auth.signInWithPassword({ email, password })
            : await supabase.auth.signUp({ email, password });
        if (error) alert(error.message);
    }

    const ayudasConMatch = useMemo(() => {
        return ayudas.map(a => ({ ...a, match: calculateMatch(a, profile) }))
            .sort((a, b) => b.match.score - a.match.score);
    }, [ayudas, profile]);

    const selectedHelp = ayudasConMatch.find(a => a.id === selectedId) || ayudasConMatch[0];

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-blue-400 font-black uppercase italic tracking-widest gap-4">
            <RefreshCcw className="animate-spin" size={32} />
            Iniciando Radar Gestión...
        </div>
    );

    if (!session) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-10 rounded-[2rem] shadow-2xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-blue-500/20 rounded-2xl"><Building2 className="text-blue-500" size={32} /></div>
                        <div>
                            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Radar Gestión</h1>
                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Acceso Profesional Seguro</p>
                        </div>
                    </div>
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Email Corporativo</label>
                            <input type="email" placeholder="usuario@empresa.com" className="w-full p-4 bg-black border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500 transition-all" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Contraseña</label>
                            <input type="password" placeholder="••••••••" className="w-full p-4 bg-black border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500 transition-all" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                        <button className="w-full py-4 bg-blue-600 text-white font-black rounded-xl uppercase italic shadow-lg hover:bg-blue-500 transition-all transform hover:scale-[1.02]">
                            {authMode === 'login' ? 'Entrar al Radar' : 'Crear Cuenta Profesional'}
                        </button>
                    </form>
                    <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-slate-500 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all">
                        {authMode === 'login' ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya eres usuario? Identifícate'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            <div className="mx-auto max-w-7xl p-4 md:p-8">
                {/* Cabecera Profesional [cite: 312-318] */}
                <header className="mb-8 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 flex flex-wrap justify-between items-center gap-6 shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/15 rounded-2xl shadow-inner"><Building2 className="text-blue-500" size={28} /></div>
                        <div>
                            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white leading-none">Radar Gestión</h1>
                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mt-1">Detección y Priorización Inteligente</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block border-r border-slate-800 pr-6">
                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Empresa Activa</p>
                            <p className="text-xs font-bold text-white uppercase italic">{profile.company_name}</p>
                        </div>
                        <button onClick={() => supabase.auth.signOut()} className="p-3 bg-rose-600/10 text-rose-500 rounded-xl border border-rose-500/20 hover:bg-rose-600 hover:text-white transition-all shadow-lg"><LogOut size={20} /></button>
                    </div>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-8">
                    {/* Listado de Oportunidades [cite: 319-328] */}
                    <aside className="space-y-4">
                        <div className="flex items-center justify-between px-2 mb-2">
                            <h3 className="text-white font-black uppercase italic tracking-widest text-[10px] flex items-center gap-2"> <Sparkles size={14} className="text-blue-400" /> Radar de Oportunidades</h3>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">{ayudasConMatch.length} Ayudas</span>
                        </div>
                        <div className="space-y-3 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                            {ayudasConMatch.map(ayu => (
                                <button key={ayu.id} onClick={() => setSelectedId(ayu.id)} className={`w-full p-5 rounded-[1.8rem] border text-left transition-all duration-300 ${selectedId === ayu.id ? 'bg-blue-600 border-blue-400 shadow-2xl scale-[1.02]' : 'bg-slate-900 border-slate-800 hover:border-slate-600 hover:bg-slate-800/50'}`}>
                                    <div className="flex gap-2 mb-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${STATUS_META[ayu.estado]?.className}`}>{STATUS_META[ayu.estado]?.label}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${MATCH_META[ayu.match.classification]?.className}`}>{MATCH_META[ayu.match.classification]?.label}</span>
                                    </div>
                                    <h3 className="font-black text-white uppercase italic text-xs leading-tight mb-1">{ayu.titulo}</h3>
                                    <p className="text-[8px] text-slate-500 uppercase font-black tracking-[0.15em]">{ayu.organismo}</p>
                                    <div className="mt-4 flex justify-between items-center border-t border-white/5 pt-3">
                                        <div>
                                            <p className="text-[7px] text-slate-400 uppercase font-black mb-0.5">Afinidad</p>
                                            <p className="text-xl font-black italic tracking-tighter text-white">{ayu.match.score}%</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[7px] text-slate-400 uppercase font-black mb-0.5">Plazo</p>
                                            <p className="text-[9px] font-black text-white">{ayu.deadline_at || 'Abierto'}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </aside>

                    {/* Ficha Profesional Detallada [cite: 337-348] */}
                    <main className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative min-h-[600px]">
                        {selectedHelp ? (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex justify-between items-start mb-10 flex-wrap gap-6 border-b border-slate-800 pb-8">
                                    <div className="max-w-xl">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${STATUS_META[selectedHelp.estado]?.className}`}>Estado: {STATUS_META[selectedHelp.estado]?.label}</span>
                                            <span className="px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-700">Ref: {selectedHelp.id.slice(0, 8)}</span>
                                        </div>
                                        <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter leading-[0.9] mb-4">{selectedHelp.titulo}</h2>
                                        <p className="text-blue-500 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2"><Shield size={12} /> {selectedHelp.organismo}</p>
                                    </div>
                                    <div className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 text-center min-w-[140px] shadow-inner">
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-1 tracking-[0.2em]">Score Profesional</p>
                                        <p className="text-5xl font-black italic text-white tracking-tighter">{selectedHelp.match.score}<span className="text-xl text-blue-500">%</span></p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex flex-col gap-1">
                                        <p className="text-[8px] text-slate-500 uppercase font-black flex items-center gap-2 tracking-widest"><Calendar size={12} className="text-blue-500" /> Vigencia Oficial</p>
                                        <p className="text-white font-black text-sm uppercase italic">{selectedHelp.deadline_at || 'Convocatoria Permanente'}</p>
                                    </div>
                                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex flex-col gap-1">
                                        <p className="text-[8px] text-slate-500 uppercase font-black flex items-center gap-2 tracking-widest"><Sparkles size={12} className="text-emerald-500" /> Intensidad Ayuda</p>
                                        <p className="text-emerald-500 font-black text-sm uppercase italic">{selectedHelp.amount_summary}</p>
                                    </div>
                                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex flex-col gap-1">
                                        <p className="text-[8px] text-slate-500 uppercase font-black flex items-center gap-2 tracking-widest"><RefreshCcw size={12} className="text-blue-400" /> Último Análisis</p>
                                        <p className="text-white font-black text-sm uppercase italic">{new Date(selectedHelp.updated_at).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="space-y-8 mb-12">
                                    {/* Razones de Encaje [cite: 358-365] */}
                                    <div className="bg-blue-600/5 p-8 rounded-[2rem] border border-blue-500/10">
                                        <h4 className="text-blue-400 font-black text-[10px] uppercase mb-5 tracking-[0.2em] flex items-center gap-2"><Info size={16} /> Evaluación de Elegibilidad</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <ul className="space-y-3">
                                                {selectedHelp.match.reasons.map((r, i) => <li key={i} className="text-slate-300 text-[11px] font-medium flex items-center gap-3 italic"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> {r}</li>)}
                                            </ul>
                                            {selectedHelp.match.blockers.length > 0 && (
                                                <ul className="space-y-3 border-l border-white/5 pl-6">
                                                    {selectedHelp.match.blockers.map((b, i) => <li key={i} className="text-rose-400 text-[11px] font-medium flex items-center gap-3 italic"><AlertTriangle size={16} className="shrink-0" /> {b}</li>)}
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    {/* Requisitos y Documentos [cite: 275-287] */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-slate-950/50 p-8 rounded-[2rem] border border-slate-800/50">
                                            <p className="text-white font-black text-[10px] uppercase mb-6 flex items-center gap-2 tracking-widest"><FileText size={18} className="text-blue-500" /> Requisitos Críticos</p>
                                            <ul className="space-y-4">
                                                {selectedHelp.requirements.map((r, i) => <li key={i} className="text-slate-400 text-[11px] leading-relaxed flex gap-3 italic"><span className="text-blue-500 font-black">/</span> {r}</li>)}
                                            </ul>
                                        </div>
                                        <div className="bg-slate-950/50 p-8 rounded-[2rem] border border-slate-800/50">
                                            <p className="text-white font-black text-[10px] uppercase mb-6 flex items-center gap-2 tracking-widest"><FileText size={18} className="text-emerald-500" /> Checklist Documental</p>
                                            <ul className="space-y-4">
                                                {selectedHelp.documents.map((d, i) => <li key={i} className="text-slate-400 text-[11px] leading-relaxed flex gap-3 italic"><span className="text-emerald-500 font-black">/</span> {d}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Acciones Profesionales [cite: 348] */}
                                <div className="flex flex-col sm:flex-row gap-5 pt-4">
                                    <a href={selectedHelp.fuente_oficial_url} target="_blank" rel="noopener noreferrer" className="flex-1 py-5 bg-white text-black rounded-2xl font-black uppercase italic flex justify-center items-center gap-3 shadow-2xl hover:bg-blue-600 hover:text-white transition-all transform hover:translate-y-[-2px]">
                                        <ExternalLink size={20} /> Trazabilidad: Fuente Oficial
                                    </a>
                                    <button onClick={() => window.location.href = `mailto:jose@aulagentia.eu?subject=Consulta Técnica: ${selectedHelp.titulo}`} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase italic flex justify-center items-center gap-3 shadow-2xl hover:bg-blue-500 transition-all transform hover:translate-y-[-2px]">
                                        Solicitar Informe Asesor
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-40">
                                <div className="p-8 bg-slate-800/30 rounded-full border border-dashed border-slate-700">
                                    <Sparkles size={60} className="text-slate-600 animate-pulse" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[11px] uppercase font-black italic tracking-[0.3em] text-slate-500">Radar en espera</p>
                                    <p className="text-xs text-slate-600 font-medium">Selecciona una convocatoria para iniciar el análisis de afinidad profesional</p>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}