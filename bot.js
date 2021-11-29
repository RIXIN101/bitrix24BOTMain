//1 pas test YE8wIF77oPpz5XGUQ4Zq
//2 pas test TelXsF8GA2wT08Eeftp0

// 1 no test rG4iwygid1a42aG9NXVc
// 2 no test i4q9JGe09FOVhEZszu3f
//* Подключение библиотек
const TelegramBot = require("node-telegram-bot-api");
const config = require('config');
const request = require("request");
const httpBuildQuery = require("http-build-query");
const robokassa = require('node-robokassa');
const bitrix24 = require('./bitrix24');
const cyrillicToTranslit = require('cyrillic-to-translit-js');
const translitInRus = new cyrillicToTranslit();
//* Создание экземпляра "Робокассы"
const robokassaHelper = new robokassa.RobokassaHelper({
  merchantLogin: 'MyRenter',
  hashingAlgorithm: 'sha256',
  password1: 'YE8wIF77oPpz5XGUQ4Zq',
  password2: 'TelXsF8GA2wT08Eeftp0',
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

//* Обработка команды /start (приветствует пользователя)
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `
Прямые контакты арендаторов коммерческих помещений в СПб по 299 рублей.
Если контакты окажутся не актуальными – мы вернем вам деньги.
Введите название латиницей, а мы скажем, есть ли у нас контакты их сотрудников отдела развития.
Чтобы воспользоваться нашим ботом, введите команду по примеру: _Компания: Магнит_ без точек и лишних пробелов
    `
  , {parse_mode: 'Markdown'});
});

//* Обработка команды /help (пишет как пользователю нужно вводить команду)
bot.onText(/\/help/, (msg) => {
  const { id } = msg.chat;
  const msgObj = 'Напишите _название компании_ (вводить без точки в конце)';
  bot.sendMessage(id, msgObj, {parse_mode: 'Markdown'});
});

//* Обработка ввода пользователя (Вывод клавиатуры query)
//* (обрботка правильности ввода команды; обработка того, из скольки слов состоит название компании)
bot.on('message', msg => {
  globalMsg = msg;
  const {id} = msg.from;
  if (msg.text != '/help' && msg.text != '/start') {
    companyName = msg.text.trim();
    bot.sendMessage(id, `Мы проверяем наличие компание в нашей базе...`);
    checkCompanyAndSendResponse(companyName).then(response => {
      if (response == true) {
          bot.sendMessage(id, `Найдена информация о компании: ${companyName}`);
          bitrix24.someInfoCompany(companyName, id);
          setTimeout(() => {
            bot.sendMessage(id, `После оплаты вам будет предоставлена информация о её контактах. Хотите перейти к оплате?`, {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "Да",
                      callback_data: "CompanyYes",
                    },
                    {
                      text: "Нет",
                      callback_data: "CompanyNo",
                    },
                  ],
                ],
              },
            });
          }, 1855)
      } else {
        if (isCyrillic(companyName) == true) {
          checkCompanyAndSendResponse(translitInRus.transform(companyName)).then(response => {
            if (response == true) {
              bot.sendMessage(id, `Найдена информация о компании: ${companyName}`);
              bitrix24.someInfoCompany(translitInRus.transform(companyName), id);
              setTimeout(() => {
                bot.sendMessage(id, `После оплаты вам будет предоставлена информация о её контактах. Хотите перейти к оплате?`, {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "Да",
                          callback_data: "CompanyCyrYes",
                        },
                        {
                          text: "Нет",
                          callback_data: "CompanyCyrNo",
                        },
                      ],
                    ],
                  },
                });
              }, 2155)
            } else {
              const leadTemp = {
                "fields": {
                  "TITLE": "Ошибка ввода пользователя",
                  "STATUS_ID": "NEW",
                  "OPENED": "Y",
                  "CONTACT_ID": 14681,
                  "CURRENCY_ID": "RUB",
                  "OPPORTUNITY": 0,
                  "COMMENTS": `${msg.from.id} ${companyName}`,
                  "UTM_CAMPAIGN": "Ошибка ввода"
                }
              }
              createLead(leadTemp)
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
            }
          });
        } else {
          checkCompanyAndSendResponse(translitInRus.reverse(companyName)).then(response => {
            if (response == true) {
              bot.sendMessage(id, `Найдена информация о компании: ${companyName}`);
              bitrix24.someInfoCompany(translitInRus.reverse(companyName), id);
              setTimeout(() => {
                bot.sendMessage(id, `После оплаты вам будет предоставлена информация о её контактах. Хотите перейти к оплате?`, {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "Да",
                          callback_data: "CompanyLatYes",
                        },
                        {
                          text: "Нет",
                          callback_data: "CompanyLatNo",
                        },
                      ],
                    ],
                  },
                });
              }, 2155)
            } else {
              const leadTemp = {
                "fields": {
                  "TITLE": "Ошибка ввода пользователя",
                  "STATUS_ID": "NEW",
                  "OPENED": "Y",
                  "CONTACT_ID": 14681,
                  "CURRENCY_ID": "RUB",
                  "OPPORTUNITY": 0,
                  "COMMENTS": `${msg.from.id} ${companyName}`,
                  "UTM_CAMPAIGN": "Ошибка ввода"
                }
              }
              createLead(leadTemp)
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
            }
          })
        }
      }
    });
  }
});
//* Обработка callback query
//* (проверка существует ли такая компания; отправка ссылки если компания существует; и создание "ложной сделки" если компания не сущесвтует)
bot.on('callback_query', query => {
  queryData = query;
  if (query.data == 'CompanyYes') {
    const leadTemp = {
      "fields": {
        "TITLE": "Оплата информации об объекте",
		    "STATUS_ID": "NEW",
		    "OPENED": "Y",
		    "CONTACT_ID": 14681,
		    "CURRENCY_ID": "RUB",
		    "OPPORTUNITY": amount,
		    "COMMENTS": `${query.from.id} ${companyName}`,
        "UTM_CAMPAIGN": "Оплата информации об объекте"
      }
    }
    bot.sendMessage(query.from.id, 'Создается ссылка на оплату. Пожалуйста подождите');
    createOrder(leadTemp);
  }
  if (query.data == 'CompanyNo') {
    bot.sendMessage(query.from.id, `Напишите нам на «контакт поддержки».`);
  }
  if (query.data == 'CompanyCyrYes') {
    const leadTemp = {
      "fields": {
        "TITLE": "Оплата информации об объекте",
		    "STATUS_ID": "NEW",
		    "OPENED": "Y",
		    "CONTACT_ID": 14681,
		    "CURRENCY_ID": "RUB",
		    "OPPORTUNITY": amount,
		    "COMMENTS": `${query.from.id} ${translitInRus.transform(companyName)}`,
        "UTM_CAMPAIGN": "Оплата информации об объекте"
      }
    }
    bot.sendMessage(query.from.id, 'Создается ссылка на оплату. Пожалуйста подождите');
    createOrder(leadTemp);
  }
  if (query.data == 'CompanyCyrNo') {
    bot.sendMessage(query.from.id, `Напишите нам на «контакт поддержки».`);
  }
  if (query.data == 'CompanyLatYes') {
    const leadTemp = {
      "fields": {
        "TITLE": "Оплата информации об объекте",
		    "STATUS_ID": "NEW",
		    "OPENED": "Y",
		    "CONTACT_ID": 14681,
		    "CURRENCY_ID": "RUB",
		    "OPPORTUNITY": amount,
		    "COMMENTS": `${query.from.id} ${translitInRus.reverse(companyName)}`,
        "UTM_CAMPAIGN": "Оплата информации об объекте"
      }
    }
    bot.sendMessage(query.from.id, 'Создается ссылка на оплату. Пожалуйста подождите');
    createOrder(leadTemp);
  }
  if (query.data == 'CompanyLatNo') {
    bot.sendMessage(query.from.id, `Напишите нам на «контакт поддержки».`);
  }

  if (query.data == 'review') {
    bot.sendMessage(query.from.id, 'Подтвердите согласие на обработку персональных данных для того, чтобы мы связались с вами потом.', {
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
  if (query.data == 'Yes') {
    const leadTemp = {
      "fields": {
        "TITLE": "Заявка на неправильный ввод",
        "STATUS_ID": "NEW",
        "OPENED": "Y",
        "CONTACT_ID": 14681,
        "CURRENCY_ID": "RUB",
        "OPPORTUNITY": 0,
        "COMMENTS": `${query.from.id} ${companyName}`,
        "UTM_CAMPAIGN": "Заявка на неправильный ввод"
      }
    }
    createLead(leadTemp)
    bot.sendMessage(query.from.id, `Заявка оставлена. С вами свяжуться в скором времени.`);
  }
  if (query.data == 'No') {
    bot.sendMessage(query.from.id, 'Попробуйте ввести название компании на латиннице или на кириллице.');
  }
});

//* Основная функция. Отправка ссылки. (main chaining function)
function createOrder(leadTemplate) {
  createLeadAndPaymentURL(leadTemplate).then(response => {
    return checkOrderLink(response)
  }).then(response => {
    bot.sendMessage(globalMsg.from.id, response, {parse_mode: 'HTML'});
    console.log("Ссылка была отправлена");
  });
}
//* Создание лида и ссылки на оплату (string)
function createLeadAndPaymentURL(leadTemplate) {
  return new Promise((resolve, reject) => {
    request({
      url: `${bitrix24Url}/crm.lead.add?${httpBuildQuery(leadTemplate)}`,
      json: true
    }, (error, response, body) => {
      console.log(body);
      console.log('Сделка создается');
      if (error) reject(error);
      const options = {
        invId: body.result,
        outSumCurrence: 'RUB',
        isTest: true,
        userData: {
            productId: `${body.result}`,
        }
      }
      const paymentUrl = robokassaHelper.generatePaymentUrl(amount, 'Оплата информации', options);
      resolve(paymentUrl);
    });
  });
}
//* Проверяет пустая ли ссылка или нет (Promise {object})
function checkOrderLink(kassaObjTemp) {
  return new Promise((resolve, reject) => {
    if (kassaObjTemp != '') {
      const orderLink = `<a href="${kassaObjTemp}">Ссылка на оплату</a>`
      resolve(orderLink);
    } else {
      console.log("Ордер не создался");
      resolve("Сделка не создалась");
    }
  });
}

//* Создание сделки, будь то ошибка или отзыв человека. (Promise {object})
function createLead(template) {
  return new Promise((resolve, reject) => {
    request({
      url: `${bitrix24Url}/crm.lead.add?${httpBuildQuery(template)}`,
      json: true
    }, (error, response, body) => {
      if (error) reject(error);
      console.log('Лид создается');
    });
  })
};

//* Проверяет существует ли компания (bool)
function checkCompanyAndSendResponse(companyName) {
  return new Promise((resolve, reject) => {
    request({
      url: `${bitrix24Url}/crm.company.list?filter[TITLE]=${encodeURIComponent(companyName)}`,
      json: true
    }, (error, response, body) => {
      if (error) reject(error);
      body.result.length == 0 ? resolve(false) : resolve(true);
    })
  })
}

//* Функция для проверки строки на кириллический ввод (bool)
const isCyrillic =  (str) => {return /[а-я]/i.test(str)};