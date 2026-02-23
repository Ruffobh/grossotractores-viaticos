import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendAdminAlert } from '@/app/utils/mail';

export async function GET() {
    const supabase = createAdminClient();

    const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
            id, date, vendor_name, total_amount, currency, user_id,
            profiles!invoices_user_id_fkey(full_name, area)
        `)
        .in('status', ['pending_approval', 'exceeded_budget']);

    if (error) return NextResponse.json({ error: error.message });

    const results = [];
    for (const invoice of invoices || []) {
        const profileInfo = Array.isArray(invoice.profiles) ? invoice.profiles[0] : invoice.profiles;

        const expenseData = {
            id: invoice.id,
            date: invoice.date,
            vendor_name: invoice.vendor_name,
            total_amount: invoice.total_amount,
            currency: invoice.currency,
            user_name: profileInfo?.full_name || 'Usuario Desconocido',
            user_id: invoice.user_id,
            area: profileInfo?.area
        };

        try {
            await sendAdminAlert(expenseData);
            results.push({ id: invoice.id, status: 'sent', user: expenseData.user_name });
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (e) {
            results.push({ id: invoice.id, status: 'error', detail: String(e) });
        }
    }

    return NextResponse.json({ success: true, count: invoices?.length, results });
}
