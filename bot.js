require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { Bot, Events, Message } = require('viber-bot');

if (!process.env.VIBER_AUTH_TOKEN || !process.env.GMAIL_APP_PASSWORD || !process.env.RENDER_EXTERNAL_HOSTNAME) {
    console.error("❌ Відсутні обов'язкові змінні середовища.");
    process.exit(1);
}

const app = express();
app.use(bodyParser.json());

const awaitingPhone = {};
const bot = new Bot({
    authToken: process.env.VIBER_AUTH_TOKEN,
    name: "ВІКНО™",
    avatar: "https://vikno.shop/images/vikno-logo-viber.png"
});

app.use("/webhook", bot.middleware());
app.get("/", (req, res) => res.send("✅ VIKNO Viber Bot активний"));

bot.onSubscribe(response => {
    showMainMenu(response);
});

function showMainMenu(response) {
    response.send(new Message.Text("Вітаємо! Оберіть, що Вас цікавить:", {
        buttons: [
            { ActionType: "reply", ActionBody: "ВІКНА", Text: "🪟 ВІКНА" },
            { ActionType: "reply", ActionBody: "ДВЕРІ", Text: "🚪 ДВЕРІ" },
            { ActionType: "reply", ActionBody: "БАЛКОНИ", Text: "🏙 БАЛКОНИ" },
            { ActionType: "reply", ActionBody: "РОЗСУВНІ СИСТЕМИ", Text: "🧩 РОЗСУВНІ СИСТЕМИ" }
        ],
        InputFieldState: "hidden"
    }));
}

function showSectionMenu(text, response) {
    response.send(new Message.Text(`Вас цікавить розділ "${text}". Що робимо далі?`, {
        buttons: [
            { ActionType: "reply", ActionBody: "ЗАПИСАТИСЬ", Text: "📞 З'єднати з консультантом" },
            { ActionType: "reply", ActionBody: "ЗАЛИШИТИ КОНТАКТ", Text: "📋 Залишити номер" },
            { ActionType: "reply", ActionBody: "МЕНЮ", Text: "🔙 Повернутись до меню" }
        ],
        InputFieldState: "hidden"
    }));
}

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
            subject: 'Новий запит з Viber бота',
            text: `Користувач надіслав номер: ${phone}`
        });

        delete awaitingPhone[userId];
        await response.send(new Message.Text("✅ Дякуємо! Наш консультант скоро зв'яжеться з вами."));

    } catch (err) {
        console.error("❌ Email помилка:", err);
        await response.send(new Message.Text("❌ Помилка при відправленні повідомлення. Спробуйте ще раз."));
    }
}

bot.on(Events.MESSAGE_RECEIVED, async (message, response) => {
    try {
        const text = message.text.trim();
        const userId = response.userProfile.id;

        if (awaitingPhone[userId]) {
            if (/^\+?\d{9,15}$/.test(text)) {
                await handlePhoneSubmission(text, userId, response);
            } else {
                await response.send(new Message.Text("❗️ Введіть правильний номер у форматі +380XXXXXXXXX."));
            }
            return;
        }

        switch (text) {
            case "ВІКНА":
            case "ДВЕРІ":
            case "БАЛКОНИ":
            case "РОЗСУВНІ СИСТЕМИ":
                return showSectionMenu(text, response);
            case "МЕНЮ":
                return showMainMenu(response);
            case "ЗАПИСАТИСЬ":
                return response.send(new Message.Text("Натисніть, щоб перейти до чату з консультантом: viber://chat?number=+380678388420"));
            case "ЗАЛИШИТИ КОНТАКТ":
                awaitingPhone[userId] = true;
                return response.send(new Message.Text("Будь ласка, надішліть ваш номер телефону у форматі +380XXXXXXXXX."));
            default:
                return showMainMenu(response);
        }

    } catch (err) {
        console.error("❌ Unhandled бот помилка:", err);
        await response.send(new Message.Text("⚠️ Виникла внутрішня помилка. Спробуйте пізніше."));
    }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
    console.log(`✅ Бот запущено на порту ${port}`);

    const webhookUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/webhook`;
    bot.setWebhook(webhookUrl)
        .then(() => console.log(`✅ Webhook встановлено: ${webhookUrl}`))
        .catch(err => console.error("❌ Webhook помилка:", err));
});
