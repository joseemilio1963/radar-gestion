import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Building2, KeySquare, ChevronDown, ChevronUp, UserCheck, X, ShieldCheck, SendHorizontal, AlertTriangle, CheckCircle2, Info, ListChecks, Store, Utensils, Wrench } from 'lucide-react';

const supabaseUrl = 'https://kygynasotwfhuqfiqgzj.supabase.co';
const supabaseAnonKey = 'sb_publishable_3HBDFOO2eCMowpwYnw2Pmw_L3Enp3N-';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("asesoria");
    const [seleccionado, setSeleccionado] = useState(null);
    const [modoVista, setModoVista] = useState('ayudas');
    const [regAbierta, setRegAbierta] = useState(null);
    const [mostrarPin, setMostrarPin] = useState(false);
    const [pinIngresado, setPinIngresado] = useState("");
    const [pinObjetivo, setPinObjetivo] = useState("");
    const [accionPendiente, setAccionPendiente] = useState(null);
    const [errorPin, setErrorPin] = useState(false);

    const contactarAsesoria = (asunto) => {
        const mail = "jose@aulagentia.eu";
        const mailtoUrl = `mailto:${mail}?subject=${encodeURIComponent(asunto)}`;
        window.location.href = mailtoUrl;
    };

    // BASE DE DATOS DE NORMAS (Transversales + Específicas por Sector)
    const TODAS_LAS_NORMAS = [
        { id: 't1', sector: 'todos', nombre: "LOPD / RGPD", resumen: "Protección de datos.", justificacion: "Obligatoria para toda empresa que gestione datos de clientes o empleados.", pasos: ["Claves seguras", "Contratos confidencialidad"], sancion: "Hasta 20M€", estado: "peligro", color: "text-red-500", bg: "bg-red-500/10" },
        { id: 't2', sector: 'todos', nombre: "Prevención Riesgos", resumen: "Salud laboral.", justificacion: "Obligatorio para evitar accidentes y responsabilidad penal del administrador.", pasos: ["Evaluación puestos", "Formación"], sancion: "Hasta 800k€", estado: "ok", color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { id: 'h1', sector: 'HOSTELERÍA', nombre: "Control Sanitario (APPCC)", resumen: "Seguridad alimentaria.", justificacion: "Obligatorio para garantizar la higiene y trazabilidad de los alimentos.", pasos: ["Registro temperaturas", "Plan de limpieza"], sancion: "Hasta 600k€", estado: "peligro", color: "text-red-500", bg: "bg-red-500/10" },
        { id: 'w1', sector: 'TALLER', nombre: "Residuos Industriales", resumen: "Aceites y baterías.", justificacion: "Gestión obligatoria de residuos peligrosos para evitar delitos ecológicos.", pasos: ["Contrato gestor", "Libro registro"], sancion: "Hasta 1.2M€", estado: "aviso", color: "text-amber-500", bg: "bg-amber-500/10" },
        { id: 'c1', sector: 'COMERCIO', nombre: "Consumo y Precios", resumen: "Hojas reclamación.", justificacion: "Obligatorio tener hojas oficiales y precios visibles para evitar multas de consumo.", pasos: ["Cartelería oficial", "Precios expuestos"], sancion: "Hasta 50k€", estado: "peligro", color: "text-red-500", bg: "bg-red-500/10" }
    ];

    useEffect(() => {
        async function fetchClientes() {
            try {
                const { data, error } = await supabase.from('solicitudes').select('*');
                if (error) throw error;
                setSolicitudes(data || []);
            } catch (err) { console.error("Error:", err.message); } finally { setLoading(false); }
        }
        fetchClientes();
    }, []);

    const verificarPin = () => {
        if (pinIngresado === pinObjetivo) {
            if (accionPendiente) accionPendiente();
            setMostrarPin(false);
            setPinIngresado("");
            setErrorPin(false);
        } else {
            setErrorPin(true);
            setPinIngresado("");
        }
    };

    const current = seleccionado ? solicitudes.find(s => s.id === seleccionado.id) : null;
    const normasFiltradas = current ? TODAS_LAS_NORMAS.filter(n => n.sector === 'todos' || n.sector === current.sector.toUpperCase()) : [];

    if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans">

            {/* BOTÓN FLOTANTE */}
            <button
                onClick={() => contactarAsesoria("Presupuesto General")}
                className="fixed bottom-8 right-8 z-[100] bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-[0_0_30px_rgba(37,99,235,0.6)] flex items-center gap-3 border border-blue-400"
            >
                <SendHorizontal size={20} /> Solicitar presupuesto
            </button>

            {mostrarPin && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[110] flex items-center justify-center p-4">
                    <div className="bg-[#0f172a] border border-slate-800 p-10 rounded-[2.5rem] max-w-sm w-full text-center">
                        <KeySquare size={48} className="text-blue-500 mx-auto" />
                        <h2 className="text-xl font-black text-white uppercase mt-4 italic">Validar Acceso</h2>
                        <input type="password" maxLength={6} value={pinIngresado} onChange={(e) => setPinIngresado(e.target.value)} className={`bg-slate-900 border ${errorPin ? 'border-red-500' : 'border-slate-800'} text-white text-3xl text-center w-full py-5 rounded-2xl mt-6`} placeholder="****" autoFocus />
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => setMostrarPin(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] uppercase">Cancelar</button>
                            <button onClick={verificarPin} className="flex-1 py-4 bg-white text-black rounded-xl font-black text-[10px] uppercase">Entrar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 pb-10">
                    <div className="flex items-center gap-5">
                        <div className="p-3 rounded-2xl bg-white/5 border border-slate-800">
                            <Building2 size={40} className="text-blue-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Radar <span className="text-blue-500">Gestión</span></h1>
                            <p className="text-slate-500 text-[10px] font-black tracking-[0.4em] uppercase">ASESORÍA VALENCIA</p>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-800 flex items-center gap-4">
                        <UserCheck size={16} className="text-slate-600" />
                        <select value={userRole} onChange={(e) => {
                            const val = e.target.value;
                            if (val === "asesoria") { setPinObjetivo("ADMIN1"); setAccionPendiente(() => () => { setUserRole("asesoria"); setSeleccionado(null); }); }
                            else { const emp = solicitudes.find(s => s.id === parseInt(val)); setPinObjetivo(emp?.clave || ""); setAccionPendiente(() => () => { setUserRole(val); setSeleccionado(emp); }); }
                            setMostrarPin(true);
                        }} className="bg-transparent text-[10px] font-black text-white outline-none uppercase">
                            <option value="asesoria" className="bg-[#0f172a]">ADMINISTRADOR</option>
                            {solicitudes.map(s => <option key={s.id} value={s.id} className="bg-[#0f172a]">{s.empresa}</option>)}
                        </select>
                    </div>
                </header>

                {userRole === "asesoria" && !seleccionado && (
                    <div className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center text-[10px] font-black uppercase">
                            <p className="text-blue-400">Base de Datos Conectada</p>
                            <p className="text-slate-500">{solicitudes.length} Clientes</p>
                        </div>
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-slate-800/50">
                                {solicitudes.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-800/20 transition-all group">
                                        <td className="px-8 py-6">
                                            <p className="font-bold text-white uppercase text-sm group-hover:text-blue-400">{item.empresa}</p>
                                            <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
                                                {item.sector.toUpperCase() === 'HOSTELERÍA' && <Utensils size={10} />}
                                                {item.sector.toUpperCase() === 'TALLER' && <Wrench size={10} />}
                                                {item.sector.toUpperCase() === 'COMERCIO' && <Store size={10} />}
                                                {item.sector}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button onClick={() => { setPinObjetivo(item.clave); setAccionPendiente(() => () => setSeleccionado(item)); setMostrarPin(true); }} className="px-6 py-2 bg-slate-800 text-slate-200 rounded-xl text-[9px] font-black uppercase hover:bg-white hover:text-black">Auditar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {current && (
                    <div className="animate-in slide-in-from-bottom-6 duration-500">
                        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                            <div>
                                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">{current.empresa}</h2>
                                <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest italic">{current.sector} • Auditoría Técnica</p>
                            </div>
                            <button onClick={() => setSeleccionado(null)} className="px-5 py-3 bg-red-500/10 text-red-500 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 hover:bg-red-500 hover:text-white">
                                <X size={14} /> Salir
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="space-y-3">
                                <button onClick={() => setModoVista('ayudas')} className={`w-full text-left px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest ${modoVista === 'ayudas' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}>Subvenciones</button>
                                <button onClick={() => setModoVista('normativas')} className={`w-full text-left px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest ${modoVista === 'normativas' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}>Cumplimiento</button>
                            </div>
                            <div className="lg:col-span-2">
                                {modoVista === 'normativas' && (
                                    <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-slate-800">
                                        <h3 className="text-white font-black uppercase italic mb-6">Informe de Situación Legal</h3>
                                        <div className="space-y-4">
                                            {normasFiltradas.map((norm) => (
                                                <div key={norm.id} className={`border border-slate-800 rounded-2xl ${norm.bg} overflow-hidden`}>
                                                    <button onClick={() => setRegAbierta(regAbierta === norm.id ? null : norm.id)} className="w-full px-8 py-6 flex items-center justify-between text-white font-bold uppercase text-sm">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`h-3 w-3 rounded-full animate-pulse ${norm.estado === 'peligro' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]' : 'bg-emerald-500'}`}></div>
                                                            {norm.nombre}
                                                        </div>
                                                        {regAbierta === norm.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                    </button>
                                                    {regAbierta === norm.id && (
                                                        <div className="p-8 bg-black/20 border-t border-slate-800">
                                                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                                                <div>
                                                                    <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Multa Máxima</p>
                                                                    <p className={`text-2xl font-black italic ${norm.color}`}>{norm.sancion}</p>
                                                                </div>
                                                                <button onClick={() => contactarAsesoria(`Regularización ${norm.nombre}`)} className={`px-8 font-black uppercase text-[10px] py-5 rounded-xl flex items-center justify-center gap-3 ${norm.estado === 'peligro' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-800 text-white'}`}>
                                                                    <SendHorizontal size={16} /> Regularizar YA
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {modoVista === 'ayudas' && (
                                    <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-slate-800">
                                        <h3 className="text-white font-black uppercase italic mb-6">Oportunidades Activas</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-blue-600/5 border border-blue-500/20 p-6 rounded-2xl flex flex-col justify-between">
                                                <h4 className="text-white font-bold uppercase text-sm mb-2">Kit Digital 2024</h4>
                                                <p className="text-slate-400 text-[10px] mb-4">Hasta 12.000€ para web y gestión.</p>
                                                <button onClick={() => contactarAsesoria("Kit Digital")} className="w-full py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase">Tramitar</button>
                                            </div>
                                            <div className="bg-emerald-600/5 border border-emerald-500/20 p-6 rounded-2xl flex flex-col justify-between">
                                                <h4 className="text-white font-bold uppercase text-sm mb-2">Ayuda Empleo</h4>
                                                <p className="text-slate-400 text-[10px] mb-4">Bonos por contratación indefinida.</p>
                                                <button onClick={() => contactarAsesoria("Ayuda Empleo")} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase">Consultar</button>
                                            </div>
                                        </div>
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