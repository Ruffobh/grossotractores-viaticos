import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import styles from './style.module.css'
import { approveExpense, rejectExpense } from './actions'
import { CheckCircle, XCircle } from 'lucide-react'
import { BCExportButton } from '@/components/bc-export-button'
import { EditableDetailRow } from '@/components/editable-detail-row'
import { AdminActions } from '@/components/admin-actions'
import { EXPENSE_TYPES, INVOICE_TYPES, PAYMENT_METHODS } from '@/app/constants'
import { ReceiptViewer } from '@/components/receipt-viewer'

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch invoice data
    const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*, profiles!user_id(*)')
        .eq('id', id)
        .single()

    if (error || !invoice) {
        redirect('/expenses')
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: currentUserProfile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
    const isAdmin = currentUserProfile?.role === 'admin'
    const isManager = currentUserProfile?.role === 'manager' || currentUserProfile?.role === 'branch_manager'
    const canExport = isAdmin || isManager

    // Determine if actions are needed
    const showAdminActions = isAdmin && (invoice.status === 'pending_approval' || invoice.status === 'exceeded_budget')

    return (
        <div className={styles.container}>
            {/* Left: Image Viewer */}
            <div className={styles.imageSection}>
                <ReceiptViewer fileUrl={invoice.file_url} />
            </div>

            {/* Right: Details & Actions */}
            <div className={styles.formSection}>
                <div className={styles.header}>
                    <div className={styles.headerTopRow}>
                        <div className={styles.headerTitleGroup}>
                            <a href="/expenses" className={styles.backButtonCompact}>
                                &larr;
                            </a>
                            <h2 className={styles.titleCompact}>Detalle de Comprobante</h2>
                        </div>
                        {canExport && <BCExportButton invoice={invoice} profile={invoice.profiles} />}
                    </div>

                    <div className={styles.headerMetaRow}>
                        <div className={styles.metaGroup}>
                            <span className={styles[getStatusClass(invoice.status)]}>{formatStatus(invoice.status)}</span>
                            <span className={styles.separator}>|</span>
                            <p className={styles.metaText}>
                                <span className={styles.metaLabel}>Por:</span> {invoice.profiles?.full_name}
                            </p>
                            {invoice.loaded_by_profile && invoice.loaded_by !== invoice.user_id && (
                                <p className={styles.metaText}>
                                    <span className={styles.metaLabel}>Cargado por:</span> {invoice.loaded_by_profile.full_name}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.amountCard}>
                    <p className={styles.amountLabel}>Monto Total</p>
                    <p className={styles.amountValue}>
                        {invoice.currency} {invoice.total_amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <div className={styles.gridSection}>
                    <EditableDetailRow
                        label="Proveedor"
                        value={invoice.vendor_name}
                        field="vendor_name"
                        invoiceId={invoice.id}
                        canEdit={isAdmin || isManager}
                    />
                    <EditableDetailRow
                        label="CUIT"
                        value={invoice.vendor_cuit}
                        field="vendor_cuit"
                        invoiceId={invoice.id}
                        canEdit={isAdmin || isManager}
                    />
                    <EditableDetailRow
                        label="Tipo de Gasto"
                        value={invoice.expense_category}
                        field="expense_category"
                        invoiceId={invoice.id}
                        canEdit={isAdmin || isManager}
                        type="select"
                        options={EXPENSE_TYPES.map(t => ({ label: t, value: t }))}
                    />
                    <EditableDetailRow
                        label="Fecha"
                        value={invoice.date}
                        field="date"
                        invoiceId={invoice.id}
                        canEdit={isAdmin || isManager}
                        type="date"
                    />
                    <EditableDetailRow
                        label="Tipo Factura"
                        value={invoice.invoice_type}
                        field="invoice_type"
                        invoiceId={invoice.id}
                        canEdit={isAdmin || isManager}
                        type="select"
                        options={INVOICE_TYPES.map(t => ({ label: t, value: t }))}
                    />
                    <EditableDetailRow
                        label="Forma de Pago"
                        value={invoice.payment_method}
                        field="payment_method"
                        invoiceId={invoice.id}
                        canEdit={isAdmin || isManager}
                        type="select"
                        options={[...PAYMENT_METHODS]}
                    />
                    <EditableDetailRow
                        label="Nº Comprobante"
                        value={invoice.invoice_number}
                        field="invoice_number"
                        invoiceId={invoice.id}
                        canEdit={isAdmin || isManager}
                    />
                </div>

                <div className={styles.commentsSection}>
                    <DetailRow label="Comentarios del Usuario" value={invoice.comments} />
                    {invoice.admin_comments && (
                        <div className={styles.adminFeedback}>
                            <h4 className={styles.adminFeedbackTitle}>Comentarios del Administrador</h4>
                            <p className={styles.adminFeedbackText}>{invoice.admin_comments}</p>
                        </div>
                    )}
                </div>

                {showAdminActions && (
                    <AdminActions invoiceId={invoice.id} />
                )}
            </div>
        </div>
    )
}

function DetailRow({ label, value, isLarge = false }: { label: string, value: string | null | number, isLarge?: boolean }) {
    return (
        <div className={styles.detailRow}>
            <label className={styles.label}>{label}</label>
            <div className={isLarge ? styles.valueLarge : styles.value}>
                {value || '-'}
            </div>
        </div>
    )
}

function formatStatus(status: string) {
    const map: Record<string, string> = {
        'pending_approval': 'Pendiente de Aprobación',
        'approved': 'Aprobado',
        'rejected': 'Rechazado',
        'exceeded_budget': 'Excede Presupuesto',
        'pending': 'Pendiente',
        'submitted_to_bc': 'Cargado a BC'
    }
    return map[status] || status
}

function getStatusClass(status: string) {
    const map: Record<string, string> = {
        'pending_approval': 'statusPending',
        'approved': 'statusApproved',
        'rejected': 'statusRejected',
        'exceeded_budget': 'statusExceeded',
        'pending': 'statusPending',
        'submitted_to_bc': 'statusSubmitted'
    }
    return map[status] || 'statusPending'
}

function formatPaymentMethod(method: string) {
    const map: Record<string, string> = {
        'Cash': 'Efectivo',
        'Transfer': 'Transferencia',
        'Credit Card': 'Tarjeta de Crédito',
        'Debit Card': 'Tarjeta de Débito',
        'Other': 'Otro'
    }
    return map[method] || method
}
