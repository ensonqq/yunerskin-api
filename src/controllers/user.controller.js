const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService, emailService, kolService, topupService } = require('../services');
const _ = require('underscore')
const moment = require('moment-timezone')
const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});
const { Parser } = require('json2csv')
const exportUsers = catchAsync(async (req, res) => {
  // construct users filtering
  const filter = { role : 'user' }
  const options = { limit : 99999, page : 1 }
  const users = await userService.queryUsers(filter, options);

  const fields = ['name', 'email', { label : 'phone', value : 'addresses[0].phone' }, { label : 'phone2', value : 'addresses[1].phone' },
    { label : 'phone3', value : 'addresses[2].phone' }]
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(users.results, { withBOM : true, excelStrings : true });
  res.setHeader('Content-disposition', 'attachment; filename=allusers.csv')
  res.set('Content-Type', 'text/csv; charset=utf-8')
  return res.send(csv)
})

const exportUsersEdm = catchAsync(async (req, res) => {
  // construct users filtering
  const filter = { role : 'user' }
  const options = { limit : 99999, page : 1 }
  const users = await userService.queryUsers(filter, options);

  const fields = [{ label : 'EMAIL', value : 'email' }, { label : 'LASTNAME', value : 'name' }, { label : 'FIRSTNAME', value : '' },
    { label : 'SMS', value : 'addresses[0].phone' }]
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(users.results, { withBOM : true, excelStrings : true });
  res.setHeader('Content-disposition', 'attachment; filename=allusers.csv')
  res.set('Content-Type', 'text/csv; charset=utf-8')
  return res.send(csv)
})

const getUsers = catchAsync(async (req, res) => {
  const basicFilter = pick(req.query, ['status', 'isStudent']);
  const advanceFilter = pick(req.query, ['search', 'role', 'totalOrders', 'totalSpent', 'vipTier']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  //populate student image
  options.populate = [{
    path     : 'student',
    populate : 'image'
  }]

  // construct users filtering
  const filter = { $and : [] };
  _.forEach(basicFilter, function (value, key) {
    filter.$and.push({ [key] : value });
  });

  if (advanceFilter.search) {
    filter.$and.push({
      $or : ['email', 'name', 'remarks', 'addresses.phone', 'pickupAddresses.phone'].map(item => ({ [item] : new RegExp(advanceFilter.search, 'i') }))
    })
  }

  if (advanceFilter.role) {
    if (advanceFilter.role === 'admin') {
      filter.$and.push({ $or : [{ role : 'admin' }, { role : 'super' }] });
    } else {
      filter.$and.push({ role : advanceFilter.role });
    }
  }

  if (advanceFilter.vipTier) {
    filter.$and.push({ vipTier : advanceFilter.vipTier });
  }


  if (advanceFilter.totalOrders) {
    filter.$and.push({ totalOrders : { $gte : advanceFilter.totalOrders } })
  }
  if (advanceFilter.totalSpent) {
    filter.$and.push({ totalSpent : { $gte : advanceFilter.totalSpent } })
  }

  const result = await userService.queryUsers(filter, options);
  return res.send(result);
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const updateUser = catchAsync(async (req, res) => {
  const oldUser = await userService.getUserById(req.params.userId);
  const newUser = await userService.updateUserById(req.params.userId, req.body);
  const addedCredits = newUser.credits - oldUser.credits

  if (addedCredits > 0) {
    await topupService.createTopupOrder({
      createdBy     : req.user.id,
      issuedTo      : newUser.id,
      email         : newUser.email,
      topupValue    : addedCredits,
      price         : 0,
      payment       : {
        paymentType   : 'admin',
        paymentStatus : 'completed'
      },
      statsComputed : true,
      orderStatus   : 'confirmed',
      remarks       : `admin added ${ addedCredits } credits`
    })
  }

  res.send(newUser);
});

const updateStudent = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  // ['pending', 'rejected', 'approved']
  if (req.body.student.status === 'approved') {

    const html = `
    <html>
      <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      </head>
      <body>
        <p>親愛的: ${ user.name }</p>
        <p>你的學生帳號已通過審核，可以享用75折優惠碼: STUDENT</p>
        <p>學生帳號有效期至： ${ moment(user.student.endAt).tz('Asia/Hong_Kong').format('YYYY-MM-DD') }</p>
        <p>此電郵為系統自動發送，不要回覆此電郵</p>
        <br><br><br>
        <p>Dear: ${ user.name }</p>
        <p>You student account has been approved, you are now available to use 25% OFF discount code: STUDENT</p>
        <p>Student account valid till： ${ moment(user.student.endAt).tz('Asia/Hong_Kong').format('YYYY-MM-DD') }</p>
        <p>This email is auto sent by the system, please do not reply.</p>
      </body>
    </html>`
    const result = await emailService.sendEmailHtml(user.email, 'Yunerksin 你的學生帳號申請已通過', html).catch(error => {
      console.log(error)
    })
  } else if (req.body.student.status === 'rejected') {
    const html = `
    <html>
      <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      </head>
      <body>
        <p>親愛的: ${ user.name }</p>
        <p>你的學生帳號申請被拒絕，如果你想再提交審核，請<a href="https://student.yunerksin.com.hk/dashboard/Account/" target="_blank">按此</a>從申提交申請。</p>
        <p>此電郵為系統自動發送，不要回覆此電郵</p>
        <br><br><br>
        <p>Dear: ${ user.name }</p>
        <p>You student account application has been rejected, if you still want to attempt the application again, please <a href="https://student.yunerksin.com.hk/dashboard/Account/" target="_blank">Click Here</a> to resubmit.</p>
        <p>Student account valid till： ${ moment(user.student.endAt).tz('Asia/Hong_Kong').format('YYYY-MM-DD') }</p>
        <p>This email is auto sent by the system, please do not reply.</p>
      </body>
    </html>`
    const result = await emailService.sendEmailHtml(user.email, 'Yunerksin 你的學生帳號申請被拒絕', html).catch(error => {
      console.log(error)
    })
  }

  res.send(user);
});

const sendReceipt = async (order) => {
  try {
    const result = await emailService.sendReceipt(order)
    return result
  } catch (e) {
    console.log(e)
  }
}

const updateMyProfile = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.user.id, req.body);
  res.send(user);
});


const updateMyKolProfile = catchAsync(async (req, res) => {
  const profile = await kolService.updateKolProfileByUserId(req.user.id, { ...req.body, kol : req.user.id, createdBy : req.user.id });
  res.send(profile);
});


const setKolProfile = catchAsync(async (req, res) => {
  const profile = await kolService.updateKolProfileByUserId(req.params.userId, { ...req.body, createdBy : req.user.id });
  res.send(profile);
})

const getKolProfile = catchAsync(async (req, res) => {
  const profile = await kolService.getKolProfileByUserId(req.params.userId);
  res.send(profile);
})

const resubmitStudentIdentity = catchAsync(async (req, res) => {
  const body = pick(req.body, ['student']);
  body.student.status = 'pending'
  const user = await userService.updateUserById(req.user.id, body);
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

const me = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.user._id);
  res.send(user);
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  me,
  updateMyProfile,
  exportUsers,
  resubmitStudentIdentity,
  updateStudent,
  exportUsersEdm,
  setKolProfile, // kol credential profile
  getKolProfile, // kol credential profile,
  updateMyKolProfile
};
