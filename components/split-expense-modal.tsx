import { useState, useEffect } from 'react'
import { X, Search, UserPlus, Users, Check, Trash2, AlertCircle } from 'lucide-react'
import { searchProfiles, splitExpense } from '@/app/(dashboard)/expenses/actions'
import styles from './SplitExpenseModal.module.css'

interface Profile {
    id: string
    full_name: string
    email: string
    branch: string
}

interface SplitExpenseModalProps {
    invoiceId: string
    totalAmount: number
    onClose: () => void
    onSuccess: () => void
}

export function SplitExpenseModal({ invoiceId, totalAmount, onClose, onSuccess }: SplitExpenseModalProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [searchResults, setSearchResults] = useState<Profile[]>([])
    const [selectedUsers, setSelectedUsers] = useState<Profile[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.length >= 2) {
                setIsSearching(true)
                const results = await searchProfiles(searchTerm)
                // Filter out already selected users
                const filtered = results.filter(r => !selectedUsers.find(s => s.id === r.id))
                setSearchResults(filtered)
                setIsSearching(false)
            } else {
                setSearchResults([])
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [searchTerm, selectedUsers])

    const handleSelectUser = (user: Profile) => {
        if (selectedUsers.find(u => u.id === user.id)) return
        setSelectedUsers([...selectedUsers, user])
        setSearchTerm('')
        setSearchResults([])
    }

    const handleRemoveUser = (userId: string) => {
        setSelectedUsers(selectedUsers.filter(u => u.id !== userId))
    }

    const handleConfirm = async () => {
        if (selectedUsers.length === 0) return

        setIsSubmitting(true)
        setError('')

        const targetIds = selectedUsers.map(u => u.id)
        const res = await splitExpense(invoiceId, targetIds)

        setIsSubmitting(false)

        if (res.error) {
            setError(res.error)
        } else {
            onSuccess()
        }
    }

    const totalParticipants = selectedUsers.length + 1 // +1 for self
    const amountPerPerson = totalAmount / totalParticipants

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>

                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        <Users size={20} /> Dividir Gasto Compartido
                    </h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className={styles.body}>

                    <p className={styles.description}>
                        Busca y selecciona a los compañeros con los que compartiste este gasto.
                        El sistema dividirá el monto total y creará una copia del comprobante para cada uno.
                    </p>

                    {/* Search */}
                    <div className={styles.searchContainer}>
                        <div className={styles.searchIcon}>
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar usuario por nombre..."
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        {/* Results Dropdown */}
                        {searchResults.length > 0 && (
                            <div className={styles.searchResults}>
                                {searchResults.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleSelectUser(user)}
                                        className={styles.searchResultItem}
                                    >
                                        <div>
                                            <span className={styles.userName}>{user.full_name}</span>
                                            <span className={styles.userMeta}>{user.email} - {user.branch}</span>
                                        </div>
                                        <UserPlus size={16} color="#004589" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Users */}
                    <div className={styles.participantsSection}>
                        <h3 className={styles.participantsTitle}>Participantes ({totalParticipants})</h3>
                        <div className={styles.chipsContainer}>
                            {/* Self Chip */}
                            <div className={`${styles.chip} ${styles.chipSelf}`}>
                                <span>Tú (Propietario)</span>
                                <Check size={14} className={styles.checkIcon} />
                            </div>

                            {/* Others */}
                            {selectedUsers.map(user => (
                                <div key={user.id} className={`${styles.chip} ${styles.chipUser}`}>
                                    <span>{user.full_name}</span>
                                    <button
                                        onClick={() => handleRemoveUser(user.id)}
                                        className={styles.removeButton}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Calculation Summary */}
                    <div className={styles.summary}>
                        <div className={styles.summaryRow}>
                            <span className={styles.summaryLabel}>Monto Total Original:</span>
                            <span className={styles.summaryValue}>${totalAmount.toLocaleString('es-AR')}</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span className={styles.summaryLabel}>Dividido entre:</span>
                            <span className={styles.summaryValue}>{totalParticipants} personas</span>
                        </div>
                        <div className={styles.divider}></div>
                        <div className={styles.totalRow}>
                            <span className={styles.totalLabel}>Cada uno paga:</span>
                            <span className={styles.totalValue}>
                                ${amountPerPerson.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {error && (
                        <div className={styles.error}>
                            <AlertCircle size={16} className={styles.errorIcon} />
                            <span>{error}</span>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button
                        onClick={onClose}
                        className={styles.cancelBtn}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selectedUsers.length === 0 || isSubmitting}
                        className={styles.confirmBtn}
                    >
                        {isSubmitting ? 'Procesando...' : 'Confirmar División'}
                    </button>
                </div>
            </div>
        </div>
    )
}
