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
    { key: 'approve_area_expenses', label: 'Aprobar Gastos (Solo su Área)', description: 'Permite aprobar/rechazar gastos si coinciden con su área.' },
    { key: 'view_all_expenses', label: 'Ver Todos los Gastos', description: 'Permite ver el historial completo de comprobantes de la empresa.' },
    { key: 'receive_approval_emails', label: 'Recibir Alertas de Aprobación', description: 'Recibe correos cuando se carga un gasto en su área.' },
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
