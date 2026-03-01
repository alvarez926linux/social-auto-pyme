import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const PostSchema = z.object({
    content: z.string().describe("El texto principal del post optimizado para LinkedIn"),
    seoTitle: z.string().describe("Título SEO impactante para el post"),
    hashtags: z.array(z.string()).describe("Lista de 3 a 5 hashtags relevantes"),
    suggestedMediaTopic: z.string().describe("Sugerencia de imagen o video para acompañar el post"),
});

export type GeneratedPost = z.infer<typeof PostSchema>;

export class AIService {
    static async generateOptimalPost(prompt: string): Promise<GeneratedPost> {
        const { object } = await generateObject({
            model: google("gemini-flash-latest"),
            schema: PostSchema,
            prompt: `Actúa como un experto en Marketing de Contenidos y SEO. Optimiza la siguiente idea para un post de LinkedIn: "${prompt}"`,
        });

        return object;
    }
}
