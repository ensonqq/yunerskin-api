const express = require('express');
const controller = require('../../controllers/promotion.controller');
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const validation = require("../../validations/promotion.validation");

const router = express.Router();

router.route('/')
      .get(controller.getPromotions)
      .post(auth('managePromotions'), validate(validation.createPromotion), controller.createPromotion)

router.route('/getPublishedPromotions')
      .get(controller.getPublishedPromotions)

router.route('/:promotionId')
      .get(auth('manageCategories'), controller.getPromotion)
      .patch(auth('manageCategories'), validate(validation.updatePromotion), controller.updatePromotion)
      .delete(auth('manageCategories'), validate(validation.deletePromotion), controller.deletePromotion);

module.exports = router;
