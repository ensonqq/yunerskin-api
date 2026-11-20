const httpStatus = require("http-status");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { runAllSalesReportOnce, kolMonthlySales } = require("../report/report");
const { autoDiscountTiersAdopted, voucherAdopted, autoBuyXGetYFreeAdopted } = require("../utils/discount");
const {
  orderService, productService, categoryService, voucherService, emailService, userService, giftService, topupService
} = require("../services");
const _ = require("underscore");
const { User, Order, Category, PrizeRecord, TopupOrder } = require("../models");
const config = require("../config/config");
const bizSdk = require("facebook-nodejs-business-sdk");
const stripe = require("stripe")(config.payment.stripeKey); // sandbox key
const moment = require("moment-timezone");
const axios = require("axios");
const { deepParseJson } = require("deep-parse-json");
const { generateCheckoutURL, transactionEnquiry } = require("../utils/qfpay");
const xml2json = require("xml2json");
const { statistics, firePixelEvent } = require("../utils/orderStatistic");
const SFApi = require("../utils/SFApi");
const request = require("request");
const randomstring = require("randomstring");
const mongoose = require("mongoose");
//
const partnerID = "YYFSPXG44OM8";
// const apiUrl = config.env === 'production' ? 'https://sfapi-hk.sf-express.com/std/service' : 'https://sfapi-sbox.sf-express.com/std/service'
const apiUrl = "https://sfapi-hk.sf-express.com/std/service";
// const checkWord = config.env === 'production' ? 'urcQUeNvZKgLBCnctIixF2yW2zsXTR7r' : 'gwqbmiOEfg4SOy0VkAr9SAf8L6j1Ny4p'
const checkWord = "a8QGOVvde9cDrJUNG6juY43p1bJUOc5S";
const SF_API = new SFApi(partnerID, apiUrl, checkWord);

const resolveProductUnitPrice = (product, vipTier) => {
  if (["gold", "diamond"].includes(vipTier) && product.vipPrice > 0) {
    return product.vipPrice;
  }
  return product.discountPrice || product.price;
};

const validateMaxPurchaseQtyPerOrder = (items) => {
  for (const item of items) {
    const maxQty = Number((item.product && item.product.maxPurchaseQtyPerOrder) || 0);
    if (maxQty >= 1 && item.quantity > maxQty) {
      const productName = item.product && item.product.name ? item.product.name.zh || item.product.name.en || item.product.id : "";
      throw new ApiError(httpStatus.BAD_REQUEST, `${ productName } 單一訂單最多可購買 ${ maxQty } 件`.trim());
    }
  }
};

const createOrder = catchAsync(async (req, res) => {
  const orderObj = _.pick(req.body, ["email", "recipient", "phone", "area", "district", "subDistrict", "deliveryDay", "deliveryTimeSlot",
    "fullAddress", "items", "voucherUsed", "payment", "creditsUsed", "deliveryType", "pickupLocationCode", "gift"]);
  const locale = req.body.locale || "zh";

  // frontend may submit explicit null/"" for unused delivery fields; drop them so Mongoose defaults apply
  ["recipient", "area", "district", "subDistrict", "deliveryDay", "deliveryTimeSlot", "fullAddress", "deliveryType", "pickupLocationCode"]
    .forEach(field => {
      if (orderObj[field] === null || orderObj[field] === "") delete orderObj[field];
    });

  orderObj["paidTotal"] = 0;
  if (!config.features.creditsEnabled) {
    // Credits are paused globally; keep the field for compatibility but force no effect.
    orderObj["creditsUsed"] = 0;
  }
  // 1. total: map items, get sum initial total, including weekend delivery
  const items = await productService.mapCartItems(orderObj.items);

  const vipTier = req.user ? req.user.vipTier : null;
  const mappedItems = items.items.map((item) => {
    const unitPrice = resolveProductUnitPrice(item.product, vipTier);
    return { ...item, unitPrice };
  });

  // delivery required when any item is a physical product; treatment-only orders skip delivery
  const requiresDelivery = mappedItems.some(item => item.product && item.product.productType !== "treatment");

  let isWeekEndDelivery = false;
  if (requiresDelivery) {
    const missingDeliveryFields = ["recipient", "area", "district", "subDistrict", "deliveryDay", "deliveryTimeSlot", "fullAddress"]
      .filter(field => !orderObj[field]);
    if (missingDeliveryFields.length > 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "請填寫送貨資料");
    }
    const deliveryDay = moment(orderObj.deliveryDay).tz("Asia/Hong_Kong");
    isWeekEndDelivery = deliveryDay.day() == 0 || deliveryDay.day() == 6;
  } else {
    delete orderObj.recipient;
    delete orderObj.area;
    delete orderObj.district;
    delete orderObj.subDistrict;
    delete orderObj.deliveryDay;
    delete orderObj.deliveryTimeSlot;
    delete orderObj.fullAddress;
    delete orderObj.deliveryType;
    delete orderObj.pickupLocationCode;
  }

  validateMaxPurchaseQtyPerOrder(mappedItems);

  const itemsSubtotal = _.reduce(mappedItems, function(num, item) {
    const basePrice = item.unitPrice;
    const addonsPrice = item.addons ? item.addons.price : 0;
    return item.quantity * (basePrice + addonsPrice) + num;
  }, 0);

  // Always trust backend-calculated prices over client payload.
  orderObj["items"] = mappedItems.map((item) => ({
    product   : item.product.id,
    quantity  : item.quantity,
    unitPrice : item.unitPrice,
    addons    : item.addons
  }));

  // minimum order check
  if (itemsSubtotal < 198) {
    throw new ApiError(httpStatus.BAD_REQUEST, "最低消費為$198");
  }

  // delivery fee: free if $400 or above, $68 otherwise; no delivery fee for treatment-only orders
  const deliveryFee = requiresDelivery ? (itemsSubtotal >= 400 ? 0 : 68) : 0;
  const weekendSurcharge = isWeekEndDelivery ? 0 : 0;
  const total = itemsSubtotal;

  orderObj["isWeekEndDelivery"] = isWeekEndDelivery;
  orderObj["deliveryFee"] = deliveryFee;
  orderObj["total"] = total;
  orderObj["paidTotal"] += total + weekendSurcharge + deliveryFee;

  // 2. auto category discount, e.g.即食雞胸滿5件每件減$2
  const discountTiersAdopted = await autoDiscountTiersAdopted({ items : mappedItems });
  if (discountTiersAdopted) {
    orderObj["autoDiscountTiersAdopted"] = discountTiersAdopted.autoDiscountAdopted;
    orderObj["autoDiscountTotal"] = discountTiersAdopted.discountTotal;
    orderObj["paidTotal"] += discountTiersAdopted.discountTotal;
  }

  // 2.1. auto category discount, e.g.即食雞胸滿5件每件減$2
  const buyXGetYFreeAdopted = await autoBuyXGetYFreeAdopted({ items : mappedItems }, { vipTier });

  if (buyXGetYFreeAdopted) {
    orderObj["buyXGetYFreeAdopted"] = buyXGetYFreeAdopted.buyXGetYFreeAdopted;
    orderObj["buyXGetYFreeDiscountTotal"] = buyXGetYFreeAdopted.buyXGetYFreeDiscountTotal;
    orderObj["paidTotal"] += buyXGetYFreeAdopted.buyXGetYFreeDiscountTotal;
  }


  // 3. lucky draw prize
  if (req.user) {
    const prize = await PrizeRecord.findOne({ createdBy : req.user.id });
    if (prize) {
      orderObj["prize"] = {
        product : prize.item.product,
        type    : prize.item.type,
        amount  : prize.item.amount
      };
      if (prize.item.type === "cash") {
        orderObj["paidTotal"] += -prize.item.amount;
      }
    }
  }

  const totalItems = _.reduce(mappedItems, function(num, item) {
    return item.quantity + num;
  }, 0);
  // 4. voucher discount
  if (orderObj.voucherUsed) {
    const voucherDiscountAdopted = await voucherAdopted(orderObj.voucherUsed, orderObj["paidTotal"], req.user, totalItems, orderObj.total);
    if (voucherDiscountAdopted) {
      orderObj["voucherUsed"] = voucherDiscountAdopted.voucherUsed;
      orderObj["voucherDiscountTotal"] = voucherDiscountAdopted.voucherDiscountTotal;
      orderObj["paidTotal"] += voucherDiscountAdopted.voucherDiscountTotal;
    }
  }

  // 4. voucher discount
  if (orderObj.gift) {
    const gift = await giftService.getGiftById(orderObj.gift);
    if (gift) {
      if (orderObj["paidTotal"] >= gift.rules.total && totalItems >= gift.rules.quantity) {
        orderObj.gift = {
          product : gift.item.product,
          type    : gift.item.type,
          amount  : gift.item.amount,
          rules   : gift.rules,
          giftRef : gift.id
        };
      } else {
        delete orderObj.gift;
      }
    } else {
      delete orderObj.gift;
    }
  }

  // 5. member only logic
  if (req.user) {
    // order by member
    orderObj["createdBy"] = req.user.id;

    // creditUsed check
    if (config.features.creditsEnabled && orderObj["creditsUsed"]) {
      const user = await userService.getUserById(req.user.id);
      if (user.credit < orderObj["creditsUsed"]) {
        throw new ApiError(httpStatus.BAD_REQUEST, "沒有足夠的積分");
      }

      // await User.findByIdAndUpdate(req.user.id, { "$inc" : { "credits" : -orderObj['creditsUsed'], } })

      orderObj["paidTotal"] += orderObj["creditsUsed"] * -1;
    }

    // credit gained to this order (will add to account after successful transaction)
    orderObj["creditsGained"] = config.features.creditsEnabled ? Math.floor((vipTier === "diamond" ? orderObj["paidTotal"] * 3 : orderObj["paidTotal"]) / 100) : 0;
  } else {
    // search user email, if user exists, bind order to user account
    let byUser = await userService.getUserByEmail(orderObj.email);
    if (byUser) orderObj["createdBy"] = byUser.id;
  }

  let order = await orderService.createOrder(orderObj);


  // 7. create payment
  if (["qfpay"].includes(orderObj.payment.paymentType)) {
    //  temp add for testing.
    const qfpay_url = await generateCheckoutURL(order, { action : "paymentConfirmation" });

    return res.status(httpStatus.CREATED).send({ order, qfpay_url });
  }
});

const createAdminOrder = catchAsync(async (req, res) => {
  let order = await orderService.createOrder({ ...req.body, createdBy : req.user.id });
  order = await orderService.getOrderByOrderNumber(order.orderNumber);
  return res.status(httpStatus.CREATED).send(order);
});

const getOrderStatus = catchAsync(async (req, res) => {
  if (!req.query.accessCode) throw new ApiError(httpStatus.FORBIDDEN, "禁止進入");

  let order = await orderService.getOrderByOrderNumberWithAccessCode(req.params.orderNumber, req.query.accessCode);

  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "找不到訂單");
  //skip cancelled orders check for payment again
  if (order.orderStatus === "cancelled") throw new ApiError(httpStatus.NOT_FOUND, "訂單已被取消");

  if (["qfpay"].includes(order.payment.paymentType)) {
    // test
    if(order.orderStatus === 'confirmed') return res.send(order);

    const status = await transactionEnquiry(order);
    if (status === "success") {
      order = await orderService.updateOrderById(order.id, { "payment.paymentStatus" : "completed", orderStatus : "confirmed" });
      await statistics(order, req);
    } else {
      order = await orderService.updateOrderById(order.id, { "payment.paymentStatus" : "failed", orderStatus : "payment_failed" });
    }
  }
  return res.send(order);
});

const getSFRoute = catchAsync(async (req, res) => {
  if (!req.query.accessCode) throw new ApiError(httpStatus.FORBIDDEN, "禁止進入");
  let order = await orderService.getOrderByOrderNumberWithAccessCode(req.params.orderNumber, req.query.accessCode);
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "找不到訂單");
  //skip cancelled orders check for payment again
  if (order.orderStatus === "cancelled") throw new ApiError(httpStatus.NOT_FOUND, "訂單已被取消");

  const route = await SFRoute(req.params.orderNumber);
  return res.send(route);
});

// find order by order number and return waybill pdf file for printing.
const printSFWayBill = catchAsync(async (req, res) => {
  await SFOrder(req.params.orderNumber);
  const order = await SFWaybill(req.params.orderNumber);
  const options = { headers : { "X-Auth-token" : order.wayBill.token } };
  const newUrl = order.wayBill.pdfUrl;
  request(newUrl, options).pipe(res);
});

// sf waybill pdf proxy
const waybillProxy = catchAsync(async (req, res) => {
  const { token, url } = req.body;
  const options = { headers : { "X-Auth-token" : token } };
  return request(url, options).pipe(res);
});

// create 1 sf waybill before print
const SFWaybill = async (orderNumber) => {
  let order = await orderService.getOrderByOrderNumber(orderNumber);

  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "找不到訂單");

  // treatment-only orders have no delivery address; no waybill needed
  const requiresDelivery = order.items.some(item => item.product && item.product.productType !== "treatment");
  if (!requiresDelivery) throw new ApiError(httpStatus.BAD_REQUEST, "療程訂單無需送貨，不能生成順豐運單");

  const cargoItemCnt = _.reduce(order.items, function(num, item) {
    return item.quantity + num;
  }, 0);
  const data = {
    templateCode : "fm_150_international_" + partnerID,
    documents    : [
      {
        masterWaybillNo     : order.delivery.billNo,
        isPrintLogo         : true,
        "payment"           : "寄付月結",
        "remark"            : `急凍 ${ order.deliveryDay } 送貨`,
        "reffNo"            : order.orderNumber.substring(11),
        "cargoDesc"         : `Yunerksin產品${ cargoItemCnt }件`,
        "declaredValue"     : `${ order.paidTotal }`,
        "declaredValueUnit" : "HKD"
      }
    ],
    fileType     : "pdf",
    version      : "2.0",
    sync         : true
  };


  const resultString = await SF_API.request("COM_RECE_CLOUD_PRINT_WAYBILLS", data);
  const result = deepParseJson(resultString);
  if (result && result.apiResultData) {
    if (result.apiResultData.success) {
      const file = result.apiResultData.obj.files[0];
      order = await orderService.updateOrderByOrderBillBo(file.waybillNo, {
        "delivery.wayBillDoc.url" : file.url, "delivery.wayBillDoc.token" : file.token
      });
    }
  }
  return order;
};

// create bulk sf waybill before print
const createSFWayBillBulk = catchAsync(async (req, res) => {
  let orders = [];
  const orderNumbers = req.body;
  for (let i in orderNumbers) {
    const orderNumber = orderNumbers[i];
    const order = await SFOrder(orderNumber);
    orders.push(order);
  }
  orders = await SFWaybillBulk(orders);
  // const options = { headers : { 'X-Auth-token' : order.wayBill.token } }
  // const newUrl = order.wayBill.pdfUrl
  // request(newUrl, options).pipe(res)
  return res.send(orders);
});

// bulk create sf waybills
const SFWaybillBulk = async (orders) => {
  const chunk = _.chunk(orders, 20); // chunked orders
  const updated = []; // orders with waybill docs inserted

  for (let i in chunk) {
    const ordersChunk = chunk[i];
    const data = {
      templateCode : "fm_150_international_" + partnerID,
      documents    : [],
      fileType     : "pdf",
      version      : "2.0",
      sync         : true
    };
    for (let j in ordersChunk) {
      const order = ordersChunk[j];

      const cargoItemCnt = _.reduce(order.items, function(num, item) {
        return item.quantity + num;
      }, 0);
      data.documents.push({
        masterWaybillNo     : order.delivery.billNo,
        isPrintLogo         : true,
        "payment"           : "寄付月結",
        "remark"            : `急凍 ${ order.deliveryDay } 送貨`,
        "reffNo"            : order.orderNumber.substring(11),
        "cargoDesc"         : `Yunerksin產品${ cargoItemCnt }件`,
        "declaredValue"     : `${ order.paidTotal }`,
        "declaredValueUnit" : "HKD"
      });
    }

    const resultString = await SF_API.request("COM_RECE_CLOUD_PRINT_WAYBILLS", data);
    const result = deepParseJson(resultString);
    if (result && result.apiResultData) {
      if (result.apiResultData.success) {
        for (let fileIndex in result.apiResultData.obj.files) {
          const file = result.apiResultData.obj.files[fileIndex];
          const newOrder = await orderService.updateOrderByOrderBillBo(file.waybillNo, {
            "delivery.wayBillDoc.url" : file.url, "delivery.wayBillDoc.token" : file.token
          });
          updated.push(newOrder);
        }
      } else {
        // console.log(result)
      }
    }
  }
  return updated;
};

// get sf routes
const SFRoute = async (orderNumber) => {
  let order = await orderService.getOrderByOrderNumber(orderNumber);

  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "找不到訂單");
  if (!order.delivery.billNo) throw new ApiError(httpStatus.NOT_FOUND, "訂單還未在順豐下單");

  const data = {
    language       : "zh-HK",
    trackingType   : 1,
    trackingNumber : order.delivery.billNo
  };


  const resultString = await SF_API.request("EXP_RECE_SEARCH_ROUTES", data);
  return deepParseJson(resultString);
};

// create 1 sf order
const SFOrder = async (orderNumber, override) => {
  let order = await orderService.getOrderByOrderNumber(orderNumber);
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "找不到訂單");

  // treatment-only orders have no delivery address; cannot create SF order
  const requiresDelivery = order.items.some(item => item.product && item.product.productType !== "treatment");
  if (!requiresDelivery) throw new ApiError(httpStatus.BAD_REQUEST, "療程訂單無需送貨，不能在順豐下單");

  const isOverride = !(_.isUndefined(override) || _.isNull(override));

  // billNo
  if (order.delivery.billNo && !isOverride) {
    return order;
  } else {
    const timestamp = Date.now();
    const orderId = isOverride ? randomstring.generate(8) + timestamp + "_" + order.orderNumber : order.orderNumber;
    const cargoItemCnt = _.reduce(order.items, function(num, item) {
      return item.quantity + num;
    }, 0);

    // full address
    let fullAddress = order.fullAddress;
    if (order.deliveryType === "pickup") {
      // add location cde for pick up order
      fullAddress = `${ fullAddress }^${ order.pickupLocationCode }^`;
    }
    const data = {
      language           : "zh-HK",
      orderId            : orderId,
      cargoDetails       : [
        {
          amount     : order.paidTotal,//單價
          count      : cargoItemCnt,//數量
          currency   : "HKD",
          name       : order.orderNumber,
          unit       : "個",//單位
          weight     : 1,
          sourceArea : "HKG"
        }
      ],
      cargoDesc          : order.orderNumber,
      contactInfoList    : [
        {
          // sender
          contactType : 1,
          address     : "將軍澳新都城3期,L2 236舖",
          contact     : "Yunerksin",
          tel         : "29446860",
          country     : "852",
          province    : "香港",
          city        : "香港",
          county      : "西貢區"
        },
        {
          // receiver
          contactType : 2,
          address     : fullAddress,
          contact     : order.recipient,
          tel         : order.phone,
          country     : "852",
          province    : "香港",
          city        : order.district,
          county      : order.subDistrict
        }
      ],
      payMethod          : 1,
      expressTypeId      : order.deliveryType === "pickup" ? 273 : 274,//香港冷运到家(≤60厘米)
      temperatureRange   : 101,//急凍類（-18 — -15℃）
      isReturnRoutelabel : 1,
      monthlyCard        : "8526927744"
    };

    const resultString = await SF_API.request("EXP_RECE_CREATE_ORDER", data);
    const result = deepParseJson(resultString);

    if (result && result.apiResultData) {
      if (result.apiResultData.success) {
        const waybillNo = result.apiResultData.msgData.waybillNoInfoList.filter(item => item.waybillType === 1)[0].waybillNo;
        order = await orderService.updateOrderByOrderNumber(order.orderNumber, { "delivery.billNo" : waybillNo, "delivery.clientOrderID" : orderId });
      } else {
        if (result.apiResultData.errorCode === "8016") {
          //  重複下單error
          console.log("duplicate sf order, awaiting re-create...");
          return SFOrder(orderNumber, true);
        } else {
          throw new ApiError(httpStatus.BAD_REQUEST, JSON.stringify(result));
        }
      }
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, result);
    }
    return order;
  }
};

//receipt email after payment status = succeed, triggered by stripe webhook, event: 'payment_intent.succeeded'
const webhook = catchAsync(async (req, res) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, req.headers["stripe-signature"], config.payment.stripeWebhookSecret);
  } catch (err) {
    console.log(err);
    return res.status(400).send(`Webhook Error: ${ err.message }`);
  }

  const paymentIntent = event.data.object;
  const order = await orderService.getOrderByOrderNumber(paymentIntent.metadata.orderNumber);

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      await statistics(order);
      // sendReceipt(order).catch(error => {
      //   console.log(error)
      // })
      // Then define and call a function to handle the event payment_intent.succeeded
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${ event.type }`);
      return;
  }

  // Return a 200 res to acknowledge receipt of the event
  return res.send();
});

const resendReceipt = catchAsync(async (req, res) => {
  const order = await orderService.getOrderByOrderNumber(req.params.orderNumber);
  const result = sendReceipt(order).catch(error => {
    console.log(error);
  });
  return res.send(result);
});

const sendReceipt = async (order) => {
  try {
    const result = await emailService.sendReceipt(order);
    return result;
  } catch (e) {
    console.log(e);
  }
};

const getOrders = catchAsync(async (req, res) => {
  const basicFilter = pick(req.query, ["deliveryDay", "orderStatus"]);
  const advanceFilter = pick(req.query, ["search", "createdAtFrom", "createdAtTo"]);
  const options = pick(req.query, ["sortBy", "limit", "page"]);

  // construct orders filtering
  let filter = { $and : [] };
  _.forEach(basicFilter, function(value, key) {
    filter.$and.push({ [key] : value });
  });

  if (advanceFilter.createdAtFrom && advanceFilter.createdAtTo) {
    filter.$and.push({ createdAt : { $gte : advanceFilter.createdAtFrom, $lt : advanceFilter.createdAtTo } });
    // filter.$and.push({ createdAt : { $lt : advanceFilter.createdAtTo } })
  }

  //ignore all filters
  if (advanceFilter.search) {
    filter = { $and : [] };
    filter.$and.push({
      $or : ["orderNumber", "email", "phone", "recipient", "area", "district", "subDistrict",
        "fullAddress", "delivery.billNo"].map(item => ({ [item] : new RegExp(advanceFilter.search, "i") }))
    });
  }

  options.populate = [
    { path : "voucherUsed" },
    {
      path     : "items",
      populate : {
        path     : "product",
        populate : [
          {
            path     : "bundleItems",
            populate : {
              path     : "product",
              populate : [{ path : "images" }, { path : "category" }]
            }
          },
          { path : "category" }
        ]
      }
    },
    { path : "createdBy" },
    { path : "prize", populate : { path : "product", populate : "images" } },
    {
      path     : "gift",
      populate : [{ path : "product", populate : { path : "images" } }, { path : "giftRef", populate : [{ path : "images" }, { path : "product" }] }]
    }
  ];

  const result = await orderService.queryOrders(filter, options);
  return res.send(result);
});

const getMyOrders = catchAsync(async (req, res) => {
  const options = pick(req.query, ["limit", "page"]);
  options.populate = [
    { path : "voucherUsed" },
    { path : "items", populate : "product" },
    { path : "prize", populate : { path : "product", populate : "images" } }
  ];
  const result = await orderService.queryOrders({ createdBy : req.user._id, orderStatus : "confirmed" }, { ...options, sortBy : "-orderNumber" });
  return res.send(result);
});

const getOrder = catchAsync(async (req, res) => {
  const order = await orderService.getOrderByOrderNumber(req.params.orderNumber);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "找不到訂單");
  }
  res.send(order);
});

const getUserOrders = catchAsync(async (req, res) => {
  const filter = pick(req.query, ["orderStatus"]);
  filter.createdBy = req.params.userId;
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  options.populate = [{ path : "voucherUsed" }, { path : "items", populate : "product" }];
  const result = await orderService.queryOrders(filter, options);
  res.send(result);
});

const mapCartItems = catchAsync(async (req, res) => {
  const items = await orderService.mapCartItems(req.body.items);
  res.send(items);
});

const updateOrder = catchAsync(async (req, res) => {
  const oldOrder = await orderService.getOrderByOrderNumber(req.params.orderNumber);
  let newOrder = await orderService.updateOrderByOrderNumber(req.params.orderNumber, req.body);

  // change of status: confirmed/cancelled, re-run all report once
  if (oldOrder.orderStatus !== newOrder.orderStatus) {
    const orderTimeStamp = newOrder.createdAt;
    await runAllSalesReportOnce(orderTimeStamp);
    await kolMonthlySales(orderTimeStamp);
    if (newOrder.voucherUsed) {
      await voucherService.updateUsage(newOrder.voucherUsed.id);
    }
  }

  // recalculation for user orders
  if (newOrder.createdBy) {
    const orders = await Order.find({ createdBy : newOrder.createdBy.id, orderStatus : "confirmed" }, {});

    //order
    const updateObj = {
      totalOrders : 0,
      totalSpent  : 0
    };
    orders.forEach(order => {
      updateObj.totalSpent += order.paidTotal;
      updateObj.totalOrders += 1;
    });

    //topup
    const topups = await TopupOrder.find({ createdBy : newOrder.createdBy.id, orderStatus : "confirmed" }, {});
    topups.forEach(topup => {
      updateObj.totalSpent += topup.price;
    });

    // credits calculation
    const oldCreatedBy = oldOrder.createdBy ? oldOrder.createdBy.id : null;
    const newCreatedBy = newOrder.createdBy ? newOrder.createdBy.id : null;

    if (config.features.creditsEnabled && oldCreatedBy !== newCreatedBy && newOrder.orderStatus === "confirmed") {
      const creditsChange = Math.floor(newOrder.paidTotal / 100);
      updateObj["$inc"] = { credits : creditsChange };
    } else if (config.features.creditsEnabled && oldOrder.orderStatus === "confirmed" && newOrder.orderStatus === "cancelled") {
      const creditsChange = newOrder.creditsUsed - newOrder.creditsGained;
      updateObj["$inc"] = { credits : creditsChange };
    }
    await User.findByIdAndUpdate(newOrder.createdBy.id, updateObj);
  }

  // create new order TO sf, if below fields are changed
  const old_deliveryInfo = _.pick(oldOrder, ["area", "deliveryDay", "district", "fullAddress", "subDistrict", "pickupLocationCode", "deliveryType",
    "recipient", "phone"]);
  const new_deliveryInfo = _.pick(newOrder, ["area", "deliveryDay", "district", "fullAddress", "subDistrict", "pickupLocationCode", "deliveryType",
    "recipient", "phone"]);
  if (_.isEqual(old_deliveryInfo, new_deliveryInfo) === false) {
    if (newOrder.delivery.billNo) {
      newOrder = await SFOrder(req.params.orderNumber, true);
    }
  }
  return res.send(newOrder);
});

const updateOrderToPrinted = catchAsync(async (req, res) => {
  const order = await orderService.updateOrderToPrinted(req.body);
  res.send(order);
});

const deleteOrder = catchAsync(async (req, res) => {
  await orderService.deleteOrderById(req.params.orderId);
  res.status(httpStatus.NO_CONTENT).send();
});

const getMonthlyRank = catchAsync(async (req, res) => {
  const month = req.query.month;
  if (!month) {
    throw new ApiError(httpStatus.BAD_REQUEST, "欠請求月份");
  }
  const start = moment(month).tz("Asia/Hong_Kong").startOf("month").toISOString();
  const end = moment(month).tz("Asia/Hong_Kong").endOf("month").toISOString();
  const result = await Order.find({
    createdBy : { $ne : null }, orderStatus : "confirmed", $and : [{ createdAt : { $gte : start } }, { createdAt : { $lt : end } }]
  }).populate([{ path : "createdBy" }, { path : "items", populate : { path : "product", populate : { path : "category" } } }]);

  const categories = await Category.find();

  const _catSummary = {};
  categories.forEach(cat => {
    _catSummary[cat._id] = {
      category : cat.id,
      name     : cat.name.zh,
      quantity : 0
    };
  });

  const mapper = {};
  result.forEach(order => {
    if (!mapper[order.phone]) {
      mapper[order.phone] = JSON.parse(JSON.stringify(order));
      mapper[order.phone].totalOrders = 1;
      mapper[order.phone].totalSpent = order.paidTotal;
      mapper[order.phone].accs = [];
      mapper[order.phone].accs.push(order.createdBy);
      mapper[order.phone].orders = [order.orderNumber];
      mapper[order.phone].totalSkus = 0;

      const catSummary = JSON.parse(JSON.stringify(_catSummary));
      order.items.forEach(item => {
        mapper[order.phone].totalSkus += item.quantity;
        catSummary[item.product.category.id].quantity += item.quantity;
      });

      mapper[order.phone].catSummary = Object.values(catSummary);
      // cat qty
    } else {
      mapper[order.phone].totalOrders += 1;
      mapper[order.phone].totalSpent += order.paidTotal;
      mapper[order.phone].orders.push(order.orderNumber);
      const indexOfAcc = _.findIndex(mapper[order.phone].accs, (acc) => {
        return order.createdBy.id === acc.id;
      }, 0);

      if (indexOfAcc < 0) {
        mapper[order.phone].accs.push(order.createdBy);
      }

      const catSummary = {};
      mapper[order.phone].catSummary.forEach(item => {
        catSummary[item.category] = item;
      });
      order.items.forEach(item => {
        mapper[order.phone].totalSkus += item.quantity;
        catSummary[item.product.category.id].quantity += item.quantity;
      });
      mapper[order.phone].catSummary = Object.values(catSummary);
    }
  });

  const data = _.sortBy(Object.values(mapper), ["totalSpent"]).reverse().slice(0, 50);

  return res.send(data);
});

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  mapCartItems,
  getOrderStatus,
  webhook,
  getUserOrders,
  createAdminOrder,
  getMyOrders,
  updateOrderToPrinted,
  resendReceipt,
  getMonthlyRank,
  printSFWayBill,
  getSFRoute,
  createSFWayBillBulk,
  waybillProxy
};


