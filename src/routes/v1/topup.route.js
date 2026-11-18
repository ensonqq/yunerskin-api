const express = require('express');
const controller = require('../../controllers/topup.controller');
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const validation = require("../../validations/topup.validation");
const { createTopupOrderLimiter } = require("../../middlewares/rateLimiter");
const topupOrderValidation = require("../../validations/topupOrder.validation");
const orderValidation = require("../../validations/order.validation");

const router = express.Router();

router.route('/')
      .get(controller.getTopups)
      .post(auth('manageTopups'), validate(validation.createTopup), controller.createTopup)

router.route('/orders')
      .get(auth('manageTopups'), validate(topupOrderValidation.getTopupOrders), controller.getTopupOrders)

router.route('/orders/:orderNumber')
      .get(auth('manageTopups'), validate(topupOrderValidation.getTopupOrder), controller.getTopupOrder)
      .patch(auth('manageTopups'), validate(topupOrderValidation.updateTopupOrder), controller.updateTopupOrder)

router.route('/me')
      .get(auth(), controller.getMyTopupOrders)

router.route('/placeOrder')
      .post(auth(), createTopupOrderLimiter, validate(validation.createTopupOrder), controller.createTopupOrder)

router.route('/resendTopupReceipt/:orderNumber')
      .get(auth('manageTopups'), controller.resendTopupOrderReceipt)

router.route('/status/:orderNumber')
      .get(controller.getTopupOrderStatus)

router.route('/userOrder/:userId')
      .get(auth('getUserTopups'), validate(orderValidation.getOrder), controller.getUserTopups)


router.route('/getPublishedTopups')
      .get(controller.getPublishedTopups)

router.route('/:topupId')
      .get(auth('manageTopups'), controller.getTopup)
      .patch(auth('manageTopups'), validate(validation.updateTopup), controller.updateTopup)

module.exports = router;
