const express = require('express');
const controller = require('../../controllers/sales.controller');
const auth = require('../../middlewares/auth');
const validate = require("../../middlewares/validate");
const validation = require("../../validations/sales.validation");
const router = express.Router();

router.route('/')
      .get(auth('getSales'), validate(validation.getSales), controller.getSales);

router.route('/topup')
      .get(auth('getSales'), validate(validation.getSales), controller.getTopupSales);

router.route('/kolSales')
      .get(auth('getKolSales'), validate(validation.getKolSales), controller.getKolSales)

router.route('/kolSales/regenerate')
      .get(auth('getKolSales'), controller.regenerateKolSales)

router.route('/kolSales/myRecords/all')
      .get(auth('mySales'), controller.myKolSales)

router.route('/kolSales/:kolSalesId')
      .get(auth('getKolSales'), controller.getKolSalesDetail)
      .patch(auth('updateKolSales'), validate(validation.updateKolSales), controller.updateKolSales)
      .delete(auth('deleteKolSales'), validate(validation.deleteKolSales), controller.deleteKolSales)


module.exports = router;
