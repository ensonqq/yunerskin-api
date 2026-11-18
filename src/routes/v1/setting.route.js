const express = require('express');
const auth = require('../../middlewares/auth');
const controller = require('../../controllers/settings.controller');
const router = express.Router();

router.get('/locations', controller.getLocations)
      .get('/pickupPoints', controller.getPickupPoints)
      .get('/pickupPointsArray', controller.getPickupPointsArray)
      .get('/holidays', controller.getHolidays)
      .get('/systemTime', controller.getSystemTime)
      .post('/holidays', auth('manageHolidays'), controller.setHolidays)
      .get('/skuSorting', controller.getSkuSorting)
      .post('/skuSorting', auth('manageHolidays'), controller.setSkuSorting)
      .get('/alert', controller.getAlert)
      .post('/alert', auth('manageAlerts'), controller.setAlert)
      .get('/studentAlert', controller.getStudentAlert)
      .post('/studentAlert', auth('manageAlerts'), controller.setStudentAlert)
      .get('/registerCredits', controller.getRegisterCredits)
      .post('/registerCredits', auth('manageUserRegCredits'), controller.setRegisterCredits)

module.exports = router;
