import { Context, SessionFlavor } from "grammy";

export interface SessionData {
    step: "idle" | "awaiting_name" | "awaiting_interest";
    leadId?: number;
}

export type MyContext = Context & SessionFlavor<SessionData>;
