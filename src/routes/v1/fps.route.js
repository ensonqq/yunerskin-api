const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const cartValidation = require('../../validations/cart.validation');
const controller = require('../../controllers/fps.controller');

const router = express.Router();

router.route('/getQrcode')
      .post(auth('manageUsers'), controller.getQrcode)

module.exports = router;
