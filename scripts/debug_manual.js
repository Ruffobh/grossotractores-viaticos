
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

// Hardcoded envs from .env.local view (for this temporary run)
const SUPABASE_URL = 'https://yagyzvvupixmjovyzveu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZ3l6dnZ1cGl4bWpvdnl6dmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODMzODgsImV4cCI6MjA4NDU1OTM4OH0.pKkc_SsF4nrjQGWeSO--gtkYuYMMdcK4ZiOnMcnpkTM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    console.log("--- Fetching Recent Invoices ---");
    const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`*`)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error || !invoices) {
        console.error("Error fetching invoices:", error);
        return;
    }

    console.log("Recent Invoices:");
    invoices.forEach(inv => {
        console.log(`- ID: ${inv.id}`);
        console.log(`  Number: '${inv.invoice_number}'`);
        console.log(`  Vendor: ${inv.vendor_name}`);
        console.log(`  Total: ${inv.total_amount}`);
        console.log(`  User: ${inv.user_id}`);
        console.log('-------------------');
    });
}

run();
