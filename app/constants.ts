export const EXPENSE_TYPES = [
    'Comida',
    'Alojamiento',
    'Combustible',
    'Peaje',
    'Capacitaciones',
    'Marketing',
    'Varios'
] as const;

export const INVOICE_TYPES = [
    'FACTURA A',
    'FACTURA C',
    'CONSUMIDOR FINAL'
] as const;

export const PAYMENT_METHODS = [
    { label: 'Efectivo', value: 'Cash' },
    { label: 'Tarjeta Crédito', value: 'Card' },
    { label: 'Transferencia', value: 'Transfer' }
] as const;

export const AREAS = [
    'Administracion',
    'Gerencia',
    'Grupo-Soporte-Staff',
    'Maquinaria',
    'Operaciones',
    'Repuestos',
    'Servicios'
] as const;

// Permissions Configuration
export const PERMISSIONS = [
    { key: 'approve_area_expenses', label: 'Aprobar Gastos (Solo su Área)', description: 'Permite aprobar/rechazar gastos y recibir alertas de nuevos tickets si coinciden con su área.' },
    { key: 'view_all_expenses', label: 'Ver Todos los Gastos', description: 'Permite ver el historial completo de comprobantes de la empresa.' },
    { key: 'receive_new_expense_emails', label: 'Recibir Alertas de Nuevos Tickets', description: 'Recibe un correo cuando un usuario carga un comprobante nuevo.' },
    { key: 'receive_approval_emails', label: 'Recibir Alertas de Tickets Aprobados', description: 'Recibe correo cuando un encargado aprueba un comprobante (Listo para BC).' },
]

export const BRANCHES = [
    'Bandera',
    'Franck',
    'General',
    'Quimili',
    'Rafaela',
    'San Francisco',
    'San Justo'
] as const;

export const DEPARTMENTS = AREAS; // Alias for backward compatibility if needed

// Business Central - Purchaser Codes
export const BC_PURCHASER_CODES = [
    { code: 'GTOS-SERV', name: 'Gastos Servicios' },
    { code: 'GTOS-REP', name: 'Gastos Repuestos' },
    { code: 'GTOS-MAQ', name: 'Gastos Maquinaria' },
    { code: 'GTOS-OPR', name: 'Gastos Operaciones' },
    { code: 'GTOS-GRUPO', name: 'Gastos Grupo' },
    { code: 'GTOS-CH', name: 'Gastos Capital Humano' },
    { code: 'GTOS-SER-GER', name: 'Gastos Servicio Gerencia' },
    { code: 'GTOS-REP-GER', name: 'Gastos Repuestos Gerencia' },
    { code: 'GTOS-MAQ-GER', name: 'Gastos Maquinaria Gerencia' },
    { code: 'GTOS-OPR-GER', name: 'Gastos Operaciones Gerencia' },
] as const;

// Auto-mapping from user area to default purchaser code
export const BC_AREA_TO_PURCHASER: Record<string, string> = {
    'Servicios': 'GTOS-SERV',
    'Repuestos': 'GTOS-REP',
    'Maquinaria': 'GTOS-MAQ',
    'Operaciones': 'GTOS-OPR',
    'Grupo-Soporte-Staff': 'GTOS-GRUPO',
};

// Business Central - Account numbers by expense category
export const BC_ACCOUNT_MAP: Record<string, string> = {
    'Comida': '540105',
    'Alojamiento': '540105',
    'Combustible': '540105',
    'Peaje': '540105',
    'Varios': '540105',
    'Capacitaciones': '540108',
    'Marketing': '520209',
};

// Business Central - Available GL accounts for purchase invoices
export const BC_ACCOUNTS = [
    { code: '540105', name: 'Viáticos' },
    { code: '540108', name: 'Capacitaciones' },
    { code: '520209', name: 'Marketing' },
] as const;

// Business Central - Branch codes
export const BC_BRANCH_MAP: Record<string, string> = {
    'Rafaela': 'RF',
    'San Francisco': 'SF',
    'San Justo': 'SJ',
    'Bandera': 'BA',
    'Quimili': 'QM',
    'General': 'GRAL',
    'Franck': 'FK',
};

// Dropdown arrays for BC modal
export const BC_BRANCH_CODES = [
    { code: 'RF', name: 'Rafaela' },
    { code: 'SF', name: 'San Francisco' },
    { code: 'SJ', name: 'San Justo' },
    { code: 'BA', name: 'Bandera' },
    { code: 'QM', name: 'Quimili' },
    { code: 'GRAL', name: 'General' },
    { code: 'FK', name: 'Franck' },
] as const;

export const BC_AREA_CODES = [
    { code: 'COM-PVSR', name: 'Servicios' },
    { code: 'COM-PVRE', name: 'Repuestos' },
    { code: 'COM-VMAQ', name: 'Maquinaria' },
    { code: 'GTOS-ADM', name: 'Administración' },
    { code: 'GTOS-LOG', name: 'Logística' },
    { code: 'GTOS-GER', name: 'Gerencia' },
    { code: 'COM-VTAS', name: 'Ventas' },
    { code: 'COM-POSV', name: 'Posventa' },
    { code: 'ADM-GEN', name: 'General' },
    { code: 'GSS', name: 'Grupo-Soporte-Staff' },
] as const;
