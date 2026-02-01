'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './style.module.css'
import { ArrowLeft, Save } from 'lucide-react'
import { updateUserProfile } from './actions'
import { MultiSelect } from '@/components/multi-select'
import { AREAS, PERMISSIONS } from '@/app/constants'

interface UserFormProps {
    profile: any
    branchesOptions: { label: string, value: string }[]
}

export default function UserForm({ profile, branchesOptions }: UserFormProps) {
    const [selectedBranches, setSelectedBranches] = useState<string[]>(
        profile.branches || (profile.branch ? [profile.branch] : [])
    )

    // Parse permissions (handle null/string/object safely)
    const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
        try {
            if (!profile.permissions) return {}
            if (typeof profile.permissions === 'string') return JSON.parse(profile.permissions)
            return profile.permissions as Record<string, boolean>
        } catch {
            return {}
        }
    })

    const togglePermission = (key: string) => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }))
    }

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
                    <input type="hidden" name="permissions" value={JSON.stringify(permissions)} />

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
                            <option value="branch_manager">Encargado de Sucursal</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>

                    <div>
                        <label className={styles.label}>Área</label>
                        <select name="area" defaultValue={profile.area || ''} className={styles.input}>
                            <option value="" disabled>Seleccionar área...</option>
                            {AREAS.map(area => (
                                <option key={area} value={area}>{area}</option>
                            ))}
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
                        <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800 border-t pt-4">Permisos Adicionales</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Otorga capacidades especiales a usuarios que no son administradores.
                        </p>
                        <div className="space-y-3">
                            {PERMISSIONS.map((perm) => (
                                <div key={perm.key} className="flex items-start items-center space-x-3 p-3 bg-gray-50 rounded-md border border-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={!!permissions[perm.key]}
                                        onChange={() => togglePermission(perm.key)}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                        id={`perm-${perm.key}`}
                                        name={`perm-${perm.key}`} // dummy name
                                    />
                                    <label htmlFor={`perm-${perm.key}`} className="cursor-pointer flex-1">
                                        <div className="font-medium text-sm text-gray-900">{perm.label}</div>
                                        <div className="text-xs text-gray-500">{perm.description}</div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.fullWidth}>
                        <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800 border-t pt-4">Límites de Gastos</h3>
                    </div>

                    <div>
                        <label className={styles.label}>Límite Tarjeta (ARS)</label>
                        <input
                            type="number"
                            name="monthly_limit"
                            defaultValue={profile.monthly_limit || 0}
                            className={styles.input}
                        />
                    </div>

                    <div>
                        <label className={styles.label}>Límite Efectivo/Transf. (ARS)</label>
                        <input
                            type="number"
                            name="cash_limit"
                            defaultValue={profile.cash_limit || 0}
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
