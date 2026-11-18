const rateLimit = require('express-rate-limit');
const ApiError = require("../utils/ApiError");
const httpStatus = require("http-status");

const authLimiter = rateLimit({
  windowMs               : 15 * 60 * 1000,
  max                    : 20,
  handler                : function (req, res /*, next*/) {
    throw new ApiError(httpStatus.BAD_REQUEST, '你已被限制，請15分鐘後再嘗試。')
  },
  skipSuccessfulRequests : false,
});

const createOrderLimiter = rateLimit({
  windowMs               : 15 * 60 * 1000,
  max                    : 20,
  handler                : function (req, res /*, next*/) {
    throw new ApiError(httpStatus.BAD_REQUEST, '你已被限制，請15分鐘後再嘗試。')
  },
  skipSuccessfulRequests : false,
});

const createTopupOrderLimiter = rateLimit({
  windowMs               : 15 * 60 * 1000,
  max                    : 20,
  handler                : function (req, res /*, next*/) {
    throw new ApiError(httpStatus.BAD_REQUEST, '你已被限制，請15分鐘後再嘗試。')
  },
  skipSuccessfulRequests : false,
});

const registrationLimiter = rateLimit({
  windowMs               : 60 * 60 * 1000,
  max                    : 5,
  handler                : function (req, res /*, next*/) {
    throw new ApiError(httpStatus.BAD_REQUEST, '行為異常，你已被限制，請60分鐘後再嘗試。')
  },
  skipSuccessfulRequests : false,
});


const studentImageUploadLimited = rateLimit({
  windowMs               : 60 * 60 * 1000,
  max                    : 10,
  handler                : function (req, res /*, next*/) {
    throw new ApiError(httpStatus.BAD_REQUEST, '你已被限制，請60分鐘後再嘗試。')
  },
  skipSuccessfulRequests : false,
});

module.exports = {
  authLimiter,
  createOrderLimiter,
  registrationLimiter,
  studentImageUploadLimited,
  createTopupOrderLimiter
};
