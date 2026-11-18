const httpStatus = require('http-status')
const { Sales, KolSales, TopupSales } = require('../models')
const ApiError = require('../utils/ApiError')

/**
 * Query for sales
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const querySales = async (filter, options) => {
  return await Sales.paginate(filter, options);
};

/**
 * Query for top up sales
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryTopupSales = async (filter, options) => {
  return await TopupSales.paginate(filter, options);
};

/**
 * Query for kol sales
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const getKolSalesByMonth = async (filter, options) => {
  return KolSales.paginate(filter, options);
};


/**
 * Delete kolSales by id
 * @param {ObjectId} kolSalesId
 * @returns {Promise<KolSales>}
 */
const deleteKolSalesById = async (kolSalesId) => {
  const kolSales = await getKolSalesById(kolSalesId, []);
  if (!kolSales) {
    throw new ApiError(httpStatus.NOT_FOUND, 'KolSales not found');
  }
  await kolSales.remove();
  return kolSales;
};

/**
 * Get kol sales detail by id
 * @param {ObjectId} id
 * @param {Array} populate
 * @returns {Promise<KolSales>}
 */
const getKolSalesById = async (id, populate) => {
  return KolSales.findById(id).populate(populate);
};

/**
 * Update kol sales by id
 * @param {ObjectId} kolSalesId
 * @param {Object} updateBody
 * @returns {Promise<KolSales>}
 */
const updateKolSalesById = async (kolSalesId, updateBody) => {
  const kolSales = await getKolSalesById(kolSalesId, []);
  if (!kolSales) {
    throw new ApiError(httpStatus.NOT_FOUND, '沒有相關業積');
  }
  Object.assign(kolSales, updateBody);
  await kolSales.save();
  return kolSales;
};


module.exports = {
  querySales,
  getKolSalesByMonth,
  getKolSalesById,
  updateKolSalesById,
  deleteKolSalesById,
  queryTopupSales
};
