"use client";

import { generateUploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

const UploadButton = generateUploadButton<OurFileRouter>();

interface MediaUploaderProps {
    onUploadComplete: (urls: string[]) => void;
}

export default function MediaUploader({ onUploadComplete }: MediaUploaderProps) {
    const [mediaItems, setMediaItems] = useState<{ url: string, type: "image" | "video" }[]>([]);

    useEffect(() => {
        console.log("MediaUploader v7 (Multi) Montado");
    }, []);

    const removeMedia = (index: number) => {
        const newItems = mediaItems.filter((_, i) => i !== index);
        setMediaItems(newItems);
        onUploadComplete(newItems.map(item => item.url));
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                <p className="text-sm text-gray-500 mb-4 text-center">
                    Sube hasta 5 imágenes o videos para tu post.<br />
                    (Límite: 8MB imagen / 128MB video)
                </p>
                <UploadButton
                    endpoint="mediaPost"
                    onUploadBegin={(name) => {
                        console.log("Iniciando subida de:", name);
                    }}
                    onClientUploadComplete={(res) => {
                        console.log("Subida exitosa:", res);
                        if (res) {
                            const newItems = res.map(file => ({
                                url: file.url,
                                type: file.url.match(/\.(mp4|webm|ogg)$/i) ? ("video" as const) : ("image" as const)
                            }));

                            const updatedItems = [...mediaItems, ...newItems].slice(0, 5);
                            setMediaItems(updatedItems);
                            onUploadComplete(updatedItems.map(item => item.url));
                            alert(`✅ ${newItems.length} archivo(s) subido(s) correctamente!`);
                        }
                    }}
                    onUploadError={(error: Error) => {
                        console.error("Uploadthing Client Error Detail:", error);
                        alert(`❌ Error de subida: ${error.message}`);
                    }}
                />
            </div>

            {mediaItems.length > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                    {mediaItems.map((item, index) => (
                        <div key={item.url} className="relative group rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white">
                            {item.type === "image" ? (
                                <img src={item.url} alt="Preview" className="h-32 w-full object-cover" />
                            ) : (
                                <video src={item.url} className="h-32 w-full object-cover" />
                            )}
                            <button
                                onClick={() => removeMedia(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
