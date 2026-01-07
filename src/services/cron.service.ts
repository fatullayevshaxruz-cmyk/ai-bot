import cron from "node-cron";
import { Bot } from "grammy";
import { MyContext } from "../types/context";
import { prisma } from "../db";

export function setupCronJobs(bot: Bot<MyContext>) {
    // Check every minute (production: every hour)
    cron.schedule("* * * * *", async () => {
        console.log("Running follow-up check...");

        const now = new Date();

        // Find leads that need follow-up
        const leads = await prisma.lead.findMany({
            where: {
                status: { notIn: ["ARCHIVE", "CLIENT"] },
                isFollowUpEnabled: true
            },
            include: { user: true }
        });

        for (const lead of leads) {
            // FOR DEMO: use minutes instead of days to test quickly
            const minutesSinceCreation = Math.floor((now.getTime() - lead.createdAt.getTime()) / (1000 * 60));
            const timeUnit = minutesSinceCreation; // Change logic to days for production

            let message = "";
            let nextStage = lead.followUpStage;

            // Follow-up Logic: Day 1, 3, 7, 21
            if (lead.followUpStage === 0 && timeUnit >= 1) { // 1 min (demo) or 1 day
                message = `👋 Здравствуйте, ${lead.user.firstName || ""}, просто хотел напомнить. Есть ли у вас вопросы?`;
                nextStage = 1;
            } else if (lead.followUpStage === 1 && timeUnit >= 3) { // 3 min (demo) or 3 days
                message = `🚀 ${lead.user.firstName || ""}, у нас есть отличное предложение для развития вашего бизнеса. Хотите взглянуть?`;
                nextStage = 2;
            } else if (lead.followUpStage === 2 && timeUnit >= 7) { // 7 min (demo) or 7 days
                message = `🎁 Специальная скидка! Если закажете сегодня, дадим скидку 10%.`;
                nextStage = 3;
            } else if (lead.followUpStage === 3 && timeUnit >= 21) { // 21 min (demo) or 21 days
                message = `Последний шанс! Места на интересующий вас проект заканчиваются.`;
                nextStage = 4;
            }

            if (message && nextStage > lead.followUpStage) {
                try {
                    await bot.api.sendMessage(Number(lead.user.telegramId), message);
                    await prisma.lead.update({
                        where: { id: lead.id },
                        data: { followUpStage: nextStage }
                    });
                    console.log(`Sent Stage ${nextStage} follow-up to ${lead.user.username}`);
                } catch (error) {
                    console.error(`Failed to send follow-up to ${lead.user.id}`, error);
                }
            }
        }
    });

    console.log("Cron jobs scheduled.");
}
