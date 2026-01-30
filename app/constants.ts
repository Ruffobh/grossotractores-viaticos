export const EXPENSE_TYPES = [
    'Comida',
    'Alojamiento',
    'Combustible',
    'Peaje',
    'Varios'
] as const;

export const INVOICE_TYPES = [
    'FACTURA A',
    'FACTURA C',
    'CONSUMIDOR FINAL'
] as const;

export const PAYMENT_METHODS = [
    { label: 'Efectivo', value: 'Cash' },
    { label: 'Tarjeta', value: 'Card' },
    { label: 'Transferencia', value: 'Transfer' }
] as const;

export const AREAS = [
    'Administracion',
    'Repuestos',
    'Servicios',
    'Maquinaria',
    'Grupo-Staff-Soporte',
    'Operaciones',
    'Gerencia',
    'Ventas',
    'Posventa'
] as const;

export const DEPARTMENTS = AREAS; // Alias for backward compatibility if needed
