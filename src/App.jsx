import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Building2, LogOut, Shield, CheckCircle2, RefreshCcw, MessageSquare, Sparkles } from 'lucide-react';

// 1. CONEXIÓN (Clave recuperada de tu Connect)
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

    // FUNCIÓN DE PRUEBA INFALIBLE
    const handleContact = () => {
        // Diagnóstico: Si ves este mensaje, el botón FUNCIONA.
        alert("Conectando con el asesor... Pulsa Aceptar para abrir WhatsApp.");

        const texto = encodeURIComponent(`Hola, solicito estudio para: ${selectedHelp.titulo}. Empresa: ${profile?.company_name}`);
        // Usamos location.href que es más difícil de bloquear que window.open
        window.location.href = `https://wa.me/34600000000?text=${texto}`;
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-400 font-bold">CARGANDO RADAR...</div>;

    if (!session) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="bg-slate-900 p-10 rounded-[2rem] border border-slate-800 text-center">
                <Building2 className="text-blue-500 mx-auto mb-4" size={40} />
                <h1 className="text-white font-black uppercase italic text-2xl mb-6">Radar Gestión</h1>
                <p className="text-slate-400 text-sm mb-8">Por favor, identifíquese para ver sus boletines.</p>
                <button onClick={() => alert("Usa el formulario de login")} className="text-blue-500 font-bold uppercase text-xs">Acceso Restringido</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 mb-8">
                    <div className="flex items-center gap-3">
                        <Shield className="text-blue-500" size={24} />
                        <h1 className="text-xl font-black uppercase italic text-white">Radar Gestión</h1>
                    </div>
                    <button onClick={() => supabase.auth.signOut()} className="text-rose-500"><LogOut size={20} /></button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8">
                    <aside className="space-y-4 text-left">
                        {ayudas.map(ayu => (
                            <button key={ayu.id} onClick={() => setSelectedId(ayu.id)} className={`w-full p-5 rounded-2xl border transition-all ${selectedId === ayu.id ? 'bg-blue-600 border-blue-400' : 'bg-slate-900 border-slate-800'}`}>
                                <h3 className="font-bold text-white uppercase text-[11px] leading-tight">{ayu.titulo}</h3>
                            </button>
                        ))}
                    </aside>

                    <main className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 text-left">
                        {selectedHelp ? (
                            <div className="animate-in fade-in duration-500">
                                <h2 className="text-3xl font-black text-white uppercase italic mb-6 leading-none">{selectedHelp.titulo}</h2>
                                <div className="bg-blue-500/5 p-6 rounded-2xl border border-blue-500/10 mb-8">
                                    <p className="text-blue-400 font-bold text-[10px] uppercase mb-4 tracking-widest">Información Técnica</p>
                                    <p className="text-slate-300 text-sm italic">{selectedHelp.amount_summary || "Consulte bases para importes exactos."}</p>
                                </div>

                                {/* EL BOTÓN CRÍTICO */}
                                <button
                                    onClick={handleContact}
                                    className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase italic flex justify-center items-center gap-3 shadow-xl transition-all cursor-pointer"
                                >
                                    <MessageSquare size={24} /> Consultar por WhatsApp
                                </button>

                                <div className="mt-8 pt-8 border-t border-slate-800">
                                    <p className="text-slate-500 text-[10px] font-bold uppercase text-center italic tracking-widest">Análisis proactivo para {profile.company_name}</p>
                                </div>
                            </div>
                        ) : <p className="text-center opacity-30">Seleccione una ayuda del monitor izquierdo</p>}
                    </main>
                </div>
            </div>
        </div>
    );
}