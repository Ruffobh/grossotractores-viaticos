
import { createAdminClient } from '../app/utils/supabase/admin';

async function run() {
    const supabase = createAdminClient();

    console.log("--- Fetching Invoice ---");
    const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
            id, 
            date, 
            vendor_name, 
            total_amount, 
            currency, 
            user_id,
            invoice_number
        `)
        .eq('invoice_number', '08872-00007728')
        .single();

    if (error) {
        console.error("Error fetching invoice:", error);
        return;
    }
    console.log("Invoice:", invoice);

    console.log("\n--- Fetching User Profile ---");
    const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', invoice.user_id)
        .single();

    console.log("User Profile:", {
        full_name: userProfile.full_name,
        branch: userProfile.branch,
        branches: userProfile.branches
    });

    console.log("\n--- Fetching Managers ---");
    const { data: managers } = await supabase
        .from('profiles')
        .select('full_name, email, role, branch, branches')
        .eq('role', 'branch_manager');

    console.log("Managers found:", managers?.length);
    managers?.forEach(m => {
        console.log(`- ${m.full_name} (${m.email}): Branch=${m.branch}, Branches=${JSON.stringify(m.branches)}`);
    });
}

run();
