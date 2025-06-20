require('dotenv').config();
const ViberBot = require('viber-bot').Bot;
const BotEvents = require('viber-bot').Events;
const TextMessage = require('viber-bot').Message.Text;
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

// Перевірка змінних середовища
if (!process.env.VIBER_AUTH_TOKEN || !process.env.GMAIL_APP_PASSWORD || !process.env.RENDER_EXTERNAL_HOSTNAME) {
    console.error("❌ Відсутні обов'язкові змінні середовища (VIBER_AUTH_TOKEN, GMAIL_APP_PASSWORD, RENDER_EXTERNAL_HOSTNAME)");
    process.exit(1);
}

const app = express();
app.use(bodyParser.json());

const awaitingPhone = {};

const bot = new ViberBot({
    authToken: process.env.VIBER_AUTH_TOKEN,
    name: "ВІКНО™",
    avatar: "https://vikno.shop/images/vikno-logo-viber.png"
});

// Маршрути
app.use("/webhook", bot.middleware());
app.get("/", (req, res) => res.send("✅ VIKNO Viber Bot Active"));

bot.onSubscribe(response => {
    showMainMenu(response);
});

// Основне меню
function showMainMenu(response) {
    response.send(new TextMessage("Вітаємо, оберіть, що Вас цікавить:", {
        buttons: [
            { ActionType: "reply", ActionBody: "ВІКНА", Text: "🪟 ВІКНА" },
            { ActionType: "reply", ActionBody: "ДВЕРІ", Text: "🚪 ДВЕРІ" },
            { ActionType: "reply", ActionBody: "БАЛКОНИ", Text: "🏙 БАЛКОНИ" },
            { ActionType: "reply", ActionBody: "РОЗСУВНІ СИСТЕМИ", Text: "🧩 РОЗСУВНІ СИСТЕМИ" }
        ],
        InputFieldState: "hidden"
    }));
}

// Меню розділу
function showSectionMenu(text, response) {
    response.send(new TextMessage(`Вас цікавить розділ "${text}". Що робимо далі?`, {
        buttons: [
            { ActionType: "reply", ActionBody: "ЗАПИСАТИСЬ", Text: "📞 З'єднати з консультантом" },
            { ActionType: "reply", ActionBody: "ЗАЛИШИТИ КОНТАКТ", Text: "📋 Залишити номер" },
            { ActionType: "reply", ActionBody: "МЕНЮ", Text: "🔙 Повернутися в меню" }
        ],
        InputFieldState: "hidden"
    }));
}

// Надсилання email
async function handlePhoneSubmission(phone, userId, response) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'viknoshopping@gmail.com',
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });

        await transporter.sendMail({
            from: 'viknoshopping@gmail.com',
            to: 'viknoshopping@gmail.com',
            subject: 'Запит з Viber бота',
            text: `Новий номер телефону для консультації: ${phone}`
        });

        response.send(new TextMessage("✅ Дякуємо! Наш консультант зв'яжеться з вами найближчим часом."));
        delete awaitingPhone[userId];
    } catch (err) {
        console.error("❌ Email send error:", err);
        response.send(new TextMessage("❌ Сталася помилка при надсиланні. Спробуйте ще раз."));
    }
}

// Головна логіка
bot.on(BotEvents.MESSAGE_RECEIVED, async (message, response) => {
    const text = message.text.trim();
    const userId = response.userProfile.id;

    if (awaitingPhone[userId]) {
        if (/^\+?\d{9,15}$/.test(text)) {
            await handlePhoneSubmission(text, userId, response);
        } else {
            response.send(new TextMessage("❗ Введіть номер у форматі +380XXXXXXXXX"));
        }
        return;
    }

    switch (text) {
        case "ВІКНА":
        case "ДВЕРІ":
        case "БАЛКОНИ":
        case "РОЗСУВНІ СИСТЕМИ":
            showSectionMenu(text, response);
            break;
        case "МЕНЮ":
            showMainMenu(response);
            break;
        case "ЗАПИСАТИСЬ":
            response.send(new TextMessage("📲 Натисніть, щоб перейти до чату: viber://chat?number=+380678388420"));
            break;
        case "ЗАЛИШИТИ КОНТАКТ":
            awaitingPhone[userId] = true;
            response.send(new TextMessage("📝 Надішліть номер телефону для консультації:"));
            break;
        default:
            showMainMenu(response);
    }
});

// Запуск сервера
const port = process.env.PORT || 10000;
app.listen(port, () => {
    console.log(`✅ Бот працює на порту ${port}`);
    const webhookUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/webhook`;
    bot.setWebhook(webhookUrl)
        .then(() => console.log(`✅ Webhook встановлено: ${webhookUrl}`))
        .catch(err => console.error("❌ Помилка встановлення webhook:", err));
});
