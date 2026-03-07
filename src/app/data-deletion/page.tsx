import { Shield, ArrowLeft, Trash2, Mail, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function DataDeletionPage() {
    return (
        <main className="min-h-screen bg-[#f8fafc] text-slate-900 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header Navigation */}
                <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-semibold">
                    <ArrowLeft className="w-4 h-4" />
                    Volver al Inicio
                </Link>

                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200/60 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="bg-red-50 p-3 rounded-2xl">
                            <Trash2 className="w-8 h-8 text-red-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                                Eliminación de Datos
                            </h1>
                            <p className="text-slate-500 font-medium">Instrucciones para la revocación de acceso y borrado de información</p>
                        </div>
                    </div>

                    <div className="prose prose-slate max-w-none space-y-6">
                        <section className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-500" />
                                Compromiso de Privacidad
                            </h2>
                            <p className="text-slate-600 leading-relaxed">
                                En <strong>SocialAutoPyme</strong>, valoramos tu control sobre tus datos personales. Conforme a las normativas de plataformas como Meta (Facebook/Instagram), LinkedIn y TikTok, proporcionamos un método claro y directo para eliminar tu información de nuestros sistemas.
                            </p>
                        </section>

                        <section className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                            <h2 className="text-xl font-bold text-slate-900">¿Cómo eliminar tus datos?</h2>
                            <p className="text-slate-600">
                                Tienes dos formas de proceder con la eliminación de tus datos asociados a esta aplicación:
                            </p>

                            <div className="space-y-4 pt-2">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">Eliminación Automática (Recomendado)</h3>
                                        <p className="text-slate-600 text-sm">
                                            Inicia sesión en el panel principal y usa el botón <strong>"Cerrar Sesión Global"</strong> o los botones de <strong>"DESCONECTAR"</strong> en cada red. Al hacer esto, nuestros sistemas eliminan inmediatamente los tokens de acceso de tu base de datos.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">Solicitud Directa</h3>
                                        <p className="text-slate-600 text-sm">
                                            Si deseas que eliminemos toda traza de tu usuario (nombre, email y preferencias) de forma definitiva de nuestros servidores, envía un correo a:
                                        </p>
                                        <a href="mailto:soporte@socialautopyme.com" className="inline-flex items-center gap-2 mt-2 text-blue-600 font-bold hover:underline">
                                            <Mail className="w-4 h-4" />
                                            pyme-soporte@socialautopyme.com
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-xl font-bold">Información que se elimina</h2>
                            <ul className="list-disc pl-5 space-y-2 text-slate-600">
                                <li>Tokens de acceso de OAuth de todas las plataformas.</li>
                                <li>Historial de publicaciones generadas por IA.</li>
                                <li>Configuraciones de perfil y correo electrónico de contacto.</li>
                                <li>Archivos multimedia subidos (a solicitud).</li>
                            </ul>
                        </section>

                        <div className="pt-8 border-t border-slate-100 text-center">
                            <p className="text-sm text-slate-400">
                                SocialAutoPyme cumple con los requisitos de <strong>Facebook Data Deletion Callback</strong>.
                                <br />
                                Tiempo de procesamiento: Inmediato (Automático) / 48h (Manual).
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
