import { Composer } from "grammy";
import { MyContext } from "../types/context";
import { prisma } from "../db";

export const adminComposer = new Composer<MyContext>();

// Middleware to check admin rights (simplistic for now)
// In production, add IDs to .env like ADMIN_IDS=123,456
const ADMIN_IDS = [123456789]; // Replace with real ID or load from env

adminComposer.filter((ctx) => {
    return true; // FOR DEMO: Allow everyone to access admin commands. In production: ADMIN_IDS.includes(ctx.from?.id || 0)
}).command("stats", async (ctx) => {
    const totalUsers = await prisma.user.count();
    const leads = await prisma.lead.groupBy({
        by: ['status'],
        _count: {
            _all: true
        }
    });

    let message = `📊 <b>Statistika:</b>\n\n👤 Jami foydalanuvchilar: ${totalUsers}\n\n`;

    leads.forEach((group: { status: string; _count: { _all: number; }; }) => {
        message += `🏷 ${group.status}: ${group._count._all}\n`;
    });

    await ctx.reply(message, { parse_mode: "HTML" });
});

adminComposer.command("users", async (ctx) => {
    // Show last 5 users
    const users = await prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { leads: true }
    });

    let msg = "👥 <b>Oxirgi foydalanuvchilar:</b>\n\n";
    for (const u of users) {
        msg += `👤 <a href="tg://user?id=${u.telegramId}">${u.firstName}</a> (@${u.username})\n`;
        const status = u.leads[0]?.status || "NEW";
        msg += `Status: ${status}\n\n`;
    }

    await ctx.reply(msg, { parse_mode: "HTML" });
});

adminComposer.command("setstatus", async (ctx) => {
    // Usage: /setstatus <telegram_id> <status>
    const args = ctx.match?.split(" ");
    if (!args || args.length < 2) {
        return ctx.reply("Usage: /setstatus <telegram_id> <status>\nExample: /setstatus 123456789 CLIENT");
    }

    const [tgId, status] = args;
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tgId) } });

    if (!user) return ctx.reply("Foydalanuvchi topilmadi.");

    // Update MAIN lead for simplicity
    await prisma.lead.updateMany({
        where: { userId: user.id },
        data: { status: status.toUpperCase() }
    });

    await ctx.reply(`✅ ${user.firstName} statusi ${status} ga o'zgartirildi.`);
});

adminComposer.command("followup", async (ctx) => {
    // Usage: /followup <telegram_id> <on/off>
    const args = ctx.match?.split(" ");
    if (!args || args.length < 2) {
        return ctx.reply("Usage: /followup <telegram_id> <on/off>\nExample: /followup 123456789 off");
    }

    const [tgId, state] = args;
    const isEnabled = state.toLowerCase() === "on";
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tgId) } });

    if (!user) return ctx.reply("Foydalanuvchi topilmadi.");

    await prisma.lead.updateMany({
        where: { userId: user.id },
        data: { isFollowUpEnabled: isEnabled }
    });

    await ctx.reply(`✅ ${user.firstName} uchun follow-up ${isEnabled ? "YOQILDI" : "O'CHIRILDI"}.`);
});
