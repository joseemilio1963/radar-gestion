export const BRAND_CONFIG = {
    appName: 'Radar Gestión Valencia',
    shortName: 'Radar Gestión',
    tagline: 'Inteligencia normativa para asesorías',
    clientPortalTitle: 'Portal Entidad',
    clientPortalSubtitle: 'Acceso privado a normativas, ayudas y oportunidades publicadas por tu asesoría.',
    managerBadge: 'Demo interna',
    clientDisplayNames: {
        transportes_levante: 'Transportes Levante',
        clinica_dental: 'Clínica Dental',
        inmobiliaria_turia: 'Inmobiliaria Turia',
        industrias_metalurgicas_turia: 'Industrias Metalúrgicas Turia'
    },
    colors: {
        background: '#050B14',
        header: '#0A1120',
        primary: 'indigo',
        clientPrimary: 'blue',
        success: 'emerald',
        warning: 'amber',
        danger: 'rose'
    }
};

export function formatConfiguredClientName(clientId) {
    const value = String(clientId || '').trim();

    if (BRAND_CONFIG.clientDisplayNames[value]) {
        return BRAND_CONFIG.clientDisplayNames[value];
    }

    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
}
