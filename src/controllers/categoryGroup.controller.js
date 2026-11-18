const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { categoryGroupService, menuOrderService } = require('../services');

/**
 * POST /categories/groups
 */
const createGroup = catchAsync(async (req, res) => {
  const group = await categoryGroupService.createCategoryGroup(req.body);
  res.status(httpStatus.CREATED).send(group);
});

/**
 * GET /categories/groups
 */
const getGroups = catchAsync(async (req, res) => {
  const groups = await categoryGroupService.getAllGroups();
  res.send(groups);
});

/**
 * PATCH /categories/groups/:groupId
 */
const updateGroup = catchAsync(async (req, res) => {
  const group = await categoryGroupService.updateGroupById(req.params.groupId, req.body);
  res.send(group);
});

/**
 * DELETE /categories/groups/:groupId
 */
const deleteGroup = catchAsync(async (req, res) => {
  await categoryGroupService.deleteGroupById(req.params.groupId);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * GET /categories/menu  (public — published only)
 */
const getMenu = catchAsync(async (req, res) => {
  const menu = await menuOrderService.getMenuOrder();
  res.send(menu);
});

/**
 * GET /categories/menu/admin  (admin — all items)
 */
const getMenuAdmin = catchAsync(async (req, res) => {
  const menu = await menuOrderService.getMenuOrderAdmin();
  res.send(menu);
});

/**
 * PUT /categories/menu-order
 * Body: { items: [{ type: 'group'|'category', refId: string }] }
 */
const updateMenuOrder = catchAsync(async (req, res) => {
  const menuOrder = await menuOrderService.updateMenuOrder(req.body.items);
  res.send(menuOrder);
});

module.exports = {
  createGroup,
  getGroups,
  updateGroup,
  deleteGroup,
  getMenu,
  getMenuAdmin,
  updateMenuOrder,
};

