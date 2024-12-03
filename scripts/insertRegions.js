require("../db")();
const config = require("../config");
const Region = require("../models/Region");

module.exports = new Promise(async (res, rej) => {
  try {
    await Region({
      name: "Московская область",
      contacts: {
        consumerAdministration: {
          email: "testMSK2@gmail.com",
          phone: "299 99 99",
        },
        communityAdministration: {
          email: "testMSK2@gmail.com123",
          phone: "299 99 99",
        },
        support: { email: "test1", phone: "299 99 99" },
      },
      logo: "/media/newLogo.svg",
      pay: {
        lspu: "4689",
        pointCode: "11111",
        abonentId: "46898519",
        idpu: "40001",
        service: "4011",
        typePaymentCode: "40001",
        merchant: "90000011",
        equiring: "https://pgtest.abr.ru:4443",
        gateUrl: "http://10.196.35.129:8080/ecsop_gate/gatePay",
        documentCreateUri: config.payment.documentCreateUri,
        inn: config.payment.paymentInn,
        apiKey: config.payment.apiKey,
      },
    }).save();
    await Region({
      name: "Республика Татарстан",
      contacts: {
        consumerAdministration: {
          email: "testKZN@gmail.comqwer",
          phone: "299 99 99",
        },
        communityAdministration: {
          email: "testKZN@gmail.com",
          phone: "299 99 99",
        },
        support: { email: "test@gmail.com", phone: "299 99 99" },
      },
      pay: {
        lspu: "4689519",
        pointCode: "11111",
        abonentId: "46898519",
        idpu: "40001",
        service: "4011",
        typePaymentCode: "40001",
        merchant: "90000011",
        equiring: "https://pgtest.abr.ru:4443",
        gateUrl: "http://10.196.35.129:8080/ecsop_gate/gatePay",
        documentCreateUri: config.payment.documentCreateUri,
        inn: config.payment.paymentInn,
        apiKey: config.payment.apiKey,
      },
    }).save();
    await Region({
      name: "default",
      pay: {
        typePaymentCode: "40001",
        lspu: "4689519",
        pointCode: "11111",
        abonentId: "46898519",
        idpu: "40001",
        service: "4011",
        merchant: "90000011",
        equiring: "https://pgtest.abr.ru:4443",
        gateUrl: "http://10.196.35.129:8080/ecsop_gate/gatePay",
        documentCreateUri: config.payment.documentCreateUri,
        inn: config.payment.paymentInn,
        apiKey: config.payment.apiKey,
      },
      contacts: {
        consumerAdministration: {
          email: "consumerAdministrationEmail@gmail.com",
          phone: "299 99 99",
        },
        communityAdministration: {
          email: "communityAdministrationEmail@gmail.com",
          phone: "299 99 99",
        },
        support: { email: "1supportEmail@gmail.com", phone: "299 99 99" },
      },
    }).save();
    console.log("success regions");
    res();
  } catch (error) {
    rej();
  }
});
