import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    Building2, LogOut, Shield, CheckCircle2, RefreshCcw,
    MessageSquare, Sparkles, Calendar, Target, Info, AlertCircle
} from 'lucide-react';

// CONEXIÓN TÉCNICA
const supabaseUrl = "https://kygynasotwfhuqfiqgzj.supabase.co";
const supabaseAnonKey = "sb_publishable_3HBDFOO2eCMowpwYnw2Pmw_L3Enp3N-";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TAG_STYLES = {
    digitalizacion: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    sostenibilidad: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    consultoria: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    otros: "bg-slate-500/10 text-slate-400 border-slate-500/20"
};

export default function App() {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [ayudas, setAyudas] = useState([]);
    const [loading, setLoading] = useState(true);
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
        const { data: ayu } = await supabase.from('ayudas').select('*').order('business_fit_score', { ascending: false });
        setProfile(prof || { company_name: 'Empresa Invitada' });
        setAyudas(ayu || []);
        setLoading(false);
    }

    const selectedHelp = ayudas.find(a => a.id === selectedId) || ayudas[0];

    const handleContact = () => {
        if (!selectedHelp) return;
        const texto = encodeURIComponent(`Hola, solicito estudio de viabilidad para: "${selectedHelp.title}". (ID: ${selectedHelp.reference_id}). Empresa: ${profile?.company_name}`);
        window.location.href = `https://wa.me/34600000000?text=${texto}`;
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-blue-400 font-black gap-4 uppercase italic">
            <RefreshCcw className="animate-spin" size={32} /> Sincronizando Radar...
        </div>
    );

    if (!session) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-left">
            <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl max-w-sm w-full">
                <Building2 className="text-blue-500 mb-6" size={40} />
                <h1 className="text-white font-black uppercase italic text-2xl mb-2 tracking-tighter">Radar Gestión</h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8">Acceso exclusivo clientes</p>
                <div className="p-4 bg-black/50 rounded-xl border border-slate-800 text-[11px] text-slate-400 italic">
                    Por favor, utilice el formulario de acceso para entrar al monitor.
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 text-left">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center bg-slate-900/50 p-6 rounded-3xl border border-slate-800 mb-8 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-600 rounded-lg"><Shield className="text-white" size={20} /></div>
                        <div>
                            <h1 className="text-xl font-black uppercase italic text-white leading-none">Radar Gestión</h1>
                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">Vigilancia Normativa Activa</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="hidden sm:block text-[9px] font-black uppercase text-slate-500 italic pr-4 border-r border-slate-800">{profile.company_name}</span>
                        <button onClick={() => supabase.auth.signOut()} className="text-rose-500 hover:text-white transition-colors"><LogOut size={20} /></button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
                    <aside className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">Publicaciones Recientes</h3>
                        <div className="space-y-3 overflow-y-auto max-h-[75vh] pr-2 custom-scrollbar">
                            {ayudas.length > 0 ? ayudas.map(ayu => (
                                <button key={ayu.id} onClick={() => setSelectedId(ayu.id)} className={`w-full p-5 rounded-[2rem] border transition-all duration-300 ${selectedId === ayu.id ? 'bg-blue-600 border-blue-400 shadow-xl' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[8px] font-black text-blue-300 uppercase tracking-widest">{ayu.territory_name}</span>
                                        <span className="text-[10px] font-black text-white italic">{ayu.business_fit_score}/10</span>
                                    </div>
                                    <h3 className="font-black text-white uppercase italic text-[11px] leading-tight line-clamp-2">{ayu.title}</h3>
                                </button>
                            )) : <div className="p-8 text-center text-slate-600 italic text-xs">Esperando datos de Relevance...</div>}
                        </div>
                    </aside>

                    <main className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-8 md:p-12 shadow-2xl backdrop-blur-sm">
                        {selectedHelp ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {selectedHelp.tags?.map(tag => (
                                        <span key={tag} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${TAG_STYLES[tag] || TAG_STYLES.otros}`}>{tag}</span>
                                    ))}
                                    {selectedHelp.data_quality_warning && <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20 flex items-center gap-1"><AlertCircle size={10} /> Revisión pendiente</span>}
                                </div>

                                <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic mb-4 leading-[0.9] tracking-tighter">{selectedHelp.title}</h2>
                                <p className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.3em] mb-10 flex items-center gap-2"><Target size={14} /> {selectedHelp.organismo}</p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                    <div className="bg-black/30 p-6 rounded-3xl border border-white/5">
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-2 tracking-widest">Afinidad de Negocio</p>
                                        <div className="flex items-end gap-2">
                                            <p className="text-3xl font-black text-white italic leading-none">{selectedHelp.business_fit_score}<span className="text-sm text-slate-500">/10</span></p>
                                        </div>
                                    </div>
                                    <div className="bg-black/30 p-6 rounded-3xl border border-white/5">
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-2 tracking-widest">Presupuesto</p>
                                        <p className="text-white font-black text-sm uppercase italic">{selectedHelp.amount_summary || "Ver bases"}</p>
                                    </div>
                                    <div className="bg-black/30 p-6 rounded-3xl border border-white/5">
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-2 tracking-widest">Plazo Final</p>
                                        <p className="text-white font-black text-sm uppercase italic">{selectedHelp.deadline_at || "Permanente"}</p>
                                    </div>
                                </div>

                                <div className="space-y-8 mb-12 text-left">
                                    <div className="bg-blue-600/5 p-8 rounded-[2.5rem] border border-blue-500/10">
                                        <h4 className="text-blue-400 font-black text-[10px] uppercase mb-6 tracking-[0.2em] flex items-center gap-2"><Sparkles size={16} /> Puntos Clave para la Empresa</h4>
                                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {selectedHelp.summary_points?.map((point, i) => (
                                                <li key={i} className="text-slate-300 text-[11px] leading-relaxed flex gap-3 italic font-medium"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> {point}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-black/20 p-8 rounded-[2.5rem] border border-slate-800">
                                        <h4 className="text-slate-500 font-black text-[10px] uppercase mb-6 tracking-[0.2em] flex items-center gap-2"><Info size={16} /> Requisitos Técnicos</h4>
                                        <ul className="space-y-3">
                                            {selectedHelp.requirements?.map((req, i) => (
                                                <li key={i} className="text-slate-400 text-[11px] flex gap-3 italic"><span className="text-blue-500 font-black">/</span> {req}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <button
                                    onClick={handleContact}
                                    className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black uppercase italic flex justify-center items-center gap-4 shadow-2xl transition-all transform hover:scale-[1.01] text-xl cursor-pointer"
                                >
                                    <MessageSquare size={28} className="animate-pulse" /> Consultar Viabilidad con mi Asesoría
                                </button>
                                <p className="text-center mt-4 text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">Identificador Oficial: {selectedHelp.reference_id}</p>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
                                <Building2 size={60} className="mb-4 text-slate-700" />
                                <p className="uppercase font-black tracking-widest text-xs">Radar en espera de selección</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}