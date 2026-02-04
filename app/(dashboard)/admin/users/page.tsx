import DownloadTemplateButton from './download-template-button'

// ... (inside the component)

            <div className={styles.header}>
                <h1 className={styles.title}>Gestión de Usuarios</h1>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <DownloadTemplateButton />
                    <Link href="/admin/users/batch" className={styles.newButton} style={{ backgroundColor: '#10b981', marginRight: '10px' }}>
                        <FileUp size={20} />
                        Importar
                    </Link>
                    <Link href="/admin/users/new" className={styles.newButton}>
                        <UserPlus size={20} />
                        Nuevo Usuario
                    </Link>
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Sucursal</th>
                            <th>Área</th>
                            <th>Límite TC</th>
                            <th>Consumo TC</th>
                            <th>Límite EF</th>
                            <th>Consumo EF</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {profiles?.map((profile) => {
                            const userConsumption = consumptionMap.get(profile.id) || { card: 0, cash: 0 }

                            const limitCard = profile.monthly_limit || 0
                            const limitCash = profile.cash_limit || 0

                            const cardExceeded = userConsumption.card > limitCard
                            const cashExceeded = userConsumption.cash > limitCash

                            return (
                                <tr key={profile.id}>
                                    <td data-label="Nombre" className="font-bold">{profile.full_name || 'Sin Nombre'}</td>
                                    <td data-label="Email" className={styles.emailCell} title={profile.email}>{profile.email}</td>
                                    <td data-label="Rol">
                                        <span className={`${styles.badge} ${profile.role === 'branch_manager' ? styles.manager :
                                            styles[profile.role || 'user']
                                            }`}>
                                            {profile.role === 'branch_manager' ? 'MANAGER' : (profile.role || 'user')}
                                        </span>
                                    </td>
                                    <td data-label="Sucursal">{profile.branch || '-'}</td>
                                    <td data-label="Área">{profile.area || '-'}</td>

                                    {/* Credit Card Stats */}
                                    <td data-label="Límite TC">${limitCard.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                    <td data-label="Consumo TC" style={{
                                        color: cardExceeded ? '#ef4444' : 'inherit',
                                        fontWeight: cardExceeded ? '800' : 'normal'
                                    }}>
                                        ${userConsumption.card.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </td>

                                    {/* Cash Stats */}
                                    <td data-label="Límite EF">${limitCash.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                    <td data-label="Consumo EF" style={{
                                        color: cashExceeded ? '#ef4444' : 'inherit',
                                        fontWeight: cashExceeded ? '800' : 'normal'
                                    }}>
                                        ${userConsumption.cash.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </td>

                                    <td data-label="Acciones">
                                        <div className={styles.actions}>
                                            <Link href={`/admin/users/${profile.id}`} className={styles.editButton}>
                                                <Edit size={16} /> Editar
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div >
    )
}
