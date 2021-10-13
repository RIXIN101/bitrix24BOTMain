// NKi4rN0vyVJ6sB85wPAJ  1 pas not test
// D16LJj4MrfvpA85wyBgW 2 pas not test
//* Подключение библиотек
const TelegramBot = require("node-telegram-bot-api");
const config = require('config');
const request = require("request");
const httpBuildQuery = require("http-build-query");
const crypto = require('crypto');
const cron = require('node-cron');
const { log } = require("console");
const express = require('express');
const app = express();
const robokassa = require('node-robokassa');
const robokassaHelper = new robokassa.RobokassaHelper({
  merchantLogin: 'MyRenter',
  hashingAlgorithm: 'sha256',
  password1: 'HaW420oLK3cfYcO0bXMH', //test
  password2: 'qo0T4Tg0av6vidCc7JzH', //test
  testMode: true,
  resultUrlRequestMethod: 'GET'
});
//* Данные из конфига
const bitrix24Url = config.get('bitrix24Url');
const amount = config.get('amount');
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
    resp = match[1];
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

  if ((parseMsg != 'Компания:' && msg.text != '/help') && msg.text != '/start') {
    bot.sendMessage(msg.chat.id, `Введите _/help_ для помощи.`, {parse_mode: 'Markdown'})
  }
});

//* Получение контакта
function getContact(nameCompany, chatId){
getCompanyIdByName(nameCompany).then((response) => {
  const companyId = response.result[0].ID;
  getContactByCompanyId(companyId).then(response => {
    const contactId = response.result[0].CONTACT_ID;
    return getContactByContactId(contactId);
  })
  //! then для работы!
  .then((response)=>{
    if (response.result.length == 0) {
      setTimeout(() => bot.sendMessage(chatId, 'Контакт, привязанный к компании, не обнаружен.'), 650);
    }
    if (response.result.length != 0) {
      contactTemp = {
        NAME: response.result.NAME,
        LAST_NAME: response.result.LAST_NAME,
        PHONE: response.result.PHONE[0].VALUE,
        EMAIL: response.result.EMAIL[0].VALUE,
      };
      const successContactData = `
          *Контакт привязаный к компании*\n_Имя_: ${contactTemp.NAME} ${contactTemp.LAST_NAME}\n_Телефон_: ${contactTemp.PHONE}\n_Email_: ${contactTemp.EMAIL}`;
      bot.sendMessage(chatId, successContactData, {parse_mode: 'Markdown'})
    }
  })
})
}

function getContactByContactId(contactId) {
return new Promise((resolve, reject)=>{
  request({
    url: `${bitrix24Url}/crm.contact.get?id=${contactId}`,
    json: true
  }, (error, response, body) => {
        if(error) reject(error)
        resolve(body);
    });
})
}

function getContactByCompanyId(companyId) {
return new Promise((resolve, reject)=>{
  request({
    url: `${bitrix24Url}/crm.company.contact.items.get?id=${companyId}`,
    json: true
  }, (error, response, body) => {
        if(error) reject(error)
        resolve(body);
    });
})
}

//* Получение основной информации о компании
function getCompany(nameCompany, chatId){
getCompanyIdByName(nameCompany).then((response) => {
  let id = response.result[0].ID;
  return getCompanyById(id);
})
//! then для работы!
.then((response)=>{
  bot.sendMessage(chatId, validateCompanyInfo(response));
})
}

function getCompanyIdByName(name){
return new Promise((resolve, reject)=>{
  request({
    url: `${bitrix24Url}/crm.company.list?filter[TITLE]=${encodeURIComponent(name)}`,
    json: true
  }, (error, response, body) => {
        if(error) reject(error)
        resolve(body);
    });
})
}

function getCompanyById(id){
return new Promise((resolve, reject)=>{
  request({
    url: `${bitrix24Url}/crm.company.get?id=${id}`,
    json: true
  }, (error, response, body) => {
        if(error) reject(error)
        resolve(body);
    });
})
}
//* Валидация данных компании
function validateCompanyInfo(objData) {
const respObj = {
  title: "",
  phone: [],
  email: [],
  web: [],
  kvt: "",
  adressObject: "",
};
// кВт
if (objData.result.UF_CRM_1572363633722 !== "") {
  respObj.kvt = objData.result.UF_CRM_1572363633722;
} else {
  respObj.kvt = "Не заполнено";
}
// Адрес объекта
if (objData.result.UF_CRM_5DB9353B0228A !== "") {
  respObj.adressObject = objData.result.UF_CRM_5DB9353B0228A;
  const adressObjectArr = respObj.adressObject.split("|")[0];
  respObj.adressObject = adressObjectArr;
} else {
  respObj.adressObject = "Не заполнено";
}
// Телефон(-ы)
if (objData.result.HAS_PHONE === "Y") {
  const phone = objData.result.PHONE;
  for (let i = 0; i < phone.length; i++) {
    respObj.phone.push(objData.result.PHONE[i].VALUE);
  }
  const phoneArr = respObj.phone.join(" , ");
  respObj.phone = phoneArr;
} else {
  respObj.phone = "Не заполнено";
}
// Почта(-ы)
if (objData.result.HAS_EMAIL === "Y") {
  const email = objData.result.EMAIL;
  for (let i = 0; i < email.length; i++) {
    respObj.email.push(objData.result.EMAIL[i].VALUE);
  }
  const emailArr = respObj.email.join(" , ");
  respObj.email = emailArr;
} else {
  respObj.email = "Не заполнено";
}
// Сайт(-ы)
if (objData.result.WEB !== undefined) {
  const web = objData.result.WEB;
  for (let i = 0; i < web.length; i++) {
    respObj.web.push(objData.result.WEB[i].VALUE);
  }
  const webArr = respObj.web.join(" , ");
  respObj.web = webArr;
} else {
  respObj.web = "Не заполнено";
}
const successData = `\nНазвание компании: ${respObj.title}\nТелефон: ${respObj.phone}\nE-mail: ${respObj.email}\nСайт: ${respObj.web}\nАдрес Объекта: ${respObj.adressObject}\nкВт: ${respObj.kvt}`;
return successData;
}


//* Обработка callback query
bot.on('callback_query', query => {
  queryData = query;
  if (query.data == 'Yes') {
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
        const markdownRejection = 'Возможно вы неправильно ввели команду. Пример: _/contacts Название_'
        resolve(markdownRejection);
      }
      if (body.total > 0) {
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
      const paymentUrl = robokassaHelper.generatePaymentUrl(amount, body.COMMENTS, options);
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


//TODO Если всё будет очень плохо, это ничем не поможет, но будет спамить мне в чат.)
/* bot.on('polling_error', err => {
  bot.sendMessage('497394343', `Произошла ошибка и причем очень серьезная, раз я отправил это тебе`);
}); */


