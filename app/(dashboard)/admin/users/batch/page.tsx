'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Upload, FileUp, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react'
import styles from './style.module.css'
import { processBatchUsers } from './actions'
import * as XLSX from 'xlsx'

export default function BatchImportPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [parsedData, setParsedData] = useState<any[] | null>(null)
    const [result, setResult] = useState<{ success?: number, failed?: number, errors?: string[] } | null>(null)

    // Handle File Selection and Parsing
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (evt) => {
            const bstr = evt.target?.result
            const wb = XLSX.read(bstr, { type: 'binary' })
            const wsname = wb.SheetNames[0]
            const ws = wb.Sheets[wsname]
            const data = XLSX.utils.sheet_to_json(ws)
            setParsedData(data)
            setResult(null) // Reset previous results
        }
        reader.readAsBinaryString(file)
    }

    // Submit Parsed Data to Server
    async function handleSubmit() {
        if (!parsedData || parsedData.length === 0) return

        setIsLoading(true)
        setResult(null)
        try {
            const res = await processBatchUsers(parsedData)
            setResult(res)
            if (res.success && res.success > 0) {
                setParsedData(null) // Clear preview on success
            }
        } catch (e) {
            setResult({ errors: ['Error inesperado al procesar los datos.'] })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <Link href="/admin/users" className="inline-flex items-center gap-2 text-gray-600 mb-6 hover:text-blue-600">
                <ArrowLeft size={16} /> Volver a Usuarios
            </Link>

            <div className="bg-white rounded-lg border shadow-sm p-8">
                <div className="flex items-center gap-4 mb-6 border-b pb-6">
                    <div className="p-3 bg-green-50 rounded-full text-green-600">
                        <FileSpreadsheet size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Importación Masiva de Usuarios (Excel)</h1>
                        <p className="text-gray-500">Sube un archivo Excel (.xlsx) o CSV. Revisa la vista previa antes de confirmar.</p>
                    </div>
                </div>

                {!parsedData ? (
                    // Upload State
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4 text-sm text-gray-600">
                            <h3 className="font-semibold text-gray-900 text-base">Instrucciones</h3>
                            <p>1. Descarga la <strong>Plantilla</strong> desde la lista de usuarios.</p>
                            <p>2. Rellena los datos respetando las columnas.</p>
                            <p>3. Sube el archivo aquí.</p>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                                <li><strong>email</strong>: Único en el sistema.</li>
                                <li><strong>rol</strong>: admin, manager, user.</li>
                                <li><strong>sucursal / area</strong>: Deben escribirse tal cual.</li>
                            </ul>
                        </div>

                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition-colors">
                            <input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                <Upload size={40} className="text-gray-400" />
                                <span className="text-blue-600 font-semibold hover:underline">Seleccionar archivo Excel/CSV</span>
                                <span className="text-xs text-gray-400">.xlsx, .xls, .csv</span>
                            </label>
                        </div>
                    </div>
                ) : (
                    // Preview State
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">Vista Previa ({parsedData.length} registros)</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setParsedData(null); setResult(null); }}
                                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded border"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded shadow disabled:opacity-50"
                                >
                                    {isLoading ? 'Procesando...' : <><Upload size={16} /> Confirmar Importación</>}
                                </button>
                            </div>
                        </div>

                        <div className="overflow-auto max-h-96 border rounded-lg">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                                    <tr>
                                        {Object.keys(parsedData[0] || {}).map(header => (
                                            <th key={header} className="px-6 py-3 border-b">{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.map((row, i) => (
                                        <tr key={i} className="bg-white border-b hover:bg-gray-50">
                                            {Object.values(row).map((val: any, j) => (
                                                <td key={j} className="px-6 py-4">{String(val)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className={`mt-8 p-6 rounded-lg border ${result.errors && result.errors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <h3 className={`font-bold mb-2 ${result.errors && result.errors.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
                            Resultado de la Importación
                        </h3>

                        {result.success !== undefined && (
                            <div className="flex gap-6 mb-4 font-medium">
                                <span className="flex items-center gap-2 text-green-700"><CheckCircle size={20} /> {result.success} Creados Exitosamente</span>
                                <span className="flex items-center gap-2 text-red-600"><AlertCircle size={20} /> {result.failed} Fallidos</span>
                            </div>
                        )}

                        {result.errors && result.errors.length > 0 && (
                            <div className="mt-4">
                                <p className="font-semibold text-red-700 text-sm mb-2">Detalle de Errores:</p>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-red-600 max-h-60 overflow-y-auto bg-white p-4 rounded border border-red-100">
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
