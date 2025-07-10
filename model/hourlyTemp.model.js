var mongoose = require("mongoose");
var { addHistory } = require("./history.model");
var moment = require("moment");

var hourlyTempSchema = new mongoose.Schema({
  last_timestamp: {
    type: Date,
  },
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
  shift: {
    type: String,
  },
  date: {
    type: Date,
  },
  batch_name: {
    type: String,
  },
  vendor_name: {
    type: String,
  },
  fgex: {},
  data: {},
});

const hourlyTemp = mongoose.model("hourlyTemp", hourlyTempSchema);

addTempDataHourly = async (timestamp, line_id, data, cb) => {
  let lastData = await hourlyTemp.findOne({ line_id: line_id });
  console.log(lastData)
  if (!lastData) {
    var newData = new hourlyTemp({
      last_timestamp: timestamp,
      line_id: line_id,
      shift: data[0].shift,
      date: data[0].date,
      batch_name: data[0].batch,
      vendor_name: data[0].vendor,
      fgex: data[0].fgex,
      data: data,
    });
    var save = await newData.save();
    cb(save);
    return;
  }
    let machine_data = [];
    lastData.data.forEach((element) => {
      var obj = {};
      var current_data = data.find((mach) => mach._id == element._id);
      obj.machine_name = current_data._id;
      obj.operator_name = current_data.operator_name;
      obj.reject_count = calculateCountDifference(current_data, element, 'reject_count');
      obj.cycle_count = calculateCountDifference(current_data, element, 'cycle_count');
      obj.goodcount = calculateCountDifference(current_data, element, 'raw_good_count');
      const keys = [
        { prop: 'pdt', countKey: 'pdt_count', durationKey: 'pdt' },
        { prop: 'updt', countKey: 'updt_count', durationKey: 'updt' },
        { prop: 'cip', countKey: 'cip_count', durationKey: 'cip' },
        { prop: 'changeover', countKey: 'changeover_count', durationKey: 'changeover' },
        { prop: 'waiting', countKey: 'waiting_count', durationKey: 'waiting' },
        { prop: 'blocked', countKey: 'blocked_count', durationKey: 'blocked' },
        { prop: 'ready', countKey: 'ready_count', durationKey: 'ready' },
        { prop: 'executing', countKey: 'executing_count', durationKey: 'executing' },
        { prop: 'minor_manual_stop', countKey: 'minor_manual_stop_count', durationKey: 'minor_manual_stop' },
        { prop: 'minor_fault', countKey: 'minor_fault_count', durationKey: 'minor_fault' },
        { prop: 'major_manual_stop', countKey: 'major_manual_stop_count', durationKey: 'major_manual_stop' },
        { prop: 'major_fault', countKey: 'major_fault_count', durationKey: 'major_fault' }
    ];
      keys.forEach(keyObj => {
          obj[keyObj.prop] = calculateDifference(current_data, element, keyObj.countKey, keyObj.durationKey);
      });
      
      // Special case for 'executing' as count is always 1
      obj.executing.count = 1;
      
      obj.shift_total_count = current_data.raw_good_count;
      obj.sku = lastData.fgex.sku_description;
      var stdt = current_data.major_fault + 
      current_data.major_manual_stop +
      current_data.minor_fault +
      current_data.minor_manual_stop+
      current_data.ready +
      current_data.blocked + 
      current_data.waiting;
      obj.total_downtime = convertHHMM(stdt);

      var thdt = obj.major_fault.duration + 
      obj.major_manual_stop.duration +
      obj.minor_fault.duration +
      obj.minor_manual_stop.duration+
      obj.ready.duration +
      obj.blocked.duration + 
      obj.waiting.duration;

      obj.hourly_total_downtime = convertHHMM( thdt >= 0  ? thdt :  stdt);
      obj.oee = (checkValidation(current_data.productive_time / current_data.ppt_time) * 100).toFixed(2) + "%";
      obj.pe = (checkValidation(current_data.net_operating_time / (current_data.total_time - current_data.pdt)) * 100).toFixed(2) + "%";
      obj.me = (checkValidation(current_data.net_operating_time / (current_data.total_time - current_data.cip - current_data.changeover - current_data.pdt)) * 100).toFixed(2) + "%";
      obj.last_timestamp = moment(lastData.last_timestamp).local().format("HH:mm");
      machine_data.push(obj);
      if (machine_data.length == data.length) {
        addHistory(
          line_id,
          data[0].shift,
          data[0].date,
          lastData.last_timestamp,
          timestamp,
          lastData.batch_name,
          lastData.vendor_name,
          lastData.fgex,
          machine_data,
           ()=>{
            lastData.last_timestamp = timestamp;
            lastData.data = data;
            lastData.shift =  data[0].shift;
            lastData.date =  data[0].date;
            lastData.batch_name = data[0].batch;
            lastData.vendor_name = data[0].vendor;
            lastData.fgex = data[0].fgex;
            lastData.save();
            cb(machine_data);
          }
        );
      }
    });
 
};

function convertHHMM(totalSeconds) {
  var init = totalSeconds;
  h = Math.floor(Math.abs(totalSeconds) / 3600);
  totalSeconds = Math.abs(totalSeconds) % 3600;
  m = Math.floor(totalSeconds / 60);
  s = Math.round(totalSeconds % 60);
  if (init < 0) {
    return "-(" + checkNumber(h) + ":" + checkNumber(m) + ")";
  } else {
    return checkNumber(h) + ":" + checkNumber(m);
  }
}

function calculateDifference(current, previous, keyCount, keyDuration) {
  return {
      count: current[keyCount] - previous[keyCount] < 0 ? current[keyCount] : current[keyCount] - previous[keyCount],
      duration: current[keyDuration] - previous[keyDuration] < 0 ? current[keyDuration] : current[keyDuration] - previous[keyDuration] 
  };
}

function calculateCountDifference(current, previous, key) {
  const diff = current[key] - previous[key];
  return diff < 0 ? current[key] : diff;
}


function checkValidation(value) {
  if (value < 0 || value === Infinity || !value) {
    return 0;
  } else if (value > 1) {
    return 0.99;
  } else {
    return value;
  }
}
function checkNumber(number) {
  if (number < 10) {
    return `0${number}`;
  } else {
    return number;
  }
}


module.exports = {
  hourlyTemp,
  addTempDataHourly,
};
