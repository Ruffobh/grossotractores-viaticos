import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import styles from './style.module.css'
import { approveExpense, rejectExpense } from './actions'
import { CheckCircle, XCircle } from 'lucide-react'
import { BCExportButton } from '@/components/bc-export-button'

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch invoice data
    const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*, profiles(*)')
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
                {invoice.file_url?.toLowerCase().endsWith('.pdf') ? (
                    <iframe src={invoice.file_url} className={styles.iframe} />
                ) : (
                    <div className={styles.imageWrapper}>
                        <Image
                            src={invoice.file_url || ''}
                            alt="Receipt"
                            fill
                            className="object-contain"
                        />
                    </div>
                )}
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
                    <DetailRow label="Proveedor" value={invoice.vendor_name} />
                    <DetailRow label="CUIT" value={invoice.vendor_cuit} />
                    <DetailRow label="Tipo de Gasto" value={invoice.expense_category} />
                    <DetailRow label="Fecha" value={new Date(invoice.date).toLocaleDateString()} />
                    <DetailRow label="Tipo Factura" value={invoice.invoice_type} />
                    <DetailRow label="Forma de Pago" value={formatPaymentMethod(invoice.payment_method)} />
                    <DetailRow label="Nº Comprobante" value={invoice.invoice_number || invoice.id.slice(0, 8)} />
                </div>

                <div className={styles.commentsSection}>
                    <DetailRow label="Comentarios" value={invoice.comments} />
                </div>

                {showAdminActions && (
                    <div className={styles.actions}>
                        <form action={approveExpense.bind(null, invoice.id)} style={{ flex: 1 }}>
                            <button type="submit" className={styles.approveButton}>
                                <CheckCircle size={20} />
                                Aprobar
                            </button>
                        </form>
                        <form action={rejectExpense.bind(null, invoice.id)} style={{ flex: 1 }}>
                            <button type="submit" className={styles.rejectButton}>
                                <XCircle size={20} />
                                Rechazar
                            </button>
                        </form>
                    </div>
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
