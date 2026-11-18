const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService, emailService } = require('../services');
const _ = require("underscore");
const ApiError = require("../utils/ApiError");
const bizSdk = require("facebook-nodejs-business-sdk");
const Setting = require("../models/setting.model");
const config = require("../config/config");

const register = catchAsync(async (req, res) => {
  const data = _.pick(req.body, ['email', 'password', 'gender', 'name', 'isStudent', 'student'])

  // get register credit from setting model
  data.credits = 0

  const user = await userService.createUser(data);
  const tokens = await tokenService.generateAuthTokens(user);
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
  await emailService.sendVerificationEmail(user.email, verifyEmailToken);
  res.status(httpStatus.CREATED).send({ user, tokens });
});

const firePixelEvent = async (user, req) => {
  if (config.env !== 'production') return
  const EventRequest = bizSdk.EventRequest;
  const UserData = bizSdk.UserData;
  const ServerEvent = bizSdk.ServerEvent;
  const access_token = 'ADD_YOUR_TOKEN_HERE';
  const pixel_id = '1713392268893342';
  const api = bizSdk.FacebookAdsApi.init(access_token);

  const ip = req.headers['cf-connecting-ip'] || req.connection.remoteAddress
  const useragent = req.headers['user-agent']


  let current_timestamp = Math.floor(new Date() / 1000);


  const userData = (new UserData()).setEmails([user.email])
                                   .setClientIpAddress(ip)
                                   .setClientUserAgent(useragent)

  const fbp = req.headers['fbp']
  const fbc = req.headers['fbc']
  if (fbp !== 'undefined') {
    userData.setFbp(fbp)
  }
  if (fbc !== 'undefined') {
    userData.setFbc(fbc)
  }

  const serverEvent = (new ServerEvent()).setEventName('CompleteRegistration')
                                         .setEventTime(current_timestamp)
                                         .setUserData(userData)
                                         .setEventSourceUrl(`${ req.headers['referer'] }`)
                                         .setActionSource('website');

  const eventsData = [serverEvent];
  const eventRequest = (new EventRequest(access_token, pixel_id)).setEvents(eventsData);
  // console.log(eventsData)
  return eventRequest.execute()
}


const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const changePassword = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.user.id)
  const isPasswordMatch = await user.isPasswordMatch(req.body.old)


  if (!isPasswordMatch) {
    throw new ApiError(httpStatus.BAD_REQUEST, '密碼錯誤')
  }

  if (req.body.new !== req.body.new2) {
    throw new ApiError(httpStatus.BAD_REQUEST, '新密碼輸入不相同')
  }

  Object.assign(user, { password : req.body.new });
  await user.save();
  return res.status(httpStatus.NO_CONTENT).send();
});


const sendVerificationEmail = catchAsync(async (req, res) => {
  const user = await userService.getUserByEmail(req.user.email)
  if(!user){
    throw new ApiError(httpStatus.BAD_REQUEST, '用戶不存在。')
  }
  if(user && user.isEmailVerified){
    throw new ApiError(httpStatus.BAD_REQUEST, '你的電郵已經驗證了。')
  }
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.send({});
});

const verifyEmail = catchAsync(async (req, res) => {
  const creditsGained = await authService.verifyEmail(req.query.token);
  return res.send({ creditsGained });
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  changePassword
};
