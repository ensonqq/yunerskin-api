const express = require('express');
const controller = require('../../controllers/prize.controller');
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const validation = require("../../validations/prize.validation");

const router = express.Router();

router.route('/')
      .get(auth('managePrizes'), controller.getPrizes)
      .post(auth('managePrizes'), validate(validation.createPrize), controller.createPrize)

router.route('/prizeRecords')
      .get(auth('managePrizes'), controller.getPrizeRecords)
      .delete(auth('managePrizes'), controller.deleteAllPrizeRecord)

router.route('/prizeRecords/:prizeRecordId')
      .delete(auth('managePrizes'), controller.deletePrizeRecord)

router.route('/myPrize')
      .get(auth(), controller.getMyPrize)
      .post(auth(), validate(validation.updateMyPrize), controller.updateMyPrize)


router.route('/getPublishedPrizes')
      .get(controller.getPublishedPrizes)

router.route('/:prizeId')
      .get(auth('managePrizes'), controller.getPrize)
      .patch(auth('managePrizes'), validate(validation.updatePrize), controller.updatePrize)
      .delete(auth('managePrizes'), validate(validation.deletePrize), controller.deletePrize);

module.exports = router;
