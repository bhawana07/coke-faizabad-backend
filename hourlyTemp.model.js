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
  var lastData = await hourlyTemp.findOne({ line_id: line_id });
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
  var machine_data = [];
    lastData.data.forEach((element) => {
      var obj = {};
      var current_data = data.find((mach) => mach._id == element._id);
      obj.machine_name = current_data._id;
      obj.operator_name = current_data.operator_name;
      obj.reject_count = current_data.reject_count - element.reject_count;
      obj.cycle_count = current_data.cycle_count - element.cycle_count;
      obj.goodcount = current_data.goodCount - element.goodCount;
      obj.pdt = {
        count:current_data.pdt_count - element.pdt_count,
        duration:current_data.pdt - element.pdt
      };
      obj.updt = {
        count:current_data.updt_count - element.updt_count,
        duration:current_data.updt - element.updt
      };
      obj.cip = {
        count:current_data.cip_count - element.cip_count,
        duration:current_data.cip - element.cip
      }
      obj.changeover = {
        count:current_data.changeover_count - element.changeover_count,
        duration:current_data.changeover - element.changeover
      };
      obj.waiting = {
        count:current_data.waiting_count - element.waiting_count,
        duration:current_data.waiting - element.waiting
      };
      obj.blocked = {
        count:current_data.blocked_count - element.blocked_count,
        duration:current_data.blocked - element.blocked
      };
      obj.ready = {
        count:current_data.ready_count - element.ready_count,
        duration:current_data.ready - element.ready
      };
      obj.executing = {
        count:1,
        duration:current_data.executing - element.executing
      };
      obj.minor_manual_stop = {
        count:current_data.minor_manual_stop_count - element.minor_manual_stop_count,
        duration:current_data.minor_manual_stop - element.minor_manual_stop
      };
      obj.minor_fault = {
        count:current_data.minor_fault_count - element.minor_fault_count,
        duration:current_data.minor_fault - element.minor_fault
      };
      obj.major_manual_stop = {
        count:current_data.major_manual_stop_count - element.major_manual_stop_count,
        duration:current_data.major_manual_stop - element.major_manual_stop
      };
      obj.major_fault = {
        count:current_data.major_fault_count - element.major_fault_count,
        duration:current_data.major_fault - element.major_fault
      };
      obj.shift_total_count = current_data.goodCount;
      obj.total_downtime = convertHHMM(
      current_data.major_fault + 
      current_data.major_manual_stop +
      current_data.minor_fault +
      current_data.minor_manual_stop+
      current_data.ready +
      current_data.blocked + 
      current_data.waiting);
      obj.oee = ((current_data.productive_time / current_data.ppt_time) * 100).toFixed(2) + "%";
      obj.last_timestamp = moment(lastData.last_timestamp).local().format("HH:mm");
      machine_data.push(obj);
      if (machine_data.length == data.length) {
        addHistory(
          lastData.line_id,
          lastData.shift,
          lastData.date,
          lastData.last_timestamp,
          timestamp,
          lastData.batch_name,
          lastData.vendor_name,
          lastData.fgex,
          machine_data,
          async ()=>{
            lastData.last_timestamp = timestamp;
            lastData.data = data;
            lastData.shift =  data[0].shift;
            lastData.date =  data[0].date;
            lastData.batch_name = data[0].batch;
            lastData.vendor_name = data[0].vendor;
            lastData.fgex = data[0].fgex;
            var save = await lastData.save();
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

module.exports = {
  hourlyTemp,
  addTempDataHourly,
};
