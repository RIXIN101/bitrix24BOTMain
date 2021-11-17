const config = require('config');
const { response } = require('express');
const request = require("request");
var exports = module.exports = {};
const bitrix24Url = config.get('bitrix24Url');
const TOKEN = config.get('TOKEN');

//* Получение контакта
/* exports.getContacts = function(nameCompany, chatId){
getCompanyIdByName(nameCompany).then((response) => {
  const companyId = response.result[0].ID;
  getContactByCompanyId(companyId, chatId).then(response => {
    return getContactByContactId(response);
  })
  //! then для работы!
  .then((response)=>{
    if (response.error == '') {
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
    } else {
      const text = validateContactInfo(response);
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
} */

exports.getContacts = function(nameCompany, chatId){
  getCompanyIdByName(nameCompany).then((response) => {
    const companyId = response.result[0].ID;
    getContactByCompanyId(companyId, chatId).then(response => {
      return getContactByContactId(response);
    })
    //! then для работы!
    .then((response)=>{
      let text = ``;
      for(let i = 0; i < response.length; i++) {
        text += `${response[i]}\n`;
      }
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
    })
  })
  }

function getContactByContactId(contactsIdArray) {
return new Promise((resolve, reject)=>{
  const contactInfo = [];
  for(let i = 0; i < contactsIdArray.length; i++) {
    request({
      url: `${bitrix24Url}/crm.contact.get?id=${contactsIdArray[i]}`,
      json: true
    }, (error, response, body) => {
          if(error) reject(error)
          contactInfo.push(validateContactInfo(body));
          if (contactInfo.length == contactsIdArray.length) resolve(contactInfo)
    });
  }
})
}

function getContactByCompanyId(companyId, chatId) {
return new Promise((resolve, reject)=>{
  request({
    url: `${bitrix24Url}/crm.company.contact.items.get?id=${companyId}`,
    json: true
  }, (error, response, body) => {
        if(error) reject(error)
        if (body.result == false) {
          resolve(false);
        } else {
          const contactsIdArr = [];
          for(let i = 0; i < body.result.length; i++) {
            contactsIdArr.push(body.result[i].CONTACT_ID);
          }
          resolve(contactsIdArr);
        }
    });
})
}
//* Валидация данных контакта
function validateContactInfo(response) {
  const respObj = {
    phone: ``,
    email: ``,
  };
  // Телефон(-ы)
  if (response.result.HAS_PHONE === "Y") {
    respObj.phone = response.result.PHONE[0].VALUE;
  } else {
    delete respObj.phone;
  }
  // Почта(-ы)
  if (response.result.HAS_EMAIL === "Y") {
    respObj.email = response.result.EMAIL[0].VALUE;
  } else {
    delete respObj.email;
  }
  const successContactData = {
    Title: `\nКонтакт привязаный к компании`,
    NameAndLastName: `\nИмя: ${response.result.NAME} ${response.result.LAST_NAME}`
  };
  if (respObj.phone != undefined) {
    successContactData.Phone = `\nТелефон: ${respObj.phone}`;
  } else successContactData.Phone = '';
  if (respObj.email != undefined) {
    successContactData.Email = `\nE-mail: ${respObj.email}`;
  } else successContactData.Email = '';

  const successContactDataResp = successContactData.Title + successContactData.NameAndLastName + successContactData.Email + successContactData.Phone;
  return successContactDataResp;
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
      console.log(text);
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
    title: ``,
    phone: [],
    email: [],
    web: [],
    kvt: ``,
    adressObject: ``,
  };
  // Название компании
  respObj.title = objData.result.TITLE;
  // кВт
  if (objData.result.UF_CRM_1572363633722 !== "") {
    respObj.kvt = objData.result.UF_CRM_1572363633722;
  } else {
    delete respObj.kvt;
  }
  // Адрес объекта
  if (objData.result.UF_CRM_5DB9353B0228A !== "") {
    respObj.adressObject = objData.result.UF_CRM_5DB9353B0228A;
    const adressObjectArr = respObj.adressObject.split("|")[0];
    respObj.adressObject = adressObjectArr;
  } else {
    delete respObj.adressObject;
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
    delete respObj.phone;
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
    delete respObj.email;
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
    delete respObj.web;
  }

  const successData = {
    successDataTitle: `\nНазвание компании: ${respObj.title}`,
  }

  if (respObj.phone != undefined) {
    successData.successDataPhone = `\nТелефон(-ы): ${respObj.phone}`;
  } else successData.successDataPhone = '';

  if (respObj.email != undefined) {
    successData.successDataEmail = `\nE-mail(-ы): ${respObj.email}`;
  } else successData.successDataEmail = '';

  if (respObj.web != undefined) {
    successData.successDataWeb = `\nСайт(-ы): ${respObj.web}`;
  } else successData.successDataWeb = '';

  if (respObj.adressObject != undefined) {
    successData.successDataAdressObject = `\nАдрес Объекта: ${respObj.adressObject}`;
  } else successData.successDataAdressObject = '';

  if (respObj.kvt != undefined) {
    successData.successDataKvt = `\nкВт: ${respObj.kvt}`;
  } else successData.successDataKvt = '';

  const successDataRes = successData.successDataTitle + successData.successDataPhone + successData.successDataEmail + successData.successDataWeb + successData.successDataAdressObject + successData.successDataKvt;
  return successDataRes;
}

exports.someInfoCompany = function(nameCompany, chatId) {
  getCompanyIdByName(nameCompany).then((response) => {
    console.log(response);
    let id = response.result[0].ID;
    return getCompanyById(id)
  }).then(response => {
    const companyData = response;
    contactCounter(response.result.ID).then(response => {
      if (response != 0) {
        const text = `${validateSomeInfoCompany(companyData)}\nКоличество привязанных контактов: ${response}`;
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
            else console.log('Неполные данные компании отправлены')
        });
      } else {
        const text = `${validateSomeInfoCompany(companyData)}`;
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
            else console.log('Неполные данные компании отправлены')
        });
      }
    });
  })
}

function contactCounter(companyId) {
  return new Promise((resolve, reject)=>{
    request({
      url: `${bitrix24Url}/crm.company.contact.items.get?id=${companyId}`,
      json: true
    }, (error, response, body) => {
          if(error) reject(error)
          if (body.result == false) {
            resolve(0);
          } else {
            resolve(body.result.length);
          }
      });
  })
}

function validateSomeInfoCompany(objData) {
  let someInfoCompanyData = {
    title: '',
    phone: '',
    email: '',
    web: ''
  };
  if (objData.result.TITLE != undefined) someInfoCompanyData.title = '✅';
  else someInfoCompanyData.title = 'No';
  if (objData.result.HAS_PHONE == 'Y') someInfoCompanyData.phone = '✅';
  else someInfoCompanyData.phone = 'No';
  if (objData.result.HAS_EMAIL == 'Y') someInfoCompanyData.email = '✅';
  else someInfoCompanyData.email = 'No';
  if (objData.result.WEB != undefined) someInfoCompanyData.web = '✅';
  else someInfoCompanyData.web = 'No';

  let someInfoCompanyDataNotCheck = {
    title: `Название компании: ${someInfoCompanyData.title}`,
    phone: `Телефон: ${someInfoCompanyData.phone}`,
    email: `E-mail: ${someInfoCompanyData.email}`,
    web: `Сайт: ${someInfoCompanyData.web}`
  }

  if (someInfoCompanyData.title == 'No') {
    delete someInfoCompanyDataNotCheck.title;
    if (someInfoCompanyDataNotCheck.title == undefined) someInfoCompanyDataNotCheck.title = '';
  }
  if (someInfoCompanyData.phone == 'No') {
    delete someInfoCompanyDataNotCheck.phone;
    if (someInfoCompanyDataNotCheck.phone == undefined) someInfoCompanyDataNotCheck.phone = '';
  }
  if (someInfoCompanyData.email == 'No') {
    delete someInfoCompanyDataNotCheck.email;
    if (someInfoCompanyDataNotCheck.email == undefined) someInfoCompanyDataNotCheck.email = '';
  }
  if (someInfoCompanyData.web == 'No') {
    delete someInfoCompanyDataNotCheck.web;
    if (someInfoCompanyDataNotCheck.web == undefined) someInfoCompanyDataNotCheck.web = '';
  }

  someInfoCompanyDataParsed = `${someInfoCompanyDataNotCheck.title}\n${someInfoCompanyDataNotCheck.phone}\n${someInfoCompanyDataNotCheck.email}\n${someInfoCompanyDataNotCheck.web}`;
  return someInfoCompanyDataParsed
}