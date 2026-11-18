const express = require('express');
const controller = require('../../controllers/gift.controller');
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const validation = require("../../validations/gift.validation");

const router = express.Router();

router.route('/')
      .get(auth('manageGifts'), controller.getGifts)
      .post(auth('manageGifts'), validate(validation.createGift), controller.createGift)


router.route('/getPublishedGifts')
      .get(controller.getPublishedGifts)

router.route('/:giftId')
      .get(auth('manageGifts'), controller.getGift)
      .patch(auth('manageGifts'), validate(validation.updateGift), controller.updateGift)
      .delete(auth('manageGifts'), validate(validation.deleteGift), controller.deleteGift);

module.exports = router;
