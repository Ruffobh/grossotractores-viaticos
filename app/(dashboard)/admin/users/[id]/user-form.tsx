'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './style.module.css'
import { ArrowLeft, Save } from 'lucide-react'
import { updateUserProfile } from './actions'
import { MultiSelect } from '@/components/multi-select'

interface UserFormProps {
    profile: any
    branchesOptions: { label: string, value: string }[]
}

export default function UserForm({ profile, branchesOptions }: UserFormProps) {
    const [selectedBranches, setSelectedBranches] = useState<string[]>(
        profile.branches || (profile.branch ? [profile.branch] : [])
    )

    return (
        <div className={styles.container}>
            <Link href="/admin/users" className={styles.backLink}>
                <ArrowLeft size={16} /> Volver a la lista
            </Link>

            <div className={styles.header}>
                <h1 className={styles.title}>Editar Usuario: {profile.full_name}</h1>
            </div>

            <div className={styles.card}>
                <form action={updateUserProfile} className={styles.formGrid}>
                    <input type="hidden" name="id" value={profile.id} />

                    {/* Hidden input to pass branches array */}
                    <input type="hidden" name="branches" value={JSON.stringify(selectedBranches)} />

                    <div className={styles.fullWidth}>
                        <label className={styles.label}>Nombre Completo</label>
                        <input
                            name="full_name"
                            defaultValue={profile.full_name || ''}
                            className={styles.input}
                            required
                        />
                    </div>

                    <div>
                        <label className={styles.label}>Rol</label>
                        <select name="role" defaultValue={profile.role || 'user'} className={styles.input}>
                            <option value="user">Usuario</option>
                            <option value="manager">Encargado de Sucursal</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>

                    <div>
                        <label className={styles.label}>Sucursal(es)</label>
                        <MultiSelect
                            options={branchesOptions}
                            selected={selectedBranches}
                            onChange={setSelectedBranches}
                            placeholder="Seleccionar sucursales..."
                        />
                    </div>

                    <div>
                        <label className={styles.label}>Área</label>
                        <input
                            name="area"
                            defaultValue={profile.area || ''}
                            className={styles.input}
                        />
                    </div>

                    <div>
                        <label className={styles.label}>Límite Mensual (ARS)</label>
                        <input
                            type="number"
                            name="monthly_limit"
                            defaultValue={profile.monthly_limit || 0}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.fullWidth}>
                        <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800 border-t pt-4">Seguridad</h3>
                        <label className={styles.label}>Nueva Contraseña (Opcional)</label>
                        <input
                            type="password"
                            name="new_password"
                            placeholder="Dejar en blanco para mantener la actual"
                            className={styles.input}
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Escribe aquí solamente si deseas cambiar la contraseña del usuario.
                        </p>
                    </div>

                    <div className={styles.actions}>
                        <button type="submit" className={styles.saveButton}>
                            <Save size={18} /> Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
