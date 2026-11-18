const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const keyAccountValidation = require('../../validations/keyAccount.validation');
const keyAccountController = require('../../controllers/keyAccount.controller');

const router = express.Router();

router.route('/')
      .post(auth('manageKeyAccounts'), validate(keyAccountValidation.createKeyAccount), keyAccountController.createKeyAccount)
      .get(auth('manageKeyAccounts'), validate(keyAccountValidation.getKeyAccounts), keyAccountController.getKeyAccounts);

router.route('/:keyAccountId')
      .get(auth('manageKeyAccounts'), keyAccountController.getKeyAccount)
      .patch(auth('manageKeyAccounts'), validate(keyAccountValidation.updateKeyAccount), keyAccountController.updateKeyAccount)
      .delete(auth('manageKeyAccounts'), validate(keyAccountValidation.deleteKeyAccount), keyAccountController.deleteKeyAccount);

module.exports = router;
