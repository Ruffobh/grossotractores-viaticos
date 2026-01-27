'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { updateInvoice } from './actions'

interface ValidationFormProps {
    invoice: any
    currentConsumption: number
    monthlyLimit: number
    styles: any // Passing styles to reuse existing CSS module, or we map classes
}

export function ValidationForm({ invoice, currentConsumption, monthlyLimit, styles }: ValidationFormProps) {
    const [amount, setAmount] = useState<number>(invoice.total_amount || 0)
    const [isExceeded, setIsExceeded] = useState(false)

    useEffect(() => {
        // Calculate if new total exceeds limit
        const projectedTotal = currentConsumption + amount
        // If currentConsumption already included this invoice (e.g. update), we should subtract it first?
        // But this is usually "pending_approval" so it might not be in "approved" sum yet?
        // Let's assume currentConsumption is sum of OTHER invoices.

        setIsExceeded(projectedTotal > monthlyLimit)
    }, [amount, currentConsumption, monthlyLimit])

    return (
        <form action={updateInvoice}>
            <input type="hidden" name="id" value={invoice.id} />

            {isExceeded && (
                <div className="bg-red-50 border-1 border-red-200 p-4 rounded-xl mb-6 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-bold text-red-700 text-sm">Alerta de Presupuesto</h4>
                        <p className="text-red-600 text-sm mt-1">
                            Esta carga supera tu límite mensual permitido.
                            <br />
                            <span className="font-medium">Consumo actual:</span> ${currentConsumption.toLocaleString()}
                            <br />
                            <span className="font-medium">Límite:</span> ${monthlyLimit.toLocaleString()}
                            <br />
                            Se requerirá autorización especial.
                        </p>
                    </div>
                </div>
            )}

            <div className={styles.formGrid}>
                <div className={styles.fullWidth}>
                    <label className={styles.label}>Proveedor (Razón Social)</label>
                    <input
                        name="vendor_name"
                        defaultValue={invoice.vendor_name || ''}
                        className={styles.input}
                        required
                    />
                </div>

                <div>
                    <label className={styles.label}>CUIT</label>
                    <input
                        name="vendor_cuit"
                        defaultValue={invoice.vendor_cuit || ''}
                        className={styles.input}
                    />
                </div>

                <div>
                    <label className={styles.label}>Fecha</label>
                    <input
                        type="date"
                        name="date"
                        defaultValue={invoice.date ? invoice.date.split('T')[0] : ''}
                        className={styles.input}
                        required
                    />
                </div>

                <div>
                    <label className={styles.label}>Tipo Factura</label>
                    <select name="invoice_type" defaultValue={invoice.invoice_type || 'Ticket'} className={styles.input}>
                        <option value="A">Factura A</option>
                        <option value="B">Factura B</option>
                        <option value="C">Factura C</option>
                        <option value="M">Factura M</option>
                        <option value="Ticket">Ticket</option>
                    </select>
                </div>

                <div>
                    <label className={styles.label}>Total</label>
                    <input
                        type="number"
                        step="0.01"
                        name="total_amount"
                        value={amount}
                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                        className={styles.input}
                        required
                    />
                </div>

                <div>
                    <label className={styles.label}>Moneda</label>
                    <select name="currency" defaultValue={invoice.currency || 'ARS'} className={styles.input}>
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                    </select>
                </div>

                <div>
                    <label className={styles.label}>Forma de Pago</label>
                    <select name="payment_method" defaultValue={invoice.payment_method || 'Cash'} className={styles.input}>
                        <option value="Cash">Efectivo</option>
                        <option value="Card">Tarjeta</option>
                        <option value="Transfer">Transferencia</option>
                    </select>
                </div>

                <div className={styles.fullWidth}>
                    <label className={styles.label}>Comentarios</label>
                    <textarea
                        name="comments"
                        rows={3}
                        defaultValue={invoice.comments || ''}
                        className={styles.input}
                    />
                </div>
            </div>

            <div className={styles.actions}>
                <button type="submit" className={styles.saveButton}>Confirmar y Guardar</button>
            </div>
        </form>
    )
}
