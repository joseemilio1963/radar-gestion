import React, { useState, useEffect } from 'react';

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
                <MetricCard title="Hallazgos pendientes" value={metrics.pending} color="text-white" border="border-slate-700/60" bg="bg-slate-800/80" />
                <MetricCard title="Normativas detectadas" value={metrics.normativas} color="text-indigo-400" border="border-indigo-500/20" bg="bg-indigo-950/20" />
                <MetricCard title="Exportaciones MARC" value={metrics.exports} color="text-emerald-400" border="border-emerald-500/20" bg="bg-emerald-950/20" />
                <MetricCard title="No publicados al cliente" value={metrics.notPublished} color="text-amber-400" border="border-amber-500/20" bg="bg-amber-950/20" />
            </div>

            {/* Layout principal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Columna izquierda: Lista */}
                <div className="lg:col-span-7 xl:col-span-7 space-y-5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
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
                                        <h3 className="text-base font-bold leading-snug text-slate-100 group-hover:text-indigo-300 transition-colors">{item.title}</h3>
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
                <MetricCard title="Ayudas pendientes" value={metrics.pending} color="text-emerald-400" border="border-emerald-500/20" bg="bg-emerald-950/20" />
                <MetricCard title="Bonificaciones" value={metrics.bonificaciones} color="text-indigo-400" border="border-indigo-500/20" bg="bg-indigo-950/20" />
                <MetricCard title="Incentivos" value={metrics.incentivos} color="text-amber-400" border="border-amber-500/20" bg="bg-amber-950/20" />
                <MetricCard title="No publicadas al cliente" value={metrics.notPublished} color="text-rose-400" border="border-rose-500/20" bg="bg-rose-950/20" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 xl:col-span-7 space-y-5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
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
                                <div key={item.id} className={`group relative bg-slate-800/60 backdrop-blur-sm p-6 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md ${detailItem?.item?.id === item.id ? 'border-emerald-500/50 bg-slate-800/90 ring-1 ring-emerald-500/20 translate-x-1' : 'border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/80'}`}>
                                    {detailItem?.item?.id === item.id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-2xl"></div>
                                    )}
                                    <div className="flex justify-between items-start mb-3 gap-4">
                                        <h3 className="text-base font-bold leading-snug text-slate-100 group-hover:text-emerald-300 transition-colors">{item.title}</h3>
                                        <span className="shrink-0 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest shadow-sm">
                                            {item.aid_type || 'AYUDA'}
                                        </span>
                                    </div>
                                    <div className="text-slate-400 text-sm mb-5 flex items-center gap-2.5 font-medium">
                                        <span className="p-1.5 bg-slate-700/50 rounded-md text-slate-300">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
                                        </span>
                                        {item.source_name || 'Desconocido'}
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
                                <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1.5">Estado Operativo</div>
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
                <div className="flex items-center gap-2.5 text-blue-400 bg-blue-950/30 p-3 rounded-xl border border-blue-500/20">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <div>
                        <p className="text-sm font-bold">Vista interna de seguimiento normativo, ayudas y estado de cumplimiento por cliente.</p>
                        <p className="text-xs font-medium opacity-80 mt-0.5">La información mostrada es de uso interno de la asesoría y no sustituye la revisión profesional.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <MetricCard title="Clientes activos" value={metrics.activeClients} color="text-white" border="border-slate-700/60" bg="bg-slate-800/80" />
                <MetricCard title="Alertas rojas" value={metrics.redAlerts} color="text-rose-400" border="border-rose-500/20" bg="bg-rose-950/20" />
                <MetricCard title="Obligaciones sin evaluar" value={metrics.unevaluated} color="text-slate-400" border="border-slate-500/20" bg="bg-slate-900/40" />
                <MetricCard title="Ayudas abiertas" value={metrics.openAids} color="text-emerald-400" border="border-emerald-500/20" bg="bg-emerald-950/20" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <h2 className="text-lg font-bold text-slate-200">Directorio</h2>
                    </div>

                    <div className="space-y-4">
                        {clientsData.map(client => (
                            <div key={client.id} className={`group relative bg-slate-800/60 backdrop-blur-sm p-5 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer ${selectedClientId === client.id ? 'border-blue-500/50 bg-slate-800/90 ring-1 ring-blue-500/20 translate-x-1' : 'border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/80'}`} onClick={() => setSelectedClientId(client.id)}>
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

                <div className="lg:col-span-7 xl:col-span-8 lg:sticky lg:top-8">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-5">
                        <h2 className="text-lg font-bold text-slate-200">Ficha del Cliente</h2>
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
                                    <p className="text-slate-400 text-sm font-medium">{selectedClient.sector} • {selectedClient.employees} empleados</p>
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
                                                    <span className="font-bold text-slate-200 text-sm">{item.title}</span>
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

function MetricCard({ title, value, color, border, bg }) {
    return (
        <div className={`${bg} p-6 rounded-2xl border ${border} shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-1 duration-300`}>
            <div className="text-slate-400 text-[11px] uppercase tracking-widest mb-2 font-bold">{title}</div>
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
                                <option key={c.id} value={c.id}>{c.name} ({c.sector_key})</option>
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

                {interestRequests.length === 0 ? (
                    <div className="text-sm text-slate-500 bg-slate-900/40 border border-dashed border-slate-700/60 rounded-xl p-4">
                        Todavía no hay solicitudes recibidas desde el Portal Entidad.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {interestRequests.map(req => (
                            <div key={req.id} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 grid grid-cols-1 lg:grid-cols-[1.1fr_1.5fr_0.8fr] gap-3 items-start">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Cliente</div>
                                    <div className="font-bold text-slate-200">{req.client_name || req.client_id}</div>
                                </div>

                                <div>
                                    <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Ayuda / oportunidad</div>
                                    <div className="font-semibold text-slate-200">{req.title}</div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        {req.message || 'El cliente solicita que su asesoría revise esta oportunidad.'}
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
                                                {interestStatusLoadingId === req.id ? 'Actualizando...' : 'Marcar contactada'}
                                            </button>
                                        )}

                                        {req.request_status !== 'handled' && (
                                            <button
                                                type="button"
                                                disabled={interestStatusLoadingId === req.id}
                                                onClick={() => updateInterestRequestStatus(req.id, 'handled')}
                                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-xs font-bold"
                                            >
                                                {interestStatusLoadingId === req.id ? 'Actualizando...' : 'Marcar gestionada'}
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
                            <p className="text-slate-400 text-sm">Cliente: <span className="font-semibold text-slate-200">{packageData.package.client_name}</span> • Sector: <span className="font-semibold text-slate-200">{packageData.package.sector_key}</span></p>
                        </div>
                        <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-lg text-xs uppercase font-bold tracking-widest flex items-center gap-2">
                            {packageData.package.package_status === 'published' ? 'Publicado' : 'Pendiente de revisión'}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <MetricCard title="Total Items" value={packageData.counts.total_items} color="text-white" border="border-slate-700/60" bg="bg-slate-900/40" />
                        <MetricCard title="Normativas" value={packageData.counts.total_compliance_items} color="text-blue-400" border="border-blue-500/20" bg="bg-blue-950/20" />
                        <MetricCard title="Ayudas" value={packageData.counts.total_aid_items} color="text-emerald-400" border="border-emerald-500/20" bg="bg-emerald-950/20" />
                        <MetricCard title="Hallazgos" value={packageData.counts.total_radar_items} color="text-rose-400" border="border-rose-500/20" bg="bg-rose-950/20" />
                    </div>

                    <div className="mb-8">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <div>
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
                                            <div className="font-bold text-slate-100">{item.title}</div>
                                            <div className="text-[11px] text-slate-500 mt-1">{item.source_id}</div>
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

function PortalEntidadPanel() {
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
                    setValidClients(data.clients || []);
                    if (data.clients && data.clients.length > 0) {
                        setClientId(data.clients[0].id);
                    }
                }
            })
            .catch(console.error);
    }, []);
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

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm flex items-end gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Vista demo del Portal Entidad</label>
                    <p className="text-[10px] text-slate-500 mb-2">Selecciona un cliente para visualizar la información publicada por la asesoría.</p>
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

            {loading && <div className="text-center text-slate-400 py-12">Cargando datos del portal...</div>}

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
                        <MetricCard title="Obligaciones validadas" value={summary.total_compliance_items} color="text-white" border="border-slate-700/60" bg="bg-slate-800/80" />
                        <MetricCard title="Ayudas disponibles" value={summary.total_aid_items} color="text-emerald-400" border="border-emerald-500/20" bg="bg-emerald-950/20" />
                        <MetricCard title="Alertas relevantes" value={summary.total_radar_items} color="text-rose-400" border="border-rose-500/20" bg="bg-rose-950/20" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Obligaciones principales de tu empresa
                            </h3>
                            <div className="space-y-4">
                                {obligations.map(obl => (
                                    <div key={obl.id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                        <h4 className="font-bold text-slate-200 mb-2">{obl.title}</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-3">{obl.summary}</p>
                                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Información revisada por tu asesoría
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Ayudas y oportunidades disponibles
                            </h3>
                            <div className="space-y-4">
                                {aids.map(aid => (
                                    <div key={aid.id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                        <h4 className="font-bold text-slate-200 mb-2">{aid.title}</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                            {aid.title && aid.title.includes('Kit Digital') ? 'Programa de ayudas para impulsar la digitalización de pymes, microempresas y autónomos mediante soluciones digitales. Tu asesoría revisará si tu empresa cumple los requisitos vigentes y qué convocatoria puede aplicar.' : aid.title && aid.title.includes('formación en alternancia') ? 'Oportunidad vinculada a la contratación y formación de personas trabajadoras mediante contrato de formación en alternancia. Puede permitir bonificaciones o incentivos asociados, siempre sujetos a requisitos vigentes y validación por la asesoría.' : aid.summary}
                                        </p>
                                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg text-xs text-indigo-300 font-semibold flex items-center justify-between gap-4">
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
                        Marcar contactada
                    </button>
                )}

                <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => updateCommercialRequestStatus(req.id, 'handled')}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-xs font-bold"
                >
                    Marcar gestionada
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

    const counts = dashboard?.counts || {};
    const clients = dashboard?.clients || [];
    const requests = dashboard?.requests || [];
    const filterOptions = dashboard?.filters || {};

    const filteredRequests = requests.filter(req => {
        if (filters.client_id !== 'all' && req.client_id !== filters.client_id) return false;
        if (filters.status !== 'all' && req.request_status !== filters.status) return false;
        if (filters.request_type !== 'all' && req.request_type !== filters.request_type) return false;
        if (filters.priority !== 'all' && req.priority !== filters.priority) return false;
        return true;
    });

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
                    <h2 className="text-2xl font-extrabold text-white">Vista Comercial Avanzada</h2>
                    <p className="text-slate-400 text-sm mt-1">Resumen global y seguimiento comercial read-only.</p>
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
                <MetricCard title="Clientes" value={counts.clients_total ?? 0} color="text-white" border="border-slate-700/60" bg="bg-slate-800/80" />
                <MetricCard title="Paquetes publicados" value={counts.packages_published ?? 0} color="text-indigo-400" border="border-indigo-500/20" bg="bg-indigo-950/20" />
                <MetricCard title="Solicitudes totales" value={counts.interest_requests_total ?? 0} color="text-blue-400" border="border-blue-500/20" bg="bg-blue-950/20" />
                <MetricCard title="Pendientes" value={counts.pending_contact ?? 0} color="text-amber-400" border="border-amber-500/20" bg="bg-amber-950/20" />
                <MetricCard title="Gestionadas" value={counts.handled ?? 0} color="text-emerald-400" border="border-emerald-500/20" bg="bg-emerald-950/20" />
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
                            {(filterOptions.clients || []).map(client => (
                                <option key={client.client_id} value={client.client_id}>{client.client_name}</option>
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
                            {(filterOptions.statuses || []).map(status => (
                                <option key={status} value={status}>{statusLabel(status)}</option>
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
                            {(filterOptions.request_types || []).map(type => (
                                <option key={type} value={type}>{labelFromKey(type)}</option>
                            ))}
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
                            {(filterOptions.priorities || []).map(priority => (
                                <option key={priority} value={priority}>{priorityLabel(priority)}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4 mb-5">
                    <h3 className="text-lg font-bold text-white">Clientes</h3>
                    <span className="text-sm text-slate-500 font-medium">{filteredClients.length} resultados</span>
                </div>

                <div className="overflow-x-auto">
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
                                <th className="py-3 pr-4 font-bold">Ultima actualizacion</th>
                                <th className="py-3 font-bold">Proxima accion</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                            {filteredClients.map(client => (
                                <tr key={client.client_id} className="text-slate-300">
                                    <td className="py-4 pr-4 font-bold text-slate-100 whitespace-nowrap">{client.client_name || client.client_id}</td>
                                    <td className="py-4 pr-4 text-slate-400 whitespace-nowrap">{client.sector_key || 'Sin sector'}</td>
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
                    <h3 className="text-lg font-bold text-white">Solicitudes comerciales</h3>
                    <span className="text-sm text-slate-500 font-medium">{filteredRequests.length} resultados</span>
                </div>

                {filteredRequests.length === 0 ? (
                    <div className="text-sm text-slate-500 bg-slate-900/40 border border-dashed border-slate-700/60 rounded-xl p-5">
                        No hay solicitudes con los filtros seleccionados.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-widest text-slate-500 border-b border-slate-700/60">
                                    <th className="py-3 pr-4 font-bold">Cliente</th>
                                    <th className="py-3 pr-4 font-bold">Oportunidad</th>
                                    <th className="py-3 pr-4 font-bold">Tipo</th>
                                    <th className="py-3 pr-4 font-bold">Estado</th>
                                    <th className="py-3 pr-4 font-bold">Prioridad</th>
                                    <th className="py-3 pr-4 font-bold">Fecha</th>
                                    <th className="py-3 pr-4 font-bold">Proxima accion</th>
                                    <th className="py-3 font-bold">Notas internas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80">
                                {filteredRequests.map(req => (
                                    <tr key={req.id} className="text-slate-300 align-top">
                                        <td className="py-4 pr-4 font-bold text-slate-100 whitespace-nowrap">{req.client_name || req.client_id}</td>
                                        <td className="py-4 pr-4 min-w-[280px]">
                                            <div className="font-semibold text-slate-100">{req.title || 'Sin titulo'}</div>
                                            {req.message && <div className="text-xs text-slate-500 mt-1">{req.message}</div>}
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
                                        <td className="py-4 text-slate-400 min-w-[220px]">{req.internal_notes || 'Sin notas'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function App() {
    const [view, setView] = useState('radar');

    useEffect(() => {
        // Forzamos explícitamente la vista a 'radar' al montar el componente.
        // Esto previene que Vite mantenga en caché el estado de sesiones anteriores
        // (Hot Module Replacement) o que quede guardado en la memoria del navegador.
        setView('radar');
    }, []);

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
                                Radar Gestión Valencia
                            </h1>
                            <p className="text-indigo-400 font-semibold text-sm mt-0.5 tracking-wide">Inteligencia normativa para asesorías</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2">
                        <span className="inline-flex bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest shadow-sm">
                            {view === 'portal' ? 'PORTAL ENTIDAD' : 'ENTORNO GESTOR'}
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
                <div className="flex overflow-x-auto gap-1 mb-10 border-b border-slate-800/80 pb-px scrollbar-hide">
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
                {view === 'radar' && <RadarPanel />}
                {view === 'normativas' && <CompliancePanel />}
                {view === 'ayudas' && <AidsPanel />}
                {view === 'clientes' && <ClientsPanel />}
                {view === 'paquetes' && <ClientPackagesPanel />}
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
