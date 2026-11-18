const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const orderValidation = require('../../validations/order.validation');
const controller = require('../../controllers/order.controller');
const router = express.Router();
const { createOrderLimiter } = require('../../middlewares/rateLimiter')

router.route('/')
      .post(auth(), createOrderLimiter, validate(orderValidation.createOrder), controller.createOrder)
      .get(auth('getOrders'), validate(orderValidation.getOrders), controller.getOrders)

router.route('/updateOrderToPrinted')
      .post(auth('manageOrders'), validate(orderValidation.updateOrderToPrinted), controller.updateOrderToPrinted)

router.route('/me')
      .get(auth(), controller.getMyOrders)

router.route('/monthlyRank')
      .get(auth('manageOrders'), controller.getMonthlyRank)

router.route('/adminOrder')
      .post(auth('manageOrders'), controller.createAdminOrder)

router.route('/nonMember')
      .post(createOrderLimiter, validate(orderValidation.createOrder), controller.createOrder)

router.route('/status/:orderNumber')
      .get(controller.getOrderStatus)

router.route('/sf/printWayBill/:orderNumber')
      .post(auth('manageOrders'), controller.printSFWayBill)

router.route('/sf/wayBillProxy')
      .post(auth('manageOrders'), controller.waybillProxy)

router.route('/sf/createWayBillBulk')
      .post(auth('manageOrders'), controller.createSFWayBillBulk)

router.route('/sf/routes/:orderNumber')
      .get(controller.getSFRoute)

// router.route('/sf/all')
//       .post(auth('manageOrders'), controller.placeSFOrderAll)

router.route('/webhook')
      .post(controller.webhook)

router.route('/resendReceipt/:orderNumber')
      .get(auth('manageOrders'), controller.resendReceipt)

router.route('/userOrder/:userId')
      .get(auth('getUserOrders'), validate(orderValidation.getOrder), controller.getUserOrders)

router.route('/:orderNumber')
      .get(auth('getOrder'), validate(orderValidation.getOrder), controller.getOrder)
      .patch(auth('manageOrders'), validate(orderValidation.updateOrder), controller.updateOrder)

module.exports = router;
