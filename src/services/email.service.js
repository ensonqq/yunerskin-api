const nodemailer = require("nodemailer");
const config = require("../config/config");
const logger = require("../config/logger");

const transport = nodemailer.createTransport(config.email.smtp);
/* istanbul ignore next */
if (config.env !== "test") {
  transport.verify()
           .then(() => logger.info("Connected to email server"))
           .catch(() => logger.warn("Unable to connect to email server. Make sure you have configured the SMTP options in .env"));
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text) => {
  const msg = { from : config.email.from, to, subject, text };
  await transport.sendMail(msg);
};

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 * @returns {Promise}
 */
const sendEmailHtml = async (to, subject, html) => {
  const msg = { from : config.email.from, to, subject, html };
  return await transport.sendMail(msg);
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
  const subject = "Yunerksin - 重置密碼 Reset password";
  // replace this url with the link to the reset password page of your front-end app
  const resetPasswordUrl = `${ config.frontendHost }/resetPassword?token=${ token }`;
  const text = `親愛的會員,

請按此連結進行密碼重設: ${ resetPasswordUrl }
如果你沒有提交重設動作，請忽略請電郵。



Dear member,

To reset your password, please click on this link: ${ resetPasswordUrl }
If you did not request any password resets, please ignore this email.`;
  await sendEmail(to, subject, text);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, token) => {
  const subject = "Yunerksin - 電郵認證 Email Verification";
  // replace this url with the link to the reset password page of your front-end app
  const resetPasswordUrl = `${ config.frontendHost }/emailVerification?token=${ token }`;
  const text = `親愛的會員,

請按此連結進行電郵認證: ${ resetPasswordUrl }
如果你沒有提交重設動作，請忽略請電郵。

Dear member,

To verify your email, please click on this link: ${ resetPasswordUrl }
If you did not request any email verification, please ignore this email.`;
  await sendEmail(to, subject, text);
};

/**
 * Send order receipt email
 * @param {string} to
 * @param {object} order
 * @returns {Promise}
 */
const sendReceipt = async (order) => {
  const subject = `Yunerksin 收據: ${ order.orderNumber }`;
  // replace this url with the link to the email verification page of your front-end app
  const to = order.email;
  const html = receiptHtml(order);
  return await sendEmailHtml(to, subject, html);
};

const receiptHtml = function(order) {
  const areas = { hk : "港島", kln : "九龍", nt : "新界" };
  const products = order.items.map(item => {
    const product = item.product;
    return `
    <div class="product" style="clear: both;padding: 10px 0;">
      <img src="${ product.images && product.images.length ? product.images[0].small.path : "" }" style="width: 65px; float: left" alt="">
      <div class="info" style="float: left;margin-left: 15px">
        <h4 style="color: #6f8d90; font-weight: 400; text-transform: uppercase; margin-top: 10px">${ product.name.zh }</h4>
        <p style="font-size: 14px; color: #aaa;">每件: $${ item.unitPrice }</p>
        <p style="font-size: 14px; color: #aaa;">數量: ${ item.quantity }</p>
      </div>
      <p style="margin-top: 25px; float: right; color: #6f8d90; font-size: 15px; margin-right: 17px;">$${ item.unitPrice * item.quantity }</p>
    </div>
  `;
  });
  // const weekEndDelivery = order.isWeekEndDelivery ? '<p class="del"> 周末送貨 <span>$10 </span> </p>' : ''
  const weekEndDelivery = "";
  let prize = "";
  let gift = "";
  if (order.prize && order.prize.amount) {
    prize = `(獲贈${ order.prize.type === "cash" ? "$" + order.prize.amount + "蚊利是" : order.prize.product.name.zh + " x" + order.prize.amount + "件" })`;
  }

  if (order.gift && order.gift.amount) {
    gift = `(獲贈${ order.gift.type === "other" ? order.gift.giftRef.name.zh + " x" + order.gift.amount + "件" : order.gift.product.name.zh + " x" + order.gift.amount + "件" })`;
  }

  return `<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    </head>
    <body style="background-color: #111072; width: 100%; height: 100%;">
      <div class="receipt-container" style="width: 100%;height: 100%;">
        <div class="receipt" style="width: 450px; background-color: white; border-radius: 5px; position: relative; box-shadow: 14px 14px 22px -18px; padding: 20px; margin: 50px auto;
">
          <h2 class="name" style="text-transform: uppercase; text-align: center; color: #6c8b8e; letter-spacing: 10px; font-size: 1.8em; margin-top: 10px "> <img width="100" src="https://yunerksin.com.hk/favicon.ico" alt=""> </h2>
          <p class="greeting" style="font-size: 21px; text-transform: capitalize; text-align: center; color: #333; margin: 35px 0; letter-spacing: 1.2px">感謝你的訂單！</p>
          <!-- Order info -->
          <div class="order">
            <p style="font-size: 16px; color: #aaa; padding-left: 10px; letter-spacing: .7px"> 訂單號碼 : ${ order.orderNumber } </p>
            <p style="font-size: 16px; color: #aaa; padding-left: 10px; letter-spacing: .7px"> 送貨時間 : ${ order.deliveryDay }, ${ order.deliveryTimeSlot } </p>
            <p style="font-size: 16px; color: #aaa; padding-left: 10px; letter-spacing: .7px"> 送貨地址 :
                ${ areas[order.area] },${ order.district },${ order.subDistrict } ${ order.fullAddress } ${ order.phone } (${ order.recipient }收)
            </p>
          </div>
          <hr style="border: .7px solid #ddd;margin: 15px 0;">
          <!-- Details -->
          <div class="details" style="padding-left: 10px; margin-bottom: 35px; overflow: hidden">
            <h3 style="font-weight: 400; color: #6c8b8e; font-size: 1.5em; margin-bottom: 15px"> 詳情 </h3>
              ${ products.join("") }
          </div>

          <div class="totalprice" style="padding-left: 10px">
            <p class="del" style="font-size: 16px;color: #aaa">${ prize }</p>
          </div>

          <div class="totalprice" style="padding-left: 10px">
            <p class="del" style="font-size: 16px;color: #aaa">${ gift }</p>
          </div>

          <!-- Sub and total price -->
          <div class="totalprice" style="padding-left: 10px">
            ${ weekEndDelivery }
            <p class="del" style="font-size: 16px;color: #aaa">折扣優惠 <span style="float: right;margin-right: 17px">-$${ order.total - order.paidTotal }</span></p>
            <hr style="border: .7px solid #ddd;margin: 15px 0;">

            <p class="tot" style="color: #6f8d90;font-size: 15px">付款<span style="float: right;margin-right: 17px">HKD$${ order.paidTotal }</span></p>

          </div>
          <p style="margin-top: 30px; color: #aaa;">
            如是會員可登入<a href="https://yunerksin.com.hk/dashboard/OrderList" target="_blank" rel="noopener">我的帳戶-訂單紀錄</a> 查看訂單情況。
          </p>
          <p style="color: #aaa;">
            若有任何查詢，請與 <a href="https://wa.me/+85229446860" target="_blank" rel="noopener">我們聯絡(Whatsapp)</a>，或瀏覽 <a href="https://yunerksin.com.hk/service/QNA">常見問題</a> 以得到快速協助。
          </p>
          <!-- Footer -->
          <footer style="font-size: 10px; text-align: center; margin-top: 50px; /* You can make it with position try it */ color: #aaa">此為系統自動發送，請不要回覆此電郵。</footer>
        </div>
      </div>
    </body>
  </html>`;
};


/**
 * Send top up receipt email
 * @param {string} to
 * @param {object} order
 * @returns {Promise}
 */
const sendTopupOrderReceipt = async (order) => {
  const subject = `Yunerksin 增值收據: ${ order.orderNumber }`;
  // replace this url with the link to the email verification page of your front-end app
  const to = order.email;
  const html = topupOrderReceiptHtml(order);
  return await sendEmailHtml(to, subject, html);
};

const topupOrderReceiptHtml = function(order) {
  return `<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    </head>
    <body style="background-color: #111072; width: 100%; height: 100%;">
      <div class="receipt-container" style="width: 100%;height: 100%;">
        <div class="receipt" style="width: 450px; background-color: white; border-radius: 30px; position: relative; box-shadow: 14px 14px 22px -18px; padding: 20px; margin: 50px auto;
">
          <h2 class="name" style="text-transform: uppercase; text-align: center; color: #6c8b8e; letter-spacing: 10px; font-size: 1.8em; margin-top: 10px "> <img width="100" src="https://yunerksin.com.hk/favicon.ico" alt=""> </h2>
          <p class="greeting" style="font-size: 21px; text-transform: capitalize; text-align: center; color: #333; margin: 35px 0; letter-spacing: 1.2px">感謝你的訂單！</p>
          <!-- Order info -->
          <div class="order">
            <p style="font-size: 16px; color: #aaa; padding-left: 10px; letter-spacing: .7px"> 增值號碼 : ${ order.orderNumber } </p>
            <p style="font-size: 16px; color: #aaa; padding-left: 10px; letter-spacing: .7px"> *積分已即時增值 </p>
          </div>
          <hr style="border: .7px solid #ddd;margin: 15px 0;">
          <!-- Details -->
          <div class="details" style="padding-left: 10px; margin-bottom: 35px; overflow: hidden">
            <h3 style="font-weight: 400; color: #6c8b8e; font-size: 1.5em; margin-bottom: 15px"> 詳情 </h3>
            <div class="product" style="clear: both;padding: 10px 0;">
              <img src="${ order.topupCard.images && order.topupCard.images.length ? order.topupCard.images[0].small.path : "" }" style="width: 65px; float: left" alt=""／>
              <div class="info" style="float: left;margin-left: 15px">
                  <h4 style="color: #6f8d90; font-weight: 400; text-transform: uppercase; margin-top: 10px">${ order.topupCard.title.zh }</h4>
                  <p style="font-size: 14px; color: #aaa;">價錢: HKD$${ order.price }</p>
                  <p style="font-size: 14px; color: #aaa;">積分: ${ order.topupValue }分</p>
                  <p style="font-size: 14px; color: #aaa;">期限: 永久有效</p>
                  <p style="font-size: 14px; color: #aaa;">${ order.topupCard.desc.zh }</p>
              </div>
              <p style="margin-top: 25px; float: right; color: #6f8d90; font-size: 15px; margin-right: 17px;">$${ order.price }</p>
            </div>
          </div>

          <!-- Sub and total price -->
          <div class="totalprice" style="padding-left: 10px">
            <p class="tot" style="color: #6f8d90;font-size: 15px">付款<span style="float: right;margin-right: 17px">HKD$${ order.price }</span></p>
          </div>


          <p style="color: #aaa;">
            你可以前往 <a href="https://yunerksin.com.hk/dashboard/TopupList">我的帳戶-積分紀錄</a> 查看訂單紀錄。
          </p>
          <p style="color: #aaa;">
            若有任何查詢，請與 <a href="https://wa.me/+85229446860">我們聯絡(Whatsapp)</a>，或瀏覽 <a href="https://yunerksin.com.hk/service/QNA">常見問題</a> 以得到快速協助。
          </p>
          <!-- Footer -->
          <footer style="font-size: 10px; text-align: center; margin-top: 50px; /* You can make it with position try it */ color: #aaa">此為系統自動發送，請不要回覆此電郵。</footer>
        </div>
      </div>
    </body>
  </html>`;
};


module.exports = {
  transport,
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendReceipt,
  sendEmailHtml,
  sendTopupOrderReceipt
};
