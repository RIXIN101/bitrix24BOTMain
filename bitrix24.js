// const TelegramBot = require("node-telegram-bot-api");
const config = require('config');
const request = require("request");
const httpBuildQuery = require("http-build-query");
var exports = module.exports = {};
const bitrix24Url = config.get('bitrix24Url');
const TOKEN = config.get('TOKEN');
// const bot = new TelegramBot(TOKEN, {polling: true});

//* Получение контакта
exports.getContact = function(nameCompany, chatId){
getCompanyIdByName(nameCompany).then((response) => {
  const companyId = response.result[0].ID;
  getContactByCompanyId(companyId).then(response => {
    const contactId = response.result[0].CONTACT_ID;
    return getContactByContactId(contactId);
  })
  //! then для работы!
  .then((response)=>{
    if (response.result.length == 0) {
      setTimeout(() => {
            const text = 'Контакт, привязанный к компании, не обнаружен.';
            const data = {
                "chat_id": chatId,
                "text": text
            };
            request.post({
                url: `https://api.telegram.org/bot${TOKEN}/sendMessage`,
                body: data,
                json: true
            }, (error, response, body) => {
                if (error) console.log(error);
                else console.log('Контакт, привязанный к компании, не обнаружен.')
            });
        }, 650);
    }
    if (response.result.length != 0) {
        console.log(response.result.EMAIL);
        contactTemp = {
            NAME: response.result.NAME,
            LAST_NAME: response.result.LAST_NAME,
            PHONE: '',
            EMAIL: ''
        };
        if (response.result.PHONE == undefined) contactTemp.PHONE = 'Не введён';
        else contactTemp.PHONE = response.result.PHONE[0].VALUE;
        if (response.result.EMAIL == undefined) contactTemp.EMAIL = 'Не введён';
        else contactTemp.EMAIL = response.result.EMAIL[0].VALUE

        const successContactData = `
        Контакт привязаный к компании\nИмя: ${contactTemp.NAME} ${contactTemp.LAST_NAME}\nТелефон: ${contactTemp.PHONE}\nEmail: ${contactTemp.EMAIL}`;
        const text = successContactData;
        const data = {
            "chat_id": chatId,
            "text": text
        };
        request.post({
            url: `https://api.telegram.org/bot${TOKEN}/sendMessage`,
            body: data,
            json: true
        }, (error, response, body) => {
            if (error) console.log(error);
            else console.log('Данные контакта отправлены')
        });
    }
  })
})
}



// При создании сделки записывает рядом с ней айди чата в телеге. Потом берет и делает запрос по чату в телеге, 

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
exports.getCompany = function(nameCompany, chatId){
getCompanyIdByName(nameCompany).then((response) => {
    let id = response.result[0].ID;
    return getCompanyById(id);
})
//! then для работы!
.then((response)=>{
    const text = validateCompanyInfo(response);
    const data = {
        "chat_id": chatId,
        "text": text
    };
    request.post({
        url: `https://api.telegram.org/bot${TOKEN}/sendMessage`,
        body: data,
        json: true
    }, (error, response, body) => {
        if (error) console.log(error);
        else console.log('Данные компании отправлены')
    });
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