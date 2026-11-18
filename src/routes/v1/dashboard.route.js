const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const categoryValidation = require('../../validations/category.validation');
const controller = require('../../controllers/dashboard.controller');

const router = express.Router();

router.route('/')
      .get(auth('getDashboard'), controller.getDashboard)
router.route('/reorderRate')
      .get(auth('getDashboard'), controller.getReorderRate);

module.exports = router;
