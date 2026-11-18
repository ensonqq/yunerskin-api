const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const voucherValidation = require('../../validations/voucher.validation');
const voucherController = require('../../controllers/voucher.controller');

const router = express.Router();

router.route('/')
      .post(auth('manageVouchers'), validate(voucherValidation.createVoucher), voucherController.createVoucher)
      .get(auth('manageVouchers'), validate(voucherValidation.getVouchers), voucherController.getVouchers);

router.route('/validate/:voucherCode')
      .get(voucherController.validateVoucher)

router.route('/checkKolOccupation/:kolUserId')
      .get(auth('manageVouchers'), voucherController.checkKolOccupation)

router.route('/:voucherId')
      .get(voucherController.getVoucher)
      .patch(auth('manageVouchers'), validate(voucherValidation.updateVoucher), voucherController.updateVoucher)
      .delete(auth('manageVouchers'), validate(voucherValidation.deleteVoucher), voucherController.deleteVoucher);

router.route('/kolContracts/me')
      .get(auth('myContract'), voucherController.myContract)
      .post(auth('myContract'), voucherController.agreeMyContract)

router.route('/kolContracts/:kolId')
      .get(auth('manageVouchers'), voucherController.getKolContracts)
      .post(auth('manageVouchers'), voucherController.createKolContracts)
      .delete(auth('manageVouchers'), voucherController.deleteKolContracts);

router.route('/:voucherId/orders')
      .get(voucherController.getVoucherOrders)

module.exports = router;
