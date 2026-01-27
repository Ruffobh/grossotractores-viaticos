'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import styles from './multi-select.module.css'

interface Option {
    label: string
    value: string
}

interface MultiSelectProps {
    options: Option[]
    selected: string[]
    onChange: (selected: string[]) => void
    placeholder?: string
}

export function MultiSelect({ options, selected, onChange, placeholder = 'Seleccionar...' }: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggleOption = (value: string) => {
        const newSelected = selected.includes(value)
            ? selected.filter(item => item !== value)
            : [...selected, value]
        onChange(newSelected)
    }

    return (
        <div className={styles.container} ref={containerRef}>
            <div className={styles.trigger} onClick={() => setIsOpen(!isOpen)}>
                <span className={selected.length === 0 ? styles.placeholder : ''}>
                    {selected.length === 0
                        ? placeholder
                        : selected.length === 1
                            ? options.find(o => o.value === selected[0])?.label
                            : `${selected.length} seleccionados`}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {selected.length > 0 && (
                        <span className={styles.count}>{selected.length}</span>
                    )}
                    <ChevronDown size={16} className="text-gray-400" />
                </div>
            </div>

            {isOpen && (
                <div className={styles.dropdown}>
                    {options.map((option) => (
                        <div
                            key={option.value}
                            className={`${styles.option} ${selected.includes(option.value) ? styles.selected : ''}`}
                            onClick={() => toggleOption(option.value)}
                        >
                            <div className={styles.checkbox}>
                                {selected.includes(option.value) && <Check size={12} />}
                            </div>
                            <span>{option.label}</span>
                        </div>
                    ))}
                    {options.length === 0 && (
                        <div className="p-2 text-sm text-gray-500 text-center">No hay opciones</div>
                    )}
                </div>
            )}
        </div>
    )
}
