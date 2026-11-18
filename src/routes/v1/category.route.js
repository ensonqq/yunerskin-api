const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const categoryValidation = require('../../validations/category.validation');
const categoryController = require('../../controllers/category.controller');
const categoryGroupController = require('../../controllers/categoryGroup.controller');

const router = express.Router();

// ── Menu Order ──────────────────────────────────────────────────────────────
// Public: get published menu
router.get('/menu', categoryGroupController.getMenu);
// Admin: get full menu (including unpublished)
router.get('/menu/admin', auth('manageCategories'), categoryGroupController.getMenuAdmin);
// Admin: replace the full menu order
router.put('/menu-order', auth('manageCategories'), validate(categoryValidation.updateMenuOrder), categoryGroupController.updateMenuOrder);

// ── Category Groups ─────────────────────────────────────────────────────────
router.route('/groups')
      .post(auth('manageCategories'), validate(categoryValidation.createGroup), categoryGroupController.createGroup)
      .get(categoryGroupController.getGroups);

router.route('/groups/:groupId')
      .patch(auth('manageCategories'), validate(categoryValidation.updateGroup), categoryGroupController.updateGroup)
      .delete(auth('manageCategories'), validate(categoryValidation.deleteGroup), categoryGroupController.deleteGroup);

// ── Categories ──────────────────────────────────────────────────────────────
router.route('/')
      .post(auth('manageCategories'), validate(categoryValidation.createCategory), categoryController.createCategory)
      .get(validate(categoryValidation.getCategories), categoryController.getCategories);

router.route('/:categoryId')
      .get(validate(categoryValidation.getCategoryProducts), categoryController.getCategory)
      .patch(auth('manageCategories'), validate(categoryValidation.updateCategory), categoryController.updateCategory)
      .delete(auth('manageCategories'), validate(categoryValidation.deleteCategory), categoryController.deleteCategory);

module.exports = router;
