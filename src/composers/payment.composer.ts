import { Composer } from "grammy";
import { MyContext } from "../types/context";

export const paymentComposer = new Composer<MyContext>();

const VISA_CARD = "4000 0000 0000 0000"; // Placeholder
const SBER_CARD = "2202 0000 0000 0000"; // Placeholder
const CARD_HOLDER = "Ism Familiya";

paymentComposer.command("pay", async (ctx) => {
    await ctx.reply(
        `💳 **To'lov ma'lumotlari:**\n\n` +
        `✅ **VISA**: \`${VISA_CARD}\`\n` +
        `👤 Egasi: ${CARD_HOLDER}\n\n` +
        `✅ **SBERBANK**: \`${SBER_CARD}\`\n` +
        `👤 Egasi: ${CARD_HOLDER}\n\n` +
        `❗️ To'lov qilganingizdan so'ng, chekni (skrinshot) shu yerga yuboring. Menejer tasdiqlagach, ishni boshlaymiz.`
        , { parse_mode: "Markdown" });
});
