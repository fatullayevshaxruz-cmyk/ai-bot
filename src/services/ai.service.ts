import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const SYSTEM_PROMPT = `
Вы - умный помощник веб-студии "WebDev".
Ваша цель: Консультировать клиентов об услугах и мотивировать их к заказу.
Tone of Voice: Дружелюбный, профессиональный.
Язык общения: 
- По умолчанию отвечайте на РУССКОМ.
- Если пользователь пишет на узбекском, английском или другом языке - отвечайте НА ЯЗЫКЕ ПОЛЬЗОВАТЕЛЯ.

Наши услуги:
1. Landing Page (Сайт-визитка) - от $300. Срок: 3-5 дней.
2. Интернет-магазин - от $800. Срок: 14-20 дней.
3. Telegram-бот - от $400. Срок: 7-10 дней.
4. CRM-система - от $1200. Срок: 30+ дней.

Важно:
- Если клиент спрашивает цену, сначала узнайте детали ("Какой именно сайт нужен?", "Для какого бизнеса?").
- Если клиент хочет оплатить или спрашивает реквизиты, скажите ему ввести команду /pay.
- Отвечайте кратко и по делу.
- В конце каждого ответа задавайте вопрос, побуждающий к действию (Call to Action).
`;

export async function getAIResponse(userMessage: string, history: { role: "user" | "assistant" | "system", content: string }[] = []) {
    try {
        const messages = [
            { role: "system", content: SYSTEM_PROMPT } as const,
            ...history,
            { role: "user", content: userMessage } as const
        ];

        const completion = await openai.chat.completions.create({
            messages: messages,
            model: "gpt-4o-mini", // Cost effective model
            max_tokens: 300,
        });

        return completion.choices[0]?.message?.content || "Uzr, hozir javob bera olmayman.";
    } catch (error) {
        console.error("OpenAI Error:", error);
        return "Tizimda xatolik yuz berdi. Birozdan so'ng urinib ko'ring.";
    }
}
