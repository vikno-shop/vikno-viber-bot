require('dotenv').config();
const ViberBot = require('viber-bot').Bot;
const BotEvents = require('viber-bot').Events;
const TextMessage = require('viber-bot').Message.Text;
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
app.use(bodyParser.json());

// Ініціалізація Viber-бота
const bot = new ViberBot({
    authToken: process.env.VIBER_AUTH_TOKEN,
    name: "ВІКНО™",
    avatar: "https://vikno.shop/images/vikno-logo-viber.png"
});

// Маршрут для вебхука
app.use("/webhook", bot.middleware());
app.get("/", (req, res) => res.send("VIKNO Viber Bot Active ✅"));

const mainMenuMessage = new TextMessage("Оберіть розділ:", {
    buttons: [
        { ActionType: "reply", ActionBody: "ВІКНА", Text: "🪟 ВІКНА" },
        { ActionType: "reply", ActionBody: "ДВЕРІ", Text: "🚪 ДВЕРІ" },
        { ActionType: "reply", ActionBody: "БАЛКОНИ", Text: "🏙 БАЛКОНИ" },
        { ActionType: "reply", ActionBody: "РОЗСУВНІ СИСТЕМИ", Text: "🧩 РОЗСУВНІ СИСТЕМИ" }
    ],
    InputFieldState: "hidden"
});

bot.onSubscribe(response => {
    response.send(new TextMessage("Вітаємо! Оберіть, що Вас цікавить:", mainMenuMessage.keyboard));
});

let awaitingPhone = {};

// Відправка заявки на пошту
async function handlePhoneSubmission(phone, userId, response) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'viknoshopping@gmail.com',
            pass: process.env.GMAIL_APP_PASSWORD
        }
    });

    try {
        await transporter.sendMail({
            from: 'viknoshopping@gmail.com',
            to: 'viknoshopping@gmail.com',
            subject: 'Запит з Viber бота',
            text: `Новий номер телефону для консультації: ${phone}`
        });

        response.send(new TextMessage("✅ Дякуємо! Наш консультант зв'яжеться з вами найближчим часом."));
        awaitingPhone[userId] = false;
    } catch (error) {
        console.error("Помилка надсилання листа:", error);
        response.send(new TextMessage("❌ Виникла помилка при надсиланні. Спробуйте пізніше."));
    }
}

bot.on(BotEvents.MESSAGE_RECEIVED, (message, response) => {
    const text = message.text.trim();
    const userId = response.userProfile.id;

    // Якщо очікуємо номер телефону
    if (awaitingPhone[userId]) {
        if (/^\+?\d{9,15}$/.test(text)) {
            handlePhoneSubmission(text, userId, response);
        } else {
            response.send(new TextMessage("📞 Введіть, будь ласка, коректний номер телефону (наприклад: +380XXXXXXXXX)."));
        }
        return;
    }

    switch (text) {
        case "ВІКНА":
        case "ДВЕРІ":
        case "БАЛКОНИ":
        case "РОЗСУВНІ СИСТЕМИ":
            response.send(new TextMessage(`Вас цікавить розділ "${text}". Оберіть дію:`, {
                buttons: [
                    { ActionType: "reply", ActionBody: "ЗАПИСАТИСЬ", Text: "📞 З'єднати з консультантом" },
                    { ActionType: "reply", ActionBody: "КОНСУЛЬТАЦІЯ", Text: "✍️ Безкоштовна консультація" },
                    { ActionType: "reply", ActionBody: "МЕНЮ", Text: "🔙 Повернутися в меню" }
                ],
                InputFieldState: "hidden"
            }));
            break;

        case "ЗАПИСАТИСЬ":
            response.send(new TextMessage("Відкрийте чат з консультантом: viber://chat?number=+380678388420"));
            break;

        case "КОНСУЛЬТАЦІЯ":
            awaitingPhone[userId] = true;
            response.send(new TextMessage("✍️ Введіть номер телефону для безкоштовної консультації:"));
            break;

        case "МЕНЮ":
            response.send(mainMenuMessage);
            break;

        default:
            response.send(mainMenuMessage);
            break;
    }
});

// Запуск сервера
const port = process.env.PORT || 10000;
app.listen(port, () => {
    console.log(`✅ Бот працює на порту ${port}`);
    bot.setWebhook(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}/webhook`);
});
