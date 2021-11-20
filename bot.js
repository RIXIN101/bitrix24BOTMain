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

const isCyrillic = function (str) {
  return /[а-я]/i.test(str);
}

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
  const msgObj = 'Напишите _Компания: название компании_ (вводить без точки в конце)';
  bot.sendMessage(id, msgObj, {parse_mode: 'Markdown'});
});

//* Обработка ввода пользователя (Вывод клавиатуры query)
//* (обрботка правильности ввода команды; обработка того, из скольки слов состоит название компании)
bot.on('message', msg => {
  const commandEventWord = msg.text.split(' ').join('').split('', 9).join('');
  const { id } = msg.chat;
  if (commandEventWord === 'Компания:') {
    match = msg.text.split(' ').join('').split('Компания:');
    newMatch = msg.text.split(' ');
    oneWordCompanyName = match[1];
    if (newMatch.length > 2) {
      if (msg.text[8] == ' ' || msg.text[9] != ' ') {
        bot.sendMessage(id, 'Напишите _/help_ для получения информации о вводе команды корректно', {parse_mode: 'Markdown'})
      } else {
        severalWordCompanyName = msg.text.split('Компания:').join(' ').split("");
        for(let i = 0; i < severalWordCompanyName.length; i++) {
          if (severalWordCompanyName[i] == ' ') delete severalWordCompanyName[i];
          else break;
        }
        bot.sendMessage(id, `Мы проверяем наличие компание в нашей базе...`)
        checkCompanyAndSendResponse(severalWordCompanyName.join('')).then(response => {
          if (response == true) {
              bot.sendMessage(id, `Найдена информация о компании: ${severalWordCompanyName.join('')}`);
              bitrix24.someInfoCompany(severalWordCompanyName.join(''), id);
              setTimeout(() => {
                bot.sendMessage(id, `После оплаты вам будет предоставлена информация о её контактах. Хотите перейти к оплате?`, {
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
              }, 1855)
          } else {
            if (isCyrillic(severalWordCompanyName.join('')) == true) {
              checkCompanyAndSendResponse(translitInRus.transform(severalWordCompanyName.join(''))).then(response => {
                if (response == true) {
                  bot.sendMessage(id, `Найдена информация о компании: ${translitInRus.transform(severalWordCompanyName.join(''))}`);
                  bitrix24.someInfoCompany(translitInRus.transform(severalWordCompanyName.join('')), id);
                  setTimeout(() => {
                    bot.sendMessage(id, `После оплаты вам будет предоставлена информация о её контактах. Хотите перейти к оплате?`, {
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
                  }, 1855)
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
                }
              });
            } else {
              checkCompanyAndSendResponse(translitInRus.reverse(severalWordCompanyName.join(''))).then(response => {
                if (response == true) {
                  bot.sendMessage(id, `Найдена информация о компании: ${translitInRus.reverse(severalWordCompanyName.join(''))}`);
                  bitrix24.someInfoCompany(translitInRus.reverse(severalWordCompanyName.join('')), id);
                  setTimeout(() => {
                    bot.sendMessage(id, `После оплаты вам будет предоставлена информация о её контактах. Хотите перейти к оплате?`, {
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
                  }, 1855)
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
                }
              })
            }
          }
        });
      }
    } else {
      if (msg.text[9] != ' ') {
        bot.sendMessage(id, 'Напишите _/help_ для получения информации о вводе команды корректно', {parse_mode: 'Markdown'})
      } else {
        bot.sendMessage(id, `Мы проверяем наличие компание в нашей базе...`)
        checkCompanyAndSendResponse(oneWordCompanyName).then(response => {
          if (response == true) {
              bot.sendMessage(id, `Найдена информация о компании: ${oneWordCompanyName}`);
              bitrix24.someInfoCompany(oneWordCompanyName, id);
              setTimeout(() => {
                bot.sendMessage(id, `После оплаты вам будет предоставлена информация о её контактах. Хотите перейти к оплате?`, {
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
              }, 1855)
          } else {
            if (isCyrillic(oneWordCompanyName) == true) {
              checkCompanyAndSendResponse(translitInRus.transform(oneWordCompanyName)).then(response => {
                if (response == true) {
                  bot.sendMessage(id, `Найдена информация о компании: ${translitInRus.transform(oneWordCompanyName)}`);
                  bitrix24.someInfoCompany(translitInRus.transform(oneWordCompanyName), id);
                  setTimeout(() => {
                    bot.sendMessage(id, `После оплаты вам будет предоставлена информация о её контактах. Хотите перейти к оплате?`, {
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
                  }, 1855)
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
                }
              });
            } else {
              checkCompanyAndSendResponse(translitInRus.reverse(oneWordCompanyName)).then(response => {
                if (response == true) {
                  bot.sendMessage(id, `Найдена информация о компании: ${translitInRus.reverse(oneWordCompanyName)}`);
                  bitrix24.someInfoCompany(translitInRus.reverse(oneWordCompanyName), id);
                  setTimeout(() => {
                    bot.sendMessage(id, `После оплаты вам будет предоставлена информация о её контактах. Хотите перейти к оплате?`, {
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
                  }, 1855)
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
                }
              })
            }
          }
        });
      }
    }
  }
  if ((commandEventWord != 'Компания:' && msg.text != '/help') && msg.text != '/start') {
    bot.sendMessage(msg.chat.id, `Введите _/help_ для помощи.`, {parse_mode: 'Markdown'})
  }
});

//* Обработка callback query
//* (проверка существует ли такая компания; отправка ссылки если компания существует; и создание "ложной сделки" если компания не сущесвтует)
bot.on('callback_query', query => {
  queryData = query;
  if (query.data == 'Yes') {
    if (newMatch.length > 2 && newMatch[1] != ':') {
      checkCompanyAndSendResponse(severalWordCompanyName.join('')).then(response => {
        const contactTemplate = {
          fields: {
              NAME: `${query.from.first_name}`,
              LAST_NAME: `${query.from.last_name}`,
              COMMENTS: `${query.from.id} ${severalWordCompanyName.join('')}`,
          }
        };
        if (contactTemplate.fields.LAST_NAME == undefined) {
          contactTemplate.fields.LAST_NAME = '';
        }
        bot.sendMessage(query.from.id, 'Создается ссылка на оплату. Пожалуйста подождите');
        createOrder(contactTemplate);
      });
    } else {
      checkCompanyAndSendResponse(oneWordCompanyName).then(response => {
        const contactTemplate = {
          fields: {
              NAME: query.from.first_name,
              LAST_NAME: query.from.last_name,
              COMMENTS: `${query.from.id} ${oneWordCompanyName}`,
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
  if (newMatch.length > 2) {
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
      });
    }
    if (query.data == 'Yes2') {
      const rejectContactTmp = {
        fields: {
          NAME: query.from.first_name,
          LAST_NAME: query.from.last_name,
          COMMENTS: `@${query.from.username} ${severalWordCompanyName.join('')}`
        }
      }
      if (query.from.last_name == undefined) {
        rejectContactTmp.fields.LAST_NAME = '';
      }
      createRejectDeal(rejectContactTmp);
    }
    if (query.data == 'No2') {
      bot.sendMessage(querySucData.from.id, 'Попробуйте ввести название компании на латиннице или на кириллице.');
    }
  } else {
    if (query.data == 'review') {
      bot.sendMessage(query.from.id, 'Подтвердите согласие на обработку персональных данных для того, чтобы мы связались с вами потом.', {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Да",
                callback_data: "Yes3",
              },
              {
                text: "Нет",
                callback_data: "No3",
              },
            ],
          ],
        },
      })
    }
    if (query.data == 'Yes3') {
      const rejectContactTmp = {
        fields: {
          NAME: query.from.first_name,
          LAST_NAME: query.from.last_name,
          COMMENTS: `@${query.from.username} ${oneWordCompanyName}`
        }
      }
      if (query.from.last_name == undefined) {
        rejectContactTmp.fields.LAST_NAME = '';
      }
      createRejectDeal(rejectContactTmp);
    }
    if (query.data == 'No3') {
      bot.sendMessage(query.from.id, 'Попробуйте ввести название компании на латиннице или на кириллице.');
    }
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
                "COMMENTS": `${queryData.from.id} ${severalWordCompanyName.join('')}`,
                "OPPORTUNITY": amount
            }
          };
          resolve(dealTemp);
        } else {
          const dealTemp = {
            fields: {
                "TITLE": 'Касса_Оплата_Информации',
                "CONTACT_ID": body.result[0].ID,
                "COMMENTS": `${queryData.from.id} ${oneWordCompanyName}`,
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

//* Если название такой компании скрипт не нашёл (main сhaining function for this function tree)
function createRejectDeal(tmp) {
  console.log("Создалась отказанная сделка");
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
                "COMMENTS": `@${queryData.from.username} ${severalWordCompanyName.join('')}`,
                "OPPORTUNITY": 0
            }
          };
          resolve(dealTemp);
        } else {
          const dealTemp = {
            fields: {
                "TITLE": 'Касса_Отказ_Оплаты_Информации',
                "CONTACT_ID": body.result[0].ID,
                "COMMENTS": `@${queryData.from.username} ${oneWordCompanyName}`,
                "OPPORTUNITY": 0
            }
          };
          resolve(dealTemp);
        }
      }
    });
  });
}

//* Создание сделки (object)
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

//* Проверяет существует ли компания (bool)
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
