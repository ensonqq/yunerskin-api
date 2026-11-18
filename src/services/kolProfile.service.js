const httpStatus = require('http-status');
const { KolProfile } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a kolProfile
 * @param {Object} kolProfileBody
 * @returns {Promise<KolProfile>}
 */
const createKolProfile = async (kolProfileBody) => {
  return KolProfile.create(kolProfileBody);
};

/**
 * Query for profiles
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryKolProfiles = async (filter, options) => {
  const profiles = await KolProfile.paginate(filter, options);
  return profiles;
};

/**
 * Get kolProfile by id
 * @param {ObjectId} id
 * @returns {Promise<KolProfile>}
 */
const getKolProfileById = async (id) => {
  return KolProfile.findById(id).populate([{ path : 'student', populate : 'image' }]);
};


/**
 * Get kolProfile by user id
 * @param {ObjectId} userId
 * @returns {Promise<KolProfile>}
 */
const getKolProfileByUserId = async (userId) => {
  return KolProfile.findOne({ kol : userId }).populate('fpsQRCodeImages');
};

/**
 * Update kolProfile by id
 * @param {ObjectId} kolProfileId
 * @param {Object} updateBody
 * @returns {Promise<KolProfile>}
 */
const updateKolProfileById = async (kolProfileId, updateBody) => {
  const kolProfile = await getKolProfileById(kolProfileId);
  Object.assign(kolProfile, updateBody);
  await kolProfile.save();
  return kolProfile;
};

/**
 * Update kolProfile by user id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<KolProfile>}
 */
const updateKolProfileByUserId = async (userId, updateBody) => {
  let kolProfile = await getKolProfileByUserId(userId);
  if (kolProfile) {
    // update
    Object.assign(kolProfile, updateBody);
    await kolProfile.save();
  } else {
    // create
    kolProfile = await createKolProfile(updateBody)
  }
  return kolProfile;
};

/**
 * Delete kolProfile by id
 * @param {ObjectId} kolProfileId
 * @returns {Promise<KolProfile>}
 */
const deleteKolProfileById = async (kolProfileId) => {
  const kolProfile = await getKolProfileById(kolProfileId);
  if (!kolProfile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'kolProfile not found');
  }
  await kolProfile.remove();
  return kolProfile;
};

module.exports = {
  createKolProfile,
  queryKolProfiles,
  getKolProfileById,
  updateKolProfileById,
  deleteKolProfileById,
  updateKolProfileByUserId,
  getKolProfileByUserId
};
