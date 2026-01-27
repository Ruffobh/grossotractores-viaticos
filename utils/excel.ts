
export interface InvoiceData {
    invoice_type: string; // 'A', 'B', 'C', 'Ticket'
    total_amount: number;
    net_amount?: number;
    tax_amount?: number;
    perceptions_amount?: number;
    iva_rate?: string; // '21%', '10.5%'
    vendor_name?: string;
    branch?: string; // 'General', 'Rafaela'
    area?: string; // 'Gerencia', 'Repuestos'
}

export interface BCRow {
    tipo: string;
    n: string;
    descripcion: string;
    grupo_iva: string;
    cantidad: string;
    coste_unit: string;
    cod_area_impuesto: string;
    descuento: string;
    importe: string;
    sucursal: string;
    area: string;
    op: string;
    provincia: string;
    udn: string;
}

// Mappings
const AREA_MAP: Record<string, string> = {
    'Gerencia': 'GTOS-GER',
    'Repuestos': 'COM-PVRE',
    'Ventas': 'COM-VTAS',
    'Posventa': 'COM-POSV',
    'Administracion': 'ADM-GEN',
    'Servicio': 'SERV-MEC',
    'General': 'ADM-GEN' // Fallback
};

const BRANCH_MAP: Record<string, string> = {
    'General': 'GR',
    'Rafaela': 'RF',
    'San Francisco': 'SF',
    'Alta Gracia': 'AG'
};

const formatNumber = (num: number) => {
    // Format to 2 decimals, comma as decimal separator, thousands point (European/Argentine way roughly)
    // Actually BC might expect specific format. Usually copy-paste works with local settings.
    // Let's assume standard Argentine format: 1.234,56
    return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function generateBCRowsForInvoice(invoice: InvoiceData): BCRow[] {
    const rows: BCRow[] = [];

    // Defaults
    const defaults = {
        tipo: 'Cuenta',
        n: '540105',
        udn: 'CON',
        cod_area_impuesto: 'PRO-RI',
        provincia: 'ER',
        op: '',
        descuento: ''
    };

    const branchCode = BRANCH_MAP[invoice.branch || 'General'] || 'GR';
    const areaCode = AREA_MAP[invoice.area || 'Gerencia'] || 'GTOS-GER';

    const isA = invoice.invoice_type === 'A' || invoice.invoice_type === 'M';

    // Logic for Factura A
    if (isA) {
        // Row 1: Net Amount
        const netAmount = invoice.net_amount || (invoice.total_amount / 1.21); // Fallback estimation
        const ivaStr = invoice.iva_rate?.includes('10.5') ? 'IVA 10,5%' : 'IVA 21%'; // Simplified logic

        rows.push({
            ...defaults,
            descripcion: invoice.vendor_name || 'Gasto Viático',
            grupo_iva: ivaStr,
            cantidad: '1,00',
            coste_unit: formatNumber(netAmount),
            importe: formatNumber(netAmount),
            sucursal: branchCode,
            area: areaCode
        });

        // Row 2: Perceptions (if any)
        // Check perceptions_amount or calculate difference if we have total and net and tax
        // User logic: "Si hay percepciones... se suman en una segunda fila"
        const perceptions = invoice.perceptions_amount || 0;

        if (perceptions > 0) {
            rows.push({
                ...defaults,
                descripcion: 'Percepciones / Impuestos',
                grupo_iva: 'IVA NO GRAV',
                cantidad: '1,00',
                coste_unit: formatNumber(perceptions),
                importe: formatNumber(perceptions),
                sucursal: branchCode,
                area: areaCode
            });
        }
    } else {
        // Factura C / B / Ticket (Consumidor Final)
        // Single row with Total
        rows.push({
            ...defaults,
            descripcion: invoice.vendor_name || 'Gasto Viático',
            grupo_iva: 'IVA NO GRAV',
            cantidad: '1,00',
            coste_unit: formatNumber(invoice.total_amount),
            importe: formatNumber(invoice.total_amount),
            sucursal: branchCode,
            area: areaCode
        });
    }

    return rows;
}

export function rowsToTSV(rows: BCRow[]): string {
    // Columns order:
    // Tipo | Nº | Descripción | Grupo contable IVA prod. | Cantidad | Coste unit. | Cód. área impuesto | % Descuento | Importe línea | Sucursal Código | Area Código | Op Código | Provincia Código | Udn Código

    // Header (Optional, user usually just wants data to paste, but maybe useful?)
    // User image shows headers in modal, but "Copiar Filas" usually implies data.
    // Let's generate data only? 
    // "Esto es vital para que al pegar en Business Central ... se reconozcan las celdas"
    // Usually TSV without headers is best for pasting into existing rows.

    return rows.map(r => [
        r.tipo,
        r.n,
        r.descripcion,
        r.grupo_iva,
        r.cantidad,
        r.coste_unit,
        r.cod_area_impuesto,
        r.descuento,
        r.importe,
        r.sucursal,
        r.area,
        r.op,
        r.provincia,
        r.udn
    ].join('\t')).join('\n');
}
