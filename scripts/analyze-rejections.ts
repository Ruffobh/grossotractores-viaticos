import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOldRejections() {
    // Buscar facturas rechazadas que no tengan approved_by
    const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
            id, 
            status, 
            vendor_name, 
            admin_comments, 
            user_id,
            approved_by,
            profiles!invoices_user_id_fkey(full_name, branch, area)
        `)
        .eq('status', 'rejected')
        .is('approved_by', null);

    if (error) {
        console.error("Error fetching invoices:", error);
        return;
    }

    console.log(`Found ${invoices.length} rejected invoices missing approved_by.`);

    // Group by branch to see if we can guess the manager
    const branchCounts = {};
    for (const inv of invoices) {
        const branch = inv.profiles?.branch || 'Unknown';
        branchCounts[branch] = (branchCounts[branch] || 0) + 1;
    }

    console.log("Distribution by branch:", branchCounts);
    console.log("\nSample of missing invoices:", JSON.stringify(invoices.slice(0, 3), null, 2));

    // Get managers
    const { data: managers } = await supabase
        .from('profiles')
        .select('id, full_name, role, branch, branches')
        .in('role', ['admin', 'manager', 'branch_manager']);

    console.log("\nManagers available:", managers.map(m => `${m.full_name} (${m.role}) - ${m.branch}`));
}

checkOldRejections();
