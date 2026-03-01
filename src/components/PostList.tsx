"use client";

import { useEffect, useState } from "react";
import { Linkedin, Instagram } from "lucide-react";

type PostStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED";

interface Post {
    id: string;
    content: string;
    status: PostStatus;
    mediaUrls: string[];
    platforms: string[];
    scheduledDate: string | null;
    createdAt: string;
}

export default function PostList() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPosts = async () => {
        try {
            const res = await fetch("/api/posts/list");
            const data = await res.json();
            if (!data.error) setPosts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
        // Refresh every 30 seconds to see status changes
        const interval = setInterval(fetchPosts, 30000);
        return () => clearInterval(interval);
    }, []);

    const getStatusBadge = (status: PostStatus) => {
        const colors = {
            DRAFT: "bg-gray-100 text-gray-800",
            SCHEDULED: "bg-blue-100 text-blue-800",
            PUBLISHED: "bg-green-100 text-green-800",
            FAILED: "bg-red-100 text-red-800",
        };
        return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}>
                {status}
            </span>
        );
    };

    if (loading) return <div className="text-center py-4 text-gray-500">Cargando posts...</div>;

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Tus Publicaciones</h3>
                <button
                    onClick={fetchPosts}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    Refrescar
                </button>
            </div>
            <div className="border-t border-gray-200">
                <ul className="divide-y divide-gray-200">
                    {posts.length === 0 ? (
                        <li className="px-4 py-8 text-center text-gray-500">No hay publicaciones registradas aún.</li>
                    ) : (
                        posts.map((post) => (
                            <li key={post.id} className="px-4 py-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-gray-900 truncate font-medium">
                                                {post.content}
                                            </p>
                                            <div className="flex gap-1 items-center">
                                                {(post.platforms || ["linkedin"]).map(p => (
                                                    <div key={p} className={`p-0.5 rounded ${p === 'linkedin' ? 'text-blue-600 bg-blue-50' : 'text-pink-600 bg-pink-50'}`}>
                                                        {p === 'linkedin' ? <Linkedin className="w-3 h-3" /> : <Instagram className="w-3 h-3" />}
                                                    </div>
                                                ))}
                                            </div>
                                            {post.mediaUrls?.length > 0 && (
                                                <span className="flex-shrink-0 bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-100">
                                                    {post.mediaUrls.length} FILES
                                                </span>
                                            )}
                                        </div>
                                        {post.mediaUrls?.length > 0 && (
                                            <div className="flex gap-1 mt-2">
                                                {post.mediaUrls.slice(0, 3).map((url, i) => (
                                                    <div key={url + i} className="w-8 h-8 rounded bg-gray-100 overflow-hidden border border-gray-200">
                                                        <img src={url} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                                {post.mediaUrls.length > 3 && (
                                                    <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center text-[10px] text-gray-400 font-bold border border-gray-100">
                                                        +{post.mediaUrls.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">
                                            {post.scheduledDate
                                                ? `Agendado para: ${new Date(post.scheduledDate).toLocaleString()}`
                                                : `Creado: ${new Date(post.createdAt).toLocaleDateString()}`
                                            }
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        {getStatusBadge(post.status)}
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}
