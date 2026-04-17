import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Building2, KeySquare, ChevronDown, X, SendHorizontal, Users, Save, BadgePercent, Zap, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

const supabase = createClient('https://kygynasotwfhuqfiqgzj.supabase.co', 'sb_publishable_3HBDFOO2eCMowpwYnw2Pmw_L3Enp3N-');

export default function App() {
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [seleccionado, setSeleccionado] = useState(null);
    const [vista, setVista] = useState('ayudas');
    const [regAbierta, setRegAbierta] = useState(null);
    const [mostrarPin, setMostrarPin] = useState(false);
    const [pinIngresado, setPinIngresado] = useState("");
    const [pinObjetivo, setPinObjetivo] = useState("");
    const [accionPendiente, setAccionPendiente] = useState(null);
    const [verRequisitos, setVerRequisitos] = useState(false);

    const contactar = (asunto) => {
        window.location.href = `mailto:jose@aulagentia.eu?subject=${encodeURIComponent(asunto)}`;
        alert("📧 Solicitud enviada al asesor: " + asunto);
    };

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase.from('solicitudes').select('*');
            setSolicitudes(data || []);
            setLoading(false);
        };
        fetch();
    }, []);

    const verificarPin = () => {
        if (pinIngresado === pinObjetivo) {
            if (accionPendiente) accionPendiente();
            setMostrarPin(false);
            setPinIngresado("");
        }
    };

    const current = seleccionado ? solicitudes.find(s => s.id === seleccionado.id) : null;

    const NORMAS = [
        { id: '1', sec: 'TODOS', n: "LOPD / RGPD", m: "20M€", p: ["Cifrado de datos", "Contratos confidencialidad", "Destrucción papel", "Registro actividades"] },
        { id: '2', sec: 'TODOS', n: "Prevención Riesgos", m: "800k€", p: ["Evaluación puestos", "Formación plantilla", "Entrega EPIs", "Vigilancia salud"] },
        { id: '3', sec: 'HOSTELERÍA', n: "Sanidad (APPCC)", m: "600k€", p: ["Registro temperaturas", "Plan desinfección", "Control proveedores", "Puntos críticos"] },
        { id: '4', sec: 'TALLER', n: "Residuos Aceite", m: "1.2M€", p: ["Gestor autorizado", "Libro registro", "Contenedores estancos", "Declaración anual"] },
        { id: '5', sec: 'COMERCIO', n: "Hojas Reclamación", m: "50k€", p: ["Cartel visible", "Talonario oficial", "Precios expuestos", "Protocolo respuesta"] }
    ];

    if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-blue-500 font-black uppercase italic">Cargando Radar...</div>;

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans">

            {mostrarPin && (
                <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-4">
                    <div className="bg-[#0f172a] border border-slate-800 p-10 rounded-[2rem] max-w-sm w-full text-center">
                        <KeySquare size={40} className="text-blue-500 mx-auto mb-4" />
                        <input type="password" value={pinIngresado} onChange={(e) => setPinIngresado(e.target.value)} className="bg-slate-900 border border-slate-800 text-white text-3xl text-center w-full py-4 rounded-xl mb-4 outline-none" placeholder="****" autoFocus />
                        <button onClick={verificarPin} className="w-full py-4 bg-white text-black rounded-xl font-black uppercase italic">Entrar</button>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                <header className="mb-10 flex items-center justify-between border-b border-slate-800 pb-8">
                    <div className="flex items-center gap-4">
                        <Building2 size={32} className="text-blue-500" />
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">Radar <span className="text-blue-500">Gestión</span></h1>
                    </div>
                    <select value={seleccionado ? seleccionado.id : "admin"} onChange={(e) => {
                        const val = e.target.value;
                        if (val === "admin") { setPinObjetivo("ADMIN1"); setAccionPendiente(() => () => setSeleccionado(null)); }
                        else { const s = solicitudes.find(x => x.id === parseInt(val)); setPinObjetivo(s.clave); setAccionPendiente(() => () => setSeleccionado(s)); }
                        setMostrarPin(true);
                    }} className="bg-slate-900 text-white text-[10px] font-black p-3 rounded-xl border border-slate-800 uppercase outline-none">
                        <option value="admin">ADMINISTRADOR</option>
                        {solicitudes.map(s => <option key={s.id} value={s.id}>{s.empresa}</option>)}
                    </select>
                </header>

                {!seleccionado ? (
                    <div className="bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                        {solicitudes.map(s => (
                            <div key={s.id} className="p-6 border-b border-slate-800/50 flex justify-between items-center hover:bg-slate-800/20 transition-all">
                                <div><p className="text-white font-bold">{s.empresa}</p><p className="text-slate-500 text-[10px] uppercase font-black">{s.sector} • {s.empleados} empleados</p></div>
                                <button onClick={() => { setPinObjetivo(s.clave); setAccionPendiente(() => () => setSeleccionado(s)); setMostrarPin(true); }} className="bg-slate-800 px-5 py-2 rounded-xl text-[10px] font-black uppercase italic hover:bg-white hover:text-black transition-all">Auditar</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-500">
                        <div className="flex justify-between items-center mb-8 bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
                            <div>
                                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">{current.empresa}</h2>
                                <p className="text-blue-500 font-black text-[10px] uppercase tracking-widest">{current.sector}</p>
                            </div>
                            <button onClick={() => { setSeleccionado(null); setVerRequisitos(false); }} className="px-5 py-3 bg-red-500/10 text-red-500 rounded-xl uppercase text-[10px] font-black italic border border-red-500/20">Salir</button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="space-y-4">
                                <button onClick={() => setVista('ayudas')} className={`w-full p-6 rounded-[2rem] text-[10px] font-black uppercase border transition-all text-left ${vista === 'ayudas' ? 'bg-blue-600 text-white border-blue-400 shadow-lg' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>💰 Ayudas y Subvenciones</button>
                                <button onClick={() => setVista('normas')} className={`w-full p-6 rounded-[2rem] text-[10px] font-black uppercase border transition-all text-left ${vista === 'normas' ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>🛡️ Cumplimiento Legal</button>
                            </div>

                            <div className="lg:col-span-2">
                                {vista === 'ayudas' ? (
                                    <div className="space-y-6">
                                        <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
                                            <h3 className="text-white font-black uppercase italic mb-6 tracking-widest text-sm text-emerald-500">Oportunidades Destacadas</h3>

                                            <div className="bg-emerald-600/10 border border-emerald-500/30 p-8 rounded-3xl border-l-[10px] border-l-emerald-500 mb-6">
                                                <div className="flex justify-between items-start mb-6">
                                                    <h4 className="text-white font-black text-xl uppercase italic leading-tight">Ayudas a la contratación:<br /><span className="text-emerald-500 text-sm">CONTRATOS EN ALTERNANCIA</span></h4>
                                                    <Zap className="text-emerald-500" size={32} />
                                                </div>
                                                <p className="text-slate-300 text-sm mb-8 italic leading-relaxed text-balance">Ahorra entre <span className="text-white font-black underline">7.000€ y 14.000€</span> al año por trabajador contratado.</p>

                                                {!verRequisitos ? (
                                                    <button onClick={() => setVerRequisitos(true)} className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase italic text-xs shadow-xl transition-all">Saber más y Ver Requisitos</button>
                                                ) : (
                                                    <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                                                        <div className="grid grid-cols-1 gap-4">
                                                            <div className="bg-black/40 p-6 rounded-2xl border border-white/5 italic">
                                                                <p className="text-emerald-500 font-black text-[10px] uppercase mb-4 tracking-widest">💰 Nómina y Cotización:</p>
                                                                <p className="text-slate-300 text-xs mb-2 leading-relaxed">• El 1er año pagas el 65% del convenio. El 2º año el 85%.</p>
                                                                <p className="text-slate-300 text-xs leading-relaxed">• El empleado cotiza al 100% de su jubilación aunque tú pagues menos nómina.</p>
                                                            </div>
                                                            <div className="bg-blue-600/10 p-6 rounded-2xl border border-blue-500/20 italic">
                                                                <p className="text-blue-400 font-black text-[10px] uppercase mb-4 tracking-widest">⚡ Beneficio Seguridad Social:</p>
                                                                <p className="text-slate-300 text-xs mt-2 leading-relaxed">Pagas 50€/mes, pero la SS te abona 90€/mes. <br /> <span className="text-white font-black text-sm">¡Ganas +40€/mes por tener al trabajador!</span></p>
                                                            </div>
                                                            <div className="bg-amber-600/10 p-6 rounded-2xl border border-amber-500/20 italic">
                                                                <p className="text-amber-500 font-black text-[10px] uppercase mb-4 tracking-widest">🏆 Bono de Permanencia:</p>
                                                                <p className="text-slate-300 text-xs leading-relaxed">• Bono de <span className="text-white font-bold">1.500€/año durante 3 años</span> si lo haces fijo.</p>
                                                                <p className="text-slate-400 text-[10px] mt-2 leading-tight">Si se va o lo echas en los primeros 2 años de formación, <span className="text-white underline">no tienes que devolver nada</span>.</p>
                                                            </div>
                                                            <div className="bg-red-600/10 p-6 rounded-2xl border border-red-500/20 italic border-l-4 border-l-red-500">
                                                                <p className="text-red-400 font-black text-[10px] uppercase mb-4 tracking-widest flex items-center gap-2"><AlertCircle size={14} /> Caso Hijos:</p>
                                                                <p className="text-slate-300 text-xs leading-relaxed">• Puedes contratarlos, pero <span className="text-white font-bold underline">no tendrán derecho a cobrar paro</span>.</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <button onClick={() => setVerRequisitos(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-xl font-black uppercase italic text-[10px]">Cerrar</button>
                                                            <button onClick={() => contactar("Solicitud Contrato Alternancia")} className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase italic text-[10px] shadow-lg">Saber más</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl border-l-4 border-l-blue-500">
                                                    <h4 className="text-white font-black text-xs mb-4 uppercase italic">Kit Digital 2024</h4>
                                                    <p className="text-slate-500 text-[11px] mb-6 italic">Bonos de digitalización para autónomos y PYMES.</p>
                                                    <button onClick={() => contactar("Saber más Kit Digital")} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase italic">Saber más</button>
                                                </div>
                                                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl border-l-4 border-l-slate-700">
                                                    <h4 className="text-white font-black text-xs mb-4 uppercase italic">Otros Trámites</h4>
                                                    <p className="text-slate-500 text-[11px] mb-6 italic">Consulta otras líneas de subvención activas en tu comunidad.</p>
                                                    <button onClick={() => contactar("Consultar otras ayudas")} className="w-full py-4 bg-slate-800 hover:bg-white hover:text-black text-white rounded-xl text-[10px] font-black uppercase italic transition-all">Saber más</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <h3 className="text-white font-black uppercase italic mb-6 tracking-widest text-sm text-emerald-500">Auditoría Normativa</h3>
                                        {NORMAS.filter(n => n.sec === 'TODOS' || (current.sector && n.sec === current.sector.toUpperCase())).map(n => (
                                            <div key={n.id} className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all shadow-xl">
                                                <button onClick={() => setRegAbierta(regAbierta === n.id ? null : n.id)} className="w-full p-6 flex justify-between items-center">
                                                    <span className="text-white font-black uppercase text-[11px] italic tracking-tighter">{n.n}</span>
                                                    <ChevronDown size={18} className={regAbierta === n.id ? "rotate-180 transition-all text-blue-500" : "text-slate-600"} />
                                                </button>
                                                {regAbierta === n.id && (
                                                    <div className="p-8 bg-black/30 border-t border-slate-800 italic animate-in slide-in-from-top-2">
                                                        <p className="text-[10px] text-blue-500 uppercase font-black mb-4 italic tracking-widest">Hoja de Ruta de Implantación:</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6 text-balance">
                                                            {n.p.map((p, i) => <p key={i} className="text-slate-400 text-[11px] flex items-center gap-2"> <Info size={12} className="text-blue-500/50" /> {p}</p>)}
                                                        </div>
                                                        <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
                                                            <div><p className="text-[9px] text-slate-500 uppercase font-black italic mb-1">Multa Máxima</p><p className="text-red-500 font-black text-2xl tracking-tighter italic">{n.m}</p></div>
                                                            <button onClick={() => contactar(`Regularizar ${n.n}`)} className="bg-white text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase italic shadow-lg hover:bg-blue-600 hover:text-white transition-all">Saber más</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}