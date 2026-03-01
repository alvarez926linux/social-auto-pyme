import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
    // Define as many FileRoutes as you like, each with a unique routeSlug
    mediaPost: f({
        image: { maxFileSize: "8MB", maxFileCount: 5 },
        video: { maxFileSize: "128MB", maxFileCount: 5 }
    })
        // Set permissions and file types for this FileRoute
        .middleware(async ({ req }) => {
            console.log("Uploadthing Middleware: Invocado");
            // This code runs on your server before upload
            const session = await getServerSession(authOptions);
            console.log("Uploadthing Middleware: Sesión obtenida:", !!session);

            // If you throw, the user will not be able to upload
            if (!session || !session.user) {
                console.error("Uploadthing Middleware Error: No session found");
                throw new Error("Debe iniciar sesión para subir archivos");
            }

            console.log("Uploadthing Middleware: Session found for user", (session.user as any).id);
            // Whatever is returned here is accessible in onUploadComplete as `metadata`
            return { userId: (session.user as any).id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            // This code RUNS ON YOUR SERVER after upload
            console.log("Upload complete for userId:", metadata.userId);
            console.log("file url", file.url);

            // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
            return { uploadedBy: metadata.userId };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
