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
                <div className={styles.header}>
                    <h2 className={styles.title}>Validar Datos</h2>
                    <p className="text-gray-500">Confirma que los datos extraídos sean correctos</p>
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
