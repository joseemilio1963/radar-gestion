import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Building2, KeySquare, ChevronDown, ChevronUp, UserCheck, X, ShieldCheck, SendHorizontal, AlertTriangle, CheckCircle2, Info, ListChecks } from 'lucide-react';

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

    // BASE DE DATOS CON JUSTIFICACIÓN Y GUÍA DE ACCIÓN
    const NORMAS_TRANSVERSALES = [
        {
            id: 't1',
            nombre: "LOPD / RGPD",
            resumen: "Protección de datos y videovigilancia.",
            justificacion: "Obligatoria para garantizar la privacidad de personas físicas y evitar el uso indebido de información sensible que expone a la empresa a reclamaciones.",
            pasos: [
                "Configurar claves de acceso individuales y seguras en todos los equipos.",
                "Instalar un destructor de papel certificado para documentos físicos.",
                "Incluir cláusulas legales obligatorias en firmas de email y facturación.",
                "Firmar contratos de confidencialidad con gestores y terceros externos."
            ],
            sancion: "Hasta 20M€.",
            estado: "peligro",
            color: "text-red-500",
            bg: "bg-red-500/10"
        },
        {
            id: 't5',
            nombre: "Ley 7/2022 de Residuos",
            resumen: "Separación en origen y registro de huella.",
            justificacion: "Exigible para asegurar la trazabilidad de desechos. La responsabilidad legal recae en la empresa desde la generación hasta el tratamiento final.",
            pasos: [
                "Habilitar contenedores específicos rotulados por tipo de residuo.",
                "Contratar un gestor autorizado para la recogida de residuos peligrosos.",
                "Llevar un registro cronológico de entradas y salidas de desechos.",
                "Presentar la declaración responsable anual ante la administración."
            ],
            sancion: "Hasta 3.5M€.",
            estado: "aviso",
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        },
        {
            id: 't3',
            nombre: "Prevención de Riesgos",
            resumen: "Plan de prevención y salud laboral.",
            justificacion: "Imperativo legal para minimizar accidentes. Evita recargos en prestaciones de la Seguridad Social y responsabilidades penales al administrador.",
            pasos: [
                "Realizar una evaluación inicial de riesgos de cada puesto de trabajo.",
                "Impartir formación obligatoria en seguridad a toda la plantilla.",
                "Entregar y registrar la recepción de Equipos de Protección (EPIs).",
                "Garantizar la vigilancia periódica de la salud (reconocimientos médicos)."
            ],
            sancion: "Hasta 800k€.",
            estado: "ok",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
        }
    ];

    useEffect(() => {
        async function fetchClientes() {
            try {
                const { data, error } = await supabase.from('solicitudes').select('*');
                if (error) throw error;
                setSolicitudes(data || []);
            } catch (err) {
                console.error("Error:", err.message);
            } finally {
                setLoading(false);
            }
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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans">

            {mostrarPin && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0f172a] border border-slate-800 p-10 rounded-[2.5rem] max-w-sm w-full text-center shadow-2xl">
                        <KeySquare size={48} className="text-blue-500 mx-auto" />
                        <h2 className="text-xl font-black text-white uppercase mt-4 italic">Validar Acceso</h2>
                        <input
                            type="password"
                            maxLength={6}
                            value={pinIngresado}
                            onChange={(e) => setPinIngresado(e.target.value)}
                            className={`bg-slate-900 border ${errorPin ? 'border-red-500' : 'border-slate-800'} text-white text-3xl text-center w-full py-5 rounded-2xl outline-none my-6 font-mono`}
                            placeholder="****"
                            autoFocus
                        />
                        <div className="flex gap-4">
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
                            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                                Radar <span className="text-blue-500">Gestión</span>
                            </h1>
                            <p className="text-slate-500 text-[10px] font-black tracking-[0.4em] uppercase mb-4">ASESORÍA VALENCIA</p>

                            {/* BOTÓN SOLICITAR PRESUPUESTO INSERTADO AQUÍ */}
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2">
                                <SendHorizontal size={14} /> Solicitar presupuesto
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-800 flex items-center gap-4">
                        <UserCheck size={16} className="text-slate-600" />
                        <select
                            value={userRole}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === "asesoria") {
                                    setPinObjetivo("ADMIN1");
                                    setAccionPendiente(() => () => { setUserRole("asesoria"); setSeleccionado(null); });
                                } else {
                                    const emp = solicitudes.find(s => s.id === parseInt(val));
                                    setPinObjetivo(emp?.clave || "");
                                    setAccionPendiente(() => () => { setUserRole(val); setSeleccionado(emp); });
                                }
                                setMostrarPin(true);
                            }}
                            className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer uppercase tracking-widest"
                        >
                            <option value="asesoria" className="bg-[#0f172a]">ADMINISTRADOR</option>
                            {solicitudes.map(s => <option key={s.id} value={s.id} className="bg-[#0f172a]">{s.empresa}</option>)}
                        </select>
                    </div>
                </header>

                {userRole === "asesoria" && !seleccionado && (
                    <div className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                            <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Base de Datos: Conectada</p>
                            <p className="text-slate-500 text-[10px] font-black uppercase">{solicitudes.length} Clientes totales</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-900/80 text-slate-500 text-[10px] font-black uppercase tracking-widest italic border-b border-slate-800">
                                        <th className="px-8 py-6">Empresa / Sector</th>
                                        <th className="px-8 py-6 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {solicitudes.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-800/20 transition-all group">
                                            <td className="px-8 py-6">
                                                <p className="font-bold text-white uppercase text-sm group-hover:text-blue-400 transition-colors">{item.empresa}</p>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.sector}</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button
                                                    onClick={() => {
                                                        setPinObjetivo(item.clave);
                                                        setAccionPendiente(() => () => setSeleccionado(item));
                                                        setMostrarPin(true);
                                                    }}
                                                    className="px-6 py-2 bg-slate-800 text-slate-200 rounded-xl text-[9px] font-black uppercase hover:bg-white hover:text-black transition-all"
                                                >
                                                    Auditar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {current && (
                    <div className="animate-in slide-in-from-bottom-6 duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">{current.empresa}</h2>
                                <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest">Auditoría Técnica</p>
                            </div>
                            <button onClick={() => setSeleccionado(null)} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all">
                                <X size={14} /> Salir
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="space-y-3">
                                <button onClick={() => setModoVista('ayudas')} className={`w-full text-left px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${modoVista === 'ayudas' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-900 text-slate-500'}`}>Subvenciones</button>
                                <button onClick={() => setModoVista('normativas')} className={`w-full text-left px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${modoVista === 'normativas' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-slate-900 text-slate-500'}`}>Cumplimiento</button>
                            </div>

                            <div className="lg:col-span-2">
                                {modoVista === 'normativas' && (
                                    <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-slate-800">
                                        <h3 className="text-white font-black uppercase italic mb-6">Informe de Situación</h3>
                                        <div className="space-y-4">
                                            {NORMAS_TRANSVERSALES.map((norm) => (
                                                <div key={norm.id} className={`border border-slate-800 rounded-2xl ${norm.bg} overflow-hidden`}>
                                                    <button onClick={() => setRegAbierta(regAbierta === norm.id ? null : norm.id)} className="w-full px-8 py-6 flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`h-3 w-3 rounded-full animate-pulse ${norm.estado === 'peligro' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]' : norm.estado === 'aviso' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                                            <span className="font-bold text-white uppercase text-sm">{norm.nombre}</span>
                                                        </div>
                                                        {regAbierta === norm.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                    </button>
                                                    {regAbierta === norm.id && (
                                                        <div className="p-8 bg-black/20 border-t border-slate-800 animate-in fade-in duration-300">
                                                            <div className="flex gap-4 mb-6">
                                                                <Info size={18} className="text-blue-400 shrink-0 mt-1" />
                                                                <p className="text-slate-300 text-xs leading-relaxed italic">{norm.justificacion}</p>
                                                            </div>

                                                            <div className="bg-slate-900/60 p-6 rounded-2xl mb-8 border border-white/5">
                                                                <div className="flex items-center gap-2 mb-4">
                                                                    <ListChecks size={16} className="text-emerald-500" />
                                                                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Protocolo de Implantación</p>
                                                                </div>
                                                                <ul className="space-y-3">
                                                                    {norm.pasos.map((paso, idx) => (
                                                                        <li key={idx} className="flex gap-3 text-xs text-slate-400">
                                                                            <span className="text-emerald-500 font-bold">•</span>
                                                                            {paso}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>

                                                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                                                <div>
                                                                    <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Multa Máxima</p>
                                                                    <p className={`text-xl font-black italic ${norm.color}`}>{norm.sancion}</p>
                                                                </div>
                                                                <button className={`px-8 font-black uppercase text-[10px] py-4 rounded-xl flex items-center justify-center gap-3 transition-all ${norm.estado === 'peligro' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-slate-800 text-white'}`}>
                                                                    <SendHorizontal size={14} /> {norm.estado === 'peligro' ? 'Regularizar con Asesoría' : 'Solicitar Auditoría'}
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
                                    <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-slate-800 flex flex-col items-center justify-center text-center min-h-[300px]">
                                        <SendHorizontal className="text-blue-500 mb-4" size={32} />
                                        <h3 className="text-white font-black uppercase italic mb-2">Buscando Beneficios</h3>
                                        <p className="text-slate-500 text-sm italic">Analizando compatibilidad para {current.empresa}...</p>
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