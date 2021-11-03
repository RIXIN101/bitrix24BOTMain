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
const { response } = require("express");
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
    `
Прямые контакты арендаторов коммерческих помещений в СПб по 299 рублей.
Если контакты окажутся не актуальными – мы вернем вам деньги.
Введите название латиницей, а мы скажем, есть ли у нас контакты их сотрудников отдела развития.
    `
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
  if (parseMsg === 'Компания:') {
    match = msg.text.split(' ').join('').split('Компания:');
    newMatch = msg.text.split(' ');
    resp = match[1];
    if (newMatch.length > 2) {
      if (msg.text[8] == ' ' || msg.text[9] != ' ') {
        bot.sendMessage(id, 'Напишите _/help_ для получения информации о вводе команды корректно', {parse_mode: 'Markdown'})
      } else {
        finMatch = msg.text.split('Компания:').join(' ').split("");
        for(let i = 0; i < finMatch.length; i++) {
          if (finMatch[i] == ' ') delete finMatch[i];
          else break;
        }
        checkCompanyAndSendResponse(finMatch.join('')).then(response => {
          if (response == true) {
            bot.sendMessage(id, `Мы нашли информацию о компании: ${finMatch.join('')}. После оплаты вам будет предоставлена информация о её контактах. Хотите перейти к оплате?`, {
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
            bot.sendMessage(id, 'Контактов этой компании у нас нет – оставьте заявку, мы попробуем их получить. После этого пришлем их вам бесплатно.', {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "Оставить заявку",
                      callback_data: "review",
                    },
                  ],
                ],
              },
            });
            bot.on('callback_query', query => {
              if (query.data == 'review') {
                bot.sendMessage(query.from.id, 'Подтвердите согласие на обработку персональных данных для того, чтобы мы связались с вами потом.', {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "Да",
                          callback_data: "Yes2",
                        },
                        {
                          text: "Нет",
                          callback_data: "No2",
                        },
                      ],
                    ],
                  },
                })
                bot.on('callback_query', querySucData => {
                  if (querySucData.data == 'Yes2') {
                    const rejectContactTmp = {
                      fields: {
                        NAME: contactTemplate.fields.NAME,
                        LAST_NAME: contactTemplate.fields.LAST_NAME,
                        COMMENTS: `@${query.from.username} ${finMatch.join('')}`
                      }
                    }
                    createRejectDeal(rejectContactTmp);
                  }
                  if (querySucData.data == 'No2') {
                    bot.sendMessage(querySucData.from.id, 'Попробуйте ввести название компании на латиннице или на кириллице.');
                  }
                })
              }
            });
          }
        });
      }
    } else {
      if (msg.text[9] != ' ') {
        bot.sendMessage(id, 'Напишите _/help_ для получения информации о вводе команды корректно', {parse_mode: 'Markdown'})
      } else {
        checkCompanyAndSendResponse(resp).then(response => {
          if (response == true) {
            bot.sendMessage(id, `Мы нашли информацию о компании: ${resp}. После оплаты вам будет предоставлена информация о её контактах. Хотите перейти к оплате?`, {
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
            bot.sendMessage(id, 'Контактов этой компании у нас нет – оставьте заявку, мы попробуем их получить. После этого пришлем их вам бесплатно.', {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "Оставить заявку",
                      callback_data: "review",
                    },
                  ],
                ],
              },
            });
            bot.on('callback_query', query => {
              if (query.data == 'review') {
                bot.sendMessage(query.from.id, 'Подтвердите согласие на обработку персональных данных для того, чтобы мы связались с вами потом.', {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "Да",
                          callback_data: "Yes2",
                        },
                        {
                          text: "Нет",
                          callback_data: "No2",
                        },
                      ],
                    ],
                  },
                })
                bot.on('callback_query', querySucData => {
                  if (querySucData.data == 'Yes2') {
                    const rejectContactTmp = {
                      fields: {
                        NAME: contactTemplate.fields.NAME,
                        LAST_NAME: contactTemplate.fields.LAST_NAME,
                        COMMENTS: `@${query.from.username} ${resp}`
                      }
                    }
                    createRejectDeal(rejectContactTmp);
                  }
                  if (querySucData.data == 'No2') {
                    bot.sendMessage(querySucData.from.id, 'Попробуйте ввести название компании на латиннице или на кириллице.');
                  }
                })
              }
            });
          }
        });
      }
    }
  }
  if ((parseMsg != 'Компания:' && msg.text != '/help') && msg.text != '/start') {
    bot.sendMessage(msg.chat.id, `Введите _/help_ для помощи.`, {parse_mode: 'Markdown'})
  }
});


//* Обработка callback query
bot.on('callback_query', query => {
  queryData = query;
  if (query.data == 'Yes') {
    if (newMatch.length > 2 && newMatch[1] != ':') {
      checkCompanyAndSendResponse(finMatch.join('')).then(response => {
        const contactTemplate = {
          fields: {
              NAME: `${query.from.first_name}`,
              LAST_NAME: `${query.from.last_name}`,
              COMMENTS: `${query.from.id} ${finMatch.join('')}`,
          }
        };
        if (contactTemplate.fields.LAST_NAME == undefined) {
          contactTemplate.fields.LAST_NAME = '';
        }
        bot.sendMessage(query.from.id, 'Создается ссылка на оплату. Пожалуйста подождите');
        createOrder(contactTemplate);
      });
    } else {
      checkCompanyAndSendResponse(resp).then(response => {
        console.log(response);
        const contactTemplate = {
          fields: {
              NAME: query.from.first_name,
              LAST_NAME: query.from.last_name,
              COMMENTS: `${query.from.id} ${resp}`,
          }
        };
        if (contactTemplate.fields.LAST_NAME == undefined) {
          contactTemplate.fields.LAST_NAME = '';
        }
        bot.sendMessage(query.from.id, 'Создается ссылка на оплату. Пожалуйста подождите');
        createOrder(contactTemplate);
      });
    }
  }
  if (query.data == 'No') {
    bot.sendMessage(query.from.id, `Попробуйте ввести название как на кириллице, так и на латиннице`);
  }
});

//* Основная функция. Отправка ссылки.
function createOrder(contactTemplate) {
  createContact(contactTemplate).then(response => {
    console.log("Контакт создался.");
    getContact(contactTemplate).then(response => {
      const dlTmp = response;
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
function createContact(cntctTmplte) {
  return new Promise((resolve, reject) => {
    request({
      url: `${bitrix24Url}/crm.contact.add?${httpBuildQuery(cntctTmplte)}`,
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
      url: `${bitrix24Url}/crm.contact.list?filter[NAME]=${encodeURIComponent(contactTemplate.fields.NAME)}&[LAST_NAME]=${encodeURIComponent(contactTemplate.fields.LAST_NAME)}`,
      json: true
    }, (error, response, body) => {
      if (error) reject(error);
      if (body.total == 0) {
        const markdownRejection = 'Возможно вы неправильно ввели команду: Компания: _Название компании_'
        resolve(markdownRejection);
      }
      if (body.total > 0) {
        if (newMatch.length > 2 && newMatch[1] != ':') {
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

      console.log(body);
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

//* Если название такой компании скрипт не нашёл
function createRejectDeal(tmp) {
  console.log("Создалась отказанная сделка")
  createContact(tmp).then(response => {
    console.log("Контакт создался.");
    getContactForReject(tmp).then(response => {
      const dlTmp = response;
      console.log("Контакт получен");
      createDeal(dlTmp).then(response => {
        bot.sendMessage(queryData.from.id, response);
      });
    });
  })
}

function getContactForReject(tmp) {
  return new Promise((resolve, reject) => {
    request({
      url: `${bitrix24Url}/crm.contact.list?filter[NAME]=${encodeURIComponent(tmp.fields.NAME)}&[LAST_NAME]=${encodeURIComponent(tmp.fields.LAST_NAME)}`,
      json: true
    }, (error, response, body) => {
      if (error) reject(error);
      if (body.total == 0) {
        const markdownRejection = 'Возникла ошибка: попробуйте ещё раз.';
        resolve(markdownRejection);
      }
      if (body.total > 0) {
        if (newMatch.length > 2) {
          const dealTemp = {
            fields: {
                "TITLE": 'Касса_Отказ_Оплаты_Информации',
                "CONTACT_ID": body.result[0].ID,
                "COMMENTS": `@${queryData.from.username} ${finMatch.join('')}`,
                "OPPORTUNITY": 0
            }
          };
          resolve(dealTemp);
        } else {
          const dealTemp = {
            fields: {
                "TITLE": 'Касса_Отказ_Оплаты_Информации',
                "CONTACT_ID": body.result[0].ID,
                "COMMENTS": `@${queryData.from.username} ${resp}`,
                "OPPORTUNITY": 0
            }
          };
          resolve(dealTemp);
        }
      }
    });
  });
}

function createDeal(dealTemplate) {
  return new Promise((resolve, reject) => {
    request({
      url: `${bitrix24Url}/crm.deal.add?${httpBuildQuery(dealTemplate)}`,
      json: true
    }, (error, response, body) => {
      if (error) reject(error);
      console.log('Сделка создается');
      resolve('Заявка оставлена. С вами свяжуться в скором времени.');
    });
  })
}

function checkCompanyAndSendResponse(companyName) {
  return new Promise((resolve, reject) => {
    request({
      url: `${bitrix24Url}/crm.company.list?filter[TITLE]=${encodeURIComponent(companyName)}`,
      json: true
    }, (error, response, body) => {
      if (error) reject(error);
      if (body.result.length == 0) {
        resolve(false);
      } else {
        resolve(true)
      }
    })
  })
}

