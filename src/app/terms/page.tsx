import { Shield, ArrowLeft, FileCheck, Scale, AlertCircle, Mail } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
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
                        <div className="bg-indigo-50 p-3 rounded-2xl">
                            <Scale className="w-8 h-8 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                                Condiciones del Servicio
                            </h1>
                            <p className="text-slate-500 font-medium">Última actualización: 7 de Marzo, 2026</p>
                        </div>
                    </div>

                    <div className="prose prose-slate max-w-none space-y-8">
                        <section className="space-y-4">
                            <p className="text-slate-600 leading-relaxed text-lg">
                                Al utilizar <strong>SocialAutoPyme</strong>, aceptas cumplir con estos términos. Por favor, léelos atentamente para entender tus responsabilidades y nuestros compromisos.
                            </p>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                <FileCheck className="w-6 h-6 text-indigo-500" />
                                <h3 className="font-bold text-slate-900">Uso Autorizado</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Esta herramienta es para uso profesional y comercial. Eres el único responsable del contenido que programas y publicas.
                                </p>
                            </div>
                            <div className="p-6 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-3">
                                <AlertCircle className="w-6 h-6 text-amber-600" />
                                <h3 className="font-bold text-slate-900">Límite de Responsabilidad</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    No nos hacemos responsables por suspensiones de cuenta resultantes del uso indebido de las políticas de cada red social.
                                </p>
                            </div>
                        </div>

                        <section className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Shield className="w-5 h-5 text-indigo-500" />
                                Conectividad con Terceros
                            </h2>
                            <p className="text-slate-600">
                                Nuestra plataforma interactúa con LinkedIn, TikTok y Meta (Facebook/Instagram). Al usar SocialAutoPyme, también te comprometes a seguir las condiciones de servicio de dichas plataformas:
                            </p>
                            <ul className="list-disc pl-5 space-y-2 text-slate-600">
                                <li>Condiciones de Servicio de YouTube/Google (si aplica)</li>
                                <li>Condiciones de Servicio de Meta</li>
                                <li>Condiciones de Servicio de TikTok</li>
                                <li>Condiciones de Servicio de LinkedIn</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-xl font-bold">Propiedad Intelectual</h2>
                            <p className="text-slate-600">
                                El contenido generado por la IA dentro de nuestra plataforma es para tu uso exclusivo. SocialAutoPyme no reclama derechos sobre el contenido final publicado en tus redes.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-xl font-bold">Modificaciones</h2>
                            <p className="text-slate-600">
                                Nos reservamos el derecho de modificar estos términos en cualquier momento. El uso continuado de la aplicación tras dichos cambios constituye tu aceptación de los nuevos términos.
                            </p>
                        </section>

                        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <Mail className="w-4 h-4" />
                                contacto@socialautopyme.com
                            </div>
                            <div className="text-slate-400 text-sm font-medium">
                                SocialAutoPyme v1.1.0
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
