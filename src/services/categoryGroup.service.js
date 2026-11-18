const httpStatus = require('http-status');
const CategoryGroup = require('../models/categoryGroup.model');
const Category = require('../models/category.model');
const MenuOrder = require('../models/menuOrder.model');
const ApiError = require('../utils/ApiError');

/**
 * Create a category group
 * @param {Object} groupBody  - { name: { zh, en } }
 * @returns {Promise<CategoryGroup>}
 */
const createCategoryGroup = async (groupBody) => {
  const group = await CategoryGroup.create(groupBody);

  // Auto-append new group to the end of MenuOrder
  const menuOrder = await MenuOrder.getSingleton();
  menuOrder.items.push({ type : 'group', refId : group._id });
  await menuOrder.save();

  return group;
};

/**
 * Get all groups (flat list, no categories populated)
 * @returns {Promise<CategoryGroup[]>}
 */
const getAllGroups = async () => {
  return CategoryGroup.find().sort({ createdAt : 1 });
};

/**
 * Get a single group by id
 * @param {ObjectId} groupId
 * @returns {Promise<CategoryGroup>}
 */
const getGroupById = async (groupId) => {
  return CategoryGroup.findById(groupId);
};

/**
 * Update a group by id
 * @param {ObjectId} groupId
 * @param {Object} updateBody
 * @returns {Promise<CategoryGroup>}
 */
const updateGroupById = async (groupId, updateBody) => {
  const group = await getGroupById(groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category group not found');
  }
  Object.assign(group, updateBody);
  await group.save();
  return group;
};

/**
 * Delete a group by id.
 * Categories that belonged to this group become ungrouped (group = null).
 * The group entry is removed from MenuOrder; ungrouped categories are appended.
 * @param {ObjectId} groupId
 * @returns {Promise<CategoryGroup>}
 */
const deleteGroupById = async (groupId) => {
  const group = await getGroupById(groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category group not found');
  }

  // Ungroup all categories that belonged to this group
  const unlinkedCategories = await Category.find({ group : groupId }).select('_id');
  await Category.updateMany({ group : groupId }, { $set : { group : null } });

  // Remove the group from MenuOrder, append its ex-categories as ungrouped entries
  const menuOrder = await MenuOrder.getSingleton();
  const groupIndex = menuOrder.items.findIndex(
    (item) => item.type === 'group' && item.refId.toString() === groupId.toString()
  );

  const newItems = [...menuOrder.items];
  if (groupIndex !== -1) {
    // Replace the group entry with its ex-categories in the same position
    const insertions = unlinkedCategories.map((c) => ({ type : 'category', refId : c._id }));
    newItems.splice(groupIndex, 1, ...insertions);
  }
  menuOrder.items = newItems;
  await menuOrder.save();

  await group.remove();
  return group;
};

module.exports = {
  createCategoryGroup,
  getAllGroups,
  getGroupById,
  updateGroupById,
  deleteGroupById,
};

