import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Building2, KeySquare, ChevronDown, ChevronUp, UserCheck, X, SendHorizontal, Users, Save } from 'lucide-react';

const supabaseUrl = 'https://kygynasotwfhuqfiqgzj.supabase.co';
const supabaseAnonKey = 'sb_publishable_3HBDFOO2eCMowpwYnw2Pmw_L3Enp3N-';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("asesoria");
    const [seleccionado, setSeleccionado] = useState(null);
    const [vista, setVista] = useState('ayudas');
    const [regAbierta, setRegAbierta] = useState(null);
    const [mostrarPin, setMostrarPin] = useState(false);
    const [pinIngresado, setPinIngresado] = useState("");
    const [pinObjetivo, setPinObjetivo] = useState("");
    const [accionPendiente, setAccionPendiente] = useState(null);
    const [errorPin, setErrorPin] = useState(false);
    const [editandoEmp, setEditandoEmp] = useState(false);
    const [nuevoNumEmp, setNuevoNumEmp] = useState(0);

    const contactar = (asunto) => {
        window.location.href = `mailto:jose@aulagentia.eu?subject=${encodeURIComponent(asunto)}`;
        alert("📧 Solicitud enviada: " + asunto);
    };

    const fetchClientes = async () => {
        try {
            const { data, error } = await supabase.from('solicitudes').select('*');
            if (error) throw error;
            setSolicitudes(data || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => { fetchClientes(); }, []);

    const guardarEmpleados = async (id) => {
        const { error } = await supabase.from('solicitudes').update({ empleados: nuevoNumEmp }).eq('id', id);
        if (!error) { await fetchClientes(); setEditandoEmp(false); }
    };

    const verificarPin = () => {
        if (pinIngresado === pinObjetivo) {
            if (accionPendiente) accionPendiente();
            setMostrarPin(false);
            setPinIngresado("");
        } else { setErrorPin(true); }
    };

    const current = seleccionado ? solicitudes.find(s => s.id === seleccionado.id) : null;

    // BASE DE DATOS DE NORMAS CON PASOS DE IMPLANTACIÓN
    const NORMAS = [
        {
            id: '1', sec: 'TODOS', n: "LOPD / RGPD", m: "20M€", c: "red",
            pasos: ["• Cifrado de claves y contraseñas.", "• Destrucción segura de documentos papel.", "• Firma de contratos de confidencialidad.", "• Registro de actividades de tratamiento."]
        },
        {
            id: '2', sec: 'TODOS', n: "Prevención Riesgos", m: "800k€", c: "emerald",
            pasos: ["• Evaluación de riesgos por puesto.", "• Plan de formación a la plantilla.", "• Entrega de equipos de protección (EPIs).", "• Vigilancia periódica de la salud."]
        },
        {
            id: '3', sec: 'HOSTELERÍA', n: "Control Sanitario (APPCC)", m: "600k€", c: "red",
            pasos: ["• Registro diario de temperaturas.", "• Plan de limpieza y desinfección.", "• Auditoría de proveedores homologados.", "• Análisis de puntos críticos en cocina."]
        },
        {
            id: '4', sec: 'TALLER', n: "Gestión Residuos Aceite", m: "1.2M€", c: "amber",
            pasos: ["• Contrato con gestor autorizado.", "• Contenedores rotulados y estancos.", "• Libro de registro de residuos peligrosos.", "• Declaración anual de producción."]
        },
        {
            id: '5', sec: 'COMERCIO', n: "Hojas Reclamación", m: "50k€", c: "red",
            pasos: ["• Cartel oficial visible al público.", "• Disponer de talonario oficial de la CCAA.", "• Exposición de precios finalistas.", "• Protocolo de respuesta en 10 días."]
        }
    ];

    const filtrarNormas = () => {
        if (!current) return [];
        const sCli = (current.sector || "").toUpperCase().trim();
        // Si el sector no coincide con nada, mostramos las de "TODOS" al menos
        const filtradas = NORMAS.filter(n => n.sec === 'TODOS' || sCli.includes(n.sec) || n.sec.includes(sCli));
        return filtradas.length > 0 ? filtradas : NORMAS.filter(n => n.sec === 'TODOS');
    };

    if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans">
            <button onClick={() => contactar("Presupuesto")} className="fixed bottom-8 right-8 z-[100] bg-blue-600 text-white px-6 py-4 rounded-2xl text-[11px] font-black uppercase shadow-2xl flex items-center gap-3 border border-blue-400">
                <SendHorizontal size={20} /> Presupuesto
            </button>

            {mostrarPin && (
                <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-4">
                    <div className="bg-[#0f172a] border border-slate-800 p-10 rounded-[2.5rem] max-w-sm w-full text-center">
                        <KeySquare size={48} className="text-blue-500 mx-auto" />
                        <h2 className="text-xl font-black text-white mt-4 italic uppercase">Acceso</h2>
                        <input type="password" value={pinIngresado} onChange={(e) => setPinIngresado(e.target.value)} className="bg-slate-900 border border-slate-800 text-white text-3xl text-center w-full py-5 rounded-2xl mt-6 outline-none" placeholder="****" autoFocus />
                        <button onClick={verificarPin} className="w-full py-4 bg-white text-black rounded-xl font-black text-[10px] uppercase mt-4 italic">Entrar</button>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                <header className="mb-10 flex items-center justify-between border-b border-slate-800 pb-10">
                    <div className="flex items-center gap-5">
                        <Building2 size={40} className="text-blue-500" />
                        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Radar <span className="text-blue-500">Gestión</span></h1>
                    </div>
                    <select value={userRole} onChange={(e) => {
                        const val = e.target.value;
                        if (val === "asesoria") { setPinObjetivo("ADMIN1"); setAccionPendiente(() => () => { setUserRole("asesoria"); setSeleccionado(null); }); }
                        else { const emp = solicitudes.find(s => s.id === parseInt(val)); setPinObjetivo(emp?.clave || ""); setAccionPendiente(() => () => { setUserRole(val); setSeleccionado(emp); }); }
                        setMostrarPin(true);
                    }} className="bg-slate-900 text-white text-[10px] font-black p-3 rounded-xl border border-slate-800 uppercase cursor-pointer">
                        <option value="asesoria">ADMINISTRADOR</option>
                        {solicitudes.map(s => <option key={s.id} value={s.id}>{s.empresa}</option>)}
                    </select>
                </header>

                {userRole === "asesoria" && !seleccionado && (
                    <div className="bg-[#0f172a] rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
                        <table className="w-full text-left text-[11px] font-black uppercase">
                            <tbody className="divide-y divide-slate-800/50">
                                {solicitudes.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-800/20">
                                        <td className="px-8 py-6">
                                            <p className="text-white text-sm">{item.empresa}</p>
                                            <p className="text-slate-500">{item.sector} • {item.empleados || 0} emp.</p>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button onClick={() => { setPinObjetivo(item.clave); setAccionPendiente(() => () => setSeleccionado(item)); setMostrarPin(true); }} className="px-6 py-2 bg-slate-800 text-slate-200 rounded-xl hover:bg-white hover:text-black transition-all italic">Auditar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {current && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                            <div className="flex items-center gap-6">
                                <div>
                                    <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">{current.empresa}</h2>
                                    <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest">{current.sector}</p>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl flex items-center gap-3">
                                    <Users size={16} className="text-blue-500" />
                                    {editandoEmp ? (
                                        <div className="flex gap-2">
                                            <input type="number" value={nuevoNumEmp} onChange={(e) => setNuevoNumEmp(e.target.value)} className="bg-slate-800 text-white w-14 p-1 rounded border border-blue-500" />
                                            <button onClick={() => guardarEmpleados(current.id)} className="bg-emerald-600 p-1 rounded text-white"><Save size={14} /></button>
                                        </div>
                                    ) : (
                                        <button onClick={() => { setNuevoNumEmp(current.empleados || 0); setEditandoEmp(true); }} className="text-white font-bold">{current.empleados || 0} <span className="text-[9px] text-slate-500 ml-2 uppercase underline">Editar</span></button>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => { setSeleccionado(null); setVista('ayudas'); }} className="px-5 py-3 bg-red-500/10 text-red-500 rounded-xl text-[9px] font-black uppercase flex items-center gap-2"><X size={14} /> Salir</button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="space-y-4">
                                <button onClick={() => setVista('ayudas')} className={`w-full text-left px-8 py-6 rounded-[1.5rem] text-[10px] font-black uppercase border ${vista === 'ayudas' ? 'bg-blue-600 text-white shadow-lg border-blue-400' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>💰 Subvenciones</button>
                                <button onClick={() => setVista('cumplimiento')} className={`w-full text-left px-8 py-6 rounded-[1.5rem] text-[10px] font-black uppercase border ${vista === 'cumplimiento' ? 'bg-emerald-600 text-white shadow-lg border-emerald-400' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>🛡️ Cumplimiento</button>
                            </div>

                            <div className="lg:col-span-2">
                                {vista === 'cumplimiento' ? (
                                    <div className="bg-[#0f172a] p-8 rounded-[2rem] border border-slate-800 shadow-2xl">
                                        <h3 className="text-white font-black uppercase italic mb-6">Auditoría Técnica</h3>
                                        <div className="space-y-4">
                                            {filtrarNormas().map((norm) => (
                                                <div key={norm.id} className="border border-slate-800 rounded-2xl bg-slate-900/50">
                                                    <button onClick={() => setRegAbierta(regAbierta === norm.id ? null : norm.id)} className="w-full px-8 py-6 flex items-center justify-between text-white font-bold uppercase text-xs">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`h-2 w-2 rounded-full bg-${norm.c}-500 shadow-[0_0_8px_white]`}></div>
                                                            {norm.n}
                                                        </div>
                                                        <ChevronDown size={20} className={regAbierta === norm.id ? "rotate-180 transition-transform" : ""} />
                                                    </button>
                                                    {regAbierta === norm.id && (
                                                        <div className="p-8 bg-black/40 border-t border-slate-800 animate-in slide-in-from-top-2">
                                                            <div className="mb-6 space-y-3">
                                                                <p className="text-[10px] font-black text-blue-400 uppercase italic">Hoja de Ruta:</p>
                                                                {norm.pasos.map((p, idx) => (
                                                                    <p key={idx} className="text-slate-300 text-[11px] pl-2 border-l border-slate-700 italic">{p}</p>
                                                                ))}
                                                            </div>
                                                            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                                                                <div>
                                                                    <p className="text-[10px] font-black text-slate-500 uppercase">Sanción</p>
                                                                    <p className={`text-xl font-black text-${norm.c}-500 italic`}>{norm.m}</p>
                                                                </div>
                                                                <button onClick={() => contactar(`Regularizar ${norm.n}`)} className="px-6 py-4 bg-white text-black rounded-xl text-[10px] font-black uppercase italic">Contactar</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-[#0f172a] p-8 rounded-[2rem] border border-slate-800">
                                        <h3 className="text-white font-black uppercase italic mb-6">Ayudas</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl border-l-4 border-l-blue-500">
                                                <h4 className="text-white font-black text-xs mb-4">KIT DIGITAL</h4>
                                                <button onClick={() => contactar("Kit Digital")} className="w-full py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Tramitar</button>
                                            </div>
                                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl border-l-4 border-l-emerald-500">
                                                <h4 className="text-white font-black text-xs mb-4">CONTRATACIÓN</h4>
                                                <button onClick={() => contactar("Ayuda Empleo")} className="w-full py-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase">Consultar</button>
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