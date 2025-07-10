var mongoose = require("mongoose");
const {
  addMachineData,
  updateGoodCount,
  addShiftData,
  addBatchData,
  addVendorData,
} = require("./project.model");
var { indexoperatorid } = require("./roster.model");
var { changeOver, getLastChangeover } = require("./changeover.model");
//const { addLine } = require("./addLine.model");
var goodTempSchema = new mongoose.Schema(
  {
    shift_start_good_count: {
      type: Number,
      default: 0,
    },
    shift_start_reject_count: {
      type: Number,
      default: 0,
    },
    shift_start_cycle_count: {
      type: Number,
      default: 0,
    },
    changeover_start_good_count: {
      type: Number,
      default: 0,
    },
    changeover_start_reject_count: {
      type: Number,
      default: 0,
    },
    changeover_start_cycle_count: {
      type: Number,
      default: 0,
    },
    batch_start_good_count: {
      type: Number,
      default: 0,
    },
    batch_start_reject_count: {
      type: Number,
      default: 0,
    },
    batch_start_cycle_count: {
      type: Number,
      default: 0,
    },
    cip_start_good_count: {
      type: Number,
      default: 0,
    },
    pdt_start_good_count: {
      type: Number,
      default: 0,
    },
    isPdt:{
      type:Boolean,
      default:false
    },
    cip_start_reject_count: {
      type: Number,
      default: 0,
    },
    cip_start_cycle_count: {
      type: Number,
      default: 0,
    },
    total_number_of_batch: {
      type: Number,
      default: 0,
    },
    manual_total_number_of_batch: {
      type: Number,
      default: 0,
    },
    water_use: {
      type: Number,
      default: 0,
    },
    mode: {
      type: Number,
    },
    RecipeNumber:{
      type:Number
    },
    setup_mode: {
      type: Boolean,
      default: false,
    },
    setup_timestamp: {
      type: Date,
    },
    machine_mode: {
      type: String,
      default: "production",
    },
    bpm: {
      type: Number,
      default: 0,
    },
    current_good_value: {
      type: Number,
      default: 0,
    },
    current_cycle_count: {
      type: Number,
      default: 0,
    },
    cycle_count_when_no_count: {
      type: Number,
      default: 0,
    },
    cycle_count_staus_when_no_count: {
      type: Boolean,
      default: false,
    },
    current_reject_value: {
      type: Number,
      default: 0,
    },
    current_shift: {
      type: String,
    },
    date: {
      type: Date,
    },
    currnt_batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "batchskutrigger",
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendortrigger",
    },
    machine: {
      type: String,
    },
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
    changeover_mode: {
      type: Boolean,
      default: false,
    },
    current_operator: {
      type: String,
    },
    batch_start_no_of_case: {
      type: Number,
      default: 0,
    },
    shift_start_no_of_case: {
      type: Number,
      default: 0,
    },
    current_no_of_case: {
      type: Number,
      default: 0,
    },
    current_roll_changeover: {
      type: Number,
      default: 0,
    },
    shift_start_roll_changeover: {
      type: Number,
      default: 0,
    },
    water_use: {
      type: Number,
      default: 0,
    },
    batch_start_roll_changeover: {
      type: Number,
      default: 0,
    },
    batch_end_message: {
      type: Boolean,
      default: false,
    },
    film_end_message: {
      type: Boolean,
      default: false,
    },
    target_end_message: {
      type: Boolean,
      default: false,
    },
    target_end_timestamp: {
      type: Date,
      default: null,
    },
    target_end_timer_message: {
      type: Boolean,
      default: false,
    },
    taget_end_plc_single_time: {
      type: Boolean,
      default: false,
    },
    batch_name_from_release: {
      type: String,
    },
    batch_name_from_index: {
      type: String,
    },
    cip_start_timestamp:{
      type:Date,
    },
    isCipHalfHourDone:{
      type:Boolean
    },
  },
  { timestamps: true }
);
var TempGood = mongoose.model("TempGood", goodTempSchema);

reset_obj = {
  sidel: 0,
  filler: 1,
  labeler: 2,
  shrink: 3,
};
//get temp good
const getTempGood = async (
  machine,
  line_id,
  shift,
  batch,
  current_good_value,
  current_reject_value,
  current_cycle_count,
  date,
  vendor
) => {
  var temp = await TempGood.findOne({ machine: machine, line_id: line_id });
  if (!temp) {
    var newTemp = new TempGood({
      line_id: line_id,
      machine: machine,
      current_shift: shift,
      currnt_batch: batch,
      current_good_value: current_good_value,
      current_reject_value: current_reject_value,
      shift_start_good_count: current_good_value,
      batch_start_good_count: current_good_value,
      shift_start_reject_count: current_reject_value,
      batch_start_reject_count: current_reject_value,
      batch_start_cycle_count: current_cycle_count,
      shift_start_cycle_count: current_cycle_count,
      date: date,
      vendor: vendor,
    });
    var result = await newTemp.save();
    return result;
  } else {
    return temp;
  }
};
//pre_shift
var preShift = async function (
  machine,
  line_id,
  shift,
  batch,
  date,
  vendor,
  operator_name,
  changeover,
  cip
) {
  var tempGood = await TempGood.findOne({ line_id: line_id, machine: machine });
  if (!tempGood) {
    addShiftData(
      line_id,
      date,
      shift,
      operator_name,
      batch,
      vendor,
      changeover,
      cip,
      (data) => {}
    );
    return {
      current_shift: shift,
      currnt_batch: batch,
      date: date,
      vendor: vendor,
    };
  }
  return tempGood;
};
//update frequent
const frequentGoodUpdate = async (machine, line_id, obj, cb) => {
  try {
    const result = await TempGood.updateOne(
      {
        machine: machine,
        line_id: line_id,
      },
      {
        $set: obj,
      }
    );
    if (cb) {
      cb(result);
    } else {
      return result;
    }
  } catch (err) {
    console.error(err);
    if (cb) {
      cb({ error: err.message });
    } else {
      throw err;
    }
  }
};

const updateChangeoverMode = async (
  line_id,
  batch,
  addLine,
  changeover_id,
  cip,
  isSameType,
  venodr_id,
  cb
) => {
  var send_arry = [];
  var critical_temp = await TempGood.findOne({
    line_id: line_id,
    machine: addLine.critical_machine,
  }).populate("line_id");
  var vendor_id = isSameType ? critical_temp.vendor : venodr_id;
  addBatchData(
    line_id,
    critical_temp.date,
    critical_temp.current_shift,
    batch,
    critical_temp.vendor,
    changeover_id,
    cip,
    () => {
      addLine.machine_wise.forEach(async (element, i) => {
        var temp = await TempGood.findOne({
          line_id: line_id,
          machine: element.machine_name,
        });
        var operator_roster = await indexoperatorid(
          temp.date,
          temp.shift,
          line_id
        );
        var operator_name = operator_roster._id;
        var shift_good = temp.current_good_value - temp.shift_start_good_count;
        var shift_reject =
          temp.current_reject_value - temp.shift_start_reject_count;
        var shift_cycle_count =
          temp.current_cycle_count - temp.shift_start_cycle_count;
        //console.log(shift_reject)
        updateGoodCount(
          line_id,
          temp.date,
          temp.current_shift,
          temp.currnt_batch,
          temp.vendor,
          element.machine_name,
          shift_good,
          shift_reject,
          shift_cycle_count,
          async () => {
            addMachineData(
              line_id,
              temp.date,
              temp.current_shift,
              operator_name,
              batch,
              vendor_id,
              element.machine_name,
              changeover_id,
              cip,
              async () => {
                temp.shift_start_good_count = temp.current_good_value;
                temp.shift_start_reject_count = temp.current_reject_value;
                temp.shift_start_no_of_case = temp.current_no_of_case;
                temp.shift_start_roll_changeover = temp.current_roll_changeover;
                temp.shift_start_cycle_count = temp.current_cycle_count;
                temp.batch_start_roll_changeover = temp.current_roll_changeover;
                temp.batch_start_no_of_case = temp.current_no_of_case;
                temp.batch_start_good_count = temp.current_good_value;
                temp.batch_start_reject_count = temp.current_reject_value;
                temp.batch_start_cycle_count = temp.current_cycle_count;
                temp.changeover_start_good_count =
                  !isSameType || reset_obj[element.machine_name] > 0
                    ? temp.current_good_value
                    : temp.changeover_start_good_count;
                temp.changeover_start_reject_count =
                  !isSameType || reset_obj[element.machine_name] > 0
                    ? temp.current_reject_value
                    : temp.changeover_start_reject_count;
                temp.changeover_start_cycle_count =
                  !isSameType || reset_obj[element.machine_name] > 1
                    ? temp.current_cycle_count
                    : temp.changeover_start_cycle_count;
                temp.currnt_batch = batch;
                temp.changeover_mode = true;
                temp.machine_mode =
                  critical_temp.line_id.line_type == "process"
                    ? "production"
                    : "changeover";
                temp.vendor = vendor_id;
                temp.manual_total_number_of_batch += 1;
                var save = await temp.save();
                send_arry.push(save);
                if (send_arry.length == addLine.machine_wise.length) {
                  cb(send_arry);
                }
              }
            );
          }
        );
      });
    }
  );
};

const pdtStartInTemp = async(machine, line_id,cb)=>{
  var temp = await TempGood.findOne({ machine: machine, line_id: line_id });
  if(!temp.isPdt){
    temp.isPdt = true;
    temp.pdt_start_good_count = temp.current_good_value;
    var save = await temp.save();
    cb(save);
  }
}

const updateCipMode =  async(line_id,obj,cb)=>{
  console.log(obj.changeover_id);
  var send_arry = [];
  var critical_temp = await TempGood.findOne({
    line_id: line_id,
    machine: obj.addLine.critical_machine,
  }).populate("line_id");
  var vendor_id = obj.isSameType ? critical_temp.vendor : obj.venodr_id;
  addBatchData(
    line_id,
    critical_temp.date,
    critical_temp.current_shift,
    obj.batch,
    critical_temp.vendor,
    obj.changeover_id,
    obj.cip,
    () => {
      obj.addLine.machine_wise.forEach(async (element, i) => {
        var temp = await TempGood.findOne({
          line_id: line_id,
          machine: element.machine_name,
        });
        var operator_roster = await indexoperatorid(
          temp.date,
          temp.shift,
          line_id
        );
        var operator_name = operator_roster._id;
        var shift_good = temp.current_good_value - temp.shift_start_good_count;
        var shift_reject =
          temp.current_reject_value - temp.shift_start_reject_count;
        var shift_cycle_count =
          temp.current_cycle_count - temp.shift_start_cycle_count;
        //console.log(shift_reject)
        updateGoodCount(
          line_id,
          temp.date,
          temp.current_shift,
          temp.currnt_batch,
          temp.vendor,
          element.machine_name,
          shift_good,
          shift_reject,
          shift_cycle_count,
          async () => {
            addMachineData(
              line_id,
              temp.date,
              temp.current_shift,
              operator_name,
              obj.batch,
              vendor_id,
              element.machine_name,
              obj.changeover_id,
              obj.cip,
              async () => {
                temp.shift_start_good_count = temp.current_good_value;
                temp.shift_start_reject_count = temp.current_reject_value;
                temp.shift_start_no_of_case = temp.current_no_of_case;
                temp.shift_start_roll_changeover = temp.current_roll_changeover;
                temp.shift_start_cycle_count = temp.current_cycle_count;
                temp.batch_start_roll_changeover = temp.current_roll_changeover;
                temp.batch_start_no_of_case = temp.current_no_of_case;
                temp.batch_start_good_count = temp.current_good_value;
                temp.batch_start_reject_count = temp.current_reject_value;
                temp.batch_start_cycle_count = temp.current_cycle_count;
                temp.currnt_batch = obj.batch;
                temp.vendor = vendor_id;
                temp.manual_total_number_of_batch += 1;
                var save = await temp.save();
                send_arry.push(save);
                if (send_arry.length == obj.addLine.machine_wise.length) {
                  cb(send_arry);
                }
              }
            );
          }
        );
      });

    })
}
var batchChangeProcessSide = async (line_id, batch, plc_no_of_batch, cb) => {
  // var addline = await addLine.findOne({ line_id: line_id });
  // //console.log(addline,line_id)
  // var critical_temp = await TempGood.findOne({
  //   line_id: line_id,
  //   machine: addline.critical_machine,
  // });
  // var send_arry = [];
  // var current_changeover = await changeOver.findOne({
  //   line_id: line_id,
  //   changeover_to_date: null,
  // });
  // addBatchData(
  //   line_id,
  //   critical_temp.date,
  //   critical_temp.current_shift,
  //   batch,
  //   critical_temp.vendor,
  //   current_changeover._id,
  //   () => {
  //     addline.machine_wise.forEach(async (element, i) => {
  //       var temp = await TempGood.findOne({
  //         line_id: line_id,
  //         machine: element.machine_name,
  //       });
  //       var operator_roster = await indexoperatorid(
  //         temp.date,
  //         temp.shift,
  //         line_id
  //       );
  //       var operator_name = operator_roster._id;
  //       var shift_good = temp.current_good_value - temp.shift_start_good_count;
  //       var shift_reject =
  //         temp.current_reject_value - temp.shift_start_reject_count;
  //       var shift_cycle_count =
  //         temp.current_cycle_count - temp.shift_start_cycle_count;
  //       //console.log(shift_reject
  //       updateGoodCount(
  //         line_id,
  //         temp.date,
  //         temp.current_shift,
  //         temp.currnt_batch,
  //         temp.vendor,
  //         element.machine_name,
  //         shift_good,
  //         shift_reject,
  //         shift_cycle_count,
  //         async () => {
  //           addMachineData(
  //             line_id,
  //             temp.date,
  //             temp.current_shift,
  //             operator_name,
  //             batch,
  //             temp.vendor,
  //             element.machine_name,
  //             current_changeover._id,
  //             async () => {
  //               temp.shift_start_good_count = temp.current_good_value;
  //               temp.shift_start_reject_count = temp.current_reject_value;
  //               temp.shift_start_no_of_case = temp.current_no_of_case;
  //               temp.shift_start_roll_changeover = temp.current_roll_changeover;
  //               temp.shift_start_cycle_count = temp.current_cycle_count;
  //               temp.batch_start_roll_changeover = temp.current_roll_changeover;
  //               temp.batch_start_no_of_case = temp.current_no_of_case;
  //               temp.manual_total_number_of_batch += 1;
  //               temp.batch_start_good_count = temp.current_good_value;
  //               temp.batch_start_reject_count = temp.current_reject_value;
  //               temp.batch_start_cycle_count = temp.current_cycle_count;
  //               temp.currnt_batch = batch;
  //               temp.changeover_mode = true;
  //               temp.machine_mode = "production";
  //               temp.vendor = temp.vendor;
  //               current_changeover.total_number_of_batch += 1;
  //               await current_changeover.save();
  //               var save = await temp.save();
  //               send_arry.push(save);
  //             }
  //           );
  //         }
  //       );
  //       if (i + 1 == addline.machine_wise.length) {
  //         addline.manual_no_batch = plc_no_of_batch;
  //         await addline.save();
  //         cb(send_arry);
  //       }
  //     });
  //   }
  // );
};
//update vendor
const updateVendor = async (line_id, vendor, addLine, cb) => {
  var send_arry = [];
  var critical_temp = await TempGood.findOne({
    line_id: line_id,
    machine: addLine.critical_machine,
  });
  addVendorData(
    line_id,
    critical_temp.date,
    critical_temp.current_shift,
    critical_temp.currnt_batch,
    vendor,
    () => {
      addLine.machine_wise.forEach(async (element, i) => {
        var temp = await TempGood.findOne({
          line_id: line_id,
          machine: element.machine_name,
        });
        var operator_roster = await indexoperatorid(
          temp.date,
          temp.shift,
          line_id
        );
        var current_changover = await getLastChangeover(line_id);
        var operator_name = operator_roster._id;
        var shift_good = temp.current_good_value - temp.shift_start_good_count;
        var shift_reject =
          temp.current_reject_value - temp.shift_start_reject_count;
        var shift_cycle_count =
          temp.current_cycle_count - temp.shift_start_cycle_count;
        //console.log(shift_reject)
        updateGoodCount(
          line_id,
          temp.date,
          temp.current_shift,
          temp.currnt_batch,
          temp.vendor,
          element.machine_name,
          shift_good,
          shift_reject,
          shift_cycle_count,
          async () => {
            addMachineData(
              line_id,
              temp.date,
              temp.current_shift,
              operator_name,
              temp.currnt_batch,
              vendor,
              element.machine_name,
              current_changover._id,
              async () => {
                temp.shift_start_good_count = temp.current_good_value;
                temp.shift_start_reject_count = temp.current_reject_value;
                temp.shift_start_no_of_case = temp.current_no_of_case;
                temp.shift_start_roll_changeover = temp.current_roll_changeover;
                temp.shift_start_cycle_count = temp.current_cycle_count;
                var save = await temp.save();
                send_arry.push(save);
              }
            );
          }
        );
        if (i + 1 == addLine.machine_wise.length) {
          cb(send_arry);
        }
      });
    }
  );
};
//update mode

const updateMode = async (line_id, mode, cb) => {
  try {
    const raw = await TempGood.updateMany(
      {
        line_id: line_id,
      },
      {
        $set: {
          machine_mode: mode,
        },
      }
    );
    if (cb) {
      cb(raw);
    } else {
      return raw;
    }
  } catch (err) {
    console.error(err);
    if (cb) {
      cb({ error: err.message });
    } else {
      throw err;
    }
  }
};

//reset lst machine
const resetLastMachineValue = async (line_id, machine_name, batch, cb) => {
  var temp = await TempGood.findOne({
    line_id: line_id,
    machine: machine_name,
  });
  var operator_roster = await indexoperatorid(temp.date, temp.shift, line_id);
  var operator_name = operator_roster._id;
  var shift_good = temp.current_good_value - temp.shift_start_good_count;
  var shift_reject = temp.current_reject_value - temp.shift_start_reject_count;
  var shift_cycle_count =
    temp.current_cycle_count - temp.shift_start_cycle_count;
  updateGoodCount(
    line_id,
    temp.date,
    temp.current_shift,
    temp.currnt_batch,
    temp.vendor,
    machine_name,
    shift_good,
    shift_reject,
    shift_cycle_count,
    async () => {
      temp.shift_start_good_count = temp.current_good_value;
      temp.shift_start_reject_count = temp.current_reject_value;
      temp.shift_start_no_of_case = temp.current_no_of_case;
      temp.shift_start_roll_changeover = temp.current_roll_changeover;
      temp.shift_start_cycle_count = temp.current_cycle_count;
      temp.batch_start_roll_changeover = temp.current_roll_changeover;
      temp.batch_start_no_of_case = temp.current_no_of_case;
      temp.batch_start_good_count = temp.current_good_value;
      temp.batch_start_reject_count = temp.current_reject_value;
      temp.batch_start_cycle_count = temp.current_cycle_count;
      temp.currnt_batch = batch;
      temp.changeover_start_good_count = temp.changeover_start_good_count;
      temp.changeover_start_reject_count = temp.changeover_start_reject_count;
      temp.changeover_start_cycle_count = temp.changeover_start_cycle_count;
      var save = await temp.save();
      cb(save);
    }
  );
};
module.exports.TempGood = TempGood;
module.exports.getTempGood = getTempGood;
module.exports.frequentGoodUpdate = frequentGoodUpdate;
module.exports.preShift = preShift;
module.exports.updateChangeoverMode = updateChangeoverMode;
module.exports.updateCipMode = updateCipMode;
module.exports.updateMode = updateMode;
module.exports.batchChangeProcessSide = batchChangeProcessSide;
module.exports.resetLastMachineValue = resetLastMachineValue;
module.exports.updateVendor = updateVendor;
module.exports.pdtStartInTemp = pdtStartInTemp;
