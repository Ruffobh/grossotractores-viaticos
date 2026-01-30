export interface InvoiceData {
    vendorName: string;
    vendorCuit: string;
    invoiceNumber: string;
    invoiceType: string;
    date: string;
    totalAmount: number;

    // Optional explicit amounts
    netAmount?: number;
    taxAmount?: number;
    perceptionsAmount?: number;

    currency: string;
    exchangeRate: number;

    taxes: {
        name: string;
        amount: number;
    }[];

    items: {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }[];

    userBranch?: string;
    userArea?: string;
    expenseType?: string;
}

export interface BCRow {
    tipo: string;
    n: string;
    descripcion: string;
    grupo_iva: string;
    cantidad: number;
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

const AREA_MAP: Record<string, string> = {
    'Servicios': 'COM-PVSR',
    'Repuestos': 'COM-PVRE',
    'Maquinaria': 'COM-VMAQ',
    'Administracion': 'GTOS-ADM',
    'Logistica': 'GTOS-LOG',
    'Gerencia': 'GTOS-GER',
    'Ventas': 'COM-VTAS',
    'Posventa': 'COM-POSV',
    'General': 'ADM-GEN',
    'Grupo-Soporte-Staff': 'GSS'
};

const BRANCH_MAP: Record<string, string> = {
    'Rafaela': 'RF',
    'San Francisco': 'SF',
    'San Justo': 'SJ',
    'Bandera': 'BA',
    'Quimili': 'QM',
    'General': 'GRAL',
    'Franck': 'FK',
};

const formatNumber = (num: number) => {
    return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateBCRowsForInvoice(invoice: InvoiceData): BCRow[] {
    const rows: BCRow[] = [];


    let accountNumber = '540105';
    if (invoice.expenseType === 'Capacitaciones') {
        accountNumber = '540108';
    } else if (invoice.expenseType === 'Marketing') {
        accountNumber = '520209';
    }

    const defaults = {
        tipo: 'Cuenta',
        n: accountNumber,
        udn: 'CON',
        cod_area_impuesto: 'PRO-RI',
        provincia: '', // Empty as requested
        op: '',
        descuento: ''
    };

    const userBranch = invoice.userBranch || 'General';
    const userArea = invoice.userArea || 'Administracion';

    const branchCode = BRANCH_MAP[userBranch] || 'GRAL';
    const areaCode = AREA_MAP[userArea] || 'GTOS-ADM';

    const typeUpper = (invoice.invoiceType || '').toUpperCase();
    const isA = typeUpper === 'A' || typeUpper === 'M' || typeUpper === 'FACTURA A' || typeUpper === 'FA' || typeUpper === 'TIQUE FACTURA A';

    if (isA) {
        let netAmount = invoice.netAmount || 0;
        let perceptions = invoice.perceptionsAmount || 0;
        let ivaRate = 'IVA 21%';

        // 1. Try explicit amounts
        if (netAmount > 0) {
            const has105 = invoice.taxes.some(t => t.name.includes('10.5') || t.name.includes('10,5'));
            if (has105) ivaRate = 'IVA 10,5%';

            if (!perceptions && invoice.taxes.length > 0) {
                perceptions = invoice.taxes
                    .filter(t => !t.name.toUpperCase().includes('IVA 21') && !t.name.toUpperCase().includes('IVA 10'))
                    .reduce((sum, t) => sum + t.amount, 0);
            }
        }
        // 2. Fallback to taxes array calculation
        else if (invoice.taxes.length > 0) {
            const totalTaxes = invoice.taxes.reduce((sum, t) => sum + t.amount, 0);
            netAmount = invoice.totalAmount - totalTaxes;

            const has105 = invoice.taxes.some(t => t.name.includes('10.5'));
            if (has105) ivaRate = 'IVA 10,5%';

            perceptions = invoice.taxes
                .filter(t => !t.name.toUpperCase().includes('IVA 21') && !t.name.toUpperCase().includes('IVA 10'))
                .reduce((sum, t) => sum + t.amount, 0);
        }
        // 3. Last Resort: Estimate
        else {
            netAmount = invoice.totalAmount / 1.21;
        }

        if (netAmount < 0) netAmount = 0;

        rows.push({
            ...defaults,
            descripcion: invoice.items?.[0]?.description || invoice.vendorName || '',
            grupo_iva: ivaRate,
            cantidad: 1,
            coste_unit: formatNumber(netAmount),
            importe: formatNumber(netAmount),
            sucursal: branchCode,
            area: areaCode
        });

        if (perceptions > 0.01) {
            rows.push({
                ...defaults,
                descripcion: 'Percepciones / Impuestos',
                grupo_iva: 'IVA NO GRAV',
                cantidad: 1,
                coste_unit: formatNumber(perceptions),
                importe: formatNumber(perceptions),
                sucursal: branchCode,
                area: areaCode
            });
        }

    } else {
        rows.push({
            ...defaults,
            descripcion: invoice.items?.[0]?.description || invoice.vendorName || '',
            grupo_iva: 'IVA NO GRAV',
            cantidad: 1,
            coste_unit: formatNumber(invoice.totalAmount),
            importe: formatNumber(invoice.totalAmount),
            sucursal: branchCode,
            area: areaCode
        });
    }

    return rows;
}

export function rowsToTSV(rows: BCRow[]): string {
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
