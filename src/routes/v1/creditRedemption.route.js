const express = require('express');
const controller = require('../../controllers/creditRedemption.controller');
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const validation = require("../../validations/creditRedemption.validation");

const router = express.Router();

router.route('/')
      .get(controller.getCreditRedemptions)
      .post(auth('manageCreditRedemptions'), validate(validation.createCreditRedemption), controller.createCreditRedemption)

router.route('/logs/:creditRedemptionId')
      .get(auth('manageCreditRedemptions'), validate(validation.getCreditRedemptionLogs), controller.getCreditRedemptionLogs)

router.route('/checkAvailability/:creditRedemptionUniqueId')
      .get(auth(), controller.getCreditRedemptionAvailability)

router.route('/redeem/:creditRedemptionUniqueId')
      .post(auth(), controller.redeem)

router.route('/:creditRedemptionId')
      .get(auth('manageCreditRedemptions'), controller.getCreditRedemption)
      .patch(auth('manageCreditRedemptions'), validate(validation.updateCreditRedemption), controller.updateCreditRedemption)

module.exports = router;
