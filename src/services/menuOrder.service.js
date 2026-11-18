const httpStatus = require('http-status');
const MenuOrder = require('../models/menuOrder.model');
const CategoryGroup = require('../models/categoryGroup.model');
const Category = require('../models/category.model');
const ApiError = require('../utils/ApiError');

/**
 * Get the full ordered menu structure.
 * Returns a flat array where each item is either:
 *   { type: 'group',    _id, name, categories: [...] }
 *   { type: 'category', ...categoryFields }
 *
 * @returns {Promise<Array>}
 */
const getMenuOrder = async () => {
  const menuOrder = await MenuOrder.getSingleton();

  const result = [];

  for (const item of menuOrder.items) {
    if (item.type === 'group') {
      const group = await CategoryGroup.findById(item.refId).populate({
        path    : 'categories',
        match   : { publish : true },
        populate : { path : 'images' },
        options  : { sort : { sortOrder : 1 } },
      });

      if (group && group.publish && (group.categories || []).length > 0) {
        result.push({
          type       : 'group',
          _id        : group._id,
          name       : group.name,
          categories : group.categories || [],
        });
      }
    } else if (item.type === 'category') {
      const category = await Category.findById(item.refId).populate('images');
      if (category && category.publish) {
        const obj = category.toJSON();
        obj.type = 'category';
        result.push(obj);
      }
    }
  }

  return result;
};

/**
 * Get the full ordered menu structure including unpublished items (for admin).
 * @returns {Promise<Array>}
 */
const getMenuOrderAdmin = async () => {
  const menuOrder = await MenuOrder.getSingleton();

  const result = [];

  for (const item of menuOrder.items) {
    if (item.type === 'group') {
      const group = await CategoryGroup.findById(item.refId).populate({
        path     : 'categories',
        populate : { path : 'images' },
        options  : { sort : { sortOrder : 1 } },
      });

      if (group) {
        result.push({
          type       : 'group',
          _id        : group._id,
          name       : group.name,
          publish    : group.publish,
          categories : group.categories || [],
        });
      }
    } else if (item.type === 'category') {
      const category = await Category.findById(item.refId).populate('images');
      if (category) {
        const obj = category.toJSON();
        obj.type = 'category';
        result.push(obj);
      }
    }
  }

  return result;
};

/**
 * Replace the full MenuOrder items array.
 * @param {Array<{ type: string, refId: string }>} items
 * @returns {Promise<MenuOrder>}
 */
const updateMenuOrder = async (items) => {
  // Validate that all refIds actually exist
  for (const item of items) {
    if (item.type === 'group') {
      const exists = await CategoryGroup.exists({ _id : item.refId });
      if (!exists) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Group ${item.refId} not found`);
      }
    } else if (item.type === 'category') {
      const exists = await Category.exists({ _id : item.refId });
      if (!exists) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Category ${item.refId} not found`);
      }
    }
  }

  const menuOrder = await MenuOrder.getSingleton();
  menuOrder.items = items;
  await menuOrder.save();
  return menuOrder;
};

module.exports = {
  getMenuOrder,
  getMenuOrderAdmin,
  updateMenuOrder,
};

