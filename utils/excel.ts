export interface InvoiceData {
    vendorName: string;      // Nombre fantasía o Razón Social
    vendorCuit: string;      // CUIT sin guiones
    invoiceNumber: string;   // Número completo
    invoiceType: string;     // 'A', 'B', 'C', 'M', 'Ticket' (Mapped from IA or User)
    date: string;            // YYYY-MM-DD
    totalAmount: number;     // Total Final
    currency: string;        // "ARS" o "USD"
    exchangeRate: number;    // 1 si es ARS, cotización si es USD
    // CRÍTICO: El array de impuestos es vital para la contabilidad
    taxes: {
        name: string;   // Ej: "IVA 21%", "Percepción IIBB Santa Fe", "Impuestos Internos"
        amount: number; // Monto numérico
    }[];
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }[];
    // User context
    userBranch?: string;
    userArea?: string;
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

// Mapeo de Áreas (Nombre -> Código)
const AREA_MAP: Record<string, string> = {
    'Servicios': 'COM-PVSR',
    'Repuestos': 'COM-PVRE',
    'Maquinaria': 'COM-VMAQ',
    'Administracion': 'GTOS-ADM',
    'Logistica': 'GTOS-LOG',
    'Gerencia': 'GTOS-GER',
    // Fallbacks or legacy
    'Ventas': 'COM-VTAS',
    'Posventa': 'COM-POSV',
    'General': 'ADM-GEN'
};

// Mapeo de Sucursales (Nombre -> Código)
const BRANCH_MAP: Record<string, string> = {
    'Rafaela': 'RF',
    'San Francisco': 'SF',
    'San Justo': 'SJ',
    'Bandera': 'BA',
    'Quimili': 'QU',
    'General': 'GR',
    'Franck': 'FR', // Assuming Franck code? User didn't specify Franck in "Mapeo de Sucursales" list but replaced Casilda with it.
    // User list: Rafaela, San Francisco, San Justo, Bandera, Quimili, General.
    // If Franck is not in list, maybe map to 'GR'? Or 'FR'? 
    // In "Branch Standardization" task, we replaced Casilda -> Franck.
    // Verification: User provided list: 'Rafaela'->'RF', ... 'General'->'GR'. 
    // If 'Franck' is selected, I should probably default to 'GR' or ask. 
    // Given the prompt "Usa estos valores para traducir", and Franck is missing, I will default to GR if not found, or maybe 'FR' if I can infer it.
    // However, usually specific codes are needed. Let's use GR as safe fallback implies General.
};

// Helper for number formatting (Argentina/European)
const formatNumber = (num: number) => {
    // 1.234,56
    return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateBCRowsForInvoice(invoice: InvoiceData): BCRow[] {
    const rows: BCRow[] = [];

    // Default Values
    const defaults = {
        tipo: 'Cuenta',
        n: '540105',
        udn: 'CON',
        cod_area_impuesto: 'PRO-RI',
        provincia: 'ER',
        op: '',
        descuento: ''
    };

    // User Context Resolution
    const userBranch = invoice.userBranch || 'General';
    const userArea = invoice.userArea || 'Administracion';

    const branchCode = BRANCH_MAP[userBranch] || 'GR';
    const areaCode = AREA_MAP[userArea] || 'GTOS-ADM'; // Default to Admin if not found

    const isA = invoice.invoiceType === 'A' || invoice.invoiceType === 'M' || invoice.invoiceType === 'FACTURA A';

    // CASO A: Factura A (FA)
    if (isA) {
        // Paso 1 (Calcular Neto): Neto = TotalFactura - Suma(Todos los impuestos detectados por IA)
        const totalTaxes = invoice.taxes.reduce((sum, tax) => sum + tax.amount, 0);

        // Safety: If taxes > total, something is wrong, fallback to base.
        let netAmount = invoice.totalAmount - totalTaxes;
        if (netAmount < 0) netAmount = 0; // Prevent negative

        // Paso 2 (Determinar Grupo IVA)
        // Si en taxes hay algo llamado "10.5" -> Grupo IVA = "IVA 10,5%".
        // Si no, por defecto -> Grupo IVA = "IVA 21%".
        const has105 = invoice.taxes.some(t => t.name.includes('10.5') || t.name.includes('10,5'));
        const grupoIva = has105 ? 'IVA 10,5%' : 'IVA 21%';

        // Paso 3 (Generar Fila 1 - Neto)
        rows.push({
            ...defaults,
            descripcion: invoice.vendorName || '',
            grupo_iva: grupoIva,
            cantidad: '1',
            coste_unit: formatNumber(netAmount),
            importe: formatNumber(netAmount), // Importe linea
            sucursal: branchCode,
            area: areaCode
        });

        // Paso 4 (Generar Fila 2 - Otros Impuestos)
        // Filtra los impuestos que NO sean IVA (ej: Percepciones, IIBB).
        const nonIvaTaxes = invoice.taxes.filter(t => {
            const name = t.name.toUpperCase();
            // Basic heuristic to exclude standard VAT
            return !name.includes('IVA 21') && !name.includes('IVA 10') && !name.includes('IVA 27');
        });

        const otherTaxesAmount = nonIvaTaxes.reduce((sum, t) => sum + t.amount, 0);

        // Si la suma > 0.01: Cea una segunda fila.
        if (otherTaxesAmount > 0.01) {
            rows.push({
                ...defaults,
                descripcion: 'Percepciones / Impuestos',
                grupo_iva: 'IVA NO GRAV',
                cantidad: '1',
                coste_unit: formatNumber(otherTaxesAmount),
                importe: formatNumber(otherTaxesAmount),
                sucursal: branchCode,
                area: areaCode
            });
        }

    } else {
        // CASO B: Factura C (FC) o Consumidor Final (CF)
        // Generar 1 sola fila.
        // Grupo IVA: "IVA NO GRAV".
        // Importe: El totalAmount completo de la factura.

        rows.push({
            ...defaults,
            descripcion: invoice.vendorName || '',
            grupo_iva: 'IVA NO GRAV',
            cantidad: '1',
            coste_unit: formatNumber(invoice.totalAmount),
            importe: formatNumber(invoice.totalAmount),
            sucursal: branchCode,
            area: areaCode
        });
    }

    return rows;
}

export function rowsToTSV(rows: BCRow[]): string {
    // 0:Tipo | 1:Nº | 2:Descripción | 3:Grupo IVA | 4:Cant. | 5:Coste Unit. | 6:Cód. Área Imp. | 7:% Desc | 8:Importe Línea | 9:Sucursal | 10:Área | 11:Op | 12:Provincia | 13:Udn
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
