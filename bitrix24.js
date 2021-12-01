const config = require('config');
const request = require("request");
var exports = module.exports = {};
const bitrix24Url = config.get('bitrix24Url');
const TOKEN = config.get('TOKEN');

//* Получение контакта
exports.getContacts = function(nameCompany, chatId){
  getCompanyIdByName(nameCompany).then((response) => {
      const companyId = response.result[0].ID;
      getContactByCompanyId(companyId).then(response => {
        if (response == false) {
          const text = 'Контакт, привязанный к компании, не обнаружен.';
          const data = {
              "chat_id": chatId,
              "text": text
          };
          return request.post({
              url: `https://api.telegram.org/bot${TOKEN}/sendMessage`,
              body: data,
              json: true
          }, (error, response, body) => {
              if (error) console.log(error);
              else console.log('Контакт, привязанный к компании, не обнаружен.')
          });
        } else {
          return getContactByContactId(response);
        }
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

function getContactByCompanyId(companyId) {
  return new Promise((resolve, reject)=>{
    request({
      url: `${bitrix24Url}/crm.company.contact.items.get?id=${companyId}`,
      json: true
    }, (error, response, body) => {
          if(error) reject(error)
          if (body.result.length == 0) {
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
    comments: ``,
    position: ``,
    partOfCity: ``
  };
  // Телефон(-ы)
  response.result.HAS_PHONE === "Y" ? respObj.phone = response.result.PHONE[0].VALUE : delete respObj.phone;
  // Почта(-ы)
  response.result.HAS_EMAIL === "Y" ? respObj.email = response.result.EMAIL[0].VALUE : delete respObj.email;
  // Комментарий
  response.result.COMMENTS != "" ? respObj.comments = response.result.COMMENTS : delete respObj.comments;
  // Должность
  response.result.UF_CRM_1572360601903 != "" ? respObj.position = response.result.UF_CRM_1572360601903 : delete respObj.position;
  // Часть города за которую отвечает
  response.result.UF_CRM_1572360940877 != "" ? respObj.partOfCity = response.result.UF_CRM_1572360940877 : delete respObj.partOfCity;

  const successContactData = {
    Title: `\nКонтакт привязаный к компании`,
    NameAndLastName: `\nИмя: ${response.result.NAME} ${response.result.LAST_NAME}`
  };
  // Телефон(-ы)
  respObj.phone != undefined ? successContactData.Phone = `\nТелефон: ${respObj.phone}` : successContactData.Phone = '';
  // Почта(-ы)
  respObj.email != undefined ? successContactData.Email = `\nE-mail: ${respObj.email}` : successContactData.Email = '';
  // Комментарий
  respObj.comments != undefined ? successContactData.comments = `\nКомментарий: ${respObj.comments}` : successContactData.comments = ''
  // Должность
  respObj.position != undefined ? successContactData.position = `\nДолжность: ${respObj.position}` : successContactData.position = '';
  // Часть города за которую отвечает
  respObj.partOfCity != undefined ? successContactData.partOfCity = `\nЗа какую часть города отвечает: ${respObj.partOfCity}` : successContactData.partOfCity = ''

  const successContactDataResp = successContactData.Title + successContactData.NameAndLastName + successContactData.Email + successContactData.Phone + successContactData.comments + successContactData.position + successContactData.partOfCity;
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
    comments: ``,
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
  if (objData.result.COMMENTS !== "") {
    respObj.comments = objData.result.COMMENTS;
  } else {
    delete respObj.comments
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

  if (respObj.comments != undefined) {
    successData.successDataComments = `\nКомментарий: ${respObj.comments}`;
  } else successData.successDataComments = '';

  const successDataRes = successData.successDataTitle + successData.successDataPhone + successData.successDataEmail + successData.successDataWeb + successData.successDataAdressObject + successData.successDataKvt + successData.successDataComments;
  return successDataRes;
}

exports.someInfoCompany = function(nameCompany, chatId) {
  getCompanyIdByName(nameCompany).then((response) => {
    console.log('Ok');
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

  objData.result.TITLE != undefined ? someInfoCompanyData.title = '✅' : someInfoCompanyData.title = 'No';
  objData.result.HAS_PHONE == 'Y' ? someInfoCompanyData.phone = '✅' : someInfoCompanyData.phone = 'No';
  objData.result.HAS_EMAIL == 'Y' ? someInfoCompanyData.email = '✅' : someInfoCompanyData.email = 'No';
  objData.result.WEB != undefined ? someInfoCompanyData.web = '✅' : someInfoCompanyData.web = 'No';
  objData.result.COMMENTS != undefined ? someInfoCompanyData.comments = '✅' : someInfoCompanyData.comments = 'No';

  let someInfoCompanyDataNotCheck = {
    title: `\nНазвание компании: ${someInfoCompanyData.title}`,
    phone: `\nТелефон: ${someInfoCompanyData.phone}`,
    email: `\nE-mail: ${someInfoCompanyData.email}`,
    web: `\nСайт: ${someInfoCompanyData.web}`,
    comments: `\nКомментарий: ${someInfoCompanyData.comments}`
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
  if (someInfoCompanyData.comments == 'No') {
    delete someInfoCompanyDataNotCheck.comments;
    if (someInfoCompanyDataNotCheck.comments == undefined) someInfoCompanyDataNotCheck.comments == '';
  }

  someInfoCompanyDataParsed = someInfoCompanyDataNotCheck.title + someInfoCompanyDataNotCheck.phone + someInfoCompanyDataNotCheck.email + someInfoCompanyDataNotCheck.web + someInfoCompanyDataNotCheck.comments
  return someInfoCompanyDataParsed
}

