import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import styles from './style.module.css'
import { updateInvoice } from './actions'
import { ValidationForm as ClientValidationForm } from './client-form'

export default async function ValidateExpensePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch invoice data
    const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !invoice) {
        redirect('/expenses') // Handle error better in production
    }

    // Calculate current monthly consumption
    const { data: { user } } = await supabase.auth.getUser()
    // Calculate current monthly consumption based on INVOICE DATE
    const invoiceDate = new Date(invoice.date || new Date())
    const year = invoiceDate.getFullYear()
    const month = invoiceDate.getMonth()

    // Start and end of the invoice's month
    const firstDay = new Date(year, month, 1).toISOString()
    const lastDay = new Date(year, month + 1, 0).toISOString()

    const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_limit, cash_limit')
        .eq('id', user?.id)
        .single()

    const { data: expenses } = await supabase
        .from('invoices')
        .select('total_amount, payment_method')
        .eq('user_id', user?.id)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .neq('id', id) // Exclude current
        .neq('status', 'rejected')

    const cardLimit = profile?.monthly_limit || 0
    const cashLimit = profile?.cash_limit || 0

    let cardConsumption = 0
    let cashConsumption = 0

    expenses?.forEach(exp => {
        const amt = exp.total_amount || 0
        const method = exp.payment_method
        if (method === 'Cash' || method === 'Transfer') {
            cashConsumption += amt
        } else {
            // Default to Card (or known Card)
            cardConsumption += amt
        }
    })

    return (
        <div className={styles.container}>
            {/* Left: Image Viewer */}
            <div className={styles.imageSection}>
                <div className={styles.imageWrapper}>
                    {/* If PDF, embed it? If Image, show Image */}
                    {invoice.file_url?.toLowerCase().endsWith('.pdf') ? (
                        <iframe src={invoice.file_url} className="w-full h-full border-none" />
                    ) : (
                        <Image
                            src={invoice.file_url || ''}
                            alt="Receipt"
                            fill
                            className={styles.image}
                        />
                    )}
                </div>
            </div>

            {/* Right: Validation Form */}
            <div className={styles.formSection}>
                <div className={styles.warningHeader}>
                    <div className={styles.warningIconWrapper}>
                        {/* Warning Icon inline */}
                        <svg className={styles.warningIcon} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h3 className={styles.warningTitle}>
                            Validar Datos
                        </h3>
                        <div className={styles.warningText}>
                            Confirma que los datos extraídos sean correctos antes de guardar.
                        </div>
                    </div>
                </div>

                <ClientValidationForm
                    invoice={invoice}
                    cardConsumption={cardConsumption}
                    cashConsumption={cashConsumption}
                    cardLimit={cardLimit}
                    cashLimit={cashLimit}
                    styles={styles}
                />
            </div>
        </div>
    )
}
