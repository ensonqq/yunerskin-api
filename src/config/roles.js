// define all role authorities

const allRoles = {
  user  : [],
  kol   : [
    'mySales',
    'myContract',
    'myKolProfile',
  ],
  admin : [
    //retails,
    'manageRetails',

    //promotions
    'managePromotions',

    //Top ups
    'manageTopups',

    // holidays
    'manageHolidays',

    //users
    'manageUsers',
    'getUsers',

    //order
    'manageOrders',
    'getUserOrders',
    'getUserTopups',
    'getOrders',
    'getOrder',

    //images
    'getImages',
    'manageImages',

    //products
    'manageProducts',

    //categories
    'manageCategories',

    //keyAccount
    'manageKeyAccounts',

    // vouchers
    'manageVouchers',

    // alerts
    'manageAlerts',

    // user credits,
    'manageUserRegCredits',

    // prize,
    'managePrizes',

    // gift
    'manageGifts'
  ],
  super : [
    //retails
    'manageRetails',

    //dashboard
    'getDashboard',

    //sales
    'getSales',
    'getKolSales',
    'deleteKolSales',
    'updateKolSales',

    //promotions
    'managePromotions',

    //holidays
    'manageHolidays',

    //Top ups
    'manageTopups',

    //credit redemption
    'manageCreditRedemptions',

    //users
    'manageUsers',
    'getUsers',
    'exportUsers',

    //order
    'manageOrders',
    'getUserOrders',
    'getUserTopups',
    'getOrders',
    'getOrder',

    //images
    'getImages',
    'manageImages',

    //products
    'manageProducts',

    //categories
    'manageCategories',

    // vouchers
    'manageVouchers',

    // alerts
    'manageAlerts',

    // user credits,
    'manageUserRegCredits',

    // prize,
    'managePrizes',

    // gift
    'manageGifts'
  ],
}

const roles = Object.keys(allRoles)
const roleRights = new Map(Object.entries(allRoles))

module.exports = {
  roles,
  roleRights,
};
