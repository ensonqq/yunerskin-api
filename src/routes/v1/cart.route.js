const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const cartValidation = require('../../validations/cart.validation');
const controller = require('../../controllers/cart.controller');

const router = express.Router();

router.route('/')
      .get(auth(), controller.myCart)
      .post(auth(), validate(cartValidation.updateCart), controller.updateCart);

router.route('/nonmember')
      .post(validate(cartValidation.updateCart), controller.updateCartCookies);

module.exports = router;
