// date with time zone (for orderNumber in HKT), 20220101
// params: dateString: 2022-01-01
const dateStringInHongKong = function (dateString) {
  const now = dateString ? new Date(dateString) : new Date()
  const tzNow = new Date(now.toLocaleString('en-US', {
    timeZone : 'Asia/Hong_Kong' // 香港時間
  }));
  const offset = now.getTime() - tzNow.getTime();

  now.setTime(now.getTime() + offset);

  //20220101
  return "" + now.getFullYear() + (now.getMonth() + 1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0')
}


module.exports = {
  dateStringInHongKong
}
