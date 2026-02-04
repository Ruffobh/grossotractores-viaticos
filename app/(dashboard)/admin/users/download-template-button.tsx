'use client'

import { Download } from 'lucide-react'
import styles from './style.module.css'

export default function DownloadTemplateButton() {

    function handleDownload() {
        const headers = ['email', 'full_name', 'role', 'branch', 'area', 'password', 'monthly_limit', 'cash_limit']
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" +
            "ejemplo@email.com,Juan Perez,user,Rafaela,Repuestos,pass123,500000,200000"

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", "plantilla_usuarios.csv")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
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
