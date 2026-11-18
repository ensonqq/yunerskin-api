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

mongoose.connect(process.env.MONGODB_URL, {
  useCreateIndex     : true,
  useNewUrlParser    : true,
  useUnifiedTopology : true,
  useFindAndModify   : false
}).then(async () => {
  console.info('Connected to MongoDB');
  await runAllSalesReportOnce('2023-07-04')
  await runAllSalesReportOnce('2023-07-05')
  await runAllSalesReportOnce('2023-07-06')
  await runAllSalesReportOnce('2023-07-07')
  await runAllSalesReportOnce('2023-07-08')
  await runAllSalesReportOnce('2023-07-09')
  await runAllSalesReportOnce('2023-07-10')
  await runAllSalesReportOnce('2023-07-11')
  await runAllSalesReportOnce('2023-07-12')
  console.info(`done jobs`)
  await mongoose.disconnect()
  process.exit(0)
})
