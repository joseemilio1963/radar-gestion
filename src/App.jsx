import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Building2, LogOut, Shield, CheckCircle2, RefreshCcw, MessageSquare, Sparkles, Calendar, ExternalLink } from 'lucide-react';

// 1. CONEXIÓN TÉCNICA (Sincronizada con tu proyecto Radar)
const supabaseUrl = "https://kygynasotwfhuqfiqgzj.supabase.co";
const supabaseAnonKey = "sb_publishable_3HBDFOO2eCMowpwYnw2Pmw_L3Enp3N-";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
        const { data: ayu } = await supabase.from('ayudas').select('*').order('updated_at', { ascending: false });
        setProfile(prof || { company_name: 'Empresa Invitada', province: 'valencia' });
        setAyudas(ayu || []);
        setLoading(false);
    }

    const selectedHelp = ayudas.find(a => a.id === selectedId) || ayudas[0];

    // FUNCIÓN DE CONTACTO PROFESIONAL
    const handleContact = () => {
        if (!selectedHelp) return;
        const texto = encodeURIComponent(`Hola, solicito estudio de viabilidad para la ayuda: "${selectedHelp.titulo}". Empresa: ${profile?.company_name || 'Interesada'}.`);
        // CAMBIA ESTE NÚMERO POR EL TUYO REAL (Ejemplo: 34600112233)
        const tuTelefono = "34600000000";
        window.location.href = `https://wa.me/${tuTelefono}?text=${texto}`;
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-blue-400 font-black gap-4 uppercase italic tracking-tighter">
            <RefreshCcw className="animate-spin" size={32} /> Sincronizando Radar...
        </div>
    );

    if (!session) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 text-center shadow-2xl max-w-sm w-full">
                <div className="bg-blue-600/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Building2 className="text-blue-500" size={32} />
                </div>
                <h1 className="text-white font-black uppercase italic text-2xl mb-2 tracking-tighter">Radar Gestión</h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">Vigilancia de Boletines Oficiales</p>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">Área restringida para empresas y asesorías autorizadas.</p>
                <div className="p-4 bg-black/50 rounded-xl border border-slate-800 text-[10px] text-slate-500 font-bold uppercase">
                    Utilice el formulario lateral para acceder
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center bg-slate-900/50 p-6 rounded-3xl border border-slate-800 mb-8 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-600 rounded-lg"><Shield className="text-white" size={20} /></div>
                        <div>
                            <h1 className="text-xl font-black uppercase italic text-white leading-none">Radar Gestión</h1>
                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">Market Maker AI System</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="hidden sm:block text-[9px] font-black uppercase text-slate-500 border-r border-slate-800 pr-4 italic">{profile.company_name}</span>
                        <button onClick={() => supabase.auth.signOut()} className="text-rose-500 hover:text-white transition-colors"><LogOut size={20} /></button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
                    <aside className="space-y-4 text-left">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Monitor de Publicaciones</h3>
                            <Sparkles size={14} className="text-blue-500" />
                        </div>
                        <div className="space-y-3 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                            {ayudas.map(ayu => (
                                <button key={ayu.id} onClick={() => setSelectedId(ayu.id)} className={`w-full p-6 rounded-[2rem] border transition-all duration-300 ${selectedId === ayu.id ? 'bg-blue-600 border-blue-400 shadow-xl scale-[1.02]' : 'bg-slate-900/40 border-slate-800 hover:border-slate-600'}`}>
                                    <h3 className="font-black text-white uppercase italic text-[11px] leading-tight mb-2">{ayu.titulo}</h3>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[8px] font-black text-blue-300 uppercase tracking-widest">{ayu.organismo}</span>
                                        <span className="text-[10px] font-black text-white italic">Ficha Técnica →</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </aside>

                    <main className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-8 md:p-12 text-left backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5"><Building2 size={200} /></div>

                        {selectedHelp ? (
                            <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="mb-10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">Publicado</span>
                                        <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/20">Apta para estudio</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic mb-6 leading-[0.9] tracking-tighter">{selectedHelp.titulo}</h2>
                                    <p className="text-slate-400 font-medium text-sm max-w-2xl leading-relaxed italic">Análisis automatizado de compatibilidad según el perfil de su empresa registrado en la base de datos.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                                    <div className="bg-black/30 p-6 rounded-3xl border border-white/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Calendar className="text-blue-500" size={18} />
                                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Plazo de Presentación</p>
                                        </div>
                                        <p className="text-white font-black text-lg uppercase italic">{selectedHelp.deadline_at || "Vigente / Permanente"}</p>
                                    </div>
                                    <div className="bg-black/30 p-6 rounded-3xl border border-white/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Shield className="text-emerald-500" size={18} />
                                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Resumen Económico</p>
                                        </div>
                                        <p className="text-emerald-500 font-black text-lg uppercase italic">{selectedHelp.amount_summary || "Ver Bases Oficiales"}</p>
                                    </div>
                                </div>

                                <div className="bg-blue-600/10 p-8 rounded-[2.5rem] border border-blue-500/20 mb-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <CheckCircle2 className="text-blue-400" size={20} />
                                        <h4 className="text-blue-400 font-black text-[10px] uppercase tracking-[0.3em]">Criterios de Éxito Estimados</h4>
                                    </div>
                                    <ul className="space-y-4">
                                        <li className="text-slate-200 text-xs flex gap-3 italic"><span className="text-blue-500 font-black">/</span> Empresa en activo con domicilio fiscal compatible.</li>
                                        <li className="text-slate-200 text-xs flex gap-3 italic"><span className="text-blue-500 font-black">/</span> Cumplimiento de la Ley de Subvenciones.</li>
                                        <li className="text-slate-200 text-xs flex gap-3 italic"><span className="text-blue-500 font-black">/</span> Capacidad técnica para la ejecución del proyecto.</li>
                                    </ul>
                                </div>

                                <div className="space-y-4">
                                    <button
                                        onClick={handleContact}
                                        className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-black uppercase italic flex justify-center items-center gap-4 shadow-2xl transition-all transform hover:scale-[1.01] text-xl cursor-pointer"
                                    >
                                        <MessageSquare size={28} className="animate-pulse" /> Consultar Viabilidad con mi Asesoría
                                    </button>
                                    <p className="text-center text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">Sincronizado con jose@aulagentia.eu</p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20">
                                <RefreshCcw size={48} className="animate-spin text-slate-500" />
                                <p className="font-black uppercase italic tracking-widest text-xs">Esperando selección...</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}