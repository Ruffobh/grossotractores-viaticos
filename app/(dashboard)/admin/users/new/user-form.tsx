'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './style.module.css'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { createUser } from './actions'
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

            <div className={styles.header}>
                <h1 className={styles.title}>Nuevo Usuario</h1>
                <p className="text-gray-500 mt-2">Crea un nuevo usuario con acceso al sistema.</p>
            </div>

            <div className={styles.card}>
                <form action={createUser} className={styles.formGrid}>

                    {/* Hidden input to pass branches array */}
                    <input type="hidden" name="branches" value={JSON.stringify(selectedBranches)} />

                    <div className={styles.fullWidth}>
                        <label className={styles.label}>Email (Acceso)</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="usuario@grossotractores.com.ar"
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.fullWidth}>
                        <label className={styles.label}>Contraseña Temporal</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.fullWidth}>
                        <label className={styles.label}>Nombre Completo</label>
                        <input
                            name="full_name"
                            placeholder="Juan Perez"
                            className={styles.input}
                            required
                        />
                    </div>

                    <div>
                        <label className={styles.label}>Rol</label>
                        <select name="role" className={styles.input}>
                            <option value="user">Usuario</option>
                            <option value="manager">Encargado de Sucursal</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>

                    <div>
                        <label className={styles.label}>Área</label>
                        <select name="area" className={styles.input} defaultValue="">
                            <option value="" disabled>Seleccionar área...</option>
                            <option value="Administracion">Administracion</option>
                            <option value="Repuestos">Repuestos</option>
                            <option value="Servicios">Servicios</option>
                            <option value="Maquinaria">Maquinaria</option>
                            <option value="Grupo-Staff-Soporte">Grupo-Staff-Soporte</option>
                            <option value="Operaciones">Operaciones</option>
                        </select>
                    </div>

                    <div className={styles.fullWidth}>
                        <label className={styles.label}>Sucursal(es)</label>
                        <MultiSelect
                            options={branchesOptions}
                            selected={selectedBranches}
                            onChange={setSelectedBranches}
                            placeholder="Seleccionar sucursales..."
                        />
                    </div>

                    <div className={styles.fullWidth}>
                        <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800 border-t pt-4">Límites de Gastos</h3>
                    </div>

                    <div>
                        <label className={styles.label}>Límite Tarjeta (ARS)</label>
                        <input
                            type="number"
                            name="monthly_limit"
                            defaultValue={500000}
                            className={styles.input}
                        />
                    </div>

                    <div>
                        <label className={styles.label}>Límite Efectivo/Transf. (ARS)</label>
                        <input
                            type="number"
                            name="cash_limit"
                            defaultValue={200000}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.actions}>
                        <button type="submit" className={styles.saveButton}>
                            <UserPlus size={18} /> Crear Usuario
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
