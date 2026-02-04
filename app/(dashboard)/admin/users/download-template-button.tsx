'use client'

import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import styles from './style.module.css'

export default function DownloadTemplateButton() {

    function handleDownload() {
        // Headers aligned with action expectations
        const headers = ['email', 'full_name', 'role', 'branch', 'area', 'password', 'monthly_limit', 'cash_limit']

        // Sample data row
        const data = [
            ['ejemplo@email.com', 'Juan Perez', 'user', 'Rafaela', 'Repuestos', 'pass123', 500000, 200000]
        ]

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data])

        // Set column widths for better visibility
        const wscols = [
            { wch: 25 }, // email
            { wch: 20 }, // full_name
            { wch: 10 }, // role
            { wch: 15 }, // branch
            { wch: 15 }, // area
            { wch: 15 }, // password
            { wch: 15 }, // monthly
            { wch: 15 }, // cash
        ];
        ws['!cols'] = wscols;

        // Add AutoFilter (Visual "Table" features)
        ws['!autofilter'] = { ref: "A1:H2" };

        // Create workbook
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla")

        // Download
        XLSX.writeFile(wb, "plantilla_usuarios.xlsx")
    }

    return (
        <button
            type="button"
            onClick={handleDownload}
            className={styles.newButton}
            style={{ backgroundColor: '#64748b', marginRight: '10px' }}
        >
            <Download size={20} />
            Plantilla
        </button>
    )
}
