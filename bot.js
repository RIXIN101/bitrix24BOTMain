// LQookTma2e9Y32cW0dZV  1 pas not test
// K9Uo1tU8vhCs6W3hfwNn 2 pas not test
//* Подключение библиотек
const TelegramBot = require("node-telegram-bot-api");
const config = require('config');
const request = require("request");
const httpBuildQuery = require("http-build-query");
const crypto = require('crypto');
const cron = require('node-cron');
const express = require('express');
const app = express();
const robokassa = require('node-robokassa');
const robokassaHelper = new robokassa.RobokassaHelper({
  merchantLogin: 'MyRenter',
  hashingAlgorithm: 'sha256',
  password1: 'EBW3Zgn5JRh76B5NwAer', //test
  password2: 'zue65Cr8u8rGPmQIc0Od', //test
  testMode: true,
  resultUrlRequestMethod: 'GET'
});
//* Данные из конфига
const amount = config.get('amount');
const bitrix24Url = config.get('bitrix24Url');
const TOKEN = config.get('TOKEN');
//* Создание бота
const bot = new TelegramBot(TOKEN, {
  polling: true,
});

//* Команда /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Приветствуем нас в нашем боте, чтобы ознакомится с командами введите /help."
  );
});
//* Команда /help
bot.onText(/\/help/, (msg) => {
  const { id } = msg.chat;
  const msgObj = 'Напишите _Компания: название компании_ (вводить без точки в конце)';
  bot.sendMessage(id, msgObj, {parse_mode: 'Markdown'});
});
//* Обработка ввода пользователя (Вывод клавиатуры query)
bot.on('message', msg => {
  const parseMsg = msg.text.split(' ').join('').split('', 9).join('');
  const { id } = msg.chat;
  if (parseMsg == 'Компания:' && parseMsg) {
    match = msg.text.split(' ').join('').split('Компания:');
    newMatch = msg.text.split(' ');
    console.log(newMatch);
    resp = match[1];
    if (newMatch.length > 2) {
      finMatch = msg.text.split('Компания:').join(' ').split("");
      for(let i = 0; i < finMatch.length; i++) {
        if (finMatch[i] == ' ') delete finMatch[i];
        else break;
      }
      bot.sendMessage(id, `Информация по компании ${finMatch.join('')} найдена. Для получения всей информации нужно платить.\nПолучить ссылку на оплату?`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Да",
                callback_data: "Yes",
              },
              {
                text: "Нет",
                callback_data: "No",
              },
            ],
          ],
        },
      });
    } else {
      bot.sendMessage(id, `Информация по компании ${resp} найдена. Для получения всей информации нужно платить.\nПолучить ссылку на оплату?`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Да",
                callback_data: "Yes",
              },
              {
                text: "Нет",
                callback_data: "No",
              },
            ],
          ],
        },
      });
    }
  }
  if ((parseMsg != 'Компания:' && msg.text != '/help') && msg.text != '/start') {
    bot.sendMessage(msg.chat.id, `Введите _/help_ для помощи.`, {parse_mode: 'Markdown'})
  }
});

bot.on('polling_error', err => {
  console.log(err);
});

//* Обработка callback query
bot.on('callback_query', query => {
  queryData = query;
  if (query.data == 'Yes') {
    if (newMatch.length > 2) {
      bot.sendMessage(query.from.id, 'Создается ссылка на оплату. Пожалуйста подождите');
      const contactTemplate = {
        fields: {
            NAME: query.from.first_name,
            LAST_NAME: query.from.last_name,
            COMMENTS: `${query.from.id} ${finMatch.join('')}`,
        }
      };
      console.log(contactTemplate.fields.COMMENTS);
      createOrder(contactTemplate);
    } else {
      bot.sendMessage(query.from.id, 'Создается ссылка на оплату. Пожалуйста подождите');
      const contactTemplate = {
        fields: {
            NAME: query.from.first_name,
            LAST_NAME: query.from.last_name,
            COMMENTS: `${query.from.id} ${resp}`,
        }
      };
      createOrder(contactTemplate);
    }
  }
  if (query.data == 'No') {
    bot.sendMessage(query.from.id, `Повторите предыдущие действия. Введите _/help_, если вдруг забыли, что нужно вводить.`, {parse_mode: 'Markdown'});
  }
});

//* Основная функция. Отправка ссылки.
function createOrder(contactTemplate) {
  createContact(contactTemplate).then(response => {
    console.log("Контакт создался.");
    getContact(contactTemplate).then(response => {
      const dlTmp = response;
      console.log(response);
      console.log("Контакт получен");
      createDealAndPaymentURL(dlTmp, contactTemplate).then(response => {
        const ksObjTmp = response;
        console.log(ksObjTmp);
        console.log('Сделка успешно создана');
        return checkOrderLink(ksObjTmp, contactTemplate);
      })
      //! then для работы
      .then(response => {
        console.log('Ссылка на сделку отправлена');
        bot.sendMessage(queryData.from.id, response, {parse_mode: 'HTML'})
      });
    })
  })
}
//* Создание контакта
function createContact(contactTemplate) {
  return new Promise((resolve, reject) => {
    request({
      url: `${bitrix24Url}/crm.contact.add?${httpBuildQuery(contactTemplate)}`,
      json: true
    }, (error, response, body) => {
      if(error) reject(error);
      resolve(body);
    });
  });
}
//* Получение контакта
function getContact(contactTemplate) {
  return new Promise((resolve, reject) => {
    request({
      url: `${bitrix24Url}/crm.contact.list?filter[NAME]=${contactTemplate.fields.NAME}&[LAST_NAME]=${contactTemplate.fields.LAST_NAME}`,
      json: true
    }, (error, response, body) => {
      if (error) reject(error);
      if (body.total == 0) {
        const markdownRejection = 'Возможно вы неправильно ввели команду: Компания: _Название компании_'
        resolve(markdownRejection);
      }
      if (body.total > 0) {
        if (newMatch.length > 2) {
          const dealTemp = {
            fields: {
                "TITLE": 'Касса_Оплата_Информации',
                "CONTACT_ID": body.result[0].ID,
                "COMMENTS": `${queryData.from.id} ${finMatch.join('')}`,
                "OPPORTUNITY": amount
            }
          };
          resolve(dealTemp);
        } else {
          const dealTemp = {
            fields: {
                "TITLE": 'Касса_Оплата_Информации',
                "CONTACT_ID": body.result[0].ID,
                "COMMENTS": `${queryData.from.id} ${resp}`,
                "OPPORTUNITY": amount
            }
          };
          resolve(dealTemp);
        }
      }
    });
  });
}
//* Создание сделки и ссылки на оплату
function createDealAndPaymentURL(dealTemplate, contactTemplate) {
  return new Promise((resolve, reject) => {
    request({
      url: `${bitrix24Url}/crm.deal.add?${httpBuildQuery(dealTemplate)}`,
      json: true
    }, (error, response, body) => {
      console.log('Сделка создается');
      if (error) reject(error);
      if (contactTemplate.fields.LAST_NAME == undefined) {
        contactTemplate.fields.LAST_NAME = ''
      }
      const options = {
        invId: body.result,
        outSumCurrence: 'RUB',
        isTest: true,
        userData: {
            productId: `${body.result}`,
            username: `${contactTemplate.fields.NAME} ${contactTemplate.fields.LAST_NAME}`
        }
      }
      const paymentUrl = robokassaHelper.generatePaymentUrl(amount, 'Оплата информации', options);
      resolve(paymentUrl);
    });
  });
}
//* Проверяет пустая ли ссылка или нет
function checkOrderLink(kassaObjTemp) {
  return new Promise((resolve, reject) => {
    if (kassaObjTemp != '') {
      const orderLink = `<a href="${kassaObjTemp}">Ссылка на оплату</a>`
      resolve(orderLink);
    } else {
      console.log("Опять что-то не работает");
      resolve("Сделка не создалась");
    }
  });
}



