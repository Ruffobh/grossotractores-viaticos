import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function DebugPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Security: Only allow if authenticated (any user can help debug, but checking auth is good practice)
    if (!user) {
        return <div className="p-10 text-red-500">Acceso Denegado. Inicia sesión primero.</div>
    }

    const envStatus = {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Definido' : '❌ Falta',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Definido' : '❌ Falta',
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? `✅ Definido (Empieza con: ${process.env.GOOGLE_API_KEY.substring(0, 4)}...)` : '❌ FALTA',
        RESEND_API_KEY: process.env.RESEND_API_KEY ? `✅ Definido (Empieza con: ${process.env.RESEND_API_KEY.substring(0, 4)}...)` : '❌ FALTA',
    }

    const allKeys = Object.keys(process.env).sort()

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold mb-4">Diagnóstico de Variables de Entorno</h1>

            <div className="border p-4 rounded-lg bg-gray-50 shadow">
                <h2 className="text-lg font-semibold mb-2">Variables Críticas</h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(envStatus).map(([key, value]) => (
                        <div key={key} className="contents">
                            <div className="font-mono text-gray-600 border-b py-2">{key}</div>
                            <div className={`font-mono border-b py-2 ${value.includes('❌') ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                                {value}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="border p-4 rounded-lg bg-gray-50 shadow">
                <h2 className="text-lg font-semibold mb-2">Todas las Keys visibles en Runtime</h2>
                <p className="text-xs text-gray-500 mb-2">Estas son todas las claves que Node.js detecta en process.env:</p>
                <div className="bg-black text-white p-4 rounded text-xs font-mono overflow-auto max-h-60">
                    {allKeys.join('\n')}
                </div>
            </div>

            <p className="text-sm text-gray-500">
                Nota: Si ves '❌ FALTA' en GOOGLE_API_KEY, significa que Hostinger no la está pasando al proceso de Node.js.
                Asegúrate de que no tenga espacios y reinicia el servicio completamnete.
            </p>
        </div>
    )
}
