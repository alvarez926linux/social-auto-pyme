"use client";

import { useState, useEffect } from "react";
import MediaUploader from "@/components/MediaUploader";
import PostList from "@/components/PostList";
import { GeneratedPost } from "@/services/ai.service";
import { Linkedin, Facebook, Instagram, Music2, Sparkles, LayoutDashboard } from "lucide-react";
import { signIn, useSession, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, update: updateSession } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["linkedin"]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [igMessage, setIgMessage] = useState<string | null>(null);

  // Detectar resultado del flujo de vinculación de Instagram/Facebook
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const igConnected = params.get("ig_connected");
    const igError = params.get("ig_error");
    const ttConnected = params.get("tt_connected");
    const ttError = params.get("tt_error");
    if (igConnected === "true") {
      setIgMessage("✅ ¡Facebook e Instagram conectados exitosamente!");
      updateSession();
      window.history.replaceState({}, "", "/");
    } else if (igError) {
      setIgMessage(`❌ Error al conectar Facebook/Instagram: ${igError}`);
      window.history.replaceState({}, "", "/");
    } else if (ttConnected === "true") {
      setIgMessage("✅ ¡TikTok conectado exitosamente!");
      updateSession();
      window.history.replaceState({}, "", "/");
    } else if (ttError) {
      setIgMessage(`❌ Error al conectar TikTok: ${ttError}`);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const isLinkedInConnected = session?.user && session.accounts?.some((a: any) => a.provider === "linkedin");
  const isFacebookConnected = session?.user && session.accounts?.some((a: any) => a.provider === "facebook");
  const isFBPageConnected = isFacebookConnected;
  const isTikTokConnected = session?.user && session.accounts?.some((a: any) => a.provider === "tiktok");

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleGenerate = async () => {
    if (!session) {
      alert("Por favor, inicia sesión con una red social para continuar.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      alert("Por favor, ingresa un título y una descripción.");
      return;
    }
    const prompt = `Titulo: ${title}\nDescripción: ${description}`;
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.details || data.error);
      }
      setGeneratedPost(data);
    } catch (error: any) {
      console.error(error);
      alert(`Error generando el post: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSchedule = async () => {
    if (!generatedPost || !scheduledDate) return;
    setIsScheduling(true);
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: generatedPost.content,
          mediaUrls,
          scheduledDate,
          platforms: selectedPlatforms,
        }),
      });
      const data = await response.json();
      if (data.error) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
        throw new Error(errorMsg);
      }
      alert("Post agendado con éxito 🚀");

      // Reset creation form
      setTitle("");
      setDescription("");
      setGeneratedPost(null);
      setMediaUrls([]);
      setScheduledDate("");

      // Trigger list refresh
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.details ? `${error.message}: ${error.details}` : error.message;
      alert(`Error agendando el post: ${errorMessage}`);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`¿Estás seguro de que quieres desconectar ${provider}?`)) return;
    try {
      const res = await fetch("/api/auth/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (res.ok) {
        updateSession();
        setIgMessage(`✅ ${provider} desconectado correctamente.`);
      } else {
        throw new Error("Error al desvincular.");
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              SocialAutoPyme
            </span>
          </div>

          <div className="flex items-center gap-4">
            {session && (
              <div className="flex items-center gap-3">
                <img src={session.user?.image || ""} alt="" className="w-8 h-8 rounded-full border border-slate-200" />
                <button
                  onClick={() => signOut()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  Cerrar Sesión Global
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notificación de vinculación Instagram */}
      {igMessage && (
        <div className={`w-full px-4 py-3 text-center text-sm font-semibold ${igMessage.startsWith('✅')
          ? 'bg-green-50 text-green-700 border-b border-green-200'
          : 'bg-red-50 text-red-700 border-b border-red-200'
          }`}>
          {igMessage}
          <button onClick={() => setIgMessage(null)} className="ml-4 underline text-xs opacity-60 hover:opacity-100">Cerrar</button>
        </div>
      )}

      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Intro Section */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Tu centro de mando <br />
            <span className="text-blue-600">multi-red social.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-500">
            Genera, programa y analiza tus publicaciones en todas tus redes desde un solo lugar.
          </p>

          {/* Social Platforms Grid */}
          <div className="pt-8 flex flex-wrap justify-center gap-6">
            {/* LinkedIn */}
            <div className="group relative flex flex-col items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => {
                    if (!isLinkedInConnected) {
                      signIn("linkedin");
                    } else {
                      togglePlatform("linkedin");
                    }
                  }}
                  className={`p-4 rounded-2xl transition-all duration-300 flex items-center justify-center ${selectedPlatforms.includes("linkedin") ? 'bg-blue-50 text-blue-600 shadow-inner ring-2 ring-blue-500' : 'bg-white text-slate-400 hover:text-blue-600 hover:shadow-xl hover:-translate-y-1 border border-slate-100 shadow-sm'}`}
                >
                  <Linkedin className="w-8 h-8" />
                </button>
                {isLinkedInConnected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm animate-pulse"></div>
                )}
              </div>
              <span className={`text-xs font-bold uppercase tracking-tighter ${selectedPlatforms.includes("linkedin") ? "text-blue-600" : "text-slate-400"}`}>LinkedIn</span>
              {isLinkedInConnected && (
                <button
                  onClick={() => handleDisconnect("linkedin")}
                  className="text-[10px] text-slate-400 hover:text-red-600 underline font-bold transition-colors"
                >
                  DESCONECTAR
                </button>
              )}
            </div>

            {/* Instagram */}
            <div className="group relative flex flex-col items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => {
                    if (!isFacebookConnected) {
                      window.location.href = "/api/auth/link-instagram";
                    } else {
                      togglePlatform("instagram");
                    }
                  }}
                  className={`p-4 rounded-2xl transition-all duration-300 flex items-center justify-center ${selectedPlatforms.includes("instagram") ? 'bg-pink-50 text-pink-600 shadow-inner ring-2 ring-pink-500' : 'bg-white text-slate-400 hover:text-pink-600 hover:shadow-xl border border-slate-100 shadow-sm'}`}
                >
                  <Instagram className="w-8 h-8" />
                </button>
                {isFacebookConnected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm animate-pulse"></div>
                )}
              </div>
              <span className={`text-xs font-bold uppercase tracking-tighter ${selectedPlatforms.includes("instagram") ? "text-pink-600" : "text-slate-400"}`}>Instagram</span>
              {isFacebookConnected && (
                <button
                  onClick={() => handleDisconnect("facebook")}
                  className="text-[10px] text-slate-400 hover:text-red-600 underline font-bold transition-colors"
                >
                  DESCONECTAR
                </button>
              )}
            </div>

            {/* Facebook */}
            <div className="group relative flex flex-col items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => {
                    if (!isFBPageConnected) {
                      window.location.href = "/api/auth/link-instagram";
                    } else {
                      togglePlatform("facebook");
                    }
                  }}
                  className={`p-4 rounded-2xl transition-all duration-300 flex items-center justify-center ${selectedPlatforms.includes("facebook")
                    ? 'bg-blue-50 text-blue-700 shadow-inner ring-2 ring-blue-700'
                    : 'bg-white text-slate-400 hover:text-blue-700 hover:shadow-xl border border-slate-100 shadow-sm'
                    }`}
                >
                  <Facebook className="w-8 h-8" />
                </button>
                {isFBPageConnected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm animate-pulse"></div>
                )}
              </div>
              <span className={`text-xs font-bold uppercase tracking-tighter ${selectedPlatforms.includes("facebook") ? "text-blue-700" : "text-slate-400"
                }`}>Facebook</span>
              {isFBPageConnected && (
                <button
                  onClick={() => handleDisconnect("facebook")}
                  className="text-[10px] text-slate-400 hover:text-red-600 underline font-bold transition-colors"
                >
                  DESCONECTAR
                </button>
              )}
            </div>

            {/* TikTok */}
            <div className="group relative flex flex-col items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => {
                    if (!isTikTokConnected) {
                      window.location.href = "/api/auth/link-tiktok";
                    } else {
                      togglePlatform("tiktok");
                    }
                  }}
                  className={`p-4 rounded-2xl transition-all duration-300 flex items-center justify-center ${selectedPlatforms.includes("tiktok")
                    ? 'bg-slate-900 text-white shadow-inner ring-2 ring-slate-900'
                    : 'bg-white text-slate-400 hover:text-slate-900 hover:shadow-xl border border-slate-100 shadow-sm'
                    }`}
                >
                  <Music2 className="w-8 h-8" />
                </button>
                {isTikTokConnected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm animate-pulse"></div>
                )}
              </div>
              <span className={`text-xs font-bold uppercase tracking-tighter ${selectedPlatforms.includes("tiktok") ? "text-slate-900" : "text-slate-400"
                }`}>TikTok</span>
              {isTikTokConnected && (
                <button
                  onClick={() => handleDisconnect("tiktok")}
                  className="text-[10px] text-slate-400 hover:text-red-600 underline font-bold transition-colors"
                >
                  DESCONECTAR
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 space-y-6">
              <div className="flex items-center gap-2 text-slate-900">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-bold">Creador Inteligente</h2>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 font-semibold placeholder:text-slate-400"
                  placeholder="Título de la publicación (ej: Lanzamiento de producto)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <textarea
                  className="w-full p-5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 placeholder:text-slate-400"
                  rows={4}
                  placeholder="Describe los detalles de lo que quieres publicar..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !title || !description}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Pensando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Optimizar con IA
                    </>
                  )}
                </button>
              </div>
            </div>

            {generatedPost && (
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-blue-100 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Propuesta de la IA</h3>
                  <div className="flex gap-2">
                    {selectedPlatforms.map(p => (
                      <span key={p} className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${p === 'linkedin' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                        {p} Ready
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="font-bold text-slate-800 text-xl">{generatedPost.seoTitle}</p>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{generatedPost.content}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {generatedPost.hashtags.map((tag) => (
                      <span key={tag} className="bg-white text-blue-600 px-4 py-1.5 rounded-xl text-sm font-semibold border border-blue-50 shadow-sm">
                        #{tag.replace("#", "")}
                      </span>
                    ))}
                  </div>
                  <div className="p-4 bg-indigo-50/50 rounded-2xl flex items-start gap-3">
                    <LayoutDashboard className="w-5 h-5 text-indigo-600 mt-0.5" />
                    <p className="text-sm text-indigo-700 leading-snug">
                      <strong>Sugerencia Visual:</strong> {generatedPost.suggestedMediaTopic}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Programar publicación
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>

                {scheduledDate && (
                  <button
                    onClick={handleSchedule}
                    disabled={isScheduling}
                    className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 px-6 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isScheduling ? "Agendando..." : "Confirmar y Programar 🚀"}
                  </button>
                )}
              </section>
            )}
          </div>

          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 space-y-6">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Multimedia</h3>
              <MediaUploader onUploadComplete={(urls) => setMediaUrls(urls)} />
              {mediaUrls.length > 0 && (
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                  <p className="text-xs font-bold text-blue-600 uppercase mb-2">{mediaUrls.length} Archivos seleccionados</p>
                </div>
              )}
            </section>

            <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 space-y-6 max-h-[600px] overflow-y-auto">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Historial</h3>
              <PostList key={refreshKey} />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
