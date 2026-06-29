import { BRAND_CONFIG, formatConfiguredClientName } from './brandConfig';
import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle2, Download, FileText, Plus, RefreshCw, Save, Trash2, Upload } from 'lucide-react';

function RadarPanel() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [detailItem, setDetailItem] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        fetch('/api/radar/items?status=pending_review&limit=50')
            .then(res => {
                if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data.status === 'ok') {
                    setItems(data.items || []);
                } else {
                    setError('Error de la API: ' + (data.error_code || 'Desconocido'));
                }
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    const loadDetail = (id) => {
        setDetailLoading(true);
        setDetailItem(null);
        fetch(`/api/radar/items/${id}`)
            .then(res => {
                if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data.status === 'ok') {
                    setDetailItem(data);
                }
                setDetailLoading(false);
            })
            .catch(err => {
                console.error(err);
                setDetailLoading(false);
            });
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24 text-slate-400">
            <div className="animate-pulse flex flex-col items-center gap-6">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-semibold tracking-wide text-lg">Cargando hallazgos...</p>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="bg-red-950/40 text-red-400 p-6 rounded-2xl border border-red-500/20 flex items-start gap-4 shadow-sm">
            <svg className="w-7 h-7 shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
                <h3 className="font-bold text-lg mb-1 text-red-300">Error al cargar hallazgos</h3>
                <p className="text-sm opacity-90">{error}</p>
            </div>
        </div>
    );

    const metrics = {
        pending: items.length,
        normativas: items.filter(i => i.category && i.category.includes('Normativa')).length,
        exports: items.filter(i => i.exports && i.exports.mrk_url).length,
        notPublished: items.filter(i => i.publish_to_client === 0).length,
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Bloque de métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* RADAR_TOP_CARD_PENDING_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('radar-lista-hallazgos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver lista de hallazgos"
                >
                    <MetricCard title="Hallazgos pendientes" value={metrics.pending} color="text-white" border="border-slate-700/60" bg="bg-slate-800/80" />
                </button>
                {/* RADAR_TOP_CARD_NORMATIVAS_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('radar-lista-hallazgos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver normativas detectadas"
                >
                    <MetricCard title="Normativas detectadas" value={metrics.normativas} color="text-indigo-400" border="border-indigo-500/20" bg="bg-indigo-950/20" />
                </button>
                {/* RADAR_TOP_CARD_EXPORTS_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('radar-lista-hallazgos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver resultados preparados"
                >
                    <MetricCard
                        title="Resultados preparados"
                        value={metrics.exports}
                        description="Resultados detectados por Radar y preparados para su revisión antes de actuar o publicar al cliente."
                        color="text-emerald-400"
                        border="border-emerald-500/20"
                        bg="bg-emerald-950/20"
                    />
                </button>
                {/* RADAR_TOP_CARD_UNPUBLISHED_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('radar-lista-hallazgos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver no publicados al cliente"
                >
                    <MetricCard title="No publicados al cliente" value={metrics.notPublished} color="text-amber-400" border="border-amber-500/20" bg="bg-amber-950/20" />
                </button>
            </div>

            {/* Layout principal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Columna izquierda: Lista */}
                <div className="lg:col-span-7 xl:col-span-7 space-y-5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        {/* RADAR_TOP_METRIC_TARGET_LIST_V1 */}
                    <div id="radar-lista-hallazgos" className="scroll-mt-28" />
                    <h2 className="text-lg font-bold text-slate-200">Lista de Hallazgos</h2>
                        <span className="text-sm text-slate-500 font-medium">{items.length} resultados</span>
                    </div>

                    {items.length === 0 ? (
                        <div className="text-slate-400 text-center py-24 bg-slate-800/30 rounded-2xl border border-slate-700/50 border-dashed">
                            <svg className="w-12 h-12 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            <p className="text-lg font-medium text-slate-300">No hay hallazgos pendientes</p>
                            <p className="text-sm mt-1 opacity-70">Todos los documentos han sido revisados o publicados.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map(item => (
                                <div key={item.id} className={`group relative bg-slate-800/60 backdrop-blur-sm p-6 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md ${detailItem?.item?.id === item.id ? 'border-indigo-500/50 bg-slate-800/90 ring-1 ring-indigo-500/20 translate-x-1' : 'border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/80'}`}>
                                    
                                    {detailItem?.item?.id === item.id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-2xl"></div>
                                    )}

                                    <div className="flex justify-between items-start mb-3 gap-4">
                                        <h3 className="text-base font-bold leading-snug text-slate-100 group-hover:text-indigo-300 transition-colors">{textFromValue(item.title, 'Sin título')}</h3>
                                        <span className="shrink-0 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest shadow-sm">
                                            {item.review_status || 'pending_review'}
                                        </span>
                                    </div>
                                    
                                    <div className="text-slate-400 text-sm mb-5 flex items-center gap-2.5 font-medium">
                                        <span className="p-1.5 bg-slate-700/50 rounded-md text-slate-300">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
                                        </span>
                                        {item.source_name}
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-3 text-xs mb-5 bg-slate-900/40 p-4 rounded-xl border border-slate-700/30">
                                        <div>
                                            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-1">Categoría</span>
                                            <span className="text-slate-200 font-medium">{item.category}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-1">Territorio</span> 
                                            <span className="text-slate-200 font-medium">{item.territory}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-1">Publicación</span>
                                            <span className="text-slate-200 font-medium">{item.published_at || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2.5 mb-6">
                                        {item.needs_human_review === 1 && (
                                            <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider shadow-sm">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> Revisión humana
                                            </span>
                                        )}
                                        {item.publish_to_client === 0 && (
                                            <span className="bg-slate-700/50 text-slate-300 border border-slate-600/50 px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider shadow-sm">
                                                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                                                No publicado
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-700/50">
                                        <button 
                                            onClick={() => loadDetail(item.id)} 
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/40 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        >
                                            Ver detalle
                                        </button>
                                        
                                        <div className="flex items-center gap-2.5 ml-auto">
                                            {item.exports?.mrk_url && (
                                                <a href={item.exports.mrk_url} className="text-slate-300 hover:text-white hover:bg-slate-700 transition-colors text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-600/60 bg-slate-800/80 shadow-sm" download>
                                                    <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                                    Descargar .mrk
                                                </a>
                                            )}
                                            {item.exports?.txt_url && (
                                                <a href={item.exports.txt_url} className="text-slate-300 hover:text-white hover:bg-slate-700 transition-colors text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-600/60 bg-slate-800/80 shadow-sm" download>
                                                    <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                                    Descargar .txt
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Columna derecha: Panel de detalle */}
                <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-8">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-5">
                        <h2 className="text-lg font-bold text-slate-200">Panel de Inspección</h2>
                    </div>

                    {detailLoading && !detailItem ? (
                        <div className="bg-slate-800/80 p-8 rounded-2xl border border-slate-700/60 shadow-xl flex items-center justify-center min-h-[500px] backdrop-blur-sm">
                            <div className="animate-pulse flex flex-col items-center gap-4 text-slate-400">
                                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="font-semibold tracking-wide">Cargando datos del hallazgo...</span>
                            </div>
                        </div>
                    ) : detailItem ? (
                        <div className="bg-slate-800/80 backdrop-blur-sm p-7 rounded-2xl border border-slate-700/60 shadow-xl shadow-black/20 relative overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
                            
                            <h2 className="text-xl font-bold mb-4 text-white leading-snug">{detailItem.item.title}</h2>
                            
                            {detailItem.item.source_url && (
                                <a href={detailItem.item.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors text-sm mb-6 font-semibold bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                                    Ver documento oficial en origen 
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                </a>
                            )}

                            <div className="bg-indigo-950/30 p-4 rounded-xl mb-6 border border-indigo-500/20 flex items-start gap-3.5 shadow-inner">
                                <span className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                                </span>
                                <div>
                                    <h4 className="text-indigo-300 text-sm font-bold mb-1">No visible para el cliente final</h4>
                                    <p className="text-indigo-200/70 text-xs leading-relaxed font-medium">Este hallazgo requiere revisión humana y validación explícita antes de ser publicado en el portal de la entidad.</p>
                                </div>
                            </div>

                            <div className="space-y-4 text-sm mb-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailField label="Tipo Documento" value={detailItem.item.document_type} />
                                    <DetailField label="Categoría" value={detailItem.item.category} />
                                    <DetailField label="Territorio" value={detailItem.item.territory} />
                                    <DetailField label="Publicación" value={detailItem.item.published_at} />
                                </div>

                                {detailItem.marc_record?.record_id && (
                                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 shadow-inner">
                                        <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1.5">MARC Record ID</div>
                                        <div className="font-mono text-indigo-300 text-xs font-bold tracking-wide">
                                            {detailItem.marc_record.record_id}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {detailItem.review_logs && detailItem.review_logs.length > 0 && (
                                <div className="pt-6 border-t border-slate-700/60">
                                    <div className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        Historial de Revisión
                                    </div>
                                    <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                                        {detailItem.review_logs.map((log, i) => (
                                            <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-slate-800 bg-slate-500 group-[.is-active]:bg-indigo-500 text-slate-500 group-[.is-active]:text-indigo-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-4 md:left-1/2 -translate-x-1/2 z-10"></div>
                                                <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-slate-800/80 p-3 rounded-lg border border-slate-700/60 text-xs shadow-sm ml-10 md:ml-0">
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <span className="text-indigo-400 font-bold">{log.actor}</span>
                                                        <span className="text-slate-500 font-medium text-[10px]">{new Date(log.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="text-slate-300 leading-relaxed"><span className="font-semibold text-slate-100">{log.action}</span>: {log.notes}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-slate-800/40 p-8 rounded-2xl border border-slate-700/50 border-dashed text-center flex flex-col items-center justify-center min-h-[500px] text-slate-500 backdrop-blur-sm">
                            <div className="bg-slate-800 p-4 rounded-full mb-5 shadow-inner border border-slate-700/50">
                                <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
                            </div>
                            <p className="font-bold text-slate-300 text-lg mb-1">Selecciona un hallazgo</p>
                            <p className="text-sm font-medium">para revisar los datos en detalle.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function CompliancePanel() {
    const [sectors, setSectors] = useState([]);
    const [loadingSectors, setLoadingSectors] = useState(true);
    
    const [selectedSector, setSelectedSector] = useState(null);
    const [obligations, setObligations] = useState([]);
    const [loadingObligations, setLoadingObligations] = useState(false);

    useEffect(() => {
        fetch('/api/compliance/sectors')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'ok') {
                    setSectors(data.sectors || []);
                }
                setLoadingSectors(false);
            })
            .catch(err => {
                console.error(err);
                setLoadingSectors(false);
            });
    }, []);

    const handleSelectSector = (sector) => {
        setSelectedSector(sector);
        setLoadingObligations(true);
        fetch(`/api/compliance/obligations?sector=${sector.sector_key}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'ok') {
                    setObligations(data.obligations || []);
                }
                setLoadingObligations(false);
            })
            .catch(err => {
                console.error(err);
                setLoadingObligations(false);
            });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* COMMERCIAL_TOP_METRIC_TARGET_FILTERS_V1 */}
                    <div id="comercial-filtros" className="scroll-mt-28" />
                    <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm">
                <h2 className="text-xl font-bold text-white mb-2">Normativas base de obligado cumplimiento</h2>
                <div className="flex items-center gap-2.5 text-amber-400 bg-amber-950/30 p-3 rounded-xl border border-amber-500/20">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <p className="text-sm font-medium">Catálogo sectorial en preparación. Las obligaciones se mostrarán tras revisión humana y verificación de fuente oficial.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Sectores</h3>
                        {loadingSectors ? (
                            <div className="animate-pulse flex flex-wrap gap-3">
                                <div className="h-10 w-24 bg-slate-700 rounded-lg"></div>
                                <div className="h-10 w-32 bg-slate-700 rounded-lg"></div>
                                <div className="h-10 w-28 bg-slate-700 rounded-lg"></div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {sectors.map(sector => (
                                    <button 
                                        key={sector.id} 
                                        onClick={() => handleSelectSector(sector)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${selectedSector?.id === sector.id ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600'}`}
                                    >
                                        {sector.sector_name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedSector && (
                        <div className="space-y-4 animate-in fade-in">
                            <h3 className="text-lg font-bold text-slate-200 pl-2">Obligaciones: {selectedSector.sector_name}</h3>
                            {loadingObligations ? (
                                <div className="animate-pulse h-24 bg-slate-800/50 rounded-2xl border border-slate-700/50"></div>
                            ) : obligations.length === 0 ? (
                                <div className="text-slate-400 text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700/50 border-dashed">
                                    <svg className="w-10 h-10 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                                    <p className="text-base font-medium">No hay obligaciones cargadas todavía para este sector.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {obligations.map(ob => (
                                        <div key={ob.id} className="bg-slate-800/80 p-5 rounded-xl border border-slate-700/60">
                                            <h4 className="font-bold text-white">{ob.title}</h4>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-8">
                    {selectedSector ? (
                        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/60 shadow-xl shadow-black/20 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-5">Estado del Sector</h3>
                            
                            <div className="space-y-4">
                                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
                                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest block mb-1">Sector seleccionado</span>
                                    <span className="text-white font-bold text-lg">{selectedSector.sector_name}</span>
                                </div>
                                
                                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
                                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest block mb-2">Estado</span>
                                    <span className="inline-flex bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm">
                                        Pendiente de carga oficial
                                    </span>
                                </div>
                                
                                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 flex flex-col gap-2.5">
                                    <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold select-none cursor-default">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                        Revisión humana requerida
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold select-none cursor-default">
                                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                                        No visible para cliente final
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed pt-1">
                                    Las acciones de aprobación, publicación y comunicación al cliente estarán disponibles cuando existan obligaciones verificadas por fuente oficial.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-800/40 p-8 rounded-2xl border border-slate-700/50 border-dashed text-center flex flex-col items-center justify-center min-h-[300px] text-slate-500 backdrop-blur-sm">
                            <p className="font-bold text-slate-400 mb-1">Selecciona un sector</p>
                            <p className="text-sm">para ver sus obligaciones</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function textFromValue(value, fallback = '') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'object') {
    const resolved = value.label
      ?? value.name
      ?? value.title
      ?? value.value
      ?? value.key
      ?? value.status
      ?? value.request_status
      ?? value.request_type
      ?? value.priority
      ?? value.client_name
      ?? value.client_id
      ?? fallback;

    return String(resolved ?? fallback);
  }

  return String(value);
}

function requestTextFromValue(value, fallback = '') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'object') {
    const resolved = value.label
      ?? value.name
      ?? value.title
      ?? value.value
      ?? value.key
      ?? value.status
      ?? value.request_status
      ?? value.request_type
      ?? value.priority
      ?? value.client_name
      ?? value.client_id
      ?? fallback;

    return String(resolved ?? fallback);
  }

  return String(value);
}

function isTechnicalInternalText(value) {
  const text = requestTextFromValue(value, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!text) return false;

  const technicalPatterns = [
    'validacion automatica',
    'solicitud de prueba',
    'prueba idempotente',
    'idempotente',
    'prod_dual_write_test',
    'cambio a handled',
    'cambio a contacted',
    'cambio a dismissed',
    'cliente marcado como contactado desde vista comercial',
    'solicitud marcada como gestionada desde vista comercial',
    'solicitud descartada desde vista comercial',
    'cliente marcado como contactado desde panel gestor',
    'solicitud marcada como gestionada desde panel gestor'
  ];

  return technicalPatterns.some(pattern => text.includes(pattern));
}

function displayClientVisibleRequestMessage(value) {
  if (!value || isTechnicalInternalText(value)) {
    return 'El cliente solicita que su asesoría revise esta oportunidad.';
  }

  return requestTextFromValue(value, 'El cliente solicita que su asesoría revise esta oportunidad.');
}

function requestDisplayDedupeKey(req) {
  if (!req || typeof req !== 'object') {
    return '';
  }

  return [
    requestTextFromValue(req.client_id, ''),
    requestTextFromValue(req.package_item_id ?? req.source_id ?? req.title, ''),
    requestTextFromValue(req.request_type ?? req.source_type, '')
  ].join('|');
}

function dedupeRequestsForDisplay(requests) {
  if (!Array.isArray(requests)) {
    return [];
  }

  const seen = new Set();
  const result = [];

  for (const req of requests) {
    const key = requestDisplayDedupeKey(req);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(req);
  }

  return result;
}

function labelFromKey(value) {
  if (value === null || value === undefined || value === '') {
    return 'Sin definir';
  }

  const rawValue = String(value);
  const normalizedKey = rawValue
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const labels = {
    BONIFICACION_INCENTIVO_CONTRATACION: 'Bonificación / incentivo de contratación',
    INCENTIVO_FORMACION_CONTRATACION: 'Incentivo para formación y contratación',
    TRAMITACION_AYUDA_SUBVENCION: 'Tramitación de ayuda o subvención',
    COMPLIANCE_OBLIGATION: 'Obligación normativa',
    AID_ITEM: 'Ayuda o subvención',
    PENDING_REVIEW: 'Pendiente de revisión',
    APPROVED: 'Aprobado',
    REJECTED: 'Descartado',
    PUBLISHED: 'Publicado',
    HANDLED: 'Gestionada',
    PENDING_CONTACT: 'Pendiente de contacto',
    CONTACTED: 'Contactada',
    DISMISSED: 'Descartada',
    NORMAL: 'Normal',
    HIGH: 'Alta',
    LOW: 'Baja'
  };

  if (labels[normalizedKey]) {
    return labels[normalizedKey];
  }

  return rawValue
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, char => char.toUpperCase());
}
function AidsPanel() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [detailItem, setDetailItem] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        fetch('/api/aids/items?status=pending_review&limit=50')
            .then(res => {
                if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data.status === 'ok') {
                    setItems(data.items || []);
                } else {
                    setError('Error de la API: ' + (data.error_code || 'Desconocido'));
                }
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    const loadDetail = (id) => {
        setDetailLoading(true);
        setDetailItem(null);
        fetch(`/api/aids/items/${id}`)
            .then(res => {
                if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data.status === 'ok') {
                    setDetailItem(data);
                }
                setDetailLoading(false);
            })
            .catch(err => {
                console.error(err);
                setDetailLoading(false);
            });
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24 text-slate-400">
            <div className="animate-pulse flex flex-col items-center gap-6">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-semibold tracking-wide text-lg">Cargando ayudas...</p>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="bg-red-950/40 text-red-400 p-6 rounded-2xl border border-red-500/20 flex items-start gap-4 shadow-sm">
            <svg className="w-7 h-7 shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
                <h3 className="font-bold text-lg mb-1 text-red-300">Error al cargar ayudas</h3>
                <p className="text-sm opacity-90">{error}</p>
            </div>
        </div>
    );

    const metrics = {
        pending: items.length,
        bonificaciones: items.filter(i => i.aid_type === 'bonificacion').length,
        incentivos: items.filter(i => i.aid_type === 'incentivo').length,
        notPublished: items.filter(i => i.publish_to_client === 0).length,
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm">
                <h2 className="text-xl font-bold text-white mb-2">Ayudas, subvenciones, bonificaciones e incentivos</h2>
                <div className="flex items-center gap-2.5 text-emerald-400 bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/20">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <p className="text-sm font-medium">Módulo preparado para oportunidades económicas detectadas por Lorena. Toda ayuda requiere revisión humana antes de comunicarse al cliente.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* AIDS_TOP_CARD_PENDING_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('ayudas-lista-pendientes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver ayudas pendientes"
                >
                    <MetricCard title="Ayudas pendientes" value={metrics.pending} color="text-emerald-400" border="border-emerald-500/20" bg="bg-emerald-950/20" />
                </button>
                {/* AIDS_TOP_CARD_BONIFICACIONES_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('ayudas-lista-pendientes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver bonificaciones"
                >
                    <MetricCard title="Bonificaciones" value={metrics.bonificaciones} color="text-indigo-400" border="border-indigo-500/20" bg="bg-indigo-950/20" />
                </button>
                {/* AIDS_TOP_CARD_INCENTIVOS_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('ayudas-lista-pendientes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver incentivos"
                >
                    <MetricCard title="Incentivos" value={metrics.incentivos} color="text-amber-400" border="border-amber-500/20" bg="bg-amber-950/20" />
                </button>
                {/* AIDS_TOP_CARD_UNPUBLISHED_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('ayudas-lista-pendientes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver no publicadas al cliente"
                >
                    <MetricCard title="No publicadas al cliente" value={metrics.notPublished} color="text-rose-400" border="border-rose-500/20" bg="bg-rose-950/20" />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 xl:col-span-7 space-y-5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        {/* AIDS_TOP_METRIC_TARGET_LIST_V1 */}
                    <div id="ayudas-lista-pendientes" className="scroll-mt-28" />
                    <h2 className="text-lg font-bold text-slate-200">Lista de Ayudas pendientes</h2>
                        <span className="text-sm text-slate-500 font-medium">{items.length} resultados</span>
                    </div>

                    {items.length === 0 ? (
                        <div className="text-slate-400 text-center py-24 bg-slate-800/30 rounded-2xl border border-slate-700/50 border-dashed">
                            <svg className="w-12 h-12 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <p className="text-lg font-medium text-slate-300">No hay ayudas o subvenciones pendientes de revisión.</p>
                            <p className="text-sm mt-1 opacity-70">Todas las oportunidades han sido procesadas o no hay nuevas.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map(item => (
                                <div key={item.id} className={`group relative min-w-0 overflow-hidden bg-slate-800/60 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md ${detailItem?.item?.id === item.id ? 'border-emerald-500/50 bg-slate-800/90 ring-1 ring-emerald-500/20 translate-x-1' : 'border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/80'}`}>
                                    {detailItem?.item?.id === item.id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-2xl"></div>
                                    )}
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-3 sm:gap-4 min-w-0">
                                        <h3 className="min-w-0 text-base font-bold leading-snug text-slate-100 group-hover:text-emerald-300 transition-colors break-words">{textFromValue(item.title, 'Sin título')}</h3>
                                        <span className="shrink-0 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wide whitespace-normal break-words text-left leading-snug shadow-sm">
                                            {labelFromKey(item.aid_type || 'AYUDA')}
                                        </span>
                                    </div>
                                    <div className="text-slate-400 text-sm mb-5 flex items-center gap-2.5 font-medium">
                                        <span className="p-1.5 bg-slate-700/50 rounded-md text-slate-300">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
                                        </span>
                                        {textFromValue(item.source_name, 'Desconocido')}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-xs mb-5 bg-slate-900/40 p-4 rounded-xl border border-slate-700/30">
                                        <div>
                                            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-1">Territorio</span> 
                                            <span className="text-slate-200 font-medium">{item.territory_name || item.territory || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-1">Plazo</span> 
                                            <span className="text-slate-200 font-medium">{item.deadline_label || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2.5 mb-6">
                                        {item.needs_human_review === 1 && (
                                            <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider shadow-sm">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> Revisión humana
                                            </span>
                                        )}
                                        {item.publish_to_client === 0 && (
                                            <span className="bg-slate-700/50 text-slate-300 border border-slate-600/50 px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider shadow-sm">
                                                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                                                No publicado
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center pt-4 border-t border-slate-700/50">
                                        <button 
                                            onClick={() => loadDetail(item.id)} 
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm shadow-emerald-500/20 hover:shadow-emerald-500/40 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                        >
                                            Revisar ayuda
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-8">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-5">
                        <h2 className="text-lg font-bold text-slate-200">Panel de Inspección</h2>
                    </div>

                    {detailLoading && !detailItem ? (
                        <div className="bg-slate-800/80 p-8 rounded-2xl border border-slate-700/60 shadow-xl flex items-center justify-center min-h-[500px] backdrop-blur-sm">
                            <div className="animate-pulse flex flex-col items-center gap-4 text-slate-400">
                                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="font-semibold tracking-wide">Cargando datos...</span>
                            </div>
                        </div>
                    ) : detailItem ? (
                        <div className="bg-slate-800/80 backdrop-blur-sm p-7 rounded-2xl border border-slate-700/60 shadow-xl shadow-black/20 relative overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                            
                            <h2 className="text-xl font-bold mb-4 text-white leading-snug">{detailItem.item.title}</h2>
                            
                            {detailItem.item.source_url && (
                                <a href={detailItem.item.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors text-sm mb-6 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                    Ver convocatoria oficial
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                </a>
                            )}

                            <div className="space-y-4 text-sm mb-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailField label="Tipo de Ayuda" value={detailItem.item.aid_type} />
                                    <DetailField label="Fuente Oficial" value={detailItem.item.source_name} />
                                    <DetailField label="Territorio" value={detailItem.item.territory_name || detailItem.item.territory} />
                                    <DetailField label="Plazo" value={detailItem.item.deadline_label} />
                                    <DetailField label="Cuantía" value={detailItem.item.amount_summary} />
                                    <DetailField label="Acción Recomendada" value={detailItem.item.recommended_action} />
                                </div>
                                
                                {detailItem.item.data_quality_warning === 1 && (
                                    <div className="bg-rose-950/30 p-4 rounded-xl border border-rose-500/20 flex items-start gap-3.5 shadow-inner mt-4">
                                        <span className="p-1.5 bg-rose-500/20 rounded-lg text-rose-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                        </span>
                                        <div>
                                            <h4 className="text-rose-300 text-sm font-bold mb-1">Advertencia de Calidad de Datos</h4>
                                            <p className="text-rose-200/70 text-xs leading-relaxed font-medium">Revisar detalladamente las fechas y montos en la convocatoria original.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 flex flex-col gap-2.5 mb-8">
                                <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wide whitespace-normal break-words text-left leading-snug mb-1.5">Estado Operativo</div>
                                {detailItem.item.needs_human_review === 1 && (
                                    <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold select-none cursor-default">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                        Revisión humana requerida
                                    </div>
                                )}
                                {detailItem.item.publish_to_client === 0 && (
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold select-none cursor-default">
                                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                                        No visible para cliente final
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold select-none cursor-default">
                                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    Estado de revisión: {detailItem.item.review_status || 'N/A'}
                                </div>
                            </div>

                            {detailItem.review_logs && detailItem.review_logs.length > 0 && (
                                <div className="pt-6 border-t border-slate-700/60">
                                    <div className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        Historial de Revisión
                                    </div>
                                    <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                                        {detailItem.review_logs.map((log, i) => (
                                            <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-slate-800 bg-slate-500 group-[.is-active]:bg-emerald-500 text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-4 md:left-1/2 -translate-x-1/2 z-10"></div>
                                                <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-slate-800/80 p-3 rounded-lg border border-slate-700/60 text-xs shadow-sm ml-10 md:ml-0">
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <span className="text-emerald-400 font-bold">{log.actor}</span>
                                                        <span className="text-slate-500 font-medium text-[10px]">{new Date(log.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="text-slate-300 leading-relaxed"><span className="font-semibold text-slate-100">{log.action}</span>: {log.notes}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-slate-800/40 p-8 rounded-2xl border border-slate-700/50 border-dashed text-center flex flex-col items-center justify-center min-h-[500px] text-slate-500 backdrop-blur-sm">
                            <div className="bg-slate-800 p-4 rounded-full mb-5 shadow-inner border border-slate-700/50">
                                <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            </div>
                            <p className="font-bold text-slate-300 text-lg mb-1">Selecciona una ayuda</p>
                            <p className="text-sm font-medium">para revisar sus datos.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}



function RadarLegalNotice({ compact = false }) {
    return (
        <div className={`${compact ? 'mt-4 text-[11px]' : 'mt-5 text-xs'} rounded-xl border border-slate-700/70 bg-slate-950/50 px-4 py-3 text-slate-400 leading-relaxed`}>
            {/* RADAR_VISIBLE_IP_NOTICE_V2 */}
            <span className="font-bold text-slate-300">© Aulagentia / Radar Gestión.</span>
            {' '}Software, diseño funcional, estructura, documentación y contenidos protegidos. Uso autorizado exclusivamente bajo licencia. Prohibida la copia, cesión, sublicencia, reproducción, explotación no autorizada o ingeniería inversa.
        </div>
    );
}

function ClientsPanel() {
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [clientsData, setClientsData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/clients/entities')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'ok') setClientsData(data.clients || []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const metrics = {
        activeClients: clientsData.length,
        redAlerts: clientsData.reduce((acc, client) => acc + (client.globalStatus === 'red' ? 1 : 0), 0),
        unevaluated: clientsData.reduce((acc, client) => acc + (client.globalStatus === 'gray' ? 1 : 0), 0),
        openAids: clientsData.reduce((acc, client) => acc + client.aidsItems.length, 0)
    };

    const selectedClient = clientsData.find(c => c.id === selectedClientId);

    // CLIENTS_ENTITIES_DETAIL_SCROLL_V2
    const scrollToClientsEntitiesDetail = () => {
        window.setTimeout(() => {
            const target = document.getElementById('clients-entities-detail-panel');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 120);
    };

    const scrollToClientsEntitiesSelector = () => {
        window.setTimeout(() => {
            const target = document.getElementById('clients-entities-top-selector');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 80);
    };

    const handleClientsEntitiesSelectClient = (clientId) => {
        const nextClientId = clientId || null;
        setSelectedClientId(nextClientId);

        if (nextClientId) {
            scrollToClientsEntitiesDetail();
        } else {
            scrollToClientsEntitiesSelector();
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24 text-slate-400">
            <div className="animate-pulse flex flex-col items-center gap-6">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-semibold tracking-wide text-lg">Cargando clientes...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm">
                <h2 className="text-xl font-bold text-white mb-2">Clientes y entidades asesoradas</h2>

                {/* CLIENTS_ENTITIES_TOP_SELECTOR_V1 */}
                <div id="clients-entities-top-selector" className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Seleccionar empresa / cliente
                        </label>
                        <select
                            value={selectedClientId || ''}
                            onChange={(event) => handleClientsEntitiesSelectClient(event.target.value)}
                            className="w-full bg-slate-900/70 border border-slate-700 rounded-xl px-3 py-3 text-slate-100 text-sm font-semibold focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Selecciona una empresa</option>
                            {clientsData.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-xs font-semibold text-slate-400 md:text-right">
                        {selectedClient ? 'Ficha activa: ' + selectedClient.name : 'Elige un cliente para ver su ficha'}
                    </div>
                </div>
                <div className="flex items-center gap-2.5 text-blue-400 bg-blue-950/30 p-3 rounded-xl border border-blue-500/20">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <div>
                        <p className="text-sm font-bold">Vista interna de seguimiento normativo, ayudas y estado de cumplimiento por cliente.</p>
                        <p className="text-xs font-medium opacity-80 mt-0.5">La información mostrada es de uso interno de la asesoría y no sustituye la revisión profesional.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* CLIENTS_TOP_CARD_ACTIVE_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('clientes-entidades-directorio')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver directorio de clientes"
                >
                    <MetricCard title="Clientes activos" value={metrics.activeClients} color="text-white" border="border-slate-700/60" bg="bg-slate-800/80" />
                </button>
                {/* CLIENTS_TOP_CARD_RED_ALERTS_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('clientes-entidades-ficha')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver ficha del cliente"
                >
                    <MetricCard title="Alertas rojas" value={metrics.redAlerts} color="text-rose-400" border="border-rose-500/20" bg="bg-rose-950/20" />
                </button>
                {/* CLIENTS_TOP_CARD_UNEVALUATED_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('clientes-entidades-ficha')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver obligaciones en ficha"
                >
                    <MetricCard title="Obligaciones sin evaluar" value={metrics.unevaluated} color="text-slate-400" border="border-slate-500/20" bg="bg-slate-900/40" />
                </button>
                {/* CLIENTS_TOP_CARD_OPEN_AIDS_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('clientes-entidades-ficha')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver ayudas en ficha"
                >
                    <MetricCard title="Ayudas abiertas" value={metrics.openAids} color="text-emerald-400" border="border-emerald-500/20" bg="bg-emerald-950/20" />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        {/* CLIENTS_TOP_METRIC_TARGET_DIRECTORIO_V1 */}
                    <div id="clientes-entidades-directorio" className="scroll-mt-28" />
                    <h2 className="text-lg font-bold text-slate-200">Directorio</h2>
                    </div>

                    <div className="space-y-4">
                        {clientsData.map(client => (
                            <div key={client.id} className={`group relative bg-slate-800/60 backdrop-blur-sm p-5 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer ${selectedClientId === client.id ? 'border-blue-500/50 bg-slate-800/90 ring-1 ring-blue-500/20 translate-x-1' : 'border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/80'}`} onClick={() => handleClientsEntitiesSelectClient(client.id)}>
                                {selectedClientId === client.id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-2xl"></div>
                                )}
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-base font-bold text-slate-100 group-hover:text-blue-300 transition-colors">{client.name}</h3>
                                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${client.globalStatus === 'green' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : client.globalStatus === 'yellow' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : client.globalStatus === 'red' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-slate-500'}`}></div>
                                </div>
                                <div className="text-slate-400 text-xs mb-3 font-medium flex flex-col gap-1">
                                    <span>{client.sector}</span>
                                    <span>{client.employees} empleados</span>
                                </div>
                                <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider">
                                    <span className="bg-slate-900/50 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700">{client.alertsCount} Alertas</span>
                                    <span className="bg-slate-900/50 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700">{client.aidsCount} Ayudas</span>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                                        Ver ficha <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div id="clients-entities-detail-panel" className="lg:col-span-7 xl:col-span-8 lg:sticky lg:top-8 scroll-mt-28">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-5">
                        {/* CLIENTS_TOP_METRIC_TARGET_FICHA_V1 */}
                    <div id="clientes-entidades-ficha" className="scroll-mt-28" />
                    <h2 className="text-lg font-bold text-slate-200">Ficha del Cliente</h2>
                        {selectedClient && (
                            <button
                                type="button"
                                onClick={() => handleClientsEntitiesSelectClient('')}
                                className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-300 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-200"
                            >
                                ? Volver al selector de empresas
                            </button>
                        )}
                    </div>

                    {!selectedClient ? (
                        <div className="bg-slate-800/40 p-8 rounded-2xl border border-slate-700/50 border-dashed text-center flex flex-col items-center justify-center min-h-[500px] text-slate-500 backdrop-blur-sm">
                            <div className="bg-slate-800 p-4 rounded-full mb-5 shadow-inner border border-slate-700/50">
                                <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            </div>
                            <p className="font-bold text-slate-300 text-lg mb-1">Selecciona un cliente</p>
                            <p className="text-sm font-medium">para revisar su estado normativo.</p>
                        </div>
                    ) : (
                        <div className="bg-slate-800/80 backdrop-blur-sm p-7 rounded-2xl border border-slate-700/60 shadow-xl shadow-black/20 relative overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                            
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">{selectedClient.name}</h2>
                                    <p className="text-slate-400 text-sm font-medium">{selectedClient.sector} · {selectedClient.employees} empleados</p>
                                </div>
                                <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-widest shadow-sm flex items-center gap-2 ${selectedClient.globalStatus === 'green' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : selectedClient.globalStatus === 'yellow' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : selectedClient.globalStatus === 'red' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-slate-500/10 text-slate-400 border-slate-500/30'}`}>
                                    <span className={`w-2 h-2 rounded-full ${selectedClient.globalStatus === 'green' ? 'bg-emerald-500' : selectedClient.globalStatus === 'yellow' ? 'bg-amber-500 animate-pulse' : selectedClient.globalStatus === 'red' ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'}`}></span>
                                    Estado Global
                                </div>
                            </div>

                            <div className="bg-indigo-950/20 p-3 rounded-lg border border-indigo-500/20 flex items-center gap-2 text-indigo-300 text-xs font-semibold mb-8">
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                                Información no visible para cliente final salvo publicación expresa.
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        Normativas y Alertas Compliance
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {selectedClient.complianceItems.map(item => (
                                            <div key={item.id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-bold text-slate-200 text-sm">{textFromValue(item.title, 'Sin título')}</span>
                                                    <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${item.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium">{item.date}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        Ayudas y Expedientes Subvencionales
                                    </h3>
                                    <div className="space-y-3">
                                        {selectedClient.aidsItems.map(aid => (
                                            <div key={aid.id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest">{aid.type}</span>
                                                        <span className="font-bold text-slate-200 text-sm">{aid.title}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 font-medium mb-2">{aid.desc}</p>
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Límite: {aid.deadline}</div>
                                                </div>
                                                <div className="shrink-0 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 text-xs font-bold uppercase tracking-widest">
                                                    {aid.status}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-700/30">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Observaciones Internas</h3>
                                    <p className="text-sm text-slate-300 leading-relaxed">{selectedClient.observations}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, description, color, border, bg }) {
    return (
        <div className={`${bg} p-6 rounded-2xl border ${border} shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-1 duration-300`}>
            <div className="text-slate-400 text-[11px] uppercase tracking-widest mb-2 font-bold">{title}</div>
            {/* RESULTADOS_PREPARADOS_DESCRIPTION_RENDER_V1 */}
            {description ? <p className="mb-3 -mt-1 text-xs leading-snug text-slate-400/90 normal-case font-normal tracking-normal">{description}</p> : null}
            <div className={`text-3xl font-extrabold ${color}`}>{value}</div>
        </div>
    );
}

function DetailField({ label, value }) {
    return (
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 shadow-inner">
            <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1.5">{label}</div>
            <div className="text-slate-200 font-semibold">{value || 'N/A'}</div>
        </div>
    );
}

function formatHumanLabel(value) {
    if (!value) return 'Sin dato';

    const map = {
        clinicas_privadas: 'Clínicas privadas',
        peluqueria_estetica: 'Peluquería y estética',
        alimentacion: 'Alimentación',
        construccion: 'Construcción',
        hosteleria: 'Hostelería',
        comercio: 'Comercio',
        metal: 'Metal',
        oficinas: 'Oficinas',
        talleres: 'Talleres',
        transporte: 'Transporte',
        pending_review: 'Pendiente de revisión',
        approved: 'Aprobado',
        published: 'Publicado',
        aid_item: 'Ayuda / oportunidad',
        compliance_obligation: 'Normativa',
        BONIFICACION_INCENTIVO_CONTRATACION: 'Bonificación / incentivo de contratación',
        INCENTIVO_FORMACION_CONTRATACION: 'Incentivo para formación y contratación',
        TRAMITACION_AYUDA_SUBVENCION: 'Tramitación de ayuda o subvención'
    };

    const key = String(value);
    if (map[key]) return map[key];

    return key
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function OfficialReferenceBlock({ item, compact = false }) {
    const legalReference = item?.legal_reference || item?.official_reference || '';
    const sourceName = item?.source_name || '';
    const sourceUrl = item?.source_url || '';
    const hasLegal = Boolean(String(legalReference || '').trim());
    const hasSource = Boolean(String(sourceName || '').trim());
    const hasUrl = Boolean(String(sourceUrl || '').trim());

    return (
        <div className={`${compact ? 'mt-3' : 'mt-4'} rounded-xl border border-slate-700/60 bg-slate-950/30 p-3 text-xs space-y-2`}>
            {hasLegal && (
                <div className="text-slate-300">
                    <span className="font-bold text-slate-400">Referencia legal: </span>
                    <span>{legalReference}</span>
                </div>
            )}

            {hasSource && (
                <div className="text-slate-300">
                    <span className="font-bold text-slate-400">Fuente: </span>
                    <span>{sourceName}</span>
                </div>
            )}

            {hasUrl && (
                <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-indigo-300 hover:bg-indigo-500/20"
                >
                    Ver fuente oficial
                </a>
            )}

            {!hasLegal && !hasUrl && (
                <div className="font-semibold text-amber-300">
                    Referencia oficial pendiente de revisión
                </div>
            )}
        </div>
    );
}

const CLIENT_PROCEDURE_TYPES = [
    { value: 'alta_empleado', label: 'Alta de empleado' },
    { value: 'baja_empleado', label: 'Baja de empleado' },
    { value: 'baja_medica_it', label: 'Baja médica / IT' },
    { value: 'contrato_laboral', label: 'Contrato laboral' },
    { value: 'nomina', label: 'Nómina' },
    { value: 'finiquito', label: 'Finiquito' },
    { value: 'trimestre_fiscal', label: 'Trimestre fiscal' },
    { value: 'declaracion_renta', label: 'Declaración de la renta' },
    { value: 'impuesto_sociedades', label: 'Impuesto sobre Sociedades' },
    { value: 'censal_actividad', label: 'Censal / actividad' },
    { value: 'inspeccion_requerimiento', label: 'Inspección/requerimiento oficial' },
    { value: 'documentacion_general_empresa', label: 'Documentación general de empresa' },
    { value: 'tickets_gastos', label: 'Tickets / gastos' },
    { value: 'otro_tramite', label: 'Otro trámite' }
];

const CLIENT_PORTAL_PROCEDURE_START_OPTIONS = [
    { value: 'alta_empleado', label: 'Voy a contratar a un nuevo empleado' },
    { value: 'tickets_gastos', label: 'Tengo tickets/gastos para entregar' },
    { value: 'baja_medica_it', label: 'Tengo una baja médica' },
    { value: 'trimestre_fiscal', label: 'Tengo que preparar el trimestre fiscal' },
    { value: 'censal_actividad', label: 'Tengo una modificación censal' },
    { value: 'inspeccion_requerimiento', label: 'Tengo una inspección o requerimiento oficial' },
    { value: 'declaracion_renta', label: 'Necesito preparar documentación para renta' },
    { value: 'impuesto_sociedades', label: 'Necesito preparar documentación para sociedades' }
];
const CLIENT_PROCEDURE_ENTITY_TYPES = [
    { value: 'autonomo_persona_fisica', label: 'Autónomo / persona física' },
    { value: 'sl', label: 'SL' },
    { value: 'sa', label: 'SA' },
    { value: 'comunidad_bienes', label: 'Comunidad de bienes' },
    { value: 'asociacion_entidad_sin_animo_lucro', label: 'Asociación / entidad sin ánimo de lucro' },
    { value: 'otro_tipo_entidad', label: 'Otro tipo de entidad' }
];

const CLIENT_PROCEDURE_DOCUMENT_SUGGESTIONS = {
    alta_empleado: ['DNI/NIE', 'Número Seguridad Social', 'Datos bancarios', 'Categoría profesional', 'Fecha de alta', 'Tipo de contrato/jornada'],
    baja_empleado: ['Datos del empleado', 'Fecha de baja', 'Motivo de baja', 'Documentación asociada'],
    baja_medica_it: ['Parte de baja', 'Parte de confirmación si procede', 'Parte de alta si procede'],
    contrato_laboral: ['Datos empleado', 'Categoría profesional', 'Jornada', 'Fecha inicio', 'Condiciones principales'],
    nomina: ['Periodo', 'Variables/incidencias', 'Ausencias', 'Complementos si procede'],
    finiquito: ['Fecha de baja', 'Vacaciones pendientes', 'Pagas pendientes', 'Conceptos a liquidar'],
    trimestre_fiscal: ['Facturas emitidas', 'Facturas recibidas', 'Tickets y gastos', 'Extractos bancarios', 'Nóminas y seguros sociales si procede', 'Alquileres con retención si procede', 'Retenciones profesionales si procede', 'Operaciones intracomunitarias si procede', 'Otros justificantes del trimestre'],
    declaracion_renta: ['Datos fiscales AEAT', 'Certificados de retenciones', 'Rendimientos del trabajo', 'Rendimientos bancarios', 'Alquileres si procede', 'Hipoteca vivienda habitual si procede', 'Donativos si procede', 'Gastos deducibles de actividad si procede', 'Ganancias o pérdidas patrimoniales si procede', 'Deducciones autonómicas si procede'],
    impuesto_sociedades: ['Balance de sumas y saldos', 'Cuenta de pérdidas y ganancias', 'Libro mayor', 'Amortizaciones', 'Préstamos y leasing si procede', 'Retenciones y pagos a cuenta si procede', 'Pagos fraccionados si procede', 'Documentación de cierre'],
    censal_actividad: ['DNI/NIE o CIF', 'Escritura de constitución si procede', 'Modelo censal o datos de alta/modificación', 'Epígrafe IAE', 'Domicilio fiscal', 'Domicilio de actividad si procede', 'Representante legal si procede', 'Actividad económica', 'Fecha de inicio/modificación/baja', 'Obligaciones fiscales previstas', 'Cuenta bancaria si procede'],
    inspeccion_requerimiento: [
        'Notificación o requerimiento recibido',
        'Documentación solicitada por la administración',
        { label: 'Número de expediente o referencia si existe', required: false },
        { label: 'Fecha límite de respuesta si aparece', required: false },
        { label: 'Comunicaciones, alegaciones o escritos previos si procede', required: false },
        { label: 'Identificación del organismo actuante si procede', required: false }
    ],
    documentacion_general_empresa: ['CIF/NIF', 'Escrituras', 'Poderes o representación', 'Certificado digital', 'Contratos principales', 'Alquiler del local', 'Licencias o permisos', 'Seguros', 'Documentación bancaria', 'Documentación de proveedores relevantes'],
    tickets_gastos: ['Ticket o factura', 'Fecha', 'Importe', 'Concepto', 'Forma de pago', 'Justificante bancario si procede', 'Categoría de gasto'],
    otro_tramite: ['Documentación asociada']
};

const CLIENT_LABOR_PROCEDURE_TYPES = new Set([
    'alta_empleado',
    'baja_empleado',
    'baja_medica_it',
    'contrato_laboral',
    'nomina',
    'finiquito'
]);

function isClientLaborProcedureType(value) {
    return CLIENT_LABOR_PROCEDURE_TYPES.has(value);
}

const CLIENT_QUARTER_OPTIONS = [
    { value: 'q1', label: '1er trimestre' },
    { value: 'q2', label: '2º trimestre' },
    { value: 'q3', label: '3er trimestre' },
    { value: 'q4', label: '4º trimestre' }
];

const CLIENT_RENTA_TYPE_OPTIONS = [
    { value: 'persona_fisica', label: 'Persona física' },
    { value: 'autonomo_actividad', label: 'Autónomo con actividad' },
    { value: 'renta_alquileres', label: 'Renta con alquileres' },
    { value: 'ganancias_patrimoniales', label: 'Renta con ganancias patrimoniales' },
    { value: 'otro_caso', label: 'Otro caso' }
];

const CLIENT_SOCIETIES_CLOSING_OPTIONS = [
    { value: 'cierre_anual', label: 'Cierre anual' },
    { value: 'pago_fraccionado', label: 'Pago fraccionado' },
    { value: 'documentacion_complementaria', label: 'Documentación complementaria' }
];

const CLIENT_CENSAL_ACTION_OPTIONS = [
    { value: 'alta', label: 'Alta' },
    { value: 'modificacion', label: 'Modificación' },
    { value: 'baja', label: 'Baja' }
];

const CLIENT_TICKETS_PERIOD_OPTIONS = [
    { value: 'mes', label: 'Mes' },
    { value: 'trimestre', label: 'Trimestre' },
    { value: 'anio', label: 'Año' },
    { value: 'otro_periodo', label: 'Otro periodo' }
];

const CLIENT_INSPECTION_AUTHORITY_OPTIONS = [
    { value: 'hacienda', label: 'Inspección/requerimiento de Hacienda' },
    { value: 'trabajo', label: 'Inspección/requerimiento de Trabajo' },
    { value: 'sanidad', label: 'Inspección/requerimiento de Sanidad' },
    { value: 'conselleria', label: 'Inspección/requerimiento de Conselleria / Generalitat' },
    { value: 'ayuntamiento', label: 'Inspección/requerimiento del Ayuntamiento' },
    { value: 'policia', label: 'Inspección/requerimiento policial' },
    { value: 'otro_organismo', label: 'Requerimiento de otro organismo' }
];

function getClientProcedureOptionLabel(options, value) {
    return options.find(option => option.value === value)?.label || value || '';
}

function getClientProcedureStructuredDetails(procedure) {
    const details = [];

    if (procedure.procedure_type === 'trimestre_fiscal') {
        if (procedure.period_value) details.push({ label: 'Periodo', value: getClientProcedureOptionLabel(CLIENT_QUARTER_OPTIONS, procedure.period_value) });
        if (procedure.fiscal_year) details.push({ label: 'Ejercicio', value: procedure.fiscal_year });
    }

    if (procedure.procedure_type === 'declaracion_renta') {
        if (procedure.fiscal_year) details.push({ label: 'Ejercicio fiscal', value: procedure.fiscal_year });
        if (procedure.procedure_subtype) details.push({ label: 'Tipo de renta', value: getClientProcedureOptionLabel(CLIENT_RENTA_TYPE_OPTIONS, procedure.procedure_subtype) });
    }

    if (procedure.procedure_type === 'impuesto_sociedades') {
        if (procedure.fiscal_year) details.push({ label: 'Ejercicio fiscal', value: procedure.fiscal_year });
        if (procedure.procedure_subtype) details.push({ label: 'Tipo de cierre', value: getClientProcedureOptionLabel(CLIENT_SOCIETIES_CLOSING_OPTIONS, procedure.procedure_subtype) });
    }

    if (procedure.procedure_type === 'censal_actividad') {
        if (procedure.procedure_subtype) details.push({ label: 'Actuación censal', value: getClientProcedureOptionLabel(CLIENT_CENSAL_ACTION_OPTIONS, procedure.procedure_subtype) });
        if (procedure.period_value) details.push({ label: 'Fecha de efecto', value: procedure.period_value });
    }

    if (procedure.procedure_type === 'tickets_gastos') {
        if (procedure.period_type) {
            const periodLabel = getClientProcedureOptionLabel(CLIENT_TICKETS_PERIOD_OPTIONS, procedure.period_type);
            details.push({ label: 'Periodo', value: procedure.period_value ? `${periodLabel}: ${procedure.period_value}` : periodLabel });
        }
    }

    if (procedure.procedure_type === 'inspeccion_requerimiento') {
        if (procedure.procedure_subtype) details.push({ label: 'Organismo', value: getClientProcedureOptionLabel(CLIENT_INSPECTION_AUTHORITY_OPTIONS, procedure.procedure_subtype) });
        if (procedure.due_date) details.push({ label: 'Fecha límite', value: procedure.due_date });
    }

    return details;
}

function getClientProcedureTypeLabel(value) {
    return CLIENT_PROCEDURE_TYPES.find(type => type.value === value)?.label || value || 'Trámite';
}

function getClientProcedureEntityTypeLabel(value) {
    return CLIENT_PROCEDURE_ENTITY_TYPES.find(type => type.value === value)?.label || 'Sin tipo de entidad';
}

function getClientProcedureDocumentKey(label, index) {
    return String(label || `documento-${index + 1}`)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || `documento_${index + 1}`;
}

function buildClientProcedureDocumentDrafts(procedureType) {
    if (!procedureType) return [];

    const suggestions = CLIENT_PROCEDURE_DOCUMENT_SUGGESTIONS[procedureType] || CLIENT_PROCEDURE_DOCUMENT_SUGGESTIONS.otro_tramite;

    return suggestions.map((suggestion, index) => {
        const label = typeof suggestion === 'string'
            ? suggestion
            : String(suggestion?.document_label || suggestion?.label || suggestion?.name || '').trim();
        const required = typeof suggestion === 'string'
            ? true
            : !(suggestion.required === false || suggestion.required === 0);

        return {
            id: `${procedureType}-${index}-${getClientProcedureDocumentKey(label, index)}`,
            document_key: getClientProcedureDocumentKey(label, index),
            document_label: label,
            required,
            enabled: true
        };
    }).filter(draft => draft.document_label);
}
function formatClientProcedureDateTime(value) {
    if (!value) return 'Sin fecha';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString('es-ES', {
        dateStyle: 'short',
        timeStyle: 'short'
    });
}

function formatClientProcedureFileSize(bytes) {
    const size = Number(bytes || 0);
    if (!Number.isFinite(size) || size <= 0) return 'Tamaño no informado';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getClientProcedureStatusLabel(status) {
    const labels = {
        open: 'Abierto',
        in_progress: 'En curso',
        completed: 'Completado',
        cancelled: 'Cancelado'
    };

    return labels[status] || status || 'Sin estado';
}

function getClientDocumentStatusLabel(status) {
    const labels = {
        pending: 'Pendiente',
        received: 'Recibido',
        in_review: 'En revisión',
        accepted: 'Aceptado',
        rejected: 'Rechazado',
        not_applicable: 'No aplica'
    };

    return labels[status] || status || 'Sin estado';
}

function getClientDocumentStatusClass(status) {
    if (status === 'accepted') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    if (status === 'rejected') return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
    if (status === 'received' || status === 'in_review') return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
    if (status === 'not_applicable') return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

function formatClientDocumentLogText(log) {
    const action = String(log?.action || '');
    const notes = String(log?.notes || '').trim();

    if (action === 'document_uploaded') {
        if (notes.startsWith('Documento subido por el cliente:')) return notes;
        if (notes.startsWith('Documento subido correctamente:')) return notes;
        const receivedMatch = notes.match(/^Documento recibido:\s*(.+?)\.?$/i);
        return receivedMatch ? `Documento subido correctamente: ${receivedMatch[1]}` : 'Documento subido correctamente';
    }

    if (action === 'document_deleted') {
        return notes.startsWith('Documento eliminado:') ? notes : 'Documento eliminado';
    }

    if (action === 'document_note_updated') {
        return 'Nota documental actualizada';
    }

    if (action.startsWith('required_document_status_')) {
        const status = action.replace('required_document_status_', '');
        const labels = {
            pending: 'Documento marcado como pendiente',
            received: 'Documento marcado como recibido',
            in_review: 'Documento marcado como en revisión',
            accepted: 'Documento marcado como aceptado',
            rejected: 'Documento marcado como rechazado',
            not_applicable: 'Documento marcado como no procede'
        };
        return labels[status] || 'Estado documental actualizado';
    }

    if (action.startsWith('procedure_status_')) {
        return notes || 'Estado del trámite actualizado';
    }

    if (action === 'procedure_created') {
        return notes || 'Trámite creado';
    }

    return notes || action || 'Movimiento documental';
}

function ClientProceduresPanel() {
    const [clients, setClients] = useState([]);
    const [procedures, setProcedures] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState(null);
    const [filters, setFilters] = useState({ client_id: '', status: '', procedure_type: '', entity_type: '' });
    const [form, setForm] = useState({
        client_id: '',
        procedure_type: '',
        entity_type: '',
        title: '',
        description: '',
        employee_name: '',
        reference_label: '',
        period_type: '',
        period_value: '',
        fiscal_year: '',
        procedure_subtype: '',
        priority: 'normal',
        due_date: ''
    });
    const [documentDrafts, setDocumentDrafts] = useState([]);
    const [uploadFiles, setUploadFiles] = useState({});
    const [documentUpdates, setDocumentUpdates] = useState({});
    const [procedureUpdates, setProcedureUpdates] = useState({});
    const [deleteDialog, setDeleteDialog] = useState(null);
    const [deleteError, setDeleteError] = useState('');

    const loadClients = async () => {
        const response = await fetch('/api/clients/entities', { credentials: 'same-origin' });
        const data = await response.json();

        if (!response.ok || data.status !== 'ok') {
            throw new Error(data.message || 'No se pudieron cargar los clientes.');
        }

        setClients(data.clients || []);
    };

    const loadProcedures = async (targetFilters = filters, showLoading = true, rethrow = false) => {
        if (showLoading) setLoading(true);

        try {
            const params = new URLSearchParams();
            params.set('limit', '100');

            if (targetFilters.client_id) params.set('client_id', targetFilters.client_id);
            if (targetFilters.status) params.set('status', targetFilters.status);
            if (targetFilters.procedure_type) params.set('procedure_type', targetFilters.procedure_type);
            if (targetFilters.entity_type) params.set('entity_type', targetFilters.entity_type);

            const response = await fetch(`/api/manager/client-procedures?${params.toString()}`, {
                credentials: 'same-origin'
            });
            const data = await response.json();

            if (!response.ok || data.status !== 'ok') {
                throw new Error(data.message || 'No se pudieron cargar los trámites.');
            }

            setProcedures(data.procedures || []);
            setSummary(data.summary || null);
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
            if (rethrow) throw err;
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleRefreshData = async () => {
        setRefreshing(true);
        setMessage(null);

        try {
            await Promise.all([
                loadClients(),
                loadProcedures(filters, false, true)
            ]);

            setMessage({ type: 'success', text: 'Datos actualizados.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'No se pudieron actualizar los datos.' });
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadClients().catch(err => {
            console.error('Error loading clients for procedures', err);
        });
    }, []);

    useEffect(() => {
        loadProcedures(filters).catch(() => {});
    }, [filters.client_id, filters.status, filters.procedure_type, filters.entity_type]);

    const handleProcedureTypeChange = (procedureType) => {
        setForm(prev => ({
            ...prev,
            procedure_type: procedureType,
            title: getClientProcedureTypeLabel(procedureType),
            employee_name: isClientLaborProcedureType(procedureType) === isClientLaborProcedureType(prev.procedure_type)
                ? prev.employee_name
                : '',
            reference_label: isClientLaborProcedureType(procedureType) ? '' : prev.reference_label,
            period_type: procedureType === 'tickets_gastos' ? prev.period_type : '',
            period_value: '',
            fiscal_year: procedureType === 'trimestre_fiscal' || procedureType === 'declaracion_renta' || procedureType === 'impuesto_sociedades'
                ? prev.fiscal_year
                : '',
            procedure_subtype: ''
        }));
        setDocumentDrafts(buildClientProcedureDocumentDrafts(procedureType));
    };

    const handleDocumentDraftToggle = (draftId, checked) => {
        setDocumentDrafts(prev => prev.map(draft => (
            draft.id === draftId ? { ...draft, enabled: checked } : draft
        )));
    };

    const handleCreateProcedure = async (event) => {
        event.preventDefault();
        setMessage(null);

        const requiredDocuments = documentDrafts
            .filter(draft => draft.enabled)
            .map(draft => ({
                document_key: draft.document_key,
                document_label: draft.document_label,
                required: draft.required
            }));

        if (!form.client_id || !form.entity_type || !form.procedure_type || !form.title || !requiredDocuments.length) {
            setMessage({ type: 'error', text: 'Selecciona cliente, tipo de entidad, tipo de trámite, título y al menos un documento requerido.' });
            return;
        }

        if (form.procedure_type === 'trimestre_fiscal' && (!form.period_value || !form.fiscal_year)) {
            setMessage({ type: 'error', text: 'Selecciona trimestre y ejercicio para el trimestre fiscal.' });
            return;
        }

        if ((form.procedure_type === 'declaracion_renta' || form.procedure_type === 'impuesto_sociedades') && !form.fiscal_year) {
            setMessage({ type: 'error', text: 'Indica el ejercicio fiscal.' });
            return;
        }

        if (form.procedure_type === 'censal_actividad' && !form.procedure_subtype) {
            setMessage({ type: 'error', text: 'Selecciona la actuación censal.' });
            return;
        }

        if (form.procedure_type === 'tickets_gastos' && !form.period_type) {
            setMessage({ type: 'error', text: 'Selecciona el periodo de tickets y gastos.' });
            return;
        }

        const isLaborProcedure = isClientLaborProcedureType(form.procedure_type);
        const procedurePayload = {
            ...form,
            employee_name: isLaborProcedure ? form.employee_name : '',
            reference_label: isLaborProcedure ? '' : form.reference_label,
            period_type: form.procedure_type === 'trimestre_fiscal' ? 'trimestre' : form.period_type,
            required_documents: requiredDocuments
        };

        setActionLoading('create');

        try {
            const response = await fetch('/api/manager/client-procedures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(procedurePayload)
            });
            const data = await response.json();

            if (!response.ok || data.status !== 'ok') {
                throw new Error(data.message || 'No se pudo crear el trámite.');
            }

            const nextFilters = { client_id: form.client_id, status: '', procedure_type: '', entity_type: form.entity_type };
            setFilters(nextFilters);
            setForm(prev => ({
                ...prev,
                procedure_type: '',
                title: '',
                description: '',
                employee_name: '',
                reference_label: '',
                period_type: '',
                period_value: '',
                fiscal_year: '',
                procedure_subtype: '',
                priority: 'normal',
                due_date: ''
            }));
            setDocumentDrafts([]);
            setMessage({ type: 'success', text: 'Trámite creado.' });
            await loadProcedures(nextFilters, false);
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setActionLoading('');
        }
    };

    const handleUploadDocument = async (procedure, requiredDocument) => {
        const file = uploadFiles[requiredDocument.id];

        if (!file) {
            setMessage({ type: 'error', text: 'Selecciona un archivo antes de subir.' });
            return;
        }

        setActionLoading(`upload-${requiredDocument.id}`);
        setMessage(null);

        try {
            const uploadUrlResponse = await fetch(`/api/manager/client-procedures/${encodeURIComponent(procedure.id)}/documents/${encodeURIComponent(requiredDocument.id)}/upload-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    original_filename: file.name,
                    mime_type: file.type || 'application/octet-stream',
                    file_size: file.size
                })
            });
            const uploadUrlData = await uploadUrlResponse.json();

            if (!uploadUrlResponse.ok || uploadUrlData.status !== 'ok') {
                throw new Error(uploadUrlData.message || 'No se pudo preparar la subida.');
            }

            const uploadBody = new FormData();
            uploadBody.append('cacheControl', '3600');
            uploadBody.append('', file);

            const storageResponse = await fetch(uploadUrlData.signed_url, {
                method: 'PUT',
                body: uploadBody
            });

            if (!storageResponse.ok) {
                const detail = await storageResponse.text().catch(() => '');
                throw new Error(`Supabase Storage rechazó la subida (${storageResponse.status}). ${detail}`.trim());
            }

            const completeResponse = await fetch(`/api/manager/client-procedures/${encodeURIComponent(procedure.id)}/documents/${encodeURIComponent(requiredDocument.id)}/complete-upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    uploaded_document_id: uploadUrlData.uploaded_document_id,
                    original_filename: file.name,
                    safe_filename: uploadUrlData.safe_filename,
                    storage_bucket: uploadUrlData.storage_bucket,
                    storage_path: uploadUrlData.storage_path,
                    mime_type: file.type || 'application/octet-stream',
                    file_size: file.size,
                    uploaded_by: 'manager',
                    status: 'received',
                    required_document_status: 'received'
                })
            });
            const completeData = await completeResponse.json();

            if (!completeResponse.ok || completeData.status !== 'ok') {
                throw new Error(completeData.message || 'La subida se completó, pero no se pudieron registrar los metadatos.');
            }

            setUploadFiles(prev => ({ ...prev, [requiredDocument.id]: null }));
            setMessage({ type: 'success', text: 'Documento subido y registrado.' });
            await loadProcedures(filters, false);
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setActionLoading('');
        }
    };

    const handleOpenUploadedDocument = async (procedure, uploadedDocument) => {
        setActionLoading(`download-${uploadedDocument.id}`);
        setMessage(null);

        try {
            const response = await fetch(`/api/manager/client-procedures/${encodeURIComponent(procedure.id)}/documents/${encodeURIComponent(uploadedDocument.id)}/download-url`, {
                credentials: 'same-origin'
            });
            const data = await response.json();

            if (!response.ok || data.status !== 'ok') {
                throw new Error(data.message || 'No se pudo generar la URL firmada.');
            }

            window.open(data.signed_url, '_blank', 'noopener,noreferrer');
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setActionLoading('');
        }
    };

    const openDeleteUploadedDocumentDialog = (procedure, requiredDocument, uploadedDocument) => {
        setDeleteError('');
        setDeleteDialog({ procedure, requiredDocument, uploadedDocument });
    };

    const closeDeleteUploadedDocumentDialog = () => {
        if (actionLoading.startsWith('delete-')) return;
        setDeleteError('');
        setDeleteDialog(null);
    };

    const confirmDeleteUploadedDocument = async () => {
        if (!deleteDialog) return;

        const { procedure, requiredDocument, uploadedDocument } = deleteDialog;
        setActionLoading(`delete-${uploadedDocument.id}`);
        setDeleteError('');
        setMessage(null);

        try {
            const response = await fetch(`/api/manager/client-procedures/${encodeURIComponent(procedure.id)}/documents/${encodeURIComponent(uploadedDocument.id)}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });
            const data = await response.json();

            if (!response.ok || !(data.ok === true || data.status === 'ok') || data.deleted !== true) {
                throw new Error(data.message || 'No se pudo eliminar el documento.');
            }

            setUploadFiles(prev => ({ ...prev, [requiredDocument.id]: null }));
            setDeleteDialog(null);
            setMessage({ type: 'success', text: 'Documento eliminado correctamente.' });
            await loadProcedures(filters, false);
        } catch (err) {
            setDeleteError(err.message || 'No se pudo eliminar el documento.');
            setMessage({ type: 'error', text: err.message || 'No se pudo eliminar el documento.' });
        } finally {
            setActionLoading('');
        }
    };
    const handleUpdateDocumentStatus = async (procedure, requiredDocument) => {
        const draft = documentUpdates[requiredDocument.id] || {
            status: requiredDocument.status,
            notes: requiredDocument.notes || ''
        };

        const activeUploads = (requiredDocument.uploaded_documents || []).filter(uploadedDocument => (
            uploadedDocument.procedure_id === procedure.id &&
            uploadedDocument.required_document_id === requiredDocument.id &&
            !uploadedDocument.deleted_at
        ));

        if (draft.status === 'received' && activeUploads.length === 0) {
            setMessage({ type: 'error', text: 'Sube un archivo antes de marcar el documento como recibido.' });
            return;
        }

        setActionLoading(`doc-status-${requiredDocument.id}`);
        setMessage(null);

        try {
            const response = await fetch(`/api/manager/client-procedures/${encodeURIComponent(procedure.id)}/documents/${encodeURIComponent(requiredDocument.id)}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(draft)
            });
            const data = await response.json();

            if (!response.ok || data.status !== 'ok') {
                throw new Error(data.message || 'No se pudo actualizar el documento.');
            }

            setMessage({ type: 'success', text: 'Estado documental actualizado.' });
            await loadProcedures(filters, false);
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setActionLoading('');
        }
    };

    const handleUpdateProcedureStatus = async (procedure) => {
        const draft = procedureUpdates[procedure.id] || {
            status: procedure.status,
            notes: ''
        };

        setActionLoading(`procedure-status-${procedure.id}`);
        setMessage(null);

        try {
            const response = await fetch(`/api/manager/client-procedures/${encodeURIComponent(procedure.id)}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(draft)
            });
            const data = await response.json();

            if (!response.ok || data.status !== 'ok') {
                throw new Error(data.message || 'No se pudo actualizar el trámite.');
            }

            setMessage({ type: 'success', text: 'Estado del trámite actualizado.' });
            await loadProcedures(filters, false);
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setActionLoading('');
        }
    };

    const computedSummary = summary || {
        open_procedures: procedures.filter(procedure => procedure.status === 'open' || procedure.status === 'in_progress').length,
        pending_documents: procedures.reduce((total, procedure) => total + (procedure.required_documents || []).filter(doc => doc.status === 'pending').length, 0),
        received_or_review_documents: procedures.reduce((total, procedure) => total + (procedure.required_documents || []).filter(doc => doc.status === 'received' || doc.status === 'in_review').length, 0),
        accepted_documents: procedures.reduce((total, procedure) => total + (procedure.required_documents || []).filter(doc => doc.status === 'accepted').length, 0),
        rejected_documents: procedures.reduce((total, procedure) => total + (procedure.required_documents || []).filter(doc => doc.status === 'rejected').length, 0)
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">Documentación y trámites</h2>
                        <p className="text-sm text-slate-400 font-medium">Gestión documental de trámites por cliente con Storage privado y URLs firmadas.</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleRefreshData}
                        disabled={refreshing}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-bold text-slate-200 hover:border-indigo-500/60 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Actualizando...' : 'Actualizar datos'}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
                <MetricCard title="Trámites abiertos" value={computedSummary.open_procedures} color="text-white" border="border-slate-700/60" bg="bg-slate-800/80" />
                <MetricCard title="Pendientes" value={computedSummary.pending_documents} color="text-amber-400" border="border-amber-500/20" bg="bg-amber-950/20" />
                <MetricCard title="Recibidos / revisión" value={computedSummary.received_or_review_documents} color="text-blue-400" border="border-blue-500/20" bg="bg-blue-950/20" />
                <MetricCard title="Aceptados" value={computedSummary.accepted_documents} color="text-emerald-400" border="border-emerald-500/20" bg="bg-emerald-950/20" />
                <MetricCard title="Rechazados" value={computedSummary.rejected_documents} color="text-rose-400" border="border-rose-500/20" bg="bg-rose-950/20" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <form onSubmit={handleCreateProcedure} className="xl:col-span-4 rounded-2xl border border-slate-700/60 bg-slate-800/80 p-6 shadow-xl shadow-black/20 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-700/60 pb-3">
                        <Plus className="h-4 w-4 text-indigo-300" />
                        <h3 className="text-lg font-bold text-white">Nuevo trámite</h3>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Cliente</label>
                        <select
                            value={form.client_id}
                            onChange={(event) => setForm(prev => ({ ...prev, client_id: event.target.value }))}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">Selecciona cliente</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tipo de trámite</label>
                        <select
                            value={form.procedure_type}
                            onChange={(event) => handleProcedureTypeChange(event.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">Selecciona tipo de trámite</option>
                            {CLIENT_PROCEDURE_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tipo de entidad</label>
                        <select
                            value={form.entity_type}
                            onChange={(event) => setForm(prev => ({ ...prev, entity_type: event.target.value }))}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">Selecciona tipo de entidad</option>
                            {CLIENT_PROCEDURE_ENTITY_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Título</label>
                        <input
                            value={form.title}
                            onChange={(event) => setForm(prev => ({ ...prev, title: event.target.value }))}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">{isClientLaborProcedureType(form.procedure_type) ? 'Empleado' : 'Referencia'}</label>
                            <input
                                value={isClientLaborProcedureType(form.procedure_type) ? form.employee_name : form.reference_label}
                                onChange={(event) => setForm(prev => isClientLaborProcedureType(prev.procedure_type)
                                    ? { ...prev, employee_name: event.target.value }
                                    : { ...prev, reference_label: event.target.value }
                                )}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Vencimiento</label>
                            <input
                                type="date"
                                value={form.due_date}
                                onChange={(event) => setForm(prev => ({ ...prev, due_date: event.target.value }))}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {form.procedure_type === 'trimestre_fiscal' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Trimestre</label>
                                <select
                                    value={form.period_value}
                                    onChange={(event) => setForm(prev => ({ ...prev, period_type: 'trimestre', period_value: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">Selecciona trimestre</option>
                                    {CLIENT_QUARTER_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Ejercicio</label>
                                <input
                                    inputMode="numeric"
                                    value={form.fiscal_year}
                                    onChange={(event) => setForm(prev => ({ ...prev, fiscal_year: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    )}

                    {form.procedure_type === 'declaracion_renta' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Ejercicio fiscal</label>
                                <input
                                    inputMode="numeric"
                                    value={form.fiscal_year}
                                    onChange={(event) => setForm(prev => ({ ...prev, fiscal_year: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tipo de renta</label>
                                <select
                                    value={form.procedure_subtype}
                                    onChange={(event) => setForm(prev => ({ ...prev, procedure_subtype: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">Selecciona tipo</option>
                                    {CLIENT_RENTA_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {form.procedure_type === 'impuesto_sociedades' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Ejercicio fiscal</label>
                                <input
                                    inputMode="numeric"
                                    value={form.fiscal_year}
                                    onChange={(event) => setForm(prev => ({ ...prev, fiscal_year: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tipo de cierre</label>
                                <select
                                    value={form.procedure_subtype}
                                    onChange={(event) => setForm(prev => ({ ...prev, procedure_subtype: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">Selecciona tipo</option>
                                    {CLIENT_SOCIETIES_CLOSING_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {form.procedure_type === 'censal_actividad' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Actuación censal</label>
                                <select
                                    value={form.procedure_subtype}
                                    onChange={(event) => setForm(prev => ({ ...prev, procedure_subtype: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">Selecciona actuación</option>
                                    {CLIENT_CENSAL_ACTION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Fecha de efecto</label>
                                <input
                                    type="date"
                                    value={form.period_value}
                                    onChange={(event) => setForm(prev => ({ ...prev, period_type: 'fecha_efecto', period_value: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    )}

                    {form.procedure_type === 'tickets_gastos' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Periodo</label>
                                <select
                                    value={form.period_type}
                                    onChange={(event) => setForm(prev => ({ ...prev, period_type: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">Selecciona periodo</option>
                                    {CLIENT_TICKETS_PERIOD_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Detalle del periodo</label>
                                <input
                                    value={form.period_value}
                                    onChange={(event) => setForm(prev => ({ ...prev, period_value: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Prioridad</label>
                        <select
                            value={form.priority}
                            onChange={(event) => setForm(prev => ({ ...prev, priority: event.target.value }))}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="normal">Normal</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                            <option value="low">Baja</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Descripción</label>
                        <textarea
                            value={form.description}
                            onChange={(event) => setForm(prev => ({ ...prev, description: event.target.value }))}
                            rows={3}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Documentos requeridos</span>
                            <button
                                type="button"
                                onClick={() => setDocumentDrafts(buildClientProcedureDocumentDrafts(form.procedure_type))}
                                disabled={!form.procedure_type}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:border-indigo-500/50 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Sugeridos
                            </button>
                        </div>
                        <p className="mb-3 text-xs leading-relaxed text-slate-500">
                            Documentos sugeridos por la asesoría según el tipo de trámite y entidad. La documentación requerida puede ajustarse según cliente y caso.
                        </p>
                        <div className="space-y-2">
                            {documentDrafts.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-3 py-3 text-xs font-semibold text-slate-500">
                                    Selecciona un tipo de trámite para cargar documentos sugeridos.
                                </div>
                            ) : documentDrafts.map(draft => (
                                <label key={draft.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm font-semibold text-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={draft.enabled}
                                        onChange={(event) => handleDocumentDraftToggle(draft.id, event.target.checked)}
                                        className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                                    />
                                    <span>{draft.document_label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={actionLoading === 'create'}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                    >
                        <Plus className="h-4 w-4" />
                        {actionLoading === 'create' ? 'Creando...' : 'Crear trámite'}
                    </button>
                </form>

                <div className="xl:col-span-8 space-y-5">
                    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/80 p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                            <select
                                value={filters.client_id}
                                onChange={(event) => setFilters(prev => ({ ...prev, client_id: event.target.value }))}
                                className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="">Todos los clientes</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                            <select
                                value={filters.status}
                                onChange={(event) => setFilters(prev => ({ ...prev, status: event.target.value }))}
                                className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="">Todos los estados</option>
                                <option value="open">Abierto</option>
                                <option value="in_progress">En curso</option>
                                <option value="completed">Completado</option>
                                <option value="cancelled">Cancelado</option>
                            </select>
                            <select
                                value={filters.procedure_type}
                                onChange={(event) => setFilters(prev => ({ ...prev, procedure_type: event.target.value }))}
                                className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="">Todos los tipos</option>
                                <option value="">Selecciona tipo de trámite</option>
                            {CLIENT_PROCEDURE_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                            <select
                                value={filters.entity_type}
                                onChange={(event) => setFilters(prev => ({ ...prev, entity_type: event.target.value }))}
                                className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="">Todos los tipos de entidad</option>
                                {CLIENT_PROCEDURE_ENTITY_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-24 text-slate-400">
                            <div className="animate-pulse flex flex-col items-center gap-6">
                                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="font-semibold tracking-wide text-lg">Cargando trámites...</p>
                            </div>
                        </div>
                    ) : procedures.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/40 p-10 text-center text-slate-400">
                            <FileText className="mx-auto mb-4 h-10 w-10 text-slate-500" />
                            <p className="font-bold text-slate-300">No hay trámites documentales con estos filtros.</p>
                        </div>
                    ) : (
                        procedures.map(procedure => {
                            const procedureDraft = procedureUpdates[procedure.id] || { status: procedure.status, notes: '' };

                            return (
                                <section key={procedure.id} className="rounded-2xl border border-slate-700/60 bg-slate-800/80 p-5 shadow-xl shadow-black/20">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-indigo-300">
                                                    {getClientProcedureTypeLabel(procedure.procedure_type)}
                                                </span>
                                                <span className="rounded-lg border border-slate-600/60 bg-slate-950/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-300">
                                                    {getClientProcedureStatusLabel(procedure.status)}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-black text-white">{procedure.title}</h3>
                                            <p className="mt-1 text-sm font-semibold text-slate-400">{procedure.client?.name || procedure.client_id}</p>
                                            <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                                                <span>Entidad: {getClientProcedureEntityTypeLabel(procedure.entity_type)}</span>
                                                {isClientLaborProcedureType(procedure.procedure_type) && procedure.employee_name && <span>Empleado: {procedure.employee_name}</span>}
                                                {!isClientLaborProcedureType(procedure.procedure_type) && (procedure.reference_label || procedure.employee_name) && <span>Referencia: {procedure.reference_label || procedure.employee_name}</span>}
                                                {getClientProcedureStructuredDetails(procedure).map(detail => <span key={detail.label}>{detail.label}: {detail.value}</span>)}
                                                <span>Prioridad: {procedure.priority || 'normal'}</span>
                                                {procedure.due_date && <span>Vence: {procedure.due_date}</span>}
                                                <span>Actualizado: {formatClientProcedureDateTime(procedure.updated_at)}</span>
                                            </div>
                                            {procedure.description && (
                                                <p className="mt-3 rounded-xl border border-slate-700/40 bg-slate-950/30 px-3 py-2 text-sm leading-relaxed text-slate-300">
                                                    {procedure.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="w-full lg:w-80 rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
                                            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Estado del trámite</label>
                                            <div className="grid grid-cols-1 gap-2">
                                                <select
                                                    value={procedureDraft.status}
                                                    onChange={(event) => setProcedureUpdates(prev => ({
                                                        ...prev,
                                                        [procedure.id]: { ...procedureDraft, status: event.target.value }
                                                    }))}
                                                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                                                >
                                                    <option value="open">Abierto</option>
                                                    <option value="in_progress">En curso</option>
                                                    <option value="completed">Completado</option>
                                                    <option value="cancelled">Cancelado</option>
                                                </select>
                                                <input
                                                    value={procedureDraft.notes}
                                                    onChange={(event) => setProcedureUpdates(prev => ({
                                                        ...prev,
                                                        [procedure.id]: { ...procedureDraft, notes: event.target.value }
                                                    }))}
                                                    placeholder="Nota interna"
                                                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateProcedureStatus(procedure)}
                                                    disabled={actionLoading === `procedure-status-${procedure.id}`}
                                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-200 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <Save className="h-4 w-4" />
                                                    Guardar
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 space-y-4">
                                        {(procedure.required_documents || []).map(requiredDocument => {
                                            const documentDraft = documentUpdates[requiredDocument.id] || {
                                                status: requiredDocument.status,
                                                notes: requiredDocument.notes || ''
                                            };
                                            const selectedFile = uploadFiles[requiredDocument.id];
                                            const managerFileInputId = `manager-document-file-${requiredDocument.id}`;
                                            const activeUploadedDocuments = (requiredDocument.uploaded_documents || []).filter(uploadedDocument => (
                                                uploadedDocument.procedure_id === procedure.id &&
                                                uploadedDocument.required_document_id === requiredDocument.id &&
                                                !uploadedDocument.deleted_at
                                            ));
                                            const isConditionalRequiredDocument = /si\s+procede/i.test(requiredDocument.document_label || '');

                                            return (
                                                <div key={requiredDocument.id} className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
                                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h4 className="font-bold text-slate-100">{requiredDocument.document_label}</h4>
                                                                <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${getClientDocumentStatusClass(requiredDocument.status)}`}>
                                                                    {getClientDocumentStatusLabel(requiredDocument.status)}
                                                                </span>
                                                                {requiredDocument.required === 1 && (
                                                                    <span className="rounded-lg border border-slate-600/60 bg-slate-950/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                                                        {isConditionalRequiredDocument ? 'SI PROCEDE' : 'Obligatorio'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {requiredDocument.notes && (
                                                                <p className="mt-2 text-sm text-slate-400">{requiredDocument.notes}</p>
                                                            )}
                                                        </div>

                                                        <div className="w-full lg:w-[420px]">
                                                            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
                                                                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2">
                                                                    <input
                                                                        id={managerFileInputId}
                                                                        type="file"
                                                                        onChange={(event) => setUploadFiles(prev => ({
                                                                            ...prev,
                                                                            [requiredDocument.id]: event.target.files?.[0] || null
                                                                        }))}
                                                                        className="sr-only peer"
                                                                    />
                                                                    <label
                                                                        htmlFor={managerFileInputId}
                                                                        className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-100 hover:bg-slate-600 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-950"
                                                                    >
                                                                        Seleccionar archivo
                                                                    </label>
                                                                    <span
                                                                        className={`min-w-0 truncate text-xs font-semibold ${selectedFile ? 'text-slate-300' : 'text-slate-500'}`}
                                                                        title={selectedFile?.name || 'Sin archivo seleccionado'}
                                                                    >
                                                                        {selectedFile?.name || 'Sin archivo seleccionado'}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleUploadDocument(procedure, requiredDocument)}
                                                                    disabled={!selectedFile || actionLoading === `upload-${requiredDocument.id}`}
                                                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-200 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                                                >
                                                                    <Upload className="h-4 w-4" />
                                                                    Subir
                                                                </button>
                                                            </div>
                                                            {selectedFile && (
                                                                <div className="mt-2 flex min-w-0 items-center gap-1 text-xs font-semibold text-slate-500">
                                                                    <span className="min-w-0 truncate" title={selectedFile.name}>{selectedFile.name}</span>
                                                                    <span className="shrink-0">· {formatClientProcedureFileSize(selectedFile.size)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {activeUploadedDocuments.length > 0 && (
                                                        <div className="mt-4 space-y-2">
                                                            {activeUploadedDocuments.map(uploadedDocument => (
                                                                <div key={uploadedDocument.id} className="flex flex-col gap-3 rounded-xl border border-slate-700/50 bg-slate-950/40 px-3 py-3 md:flex-row md:items-center md:justify-between">
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                                                                            <FileText className="h-4 w-4 shrink-0 text-blue-300" />
                                                                            <span className="truncate">{uploadedDocument.original_filename}</span>
                                                                        </div>
                                                                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                                                                            <span>{formatClientProcedureFileSize(uploadedDocument.file_size)}</span>
                                                                            <span>{uploadedDocument.mime_type || 'Tipo no informado'}</span>
                                                                            <span>{formatClientProcedureDateTime(uploadedDocument.created_at)}</span>
                                                                            <span>{getClientDocumentStatusLabel(uploadedDocument.status)}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex shrink-0 flex-wrap gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOpenUploadedDocument(procedure, uploadedDocument)}
                                                                            disabled={actionLoading === `download-${uploadedDocument.id}` || actionLoading === `delete-${uploadedDocument.id}`}
                                                                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 hover:border-blue-500/50 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
                                                                        >
                                                                            <Download className="h-4 w-4" />
                                                                            Abrir
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openDeleteUploadedDocumentDialog(procedure, requiredDocument, uploadedDocument)}
                                                                            disabled={actionLoading === `download-${uploadedDocument.id}` || actionLoading === `delete-${uploadedDocument.id}`}
                                                                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                            {actionLoading === `delete-${uploadedDocument.id}` ? 'Eliminando...' : 'Eliminar'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[160px_1fr_auto]">
                                                        <select
                                                            value={documentDraft.status}
                                                            onChange={(event) => setDocumentUpdates(prev => ({
                                                                ...prev,
                                                                [requiredDocument.id]: { ...documentDraft, status: event.target.value }
                                                            }))}
                                                            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                                                        >
                                                            <option value="pending">Pendiente</option>
                                                            <option value="received">Recibido</option>
                                                            <option value="in_review">En revisión</option>
                                                            <option value="accepted">Aceptado</option>
                                                            <option value="rejected">Rechazado</option>
                                                            <option value="not_applicable">No aplica</option>
                                                        </select>
                                                        <input
                                                            value={documentDraft.notes}
                                                            onChange={(event) => setDocumentUpdates(prev => ({
                                                                ...prev,
                                                                [requiredDocument.id]: { ...documentDraft, notes: event.target.value }
                                                            }))}
                                                            placeholder="Nota documental"
                                                            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateDocumentStatus(procedure, requiredDocument)}
                                                            disabled={actionLoading === `doc-status-${requiredDocument.id}`}
                                                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" />
                                                            Guardar estado
                                                        </button>
                                                    </div>

                                                    {(requiredDocument.logs || []).length > 0 && (
                                                        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                                                            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Historial documental</div>
                                                            <div className="space-y-2">
                                                                {requiredDocument.logs.slice(0, 4).map(log => (
                                                                    <div key={log.id} className="text-xs text-slate-400">
                                                                        <span className="font-bold text-slate-300">{formatClientProcedureDateTime(log.created_at)}</span>
                                                                        {' · '}
                                                                        <span>{formatClientDocumentLogText(log)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {(procedure.logs || []).length > 0 && (
                                        <div className="mt-5 rounded-xl border border-slate-700/50 bg-slate-950/30 p-4">
                                            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Historial del trámite</div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {procedure.logs.slice(0, 6).map(log => (
                                                    <div key={log.id} className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
                                                        <div className="font-bold text-slate-300">{formatClientProcedureDateTime(log.created_at)}</div>
                                                        <div>{formatClientDocumentLogText(log)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            );
                        })
                    )}
                </div>
            </div>

            {deleteDialog && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                        <h3 className="text-lg font-black text-white">Eliminar documento</h3>
                        <p className="mt-3 text-sm leading-relaxed text-slate-300">
                            ¿Seguro que quieres eliminar este archivo? Esta acción eliminará el archivo subido y no afectará al trámite.
                        </p>
                        {deleteDialog.uploadedDocument?.original_filename && (
                            <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-bold text-slate-200">
                                {deleteDialog.uploadedDocument.original_filename}
                            </div>
                        )}
                        {deleteError && (
                            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200">
                                {deleteError}
                            </div>
                        )}
                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeDeleteUploadedDocumentDialog}
                                disabled={actionLoading.startsWith('delete-')}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                No, cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteUploadedDocument}
                                disabled={actionLoading.startsWith('delete-')}
                                className="inline-flex items-center justify-center rounded-xl border border-rose-500/40 bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {actionLoading.startsWith('delete-') ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ClientPackagesPanel() {
    const [validClients, setValidClients] = useState([]);
    const [clientId, setClientId] = useState('');
    const [clientName, setClientName] = useState('');
    const [sectorKey, setSectorKey] = useState('');
    const [packageData, setPackageData] = useState(null);
    const [packageItems, setPackageItems] = useState([]);
    const [packageItemsLoading, setPackageItemsLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [publishLoading, setPublishLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [interestRequests, setInterestRequests] = useState([]);
    const [interestRequestsLoading, setInterestRequestsLoading] = useState(false);
    const [interestStatusLoadingId, setInterestStatusLoadingId] = useState(null);
    const [interestSummary, setInterestSummary] = useState(null);
    const [refreshNotice, setRefreshNotice] = useState(null);

    const loadInterestRequests = async (targetClientId = clientId) => {
        setInterestRequestsLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('limit', '20');

            if (targetClientId) {
                params.set('client_id', targetClientId);
            }

            const res = await fetch(`/api/manager/interest-requests?${params.toString()}`);
            const data = await res.json();

            if (data.status === 'ok') {
                setInterestRequests(data.requests || []);
            }
        } catch (err) {
            console.error('Error loading interest requests', err);
        } finally {
            setInterestRequestsLoading(false);
        }
    };

    const loadInterestSummary = async (targetClientId = clientId) => {
        try {
            const params = new URLSearchParams();

            if (targetClientId) {
                params.set('client_id', targetClientId);
            }

            const url = params.toString()
                ? `/api/manager/interest-requests/summary?${params.toString()}`
                : '/api/manager/interest-requests/summary';

            const res = await fetch(url);
            const data = await res.json();

            if (data.status === 'ok') {
                setInterestSummary(data.counts || null);
            }
        } catch (err) {
            console.error('Error loading interest summary', err);
        }
    };

    const loadPackageItems = async (packageId, targetClientId = clientId) => {
        if (!packageId) {
            setPackageItems([]);
            return;
        }

        setPackageItemsLoading(true);

        try {
            const params = new URLSearchParams();
            params.set('package_id', packageId);

            if (targetClientId) {
                params.set('client_id', targetClientId);
            }

            const res = await fetch(`/api/manager/publication-package-items?${params.toString()}`);
            const data = await res.json();

            if (data.status === 'ok') {
                setPackageItems(data.items || []);
            } else {
                setPackageItems([]);
            }
        } catch (err) {
            console.error('Error loading package items', err);
            setPackageItems([]);
        } finally {
            setPackageItemsLoading(false);
        }
    };

    const loadPackageForClient = async (targetClientId = clientId, targetSectorKey = sectorKey) => {
        if (!targetClientId) {
            setPackageData(null);
            setPackageItems([]);
            return;
        }

        try {
            const params = new URLSearchParams();
            params.set('client_id', targetClientId);
            params.set('limit', '20');

            const res = await fetch(`/api/manager/publication-packages?${params.toString()}`);
            const data = await res.json();

            if (data.status !== 'ok') {
                setPackageData(null);
                setPackageItems([]);
                return;
            }

            const packages = data.packages || [];
            const selectedPackage = packages.find(pkg => !targetSectorKey || pkg.sector_key === targetSectorKey) || null;

            if (!selectedPackage) {
                setPackageData(null);
                setPackageItems([]);
                return;
            }

            setPackageData({
                status: 'ok',
                action: selectedPackage.package_status === 'published'
                    ? 'existing_published_package_found'
                    : 'existing_package_found',
                package: selectedPackage,
                counts: {
                    total_items: selectedPackage.total_items || 0,
                    total_compliance_items: selectedPackage.total_compliance_items || 0,
                    total_aid_items: selectedPackage.total_aid_items || 0,
                    total_radar_items: selectedPackage.total_radar_items || 0
                }
            });

            await loadPackageItems(selectedPackage.id, targetClientId);
        } catch (err) {
            console.error('Error loading publication package for client', err);
            setPackageData(null);
        }
    };

    const refreshClientPackagePanel = async () => {
        if (!clientId) {
            setRefreshNotice({
                type: 'error',
                text: 'Selecciona un cliente antes de actualizar.'
            });
            return;
        }

        setMessage(null);
        setRefreshNotice(null);
        setInterestRequestsLoading(true);

        try {
            await Promise.all([
                loadPackageForClient(clientId, sectorKey),
                loadInterestRequests(clientId),
                loadInterestSummary(clientId)
            ]);

            const currentClient = validClients.find(client => client.id === clientId);

            setRefreshNotice({
                type: 'success',
                text: `Datos actualizados correctamente para ${currentClient?.name || clientId}.`
            });
        } catch (err) {
            console.error('Error refreshing client package panel', err);

            setRefreshNotice({
                type: 'error',
                text: 'No se han podido actualizar los datos del cliente seleccionado.'
            });
        } finally {
            setInterestRequestsLoading(false);
        }
    };

    const formatInterestStatus = (status) => {
        if (status === 'pending_contact') return 'Pendiente de contacto';
        if (status === 'contacted') return 'Cliente contactado';
        if (status === 'handled') return 'Gestionada';
        if (status === 'dismissed') return 'Descartada';
        return status || 'Pendiente';
    };

    const updateInterestRequestStatus = async (requestId, requestStatus) => {
        if (!requestId || !requestStatus) return;

        setInterestStatusLoadingId(requestId);

        try {
            const res = await fetch(`/api/manager/interest-requests/${requestId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    request_status: requestStatus,
                    handled_by: 'gestor_demo',
                    internal_notes: requestStatus === 'contacted'
                        ? 'Cliente marcado como contactado desde panel gestor.'
                        : 'Solicitud marcada como gestionada desde panel gestor.'
                })
            });

            const data = await res.json();

            if (res.ok && data.status === 'ok') {
                await loadInterestRequests(clientId);
                await loadInterestSummary(clientId);
            } else {
                alert(data.message || 'No se ha podido actualizar la solicitud.');
            }
        } catch (err) {
            alert('Error de red al actualizar la solicitud.');
        } finally {
            setInterestStatusLoadingId(null);
        }
    };


    useEffect(() => {
        fetch('/api/clients/entities')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'ok') {
                    setValidClients(data.clients || []);
                    if (data.clients && data.clients.length > 0) {
                        const first = data.clients[0];
                        setClientId(first.id);
                        setClientName(first.name);
                        if (first.sector_key) setSectorKey(first.sector_key);
                    }
                }
            })
            .catch(console.error);

    }, []);

    const handleClientChange = (e) => {
        const id = e.target.value;
        const c = validClients.find(client => client.id === id);

        setClientId(id);
        setPackageData(null);
        setPackageItems([]);
        setMessage(null);
        setInterestRequests([]);
        setInterestSummary(null);

        if (c) {
            setClientName(c.name);
            if (c.sector_key) {
                setSectorKey(c.sector_key);
            }
        } else {
            setClientName('');
            setSectorKey('');
        }
    };

    useEffect(() => {
        if (!clientId) {
            setPackageData(null);
            setInterestRequests([]);
            setInterestSummary(null);
            return;
        }

        loadPackageForClient(clientId, sectorKey);
        loadInterestRequests(clientId);
        loadInterestSummary(clientId);
    }, [clientId, sectorKey]);

    const generatePackage = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch('/api/manager/publication-packages/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: clientId,
                    client_name: clientName,
                    sector_key: sectorKey,
                    tenant_id: 'default',
                    generated_by: 'gestor_demo'
                })
            });
            const data = await res.json();
            if (data.status === 'ok') {
                setPackageData(data);

                if (data.package?.id) {
                    await loadPackageItems(data.package.id, clientId);
                } else {
                    setPackageItems([]);
                }

                if (data.action === 'existing_published_package_found') {
                    setMessage({ type: 'error', text: data.message + ' Puedes consultarlo en el Portal Entidad. Para modificarlo, será necesario crear una nueva versión del paquete.' });
                } else {
                    setMessage({ type: 'success', text: 'Paquete preparado para revisión rápida' });
                }
            } else {
                setMessage({ type: 'error', text: data.message || 'Error al generar' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Error de red' });
        }
        setLoading(false);
    };

    const publishPackage = async () => {
        if (!packageData || !packageData.package) return;
        setPublishLoading(true);
        try {
            const res = await fetch(`/api/manager/publication-packages/${packageData.package.id}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    confirm_publish: true,
                    published_by: 'gestor_demo',
                    notes: 'Aprobado en bloque desde panel'
                })
            });
            const data = await res.json();
            if (data.status === 'ok' && data.ok !== false) {
                setMessage({ type: 'success', text: data.action === 'already_published_noop' ? 'Paquete ya estaba publicado' : 'Paquete publicado en Portal Entidad' });
                setPackageData({
                    ...packageData,
                    package: { ...packageData.package, package_status: 'published' }
                });
            } else if (data.ok === false) {
                setMessage({ type: 'error', text: data.message });
            } else {
                setMessage({ type: 'error', text: data.message || 'Error al publicar' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Error de red' });
        }
        setPublishLoading(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm">
                <h2 className="text-xl font-bold text-white mb-4">Generador de Paquetes para Cliente</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Cliente</label>
                        <select value={clientId} onChange={handleClientChange} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500">
                            <option value="" disabled>Selecciona un cliente</option>
                            {validClients.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({formatHumanLabel(c.sector_key)})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Sector</label>
                        <select value={sectorKey} onChange={e => setSectorKey(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500">
                            <option value="alimentacion">Alimentación</option>
                            <option value="clinicas_privadas">Clínicas Privadas</option>
                            <option value="comercio">Comercio</option>
                            <option value="construccion">Construcción</option>
                            <option value="hosteleria">Hostelería</option>
                            <option value="metal">Metal</option>
                            <option value="oficinas">Oficinas</option>
                            <option value="peluqueria_estetica">Peluquería y Estética</option>
                            <option value="talleres">Talleres</option>
                            <option value="transporte">Transporte</option>
                        </select>
                    </div>
                </div>
                <button onClick={generatePackage} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm shadow-indigo-500/20 disabled:opacity-50">
                    {loading ? 'Generando...' : 'Generar paquete recomendado'}
                </button>

                {message && (
                    <div className={`mt-4 p-4 rounded-xl border flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' : 'bg-rose-950/30 border-rose-500/30 text-rose-400'}`}>
                        <div className="font-bold text-sm">{message.text}</div>
                    </div>
                )}
            </div>

            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-white">Solicitudes recibidas desde Portal Entidad</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            Peticiones de clientes que quieren que la asesoría revise una ayuda u oportunidad.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => refreshClientPackagePanel()}
                        disabled={interestRequestsLoading}
                        className="bg-slate-900/70 hover:bg-slate-900 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
                    >
                        {interestRequestsLoading ? 'Actualizando...' : 'Actualizar'}
                    </button>
                </div>

                {refreshNotice && (
                    <div className={`mb-5 rounded-xl border px-4 py-3 text-sm font-bold ${
                        refreshNotice.type === 'success'
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-950/30 border-rose-500/30 text-rose-400'
                    }`}>
                        {refreshNotice.text}
                    </div>
                )}

                <div className="mb-5">
                    <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">
                        Resumen comercial de solicitudes
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4">
                            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-2">Total</div>
                            <div className="text-2xl font-black text-white">{interestSummary?.total ?? interestRequests.length}</div>
                        </div>

                        <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4">
                            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-2">Pendientes</div>
                            <div className="text-2xl font-black text-amber-400">{interestSummary?.pending_contact ?? 0}</div>
                        </div>

                        <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-4">
                            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-2">Contactadas</div>
                            <div className="text-2xl font-black text-blue-400">{interestSummary?.contacted ?? 0}</div>
                        </div>

                        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4">
                            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-2">Gestionadas</div>
                            <div className="text-2xl font-black text-emerald-400">{interestSummary?.handled ?? 0}</div>
                        </div>

                        <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-4">
                            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-2">Descartadas</div>
                            <div className="text-2xl font-black text-rose-400">{interestSummary?.dismissed ?? 0}</div>
                        </div>
                    </div>
                </div>

                {dedupeRequestsForDisplay(interestRequests).length === 0 ? (
                    <div className="text-sm text-slate-500 bg-slate-900/40 border border-dashed border-slate-700/60 rounded-xl p-4">
                        Todavía no hay solicitudes recibidas desde el Portal Entidad.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {dedupeRequestsForDisplay(interestRequests).map(req => (
                            <div key={req.id} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 grid grid-cols-1 lg:grid-cols-[1.1fr_1.5fr_0.8fr] gap-3 items-start">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Cliente</div>
                                    <div className="font-bold text-slate-200">{textFromValue(req.client_name ?? req.client_id, 'Cliente sin nombre')}</div>
                                </div>

                                <div>
                                    <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Ayuda / oportunidad</div>
                                    <div className="font-semibold text-slate-200">{req.title}</div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        {displayClientVisibleRequestMessage(req.message)}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Estado</div>
                                    <div className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs font-bold ${
                                        req.request_status === 'handled'
                                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                            : req.request_status === 'contacted'
                                                ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                                                : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                                    }`}>
                                        {formatInterestStatus(req.request_status)}
                                    </div>

                                    <div className="text-[11px] text-slate-500 mt-2">
                                        {req.created_at ? new Date(req.created_at).toLocaleString() : ''}
                                    </div>

                                    <div className="flex flex-col gap-2 mt-3">
                                        {req.request_status === 'pending_contact' && (
                                            <button
                                                type="button"
                                                disabled={interestStatusLoadingId === req.id}
                                                onClick={() => updateInterestRequestStatus(req.id, 'contacted')}
                                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-xs font-bold"
                                            >
                                                {interestStatusLoadingId === req.id ? 'Actualizando...' : 'Contactada'}
                                            </button>
                                        )}

                                        {req.request_status !== 'handled' && (
                                            <button
                                                type="button"
                                                disabled={interestStatusLoadingId === req.id}
                                                onClick={() => updateInterestRequestStatus(req.id, 'handled')}
                                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-xs font-bold"
                                            >
                                                {interestStatusLoadingId === req.id ? 'Actualizando...' : 'Gestionada'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {packageData && packageData.package && (
                <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">Resumen del Paquete</h3>
                            <p className="text-slate-400 text-sm">Cliente: <span className="font-semibold text-slate-200">{packageData.package.client_name}</span> · Sector: <span className="font-semibold text-slate-200">{formatHumanLabel(packageData.package.sector_key)}</span></p>
                        </div>
                        <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-lg text-xs uppercase font-bold tracking-widest flex items-center gap-2">
                            {packageData.package.package_status === 'published' ? 'Publicado' : 'Pendiente de revisión'}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        {/* PACKAGES_TOP_CARD_TOTAL_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('paquetes-items-incluidos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver items incluidos"
                >
                    <MetricCard title="Total Items" value={packageData.counts.total_items} color="text-white" border="border-slate-700/60" bg="bg-slate-900/40" />
                </button>
                        {/* PACKAGES_TOP_CARD_NORMATIVAS_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('paquetes-items-incluidos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver normativas incluidas"
                >
                    <MetricCard title="Normativas" value={packageData.counts.total_compliance_items} color="text-blue-400" border="border-blue-500/20" bg="bg-blue-950/20" />
                </button>
                        {/* PACKAGES_TOP_CARD_AIDS_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('paquetes-items-incluidos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver ayudas incluidas"
                >
                    <MetricCard title="Ayudas" value={packageData.counts.total_aid_items} color="text-emerald-400" border="border-emerald-500/20" bg="bg-emerald-950/20" />
                </button>
                        {/* PACKAGES_TOP_CARD_RADAR_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('paquetes-items-incluidos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver hallazgos incluidos"
                >
                    <MetricCard title="Hallazgos" value={packageData.counts.total_radar_items} color="text-rose-400" border="border-rose-500/20" bg="bg-rose-950/20" />
                </button>
                    </div>

                    <div className="mb-8">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <div>
                                {/* PACKAGES_TOP_METRIC_TARGET_ITEMS_V1 */}
                    <div id="paquetes-items-incluidos" className="scroll-mt-28" />
                    <h4 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
                                    Items incluidos para revisión humana
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Ningún item se publica al cliente hasta que el paquete sea aprobado expresamente.
                                </p>
                            </div>
                            <div className="text-xs font-bold text-slate-500">
                                {packageItems.length} items
                            </div>
                        </div>

                        {packageItemsLoading ? (
                            <div className="bg-slate-900/40 border border-slate-700/60 rounded-xl p-4 text-sm text-slate-400">
                                Cargando items del paquete...
                            </div>
                        ) : packageItems.length === 0 ? (
                            <div className="bg-slate-900/40 border border-dashed border-slate-700/60 rounded-xl p-4 text-sm text-slate-500">
                                No hay items cargados para este paquete.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {packageItems.map(item => (
                                    <div key={item.id} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_0.9fr] gap-4">
                                        <div>
                                            <div className={`inline-flex mb-2 rounded-lg border px-2 py-1 text-[11px] font-bold uppercase tracking-widest ${
                                                item.source_type === 'aid_item'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                            }`}>
                                                {item.source_type === 'aid_item' ? 'Ayuda / oportunidad' : 'Normativa'}
                                            </div>
                                            <div className="font-bold text-slate-100">{textFromValue(item.title, 'Sin título')}</div>
                                            <OfficialReferenceBlock item={item} compact />
                                        </div>

                                        <div>
                                            <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">
                                                Resumen
                                            </div>
                                            <p className="text-sm text-slate-400 leading-relaxed">
                                                {item.summary || 'Sin resumen disponible.'}
                                            </p>
                                        </div>

                                        <div>
                                            <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">
                                                Estado interno
                                            </div>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between gap-3">
                                                    <span className="text-slate-500">Revisión</span>
                                                    <span className="font-bold text-amber-400">{item.review_status}</span>
                                                </div>
                                                <div className="flex justify-between gap-3">
                                                    <span className="text-slate-500">Requiere revisión</span>
                                                    <span className="font-bold text-amber-400">{Number(item.needs_human_review) === 1 ? 'Sí' : 'No'}</span>
                                                </div>
                                                <div className="flex justify-between gap-3">
                                                    <span className="text-slate-500">Publicado cliente</span>
                                                    <span className="font-bold text-slate-300">{Number(item.publish_to_client) === 1 ? 'Sí' : 'No'}</span>
                                                </div>
                                                <div className="flex justify-between gap-3">
                                                    <span className="text-slate-500">Estado portal</span>
                                                    <span className="font-bold text-slate-300">{item.client_publish_status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-6 border-t border-slate-700/60">
                        {packageData.action !== 'existing_published_package_found' && (
                            <button 
                                onClick={publishPackage} 
                                disabled={publishLoading || packageData.package.package_status === 'published'} 
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg text-sm font-bold shadow-sm shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                {packageData.package.package_status === 'published' ? 'Paquete publicado en Portal Entidad' : 'Aprobar y publicar paquete al cliente'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function portalNormalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function portalObligationRiskStyle(item) {
  const risk = portalNormalizeText(item?.risk_level);

  if (risk.includes('alto') || risk.includes('critico') || risk.includes('crítico')) {
    return {
      card: 'border-rose-500/25 bg-rose-500/10',
      badge: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
      dot: 'bg-rose-500',
      label: 'Riesgo alto'
    };
  }

  if (risk.includes('medio') || risk.includes('warning')) {
    return {
      card: 'border-amber-500/25 bg-amber-500/10',
      badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      dot: 'bg-amber-500',
      label: 'Requiere atención'
    };
  }

  return {
    card: 'border-emerald-500/20 bg-emerald-500/10',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    dot: 'bg-emerald-500',
    label: 'Validada'
  };
}

function portalImplementationGuidance(item) {
  const source = portalNormalizeText([
    item?.source_id,
    item?.title,
    item?.item_type,
    item?.obligation_type,
    item?.tags_json
  ].filter(Boolean).join(' '));

  if (source.includes('registro_jornada') || source.includes('registro diario de jornada') || source.includes('registro horario')) {
    return 'Implantación: utiliza un sistema diario de registro horario, conserva los registros y tenlos disponibles para plantilla, representación legal e Inspección.';
  }

  if (source.includes('registro_retributivo') || source.includes('registro retributivo')) {
    return 'Implantación: prepara el registro salarial desglosado, revisa diferencias retributivas y actualízalo periódicamente con apoyo de tu asesoría.';
  }

  if (source.includes('protocolo_acoso') || source.includes('acoso sexual') || source.includes('razon de sexo')) {
    return 'Implantación: aprueba un protocolo interno, comunica el procedimiento a la plantilla y habilita un canal claro para prevención y denuncia.';
  }

  if (source.includes('proteccion_datos') || source.includes('rgpd') || source.includes('lopdgdd')) {
    return 'Implantación: revisa tratamientos de datos, cláusulas informativas, contratos con encargados, medidas de seguridad y atención de derechos.';
  }

  if (source.includes('prl') || source.includes('prevencion de riesgos')) {
    return 'Implantación: mantén evaluación de riesgos, planificación preventiva, formación, información a la plantilla y vigilancia de la salud cuando proceda.';
  }

  if (source.includes('tacografo') || source.includes('conduccion') || source.includes('descanso')) {
    return 'Implantación: controla uso y descargas del tacógrafo, revisa tiempos de conducción y descanso y conserva la documentación exigible.';
  }

  if (source.includes('equipos_trabajo') || source.includes('maquinaria')) {
    return 'Implantación: identifica equipos y maquinaria, revisa adecuación, mantenimiento, instrucciones de uso y formación preventiva de los trabajadores.';
  }

  if (source.includes('residuos_envases') || source.includes('envases')) {
    return 'Implantación: identifica envases afectados, revisa obligaciones de gestión o responsabilidad ampliada y conserva justificantes o declaraciones.';
  }

  if (source.includes('residuos_general') || source.includes('residuos y suelos')) {
    return 'Implantación: clasifica los residuos generados, trabaja con gestores autorizados y conserva contratos, albaranes y archivo documental.';
  }

  if (source.includes('consumidores') || source.includes('usuarios') || source.includes('consumo')) {
    return 'Implantación: revisa información contractual, garantías, hojas de reclamaciones y comunicaciones comerciales dirigidas a consumidores.';
  }

  return 'Implantación: revisa con tu asesoría los pasos concretos aplicables a tu empresa antes de ejecutar cambios.';
}

function PortalObligationCard({ obligation }) {
  const style = portalObligationRiskStyle(obligation);
  const legalReference = obligation?.legal_reference || 'Referencia legal pendiente de completar por la asesoría.';
  const summary = obligation?.summary || 'Resumen pendiente de completar por la asesoría.';
  const implementation = portalImplementationGuidance(obligation);

  return (
    <div className={`rounded-xl border p-4 ${style.card}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <h4 className="font-bold text-slate-100 leading-snug">{obligation?.title || 'Normativa publicada'}</h4>
        <span className={`inline-flex w-fit items-center gap-2 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${style.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`}></span>
          {style.label}
        </span>
      </div>

      <div className="space-y-2 text-xs leading-relaxed text-slate-300">
        <p>
          <span className="font-bold text-slate-100">Referencia legal: </span>
          {legalReference}
        </p>
        <p>
          <span className="font-bold text-slate-100">Qué dice: </span>
          {summary}
        </p>
        <p>
          <span className="font-bold text-slate-100">Cómo implantarla: </span>
          {implementation}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Información publicada por tu asesoría
      </div>
    </div>
  );
}


// CLIENT_ASSISTANT_FAQ_V1
const CLIENT_ASSISTANT_FAQ_DEFAULTS = [
    {
        id: 'documentacion_trimestral',
        title: 'Documentación trimestral',
        keywords: ['documentacion', 'documentos', 'trimestre', 'trimestral', 'facturas', 'iva', 'modelo', 'contabilidad'],
        answer: 'Para la documentación trimestral, normalmente la asesoría puede necesitar facturas emitidas, facturas recibidas, justificantes bancarios y documentación relacionada con ingresos o gastos del periodo. Si tienes empleados, también puede requerirse documentación laboral. Para confirmar el caso concreto de tu empresa, la consulta debe revisarla tu asesoría.'
    },
    {
        id: 'portal_cliente',
        title: 'Uso del portal',
        keywords: ['portal', 'entrar', 'acceder', 'clave', 'contraseña', 'ver informacion', 'donde veo'],
        answer: 'En el portal puedes consultar la información que tu asesoría ha publicado para tu empresa: normativas, obligaciones, ayudas, avisos y oportunidades. Si necesitas revisión de un caso concreto, puedes solicitar que la asesoría contacte contigo.'
    },
    {
        id: 'ayudas_subvenciones',
        title: 'Ayudas y subvenciones',
        keywords: ['ayuda', 'ayudas', 'subvencion', 'subvenciones', 'kit digital', 'bono', 'incentivo'],
        answer: 'Las ayudas y subvenciones publicadas son oportunidades que tu asesoría considera relevantes para revisar. La aplicación final depende de requisitos vigentes, plazos y documentación. Si te interesa una ayuda, lo recomendable es pedir revisión a tu asesoría.'
    },
    {
        id: 'normativas_obligaciones',
        title: 'Normativas y obligaciones',
        keywords: ['normativa', 'obligacion', 'obligaciones', 'implantar', 'cumplimiento', 'appcc', 'rgpd', 'prl', 'prevencion'],
        answer: 'Las normativas y obligaciones del portal son avisos publicados por tu asesoría para que tengas una visión ordenada de temas que pueden afectar a tu empresa. Si una obligación aparece pendiente de revisar o implantar, conviene solicitar revisión profesional antes de tomar decisiones.'
    },
    {
        id: 'formacion_bonificada',
        title: 'Formación bonificada',
        keywords: ['formacion', 'bonificada', 'curso', 'cursos', 'fundae', 'credito formativo', 'trabajadores'],
        answer: 'La formación bonificada puede permitir a empresas con trabajadores aprovechar crédito formativo, siempre que se cumplan los requisitos aplicables. Si quieres revisar opciones para tu empresa, la asesoría debe valorar tu caso concreto.'
    },
    {
        id: 'contacto_asesoria',
        title: 'Contacto con la asesoría',
        keywords: ['contactar', 'llamar', 'asesor', 'asesoria', 'consulta', 'hablar', 'cita'],
        answer: 'Si necesitas que la asesoría revise un caso concreto, lo mejor es dejar registrada la consulta o contactar directamente con el despacho por sus canales habituales. Las consultas fiscales, laborales, legales o contables concretas deben revisarse por un profesional.'
    }
];

const CLIENT_ASSISTANT_SENSITIVE_PATTERNS = [
    'despedir',
    'despido',
    'baja laboral',
    'trabajador de baja',
    'sancion',
    'inspeccion',
    'hacienda',
    'aeat',
    'agencia tributaria',
    'demanda',
    'denuncia',
    'juicio',
    'cuanto tengo que pagar',
    'que impuesto pago',
    'puedo aplicar',
    'puedo desgravar',
    'puedo desgrabar',
    'desgravar',
    'desgrabar',
    'deducir',
    'deducirme',
    'deduccion',
    'deducciones',
    'deducible',
    'gasto medico',
    'gastos medicos',
    'seguridad social',
    'declaracion de la renta',
    'renta',
    'irpf',
    'iva',
    'modelo 130',
    'modelo 303',
    'modelo 390',
    'declarar',
    'declaracion',
    'autonomo',
    'autonomos',
    'contrato debo',
    'legalmente',
    'multa',
    'embargo'
];

function normalizeAssistantText(value = '') {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9ñ\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// CLIENT_ASSISTANT_PRIORITY_INTENTS_V2
const CLIENT_ASSISTANT_COMPANY_CREATION_PATTERNS = [
  'crear una sl',
  'crear sl',
  'montar una sl',
  'montar sl',
  'constituir una sl',
  'constituir sl',
  'sociedad limitada',
  'abrir una sociedad',
  'crear una sociedad',
  'crear sociedad',
  'montar una empresa',
  'montar empresa',
  'crear una empresa',
  'crear empresa',
  'alta de empresa',
  'alta empresa',
  'documentacion para una sl',
  'documentos para una sl',
  'documentacion necesito para una sl',
  'que documentacion necesito para una sl',
  'que documentacion necesito para crear una sl'
];

const CLIENT_ASSISTANT_QUARTER_DEADLINE_PATTERNS = [
  'fecha',
  'plazo',
  'cuando',
  'hasta cuando',
  'ultimo dia',
  'ultimo plazo',
  'dia limite',
  'limite',
  'entregar la documentacion',
  'entregar documentacion',
  'enviar la documentacion',
  'enviar documentacion',
  'mandar la documentacion',
  'mandar documentacion',
  'llevar la documentacion',
  'llevar documentacion'
];

const CLIENT_ASSISTANT_QUARTER_CONTEXT_PATTERNS = [
  'trimestre',
  'trimestral',
  'declaracion trimestral',
  'liquidacion trimestral',
  'modelo 303',
  'modelo 130',
  'modelo 131',
  'modelo 111',
  'modelo 115',
  'iva',
  'irpf'
];

function assistantTextIncludesAny(normalizedText, patterns) {
  return patterns.some(pattern => normalizedText.includes(normalizeAssistantText(pattern)));
}

function getClientAssistantPriorityIntent(normalized) {
  const asksCompanyCreation = assistantTextIncludesAny(normalized, CLIENT_ASSISTANT_COMPANY_CREATION_PATTERNS);

  if (asksCompanyCreation) {
    return {
      type: 'derivation',
      title: 'Constitución de SL o empresa',
      text: 'Para constituir una SL o iniciar una actividad empresarial, la documentación puede variar según el caso concreto: socios, administrador, actividad, domicilio, capital social, denominación social, estatutos, alta censal y posibles obligaciones fiscales o laborales iniciales. De forma orientativa, la asesoría suele revisar datos de socios y administrador, actividad prevista, domicilio, forma de inicio y documentación necesaria para preparar el alta y los trámites correspondientes. Como depende de tu situación concreta, lo adecuado es derivar esta consulta al despacho para que te indiquen el procedimiento exacto y la documentación que debes aportar.',
      shouldDerive: true
    };
  }

  const asksQuarterDeadline =
    assistantTextIncludesAny(normalized, CLIENT_ASSISTANT_QUARTER_DEADLINE_PATTERNS) &&
    assistantTextIncludesAny(normalized, CLIENT_ASSISTANT_QUARTER_CONTEXT_PATTERNS);

  if (asksQuarterDeadline) {
    return {
      type: 'derivation',
      title: 'Plazo para documentación trimestral',
      text: 'Para la documentación trimestral, lo importante no es solo qué documentos aportar, sino la fecha límite interna que marque tu asesoría para poder revisar, contabilizar y presentar los modelos a tiempo. Como orientación, conviene enviar la documentación con varios días de margen antes del cierre de presentación del trimestre, pero la fecha exacta depende del calendario fiscal, del tipo de modelos que presente tu empresa y de la organización del despacho. Te recomiendo derivar esta consulta a la asesoría para que confirme el plazo concreto aplicable a tu empresa.',
      shouldDerive: true
    };
  }

  return null;
}

function getClientAssistantFaqResponse(question) {
    const normalized = normalizeAssistantText(question);

// CLIENT_ASSISTANT_PRIORITY_INTENTS_CALL_V2
const priorityIntent = getClientAssistantPriorityIntent(normalized);

if (priorityIntent) {
return priorityIntent;
}

    if (!normalized) {
        return {
            type: 'info',
            title: 'Escribe o dicta tu consulta',
            text: 'Puedes preguntar por documentación, ayudas publicadas, normativas, uso del portal o cómo solicitar revisión a tu asesoría.',
            shouldDerive: false
        };
    }

    const hasSensitivePattern = CLIENT_ASSISTANT_SENSITIVE_PATTERNS.some(pattern =>
        normalized.includes(normalizeAssistantText(pattern))
    );

    const hasFiscalDecision =
        (
            normalized.includes('puedo') ||
            normalized.includes('podria') ||
            normalized.includes('me puedo') ||
            normalized.includes('tengo derecho') ||
            normalized.includes('me corresponde')
        ) &&
        (
            normalized.includes('desgravar') ||
            normalized.includes('desgrabar') ||
            normalized.includes('deducir') ||
            normalized.includes('deduccion') ||
            normalized.includes('deducciones') ||
            normalized.includes('gasto medico') ||
            normalized.includes('gastos medicos') ||
            normalized.includes('seguridad social') ||
            normalized.includes('renta') ||
            normalized.includes('irpf') ||
            normalized.includes('iva') ||
            normalized.includes('impuesto') ||
            normalized.includes('hacienda') ||
            normalized.includes('aeat')
        );

    const isSensitive = hasSensitivePattern || hasFiscalDecision;

    if (isSensitive) {
        return {
            type: 'derivation',
            title: 'Consulta para revisión profesional',
            text: 'Esta consulta puede tener implicaciones fiscales, laborales, legales o contables y debe revisarla directamente tu asesoría. El asistente puede ayudarte a dejarla preparada para que el despacho la valore.',
            shouldDerive: true
        };
    }

    const scoredFaqs = CLIENT_ASSISTANT_FAQ_DEFAULTS
        .map(item => {
            let score = 0;

            item.keywords.forEach(keyword => {
                const normalizedKeyword = normalizeAssistantText(keyword);
                if (normalizedKeyword && normalized.includes(normalizedKeyword)) {
                    score += Math.max(5, normalizedKeyword.length);
                }
            });

            const talksAboutNormative =
                normalized.includes('normativa') ||
                normalized.includes('normativas') ||
                normalized.includes('obligacion') ||
                normalized.includes('obligaciones') ||
                normalized.includes('cumplimiento') ||
                normalized.includes('implantar') ||
                normalized.includes('implantacion') ||
                normalized.includes('aparece pendiente');

            if (item.id === 'normativas_obligaciones' && talksAboutNormative) {
                score += 50;
            }

            if (item.id === 'normativas_obligaciones' && normalized.includes('pendiente')) {
                score += 25;
            }

            if (item.id === 'documentacion_trimestral' && (
                normalized.includes('documentacion trimestral') ||
                normalized.includes('facturas emitidas') ||
                normalized.includes('facturas recibidas') ||
                normalized.includes('trimestre')
            )) {
                score += 35;
            }

            if (item.id === 'ayudas_subvenciones' && (
                normalized.includes('ayuda') ||
                normalized.includes('subvencion') ||
                normalized.includes('kit digital')
            )) {
                score += 35;
            }

            return { item, score };
        })
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score);

    const found = scoredFaqs[0]?.item || null;

    if (found) {
        return {
            type: 'answer',
            title: found.title,
            text: found.answer,
            shouldDerive: false
        };
    }

    return {
        type: 'derivation',
        title: 'No tengo una respuesta aprobada para esta consulta',
        text: 'Para evitar darte una información incorrecta, esta consulta debería revisarla tu asesoría. El asistente solo responde preguntas frecuentes y contenidos generales aprobados por el despacho.',
        shouldDerive: true
    };
}

function ClientAssistantFaqPanel({ clientName = 'tu empresa', clientId = '' }) {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState(null);
    const [listening, setListening] = useState(false);
    const [voiceNotice, setVoiceNotice] = useState('');
    const [derivationNotice, setDerivationNotice] = useState('');
    const [derivationLoading, setDerivationLoading] = useState(false);

    const canUseSpeechSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window;
    const canUseSpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

    const speakText = (text) => {
        if (!canUseSpeechSynthesis || !text) {
            setVoiceNotice('La lectura por voz no está disponible en este navegador.');
            return;
        }

        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';
            utterance.rate = 0.95;
            window.speechSynthesis.speak(utterance);
        } catch (err) {
            setVoiceNotice('No se ha podido reproducir la respuesta por voz.');
        }
    };

    const handleAnswer = (forcedQuestion = null) => {
        const finalQuestion = forcedQuestion ?? question;
        const result = getClientAssistantFaqResponse(finalQuestion);
        setAnswer(result);
        setDerivationNotice('');

        if (result?.text) {
            speakText(result.text);
        }
    };

    const handleVoiceInput = () => {
        setVoiceNotice('');
        setDerivationNotice('');

        if (!canUseSpeechRecognition) {
            setVoiceNotice('El dictado por voz no está disponible en este navegador. Puedes escribir la consulta.');
            return;
        }

        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.lang = 'es-ES';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                setListening(true);
                setVoiceNotice('Escuchando tu consulta...');
            };

            recognition.onresult = (event) => {
                const transcript = event?.results?.[0]?.[0]?.transcript || '';
                setQuestion(transcript);
                setVoiceNotice('Consulta recibida por voz.');
                handleAnswer(transcript);
            };

            recognition.onerror = () => {
                setVoiceNotice('No se ha podido capturar la voz. Puedes escribir la consulta.');
            };

            recognition.onend = () => {
                setListening(false);
            };

            recognition.start();
        } catch (err) {
            setListening(false);
            setVoiceNotice('No se ha podido iniciar el micrófono. Revisa permisos del navegador.');
        }
    };

    const handleDerivationDemo = async () => {
        if (!clientId) {
            const msg = 'No se ha podido identificar el cliente del portal. Contacta con tu asesoría.';
            setDerivationNotice(msg);
            speakText(msg);
            return;
        }

        if (!answer?.shouldDerive) {
            const msg = 'Esta consulta no requiere derivación automática.';
            setDerivationNotice(msg);
            speakText(msg);
            return;
        }

        setDerivationLoading(true);
        setDerivationNotice('');

        try {
            const res = await fetch('/api/portal/assistant-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: clientId,
                    question: question,
                    answer_title: answer.title,
                    answer_text: answer.text,
                    sensitive: true
                })
            });

            const data = await res.json();

            if (res.ok && data.status === 'ok') {
                const msg = data.action === 'existing_pending_assistant_request_found'
                    ? 'Ya existe una consulta pendiente para esta pregunta. Tu asesoría la revisará.'
                    : 'Consulta registrada correctamente. Tu asesoría la revisará.';
                setDerivationNotice(msg);
                speakText(msg);
            } else {
                const msg = data.message || 'No se ha podido registrar la consulta. Contacta con tu asesoría.';
                setDerivationNotice(msg);
                speakText(msg);
            }
        } catch (err) {
            const msg = 'Error de conexión al registrar la consulta. Contacta con tu asesoría.';
            setDerivationNotice(msg);
            speakText(msg);
        } finally {
            setDerivationLoading(false);
        }
    };

    const quickQuestions = [
        '¿Qué plazo tengo para enviar la documentación trimestral?',
        '¿Cómo consulto las ayudas disponibles?',
        '¿Qué hago si una normativa aparece pendiente?',
        'Quiero hablar con mi asesoría'
    ];

    const answerTitleClass = answer?.type === 'derivation'
        ? 'font-bold mb-2 text-amber-300'
        : 'font-bold mb-2 text-cyan-200';

    return (
        <div id="portal-asistente-faq" className="bg-slate-800/80 p-6 rounded-2xl border border-cyan-500/20 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
                <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-cyan-300 mb-2">Asistente de la asesoría</div>
                    <h3 className="text-xl font-extrabold text-white">Pregunta rápida sobre tu portal</h3>
                    <p className="text-sm text-slate-400 mt-2 max-w-3xl">
                        Este asistente ayuda a resolver dudas frecuentes de {clientName}. Responde información general aprobada y deriva a la asesoría las consultas que requieran revisión profesional.
                    </p>
                </div>
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-100 font-semibold max-w-sm">
                    No sustituye al asesor. Las cuestiones fiscales, laborales, legales o contables concretas se derivan al despacho.
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-5">
                <div className="space-y-4">
                    <textarea
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        placeholder="Ejemplo: ¿Qué plazo tengo para enviar la documentación trimestral?"
                        className="w-full min-h-[110px] bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                    />

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            onClick={() => handleAnswer()}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-cyan-500/20 transition-colors"
                        >
                            Responder consulta
                        </button>

                        <button
                            type="button"
                            onClick={handleVoiceInput}
                            disabled={listening}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60 transition-colors"
                        >
                            {listening ? 'Escuchando...' : 'Hablar con el asistente'}
                        </button>

                        {answer?.text && (
                            <button
                                type="button"
                                onClick={() => speakText(answer.text)}
                                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
                            >
                                Leer respuesta
                            </button>
                        )}
                    </div>

                    {voiceNotice && (
                        <div className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-3 text-xs text-slate-300">
                            {voiceNotice}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {quickQuestions.map(item => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => {
                                    setQuestion(item);
                                    handleAnswer(item);
                                }}
                                className="text-left rounded-xl border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-xs text-slate-300 hover:border-cyan-500/50 hover:text-cyan-100 transition-colors"
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-5">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Respuesta del asistente</div>

                    {!answer ? (
                        <div className="text-sm text-slate-400 leading-relaxed">
                            Escribe una pregunta o usa el botón de voz. El asistente responderá solo sobre preguntas frecuentes y contenidos generales.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <h4 className={answerTitleClass}>
                                    {answer.title}
                                </h4>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    {answer.text}
                                </p>
                            </div>

                            {answer.shouldDerive && (
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                                    <p className="text-xs text-amber-100 leading-relaxed mb-3">
                                        Esta consulta no debe resolverse automáticamente. Debe revisarla la asesoría.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleDerivationDemo}
                                        disabled={derivationLoading}
                                        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors"
                                    >
                                        {derivationLoading ? 'Registrando...' : 'Preparar derivación'}
                                    </button>
                                </div>
                            )}

                            {derivationNotice && (
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200 font-semibold">
                                    {derivationNotice}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-700/70 bg-slate-900/30 p-4 text-xs text-slate-400 leading-relaxed">
                Módulo personalizable por asesoría: cada despacho podrá definir preguntas frecuentes, respuestas aprobadas, temas que siempre deben derivarse y tono de atención.
            </div>
        </div>
    );
}

const CLIENT_PORTAL_DOCUMENT_UPLOAD_ACCEPT = '.pdf,image/jpeg,image/jpg,image/png,image/*';
const CLIENT_PORTAL_PHOTO_UPLOAD_ACCEPT = 'image/*';
const CLIENT_PORTAL_UPLOAD_FORMAT_ERROR = 'Formato no admitido. Sube PDF, JPG o PNG. HEIC no está admitido en esta V1.';

function getClientPortalUploadFileExtension(filename) {
    const rawName = String(filename || '').split(/[\\/]/).pop() || '';
    const dotIndex = rawName.lastIndexOf('.');

    return dotIndex >= 0 ? rawName.slice(dotIndex).toLowerCase() : '';
}

function validateClientPortalUploadFile(file, { allowPdf = true } = {}) {
    if (!file) {
        return { ok: false, message: 'Selecciona un archivo antes de subir.' };
    }

    const extension = getClientPortalUploadFileExtension(file.name);
    const mimeType = String(file.type || '').split(';')[0].trim().toLowerCase();
    const allowedExtensions = allowPdf
        ? new Set(['.pdf', '.jpg', '.jpeg', '.png'])
        : new Set(['.jpg', '.jpeg', '.png']);
    const allowedMimeTypes = allowPdf
        ? new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'])
        : new Set(['image/jpeg', 'image/jpg', 'image/png']);

    if (!allowedExtensions.has(extension)) {
        return {
            ok: false,
            message: allowPdf
                ? CLIENT_PORTAL_UPLOAD_FORMAT_ERROR
                : 'Formato no admitido. Haz o selecciona una imagen JPG o PNG. HEIC no está admitido en esta V1.'
        };
    }

    if (mimeType && mimeType !== 'application/octet-stream' && !allowedMimeTypes.has(mimeType)) {
        return {
            ok: false,
            message: allowPdf
                ? CLIENT_PORTAL_UPLOAD_FORMAT_ERROR
                : 'Formato no admitido. Haz o selecciona una imagen JPG o PNG. HEIC no está admitido en esta V1.'
        };
    }

    return { ok: true };
}

function getClientPortalDefaultFiscalYear() {
    return String(new Date().getFullYear());
}

function buildEmptyClientPortalStartForm(procedureType = '') {
    const needsFiscalYear = ['trimestre_fiscal', 'declaracion_renta', 'impuesto_sociedades'].includes(procedureType);

    return {
        procedure_type: procedureType,
        period_type: procedureType === 'trimestre_fiscal' ? 'trimestre' : '',
        period_value: '',
        fiscal_year: needsFiscalYear ? getClientPortalDefaultFiscalYear() : '',
        procedure_subtype: '',
        reference_label: '',
        due_date: '',
        description: ''
    };
}
function ClientPortalProceduresPanel({ clientId }) {
    const [procedures, setProcedures] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState(null);
    const [uploadingDocumentId, setUploadingDocumentId] = useState('');
    const [creatingProcedure, setCreatingProcedure] = useState(false);
    const [startForm, setStartForm] = useState(() => buildEmptyClientPortalStartForm());

    const loadClientProcedures = async (showLoading = true, successMessage = '') => {
        if (!clientId) return;

        if (showLoading) setLoading(true);
        if (!showLoading) setRefreshing(true);

        try {
            const response = await fetch('/api/portal/client-procedures', {
                credentials: 'same-origin'
            });
            const data = await response.json();

            if (!response.ok || data.status !== 'ok') {
                throw new Error(data.message || 'No se pudieron cargar los documentos solicitados.');
            }

            setProcedures(data.procedures || []);
            setSummary(data.summary || null);

            if (successMessage) {
                const updatedAt = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                setMessage({ type: 'success', text: `${successMessage} ${updatedAt}` });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'No se pudieron cargar los documentos solicitados.' });
        } finally {
            if (showLoading) setLoading(false);
            if (!showLoading) setRefreshing(false);
        }
    };

    useEffect(() => {
        loadClientProcedures(true);
    }, [clientId]);

    const handleClientDocumentUpload = async (procedure, requiredDocument, file, source) => {
        const validation = validateClientPortalUploadFile(file, { allowPdf: source !== 'photo' });

        if (!validation.ok) {
            setMessage({ type: 'error', text: validation.message });
            return;
        }

        setUploadingDocumentId(requiredDocument.id);
        setMessage(null);

        try {
            const uploadUrlResponse = await fetch(`/api/portal/client-procedures/${encodeURIComponent(procedure.id)}/documents/${encodeURIComponent(requiredDocument.id)}/upload-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    original_filename: file.name,
                    mime_type: file.type || 'application/octet-stream',
                    file_size: file.size
                })
            });
            const uploadUrlData = await uploadUrlResponse.json();

            if (!uploadUrlResponse.ok || uploadUrlData.status !== 'ok') {
                throw new Error(uploadUrlData.message || 'No se pudo preparar la subida.');
            }

            const uploadBody = new FormData();
            uploadBody.append('cacheControl', '3600');
            uploadBody.append('', file);

            const storageResponse = await fetch(uploadUrlData.signed_url, {
                method: 'PUT',
                body: uploadBody
            });

            if (!storageResponse.ok) {
                const detail = await storageResponse.text().catch(() => '');
                throw new Error(`Supabase Storage rechazó la subida (${storageResponse.status}). ${detail}`.trim());
            }

            const completeResponse = await fetch(`/api/portal/client-procedures/${encodeURIComponent(procedure.id)}/documents/${encodeURIComponent(requiredDocument.id)}/complete-upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    uploaded_document_id: uploadUrlData.uploaded_document_id,
                    original_filename: file.name,
                    safe_filename: uploadUrlData.safe_filename,
                    storage_bucket: uploadUrlData.storage_bucket,
                    storage_path: uploadUrlData.storage_path,
                    mime_type: file.type || 'application/octet-stream',
                    file_size: file.size
                })
            });
            const completeData = await completeResponse.json();

            if (!completeResponse.ok || completeData.status !== 'ok') {
                throw new Error(completeData.message || 'La subida se completó, pero no se pudo registrar el documento.');
            }

            setMessage({ type: 'success', text: `Documento subido correctamente: ${file.name}` });
            await loadClientProcedures(false);
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'No se pudo subir el documento.' });
        } finally {
            setUploadingDocumentId('');
        }
    };

    const handlePortalStartTypeChange = (procedureType) => {
        setStartForm(buildEmptyClientPortalStartForm(procedureType));
        setMessage(null);
    };

    const handleCreatePortalProcedure = async (event) => {
        event.preventDefault();
        setMessage(null);

        if (!startForm.procedure_type) {
            setMessage({ type: 'error', text: 'Selecciona qué necesitas gestionar.' });
            return;
        }

        if (startForm.procedure_type === 'trimestre_fiscal' && (!startForm.period_value || !startForm.fiscal_year)) {
            setMessage({ type: 'error', text: 'Selecciona trimestre y ejercicio.' });
            return;
        }

        if ((startForm.procedure_type === 'declaracion_renta' || startForm.procedure_type === 'impuesto_sociedades') && !startForm.fiscal_year) {
            setMessage({ type: 'error', text: 'Indica el ejercicio fiscal.' });
            return;
        }

        if (startForm.procedure_type === 'censal_actividad' && !startForm.procedure_subtype) {
            setMessage({ type: 'error', text: 'Selecciona la actuación censal.' });
            return;
        }

        if (startForm.procedure_type === 'inspeccion_requerimiento' && !startForm.procedure_subtype) {
            setMessage({ type: 'error', text: 'Selecciona el organismo.' });
            return;
        }

        if (startForm.procedure_type === 'tickets_gastos' && !startForm.period_type) {
            setMessage({ type: 'error', text: 'Selecciona el periodo de tickets y gastos.' });
            return;
        }

        const payload = {
            procedure_type: startForm.procedure_type
        };

        if (startForm.reference_label.trim()) payload.reference_label = startForm.reference_label.trim();
        if (startForm.procedure_type === 'trimestre_fiscal') {
            payload.period_value = startForm.period_value;
            payload.fiscal_year = startForm.fiscal_year.trim();
        }
        if (startForm.procedure_type === 'declaracion_renta' || startForm.procedure_type === 'impuesto_sociedades') {
            payload.fiscal_year = startForm.fiscal_year.trim();
            if (startForm.procedure_subtype) payload.procedure_subtype = startForm.procedure_subtype;
        }
        if (startForm.procedure_type === 'censal_actividad') {
            payload.procedure_subtype = startForm.procedure_subtype;
            if (startForm.period_value) payload.period_value = startForm.period_value;
        }
        if (startForm.procedure_type === 'tickets_gastos') {
            payload.period_type = startForm.period_type;
            if (startForm.period_value.trim()) payload.period_value = startForm.period_value.trim();
        }
        if (startForm.procedure_type === 'inspeccion_requerimiento') {
            payload.procedure_subtype = startForm.procedure_subtype;
            if (startForm.due_date) payload.due_date = startForm.due_date;
            if (startForm.description.trim()) payload.description = startForm.description.trim();
        }

        setCreatingProcedure(true);

        try {
            const response = await fetch('/api/portal/client-procedures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (!response.ok || data.status !== 'ok') {
                throw new Error(data.message || 'No se pudo iniciar la solicitud documental.');
            }

            if (data.procedure) {
                setProcedures(prev => [data.procedure, ...prev.filter(procedure => procedure.id !== data.procedure.id)]);
                setSummary(null);
            } else {
                await loadClientProcedures(false);
            }

            setStartForm(buildEmptyClientPortalStartForm());
            setMessage({ type: 'success', text: `Solicitud iniciada: ${data.procedure?.title || getClientProcedureTypeLabel(startForm.procedure_type)}` });
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'No se pudo iniciar la solicitud documental.' });
        } finally {
            setCreatingProcedure(false);
        }
    };
    const computedSummary = summary || {
        open_procedures: procedures.filter(procedure => procedure.status === 'open' || procedure.status === 'in_progress').length,
        pending_documents: procedures.reduce((total, procedure) => total + (procedure.required_documents || []).filter(doc => doc.status === 'pending').length, 0),
        received_or_review_documents: procedures.reduce((total, procedure) => total + (procedure.required_documents || []).filter(doc => doc.status === 'received' || doc.status === 'in_review').length, 0),
        accepted_documents: procedures.reduce((total, procedure) => total + (procedure.required_documents || []).filter(doc => doc.status === 'accepted').length, 0),
        rejected_documents: procedures.reduce((total, procedure) => total + (procedure.required_documents || []).filter(doc => doc.status === 'rejected').length, 0)
    };

    return (
        <section id="portal-documentacion" className="scroll-mt-28 rounded-2xl border border-slate-700/60 bg-slate-800/80 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300">
                        <FileText className="h-4 w-4" />
                        Documentación solicitada
                    </div>
                    <h3 className="mt-2 text-xl font-extrabold text-white">Trámites y documentos pendientes</h3>
                </div>
                <button
                    type="button"
                    onClick={() => loadClientProcedures(false, 'Documentación actualizada.')}
                    disabled={refreshing || loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-bold text-slate-200 hover:border-blue-500/60 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Actualizando...' : 'Actualizar'}
                </button>
            </div>

            {message && (
                <div className={`mt-5 rounded-xl border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleCreatePortalProcedure} className="mt-5 rounded-2xl border border-blue-500/20 bg-blue-950/10 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300">
                            <Plus className="h-4 w-4" />
                            Iniciar solicitud documental
                        </div>
                        <h4 className="mt-2 text-lg font-extrabold text-white">¿Qué necesitas gestionar?</h4>
                    </div>
                    <button
                        type="submit"
                        disabled={creatingProcedure || !startForm.procedure_type}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-100 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Plus className="h-4 w-4" />
                        {creatingProcedure ? 'Iniciando...' : 'Iniciar solicitud'}
                    </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Necesidad</label>
                        <select
                            value={startForm.procedure_type}
                            onChange={(event) => handlePortalStartTypeChange(event.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
                        >
                            <option value="">Selecciona una necesidad</option>
                            {CLIENT_PORTAL_PROCEDURE_START_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    {['alta_empleado', 'baja_medica_it'].includes(startForm.procedure_type) && (
                        <div className="md:col-span-2">
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Empleado o referencia</label>
                            <input
                                value={startForm.reference_label}
                                onChange={(event) => setStartForm(prev => ({ ...prev, reference_label: event.target.value }))}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    )}

                    {startForm.procedure_type === 'trimestre_fiscal' && (
                        <>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Trimestre</label>
                                <select
                                    value={startForm.period_value}
                                    onChange={(event) => setStartForm(prev => ({ ...prev, period_type: 'trimestre', period_value: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="">Selecciona trimestre</option>
                                    {CLIENT_QUARTER_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Ejercicio</label>
                                <input
                                    inputMode="numeric"
                                    value={startForm.fiscal_year}
                                    onChange={(event) => setStartForm(prev => ({ ...prev, fiscal_year: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </>
                    )}

                    {startForm.procedure_type === 'tickets_gastos' && (
                        <>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Periodo</label>
                                <select
                                    value={startForm.period_type}
                                    onChange={(event) => setStartForm(prev => ({ ...prev, period_type: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="">Selecciona periodo</option>
                                    {CLIENT_TICKETS_PERIOD_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Detalle del periodo</label>
                                <input
                                    value={startForm.period_value}
                                    onChange={(event) => setStartForm(prev => ({ ...prev, period_value: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </>
                    )}

                    {(startForm.procedure_type === 'declaracion_renta' || startForm.procedure_type === 'impuesto_sociedades') && (
                        <>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Ejercicio fiscal</label>
                                <input
                                    inputMode="numeric"
                                    value={startForm.fiscal_year}
                                    onChange={(event) => setStartForm(prev => ({ ...prev, fiscal_year: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Tipo</label>
                                <select
                                    value={startForm.procedure_subtype}
                                    onChange={(event) => setStartForm(prev => ({ ...prev, procedure_subtype: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="">Selecciona tipo</option>
                                    {(startForm.procedure_type === 'declaracion_renta' ? CLIENT_RENTA_TYPE_OPTIONS : CLIENT_SOCIETIES_CLOSING_OPTIONS).map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {startForm.procedure_type === 'censal_actividad' && (
                        <>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Actuación censal</label>
                                <select
                                    value={startForm.procedure_subtype}
                                    onChange={(event) => setStartForm(prev => ({ ...prev, procedure_subtype: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="">Selecciona actuación</option>
                                    {CLIENT_CENSAL_ACTION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Fecha de efecto</label>
                                <input
                                    type="date"
                                    value={startForm.period_value}
                                    onChange={(event) => setStartForm(prev => ({ ...prev, period_type: 'fecha_efecto', period_value: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </>
                    )}

                    {startForm.procedure_type === 'inspeccion_requerimiento' && (
                        <>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Organismo</label>
                                <select
                                    value={startForm.procedure_subtype}
                                    onChange={(event) => setStartForm(prev => ({ ...prev, procedure_subtype: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="">Selecciona organismo</option>
                                    {CLIENT_INSPECTION_AUTHORITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Expediente/referencia</label>
                                <input
                                    value={startForm.reference_label}
                                    onChange={(event) => setStartForm(prev => ({ ...prev, reference_label: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Fecha límite</label>
                                <input
                                    type="date"
                                    value={startForm.due_date}
                                    onChange={(event) => setStartForm(prev => ({ ...prev, due_date: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <div className="md:col-span-2 xl:col-span-4">
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Descripción breve</label>
                                <textarea
                                    rows={3}
                                    value={startForm.description}
                                    onChange={(event) => setStartForm(prev => ({ ...prev, description: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </>
                    )}
                </div>
            </form>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MetricCard title="Trámites abiertos" value={computedSummary.open_procedures} color="text-white" border="border-slate-700/60" bg="bg-slate-900/60" />
                <MetricCard title="Pendientes" value={computedSummary.pending_documents} color="text-amber-400" border="border-amber-500/20" bg="bg-amber-950/20" />
                <MetricCard title="Recibidos" value={computedSummary.received_or_review_documents} color="text-blue-400" border="border-blue-500/20" bg="bg-blue-950/20" />
            </div>

            {loading ? (
                <div className="py-10 text-center text-sm font-semibold text-slate-400">Cargando documentación...</div>
            ) : procedures.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-6 text-sm font-semibold text-slate-400">
                    No hay documentos solicitados en este momento.
                </div>
            ) : (
                <div className="mt-6 space-y-5">
                    {procedures.map(procedure => {
                        const structuredDetails = getClientProcedureStructuredDetails(procedure);

                        return (
                            <article key={procedure.id} className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="text-lg font-extrabold text-white">{procedure.title || getClientProcedureTypeLabel(procedure.procedure_type)}</h4>
                                            <span className="rounded-lg border border-slate-600/60 bg-slate-950/50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-300">
                                                {getClientProcedureStatusLabel(procedure.status)}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                                            <span>{getClientProcedureTypeLabel(procedure.procedure_type)}</span>
                                            {structuredDetails.map(detail => (
                                                <span key={`${procedure.id}-${detail.label}`}>{detail.label}: {detail.value}</span>
                                            ))}
                                            {procedure.due_date && <span>Vence: {procedure.due_date}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-3">
                                    {(procedure.required_documents || []).map(requiredDocument => {
                                        const activeUploadedDocuments = (requiredDocument.uploaded_documents || []).filter(uploadedDocument => (
                                            uploadedDocument.procedure_id === procedure.id &&
                                            uploadedDocument.required_document_id === requiredDocument.id &&
                                            !uploadedDocument.deleted_at
                                        ));
                                        const isConditionalRequiredDocument = /si\s+procede/i.test(requiredDocument.document_label || '');
                                        const isUploading = uploadingDocumentId === requiredDocument.id;
                                        const fileInputId = `portal-file-${requiredDocument.id}`;
                                        const photoInputId = `portal-photo-${requiredDocument.id}`;

                                        return (
                                            <div key={requiredDocument.id} className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-4">
                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h5 className="font-bold text-slate-100">{requiredDocument.document_label}</h5>
                                                            <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${getClientDocumentStatusClass(requiredDocument.status)}`}>
                                                                {getClientDocumentStatusLabel(requiredDocument.status)}
                                                            </span>
                                                            {requiredDocument.required === 1 && (
                                                                <span className="rounded-lg border border-slate-600/60 bg-slate-950/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                                                    {isConditionalRequiredDocument ? 'SI PROCEDE' : 'OBLIGATORIO'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {requiredDocument.notes && (
                                                            <p className="mt-2 text-sm text-slate-400">{requiredDocument.notes}</p>
                                                        )}

                                                        {activeUploadedDocuments.length > 0 && (
                                                            <div className="mt-3 space-y-2">
                                                                {activeUploadedDocuments.map(uploadedDocument => (
                                                                    <div key={uploadedDocument.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300">
                                                                        <FileText className="h-4 w-4 shrink-0 text-blue-300" />
                                                                        <span className="truncate">{uploadedDocument.original_filename}</span>
                                                                        <span className="shrink-0 text-slate-500">{uploadedDocument.uploaded_by === 'client' ? 'Subido por ti' : 'Subido por asesoría'}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                                                        <label htmlFor={fileInputId} className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-200 hover:bg-blue-500/20 ${isUploading ? 'pointer-events-none opacity-60' : ''}`}>
                                                            <Upload className="h-4 w-4" />
                                                            {isUploading ? 'Subiendo...' : 'Subir archivo'}
                                                            <input
                                                                id={fileInputId}
                                                                type="file"
                                                                accept={CLIENT_PORTAL_DOCUMENT_UPLOAD_ACCEPT}
                                                                disabled={isUploading}
                                                                className="sr-only"
                                                                onChange={(event) => {
                                                                    const file = event.target.files?.[0] || null;
                                                                    event.target.value = '';
                                                                    if (file) handleClientDocumentUpload(procedure, requiredDocument, file, 'file');
                                                                }}
                                                            />
                                                        </label>
                                                        <label htmlFor={photoInputId} className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20 ${isUploading ? 'pointer-events-none opacity-60' : ''}`}>
                                                            <Camera className="h-4 w-4" />
                                                            Hacer foto
                                                            <input
                                                                id={photoInputId}
                                                                type="file"
                                                                accept={CLIENT_PORTAL_PHOTO_UPLOAD_ACCEPT}
                                                                capture="environment"
                                                                disabled={isUploading}
                                                                className="sr-only"
                                                                onChange={(event) => {
                                                                    const file = event.target.files?.[0] || null;
                                                                    event.target.value = '';
                                                                    if (file) handleClientDocumentUpload(procedure, requiredDocument, file, 'photo');
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
function PortalEntidadPanel({ fixedClientId = '', exclusiveClientPortal = false } = {}) {
    const [interestLoadingId, setInterestLoadingId] = useState(null);
    const [interestFeedback, setInterestFeedback] = useState({});

    const submitInterestRequest = async (aid) => {
        if (!clientId || !aid?.id) return;

        setInterestLoadingId(aid.id);
        setInterestFeedback(prev => ({
            ...prev,
            [aid.id]: null
        }));

        try {
            const res = await fetch('/api/portal/interest-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: clientId,
                    package_item_id: aid.id
                })
            });

            const data = await res.json();

            if (res.ok && data.status === 'ok') {
                const alreadyExists = data.action === 'existing_pending_request_found';

                setInterestFeedback(prev => ({
                    ...prev,
                    [aid.id]: {
                        type: 'success',
                        sent: true,
                        message: alreadyExists
                            ? 'Ya tienes una solicitud pendiente para esta oportunidad.'
                            : 'Solicitud enviada a tu asesoría. Te contactarán para revisar esta oportunidad.'
                    }
                }));
            } else {
                setInterestFeedback(prev => ({
                    ...prev,
                    [aid.id]: {
                        type: 'error',
                        sent: false,
                        message: 'No se ha podido registrar la solicitud. Inténtalo de nuevo o contacta con tu asesoría.'
                    }
                }));
            }
        } catch (err) {
            setInterestFeedback(prev => ({
                ...prev,
                [aid.id]: {
                    type: 'error',
                    sent: false,
                    message: 'No se ha podido registrar la solicitud. Inténtalo de nuevo o contacta con tu asesoría.'
                }
            }));
        } finally {
            setInterestLoadingId(null);
        }
    };


    const [validClients, setValidClients] = useState([]);
    const [clientId, setClientId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch('/api/clients/entities')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'ok') {
                    const clients = data.clients || [];
                    setValidClients(clients);

                    if (fixedClientId) {
                        const matchedClient = clients.find(client =>
                            client.id === fixedClientId ||
                            client.client_id === fixedClientId ||
                            client.client_key === fixedClientId
                        );

                        if (matchedClient) {
                            setClientId(matchedClient.id || matchedClient.client_id || fixedClientId);
                        } else {
                            setClientId('');
                            setError('Portal no disponible para esta entidad.');
                        }

                        return;
                    }

                    if (clients.length > 0) {
                        setClientId(clients[0].id);
                    }
                }
            })
            .catch(() => {
                setError('No se ha podido cargar el acceso del portal.');
            });
    }, [fixedClientId]);
    const [summary, setSummary] = useState(null);
    const [obligations, setObligations] = useState([]);
    const [aids, setAids] = useState([]);
    const [error, setError] = useState(null);

    const loadPortalData = async () => {
        setLoading(true);
        setError(null);
        try {
            const sumRes = await fetch(`/api/portal/summary?client_id=${clientId}`);
            const sumData = await sumRes.json();
            
            if (sumData.status === 'ok') {
                setSummary(sumData);
                if (sumData.total_published_packages > 0) {
                    const oblRes = await fetch(`/api/portal/compliance/obligations?client_id=${clientId}`);
                    const oblData = await oblRes.json();
                    if (oblData.status === 'ok') setObligations(oblData.items || []);
                    
                    const aidRes = await fetch(`/api/portal/aids/items?client_id=${clientId}`);
                    const aidData = await aidRes.json();
                    if (aidData.status === 'ok') setAids(aidData.items || []);
                } else {
                    setObligations([]);
                    setAids([]);
                }
            } else {
                setError('Error al cargar portal');
            }
        } catch (err) {
            setError('Error de conexión');
        }
        setLoading(false);
    };
    useEffect(() => {
        if (exclusiveClientPortal && clientId) {
            loadPortalData();
        }
    }, [exclusiveClientPortal, clientId]);

    const selectedPortalClient = validClients.find(client =>
        client.id === clientId ||
        client.client_id === clientId ||
        client.client_key === clientId
    );

    const portalObligations = Array.isArray(obligations) ? obligations : [];
    const portalAids = Array.isArray(aids) ? aids : [];

    const isImplementationPendingObligation = (item) => {
        const text = [
            item?.status,
            item?.review_status,
            item?.client_publish_status,
            item?.implementation_status,
            item?.title,
            item?.summary
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        if (!text) return false;

        return [
            'pendiente',
            'warning',
            'requiere',
            'implantar',
            'implantacion',
            'actualizacion',
            'regularizar',
            'revision',
            'riesgo'
        ].some(pattern => text.includes(pattern));
    };

    const obligationsForImplementation = portalObligations.filter(isImplementationPendingObligation);
    const validatedObligations = portalObligations.filter(item => !isImplementationPendingObligation(item));
    const relevantAlertsCount = Number(summary?.total_radar_items || 0);

    return (
        <div id="portal-cliente-inicio" className="space-y-8 animate-in fade-in duration-500">
            {exclusiveClientPortal ? (
                <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Portal Entidad</div>
                    <h2 className="text-xl font-extrabold text-white">{selectedPortalClient?.name || clientId || 'Entidad'}</h2>
                    <p className="text-sm text-slate-400 mt-2">
                        Información publicada por tu asesoría para esta entidad.
                    </p>
                    {/* RADAR_CLIENT_PORTAL_TOP_VISIBLE_IP_NOTICE_V2 */}
                    <RadarLegalNotice compact />

                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <a href="#portal-normativas" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 hover:bg-emerald-500/20 transition-colors">
                            <div className="text-xs font-bold uppercase tracking-widest text-emerald-300">Normativas</div>
                            <div className="text-sm text-emerald-100 mt-1">Obligaciones, implantación y alertas.</div>
                        </a>
                        <a href="#portal-ayudas" className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 hover:bg-blue-500/20 transition-colors">
                            <div className="text-xs font-bold uppercase tracking-widest text-blue-300">Ayudas y subvenciones</div>
                            <div className="text-sm text-blue-100 mt-1">Oportunidades publicadas por tu asesoría.</div>
                        </a>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm flex items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Portal Entidad por cliente</label>
                        <p className="text-[10px] text-slate-500 mb-2">Selecciona una entidad para revisar la información publicada.</p>
                        <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500">
                            <option value="" disabled>Selecciona un cliente</option>
                            {validClients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={loadPortalData} disabled={loading || !clientId} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm shadow-blue-500/20 disabled:opacity-50 h-[38px]">
                        Ver portal del cliente
                    </button>
                </div>
            )}

            {loading && <div className="text-center text-slate-400 py-12">Cargando datos del portal...</div>}

            {error && (
                <div className="bg-red-950/40 text-red-300 p-5 rounded-2xl border border-red-500/20">
                    {error}
                </div>
            )}

            {exclusiveClientPortal && clientId && (
                <ClientPortalProceduresPanel clientId={clientId} />
            )}

            {!loading && summary && summary.total_published_packages === 0 && (
                <div className="bg-slate-800/40 p-12 rounded-3xl border border-slate-700/50 border-dashed text-center flex flex-col items-center justify-center text-slate-400 backdrop-blur-sm">
                    <div className="bg-blue-500/10 p-5 rounded-full mb-6 border border-blue-500/20 shadow-inner">
                        <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </div>
                    <h2 className="font-bold text-slate-200 text-2xl mb-3">Tu asesoría está revisando tus obligaciones y oportunidades</h2>
                    <p className="text-base font-medium max-w-lg leading-relaxed mb-4">Cuando tu asesoría valide la información aplicable a tu empresa, verás aquí tus obligaciones principales, ayudas disponibles y alertas relevantes.</p>
                    <p className="text-sm text-slate-500 font-medium">Esta vista solo muestra información revisada y publicada por tu asesoría.</p>
                </div>
            )}

            {!loading && summary && summary.total_published_packages > 0 && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* PORTAL_METRICS_CLICK_NAV_V2 */}
                        <a href="#portal-obligaciones-validadas" className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400/60">
                            <MetricCard title="Obligaciones validadas" value={summary.total_compliance_items} color="text-white" border="border-slate-700/60" bg="bg-slate-800/80" />
                        </a>
                        <a href="#portal-ayudas" className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400/60">
                            <MetricCard title="Ayudas disponibles" value={summary.total_aid_items} color="text-emerald-400" border="border-emerald-500/20" bg="bg-emerald-950/20" />
                        </a>
                        <a href="#portal-alertas-relevantes" className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-400/60">
                            <MetricCard title="Alertas relevantes" value={summary.total_radar_items} color="text-rose-400" border="border-rose-500/20" bg="bg-rose-950/20" />
                        </a>
                    </div>

                    {/* CLIENT_ASSISTANT_FAQ_PORTAL_INSERT_V1 */}
                    <ClientAssistantFaqPanel clientName={selectedPortalClient?.name || clientId || 'tu empresa'} clientId={clientId} />
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div id="portal-normativas" className="scroll-mt-28 bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm">
                            {/* PORTAL_BACK_TO_TOP_BUTTON_V2: portal-normativas */}
                            <div className="mb-4">
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('portal-cliente-inicio')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-bold text-slate-200 hover:border-blue-500 hover:text-blue-300 transition-colors"
                                >
                                    ? Volver al inicio
                                </button>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Normativas y obligaciones de tu empresa
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                                <a href="#portal-obligaciones-validadas" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 hover:bg-emerald-500/20 transition-colors">
                                    <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">Obligaciones validadas</div>
                                    <div className="text-2xl font-black text-emerald-200 mt-1">{validatedObligations.length}</div>
                                </a>
                                <a href="#portal-obligaciones-implantar" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 hover:bg-amber-500/20 transition-colors">
                                    <div className="text-[11px] font-bold uppercase tracking-widest text-amber-300">Para implantar</div>
                                    <div className="text-2xl font-black text-amber-200 mt-1">{obligationsForImplementation.length}</div>
                                </a>
                                <a href="#portal-alertas-relevantes" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 hover:bg-rose-500/20 transition-colors">
                                    <div className="text-[11px] font-bold uppercase tracking-widest text-rose-300">Alertas relevantes</div>
                                    <div className="text-2xl font-black text-rose-200 mt-1">{relevantAlertsCount}</div>
                                </a>
                            </div>

                            <div id="portal-obligaciones-validadas" className="scroll-mt-28 mb-6">
                                {/* PORTAL_BACK_TO_START_OBLIGATIONS_V2 */}
                                <div className="mb-3">
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('portal-cliente-inicio')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-bold text-slate-200 hover:border-blue-500 hover:text-blue-300 transition-colors"
                                    >
                                        ? Volver al inicio
                                    </button>
                                </div>
                                <div className="text-xs font-bold uppercase tracking-widest text-emerald-300 mb-3">Obligaciones validadas</div>
                                {validatedObligations.length === 0 ? (
                                    <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 text-sm text-slate-400">
                                        No hay obligaciones validadas publicadas en este momento.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {validatedObligations.map(obl => (
                                            <PortalObligationCard key={obl.id} obligation={obl} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div id="portal-obligaciones-implantar" className="scroll-mt-28 mb-6">
                                <div className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-3">Obligaciones para implantar o revisar</div>
                                {obligationsForImplementation.length === 0 ? (
                                    <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 text-sm text-slate-400">
                                        No hay obligaciones pendientes de implantación publicadas por tu asesoría.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {obligationsForImplementation.map(obl => (
                                            <PortalObligationCard key={`implantar-${obl.id}`} obligation={obl} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div id="portal-alertas-relevantes" className="scroll-mt-28">
                                {/* PORTAL_BACK_TO_START_ALERTS_V2 */}
                                <div className="mb-3">
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('portal-cliente-inicio')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-bold text-slate-200 hover:border-blue-500 hover:text-blue-300 transition-colors"
                                    >
                                        ? Volver al inicio
                                    </button>
                                </div>
                                <div className="text-xs font-bold uppercase tracking-widest text-rose-300 mb-3">Alertas relevantes</div>
                                {relevantAlertsCount > 0 ? (
                                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                                        Tu asesoría ha publicado {relevantAlertsCount} alerta(s) relevante(s) asociada(s) a tu entidad. Revisa la información publicada y contacta con tu asesoría si necesitas aclaración.
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 text-sm text-slate-400">
                                        No hay alertas relevantes publicadas por tu asesoría en este momento.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div id="portal-ayudas" className="scroll-mt-28 bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm">
                            {/* PORTAL_BACK_TO_TOP_BUTTON_V2: portal-ayudas */}
                            <div className="mb-4">
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('portal-cliente-inicio')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-bold text-slate-200 hover:border-blue-500 hover:text-blue-300 transition-colors"
                                >
                                    ? Volver al inicio
                                </button>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Ayudas y subvenciones disponibles
                            </h3>
                            <div className="space-y-4">
                                {portalAids.map(aid => (
                                    <div key={aid.id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                        <h4 className="font-bold text-slate-200 mb-2">{aid.title}</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                            {aid.title && aid.title.includes('Kit Digital') ? 'Programa de ayudas para impulsar la digitalización de pymes, microempresas y autónomos mediante soluciones digitales. Tu asesoría revisará si tu empresa cumple los requisitos vigentes y qué convocatoria puede aplicar.' : aid.title && aid.title.includes('formación en alternancia') ? 'Oportunidad vinculada a la contratación y formación de personas trabajadoras mediante contrato de formación en alternancia. Puede permitir bonificaciones o incentivos asociados, siempre sujetos a requisitos vigentes y validación por la asesoría.' : aid.summary}
                                        </p>
                                        
                                        <OfficialReferenceBlock item={aid} compact />
                                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg text-xs text-indigo-300 font-semibold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
                                            <span>{aid.deadline_label?.toLowerCase().includes('pendiente') || aid.deadline_label?.toLowerCase().includes('revisión') ? 'Consulta con tu asesoría las condiciones vigentes de tramitación.' : aid.deadline_label}</span>
                                            
                                            <div className="flex flex-col items-end gap-1 min-w-[170px]">
                                                <button
                                                    type="button"
                                                    onClick={() => submitInterestRequest(aid)}
                                                    disabled={interestLoadingId === aid.id || interestFeedback[aid.id]?.sent}
                                                    className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-emerald-600 disabled:cursor-default text-white px-3 py-1 rounded text-[10px] uppercase tracking-wider font-bold shadow-sm whitespace-nowrap transition-colors"
                                                >
                                                    {interestLoadingId === aid.id
                                                        ? 'Enviando...'
                                                        : interestFeedback[aid.id]?.sent
                                                            ? 'Solicitud enviada'
                                                            : 'Consultar con mi asesoría'}
                                                </button>
                                                {interestFeedback[aid.id]?.message && (
                                                    <span className={`text-[10px] font-semibold max-w-[260px] text-right ${interestFeedback[aid.id]?.type === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>
                                                        {interestFeedback[aid.id].message}
                                                    </span>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const QUARTERLY_PERIOD_STATUS_OPTIONS = [
    { value: 'draft', label: 'Borrador' },
    { value: 'open', label: 'Abierto' },
    { value: 'in_review', label: 'En revision' },
    { value: 'completed', label: 'Completado' },
    { value: 'archived', label: 'Archivado' }
];

const QUARTERLY_EXPECTED_DOCUMENT_STATUS_OPTIONS = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'requested', label: 'Solicitado' },
    { value: 'received', label: 'Recibido' },
    { value: 'in_review', label: 'En revision' },
    { value: 'accepted', label: 'Aceptado' },
    { value: 'rejected', label: 'Rechazado' },
    { value: 'not_applicable', label: 'No procede' }
];

const QUARTERLY_RECEIVED_DOCUMENT_REVIEW_STATUS_OPTIONS = [
    { value: 'pending_review', label: 'Pendiente revision' },
    { value: 'in_review', label: 'En revision' },
    { value: 'accepted', label: 'Aceptado' },
    { value: 'rejected', label: 'Rechazado' },
    { value: 'not_applicable', label: 'No procede' }
];

const QUARTERLY_QUARTER_OPTIONS = [
    { value: '1', label: 'T1' },
    { value: '2', label: 'T2' },
    { value: '3', label: 'T3' },
    { value: '4', label: 'T4' }
];

const QUARTERLY_INPUT_CLASS = 'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500';
const QUARTERLY_SELECT_CLASS = 'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500';

function quarterlyOptionLabel(options, value, fallback = 'Sin estado') {
    return options.find(option => option.value === value)?.label || fallback;
}

function quarterlyPeriodStatusClass(status) {
    if (status === 'completed') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    if (status === 'in_review') return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
    if (status === 'open') return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300';
    if (status === 'archived') return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

function quarterlyExpectedDocumentStatusClass(status) {
    if (status === 'accepted') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    if (status === 'rejected') return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
    if (status === 'received' || status === 'in_review') return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
    if (status === 'requested') return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300';
    if (status === 'not_applicable') return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

function quarterlyReceivedDocumentReviewStatusClass(status) {
    if (status === 'accepted') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    if (status === 'rejected') return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
    if (status === 'in_review') return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
    if (status === 'not_applicable') return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

function normalizeQuarterlyDocumentTypeInput(value) {
    return String(value ?? '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function normalizeQuarterlyClientOption(client) {
    const id = textFromValue(client?.id ?? client?.client_id ?? client?.clientId ?? client, '');
    const name = textFromValue(client?.name ?? client?.client_name ?? client?.label ?? id, id || 'Cliente sin nombre');
    return { id, name };
}

function formatQuarterlyDateTime(value) {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

async function readQuarterlyJson(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

function buildQuarterlyExpectedDocumentDraft(document = {}) {
    return {
        id: document.id || '',
        document_type: document.document_type || '',
        title: document.title || '',
        description: document.description || '',
        required: document.required === true || document.required === 1,
        status: document.status || 'pending',
        sort_order: String(document.sort_order ?? 0)
    };
}

function QuarterlyDocumentationPanel() {
    const currentYear = String(new Date().getFullYear());
    const currentQuarter = String(Math.floor(new Date().getMonth() / 3) + 1);
    const [featureState, setFeatureState] = useState('checking');
    const [clients, setClients] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [loading, setLoading] = useState(true);
    const [periodsLoading, setPeriodsLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState(null);
    const [filters, setFilters] = useState({ client_id: '', status: '', year: '', quarter: '' });
    const [periodForm, setPeriodForm] = useState({
        client_id: '',
        year: currentYear,
        quarter: currentQuarter,
        period_label: '',
        status: 'draft',
        notes: ''
    });
    const [expectedDocumentForm, setExpectedDocumentForm] = useState({
        document_type: '',
        title: '',
        description: '',
        required: true,
        status: 'pending',
        sort_order: '0'
    });
    const [expectedDocumentNotice, setExpectedDocumentNotice] = useState(null);
    const [expectedDocumentEdit, setExpectedDocumentEdit] = useState(null);
    const [receivedDocumentForm, setReceivedDocumentForm] = useState({
        expected_document_id: '',
        document_type: '',
        file_name: '',
        document_date: '',
        supplier_or_customer: '',
        review_status: 'pending_review',
        notes: ''
    });
    const [receivedDocumentNotice, setReceivedDocumentNotice] = useState(null);
    const [receivedDocumentEdits, setReceivedDocumentEdits] = useState({});

    async function loadClients() {
        const response = await fetch('/api/clients/entities', { credentials: 'same-origin' });
        const data = await readQuarterlyJson(response);
        if (!response.ok || data.status !== 'ok') {
            throw new Error(data.message || 'No se pudieron cargar los clientes.');
        }
        const normalized = (data.clients || []).map(normalizeQuarterlyClientOption).filter(client => client.id);
        setClients(normalized);
        return normalized;
    }

    async function loadPeriods(targetFilters = filters, showLoading = true, rethrow = false) {
        if (showLoading) setPeriodsLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('limit', '100');
            if (targetFilters.client_id) params.set('client_id', targetFilters.client_id);
            if (targetFilters.status) params.set('status', targetFilters.status);
            if (targetFilters.year) params.set('year', targetFilters.year);
            if (targetFilters.quarter) params.set('quarter', targetFilters.quarter);

            const response = await fetch('/api/manager/quarterly-documentation/periods?' + params.toString(), { credentials: 'same-origin' });
            const data = await readQuarterlyJson(response);

            if (response.status === 404 && data.error_code === 'FEATURE_DISABLED') {
                setFeatureState('disabled');
                setPeriods([]);
                setSelectedPeriod(null);
                setSelectedPeriodId('');
                return [];
            }

            if (!response.ok || data.status !== 'ok') {
                throw new Error(data.message || 'No se pudieron cargar los periodos trimestrales.');
            }

            const nextPeriods = data.periods || [];
            setPeriods(nextPeriods);
            if (selectedPeriodId && !nextPeriods.some(period => period.id === selectedPeriodId)) {
                setSelectedPeriod(null);
                setSelectedPeriodId('');
            }
            return nextPeriods;
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Error al cargar periodos trimestrales.' });
            if (rethrow) throw err;
            return [];
        } finally {
            if (showLoading) setPeriodsLoading(false);
        }
    }

    async function loadPeriodDetail(periodId, showLoading = true, rethrow = false) {
        if (!periodId) return null;
        if (showLoading) setDetailLoading(true);
        try {
            const response = await fetch('/api/manager/quarterly-documentation/periods/' + encodeURIComponent(periodId), { credentials: 'same-origin' });
            const data = await readQuarterlyJson(response);

            if (response.status === 404 && data.error_code === 'FEATURE_DISABLED') {
                setFeatureState('disabled');
                setSelectedPeriod(null);
                setSelectedPeriodId('');
                return null;
            }

            if (!response.ok || data.status !== 'ok') {
                throw new Error(data.message || 'No se pudo cargar el periodo trimestral.');
            }

            setSelectedPeriod(data.period);
            setSelectedPeriodId(periodId);
            setExpectedDocumentEdit(null);
            setReceivedDocumentNotice(null);
            setReceivedDocumentEdits({});
            return data.period;
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Error al cargar el periodo trimestral.' });
            if (rethrow) throw err;
            return null;
        } finally {
            if (showLoading) setDetailLoading(false);
        }
    }

    async function loadQuarterlyModule() {
        setLoading(true);
        setMessage(null);
        try {
            const response = await fetch('/api/manager/quarterly-documentation/status', { credentials: 'same-origin' });
            const data = await readQuarterlyJson(response);

            if (response.status === 404 && data.error_code === 'FEATURE_DISABLED') {
                setFeatureState('disabled');
                return;
            }

            if (!response.ok || data.enabled !== true) {
                throw new Error(data.message || 'No se pudo comprobar el modulo de documentacion trimestral.');
            }

            await loadClients();
            setFeatureState('enabled');
        } catch (err) {
            setFeatureState('error');
            setMessage({ type: 'error', text: err.message || 'No se pudo cargar el modulo trimestral.' });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadQuarterlyModule().catch(() => {});
    }, []);

    useEffect(() => {
        if (featureState !== 'enabled') return;
        loadPeriods(filters).catch(() => {});
    }, [featureState, filters.client_id, filters.status, filters.year, filters.quarter]);

    async function handleRefreshData() {
        setRefreshing(true);
        setMessage(null);
        try {
            await loadClients();
            await loadPeriods(filters, false, true);
            if (selectedPeriodId) await loadPeriodDetail(selectedPeriodId, false, true);
            setMessage({ type: 'success', text: 'Datos actualizados.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'No se pudieron actualizar los datos.' });
        } finally {
            setRefreshing(false);
        }
    }

    async function handleCreatePeriod(event) {
        event.preventDefault();
        setMessage(null);
        if (!periodForm.client_id || !periodForm.year || !periodForm.quarter) {
            setMessage({ type: 'error', text: 'Selecciona cliente, ano y trimestre.' });
            return;
        }

        setActionLoading('create-period');
        try {
            const response = await fetch('/api/manager/quarterly-documentation/periods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    client_id: periodForm.client_id,
                    year: Number(periodForm.year),
                    quarter: Number(periodForm.quarter),
                    period_label: periodForm.period_label,
                    status: periodForm.status,
                    notes: periodForm.notes,
                    expected_documents: []
                })
            });
            const data = await readQuarterlyJson(response);

            if (response.status === 404 && data.error_code === 'FEATURE_DISABLED') {
                setFeatureState('disabled');
                return;
            }

            if (!response.ok || data.status !== 'ok') {
                throw new Error(data.message || 'No se pudo crear el periodo trimestral.');
            }

            setSelectedPeriod(data.period);
            setSelectedPeriodId(data.period.id);
            setPeriodForm(prev => ({ ...prev, period_label: '', notes: '' }));
            setMessage({ type: 'success', text: 'Periodo trimestral creado.' });
            await loadPeriods(filters, false);
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Error al crear el periodo trimestral.' });
        } finally {
            setActionLoading('');
        }
    }

    async function handleCreateExpectedDocument(event) {
        event.preventDefault();
        setMessage(null);
        setExpectedDocumentNotice(null);

        const periodId = selectedPeriod?.id || selectedPeriodId;
        const documentType = normalizeQuarterlyDocumentTypeInput(expectedDocumentForm.document_type);
        const title = String(expectedDocumentForm.title || '').trim();

        const showExpectedDocumentError = (text) => {
            const notice = { type: 'error', text };
            setExpectedDocumentNotice(notice);
            setMessage(notice);
        };

        if (!periodId) {
            showExpectedDocumentError('Selecciona o crea un periodo antes de añadir documentos esperados.');
            return;
        }
        if (!documentType) {
            showExpectedDocumentError('Indica el tipo documental del documento esperado.');
            return;
        }
        if (!title) {
            showExpectedDocumentError('Indica el titulo del documento esperado.');
            return;
        }

        setActionLoading('create-expected-document');
        try {
            const response = await fetch('/api/manager/quarterly-documentation/periods/' + encodeURIComponent(periodId) + '/expected-documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    document_type: documentType,
                    title,
                    description: expectedDocumentForm.description,
                    required: expectedDocumentForm.required,
                    status: expectedDocumentForm.status,
                    sort_order: Number(expectedDocumentForm.sort_order || 0)
                })
            });
            const data = await readQuarterlyJson(response);

            if (response.status === 404 && data.error_code === 'FEATURE_DISABLED') {
                setFeatureState('disabled');
                return;
            }

            if (!response.ok || data.status !== 'ok') {
                const backendMessage = [data.error_code, data.message].filter(Boolean).join(': ');
                throw new Error(backendMessage || 'No se pudo crear el documento esperado.');
            }

            setSelectedPeriod(data.period);
            setSelectedPeriodId(periodId);
            setExpectedDocumentForm({ document_type: '', title: '', description: '', required: true, status: 'pending', sort_order: '0' });
            setExpectedDocumentNotice({ type: 'success', text: 'Documento esperado creado.' });
            setMessage({ type: 'success', text: 'Documento esperado creado.' });
            await loadPeriods(filters, false);
            await loadPeriodDetail(periodId, false);
        } catch (err) {
            const errorNotice = { type: 'error', text: err.message || 'Error al crear el documento esperado.' };
            setExpectedDocumentNotice(errorNotice);
            setMessage(errorNotice);
        } finally {
            setActionLoading('');
        }
    }

    async function handleUpdateExpectedDocument(event) {
        event.preventDefault();
        if (!expectedDocumentEdit?.id) return;
        setMessage(null);
        if (!expectedDocumentEdit.document_type || !expectedDocumentEdit.title) {
            setMessage({ type: 'error', text: 'Tipo documental y titulo son obligatorios.' });
            return;
        }

        setActionLoading('update-expected-document');
        try {
            const response = await fetch('/api/manager/quarterly-documentation/expected-documents/' + encodeURIComponent(expectedDocumentEdit.id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    document_type: expectedDocumentEdit.document_type,
                    title: expectedDocumentEdit.title,
                    description: expectedDocumentEdit.description,
                    required: expectedDocumentEdit.required,
                    status: expectedDocumentEdit.status,
                    sort_order: Number(expectedDocumentEdit.sort_order || 0)
                })
            });
            const data = await readQuarterlyJson(response);

            if (response.status === 404 && data.error_code === 'FEATURE_DISABLED') {
                setFeatureState('disabled');
                return;
            }

            if (!response.ok || data.status !== 'ok') {
                throw new Error(data.message || 'No se pudo actualizar el documento esperado.');
            }

            setSelectedPeriod(data.period);
            setExpectedDocumentEdit(null);
            setMessage({ type: 'success', text: 'Documento esperado actualizado.' });
            await loadPeriods(filters, false);
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Error al actualizar el documento esperado.' });
        } finally {
            setActionLoading('');
        }
    }

    function handleReceivedDocumentExpectedChange(expectedDocumentId) {
        const expectedDocument = (selectedPeriod?.expected_documents || []).find(document => document.id === expectedDocumentId);
        setReceivedDocumentForm(prev => ({
            ...prev,
            expected_document_id: expectedDocumentId,
            document_type: prev.document_type || expectedDocument?.document_type || ''
        }));
    }

    function getReceivedDocumentEdit(document) {
        return receivedDocumentEdits[document.id] || {
            review_status: document.review_status || 'pending_review',
            notes: document.notes || ''
        };
    }

    async function handleCreateReceivedDocument(event) {
        event.preventDefault();
        setMessage(null);
        setReceivedDocumentNotice(null);

        const periodId = selectedPeriod?.id || selectedPeriodId;
        const expectedDocumentId = String(receivedDocumentForm.expected_document_id || '').trim();
        const documentType = normalizeQuarterlyDocumentTypeInput(receivedDocumentForm.document_type);

        const showReceivedDocumentError = (text) => {
            const notice = { type: 'error', text };
            setReceivedDocumentNotice(notice);
            setMessage(notice);
        };

        if (!periodId) {
            showReceivedDocumentError('Selecciona o crea un periodo antes de registrar documentos recibidos.');
            return;
        }

        if (!expectedDocumentId && !documentType) {
            showReceivedDocumentError('Indica el tipo documental o selecciona un documento esperado.');
            return;
        }

        const payload = {
            review_status: receivedDocumentForm.review_status || 'pending_review'
        };
        if (expectedDocumentId) payload.expected_document_id = expectedDocumentId;
        if (documentType) payload.document_type = documentType;

        const fileName = String(receivedDocumentForm.file_name || '').trim();
        const documentDate = String(receivedDocumentForm.document_date || '').trim();
        const supplierOrCustomer = String(receivedDocumentForm.supplier_or_customer || '').trim();
        const notes = String(receivedDocumentForm.notes || '').trim();

        if (fileName) payload.file_name = fileName;
        if (documentDate) payload.document_date = documentDate;
        if (supplierOrCustomer) payload.supplier_or_customer = supplierOrCustomer;
        if (notes) payload.notes = notes;

        setActionLoading('create-received-document');
        try {
            const response = await fetch('/api/manager/quarterly-documentation/periods/' + encodeURIComponent(periodId) + '/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload)
            });
            const data = await readQuarterlyJson(response);

            if (response.status === 404 && data.error_code === 'FEATURE_DISABLED') {
                setFeatureState('disabled');
                return;
            }

            if (!response.ok || data.status !== 'success') {
                const backendMessage = [data.error_code, data.message].filter(Boolean).join(': ');
                throw new Error(backendMessage || 'No se pudo registrar el documento recibido.');
            }

            setSelectedPeriod(data.period);
            setSelectedPeriodId(periodId);
            setReceivedDocumentForm({
                expected_document_id: '',
                document_type: '',
                file_name: '',
                document_date: '',
                supplier_or_customer: '',
                review_status: 'pending_review',
                notes: ''
            });
            await loadPeriods(filters, false);
            await loadPeriodDetail(periodId, false);
            setReceivedDocumentNotice({ type: 'success', text: 'Documento recibido registrado.' });
            setMessage({ type: 'success', text: 'Documento recibido registrado.' });
        } catch (err) {
            const notice = { type: 'error', text: err.message || 'Error al registrar el documento recibido.' };
            setReceivedDocumentNotice(notice);
            setMessage(notice);
        } finally {
            setActionLoading('');
        }
    }

    async function handleUpdateReceivedDocument(document) {
        if (!document?.id) return;
        setMessage(null);
        setReceivedDocumentNotice(null);

        const draft = getReceivedDocumentEdit(document);
        const reviewStatus = String(draft.review_status || document.review_status || 'pending_review').trim() || 'pending_review';
        const notes = String(draft.notes || '').trim();

        setActionLoading(`update-received-document-${document.id}`);
        try {
            const response = await fetch('/api/manager/quarterly-documentation/documents/' + encodeURIComponent(document.id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    review_status: reviewStatus,
                    notes
                })
            });
            const data = await readQuarterlyJson(response);

            if (response.status === 404 && data.error_code === 'FEATURE_DISABLED') {
                setFeatureState('disabled');
                return;
            }

            if (!response.ok || data.status !== 'success') {
                const backendMessage = [data.error_code, data.message].filter(Boolean).join(': ');
                throw new Error(backendMessage || 'No se pudo actualizar el documento recibido.');
            }

            setSelectedPeriod(data.period);
            setReceivedDocumentEdits(prev => ({
                ...prev,
                [document.id]: {
                    review_status: data.document?.review_status || reviewStatus,
                    notes: data.document?.notes ?? notes
                }
            }));
            setReceivedDocumentNotice({ type: 'success', text: 'Documento recibido actualizado.' });
            setMessage({ type: 'success', text: 'Documento recibido actualizado.' });
            await loadPeriods(filters, false);
        } catch (err) {
            const notice = { type: 'error', text: err.message || 'Error al actualizar el documento recibido.' };
            setReceivedDocumentNotice(notice);
            setMessage(notice);
        } finally {
            setActionLoading('');
        }
    }
    const computedSummary = {
        periods: periods.length,
        open: periods.filter(period => period.status === 'open').length,
        inReview: periods.filter(period => period.status === 'in_review').length,
        expectedDocuments: periods.reduce((total, period) => total + Number(period.summary?.expected_documents || 0), 0)
    };

    if (loading || featureState === 'checking') {
        return (
            <div className="flex items-center justify-center py-24 text-slate-400">
                <div className="animate-pulse flex flex-col items-center gap-6">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-semibold tracking-wide text-lg">Comprobando modulo trimestral...</p>
                </div>
            </div>
        );
    }

    if (featureState === 'disabled') {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-white mb-2">Documentacion trimestral</h2>
                    <p className="text-sm text-slate-400 font-medium">Control interno de periodos trimestrales y documentos esperados.</p>
                </div>
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
                    <h3 className="text-lg font-bold mb-2">Modulo desactivado</h3>
                    <p className="text-sm font-semibold">Modulo de documentacion trimestral desactivado en este entorno.</p>
                </div>
            </div>
        );
    }

    if (featureState === 'error') {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-white mb-2">Documentacion trimestral</h2>
                    <p className="text-sm text-slate-400 font-medium">Control interno de periodos trimestrales y documentos esperados.</p>
                </div>
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
                    <h3 className="text-lg font-bold mb-2">Error al cargar el modulo</h3>
                    <p className="text-sm font-semibold">{message?.text || 'No se pudo cargar el modulo trimestral.'}</p>
                    <button type="button" onClick={loadQuarterlyModule} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-500">
                        <RefreshCw className="h-4 w-4" />
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">Documentacion trimestral</h2>
                        <p className="text-sm text-slate-400 font-medium">Control interno de periodos trimestrales y documentos esperados.</p>
                    </div>
                    <button type="button" onClick={handleRefreshData} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-bold text-slate-200 hover:border-indigo-500/60 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-60">
                        <RefreshCw className={'h-4 w-4 ' + (refreshing ? 'animate-spin' : '')} />
                        {refreshing ? 'Actualizando...' : 'Actualizar datos'}
                    </button>
                </div>
            </div>

            {message && (
                <div className={'rounded-xl border px-4 py-3 text-sm font-semibold ' + (message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200')}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <MetricCard title="Periodos" value={computedSummary.periods} color="text-white" border="border-slate-700/60" bg="bg-slate-800/80" />
                <MetricCard title="Abiertos" value={computedSummary.open} color="text-indigo-400" border="border-indigo-500/20" bg="bg-indigo-950/20" />
                <MetricCard title="En revision" value={computedSummary.inReview} color="text-blue-400" border="border-blue-500/20" bg="bg-blue-950/20" />
                <MetricCard title="Documentos esperados" value={computedSummary.expectedDocuments} color="text-amber-400" border="border-amber-500/20" bg="bg-amber-950/20" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <form onSubmit={handleCreatePeriod} className="xl:col-span-4 rounded-2xl border border-slate-700/60 bg-slate-800/80 p-6 shadow-xl shadow-black/20 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-700/60 pb-3">
                        <Plus className="h-4 w-4 text-indigo-300" />
                        <h3 className="text-lg font-bold text-white">Nuevo periodo</h3>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Cliente</label>
                        <select value={periodForm.client_id} onChange={(event) => setPeriodForm(prev => ({ ...prev, client_id: event.target.value }))} className={QUARTERLY_SELECT_CLASS}>
                            <option value="">Selecciona cliente</option>
                            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Ano</label>
                            <input inputMode="numeric" value={periodForm.year} onChange={(event) => setPeriodForm(prev => ({ ...prev, year: event.target.value }))} className={QUARTERLY_INPUT_CLASS} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Trimestre</label>
                            <select value={periodForm.quarter} onChange={(event) => setPeriodForm(prev => ({ ...prev, quarter: event.target.value }))} className={QUARTERLY_SELECT_CLASS}>
                                {QUARTERLY_QUARTER_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Etiqueta</label>
                        <input value={periodForm.period_label} onChange={(event) => setPeriodForm(prev => ({ ...prev, period_label: event.target.value }))} placeholder={(periodForm.year || currentYear) + ' T' + (periodForm.quarter || currentQuarter)} className={QUARTERLY_INPUT_CLASS} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Estado</label>
                        <select value={periodForm.status} onChange={(event) => setPeriodForm(prev => ({ ...prev, status: event.target.value }))} className={QUARTERLY_SELECT_CLASS}>
                            {QUARTERLY_PERIOD_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notas</label>
                        <textarea value={periodForm.notes} onChange={(event) => setPeriodForm(prev => ({ ...prev, notes: event.target.value }))} rows={3} className={QUARTERLY_INPUT_CLASS} />
                    </div>

                    <button type="submit" disabled={actionLoading === 'create-period'} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700">
                        <Plus className="h-4 w-4" />
                        {actionLoading === 'create-period' ? 'Creando...' : 'Crear periodo'}
                    </button>
                </form>

                <div className="xl:col-span-8 space-y-5">
                    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/80 p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                            <select value={filters.client_id} onChange={(event) => setFilters(prev => ({ ...prev, client_id: event.target.value }))} className={QUARTERLY_SELECT_CLASS}>
                                <option value="">Todos los clientes</option>
                                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                            </select>
                            <select value={filters.status} onChange={(event) => setFilters(prev => ({ ...prev, status: event.target.value }))} className={QUARTERLY_SELECT_CLASS}>
                                <option value="">Todos los estados</option>
                                {QUARTERLY_PERIOD_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                            <input inputMode="numeric" value={filters.year} onChange={(event) => setFilters(prev => ({ ...prev, year: event.target.value }))} placeholder="Ano" className={QUARTERLY_INPUT_CLASS} />
                            <select value={filters.quarter} onChange={(event) => setFilters(prev => ({ ...prev, quarter: event.target.value }))} className={QUARTERLY_SELECT_CLASS}>
                                <option value="">Todos los trimestres</option>
                                {QUARTERLY_QUARTER_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/80 p-5">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white">Periodos trimestrales</h3>
                                <p className="text-xs font-semibold text-slate-500">{periods.length} resultados</p>
                            </div>
                            {periodsLoading && <div className="text-xs font-bold text-indigo-300">Cargando...</div>}
                        </div>

                        {periodsLoading ? (
                            <div className="py-14 text-center text-sm font-semibold text-slate-400">Cargando periodos trimestrales...</div>
                        ) : periods.length === 0 ? (
                            <div className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-10 text-center text-sm font-semibold text-slate-500">No hay periodos trimestrales creados.</div>
                        ) : (
                            <div className="mt-5 space-y-3">
                                {periods.map(period => (
                                    <button key={period.id} type="button" onClick={() => loadPeriodDetail(period.id)} className={'w-full rounded-xl border p-4 text-left transition-colors ' + (selectedPeriodId === period.id ? 'border-indigo-500/60 bg-indigo-500/10' : 'border-slate-700/60 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/70')}>
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="font-bold text-slate-100">{period.period_label || (period.year + ' T' + period.quarter)}</h4>
                                                    <span className={'rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ' + quarterlyPeriodStatusClass(period.status)}>{quarterlyOptionLabel(QUARTERLY_PERIOD_STATUS_OPTIONS, period.status)}</span>
                                                </div>
                                                <p className="mt-1 text-sm font-semibold text-slate-400">{period.client?.name || period.client_id}</p>
                                                <p className="mt-1 text-xs text-slate-500">Actualizado: {formatQuarterlyDateTime(period.updated_at)}</p>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-400 md:min-w-[260px]">
                                                <div className="rounded-lg border border-slate-700/60 bg-slate-950/50 px-2 py-2"><div className="text-slate-100">{period.summary?.expected_documents || 0}</div><div>Esperados</div></div>
                                                <div className="rounded-lg border border-slate-700/60 bg-slate-950/50 px-2 py-2"><div className="text-amber-300">{period.summary?.pending_expected_documents || 0}</div><div>Pendientes</div></div>
                                                <div className="rounded-lg border border-slate-700/60 bg-slate-950/50 px-2 py-2"><div className="text-blue-300">{period.summary?.received_expected_documents || 0}</div><div>Recibidos</div></div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/80 p-5">
                        <div className="flex items-center gap-2 border-b border-slate-700/60 pb-4">
                            <FileText className="h-4 w-4 text-indigo-300" />
                            <h3 className="text-lg font-bold text-white">Detalle de periodo</h3>
                        </div>

                        {detailLoading ? (
                            <div className="py-14 text-center text-sm font-semibold text-slate-400">Cargando detalle...</div>
                        ) : !selectedPeriod ? (
                            <div className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-10 text-center text-sm font-semibold text-slate-500">Selecciona un periodo para ver documentos esperados.</div>
                        ) : (
                            <div className="mt-5 space-y-6">
                                <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-4">
                                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <h4 className="text-lg font-bold text-white">{selectedPeriod.period_label || (selectedPeriod.year + ' T' + selectedPeriod.quarter)}</h4>
                                            <p className="text-sm font-semibold text-slate-400">{selectedPeriod.client?.name || selectedPeriod.client_id}</p>
                                            {selectedPeriod.notes && <p className="mt-2 text-sm leading-relaxed text-slate-500">{selectedPeriod.notes}</p>}
                                        </div>
                                        <span className={'inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ' + quarterlyPeriodStatusClass(selectedPeriod.status)}>{quarterlyOptionLabel(QUARTERLY_PERIOD_STATUS_OPTIONS, selectedPeriod.status)}</span>
                                    </div>
                                </div>
                                <section className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-4 space-y-4">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-indigo-300" />
                                            <h4 className="font-bold text-white">Documentos recibidos</h4>
                                        </div>
                                        <span className="rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-300">
                                            {(selectedPeriod.documents || []).length} registrados
                                        </span>
                                    </div>

                                    <form onSubmit={handleCreateReceivedDocument} className="space-y-4 rounded-xl border border-slate-700/60 bg-slate-950/40 p-4">
                                        <div className="flex items-center gap-2">
                                            <Plus className="h-4 w-4 text-indigo-300" />
                                            <h5 className="font-bold text-slate-100">Registrar documento recibido</h5>
                                        </div>
                                        {receivedDocumentNotice && (
                                            <div className={'rounded-xl border px-3 py-2 text-sm font-semibold ' + (receivedDocumentNotice.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200')}>
                                                {receivedDocumentNotice.text}
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Documento esperado</label>
                                                <select value={receivedDocumentForm.expected_document_id} onChange={(event) => handleReceivedDocumentExpectedChange(event.target.value)} className={QUARTERLY_SELECT_CLASS}>
                                                    <option value="">Sin asociar</option>
                                                    {(selectedPeriod.expected_documents || []).map(document => (
                                                        <option key={document.id} value={document.id}>{document.title}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tipo documental</label>
                                                <input value={receivedDocumentForm.document_type} onChange={(event) => setReceivedDocumentForm(prev => ({ ...prev, document_type: event.target.value }))} placeholder="Facturas recibidas" className={QUARTERLY_INPUT_CLASS} />
                                                <p className="mt-1.5 text-xs font-semibold text-slate-500">Puedes escribirlo normal, por ejemplo: Facturas recibidas.</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nombre de archivo / referencia</label>
                                                <input value={receivedDocumentForm.file_name} onChange={(event) => setReceivedDocumentForm(prev => ({ ...prev, file_name: event.target.value }))} className={QUARTERLY_INPUT_CLASS} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Fecha del documento</label>
                                                <input type="date" value={receivedDocumentForm.document_date} onChange={(event) => setReceivedDocumentForm(prev => ({ ...prev, document_date: event.target.value }))} className={QUARTERLY_INPUT_CLASS} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Proveedor o cliente</label>
                                                <input value={receivedDocumentForm.supplier_or_customer} onChange={(event) => setReceivedDocumentForm(prev => ({ ...prev, supplier_or_customer: event.target.value }))} className={QUARTERLY_INPUT_CLASS} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Estado de revision</label>
                                                <select value={receivedDocumentForm.review_status} onChange={(event) => setReceivedDocumentForm(prev => ({ ...prev, review_status: event.target.value }))} className={QUARTERLY_SELECT_CLASS}>
                                                    {QUARTERLY_RECEIVED_DOCUMENT_REVIEW_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notas internas</label>
                                                <textarea value={receivedDocumentForm.notes} onChange={(event) => setReceivedDocumentForm(prev => ({ ...prev, notes: event.target.value }))} rows={2} className={QUARTERLY_INPUT_CLASS} />
                                            </div>
                                        </div>
                                        <button type="submit" disabled={actionLoading === 'create-received-document'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700">
                                            <Plus className="h-4 w-4" />
                                            {actionLoading === 'create-received-document' ? 'Registrando...' : 'Registrar documento recibido'}
                                        </button>
                                    </form>

                                    <div className="space-y-3">
                                        {(selectedPeriod.documents || []).length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-8 text-center text-sm font-semibold text-slate-500">Sin documentos recibidos.</div>
                                        ) : (
                                            (selectedPeriod.documents || []).map(receivedDocument => {
                                                const receivedEdit = getReceivedDocumentEdit(receivedDocument);
                                                return (
                                                    <div key={receivedDocument.id} className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-4">
                                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <h5 className="font-bold text-slate-100 truncate">{receivedDocument.file_name || receivedDocument.document_type || 'Documento recibido'}</h5>
                                                                    <span className={'rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ' + quarterlyReceivedDocumentReviewStatusClass(receivedDocument.review_status)}>{quarterlyOptionLabel(QUARTERLY_RECEIVED_DOCUMENT_REVIEW_STATUS_OPTIONS, receivedDocument.review_status, 'Pendiente revision')}</span>
                                                                </div>
                                                                <p className="mt-1 text-xs font-semibold text-slate-500">{receivedDocument.document_type}</p>
                                                                {receivedDocument.supplier_or_customer && <p className="mt-1 text-xs text-slate-400">Proveedor o cliente: {receivedDocument.supplier_or_customer}</p>}
                                                                {receivedDocument.document_date && <p className="mt-1 text-xs text-slate-500">Fecha: {receivedDocument.document_date}</p>}
                                                                {receivedDocument.notes && <p className="mt-2 text-sm text-slate-400">{receivedDocument.notes}</p>}
                                                            </div>
                                                            <div className="w-full lg:w-[360px] space-y-2">
                                                                <select value={receivedEdit.review_status} onChange={(event) => setReceivedDocumentEdits(prev => {
                                                                    const draft = prev[receivedDocument.id] || { review_status: receivedDocument.review_status || 'pending_review', notes: receivedDocument.notes || '' };
                                                                    return { ...prev, [receivedDocument.id]: { ...draft, review_status: event.target.value } };
                                                                })} className={QUARTERLY_SELECT_CLASS}>
                                                                    {QUARTERLY_RECEIVED_DOCUMENT_REVIEW_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                                                </select>
                                                                <textarea value={receivedEdit.notes} onChange={(event) => setReceivedDocumentEdits(prev => {
                                                                    const draft = prev[receivedDocument.id] || { review_status: receivedDocument.review_status || 'pending_review', notes: receivedDocument.notes || '' };
                                                                    return { ...prev, [receivedDocument.id]: { ...draft, notes: event.target.value } };
                                                                })} rows={2} placeholder="Notas internas" className={QUARTERLY_INPUT_CLASS} />
                                                                <button type="button" onClick={() => handleUpdateReceivedDocument(receivedDocument)} disabled={actionLoading === `update-received-document-${receivedDocument.id}`} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-bold text-indigo-200 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60">
                                                                    <Save className="h-4 w-4" />
                                                                    {actionLoading === `update-received-document-${receivedDocument.id}` ? 'Guardando...' : 'Guardar revision'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </section>
                                <form onSubmit={handleCreateExpectedDocument} className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-4 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Plus className="h-4 w-4 text-indigo-300" />
                                        <h4 className="font-bold text-white">Nuevo documento esperado</h4>
                                    </div>
                                    {expectedDocumentNotice && (
                                        <div className={'rounded-xl border px-3 py-2 text-sm font-semibold ' + (expectedDocumentNotice.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200')}>
                                            {expectedDocumentNotice.text}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tipo documental</label>
                                            <input value={expectedDocumentForm.document_type} onChange={(event) => setExpectedDocumentForm(prev => ({ ...prev, document_type: event.target.value }))} placeholder="Facturas recibidas" className={QUARTERLY_INPUT_CLASS} />
                                            <p className="mt-1.5 text-xs font-semibold text-slate-500">Puedes escribirlo normal, por ejemplo: Facturas recibidas. Radar lo adapta internamente.</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Titulo</label>
                                            <input value={expectedDocumentForm.title} onChange={(event) => setExpectedDocumentForm(prev => ({ ...prev, title: event.target.value }))} className={QUARTERLY_INPUT_CLASS} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <select value={expectedDocumentForm.status} onChange={(event) => setExpectedDocumentForm(prev => ({ ...prev, status: event.target.value }))} className={QUARTERLY_SELECT_CLASS}>
                                            {QUARTERLY_EXPECTED_DOCUMENT_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                        </select>
                                        <input inputMode="numeric" value={expectedDocumentForm.sort_order} onChange={(event) => setExpectedDocumentForm(prev => ({ ...prev, sort_order: event.target.value }))} placeholder="Orden" className={QUARTERLY_INPUT_CLASS} />
                                        <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-bold text-slate-200">
                                            <input type="checkbox" checked={expectedDocumentForm.required} onChange={(event) => setExpectedDocumentForm(prev => ({ ...prev, required: event.target.checked }))} className="h-4 w-4 rounded border-slate-600 bg-slate-950" />
                                            Requerido
                                        </label>
                                    </div>
                                    <textarea value={expectedDocumentForm.description} onChange={(event) => setExpectedDocumentForm(prev => ({ ...prev, description: event.target.value }))} rows={3} placeholder="Descripcion interna" className={QUARTERLY_INPUT_CLASS} />
                                    <button type="submit" disabled={actionLoading === 'create-expected-document'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700">
                                        <Plus className="h-4 w-4" />
                                        {actionLoading === 'create-expected-document' ? 'Creando...' : 'Crear documento esperado'}
                                    </button>
                                </form>

                                <div className="space-y-3">
                                    <h4 className="font-bold text-white">Documentos esperados</h4>
                                    {(selectedPeriod.expected_documents || []).length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-8 text-center text-sm font-semibold text-slate-500">Este periodo aun no tiene documentos esperados.</div>
                                    ) : (
                                        (selectedPeriod.expected_documents || []).map(document => {
                                            const receivedForExpected = document.documents || [];
                                            return (
                                                <div key={document.id} className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-4">
                                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h5 className="font-bold text-slate-100">{document.title}</h5>
                                                                <span className={'rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ' + quarterlyExpectedDocumentStatusClass(document.status)}>{quarterlyOptionLabel(QUARTERLY_EXPECTED_DOCUMENT_STATUS_OPTIONS, document.status)}</span>
                                                                <span className="rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-300">Recibidos: {receivedForExpected.length}</span>
                                                            </div>
                                                            <p className="mt-1 text-xs font-semibold text-slate-500">{document.document_type}</p>
                                                            {document.description && <p className="mt-2 text-sm text-slate-400">{document.description}</p>}
                                                            <p className="mt-2 text-xs text-slate-500">{document.required ? 'Requerido' : 'Opcional'} - Orden {document.sort_order}</p>
                                                        </div>
                                                        <button type="button" onClick={() => setExpectedDocumentEdit(buildQuarterlyExpectedDocumentDraft(document))} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-bold text-slate-200 hover:border-indigo-500/60 hover:text-indigo-300">
                                                            <Save className="h-4 w-4" />
                                                            Editar
                                                        </button>
                                                    </div>
                                                    {receivedForExpected.length > 0 && (
                                                        <div className="mt-4 space-y-2 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                                                            {receivedForExpected.map(receivedDocument => (
                                                                <div key={receivedDocument.id} className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                                                                    <span className="text-slate-200">{receivedDocument.file_name || receivedDocument.document_type || 'Documento recibido'}</span>
                                                                    <span className="flex flex-wrap items-center gap-2">
                                                                        <span className={'rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ' + quarterlyReceivedDocumentReviewStatusClass(receivedDocument.review_status)}>{quarterlyOptionLabel(QUARTERLY_RECEIVED_DOCUMENT_REVIEW_STATUS_OPTIONS, receivedDocument.review_status, 'Pendiente revision')}</span>
                                                                        {receivedDocument.document_date && <span>{receivedDocument.document_date}</span>}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {expectedDocumentEdit && (
                                    <form onSubmit={handleUpdateExpectedDocument} className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-4">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <h4 className="font-bold text-emerald-100">Editar documento esperado</h4>
                                            <button type="button" onClick={() => setExpectedDocumentEdit(null)} className="text-xs font-bold text-emerald-200 hover:text-white">Cancelar</button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <input value={expectedDocumentEdit.document_type} onChange={(event) => setExpectedDocumentEdit(prev => ({ ...prev, document_type: event.target.value }))} className={QUARTERLY_INPUT_CLASS} />
                                            <input value={expectedDocumentEdit.title} onChange={(event) => setExpectedDocumentEdit(prev => ({ ...prev, title: event.target.value }))} className={QUARTERLY_INPUT_CLASS} />
                                        </div>
                                        <textarea value={expectedDocumentEdit.description} onChange={(event) => setExpectedDocumentEdit(prev => ({ ...prev, description: event.target.value }))} rows={2} className={QUARTERLY_INPUT_CLASS} />
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <select value={expectedDocumentEdit.status} onChange={(event) => setExpectedDocumentEdit(prev => ({ ...prev, status: event.target.value }))} className={QUARTERLY_SELECT_CLASS}>
                                                {QUARTERLY_EXPECTED_DOCUMENT_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                            </select>
                                            <input inputMode="numeric" value={expectedDocumentEdit.sort_order} onChange={(event) => setExpectedDocumentEdit(prev => ({ ...prev, sort_order: event.target.value }))} className={QUARTERLY_INPUT_CLASS} />
                                            <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-bold text-slate-200">
                                                <input type="checkbox" checked={Boolean(expectedDocumentEdit.required)} onChange={(event) => setExpectedDocumentEdit(prev => ({ ...prev, required: event.target.checked }))} className="h-4 w-4 rounded border-slate-600 bg-slate-950" />
                                                Requerido
                                            </label>
                                            <button type="submit" disabled={actionLoading === 'update-expected-document'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700">
                                                <Save className="h-4 w-4" />
                                                {actionLoading === 'update-expected-document' ? 'Guardando...' : 'Guardar'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatManagerClientCommunicationDate(value) {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

function formatManagerClientCommunicationSize(value) {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes < 0) return 'Sin tamano';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let size = bytes / 1024;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }
    return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: size >= 10 ? 0 : 1 }).format(size)} ${units[unitIndex]}`;
}

function formatManagerClientCommunicationToken(value, fallback = 'Sin dato') {
    if (value === null || value === undefined || value === '') return fallback;
    return String(value).replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function managerClientCommunicationStatusClass(status) {
    if (status === 'closed') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    if (status === 'pending_manager') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    if (status === 'pending_client') return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
    return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
}

function managerClientCommunicationPriorityClass(priority) {
    if (priority === 'urgent' || priority === 'high') return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
    if (priority === 'low') return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
    return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300';
}

function ManagerClientCommunicationsPanel() {
    const [threads, setThreads] = useState([]);
    const [selectedThreadId, setSelectedThreadId] = useState('');
    const [threadDetail, setThreadDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState('');
    const [detailError, setDetailError] = useState('');
    const [replyMessage, setReplyMessage] = useState('');
    const [replySubmitting, setReplySubmitting] = useState(false);
    const [replyError, setReplyError] = useState('');
    const [replySuccess, setReplySuccess] = useState('');

    const buildErrorMessage = async (response, fallback) => {
        let data = null;
        try {
            data = await response.json();
        } catch {}
        if (response.status === 404) return 'La funcionalidad de comunicaciones todavía no esta activa.';
        if (response.status === 401 || response.status === 403) return 'Sesion de gestor requerida.';
        return data?.message || fallback;
    };

    const loadThreadDetail = async (threadId) => {
        if (!threadId) return;
        setSelectedThreadId(threadId);
        setThreadDetail(null);
        setDetailError('');
        setReplyMessage('');
        setReplyError('');
        setReplySuccess('');
        setDetailLoading(true);
        try {
            const response = await fetch(`/api/manager/client-communications/${encodeURIComponent(threadId)}`, { credentials: 'same-origin' });
            if (!response.ok) throw new Error(await buildErrorMessage(response, 'No se pudo cargar la comunicacion seleccionada.'));
            const data = await response.json();
            if (data.status !== 'success' || !data.thread) throw new Error(data.message || 'No se pudo cargar la comunicacion seleccionada.');
            setThreadDetail(data.thread);
        } catch (err) {
            setDetailError(err.message || 'No se pudo cargar la comunicacion seleccionada.');
        } finally {
            setDetailLoading(false);
        }
    };

    const loadThreads = async (options = {}) => {
        const showLoading = options.showLoading !== false;
        const preserveOnError = options.preserveOnError === true;

        if (showLoading) setLoading(true);
        if (!preserveOnError) setError('');
        try {
            const response = await fetch('/api/manager/client-communications', { credentials: 'same-origin' });
            if (!response.ok) throw new Error(await buildErrorMessage(response, 'No se pudieron cargar las comunicaciones de clientes.'));
            const data = await response.json();
            if (data.status !== 'success' || !Array.isArray(data.threads)) throw new Error(data.message || 'No se pudieron cargar las comunicaciones de clientes.');
            setThreads(data.threads);
            if (selectedThreadId && !data.threads.some(thread => String(thread.id) === String(selectedThreadId))) {
                setSelectedThreadId('');
                setThreadDetail(null);
                setDetailError('');
                setReplyMessage('');
                setReplyError('');
                setReplySuccess('');
            }
        } catch (err) {
            if (preserveOnError) {
                throw err;
            }
            setThreads([]);
            setSelectedThreadId('');
            setThreadDetail(null);
            setDetailError('');
            setReplyMessage('');
            setReplyError('');
            setReplySuccess('');
            setError(err.message || 'No se pudieron cargar las comunicaciones de clientes.');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleSubmitReply = async (event) => {
        event.preventDefault();

        const message = replyMessage.trim();
        if (!threadDetail?.id || !message) return;

        setReplySubmitting(true);
        setReplyError('');
        setReplySuccess('');

        try {
            const response = await fetch(`/api/manager/client-communications/${encodeURIComponent(threadDetail.id)}/events`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, event_type: 'message' })
            });

            if (!response.ok) {
                throw new Error(await buildErrorMessage(response, 'No se pudo enviar la respuesta.'));
            }

            const data = await response.json();
            if (data.status !== 'success' || !data.thread) {
                throw new Error(data.message || 'No se pudo enviar la respuesta.');
            }

            setThreadDetail(data.thread);
            setReplyMessage('');
            setReplySuccess('Respuesta enviada correctamente.');

            try {
                await loadThreads({ showLoading: false, preserveOnError: true });
            } catch {}
        } catch (err) {
            setReplyError(err.message || 'No se pudo enviar la respuesta.');
        } finally {
            setReplySubmitting(false);
        }
    };

    useEffect(() => {
        loadThreads();
    }, []);

    const detailEvents = Array.isArray(threadDetail?.events) ? threadDetail.events : [];
    const detailDocumentItems = Array.isArray(threadDetail?.document_items) ? threadDetail.document_items : [];

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-white">Comunicaciones de clientes</h2>
                        <p className="mt-2 text-sm font-semibold text-slate-400">Hilos y mensajes enviados desde el Portal Cliente.</p>
                    </div>
                    <button type="button" onClick={loadThreads} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-bold text-slate-200 hover:border-indigo-500/60 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-60">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>
                {error && <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">{error}</div>}
                {loading && <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-8 text-center text-sm font-semibold text-slate-400">Cargando comunicaciones...</div>}
                {!loading && !error && threads.length === 0 && <div className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-10 text-center text-sm font-semibold text-slate-500">No hay comunicaciones de clientes registradas.</div>}
            </div>

            {!loading && !error && threads.length > 0 && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    <div className="space-y-3">
                        {threads.map(thread => {
                            const active = String(selectedThreadId) === String(thread.id);
                            return (
                                <button key={thread.id} type="button" onClick={() => loadThreadDetail(thread.id)} className={`w-full rounded-2xl border p-4 text-left transition-colors ${active ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-900/70 hover:border-slate-600'}`}>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <h3 className="truncate text-base font-black text-white">{thread.subject || 'Sin asunto'}</h3>
                                            <p className="mt-1 text-xs font-semibold text-slate-500">Cliente: {thread.client_id || 'Sin cliente'}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${managerClientCommunicationStatusClass(thread.status)}`}>{formatManagerClientCommunicationToken(thread.status, 'Sin estado')}</span>
                                            <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${managerClientCommunicationPriorityClass(thread.priority)}`}>{formatManagerClientCommunicationToken(thread.priority, 'Sin prioridad')}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-1 gap-3 text-xs font-semibold text-slate-400 sm:grid-cols-2">
                                        <div><span className="block text-slate-500">Categoria</span><span className="text-slate-200">{formatManagerClientCommunicationToken(thread.category, 'Sin categoria')}</span></div>
                                        <div><span className="block text-slate-500">Ultima actividad</span><span className="text-slate-200">{formatManagerClientCommunicationDate(thread.last_event_at || thread.updated_at)}</span></div>
                                        <div><span className="block text-slate-500">Mensajes</span><span className="text-slate-200">{Number(thread.events_count || 0)}</span></div>
                                        <div><span className="block text-slate-500">Documentos</span><span className="text-slate-200">{Number(thread.document_items_count || 0)}</span></div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                        {!selectedThreadId && <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-10 text-center text-sm font-semibold text-slate-500">Selecciona una comunicacion para ver su detalle.</div>}
                        {detailLoading && <div className="rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-10 text-center text-sm font-semibold text-slate-400">Cargando detalle...</div>}
                        {!detailLoading && detailError && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">{detailError}</div>}
                        {!detailLoading && !detailError && threadDetail && (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div><h3 className="text-xl font-black text-white">{threadDetail.subject || 'Sin asunto'}</h3><p className="mt-1 text-sm font-semibold text-slate-500">Cliente: {threadDetail.client_id || 'Sin cliente'}</p></div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${managerClientCommunicationStatusClass(threadDetail.status)}`}>{formatManagerClientCommunicationToken(threadDetail.status, 'Sin estado')}</span>
                                            <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${managerClientCommunicationPriorityClass(threadDetail.priority)}`}>{formatManagerClientCommunicationToken(threadDetail.priority, 'Sin prioridad')}</span>
                                        </div>
                                    </div>
                                    <div className="mt-5 grid grid-cols-1 gap-3 text-sm font-semibold text-slate-400 md:grid-cols-2">
                                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"><span className="block text-xs text-slate-500">Categoria</span><span className="text-slate-200">{formatManagerClientCommunicationToken(threadDetail.category, 'Sin categoria')}</span></div>
                                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"><span className="block text-xs text-slate-500">Creada</span><span className="text-slate-200">{formatManagerClientCommunicationDate(threadDetail.created_at)}</span></div>
                                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"><span className="block text-xs text-slate-500">Actualizada</span><span className="text-slate-200">{formatManagerClientCommunicationDate(threadDetail.updated_at)}</span></div>
                                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"><span className="block text-xs text-slate-500">Ultima actividad</span><span className="text-slate-200">{formatManagerClientCommunicationDate(threadDetail.last_event_at)}</span></div>
                                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"><span className="block text-xs text-slate-500">Periodo relacionado</span><span className="text-slate-200">{threadDetail.related_period_id || 'Sin periodo'}</span></div>
                                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"><span className="block text-xs text-slate-500">Documento esperado relacionado</span><span className="text-slate-200">{threadDetail.related_expected_document_id || 'Sin documento'}</span></div>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmitReply} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Responder al cliente</h4>
                                        <p className="mt-1 text-sm font-semibold text-slate-500">La respuesta quedara registrada en el hilo.</p>
                                    </div>
                                    <textarea
                                        value={replyMessage}
                                        onChange={(event) => {
                                            setReplyMessage(event.target.value);
                                            if (replyError) setReplyError('');
                                            if (replySuccess) setReplySuccess('');
                                        }}
                                        disabled={replySubmitting || !threadDetail?.id}
                                        rows={4}
                                        placeholder="Escribe la respuesta para el cliente..."
                                        className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                    {replyError && <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">{replyError}</div>}
                                    {replySuccess && <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">{replySuccess}</div>}
                                    <div className="mt-4 flex justify-end">
                                        <button type="submit" disabled={replySubmitting || !threadDetail?.id || !replyMessage.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
                                            <CheckCircle2 className="h-4 w-4" />
                                            {replySubmitting ? 'Enviando...' : 'Enviar respuesta'}
                                        </button>
                                    </div>
                                </form>

                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Mensajes</h4>
                                    {detailEvents.length === 0 ? <div className="mt-3 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-8 text-center text-sm font-semibold text-slate-500">No hay mensajes registrados.</div> : (
                                        <div className="mt-3 space-y-3">
                                            {detailEvents.map(event => <div key={event.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-300">{formatManagerClientCommunicationToken(event.actor_type, 'Sin actor')}</span><span className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-300">{formatManagerClientCommunicationToken(event.event_type, 'Sin tipo')}</span></div><span className="text-xs font-semibold text-slate-500">{formatManagerClientCommunicationDate(event.created_at)}</span></div>{event.body && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{event.body}</p>}</div>)}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Documentos</h4>
                                    {detailDocumentItems.length === 0 ? <div className="mt-3 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-8 text-center text-sm font-semibold text-slate-500">No hay documentos asociados.</div> : (
                                        <div className="mt-3 space-y-3">
                                            {detailDocumentItems.map(item => <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 gap-3"><FileText className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" /><div className="min-w-0"><h5 className="truncate font-black text-white">{item.title || 'Documento sin titulo'}</h5><p className="mt-1 text-xs font-semibold text-slate-500">{formatManagerClientCommunicationToken(item.document_type, 'Sin tipo')}</p></div></div><span className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-300">{formatManagerClientCommunicationToken(item.review_status, 'Sin revision')}</span></div><div className="mt-4 grid grid-cols-1 gap-3 text-xs font-semibold text-slate-400 sm:grid-cols-2"><div><span className="block text-slate-500">Archivo</span><span className="break-words text-slate-200">{item.original_filename || 'Sin archivo'}</span></div><div><span className="block text-slate-500">Tamano</span><span className="text-slate-200">{formatManagerClientCommunicationSize(item.file_size)}</span></div><div><span className="block text-slate-500">Fecha documento</span><span className="text-slate-200">{item.document_date || 'Sin fecha'}</span></div><div><span className="block text-slate-500">Proveedor o cliente</span><span className="text-slate-200">{item.supplier_or_customer || 'Sin dato'}</span></div></div></div>)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
function CommercialDashboardPanel() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        client_id: 'all',
        status: 'all',
        request_type: 'all',
        priority: 'all'
    });
    const [commercialStatusLoadingId, setCommercialStatusLoadingId] = useState(null);
    const [commercialNotice, setCommercialNotice] = useState(null);

    const loadDashboard = async (options = {}) => {
        const showLoading = options.showLoading !== false;
        const silent = options.silent === true;

        if (showLoading) setLoading(true);
        if (!silent) setError(null);

        try {
            const res = await fetch('/api/manager/commercial-dashboard');
            const data = await res.json();

            if (!res.ok || data.status !== 'ok') {
                throw new Error(data.message || 'No se ha podido cargar la vista comercial.');
            }

            setDashboard(data);
            return data;
        } catch (err) {
            const message = err.message || 'Error al cargar la vista comercial.';

            if (!silent) {
                setError(message);
            }

            throw new Error(message);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard().catch(() => {});
    }, []);

    const formatDateTime = (value) => {
        if (!value) return 'Sin fecha';

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleString('es-ES', {
            dateStyle: 'short',
            timeStyle: 'short'
        });
    };

    const statusLabel = (status) => {
        if (status === 'pending_contact') return 'Pendiente contacto';
        if (status === 'contacted') return 'Contactada';
        if (status === 'handled') return 'Gestionada';
        if (status === 'dismissed') return 'Descartada';
        return status || 'Sin estado';
    };

    const statusClass = (status) => {
        if (status === 'handled') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
        if (status === 'contacted') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
        if (status === 'dismissed') return 'border-rose-500/30 bg-rose-500/10 text-rose-400';
        if (status === 'pending_contact') return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
        return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
    };

    const priorityLabel = (priority) => {
        if (priority === 'high') return 'Alta';
        if (priority === 'urgent') return 'Urgente';
        if (priority === 'low') return 'Baja';
        if (priority === 'normal') return 'Normal';
        return priority || 'Sin prioridad';
    };

    const priorityClass = (priority) => {
        if (priority === 'urgent' || priority === 'high') return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
        if (priority === 'low') return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
        return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300';
    };

    const labelFromKey = (value) => {
        if (!value) return 'Sin tipo';

        return String(value)
            .replace(/_/g, ' ')
            .replace(/\b\w/g, letter => letter.toUpperCase());
    };

    const isTechnicalCommercialNote = (value) => {
        const text = String(value || '').trim().toLowerCase();

        if (!text) return false;

        const technicalPatterns = [
            'validación automática',
            'validacion automatica',
            'cambio a handled',
            'cambio a contacted',
            'cambio a dismissed',
            'cliente marcado como contactado desde vista comercial',
            'solicitud marcada como gestionada desde vista comercial',
            'solicitud descartada desde vista comercial',
            'cliente marcado como contactado desde panel gestor',
            'solicitud marcada como gestionada desde panel gestor'
        ];

        return technicalPatterns.some(pattern => text.includes(pattern));
    };

    const displayCommercialNote = (value) => {
        if (!value || isTechnicalCommercialNote(value)) {
            return 'Sin nota comercial registrada.';
        }

        return value;
    };

    const updateCommercialRequestStatus = async (requestId, requestStatus) => {
        const allowedTargetStatuses = ['contacted', 'handled', 'dismissed'];
        const currentRequest = (dashboard?.requests || []).find(req => req.id === requestId);
        const actionableStatuses = ['pending_contact', 'contacted'];

        if (!requestId || !allowedTargetStatuses.includes(requestStatus)) return;

        if (!currentRequest || !actionableStatuses.includes(currentRequest.request_status)) {
            setCommercialNotice({
                type: 'error',
                text: 'Esta solicitud no admite acciones desde la Vista Comercial.'
            });
            return;
        }

        const internalNotesByStatus = {
            contacted: 'Cliente marcado como contactado desde Vista Comercial.',
            handled: 'Solicitud marcada como gestionada desde Vista Comercial.',
            dismissed: 'Solicitud descartada desde Vista Comercial.'
        };

        setCommercialStatusLoadingId(requestId);
        setCommercialNotice(null);

        try {
            const res = await fetch(`/api/manager/interest-requests/${requestId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    request_status: requestStatus,
                    handled_by: 'gestor_demo',
                    internal_notes: internalNotesByStatus[requestStatus]
                })
            });

            const data = await res.json();

            if (!res.ok || data.status !== 'ok') {
                throw new Error(data.message || 'No se ha podido actualizar la solicitud.');
            }

            await loadDashboard({ showLoading: false, silent: true });

            setCommercialNotice({
                type: 'success',
                text: 'Solicitud actualizada correctamente.'
            });
        } catch (err) {
            setCommercialNotice({
                type: 'error',
                text: err.message || 'Error al actualizar la solicitud.'
            });
        } finally {
            setCommercialStatusLoadingId(null);
        }
    };

    const renderCommercialRequestActions = (req) => {
        const isUpdating = commercialStatusLoadingId === req.id;
        const isPendingContact = req.request_status === 'pending_contact';
        const isContacted = req.request_status === 'contacted';

        if (!isPendingContact && !isContacted) {
            return (
                <span className="text-xs font-semibold text-slate-500">
                    {statusLabel(req.request_status)}
                </span>
            );
        }

        return (
            <div className="flex flex-col gap-2 min-w-[160px]">
                {isUpdating && (
                    <div className="text-xs font-bold text-indigo-300">Actualizando...</div>
                )}

                {isPendingContact && (
                    <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => updateCommercialRequestStatus(req.id, 'contacted')}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-xs font-bold"
                    >
                        Contactada
                    </button>
                )}

                <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => updateCommercialRequestStatus(req.id, 'handled')}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-xs font-bold"
                >
                    Gestionada
                </button>

                <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => updateCommercialRequestStatus(req.id, 'dismissed')}
                    className="bg-rose-600/90 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-xs font-bold"
                >
                    Descartar
                </button>
            </div>
        );
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24 text-slate-400">
            <div className="animate-pulse flex flex-col items-center gap-6">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-semibold tracking-wide text-lg">Cargando vista comercial...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="bg-red-950/40 text-red-400 p-6 rounded-2xl border border-red-500/20 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h3 className="font-bold text-lg mb-1 text-red-300">Error al cargar vista comercial</h3>
                    <p className="text-sm opacity-90">{error}</p>
                </div>
                <button
                    type="button"
                    onClick={loadDashboard}
                    className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg px-4 py-2 text-sm font-bold"
                >
                    Reintentar
                </button>
            </div>
        </div>
    );

        const asArray = (value) => Array.isArray(value) ? value : [];
    const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};

    const counts = asObject(dashboard?.counts);
    const clients = asArray(dashboard?.clients);
    const requests = asArray(dashboard?.requests);
    const filterOptions = asObject(dashboard?.filters);

    const filterClientOptionsRaw = asArray(filterOptions.clients);
    const filterClientOptions = filterClientOptionsRaw.length > 0
        ? filterClientOptionsRaw
        : clients.map(client => ({
            client_id: client.client_id,
            client_name: client.client_name || client.client_id || 'Cliente sin nombre'
        }));

    const filterStatusOptions = asArray(filterOptions.statuses || filterOptions.request_statuses);
    const filterRequestTypeOptions = asArray(filterOptions.request_types);
    const filterPriorityOptions = asArray(filterOptions.priorities);

    const filteredRequests = dedupeRequestsForDisplay(requests.filter(req => {
        if (filters.client_id !== 'all' && req.client_id !== filters.client_id) return false;
        if (filters.status !== 'all' && req.request_status !== filters.status) return false;
        if (filters.request_type !== 'all' && req.request_type !== filters.request_type) return false;
        if (filters.priority !== 'all' && req.priority !== filters.priority) return false;
        return true;
    }));

    const requestFilterActive = filters.status !== 'all' || filters.request_type !== 'all' || filters.priority !== 'all';
    const filteredRequestClientIds = new Set(filteredRequests.map(req => req.client_id));
    const filteredClients = clients.filter(client => {
        if (filters.client_id !== 'all' && client.client_id !== filters.client_id) return false;
        if (requestFilterActive && !filteredRequestClientIds.has(client.client_id)) return false;
        return true;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-white">Seguimiento Comercial</h2>
                    <p className="text-slate-400 text-sm mt-1">Seguimiento comercial de clientes, solicitudes y oportunidades.</p>
                </div>
                <button
                    type="button"
                    onClick={loadDashboard}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-bold"
                >
                    Actualizar
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
                {/* COMMERCIAL_TOP_CARD_CLIENTS_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => {
                        setFilters(current => ({ ...current, client_id: 'all', status: 'all', request_type: 'all', priority: 'all' })); setTimeout(() => document.getElementById('comercial-clientes')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
                    }}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver clientes"
                >
                    <MetricCard title="Clientes" value={counts.clients_total ?? 0} color="text-white" border="border-slate-700/60" bg="bg-slate-800/80" />
                </button>
                {/* COMMERCIAL_TOP_CARD_PACKAGES_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => {
                        setFilters(current => ({ ...current, client_id: 'all', status: 'all', request_type: 'all', priority: 'all' })); setTimeout(() => document.getElementById('comercial-clientes')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
                    }}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver paquetes publicados"
                >
                    <MetricCard title="Paquetes publicados" value={counts.packages_published ?? 0} color="text-indigo-400" border="border-indigo-500/20" bg="bg-indigo-950/20" />
                </button>
                {/* COMMERCIAL_TOP_CARD_REQUESTS_TOTAL_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => {
                        setFilters(current => ({ ...current, status: 'all' })); document.getElementById('comercial-solicitudes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver solicitudes totales"
                >
                    <MetricCard title="Solicitudes totales" value={counts.interest_requests_total ?? 0} color="text-blue-400" border="border-blue-500/20" bg="bg-blue-950/20" />
                </button>
                {/* COMMERCIAL_TOP_CARD_PENDING_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => {
                        setFilters(current => ({ ...current, status: 'pending_contact' })); document.getElementById('comercial-solicitudes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver solicitudes pendientes"
                >
                    <MetricCard title="Pendientes" value={counts.pending_contact ?? 0} color="text-amber-400" border="border-amber-500/20" bg="bg-amber-950/20" />
                </button>
                {/* COMMERCIAL_TOP_CARD_HANDLED_CLICK_V1 */}
                <button
                    type="button"
                    onClick={() => {
                        setFilters(current => ({ ...current, status: 'handled' })); document.getElementById('comercial-solicitudes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="block w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    title="Ver solicitudes gestionadas"
                >
                    <MetricCard title="Gestionadas" value={counts.handled ?? 0} color="text-emerald-400" border="border-emerald-500/20" bg="bg-emerald-950/20" />
                </button>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Cliente</label>
                        <select
                            value={filters.client_id}
                            onChange={e => setFilters(current => ({ ...current, client_id: e.target.value }))}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                        >
                            <option value="all">Todos los clientes</option>
                            {filterClientOptions.map(client => (
                                <option key={textFromValue(client.client_id || client)} value={textFromValue(client.client_id || client)}>{textFromValue(client.client_name ?? client.label ?? client.name ?? client.client_id ?? client, 'Cliente sin nombre')}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Estado</label>
                        <select
                            value={filters.status}
                            onChange={e => setFilters(current => ({ ...current, status: e.target.value }))}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                        >
                            <option value="all">Todos los estados</option>
                            {filterStatusOptions.map(status => (
                                <option key={textFromValue(status)} value={textFromValue(status)}>{statusLabel(textFromValue(status))}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tipo</label>
                        <select
                            value={filters.request_type}
                            onChange={e => setFilters(current => ({ ...current, request_type: e.target.value }))}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                        >
                            <option value="all">Todos los tipos</option>
                            {filterRequestTypeOptions.map(type => {
                                const typeValue = requestTextFromValue(type?.value ?? type?.key ?? type?.request_type ?? type, '');
                                const typeLabel = requestTextFromValue(type?.label ?? type?.name ?? type?.title ?? type?.value ?? type?.key ?? type?.request_type ?? type, typeValue);
                                return (
                                    <option key={typeValue} value={typeValue}>{labelFromKey(typeLabel)}</option>
                                );
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Prioridad</label>
                        <select
                            value={filters.priority}
                            onChange={e => setFilters(current => ({ ...current, priority: e.target.value }))}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                        >
                            <option value="all">Todas las prioridades</option>
                            {filterPriorityOptions.map(priority => (
                                <option key={textFromValue(priority)} value={textFromValue(priority)}>{priorityLabel(textFromValue(priority))}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4 mb-5">
                    {/* COMMERCIAL_TOP_METRIC_TARGET_CLIENTS_V1 */}
            <div id="comercial-clientes" className="scroll-mt-28" />
            <h3 className="text-lg font-bold text-white">Clientes</h3>
                    <span className="text-sm text-slate-500 font-medium">{filteredClients.length} resultados</span>
                </div>

                <div className="lg:hidden space-y-3">
                    {filteredClients.length === 0 ? (
                        <div className="text-sm text-slate-500 bg-slate-900/40 border border-dashed border-slate-700/60 rounded-xl p-5">
                            No hay clientes con los filtros seleccionados.
                        </div>
                    ) : (
                        filteredClients.map(client => (
                            <div key={client.client_id} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div>
                                        <h4 className="font-bold text-slate-100">{textFromValue(client.client_name ?? client.client_id, 'Cliente sin nombre')}</h4>
                                        <p className="text-xs font-semibold text-slate-500 mt-1">{labelFromKey(client.sector_key || client.sector_name || client.sector || 'Sin sector')}</p>
                                    </div>
                                    <span className="rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1 text-xs font-bold text-slate-300">
                                        {client.packages_published} publicados
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Items</div>
                                        <div className="mt-1 font-bold text-slate-200">{client.total_package_items}</div>
                                    </div>
                                    <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Solicitudes</div>
                                        <div className="mt-1 font-bold text-slate-200">{client.interest_requests_total}</div>
                                    </div>
                                    <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Pendientes</div>
                                        <div className="mt-1 font-bold text-amber-300">{client.pending_contact}</div>
                                    </div>
                                    <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Gestionadas</div>
                                        <div className="mt-1 font-bold text-emerald-300">{client.handled}</div>
                                    </div>
                                </div>

                                <div className="mt-4 space-y-3 text-sm">
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Ášltima actualización</div>
                                        <div className="mt-1 text-slate-300">{formatDateTime(client.last_request_update)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Próxima acción</div>
                                        <div className="mt-1 font-semibold text-slate-200">{client.next_action_recommended}</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-widest text-slate-500 border-b border-slate-700/60">
                                <th className="py-3 pr-4 font-bold">Cliente</th>
                                <th className="py-3 pr-4 font-bold">Sector</th>
                                <th className="py-3 pr-4 font-bold">Paquetes publicados</th>
                                <th className="py-3 pr-4 font-bold">Items</th>
                                <th className="py-3 pr-4 font-bold">Solicitudes</th>
                                <th className="py-3 pr-4 font-bold">Pendientes</th>
                                <th className="py-3 pr-4 font-bold">Gestionadas</th>
                                <th className="py-3 pr-4 font-bold">Ášltima actualización</th>
                                <th className="py-3 font-bold">Próxima acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                            {filteredClients.map(client => (
                                <tr key={client.client_id} className="text-slate-300">
                                    <td className="py-4 pr-4 font-bold text-slate-100 whitespace-nowrap">{textFromValue(client.client_name ?? client.client_id, 'Cliente sin nombre')}</td>
                                    <td className="py-4 pr-4 text-slate-400 whitespace-nowrap">{labelFromKey(client.sector_key || client.sector_name || client.sector || 'Sin sector')}</td>
                                    <td className="py-4 pr-4 font-semibold">{client.packages_published}</td>
                                    <td className="py-4 pr-4">{client.total_package_items}</td>
                                    <td className="py-4 pr-4">{client.interest_requests_total}</td>
                                    <td className="py-4 pr-4 text-amber-300 font-semibold">{client.pending_contact}</td>
                                    <td className="py-4 pr-4 text-emerald-300 font-semibold">{client.handled}</td>
                                    <td className="py-4 pr-4 text-slate-400 whitespace-nowrap">{formatDateTime(client.last_request_update)}</td>
                                    <td className="py-4 font-semibold text-slate-200 whitespace-nowrap">{client.next_action_recommended}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4 mb-5">
                    {/* COMMERCIAL_TOP_METRIC_TARGET_REQUESTS_V1 */}
                    <div id="comercial-solicitudes" className="scroll-mt-28" />
                    <h3 className="text-lg font-bold text-white">Solicitudes comerciales</h3>
                    <span className="text-sm text-slate-500 font-medium">{filteredRequests.length} resultados</span>
                </div>

                {filteredRequests.length === 0 ? (
                    <div className="text-sm text-slate-500 bg-slate-900/40 border border-dashed border-slate-700/60 rounded-xl p-5">
                        No hay solicitudes con los filtros seleccionados.
                    </div>
                ) : (
                    <>
                        <div className="lg:hidden space-y-3">
                            {filteredRequests.map(req => (
                                <div key={req.id} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div>
                                            <h4 className="font-bold text-slate-100">{textFromValue(req.client_name ?? req.client_id, 'Cliente sin nombre')}</h4>
                                            <p className="text-xs font-semibold text-slate-500 mt-1">{labelFromKey(req.request_type)}</p>
                                        </div>
                                        <span className={`inline-flex rounded-lg border px-2 py-1 text-xs font-bold ${priorityClass(req.priority)}`}>
                                            {priorityLabel(req.priority)}
                                        </span>
                                    </div>

                                    <div className="space-y-4 text-sm">
                                        <div>
                                            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Oportunidad</div>
                                            <div className="mt-1 font-semibold text-slate-100">{textFromValue(req.title, 'Sin título')}</div>
                                            {req.message && !isTechnicalInternalText(req.message) && <div className="text-xs text-slate-500 mt-2">{displayClientVisibleRequestMessage(req.message)}</div>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                                                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Tipo</div>
                                                <div className="mt-1 font-semibold text-slate-200">{labelFromKey(req.request_type)}</div>
                                            </div>
                                            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                                                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Estado</div>
                                                <span className={`mt-1 inline-flex rounded-lg border px-2 py-1 text-xs font-bold ${statusClass(req.request_status)}`}>
                                                    {statusLabel(req.request_status)}
                                                </span>
                                            </div>
                                            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                                                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Prioridad</div>
                                                <span className={`mt-1 inline-flex rounded-lg border px-2 py-1 text-xs font-bold ${priorityClass(req.priority)}`}>
                                                    {priorityLabel(req.priority)}
                                                </span>
                                            </div>
                                            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                                                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Fecha</div>
                                                <div className="mt-1 font-semibold text-slate-300">{formatDateTime(req.updated_at || req.created_at)}</div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Próxima acción</div>
                                            <div className="mt-1 font-semibold text-slate-200">{req.next_action_recommended}</div>
                                        </div>

                                        <div>
                                            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Nota interna</div>
                                            <div className="mt-1 text-slate-400">{displayCommercialNote(req.internal_notes)}</div>
                                        </div>

                                        <div className="pt-1">
                                            <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Acciones</div>
                                            {renderCommercialRequestActions(req)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden lg:block overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs uppercase tracking-widest text-slate-500 border-b border-slate-700/60">
                                        <th className="py-3 pr-4 font-bold">Cliente</th>
                                        <th className="py-3 pr-4 font-bold">Oportunidad</th>
                                        <th className="py-3 pr-4 font-bold">Tipo</th>
                                        <th className="py-3 pr-4 font-bold">Estado</th>
                                        <th className="py-3 pr-4 font-bold">Prioridad</th>
                                        <th className="py-3 pr-4 font-bold">Fecha</th>
                                        <th className="py-3 pr-4 font-bold">Próxima acción</th>
                                        <th className="py-3 pr-4 font-bold">Nota interna</th>
                                        <th className="py-3 font-bold">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/80">
                                    {filteredRequests.map(req => (
                                        <tr key={req.id} className="text-slate-300 align-top">
                                            <td className="py-4 pr-4 font-bold text-slate-100 whitespace-nowrap">{textFromValue(req.client_name ?? req.client_id, 'Cliente sin nombre')}</td>
                                            <td className="py-4 pr-4 min-w-[280px]">
                                                <div className="font-semibold text-slate-100">{textFromValue(req.title, 'Sin título')}</div>
                                                {req.message && !isTechnicalInternalText(req.message) && <div className="text-xs text-slate-500 mt-1">{displayClientVisibleRequestMessage(req.message)}</div>}
                                            </td>
                                            <td className="py-4 pr-4 whitespace-nowrap">{labelFromKey(req.request_type)}</td>
                                            <td className="py-4 pr-4 whitespace-nowrap">
                                                <span className={`inline-flex rounded-lg border px-2 py-1 text-xs font-bold ${statusClass(req.request_status)}`}>
                                                    {statusLabel(req.request_status)}
                                                </span>
                                            </td>
                                            <td className="py-4 pr-4 whitespace-nowrap">
                                                <span className={`inline-flex rounded-lg border px-2 py-1 text-xs font-bold ${priorityClass(req.priority)}`}>
                                                    {priorityLabel(req.priority)}
                                                </span>
                                            </td>
                                            <td className="py-4 pr-4 text-slate-400 whitespace-nowrap">{formatDateTime(req.updated_at || req.created_at)}</td>
                                            <td className="py-4 pr-4 font-semibold text-slate-200 whitespace-nowrap">{req.next_action_recommended}</td>
                                            <td className="py-4 pr-4 text-slate-400 min-w-[220px]">{displayCommercialNote(req.internal_notes)}</td>
                                            <td className="py-4">{renderCommercialRequestActions(req)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}




function formatPortalClientDisplayName(clientId) {
    return formatConfiguredClientName(clientId);
}

function ClientPortalAuthGate({ clientId, onAuthenticated }) {
    const [mode, setMode] = useState('login');
    const [phone, setPhone] = useState('');
    const [accessKey, setAccessKey] = useState('');
    const [accessKeyRepeat, setAccessKeyRepeat] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const resetMessages = () => {
        setError('');
        setNotice('');
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        resetMessages();

        if (!accessKey.trim()) {
            setError('Introduce tu clave de acceso.');
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch('/api/client-portal/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    client_id: clientId,
                    access_key: accessKey
                })
            });

            const data = await response.json();

            if (!response.ok || data.authenticated !== true) {
                setError(data.message || 'No se ha podido validar la clave.');
                return;
            }

            onAuthenticated();
        } catch {
            setError('No se ha podido conectar con el servidor de acceso.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSetup = async (event) => {
        event.preventDefault();
        resetMessages();

        if (!phone.trim()) {
            setError('Introduce el teléfono autorizado.');
            return;
        }

        if (!accessKey.trim() || accessKey.length < 6) {
            setError('La clave debe tener al menos 6 caracteres.');
            return;
        }

        if (accessKey !== accessKeyRepeat) {
            setError('Las claves no coinciden.');
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch('/api/client-portal/auth/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    client_id: clientId,
                    phone,
                    access_key: accessKey
                })
            });

            const data = await response.json();

            if (!response.ok || data.authenticated !== true) {
                setError(data.message || 'No se ha podido crear o regenerar la clave.');
                return;
            }

            setNotice('Clave configurada correctamente.');
            onAuthenticated();
        } catch {
            setError('No se ha podido conectar con el servidor de acceso.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="mx-auto max-w-lg rounded-3xl border border-slate-700/70 bg-slate-900/90 p-6 shadow-2xl">
            <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10">
                    <svg className="h-7 w-7 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-300">Acceso seguro</p>
                <h2 className="mt-2 text-2xl font-black text-white">Portal Entidad</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Accede con tu clave o créala usando el teléfono autorizado por tu asesoría.
                </p>

                {/* RADAR_CLIENT_AUTH_VISIBLE_IP_NOTICE_V2 */}
                <RadarLegalNotice compact />
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-950/70 p-1">
                <button
                    type="button"
                    onClick={() => { setMode('login'); resetMessages(); }}
                    className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${mode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    Ya tengo clave
                </button>
                <button
                    type="button"
                    onClick={() => { setMode('setup'); resetMessages(); }}
                    className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${mode === 'setup' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    Crear clave
                </button>
            </div>

            {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-300">Clave de acceso</label>
                        <input
                            type="password"
                            value={accessKey}
                            onChange={event => setAccessKey(event.target.value)}
                            autoComplete="current-password"
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition-colors focus:border-blue-500"
                            placeholder="Introduce tu clave"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || !accessKey.trim()}
                        className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                    >
                        {submitting ? 'Validando...' : 'Entrar al portal'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleSetup} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-300">Teléfono autorizado</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={event => setPhone(event.target.value)}
                            autoComplete="tel"
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition-colors focus:border-emerald-500"
                            placeholder="Introduce el teléfono autorizado"
                        />
                        <p className="mt-2 text-xs leading-relaxed text-slate-500">
                            El teléfono solo verifica que puedes crear o regenerar la clave. No se usa como contraseña.
                        </p>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-300">Nueva clave</label>
                        <input
                            type="password"
                            value={accessKey}
                            onChange={event => setAccessKey(event.target.value)}
                            autoComplete="new-password"
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition-colors focus:border-emerald-500"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-300">Repetir clave</label>
                        <input
                            type="password"
                            value={accessKeyRepeat}
                            onChange={event => setAccessKeyRepeat(event.target.value)}
                            autoComplete="new-password"
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition-colors focus:border-emerald-500"
                            placeholder="Repite la clave"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || !phone.trim() || !accessKey.trim() || !accessKeyRepeat.trim()}
                        className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                    >
                        {submitting ? 'Configurando...' : 'Crear o regenerar clave'}
                    </button>
                </form>
            )}

            {error && (
                <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300">
                    {error}
                </div>
            )}

            {notice && (
                <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                    {notice}
                </div>
            )}

            <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">
                Si no reconoces este acceso, contacta con tu asesoría.
            </p>
        </section>
    );
}


function ManagerLoginGate({ onLogin, loading, error, onOpenPortal }) {
    const [pin, setPin] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        onLogin(pin);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold">{BRAND_CONFIG.appName}</h1>
                    <p className="text-slate-400 mt-2">Acceso al Entorno Gestor</p>
                </div>

                {/* RADAR_MANAGER_LOGIN_VISIBLE_IP_NOTICE_V2 */}
            <RadarLegalNotice compact />

            <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="manager-pin" className="block text-sm font-medium text-slate-300 mb-2">PIN de acceso</label>
                        <input
                            id="manager-pin"
                            name="manager_pin"
                            type="password"
                            value={pin}
                            onChange={(event) => setPin(event.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Introduce el PIN"
                            autoComplete="current-password"
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-800 bg-red-950/50 text-red-200 px-4 py-3 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !pin}
                        className="w-full px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed font-semibold transition-colors"
                    >
                        {loading ? 'Validando...' : 'Entrar'}
                    </button>
                </form>

                
            </div>
        </div>
    );
}

export default function App() {
    const portalClientFromUrl = (() => {
        try {
            const params = new URLSearchParams(window.location.search);
            return (params.get('portal_client') || '').trim();
        } catch {
            return '';
        }
    })();

    const storedPortalClient = (() => {
        try {
            return (window.localStorage.getItem('radar_portal_client') || '').trim();
        } catch {
            return '';
        }
    })();

    const effectivePortalClient = portalClientFromUrl || storedPortalClient;
    const isClientExclusivePortal = Boolean(effectivePortalClient);
    const [view, setView] = useState(() => isClientExclusivePortal ? 'portal' : 'radar');


    useEffect(() => {
        if (!portalClientFromUrl) {
            return;
        }

        try {
            window.localStorage.setItem('radar_portal_client', portalClientFromUrl);
        } catch {}
    }, [portalClientFromUrl]);

    useEffect(() => {
        if (portalClientFromUrl || !storedPortalClient) {
            return;
        }

        try {
            const url = new URL(window.location.href);
            url.searchParams.set('portal_client', storedPortalClient);
            window.history.replaceState({}, '', url.toString());
        } catch {}
    }, [portalClientFromUrl, storedPortalClient]);
    const [managerAuthenticated, setManagerAuthenticated] = useState(false);

    // MANAGER_MOBILE_VIEW_SCROLL_V1_SAFE_AFTER_AUTH
    useEffect(() => {
        if (isClientExclusivePortal || !managerAuthenticated) return;

        const timer = window.setTimeout(() => {
            const target = document.getElementById('manager-content-start');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 120);

        return () => window.clearTimeout(timer);
    }, [view, isClientExclusivePortal, managerAuthenticated]);
    const [authLoading, setAuthLoading] = useState(true);
    const [authSubmitting, setAuthSubmitting] = useState(false);
    const [authError, setAuthError] = useState('');

    
    const [clientPortalAuthenticated, setClientPortalAuthenticated] = useState(false);
    const [clientPortalAuthLoading, setClientPortalAuthLoading] = useState(Boolean(isClientExclusivePortal));
const managerInternalView = !isClientExclusivePortal && view !== 'portal';

    
    // CLIENT_PORTAL_FRONTEND_SESSION_CHECK_V1
    useEffect(() => {
        let active = true;

        if (!isClientExclusivePortal || !effectivePortalClient) {
            setClientPortalAuthenticated(false);
            setClientPortalAuthLoading(false);
            return () => {
                active = false;
            };
        }

        setClientPortalAuthLoading(true);

        fetch(`/api/client-portal/auth/session?client_id=${encodeURIComponent(effectivePortalClient)}`, {
            credentials: 'same-origin'
        })
            .then(response => response.json())
            .then(data => {
                if (!active) return;
                setClientPortalAuthenticated(Boolean(data.authenticated));
            })
            .catch(() => {
                if (!active) return;
                setClientPortalAuthenticated(false);
            })
            .finally(() => {
                if (!active) return;
                setClientPortalAuthLoading(false);
            });

        return () => {
            active = false;
        };
    }, [isClientExclusivePortal, effectivePortalClient]);

useEffect(() => {
        let active = true;

        fetch('/api/auth/manager/session', { credentials: 'same-origin' })
            .then(response => response.json())
            .then(data => {
                if (!active) return;
                setManagerAuthenticated(Boolean(data.authenticated));
            })
            .catch(() => {
                if (!active) return;
                setManagerAuthenticated(false);
            })
            .finally(() => {
                if (!active) return;
                setAuthLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const originalFetch = window.fetch.bind(window);

        const isProtectedApiUrl = (input) => {
            const rawUrl = typeof input === 'string' ? input : input?.url;
            if (!rawUrl) return false;

            try {
                const parsed = new URL(rawUrl, window.location.origin);
                return (
                    parsed.pathname.startsWith('/api/manager/') ||
                    parsed.pathname.startsWith('/api/radar/') ||
                    parsed.pathname.startsWith('/api/aids/') ||
                    parsed.pathname.startsWith('/api/compliance/')
                );
            } catch {
                return false;
            }
        };

        window.fetch = async (...args) => {
            const response = await originalFetch(...args);

            if (response.status === 401 && isProtectedApiUrl(args[0])) {
                setManagerAuthenticated(false);
                setAuthError('Sesión caducada. Vuelve a introducir el PIN.');
            }

            return response;
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    const handleManagerLogin = async (pin) => {
        setAuthSubmitting(true);
        setAuthError('');

        try {
            const response = await fetch('/api/auth/manager/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ pin })
            });

            const data = await response.json();

            if (!response.ok || data.authenticated !== true) {
                setManagerAuthenticated(false);
                setAuthError(data.message || 'No se ha podido validar el PIN.');
                return;
            }

            setManagerAuthenticated(true);
            setAuthError('');
        } catch {
            setManagerAuthenticated(false);
            setAuthError('No se ha podido conectar con el servidor de autenticación.');
        } finally {
            setAuthSubmitting(false);
        }
    };

    const handleManagerLogout = async () => {
        try {
            await fetch('/api/auth/manager/logout', {
                method: 'POST',
                credentials: 'same-origin'
            });
        } catch {}

        setManagerAuthenticated(false);
        setAuthError('');
        setView('radar');
    };

    // CLIENT_PORTAL_LOGOUT_HANDLER_V1
    const handleClientPortalLogout = async () => {
        try {
            await fetch('/api/client-portal/auth/logout', {
                method: 'POST',
                credentials: 'same-origin'
            });
        } catch {}

        setClientPortalAuthenticated(false);
    };


    useEffect(() => {
        // Forzamos explícitamente la vista a 'radar' al montar el componente.
        // Esto previene que Vite mantenga en caché el estado de sesiones anteriores
        // (Hot Module Replacement) o que quede guardado en la memoria del navegador.
        setView(isClientExclusivePortal ? 'portal' : 'radar');
    }, [isClientExclusivePortal]);


    if (managerInternalView && authLoading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-300">Comprobando sesión de gestor...</p>
                </div>
            </div>
        );
    }

    if (managerInternalView && !managerAuthenticated) {
        return (
            <ManagerLoginGate
                onLogin={handleManagerLogin}
                loading={authSubmitting}
                error={authError}
                onOpenPortal={() => setView('portal')}
            />
        );
    }    if (isClientExclusivePortal) {
        return (
            <main className="min-h-screen bg-slate-950 text-slate-100">
                <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                    <header className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-300">{BRAND_CONFIG.appName}</p>
                                <h1 className="mt-2 text-2xl font-black text-white">{BRAND_CONFIG.clientPortalTitle}</h1>
                                <p className="mt-1 text-sm text-slate-400">{BRAND_CONFIG.clientPortalSubtitle}</p>
                            </div>
                            <div className="flex flex-col gap-2 sm:items-end">
                                <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-xs font-semibold text-slate-400">
                                    Cliente: <span className="text-slate-100">{formatPortalClientDisplayName(effectivePortalClient)}</span>
                                </div>

                                {/* CLIENT_PORTAL_LOGOUT_BUTTON_V1 */}
                                {clientPortalAuthenticated && (
                                    <button
                                        type="button"
                                        onClick={handleClientPortalLogout}
                                        className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs font-bold text-slate-300 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
                                    >
                                        Cerrar sesión
                                    </button>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* CLIENT_PORTAL_AUTH_GATE_RENDER_V1 */}
                    {clientPortalAuthLoading ? (
                        <section className="mx-auto max-w-lg rounded-3xl border border-slate-700/70 bg-slate-900/90 p-8 text-center shadow-2xl">
                            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                            <p className="text-sm font-semibold text-slate-300">Comprobando acceso seguro...</p>
                        </section>
                    ) : clientPortalAuthenticated ? (
                        <PortalEntidadPanel fixedClientId={effectivePortalClient} exclusiveClientPortal={true} />
                    ) : (
                        <ClientPortalAuthGate
                            clientId={effectivePortalClient}
                            onAuthenticated={() => setClientPortalAuthenticated(true)}
                        />
                    )}
                </div>
            </main>
        );
    }

    return (
        <div className="min-h-screen bg-[#050B14] text-slate-200 font-sans selection:bg-indigo-500/30">
            {/* Header Superior */}
            <header className="bg-[#0A1120] border-b border-slate-800/80 px-6 py-5 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
                <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                {BRAND_CONFIG.appName}
                            </h1>
                            <p className="text-indigo-400 font-semibold text-sm mt-0.5 tracking-wide">{BRAND_CONFIG.tagline}</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2">
                        <span className="inline-flex bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest shadow-sm">
                            {view === 'portal' ? 'PORTAL ENTIDAD' : 'ENTORNO GESTOR'}
                            {managerAuthenticated && view !== 'portal' && (
                                <button
                                    type="button"
                                    onClick={handleManagerLogout}
                                    className="ml-3 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800 text-xs font-semibold"
                                >
                                    Salir
                                </button>
                            )}
                        </span>
                        <span className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            Los hallazgos requieren revisión humana antes de ser visibles para clientes.
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto px-6 py-8">
                {/* Navegación Superior */}
                                                <div className="lg:hidden mb-6 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Secciones del gestor
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        <button type="button" onClick={() => setView('radar')} className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-bold ${view === 'radar' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-slate-700 bg-slate-950/50 text-slate-300'}`}>
                            Hallazgos Radar
                        </button>
                        <button type="button" onClick={() => setView('clientes')} className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-bold ${view === 'clientes' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-slate-700 bg-slate-950/50 text-slate-300'}`}>
                            Clientes / Entidades
                        </button>
                        <button type="button" onClick={() => setView('normativas')} className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-bold ${view === 'normativas' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-slate-700 bg-slate-950/50 text-slate-300'}`}>
                            Normativas base
                        </button>
                        <button type="button" onClick={() => setView('ayudas')} className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-bold ${view === 'ayudas' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-slate-700 bg-slate-950/50 text-slate-300'}`}>
                            Ayudas y subvenciones
                        </button>
                        <button type="button" onClick={() => setView('paquetes')} className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-bold ${view === 'paquetes' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-slate-700 bg-slate-950/50 text-slate-300'}`}>
                            Paquetes para cliente
                        </button>
                        <button type="button" onClick={() => setView('documentacion')} className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-bold ${view === 'documentacion' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-slate-700 bg-slate-950/50 text-slate-300'}`}>
                            Documentación y trámites
                        </button>
                        <button type="button" onClick={() => setView('documentacion-trimestral')} className={'w-full text-left rounded-xl border px-4 py-3 text-sm font-bold ' + (view === 'documentacion-trimestral' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-slate-700 bg-slate-950/50 text-slate-300')}>
                            Documentacion trimestral
                        </button>
                        <button type="button" onClick={() => setView('client-communications')} className={'w-full text-left rounded-xl border px-4 py-3 text-sm font-bold ' + (view === 'client-communications' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-slate-700 bg-slate-950/50 text-slate-300')}>
                            Comunicaciones de clientes
                        </button>
                        <button type="button" onClick={() => setView('comercial')} className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-bold ${view === 'comercial' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-slate-700 bg-slate-950/50 text-slate-300'}`}>
                            Vista Comercial
                        </button>
                        <button type="button" onClick={() => setView('portal')} className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-bold ${view === 'portal' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-slate-700 bg-slate-950/50 text-slate-300'}`}>
                            Portal Entidad
                        </button>
                    </div>

                    <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                        Todas las secciones importantes están visibles en móvil. No necesitas hacer scroll lateral para encontrar una opción.
                    </p>
                </div>

<div className="md:hidden mb-6 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
                    <label htmlFor="mobile-manager-section" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Sección del gestor
                    </label>
                    <select
                        id="mobile-manager-section"
                        value={view}
                        onChange={(event) => setView(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="radar">Hallazgos Radar</option>
                        <option value="clientes">Clientes / Entidades</option>
                        <option value="normativas">Normativas base</option>
                        <option value="ayudas">Ayudas y subvenciones</option>
                        <option value="paquetes">Paquetes para cliente</option>
                        <option value="documentacion">Documentación y trámites</option>
                        <option value="documentacion-trimestral">Documentacion trimestral</option>
                        <option value="client-communications">Comunicaciones de clientes</option>
                        <option value="comercial">Vista Comercial</option>
                        <option value="portal">Portal Entidad</option>
                    </select>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                        En móvil puedes cambiar de sección desde este selector sin depender de desplazamiento lateral.
                    </p>
                </div>

                <div className="hidden lg:flex overflow-x-auto gap-1 mb-10 border-b border-slate-800/80 pb-px scrollbar-hide">
                    <NavTab 
                        active={view === 'radar'} 
                        onClick={() => setView('radar')} 
                        label="Hallazgos Radar" 
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />} 
                    />
                    <NavTab 
                        active={view === 'clientes'} 
                        onClick={() => setView('clientes')} 
                        label="Clientes / Entidades" 
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />} 
                    />
                    <NavTab 
                        active={view === 'normativas'} 
                        onClick={() => setView('normativas')} 
                        label="Normativas base" 
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />}
                    />
                    <NavTab 
                        active={view === 'ayudas'} 
                        onClick={() => setView('ayudas')} 
                        label="Ayudas y subvenciones" 
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    />
                    <NavTab 
                        active={view === 'paquetes'} 
                        onClick={() => setView('paquetes')} 
                        label="Paquetes para cliente" 
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />}
                    />
                    <NavTab
                        active={view === 'documentacion'}
                        onClick={() => setView('documentacion')}
                        label="Documentación y trámites"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
                    />
                    <NavTab
                        active={view === 'documentacion-trimestral'}
                        onClick={() => setView('documentacion-trimestral')}
                        label="Documentacion trimestral"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
                    />
                    <NavTab
                        active={view === 'client-communications'}
                        onClick={() => setView('client-communications')}
                        label="Comunicaciones de clientes"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z" />}
                    />
                    <NavTab
                        active={view === 'comercial'}
                        onClick={() => setView('comercial')}
                        label="Vista Comercial"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3v18m4-14h4m-4 4h6m-6 4h4M5 7h2m-2 4h2m-2 4h2" />}
                    />
                    <NavTab 
                        active={view === 'portal'} 
                        onClick={() => setView('portal')} 
                        label="Portal Entidad" 
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />}
                    />
                </div>

                {/* Vistas */}
                {!isClientExclusivePortal && view !== 'radar' && (
                    <div className="mb-6">
                        <button
                            type="button"
                            onClick={() => setView('radar')}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-bold text-slate-200 hover:border-indigo-500 hover:text-indigo-300 transition-colors"
                        >
                            ? Volver al panel principal
                        </button>
                    </div>
                )}

                {/* MANAGER_MOBILE_VIEW_SCROLL_TARGET_V1 */}
                    <div id="manager-content-start" className="scroll-mt-28" />


                    {/* RADAR_MANAGER_VISIBLE_IP_NOTICE_V2 */}
                    {!isClientExclusivePortal && <RadarLegalNotice compact />}

                    {view === 'radar' && <RadarPanel />}
                {view === 'normativas' && <CompliancePanel />}
                {view === 'ayudas' && <AidsPanel />}
                {view === 'clientes' && <ClientsPanel />}
                {view === 'paquetes' && <ClientPackagesPanel />}
                {view === 'documentacion' && <ClientProceduresPanel />}
                {view === 'documentacion-trimestral' && <QuarterlyDocumentationPanel />}
                {view === 'client-communications' && <ManagerClientCommunicationsPanel />}
                {view === 'comercial' && <CommercialDashboardPanel />}
                {view === 'portal' && <PortalEntidadPanel />}
            </main>
        </div>
    );
}

function NavTab({ active, onClick, label, icon, disabled }) {
    return (
        <button 
            onClick={onClick} 
            disabled={disabled}
            className={`flex items-center gap-2.5 px-6 py-4 text-sm font-bold border-b-2 transition-all duration-200 outline-none
            ${disabled ? 'border-transparent text-slate-600 cursor-not-allowed' : 
            active ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 
            'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 hover:border-slate-700'}`}
        >
            <svg className={`w-5 h-5 ${active ? 'text-indigo-500' : disabled ? 'text-slate-700' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {icon}
            </svg>
            {label}
        </button>
    );
}
