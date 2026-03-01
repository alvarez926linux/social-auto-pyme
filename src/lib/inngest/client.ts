import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({
    id: "social-auto-pyme",
    eventKey: process.env.INNGEST_EVENT_KEY || "local_event_key",
    // Inngest Dev Server corre en 8288 por defecto; el serve handler está en 3001
    baseUrl: process.env.NODE_ENV === "development" ? "http://localhost:8288" : undefined
});
