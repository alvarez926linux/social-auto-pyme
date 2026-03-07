import { Shield, ArrowLeft, Lock, Eye, FileText, Mail } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-[#f8fafc] text-slate-900 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header Navigation */}
                <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-semibold">
                    <ArrowLeft className="w-4 h-4" />
                    Volver al Inicio
                </Link>

                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200/60 space-y-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-50 p-3 rounded-2xl">
                            <Lock className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                                Política de Privacidad
                            </h1>
                            <p className="text-slate-500 font-medium">Última actualización: 7 de Marzo, 2026</p>
                        </div>
                    </div>

                    <div className="prose prose-slate max-w-none space-y-8">
                        <section className="space-y-4">
                            <p className="text-slate-600 leading-relaxed text-lg italic">
                                En SocialAutoPyme, tu privacidad es nuestra prioridad. Esta política explica de forma clara cómo manejamos tus datos al interactuar con nuestras herramientas de automatización.
                            </p>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                <Eye className="w-6 h-6 text-blue-500" />
                                <h3 className="font-bold text-slate-900">¿Qué recopilamos?</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Información de perfil público (nombre, email y foto) proporcionada por LinkedIn, Facebook o TikTok para identificar tu cuenta.
                                </p>
                            </div>
                            <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                                <Lock className="w-6 h-6 text-blue-600" />
                                <h3 className="font-bold text-slate-900">¿Cómo lo protegemos?</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Tus tokens de acceso se almacenan de forma segura y encriptada, utilizándose únicamente para el propósito que autorizaste.
                                </p>
                            </div>
                        </div>

                        <section className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-500" />
                                Uso de los Datos
                            </h2>
                            <p className="text-slate-600">
                                Los datos obtenidos a través de las APIs oficiales de las redes sociales se utilizan estrictamente para:
                            </p>
                            <ul className="list-disc pl-5 space-y-2 text-slate-600">
                                <li>Gestionar la conexión de tus perfiles comerciales.</li>
                                <li>Programar y publicar el contenido generado en esta plataforma.</li>
                                <li>Personalizar tu experiencia dentro del centro de mando.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-xl font-bold">Transferencia de Datos</h2>
                            <p className="text-slate-600">
                                <strong>SocialAutoPyme NO vende, alquila ni comparte tus datos personales</strong> con terceros fuera de las plataformas necesarias para el funcionamiento del servicio (Meta, TikTok, LinkedIn y proveedores de IA).
                            </p>
                        </section>

                        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <Mail className="w-4 h-4" />
                                privacidad@socialautopyme.com
                            </div>
                            <Link href="/data-deletion" className="text-blue-600 font-bold hover:underline text-sm">
                                Instrucciones de Eliminación de Datos
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
