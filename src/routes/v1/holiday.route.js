const express = require('express');
const controller = require('../../controllers/holiday.controller');

const router = express.Router();

router.route('/')
      .get(controller.getHolidays)

module.exports = router;
