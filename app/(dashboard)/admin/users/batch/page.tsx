'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Upload, FileUp, AlertCircle, CheckCircle } from 'lucide-react'
import styles from './style.module.css'
import { processBatchUsers } from './actions'

export default function BatchImportPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<{ success?: number, failed?: number, errors?: string[] } | null>(null)

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setResult(null)
        try {
            const res = await processBatchUsers(formData)
            setResult(res)
        } catch (e) {
            setResult({ errors: ['Error inesperado al procesar el archivo.'] })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <Link href="/admin/users" className="inline-flex items-center gap-2 text-gray-600 mb-6 hover:text-blue-600">
                <ArrowLeft size={16} /> Volver a Usuarios
            </Link>

            <div className="bg-white rounded-lg border shadow-sm p-8">
                <div className="flex items-center gap-4 mb-6 border-b pb-6">
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                        <FileUp size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Importación Masiva de Usuarios</h1>
                        <p className="text-gray-500">Sube un archivo CSV para crear múltiples usuarios a la vez.</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Instructions */}
                    <div className="space-y-4 text-sm text-gray-600">
                        <h3 className="font-semibold text-gray-900 text-base">Requisitos del Archivo</h3>
                        <p>El archivo debe ser formato <strong>.CSV</strong> (separado por comas o punto y coma) con las siguientes columnas:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>email</strong> (Obligatorio)</li>
                            <li><strong>full_name</strong> (Obligatorio)</li>
                            <li><strong>role</strong> (admin, manager, user)</li>
                            <li><strong>branch</strong> (Nombre exacto de la sucursal)</li>
                            <li><strong>area</strong> (Nombre exacto del área)</li>
                            <li><strong>password</strong> (Mínimo 6 caracteres)</li>
                            <li><strong>monthly_limit</strong> (Númérico, ej: 500000)</li>
                            <li><strong>cash_limit</strong> (Númérico, ej: 200000)</li>
                        </ul>
                        <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-yellow-800 text-xs">
                            Nota: Si el correo ya existe, el usuario será omitido.
                        </div>
                    </div>

                    {/* Upload Form */}
                    <div>
                        <form action={handleSubmit} className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
                                <input
                                    type="file"
                                    name="file"
                                    accept=".csv"
                                    required
                                    className="w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                                />
                                <p className="mt-2 text-xs text-gray-400">Solo archivos .csv</p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Procesando...' : (
                                    <>
                                        <Upload size={18} /> Importar Usuarios
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Results */}
                {result && (
                    <div className={`mt-8 p-4 rounded-lg border ${result.errors && result.errors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <h3 className={`font-bold mb-2 ${result.errors && result.errors.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
                            Resultado de la Importación
                        </h3>

                        {result.success !== undefined && (
                            <div className="flex gap-4 mb-2">
                                <span className="flex items-center gap-1 text-green-700"><CheckCircle size={16} /> {result.success} Creados</span>
                                <span className="flex items-center gap-1 text-red-600"><AlertCircle size={16} /> {result.failed} Fallidos</span>
                            </div>
                        )}

                        {result.errors && result.errors.length > 0 && (
                            <div className="mt-2">
                                <p className="font-semibold text-red-700 text-sm">Errores:</p>
                                <ul className="list-disc pl-5 mt-1 text-sm text-red-600 max-h-40 overflow-y-auto">
                                    {result.errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
