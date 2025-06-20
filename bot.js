require('dotenv').config();
const ViberBot = require('viber-bot').Bot;
const BotEvents = require('viber-bot').Events;
const TextMessage = require('viber-bot').Message.Text;
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
app.use(bodyParser.json());

// Створення бота
const bot = new ViberBot({
  authToken: process.env.VIBER_AUTH_TOKEN,
  name: "ВІКНО™",
  avatar: "https://vikno.shop/images/vikno-logo-viber.png"
});

// Підключення до webhook
app.use("/webhook", bot.middleware());
app.get("/", (req, res) => res.send("VIKNO™ Viber Bot Active"));

const mainMenu = new TextMessage("Оберіть розділ:", {
  buttons: [
    { ActionType: "reply", ActionBody: "ВІКНА", Text: "🪟 ВІКНА" },
    { ActionType: "reply", ActionBody: "ДВЕРІ", Text: "🚪 ДВЕРІ" },
    { ActionType: "reply", ActionBody: "БАЛКОНИ", Text: "🏙 БАЛКОНИ" },
    { ActionType: "reply", ActionBody: "РОЗСУВНІ СИСТЕМИ", Text: "🧩 РОЗСУВНІ СИСТЕМИ" }
  ],
  InputFieldState: "hidden"
});

// Привітальне повідомлення
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

// Відправка заявки на email
const sendConsultation = async (phone, response) => {
  try {
    const mailer = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'viknoshopping@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    await mailer.sendMail({
      from: 'viknoshopping@gmail.com',
      to: 'viknoshopping@gmail.com',
      subject: 'Заявка з Viber бота',
      text: `Контактний телефон: ${phone}`
    });

    response.send(new TextMessage("Дякуємо! Наш консультант зв'яжеться з вами найближчим часом."));
  } catch (err) {
    console.error("Помилка при надсиланні email:", err);
    response.send(new TextMessage("Сталася помилка при надсиланні форми. Спробуйте ще раз."));
  }
};

// Обробка повідомлень
bot.on(BotEvents.MESSAGE_RECEIVED, async (message, response) => {
  const text = message.text?.trim();

  if (["ВІКНА", "ДВЕРІ", "БАЛКОНИ", "РОЗСУВНІ СИСТЕМИ"].includes(text)) {
    response.send(new TextMessage(`Вас цікавить розділ "${text}". Що далі?`, {
      buttons: [
        { ActionType: "reply", ActionBody: "КОНСУЛЬТАЦІЯ", Text: "📞 З'єднати з консультантом" },
        { ActionType: "reply", ActionBody: "МЕНЮ", Text: "🔙 Повернутися в меню" }
      ],
      InputFieldState: "hidden"
    }));
  } else if (text === "КОНСУЛЬТАЦІЯ") {
    response.send(new TextMessage("Натисніть, щоб перейти до чату з консультантом: viber://chat?number=+380678388420"));
  } else if (text === "МЕНЮ") {
    response.send(mainMenu);
  } else if (/^\+?\d{9,15}$/.test(text)) {
    await sendConsultation(text, response);
  } else {
    response.send(mainMenu);
  }
});

// Запуск сервера
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Бот запущено на порту ${port}`);
  if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    bot.setWebhook(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}/webhook`);
  }
});
