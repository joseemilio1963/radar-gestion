import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Building2, LogOut, ExternalLink, AlertTriangle, CheckCircle2, Shield, Calendar, Sparkles, FileText, RefreshCcw, Info } from 'lucide-react';

// Conexión segura por variables de entorno [cite: 435]
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const STATUS_META = {
    open: { label: 'Abierta', className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' },
    upcoming: { label: 'Próxima', className: 'bg-amber-500/15 text-amber-300 border border-amber-500/25' },
    closed: { label: 'Cerrada', className: 'bg-rose-500/15 text-rose-300 border border-rose-500/25' }
};

const MATCH_META = {
    apta_clara: { label: 'Apta clara', className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' },
    apta_probable: { label: 'Apta probable', className: 'bg-blue-500/15 text-blue-300 border border-blue-500/25' },
    requiere_revision: { label: 'Requiere revisión', className: 'bg-amber-500/15 text-amber-300 border border-amber-500/25' },
    descartada: { label: 'Descartada', className: 'bg-rose-500/15 text-rose-300 border border-rose-500/25' }
};

// --- MOTOR DE MATCHING REAL [cite: 358-365] ---
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
    if (score === 0) classification = 'descartada';

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
        setProfile(prof || { company_name: 'Perfil Nuevo', employees_count: 1, province: 'valencia' });
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

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-400 font-bold uppercase italic tracking-widest">Iniciando Radar Gestión V2...</div>;

    if (!session) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-10 rounded-[2rem] shadow-2xl">
                    <div className="flex items-center gap-4 mb-8">
                        <Building2 className="text-blue-500" size={40} />
                        <div>
                            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Radar Gestión</h1>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Security Layer Active</p>
                        </div>
                    </div>
                    <form onSubmit={handleAuth} className="space-y-4">
                        <input type="email" placeholder="EMAIL" className="w-full p-4 bg-black border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500" value={email} onChange={e => setEmail(e.target.value)} required />
                        <input type="password" placeholder="CONTRASEÑA" className="w-full p-4 bg-black border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500" value={password} onChange={e => setPassword(e.target.value)} required />
                        <button className="w-full py-4 bg-blue-600 text-white font-black rounded-xl uppercase italic shadow-lg hover:bg-blue-500 transition-all">
                            {authMode === 'login' ? 'Acceder al Panel' : 'Crear Cuenta Profesional'}
                        </button>
                    </form>
                    <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-slate-500 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all">
                        {authMode === 'login' ? '¿No tienes acceso? Solicítalo aquí' : '¿Ya eres usuario? Identifícate'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            <div className="mx-auto max-w-7xl p-4 md:p-8">
                {/* Dashboard Ejecutivo [cite: 312] */}
                <header className="mb-8 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 flex flex-wrap justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/15 rounded-2xl"><Building2 className="text-blue-500" size={32} /></div>
                        <div>
                            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">Radar Gestión</h1>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Sistema de priorización y seguimiento</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-[9px] text-slate-500 uppercase font-black">Usuario</p>
                            <p className="text-xs font-bold text-white">{session.user.email}</p>
                        </div>
                        <button onClick={() => supabase.auth.signOut()} className="p-3 bg-rose-600/10 text-rose-500 rounded-xl border border-rose-500/20 hover:bg-rose-600 hover:text-white transition-all"><LogOut size={20} /></button>
                    </div>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8">
                    {/* Radar de Oportunidades [cite: 319] */}
                    <aside className="space-y-4">
                        <h3 className="text-white font-black uppercase italic tracking-widest text-xs mb-6 px-2 flex items-center gap-2"> <Sparkles size={14} className="text-blue-400" /> Oportunidades Detectadas</h3>
                        {ayudasConMatch.map(ayu => (
                            <button key={ayu.id} onClick={() => setSelectedId(ayu.id)} className={`w-full p-6 rounded-[2rem] border text-left transition-all ${selectedId === ayu.id ? 'bg-blue-600 border-blue-400 shadow-xl scale-[1.02]' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}>
                                <div className="flex gap-2 mb-4">
                                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${STATUS_META[ayu.estado]?.className}`}>{STATUS_META[ayu.estado]?.label}</span>
                                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${MATCH_META[ayu.match.classification]?.className}`}>{MATCH_META[ayu.match.classification]?.label}</span>
                                </div>
                                <h3 className="font-black text-white uppercase italic text-sm leading-tight mb-1">{ayu.titulo}</h3>
                                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{ayu.organismo}</p>
                                <div className="mt-6 flex justify-between items-end">
                                    <div><p className="text-[8px] text-slate-400 uppercase font-black mb-1">Score de Encaje</p><p className="text-2xl font-black italic tracking-tighter">{ayu.match.score}%</p></div>
                                    <p className="text-[9px] font-black uppercase italic opacity-60">Ver Ficha Técnica</p>
                                </div>
                            </button>
                        ))}
                    </aside>

                    {/* Ficha Profesional [cite: 337] */}
                    <main className="bg-slate-900 border border-slate-800 rounded-[3rem] p-8 md:p-12 shadow-2xl overflow-hidden relative">
                        {selectedHelp ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
                                    <div>
                                        <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">{selectedHelp.titulo}</h2>
                                        <p className="text-blue-500 font-black text-[10px] uppercase tracking-[0.2em]">{selectedHelp.organismo}</p>
                                    </div>
                                    <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center min-w-[120px]">
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-1 tracking-widest">Encaje Real</p>
                                        <p className="text-4xl font-black italic text-white tracking-tighter">{selectedHelp.match.score}%</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5 italic">
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-2 flex items-center gap-2"><Calendar size={12} /> Plazo de Solicitud</p>
                                        <p className="text-white font-black text-sm">{selectedHelp.deadline_at || 'PERMANENTE'}</p>
                                    </div>
                                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5 italic">
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-2 flex items-center gap-2"><Sparkles size={12} /> Importe Estimado</p>
                                        <p className="text-emerald-500 font-black text-sm uppercase">{selectedHelp.amount_summary}</p>
                                    </div>
                                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5 italic">
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-2 flex items-center gap-2"><RefreshCcw size={12} /> Actualización</p>
                                        <p className="text-white font-black text-sm uppercase">Día {new Date(selectedHelp.updated_at).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="space-y-6 mb-12">
                                    <div className="bg-blue-600/5 p-8 rounded-3xl border border-blue-500/10 italic">
                                        <h4 className="text-blue-400 font-black text-xs uppercase mb-4 tracking-widest flex items-center gap-2"><Sparkles size={16} /> Análisis de Oportunidad para {profile.company_name}</h4>
                                        <ul className="space-y-3">
                                            {selectedHelp.match.reasons.map((r, i) => <li key={i} className="text-slate-300 text-xs flex items-center gap-3"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> {r}</li>)}
                                            {selectedHelp.match.blockers.map((b, i) => <li key={i} className="text-rose-400 text-xs flex items-center gap-3"><AlertTriangle size={16} className="shrink-0" /> {b}</li>)}
                                        </ul>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-slate-950/50 p-8 rounded-3xl border border-slate-800 italic">
                                            <p className="text-white font-black text-xs uppercase mb-6 flex items-center gap-2"><FileText size={16} className="text-blue-500" /> Requisitos Clave</p>
                                            <ul className="space-y-3 text-slate-400 text-xs">
                                                {selectedHelp.requirements.map((r, i) => <li key={i} className="flex gap-2"><span>•</span> {r}</li>)}
                                            </ul>
                                        </div>
                                        <div className="bg-slate-950/50 p-8 rounded-3xl border border-slate-800 italic">
                                            <p className="text-white font-black text-xs uppercase mb-6 flex items-center gap-2"><FileText size={16} className="text-emerald-500" /> Documentación Necesaria</p>
                                            <ul className="space-y-3 text-slate-400 text-xs">
                                                {selectedHelp.documents.map((d, i) => <li key={i} className="flex gap-2"><span>•</span> {d}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4">
                                    <a href={selectedHelp.fuente_oficial_url} target="_blank" className="flex-1 py-5 bg-white text-black rounded-2xl font-black uppercase italic flex justify-center items-center gap-3 shadow-xl hover:bg-blue-500 hover:text-white transition-all">
                                        <ExternalLink size={20} /> Consultar Fuente Oficial
                                    </a>
                                    <button onClick={() => window.location.href = `mailto:jose@aulagentia.eu?subject=Tramitar: ${selectedHelp.titulo}`} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase italic flex justify-center items-center gap-3 shadow-xl hover:bg-blue-500 transition-all">
                                        Solicitar Tramitación
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30">
                                <Sparkles size={64} className="text-slate-600" />
                                <p className="text-xs uppercase font-black italic tracking-widest text-slate-500">Selecciona una oportunidad del radar para iniciar el análisis</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}