var mongoose = require("mongoose");
var moment = require("moment");
var { addMachineData } = require('./project.model');
var { postStop } = require('./stop.model');
var { TempGood } = require("./goodTemp.model")
var major_minor_duration = 5;
var statusSchema = mongoose.Schema({
  machine: {
    type: String,
  },
  condition: {
    type: String,
    default: "executing",
  },
  machine_position: {
    type: Number
  },
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
  stop_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "stop",
  },
  blocked_machine_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "stop",
  },
  critical_machine_name:{
    type:String
  },
  critical_machine_off: {
    type: Boolean,
    default: false,
  },
  last_update: {
    type: Date,
    default: Date.now,
  },
  code: {
    type: String,
    default: "executing",
  },
  shift: {
    type: String
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "batch",
  },
  cip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "cipmasters",
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "vendor",
  },
  date: {
    type: Date
  },
  isFirstExecutingAfterUpdt:{
    type: Number,
    default: 0
  },
  batch_wise_major_fault_count: {
    type: Number,
    default: 0
  },
  batch_wise_minor_fault_count: {
    type: Number,
    default: 0
  },
  batch_wise_major_fault_duration: {
    type: Number,
    default: 0
  },
  batch_wise_minor_fault_duration: {
    type: Number,
    default: 0
  },
  cip_wise_major_fault_count: {
    type: Number,
    default: 0
  },
  cip_wise_minor_fault_count: {
    type: Number,
    default: 0
  },
  cip_wise_major_fault_duration: {
    type: Number,
    default: 0
  },
  cip_wise_minor_fault_duration: {
    type: Number,
    default: 0
  },
  shift_wise_major_fault_count: {
    type: Number,
    default: 0
  },
  shift_wise_minor_fault_count: {
    type: Number,
    default: 0
  },
  shift_wise_major_fault_duration: {
    type: Number,
    default: 0
  },
  shift_wise_minor_fault_duration: {
    type: Number,
    default: 0
  },
  batch_wise_major_manual_stop_count: {
    type: Number,
    default: 0
  },
  batch_wise_minor_manual_stop_count: {
    type: Number,
    default: 0
  },
  batch_wise_major_manual_stop_duration: {
    type: Number,
    default: 0
  },
  batch_wise_minor_manual_stop_duration: {
    type: Number,
    default: 0
  },
  cip_wise_major_manual_stop_count: {
    type: Number,
    default: 0
  },
  cip_wise_minor_manual_stop_count: {
    type: Number,
    default: 0
  },
  cip_wise_major_manual_stop_duration: {
    type: Number,
    default: 0
  },
  cip_wise_minor_manual_stop_duration: {
    type: Number,
    default: 0
  },
  shift_wise_major_manual_stop_count: {
    type: Number,
    default: 0
  },
  shift_wise_minor_manual_stop_count: {
    type: Number,
    default: 0
  },
  shift_wise_major_manual_stop_duration: {
    type: Number,
    default: 0
  },
  shift_wise_minor_manual_stop_duration: {
    type: Number,
    default: 0
  },
  batch_wise_pdt_count: {
    type: Number,
    default: 0
  },
  batch_wise_pdt_duration: {
    type: Number,
    default: 0
  },
  batch_wise_cip_count: {
    type: Number,
    default: 0
  },
  batch_wise_cip_duration: {
    type: Number,
    default: 0
  },
  cip_wise_pdt_count: {
    type: Number,
    default: 0
  },
  cip_wise_pdt_duration: {
    type: Number,
    default: 0
  },
  cip_wise_cip_count: {
    type: Number,
    default: 0
  },
  cip_wise_cip_duration: {
    type: Number,
    default: 0
  },
  
  shift_wise_cip_count: {
    type: Number,
    default: 0
  },
  shift_wise_cip_duration: {
    type: Number,
    default: 0
  },
  shift_wise_pdt_count: {
    type: Number,
    default: 0
  },
  shift_wise_pdt_duration: {
    type: Number,
    default: 0
  },
  batch_wise_executing_count: {
    type: Number,
    default: 0
  },
  batch_wise_executing_duration: {
    type: Number,
    default: 0
  },

  cip_wise_executing_count: {
    type: Number,
    default: 0
  },
  cip_wise_executing_duration: {
    type: Number,
    default: 0
  },

  shift_wise_executing_count: {
    type: Number,
    default: 0
  },
  shift_wise_executing_duration: {
    type: Number,
    default: 0
  },
  batch_wise_schedule_maintance_count: {
    type: Number,
    default: 0
  },
  batch_wise_schedule_maintance_duration: {
    type: Number,
    default: 0
  },

  cip_wise_schedule_maintance_count: {
    type: Number,
    default: 0
  },
  cip_wise_schedule_maintance_duration: {
    type: Number,
    default: 0
  },
  shift_wise_schedule_maintance_count: {
    type: Number,
    default: 0
  },
  shift_wise_schedule_maintance_duration: {
    type: Number,
    default: 0
  },
  batch_wise_updt_count: {
    type: Number,
    default: 0
  },
  batch_wise_updt_duration: {
    type: Number,
    default: 0
  },

  cip_wise_updt_count: {
    type: Number,
    default: 0
  },
  cip_wise_updt_duration: {
    type: Number,
    default: 0
  },
  shift_wise_updt_count: {
    type: Number,
    default: 0
  },
  shift_wise_updt_duration: {
    type: Number,
    default: 0
  },
  batch_wise_changeover_count: {
    type: Number,
    default: 0
  },
  batch_wise_changeover_duration: {
    type: Number,
    default: 0
  },

  cip_wise_changeover_count: {
    type: Number,
    default: 0
  },
  cip_wise_changeover_duration: {
    type: Number,
    default: 0
  },

  shift_wise_changeover_count: {
    type: Number,
    default: 0
  },
  shift_wise_changeover_duration: {
    type: Number,
    default: 0
  },
  batch_wise_waiting_count: {
    type: Number,
    default: 0
  },
  batch_wise_waiting_duration: {
    type: Number,
    default: 0
  },

 cip_wise_waiting_count: {
    type: Number,
    default: 0
  },
 cip_wise_waiting_duration: {
    type: Number,
    default: 0
  },

  shift_wise_waiting_count: {
    type: Number,
    default: 0
  },
  shift_wise_waiting_duration: {
    type: Number,
    default: 0
  },
  batch_wise_blocked_count: {
    type: Number,
    default: 0
  },
  batch_wise_blocked_duration: {
    type: Number,
    default: 0
  },

  cip_wise_blocked_count: {
      type: Number,
      default: 0
    },
  cip_wise_blocked_duration: {
      type: Number,
      default: 0
    },

  shift_wise_blocked_count: {
    type: Number,
    default: 0
  },
  shift_wise_blocked_duration: {
    type: Number,
    default: 0
  },
  batch_wise_ready_count: {
    type: Number,
    default: 0
  },
  batch_wise_ready_duration: {
    type: Number,
    default: 0
  },
  cip_wise_ready_count: {
    type: Number,
    default: 0
  },
  cip_wise_ready_duration: {
    type: Number,
    default: 0
  },
  shift_wise_ready_count: {
    type: Number,
    default: 0
  },
  shift_wise_ready_duration: {
    type: Number,
    default: 0
  },
  last_batch_reset:{
    type:Date
  },
  last_cip_reset:{
    type:Date
  },
  last_shift_reset:{
    type:Date
  },
  last_vendor_reset:{
    type:Date
  },
  batch_wise_fault_array: [
    {
      fault_code: {
        type: String
      },
      duration: {
        type: Number
      },
      count: {
        type: Number
      }
    }
  ],
  shift_wise_fault_array: [
    {
      fault_code: {
        type: String
      },
      duration: {
        type: Number
      },
      count: {
        type: Number
      }
    }
  ],
  startup_reject: {
    type: Number,
    default: 0
  },
  last_cip_batch:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "batch",
  },
  last_cip_shift:{
    type:String
  },
  last_cip_date:{
    type:Date
  },

  mqtt_obj:{
    
  }
});

var Condition = mongoose.model("Status", statusSchema);

//machine postion 
var position_obj = {
  blower: 1,
  coder: 2,
  filler: 3,
  capper: 4,
  labeler: 5,
  shrink: 6,
  vision: 7,
  case_erector: 8,
  case_packer: 9,
  case_sealer: 10,
  weigher: 11,
  palletiser: 12,
  pallet_id: 13
};
//get current condition of machine
var getCondition = async (machine, line_id, date, shift, operator_name, batch, vendor,changeover,cip_id, cb) => {
  var condition = await Condition.findOne({
    machine: machine,
    line_id: line_id,
  });
  if(condition && (!condition.cip || !condition.last_cip_batch)){
    condition.cip = cip_id;
    condition.last_cip_batch = batch;
    condition.save();
  }
  if (!condition) {
    var con = new Condition({
      machine: machine,
      last_update: moment().format("YYYY-MM-DDTHH:mm:ss"),
      line_id: line_id,
      shift: shift,
      batch: batch,
      cip:cip_id,
      last_cip_batch:batch,
      machine_position: position_obj[machine] || 15,
      vendor: vendor,
      date: date
    });
    addMachineData(line_id, date, shift, operator_name, batch, vendor, machine,changeover,cip_id, (data) => {

    })
    postStop(
      {
        line_id,
        shift,
        date,
        machine_name:machine,
        timestamp:moment().format("YYYY-MM-DDTHH:mm:ss"),
        batch,
        vendor,
        good_count:0,
        fromChange:"Start",
        parent_stop: "executing",
        stop_name: "executing"
      }, async (data) => {
        console.log("From Status",data);
      var save = await con.save();
      cb(save);
    })

  } else {
    cb(condition)
  }
};

//update conditio
var updateCondition = async (machine, line_id, condition, timestamp, code, duration, shift, batch,stop_id, cb) => {
  var pre_condition = await Condition.findOne({ machine: machine, line_id: line_id });
  if (pre_condition.condition == "fault" || pre_condition.condition == "manual_stop") {
    var duration_type = checkMajorMinor(duration);
    if (pre_condition.condition == "fault" && duration_type == "major") {
      var batch_fault_code = pre_condition.batch_wise_fault_array.find((data) => data.fault_code == pre_condition.code);
      var shift_fault_code = pre_condition.shift_wise_fault_array.find((data) => data.fault_code == pre_condition.code);
      var fault_obj = {
        fault_code: pre_condition.code,
        duration: duration,
        count: 1
      }
      //batch wise array perform
      if (!batch_fault_code) {
        pre_condition.batch_wise_fault_array.push(fault_obj);
      } else {
        var ind = pre_condition.batch_wise_fault_array.findIndex((data) => data.fault_code == pre_condition.code);
        pre_condition.batch_wise_fault_array[ind] = {
          fault_code: pre_condition.code,
          duration: duration + batch_fault_code.duration,
          count: 1 + batch_fault_code.count
        }
      }
      //shift wise array perform
      if (!shift_fault_code) {
        pre_condition.shift_wise_fault_array.push(fault_obj);
      } else {
        var ind = pre_condition.shift_wise_fault_array.findIndex((data) => data.fault_code == pre_condition.code);
        pre_condition.shift_wise_fault_array[ind] = {
          fault_code: pre_condition.code,
          duration: duration + shift_fault_code.duration,
          count: 1 + shift_fault_code.count
        }
      }
      pre_condition[`shift_wise_${duration_type}_${pre_condition.condition}_count`] += 1;
      pre_condition[`shift_wise_${duration_type}_${pre_condition.condition}_duration`] += duration;
      pre_condition[`batch_wise_${duration_type}_${pre_condition.condition}_count`] += 1;
      pre_condition[`batch_wise_${duration_type}_${pre_condition.condition}_duration`] += duration;
      pre_condition[`cip_wise_${duration_type}_${pre_condition.condition}_count`] += 1;
      pre_condition[`cip_wise_${duration_type}_${pre_condition.condition}_duration`] += duration;
    } else {
      pre_condition[`shift_wise_${duration_type}_${pre_condition.condition}_count`] += 1;
      pre_condition[`shift_wise_${duration_type}_${pre_condition.condition}_duration`] += duration;
      pre_condition[`batch_wise_${duration_type}_${pre_condition.condition}_count`] += 1;
      pre_condition[`batch_wise_${duration_type}_${pre_condition.condition}_duration`] += duration;
      pre_condition[`cip_wise_${duration_type}_${pre_condition.condition}_count`] += 1;
      pre_condition[`cip_wise_${duration_type}_${pre_condition.condition}_duration`] += duration;
    }
  } else {
    pre_condition[`shift_wise_${pre_condition.condition}_count`] += 1;
    pre_condition[`shift_wise_${pre_condition.condition}_duration`] += duration;
    pre_condition[`batch_wise_${pre_condition.condition}_count`] += 1;
    pre_condition[`batch_wise_${pre_condition.condition}_duration`] += duration;
    pre_condition[`cip_wise_${pre_condition.condition}_count`] += 1;
    pre_condition[`cip_wise_${pre_condition.condition}_duration`] += duration;
  }
  pre_condition.condition = condition;
  pre_condition.code = code;
  pre_condition.last_update = timestamp;
  pre_condition.stop_id = stop_id;
  var save = pre_condition.save();
  cb(save)
};

//restet batch
var resetBatchData = async (machine, line_id, batch,vendor, cb) => {
  var pre_condition = await Condition.findOne({ machine: machine, line_id: line_id });
  pre_condition.batch_wise_major_fault_count = 0;
  pre_condition.batch_wise_minor_fault_count = 0;
  pre_condition.batch_wise_major_fault_duration = 0;
  pre_condition.batch_wise_minor_fault_duration = 0;
  pre_condition.batch_wise_major_manual_stop_count = 0;
  pre_condition.batch_wise_minor_manual_stop_count = 0;
  pre_condition.batch_wise_major_manual_stop_duration = 0;
  pre_condition.batch_wise_minor_manual_stop_duration = 0;
  pre_condition.batch_wise_pdt_count = 0;
  pre_condition.batch_wise_pdt_duration = 0;
  pre_condition.batch_wise_updt_count = 0;
  pre_condition.batch_wise_updt_duration = 0;
  pre_condition.batch_wise_cip_count = 0;
  pre_condition.batch_wise_cip_duration = 0;
  pre_condition.batch_wise_changeover_count = 0;
  pre_condition.batch_wise_changeover_duration = 0;
  pre_condition.batch_wise_waiting_count = 0;
  pre_condition.batch_wise_waiting_duration = 0
  pre_condition.batch_wise_blocked_count = 0;
  pre_condition.batch_wise_blocked_duration = 0;
  pre_condition.batch_wise_ready_count = 0;
  pre_condition.batch_wise_ready_duration = 0;
  pre_condition.batch_wise_executing_count = 0;
  pre_condition.batch_wise_executing_duration = 0;
  pre_condition.batch_wise_schedule_maintance_count = 0;
  pre_condition.batch_wise_schedule_maintance_duration = 0;
  pre_condition.batch_wise_fault_array = [];
  pre_condition.startup_reject = 0;
  pre_condition.batch = batch;
  pre_condition.vendor = vendor;
  pre_condition.last_batch_reset = new Date();
  var save = await pre_condition.save();
  cb(save)
};
//reset shift
var resetShiftData = async (machine, line_id, shift, date,batch,vendor,cb) => {
  var pre_condition = await Condition.findOne({ machine: machine, line_id: line_id });
  pre_condition.shift_wise_major_fault_count = 0;
  pre_condition.shift_wise_minor_fault_count = 0;
  pre_condition.shift_wise_major_fault_duration = 0;
  pre_condition.shift_wise_minor_fault_duration = 0;
  pre_condition.shift_wise_major_manual_stop_count = 0;
  pre_condition.shift_wise_minor_manual_stop_count = 0;
  pre_condition.shift_wise_major_manual_stop_duration = 0;
  pre_condition.shift_wise_minor_manual_stop_duration = 0;
  pre_condition.shift_wise_pdt_count = 0;
  pre_condition.shift_wise_pdt_duration = 0;
  pre_condition.shift_wise_updt_count = 0;
  pre_condition.shift_wise_updt_duration = 0;
  pre_condition.shift_wise_cip_count = 0;
  pre_condition.shift_wise_cip_duration = 0;
  pre_condition.shift_wise_changeover_count = 0;
  pre_condition.shift_wise_changeover_duration = 0;
  pre_condition.shift_wise_waiting_count = 0;
  pre_condition.shift_wise_waiting_duration = 0
  pre_condition.shift_wise_blocked_count = 0;
  pre_condition.shift_wise_blocked_duration = 0;
  pre_condition.shift_wise_ready_count = 0;
  pre_condition.shift_wise_ready_duration = 0;
  pre_condition.shift_wise_executing_count = 0;
  pre_condition.shift_wise_executing_duration = 0;
  pre_condition.shift_wise_schedule_maintance_count = 0;
  pre_condition.shift_wise_schedule_maintance_duration = 0;
  pre_condition.shift_wise_fault_array = [];
  pre_condition.shift = shift;
  pre_condition.date = date;
  pre_condition.vendor = vendor;
  pre_condition.batch = batch;
  pre_condition.last_shift_reset = new Date();
  var save = await pre_condition.save();
  cb(save)
};

//restet cip
var resetCipData = async (machine, line_id, cip_id,batch,cb) => {
  var pre_condition = await Condition.findOne({ machine: machine, line_id: line_id });
  if(!pre_condition.cip){
    pre_condition.cip = cip_id;
    pre_condition.last_cip_batch = batch;
    var save = await pre_condition.save();
    cb(save)
  }else{
    pre_condition.cip_wise_major_fault_count = 0;
    pre_condition.cip_wise_minor_fault_count = 0;
    pre_condition.cip_wise_major_fault_duration = 0;
    pre_condition.cip_wise_minor_fault_duration = 0;
    pre_condition.cip_wise_major_manual_stop_count = 0;
    pre_condition.cip_wise_minor_manual_stop_count = 0;
    pre_condition.cip_wise_major_manual_stop_duration = 0;
    pre_condition.cip_wise_minor_manual_stop_duration = 0;
    pre_condition.cip_wise_pdt_count = 0;
    pre_condition.cip_wise_pdt_duration = 0;
    pre_condition.cip_wise_updt_count = 0;
    pre_condition.cip_wise_updt_duration = 0;
    pre_condition.cip_wise_cip_count = 0;
    pre_condition.cip_wise_cip_duration = 0;
    pre_condition.cip_wise_changeover_count = 0;
    pre_condition.cip_wise_changeover_duration = 0;
    pre_condition.cip_wise_waiting_count = 0;
    pre_condition.cip_wise_waiting_duration = 0
    pre_condition.cip_wise_blocked_count = 0;
    pre_condition.cip_wise_blocked_duration = 0;
    pre_condition.cip_wise_ready_count = 0;
    pre_condition.cip_wise_ready_duration = 0;
    pre_condition.cip_wise_executing_count = 0;
    pre_condition.cip_wise_executing_duration = 0;
    pre_condition.cip_wise_schedule_maintance_count = 0;
    pre_condition.cip_wise_schedule_maintance_duration = 0;
    pre_condition.cip_wise_fault_array = [];
    pre_condition.startup_reject = 0;
    pre_condition.cip = cip_id;
    pre_condition.last_cip_batch = batch;
    pre_condition.last_cip_reset = new Date();
    var save = await pre_condition.save();
    cb(save)
  }
};
//reset vendor
var resetVendorData = async (machine, line_id, vendor, cb) => {
  var pre_condition = await Condition.findOne({ machine: machine, line_id: line_id });
  pre_condition.vendor = vendor;
  pre_condition.last_vendor_reset = new Date();
  var save = await pre_condition.save();
  cb(save)
};
//update startup reject
const updateStatusStartupReject = async (machine, line_id, count, cb) => {
  try {
    const data = await Condition.updateOne(
      { line_id, machine },
      { $inc: { startup_reject: count } }
    );
    cb(data);
  } catch (error) {
    // Handle errors, e.g., log them or perform other actions
    console.error(error);
    cb(error);
  }
};

//get machine in fault or manual stop in case of waiting
var getStopMachineOnWaiting = async (line_id, position, cb) => {
  var data = await Condition.find({
    line_id: line_id,
    machine_position: {
      $lt: position
    },
    $or: [
      {
        condition: "fault"
      },
      {
        condition: "manual_stop"
      },
    ]
  }).sort({ last_update : 1 });
  cb(data)
};

//get machine in fault and manual stop in case of block
var getStopMachineOnBlocked = async (line_id, position, cb) => {
  var data = await Condition.find({
    line_id: line_id,
    machine_position: {
      $gt: position
    },
    $or: [
      {
        condition: "fault"
      },
      {
        condition: "manual_stop"
      },
    ]
  }).sort({ last_update : 1 });
  cb(data)
};

//get all machine on waiting when critical machine is waiting
var getWaitingMachineOnWaiting = async (line_id, position, cb) => {
  var data = await Condition.find({
    line_id: line_id,
    condition: "waiting",
    machine_position: {
      $lt: position
    },
  }).sort({ last_update : 1 });
  cb(data)
};

//get all machine on blocked when critical machine is in blocked
var getBlockedMachineOnBlocked = async (line_id, position, cb) => {
  var data = await Condition.find({
    line_id: line_id,
    condition: "blocked",
    machine_position: {
      $gt: position
    },
  }).sort({ last_update : 1 });
  cb(data)
};
//update status file while critical machine off
const updateStatus = async (machine, line_id, obj) => {
  var result = await Condition.updateOne(
    {
      machine: machine,
      line_id: line_id,
    },
    {
      $set: obj,
    }
  );
  return result;
};

//send telegram message 
const messageSendAfterCip = async(line_id,obj)=>{
var condition = await Condition.find({line_id:line_id});
var machine_obj = {};
condition.forEach(async (element,i) => {
  var temp = await TempGood.findOne({machine:element.machine});
  if(element.machine == obj.critical_machine || element.machine == obj.last_machine){
      machine_obj[element.machine] = machine_obj[element.machine] || {};
      machine_obj[element.machine].good_count = temp.current_good_value - temp.cip_start_good_count;
      machine_obj[element.machine].cycle_count = temp.current_cycle_count - temp.cip_start_cycle_count;
      machine_obj[element.machine].reject_count = temp.current_reject_value - temp.cip_start_reject_count;
      machine_obj[element.machine].fault = element.cip_wise_minor_fault_duration + element.cip_wise_major_fault_duration;
      machine_obj[element.machine].manual_stop = element.cip_wise_minor_manual_stop_duration + element.cip_wise_major_manual_stop_duration;
      machine_obj[element.machine].waiting = element.cip_wise_waiting_duration;
      machine_obj[element.machine].blocked = element.cip_wise_blocked_duration;
      machine_obj[element.machine].idle = element.cip_wise_ready_duration;
      machine_obj[element.machine].updt = element.cip_wise_updt_duration;
      machine_obj[element.machine].pdt = element.cip_wise_pdt_duration;
      machine_obj[element.machine].cip = element.cip_wise_cip_duration;
      machine_obj[element.machine].changeover = element.cip_wise_changeover_duration;
      machine_obj[element.machine].total_time = Math.round(new Date() - new Date(temp.cip_start_timestamp) / 1000);
  }
});

}
//function check major minor
function checkMajorMinor(duration) {
  if (duration > (major_minor_duration * 60)) {
    return "major";
  } else {
    return "minor";
  }
};


module.exports.Condition = Condition;
module.exports.getCondition = getCondition;
module.exports.updateCondition = updateCondition;
module.exports.updateStatusStartupReject = updateStatusStartupReject;
module.exports.resetBatchData = resetBatchData;
module.exports.resetCipData = resetCipData;
module.exports.resetShiftData = resetShiftData;
module.exports.resetVendorData = resetVendorData;
module.exports.getStopMachineOnWaiting = getStopMachineOnWaiting;
module.exports.getStopMachineOnBlocked = getStopMachineOnBlocked;
module.exports.getBlockedMachineOnBlocked = getBlockedMachineOnBlocked;
module.exports.getWaitingMachineOnWaiting = getWaitingMachineOnWaiting;
module.exports.updateStatus = updateStatus;
module.exports.messageSendAfterCip = messageSendAfterCip;
