require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
)

async function sanitizeSplitRejections() {
    console.log('Fetching all rejected invoices that belong to a split group...')

    // Find all rejected invoices that have a split_group_id
    const { data: rejectedGroupInvoices, error: fetchError } = await supabase
        .from('invoices')
        .select('id, split_group_id, is_parent')
        .eq('status', 'rejected')
        .not('split_group_id', 'is', null)

    if (fetchError) {
        console.error('Error fetching rejected group invoices:', fetchError)
        return
    }

    if (!rejectedGroupInvoices || rejectedGroupInvoices.length === 0) {
        console.log('No rejected invoices found that belong to a split group. All good!')
        return
    }

    // Get unique group IDs that have at least one rejected invoice
    const groupIdsToReject = [...new Set(rejectedGroupInvoices.map(i => i.split_group_id))]
    console.log(`Found ${groupIdsToReject.length} split groups that contain a rejected invoice.`)

    // Update all invoices in these groups to 'rejected'
    for (const groupId of groupIdsToReject) {
        console.log(`Processing group: ${groupId}`)

        const { data: updatedInvoices, error: updateError } = await supabase
            .from('invoices')
            .update({
                status: 'rejected',
                admin_comments: 'Comprobante padre/asociado fue rechazado.'
            })
            .eq('split_group_id', groupId)
            .neq('status', 'rejected') // Only update those that aren't already rejected
            .select('id, status, user_id')

        if (updateError) {
            console.error(`Error updating group ${groupId}:`, updateError)
        } else if (updatedInvoices && updatedInvoices.length > 0) {
            console.log(`-> Corrected the status of ${updatedInvoices.length} orphaned child invoice(s) in group ${groupId}.`)
        } else {
            console.log(`-> Group ${groupId} is already fully synchronized.`)
        }
    }

    console.log('Finished sanitizing split rejections.')
}

sanitizeSplitRejections()
