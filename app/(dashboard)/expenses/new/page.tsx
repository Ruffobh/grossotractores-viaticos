'use client'

import { useState, useRef } from 'react'
import { UploadCloud, Camera, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { processReceipt } from '../actions' // We will create this
import styles from './style.module.css'

export default function NewExpensePage() {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadStatus, setUploadStatus] = useState<string>('')

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await handleUpload(e.target.files[0])
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await handleUpload(e.dataTransfer.files[0])
        }
    }

    const handleUpload = async (file: File) => {
        try {
            setIsUploading(true)
            setUploadStatus('Subiendo imagen...')

            const supabase = createClient()

            // 1. Upload to Supabase Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('receipts')
                .getPublicUrl(filePath)

            setUploadStatus('Procesando comprobante con IA...')

            // 3. Call Server Action to process with Gemini
            // The action will redirect on success, or return { error } on failure.
            const result = await processReceipt(publicUrl)

            if (result && result.error) {
                throw new Error(result.error)
            }

            // If we get here without result (void) or without error, it means redirect happened or is happening.
            // But usually redirect stops execution of the client function if it causes unmount? 
            // Actually, server action redirect might result in a void return to client, then client router takes over.
            setUploadStatus('¡Completado! Redirigiendo...')

            // We don't need manual router.push anymore, but keeping a fallback just in case isn't bad if we had ID.
            // But since we removed ID return, we just wait.

        } catch (error: any) {
            console.error('Error:', error)
            alert('Error al subir el comprobante: ' + error.message)
            setIsUploading(false)
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Nuevo Comprobante</h1>
                <p className="text-gray-500">Sube una foto o PDF de tu gasto</p>
            </div>

            <div
                className={`${styles.uploadArea} ${isDragging ? styles.dragging : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                {isUploading ? (
                    <div className="flex flex-col items-center justify-center p-8">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                        <p className="text-lg font-medium text-gray-700">{uploadStatus}</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-center mb-4 gap-4">
                            <Camera size={48} className={styles.icon} />
                            <UploadCloud size={48} className={styles.icon} />
                        </div>
                        <p className={styles.uploadText}>
                            Haz clic para seleccionar o arrastra un archivo aquí
                        </p>
                        <p className={styles.uploadSubtext}>
                            Soporta JPG, PNG, PDF
                        </p>
                    </>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment" // Opens camera on mobile
                    className={styles.fileInput}
                    onChange={handleFileSelect}
                    disabled={isUploading}
                />
            </div>
        </div>
    )
}
