const express = require('express');
const controller = require('../../controllers/retail.controller');
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const validation = require("../../validations/retail.validation");

const router = express.Router();

router.route('/')
      .get(controller.getRetails)
      .post(auth('manageRetails'), validate(validation.createRetail), controller.createRetail)

router.route('/:retailId')
      .get(auth('manageRetails'), controller.getRetail)
      .patch(auth('manageRetails'), validate(validation.updateRetail), controller.updateRetail)
      .delete(auth('manageRetails'), validate(validation.deleteRetail), controller.deleteRetail);

module.exports = router;
