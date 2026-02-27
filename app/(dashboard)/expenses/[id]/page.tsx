import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import styles from './style.module.css'
import { approveExpense, rejectExpense } from './actions'
import { CheckCircle, XCircle, ChevronLeft } from 'lucide-react'
import { BCExportButton } from '@/components/bc-export-button'
import { EditableDetailRow } from '@/components/editable-detail-row'
import { AdminActions } from '@/components/admin-actions'
import { ManagerRejectButton } from '@/components/manager-reject-button'
import { EXPENSE_TYPES, INVOICE_TYPES, PAYMENT_METHODS } from '@/app/constants'
import { ReceiptViewer } from '@/components/receipt-viewer'

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { createAdminClient } = await import('@/utils/supabase/admin')
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()

    // 1. Fetch current user profile first to know who is asking
    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role, permissions, area, branch, branches')
        .eq('id', user?.id)
        .single()

    const isAdmin = currentUserProfile?.role === 'admin'
    const isManager = currentUserProfile?.role === 'manager' || currentUserProfile?.role === 'branch_manager'
    const hasApproveAreaAttr = (currentUserProfile?.permissions as any)?.approve_area_expenses === true

    // 2. Fetch invoice data using admin client to bypass RLS
    const { data: invoice, error } = await adminClient
        .from('invoices')
        .select('*, profiles!invoices_user_id_fkey(*), loaded_by_profile:profiles!invoices_loaded_by_fkey(*), approved_by_profile:profiles!invoices_approved_by_fkey(full_name)')
        .eq('id', id)
        .single()

    if (error || !invoice) {
        redirect('/expenses')
    }

    // 3. Manually enforce visibility rules (similar to RLS but fully controlled here)
    let canView = false

    if (isAdmin || invoice.user_id === user?.id) {
        canView = true
    } else if (isManager) {
        // Manager can view if invoice is from their branch
        const invoiceBranch = invoice.profiles?.branch
        let managerBranches: string[] = []
        if (Array.isArray(currentUserProfile?.branches)) {
            managerBranches = currentUserProfile?.branches
        } else if (typeof currentUserProfile?.branches === 'string') {
            try { managerBranches = JSON.parse(currentUserProfile?.branches) } catch { }
        }
        if (currentUserProfile?.branch === invoiceBranch || managerBranches.includes(invoiceBranch)) {
            canView = true
        }
    } else if (hasApproveAreaAttr) {
        // Area Approver can view if invoice is from their area
        if (invoice.profiles?.area === currentUserProfile?.area) {
            canView = true
        }
    }

    if (!canView) {
        redirect('/expenses')
    }

    const canExport = isAdmin || isManager
    const isSameArea = invoice.profiles?.area === currentUserProfile?.area
    const canApprove = isAdmin || (hasApproveAreaAttr && isSameArea)

    // Determine if actions are needed
    const showAdminActions = canApprove && (invoice.status === 'pending_approval' || invoice.status === 'exceeded_budget')

    return (
        <div className={styles.container}>
            {/* Left: Image Viewer */}
            <div className={styles.imageSection}>
                <ReceiptViewer fileUrl={invoice.file_url} />
            </div>

            {/* Right: Details & Actions */}
            <div className={styles.formSection}>
                <div className={styles.header}>
                    <div className={styles.navRow}>
                        <a href="/expenses" className={styles.modernBackButton}>
                            <ChevronLeft size={18} />
                            Volver a Comprobantes
                        </a>
                    </div>

                    <div className={styles.headerTopRow}>
                        <h2 className={styles.titleCompact}>Detalle de Comprobante</h2>
                        <div className={styles.actionButtons}>
                            {canExport && (!invoice.split_group_id || invoice.is_parent) && (
                                <BCExportButton invoice={invoice} profile={invoice.profiles} />
                            )}
                            {canExport && invoice.status === 'approved' && (
                                <ManagerRejectButton invoiceId={invoice.id} />
                            )}
                        </div>
                    </div>

                    <div className={styles.headerMetaRow}>
                        <div className={styles.metaGroup}>
                            <span className={styles[getStatusClass(invoice.status)]}>{formatStatus(invoice.status)}</span>
                            <span className={styles.separator}>|</span>
                            <p className={styles.metaText}>
                                <span className={styles.metaLabel}>Por:</span> {invoice.profiles?.full_name}
                                {(invoice.profiles?.branch || invoice.profiles?.area) && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                                        ({invoice.profiles?.branch || 'Sin sucursal'}{invoice.profiles?.area ? ` - ${invoice.profiles.area}` : ''})
                                    </span>
                                )}
                            </p>
                            {invoice.loaded_by_profile && invoice.loaded_by !== invoice.user_id && (
                                <p className={styles.metaText}>
                                    <span className={styles.metaLabel}>Cargado por:</span> {invoice.loaded_by_profile.full_name}
                                    {(invoice.loaded_by_profile?.branch || invoice.loaded_by_profile?.area) && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                                            ({invoice.loaded_by_profile?.branch || 'Sin sucursal'}{invoice.loaded_by_profile?.area ? ` - ${invoice.loaded_by_profile.area}` : ''})
                                        </span>
                                    )}
                                </p>
                            )}
                            {invoice.approved_by_profile && (invoice.status === 'approved' || invoice.status === 'rejected' || invoice.status === 'submitted_to_bc') && (
                                <>
                                    <span className={styles.separator}>|</span>
                                    <p className={styles.metaText}>
                                        <span className={styles.metaLabel}>
                                            {invoice.status === 'rejected' ? 'Rechazado por:' : 'Aprobado por:'}
                                        </span> {invoice.approved_by_profile.full_name}
                                    </p>
                                </>
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
