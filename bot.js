require('dotenv').config();
const ViberBot = require('viber-bot').Bot;
const BotEvents = require('viber-bot').Events;
const TextMessage = require('viber-bot').Message.Text;
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
app.use(bodyParser.json());

const bot = new ViberBot({
    authToken: process.env.VIBER_AUTH_TOKEN,
    name: "ВІКНО™",
    avatar: "https://vikno.shop/images/vikno-logo-viber.png"
});

// Webhook
app.use("/webhook", bot.middleware());
app.get("/", (req, res) => res.send("VIKNO Viber Bot Active"));

bot.onSubscribe(response => {
    response.send(new TextMessage("Вітаємо, оберіть, що Вас цікавить:", {
        buttons: [
            { ActionType: "reply", ActionBody: "ВІКНА", Text: "🪟 ВІКНА" },
            { ActionType: "reply", ActionBody: "ДВЕРІ", Text: "🚪 ДВЕРІ" },
            { ActionType: "reply", ActionBody: "БАЛКОНИ", Text: "🏙 БАЛКОНИ" },
            { ActionType: "reply", ActionBody: "РОЗСУВНІ СИСТЕМИ", Text: "🧩 РОЗСУВНІ СИСТЕМИ" }
        ],
        InputFieldState: "hidden"
    }));
});

const mainMenu = new TextMessage("Оберіть розділ:", {
    buttons: [
        { ActionType: "reply", ActionBody: "ВІКНА", Text: "🪟 ВІКНА" },
        { ActionType: "reply", ActionBody: "ДВЕРІ", Text: "🚪 ДВЕРІ" },
        { ActionType: "reply", ActionBody: "БАЛКОНИ", Text: "🏙 БАЛКОНИ" },
        { ActionType: "reply", ActionBody: "РОЗСУВНІ СИСТЕМИ", Text: "🧩 РОЗСУВНІ СИСТЕМИ" }
    ],
    InputFieldState: "hidden"
});

const sendConsultationForm = (response) => {
    response.send(new TextMessage("Будь ласка, введіть номер телефону для безкоштовної консультації."));
    bot.on(BotEvents.MESSAGE_RECEIVED, (msg, res) => {
        const phone = msg.text;
        const mail = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'viknoshopping@gmail.com',
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });
        mail.sendMail({
            from: 'viknoshopping@gmail.com',
            to: 'viknoshopping@gmail.com',
            subject: 'Запит з Viber бота',
            text: `Новий номер для консультації: ${phone}`
        }, () => {
            res.send(new TextMessage("Дякуємо! Наш консультант зв'яжеться з вами найближчим часом."));
        });
    });
};

bot.on(BotEvents.MESSAGE_RECEIVED, (message, response) => {
    const text = message.text;
    if (text === "ВІКНА" || text === "ДВЕРІ" || text === "БАЛКОНИ" || text === "РОЗСУВНІ СИСТЕМИ") {
        response.send([
            new TextMessage(`Вас цікавить розділ "${text}". Що робимо далі?`, {
                buttons: [
                    { ActionType: "reply", ActionBody: "ЗАПИСАТИСЬ", Text: "📞 З'єднати з консультантом" },
                    { ActionType: "reply", ActionBody: "МЕНЮ", Text: "🔙 Повернутися в меню" }
                ],
                InputFieldState: "hidden"
            })
        ]);
    } else if (text === "ЗАПИСАТИСЬ") {
        response.send(new TextMessage("Натисніть, щоб перейти до чату з консультантом: viber://chat?number=+380678388420"));
    } else if (text === "МЕНЮ") {
        response.send(mainMenu);
    } else if (/^\+?\d{9,15}$/.test(text)) {
        sendConsultationForm(response);
    } else {
        response.send(mainMenu);
    }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
    console.log(`Бот працює на порту ${port}`);
    bot.setWebhook(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}/webhook`);
});