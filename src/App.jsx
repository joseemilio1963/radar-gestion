import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Building2, LogOut, ExternalLink, AlertTriangle, CheckCircle2, Shield, Calendar, Sparkles, FileText, RefreshCcw, Info, MessageSquare } from 'lucide-react';

// Configuración técnica verificada
const supabaseUrl = "https://kygynasotwfhuqfiqgzj.supabase.co";
const supabaseAnonKey = "sb_publishable_3HBDFOO2eCMowpwYnw2Pmw_L3Enp3N-";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const STATUS_META = {
    open: { label: 'Convocatoria Abierta', className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' },
    upcoming: { label: 'Próxima Publicación', className: 'bg-amber-500/15 text-amber-300 border border-amber-500/25' },
    closed: { label: 'Plazo Finalizado', className: 'bg-rose-500/15 text-rose-300 border border-rose-500/25' },
    unknown: { label: 'Pendiente de Revisión', className: 'bg-slate-500/15 text-slate-300 border border-slate-500/25' }
};

const MATCH_META = {
    apta_clara: { label: 'Alta Compatibilidad', className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' },
    apta_probable: { label: 'Apta para Estudio', className: 'bg-blue-500/15 text-blue-300 border border-blue-500/25' },
    requiere_revision: { label: 'Requiere Análisis Manual', className: 'bg-amber-500/15 text-amber-300 border border-amber-500/25' },
    descartada: { label: 'No Aplicable', className: 'bg-rose-500/15 text-rose-300 border border-rose-500/25' }
};

function calculateMatch(ayuda, profile) {
    let score = 0;
    const reasons = [];
    const blockers = [];
    if (!profile) return { score: 0, reasons: [], blockers: [], classification: 'requiere_revision' };

    const territory = ayuda.territory || [];
    if (territory.includes('nacional') || territory.includes(profile.province?.toLowerCase())) {
        score += 40; reasons.push('Ámbito territorial compatible');
    } else { blockers.push('Fuera de demarcación geográfica'); }

    if (profile.employees_count >= (ayuda.min_employees || 0) && profile.employees_count <= (ayuda.max_employees || 999)) {
        score += 30; reasons.push('Estructura de plantilla apta');
    } else { blockers.push('Dimensión de empresa no compatible'); }

    if (ayuda.estado === 'closed') { score = 0; blockers.push('Plazo de solicitud cerrado'); }

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
        setProfile(prof || { company_name: 'Empresa Invitada', employees_count: 1, province: 'valencia' });
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

    // FUNCIÓN DE CONTACTO ROBUSTA (WhatsApp)
    const handleWhatsAppContact = () => {
        if (!selectedHelp) return;
        const text = encodeURIComponent(`Hola, solicito estudio de viabilidad para la ayuda "${selectedHelp.titulo}". Empresa: ${profile?.company_name || 'No identificada'}`);
        // Sustituye el número por el tuyo si es necesario
        window.open(`https://wa.me/34600000000?text=${text}`, '_blank');
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-blue-400 font-black gap-4 uppercase italic">
            <RefreshCcw className="animate-spin" size={32} /> Cargando Radar...
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
                        </div>
                    </div>
                    <form onSubmit={handleAuth} className="space-y-4">
                        <input type="email" placeholder="Email" className="w-full p-4 bg-black border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500" value={email} onChange={e => setEmail(e.target.value)} required />
                        <input type="password" placeholder="Contraseña" className="w-full p-4 bg-black border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500" value={password} onChange={e => setPassword(e.target.value)} required />
                        <button className="w-full py-4 bg-blue-600 text-white font-black rounded-xl uppercase italic shadow-lg">
                            {authMode === 'login' ? 'Entrar' : 'Registrar'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            <div className="mx-auto max-w-7xl p-4 md:p-8">
                <header className="mb-8 bg-slate-900 p-6 rounded-3xl border border-slate-800 flex justify-between items-center shadow-xl">
                    <div className="flex items-center gap-4">
                        <Building2 className="text-blue-500" size={28} />
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">Radar Gestión</h1>
                    </div>
                    <button onClick={() => supabase.auth.signOut()} className="p-3 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl transition-all"><LogOut size={20} /></button>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-8 text-left">
                    <aside className="space-y-4">
                        <div className="space-y-3">
                            {ayudasConMatch.map(ayu => (
                                <button key={ayu.id} onClick={() => setSelectedId(ayu.id)} className={`w-full p-5 rounded-[1.8rem] border text-left transition-all ${selectedId === ayu.id ? 'bg-blue-600 border-blue-400' : 'bg-slate-900 border-slate-800'}`}>
                                    <h3 className="font-black text-white uppercase italic text-xs mb-1">{ayu.titulo}</h3>
                                    <p className="text-[9px] font-black text-white">{ayu.match.score}% Afinidad</p>
                                </button>
                            ))}
                        </div>
                    </aside>

                    <main className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 md:p-10 shadow-2xl">
                        {selectedHelp ? (
                            <div>
                                <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter mb-6">{selectedHelp.titulo}</h2>
                                <div className="bg-blue-600/5 p-8 rounded-[2rem] border border-blue-500/10 mb-8">
                                    <h4 className="text-blue-400 font-black text-[10px] uppercase mb-5 tracking-widest">Análisis Técnico</h4>
                                    <ul className="space-y-3">
                                        {selectedHelp.match.reasons.map((r, i) => <li key={i} className="text-slate-300 text-[11px] flex items-center gap-3 italic"><CheckCircle2 size={16} className="text-emerald-500" /> {r}</li>)}
                                    </ul>
                                </div>

                                {/* BOTÓN DE ACCIÓN DEFINITIVO (WhatsApp) */}
                                <button
                                    onClick={handleWhatsAppContact}
                                    className="w-full py-6 bg-emerald-600 text-white rounded-2xl font-black uppercase italic flex justify-center items-center gap-3 shadow-2xl hover:bg-emerald-500 transition-all transform hover:scale-[1.01] text-lg cursor-pointer"
                                >
                                    <MessageSquare size={24} className="animate-pulse" /> Consultar por WhatsApp
                                </button>
                                <p className="mt-4 text-[10px] text-slate-500 text-center uppercase font-bold tracking-widest italic">Respuesta técnica inmediata de su asesor</p>
                            </div>
                        ) : <p className="text-center opacity-40">Seleccione un boletín</p>}
                    </main>
                </div>
            </div>
        </div>
    );
}