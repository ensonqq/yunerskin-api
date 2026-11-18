const Joi = require('joi');
const { password, phone, objectId } = require('./custom.validation');

const register = {
  body : Joi.object().keys({
    email      : Joi.string()
                    .regex(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
                    .messages({ 'string.pattern.base' : '電郵格式不正確' })
                    .email()
                    .required(),
    password   : Joi.string().required().custom(password),
    name       : Joi.string().required(),
    gender     : Joi.string().required().valid('m', 'f'),
    agreeTerms : Joi.boolean().required().valid(true),
    isStudent  : Joi.boolean().required(),
    student    : Joi.object().keys({
      image : Joi.custom(objectId)
    }),
  }),
};

const login = {
  body : Joi.object().keys({
    email    : Joi.string().required(),
    password : Joi.string().required(),
  }),
};

const logout = {
  body : Joi.object().keys({
    refreshToken : Joi.string().required(),
  }),
};

const refreshTokens = {
  body : Joi.object().keys({
    refreshToken : Joi.string().required(),
  }),
};

const forgotPassword = {
  body : Joi.object().keys({
    email : Joi.string().email().required(),
  }),
};

const resetPassword = {
  query : Joi.object().keys({
    token : Joi.string().required(),
  }),
  body  : Joi.object().keys({
    password : Joi.string().required().custom(password),
  }),
};

const changePassword = {
  body : Joi.object().keys({
    old  : Joi.string().required().custom(password),
    new  : Joi.string().required().custom(password),
    new2 : Joi.string().required().custom(password),
  }),
};

const verifyEmail = {
  query : Joi.object().keys({
    token : Joi.string().required(),
  }),
};

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  verifyEmail,
  changePassword,
};
