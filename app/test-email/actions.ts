'use server'

import { sendAdminAlert, sendManagerNotification } from '@/app/utils/mail'
import { createClient } from '@/utils/supabase/server'

export async function testAdminAlert(formData: FormData) {
    const email = formData.get('email') as string

    // Mock Data simulating an expense that Exceeds Budget
    const mockExpense = {
        id: 'test-admin-alert-id',
        date: new Date().toISOString(),
        vendor_name: 'Proveedor de Prueba S.A.',
        total_amount: 150000.50,
        currency: 'ARS',
        user_name: 'Usuario Prueba',
        user_id: 'test-user-id',
        area: 'Comercial'
    }

    const result = await sendAdminAlert(mockExpense, email)
    return result
}

export async function testManagerNotification(formData: FormData) {
    const email = formData.get('email') as string

    // Mock Data simulating an Auto-Approved expense
    const mockExpense = {
        id: 'test-manager-alert-id',
        date: new Date().toISOString(),
        vendor_name: 'Proveedor Aprobado SRL',
        total_amount: 4500.00,
        currency: 'ARS',
        user_name: 'Usuario Prueba',
        user_id: 'test-user-id',
        area: 'Servicios'
    }

    // Pass email as override
    const result = await sendManagerNotification(mockExpense, email)
    return result
}
