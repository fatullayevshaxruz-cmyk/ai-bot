import { Bot, session } from "grammy";
import dotenv from "dotenv";
import express from "express";
import { MyContext, SessionData } from "./types/context";
import { prisma } from "./db";
import { getAIResponse } from "./services/ai.service";

dotenv.config();

const bot = new Bot<MyContext>(process.env.BOT_TOKEN || "");

function initial(): SessionData {
    return { step: "idle" };
}

bot.use(session({ initial }));
import { adminComposer } from "./composers/admin.composer";
import { paymentComposer } from "./composers/payment.composer";

bot.use(adminComposer);
bot.use(paymentComposer);

// Middleware to log updates
bot.use(async (ctx, next) => {
    console.log(`Update from ${ctx.from?.username}: ${ctx.message?.text}`);

    if (ctx.from) {
        try {
            await prisma.user.upsert({
                where: { telegramId: ctx.from.id },
                update: {
                    username: ctx.from.username,
                    firstName: ctx.from.first_name,
                },
                create: {
                    telegramId: ctx.from.id,
                    username: ctx.from.username,
                    firstName: ctx.from.first_name,
                    languageCode: ctx.from.language_code
                }
            });
        } catch (e) {
            console.error("Error syncing user:", e);
        }
    }
    await next();
});

bot.command("start", async (ctx) => {
    await ctx.reply("Здравствуйте! Я ваш AI-помощник. Какой у вас вопрос?");
});

// Handle contact sharing
bot.on("message:contact", async (ctx) => {
    const phone = ctx.message.contact.phone_number;
    await prisma.user.update({
        where: { telegramId: ctx.from.id },
        data: { phoneNumber: phone }
    });
    await ctx.reply(`Rahmat! Telefon raqamingiz qabul qilindi: ${phone}\nMenejerimiz tez orada bog'lanadi.`);
});

// Basic message handler
bot.on("message:text", async (ctx) => {
    // Show typing status
    await ctx.replyWithChatAction("typing");

    // Fetch recent messages for context (in a real app, limit to last 5-10)
    const history = await prisma.message.findMany({
        where: { userId: ctx.from.id },
        orderBy: { createdAt: 'desc' },
        take: 6,
    });

    const formattedHistory = history.reverse().map((msg: { role: string; content: string; }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
    }));

    // Save user message
    await prisma.message.create({
        data: {
            userId: (await prisma.user.findUnique({ where: { telegramId: ctx.from.id } }))!.id,
            role: "user",
            content: ctx.message.text
        }
    });

    // Get AI response
    const aiText = await getAIResponse(ctx.message.text, formattedHistory);

    // Save AI response
    await prisma.message.create({
        data: {
            userId: (await prisma.user.findUnique({ where: { telegramId: ctx.from.id } }))!.id,
            role: "assistant",
            content: aiText
        }
    });

    // Update Lead status if not set
    // (Simplistic logic: if chatting, mark as QUALIFIED/WARM)
    // In production, we'd use AI function calling to set status explicitly.

    await ctx.reply(aiText);
});

bot.catch((err) => {
    console.error("Bot error:", err);
});

import { setupCronJobs } from "./services/cron.service";

console.log("Bot is starting...");
setupCronJobs(bot);

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Bot is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

bot.start();
