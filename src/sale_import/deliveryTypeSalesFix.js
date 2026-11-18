process.env['NODE_ENV'] = 'production';
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const moment = require("moment-timezone");
const _ = require("lodash");
const { Order, Category, Sales } = require("../models");
const path = require("path");
const old_data = require('./old_report_json.json')

dotenv.config({ path : path.join(__dirname, '../../.env') });

const { runAllSalesReportOnce } = require('../report/report')

// this script is to fix delivery type counts of daily, weekly, monthly and yearly report.
// script created at : 20241124
// by: enson

mongoose.connect(process.env.MONGODB_URL, {
  useCreateIndex     : true,
  useNewUrlParser    : true,
  useUnifiedTopology : true,
  useFindAndModify   : false
}).then(async () => {
  console.info('Connected to MongoDB');
  const start = moment('2022-12-05').tz('Asia/Hong_Kong')
  const end = moment().tz('Asia/Hong_Kong')

  const length = end.diff(start, 'days')
  // console.log(start.format('YYYY-MM-DD'))
  // console.log(end.format('YYYY-MM-DD'))

  for (let i = 0; i <= length; i++) {
    const date = end.clone().add(-i,'days').format('YYYY-MM-DD')
    await runAllSalesReportOnce(date)
  }
  // await runAllSalesReportOnce('2023-07-04')
  // await runAllSalesReportOnce('2023-07-05')
  // await runAllSalesReportOnce('2023-07-06')
  // await runAllSalesReportOnce('2023-07-07')
  // await runAllSalesReportOnce('2023-07-08')
  // await runAllSalesReportOnce('2023-07-09')
  // await runAllSalesReportOnce('2023-07-10')
  // await runAllSalesReportOnce('2023-07-11')
  // await runAllSalesReportOnce('2023-07-12')
  console.info(`done jobs`)
  await mongoose.disconnect()
  process.exit(0)
})
