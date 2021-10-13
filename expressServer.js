//* Подключение библиотек
const config = require('config');
const express = require('express');
const app = express();
const request = require('request');
//* Данные из конфига
const bitrix24Url = config.get('bitrix24Url');



function getDealById(id) {
  return new Promise((resolve, reject) => {
    request({
      url: `${bitrix24Url}/crm.deal.get?id=${id}`,
      json: true
    }, (error, response, body) => {
      if (error) reject(error);
      resolve(body);
    });
  });
}

/* app.get(`/user/:dealID`, function (req, res, value) {
  res.end()
}); */

app.param(['dealID'], function (req, res, next, value) {
  console.log('ID сделки в битриксе', value)
  next()
})

app.get('/success/:dealID', (req, res) => {
  getDealById(req.params.dealID).then(response => {
    const chatID = response.result.COMMENTS.split(" ")[0];
    const companyName = response.result.COMMENTS.split(" ")[1];
    console.log(companyName, chatID);
    res.end();
  });
});

app.listen(3000, () => {
  console.log('Server has been started...')
});