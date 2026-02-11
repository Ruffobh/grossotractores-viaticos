'use client'

import { useState, useEffect } from 'react'
import { X, Search, UserPlus, Users, Check, Trash2, AlertCircle } from 'lucide-react'
import { searchProfiles, splitExpense } from '@/app/(dashboard)/expenses/actions'

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Users size={20} /> Dividir Gasto Compartido
                    </h2>
                    <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">

                    <p className="text-gray-600 mb-6 text-sm">
                        Busca y selecciona a los compañeros con los que compartiste este gasto.
                        El sistema dividirá el monto total y creará una copia del comprobante para cada uno.
                    </p>

                    {/* Search */}
                    <div className="relative mb-6">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar usuario por nombre..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        {/* Results Dropdown */}
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                {searchResults.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleSelectUser(user)}
                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between border-b border-gray-100 last:border-0"
                                    >
                                        <div>
                                            <div className="font-medium text-gray-800">{user.full_name}</div>
                                            <div className="text-xs text-gray-500">{user.email} - {user.branch}</div>
                                        </div>
                                        <UserPlus size={16} className="text-blue-600" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Users */}
                    <div className="mb-6">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Participantes ({totalParticipants})</h3>
                        <div className="flex flex-wrap gap-2">
                            {/* Self Chip */}
                            <div className="bg-gray-100/80 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 select-none">
                                <span>Tú (Propietario)</span>
                                <Check size={14} className="text-green-600" />
                            </div>

                            {/* Others */}
                            {selectedUsers.map(user => (
                                <div key={user.id} className="bg-blue-50 border border-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 animate-in zoom-in duration-200">
                                    <span>{user.full_name}</span>
                                    <button
                                        onClick={() => handleRemoveUser(user.id)}
                                        className="hover:bg-blue-200 rounded-full p-0.5 transition"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Calculation Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600">Monto Total Original:</span>
                            <span className="font-medium text-gray-900">${totalAmount.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600">Dividido entre:</span>
                            <span className="font-medium text-gray-900">{totalParticipants} personas</span>
                        </div>
                        <div className="border-t border-gray-200 my-2"></div>
                        <div className="flex justify-between items-center">
                            <span className="text-blue-700 font-semibold">Cada uno paga:</span>
                            <span className="text-xl font-bold text-blue-700">
                                ${amountPerPerson.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 text-sm">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition"
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selectedUsers.length === 0 || isSubmitting}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
                    >
                        {isSubmitting ? 'Procesando...' : 'Confirmar División'}
                    </button>
                </div>
            </div>
        </div>
    )
}
