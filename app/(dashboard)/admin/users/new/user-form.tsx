'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './style.module.css'
import { ArrowLeft } from 'lucide-react'
// import { createUser } from './actions'
import { MultiSelect } from '@/components/multi-select'

interface NewUserFormProps {
    branchesOptions: { label: string, value: string }[]
}

export default function NewUserForm({ branchesOptions }: NewUserFormProps) {
    const [selectedBranches, setSelectedBranches] = useState<string[]>([])

    return (
        <div className={styles.container}>
            <Link href="/admin/users" className={styles.backLink}>
                <ArrowLeft size={16} /> Volver a la lista
            </Link>
            <div className="p-4 border rounded bg-white">
                <h2 className="text-xl font-bold">Formulario Simplificado de Prueba</h2>
                <p>Si ves esto, el componente MultiSelect funciona bien.</p>
                <div style={{ maxWidth: '400px', marginTop: '20px' }}>
                    <MultiSelect
                        options={branchesOptions}
                        selected={selectedBranches}
                        onChange={setSelectedBranches}
                    />
                </div>
            </div>
        </div>
    )
}
