const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const uploadRoute = require('./upload.route');
const productRoute = require('./product.route');
const categoryRoute = require('./category.route');
const keyAccountRoute = require('./keyAccount.route');
const voucherRoute = require('./voucher.route');
const docsRoute = require('./docs.route');
const cartRoute = require('./cart.route');
const settingsRoute = require('./setting.route');
const ordersRoute = require('./order.route');
const promotionsRoute = require('./promotion.route');
const topupsRoute = require('./topup.route');
const creditRedemptionRoute = require('./creditRedemption.route');
const salesRoute = require('./sales.route');
const holidaysRoute = require('./holiday.route');
const testsRoute = require('./test.route');
const dashboardRoute = require('./dashboard.route');
const fpsRoute = require('./fps.route');
const retailsRoute = require('./retails.route');
const prizeRoute = require('./prize.route');
const giftRoute = require('./gift.route');
const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path  : '/auth',
    route : authRoute,
  },
  {
    path  : '/users',
    route : userRoute,
  },
  {
    path  : '/uploads',
    route : uploadRoute,
  },
  {
    path  : '/products',
    route : productRoute,
  },
  {
    path  : '/categories',
    route : categoryRoute,
  },
  {
    path  : '/keyAccounts',
    route : keyAccountRoute,
  },
  {
    path  : '/vouchers',
    route : voucherRoute,
  },
  {
    path  : '/cart',
    route : cartRoute,
  },
  {
    path  : '/orders',
    route : ordersRoute,
  },
  {
    path  : '/settings',
    route : settingsRoute,
  },
  {
    path  : '/promotions',
    route : promotionsRoute,
  },
  {
    path  : '/topups',
    route : topupsRoute,
  },
  {
    path  : '/creditRedemptions',
    route : creditRedemptionRoute,
  },
  {
    path  : '/holidays',
    route : holidaysRoute,
  },
  {
    path  : '/sales',
    route : salesRoute,
  },
  {
    path  : '/test',
    route : testsRoute,
  },
  {
    path  : '/dashboard',
    route : dashboardRoute,
  },
  {
    path  : '/fps',
    route : fpsRoute,
  },
  {
    path  : '/retails',
    route : retailsRoute,
  },
  {
    path  : '/prizes',
    route : prizeRoute,
  },
  {
    path  : '/gifts',
    route : giftRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path  : '/docs',
    route : docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
