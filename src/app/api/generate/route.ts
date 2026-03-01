import { NextResponse } from "next/server";
import { AIService } from "@/services/ai.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { prompt } = await req.json();
        if (!prompt) {
            return NextResponse.json({ error: "Prompt es requerido" }, { status: 400 });
        }

        const result = await AIService.generateOptimalPost(prompt);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("AI Generation Error:", error);

        // Extraer mensaje de error específico de OpenAI si existe
        const errorMessage = error?.response?.data?.error?.message || error?.message || "Error generando contenido";

        return NextResponse.json({
            error: "Error en la IA",
            details: errorMessage,
            code: error?.status || 500
        }, { status: 500 });
    }
}
