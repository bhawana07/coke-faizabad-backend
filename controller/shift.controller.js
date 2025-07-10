var express = require("express");
var mongoose = require("mongoose");
var moment = require("moment");
var router = express.Router();
var { CurrentShift, Shift } = require("../model/shift.model");
var { Project } = require("../model/project.model");
var { TempGood } = require("../model/goodTemp.model");
var { Condition } = require("../model/status.model");
var { Batchskutrigger } = require("../model/batch.model");
var { getColour } = require("../model/threshhold.model");
var major_minor_duration = 5;

var last_update = new Date();
var shift_res;
async function add15minCache(line_id, cb) {
  //console.log(new Date() - last_update)
  if (new Date() - last_update <= 15000 && shift_res) {
    cb(shift_res);
  } else {
    var data = await CurrentShift();
    var batch_data = await Batchskutrigger.findOne({ end_time: null }).populate(
      "product_name"
    );
    var shift = data.shift;
    var d = data.date;
    var total_time = data.total_time;
    var tempGood = await TempGood.find({ line_id: line_id });
    var condition = await Condition.find({ line_id: line_id });
    var data = await Project.aggregate([
      {
        $match: {
          line_id:  new mongoose.Types.ObjectId(line_id),
          date: new Date(d),
        },
      },
      { $unwind: "$shift_wise" },
      {
        $match: {
          "shift_wise.shift_name": shift,
        },
      },
      {
        $lookup: {
          from: "operators",
          localField: "shift_wise.operator_name",
          foreignField: "_id",
          as: "operator_name",
        },
      },
      {
        $unwind: {
          path: "$operator_name",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$shift_wise.batch_wise",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "batchskutriggers",
          localField: "shift_wise.batch_wise.batch",
          foreignField: "_id",
          as: "batch",
        },
      },
      {
        $unwind: {
          path: "$batch",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "fgexes",
          localField: "batch.product_name",
          foreignField: "_id",
          as: "fgex",
        },
      },
      {
        $unwind: {
          path: "$fgex",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$shift_wise.batch_wise.machine_wise",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          shift: "$shift_wise.shift_name",
          line_id: "$line_id",
          date: "$date",
          batch: "$batch",
          machine_name: "$shift_wise.batch_wise.machine_wise.machine_name",
          goodCount: "$shift_wise.batch_wise.machine_wise.goodCount",
          reject_count: "$shift_wise.batch_wise.machine_wise.reject_count",
          startup_reject: "$shift_wise.batch_wise.machine_wise.startup_reject",
          fault: {
            $filter: {
              input: "$shift_wise.batch_wise.machine_wise.stop_wise",
              as: "stop",
              cond: { $eq: ["$$stop.stop_name", "fault"] },
            },
          },
          changeover: {
            $filter: {
              input: "$shift_wise.batch_wise.machine_wise.stop_wise",
              as: "stop",
              cond: { $eq: ["$$stop.stop_name", "changeover"] },
            },
          },
          blocked: {
            $filter: {
              input: "$shift_wise.batch_wise.machine_wise.stop_wise",
              as: "stop",
              cond: { $eq: ["$$stop.stop_name", "blocked"] },
            },
          },
          pdt: {
            $filter: {
              input: "$shift_wise.batch_wise.machine_wise.stop_wise",
              as: "stop",
              cond: { $eq: ["$$stop.stop_name", "pdt"] },
            },
          },
          manual_stop: {
            $filter: {
              input: "$shift_wise.batch_wise.machine_wise.stop_wise",
              as: "stop",
              cond: { $eq: ["$$stop.stop_name", "manual_stop"] },
            },
          },
          updt: {
            $filter: {
              input: "$shift_wise.batch_wise.machine_wise.stop_wise",
              as: "stop",
              cond: { $eq: ["$$stop.stop_name", "updt"] },
            },
          },
          waiting: {
            $filter: {
              input: "$shift_wise.batch_wise.machine_wise.stop_wise",
              as: "stop",
              cond: { $eq: ["$$stop.stop_name", "waiting"] },
            },
          },
          not_used: {
            $filter: {
              input: "$shift_wise.batch_wise.machine_wise.stop_wise",
              as: "stop",
              cond: { $eq: ["$$stop.stop_name", "not_used"] },
            },
          },
          ready: {
            $filter: {
              input: "$shift_wise.batch_wise.machine_wise.stop_wise",
              as: "stop",
              cond: { $eq: ["$$stop.stop_name", "ready"] },
            },
          },
          operator_name: {
            $ifNull: ["$operator_name", "Not Defined"],
          },
          batch_start: "$shift_wise.batch_wise.start_timestamp", //{$dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L+05:30", date: "$shift_wise.batch_wise.start_timestamp", timezone: "+05:30" }},//,
          batch_end: {
            $ifNull: ["$shift_wise.batch_wise.end_timestamp", new Date()],
          },
          isCurrent: {
            $cond: [
              { $eq: ["$shift_wise.batch_wise.end_timestamp", null] },
              true,
              false,
            ],
          },
          rated_speed: {
            $ifNull: ["$fgex.rated_speed", 60],
          },
        },
      },
      {
        $unwind: {
          path: "$waiting",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$changeover",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$pdt",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$updt",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$blocked",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$manual_stop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$fault",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$not_used",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$ready",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          shift: 1,
          line_id: 1,
          date: 1,
          rated_speed: 1,
          operator_name: 1,
          isCurrent: 1,
          machine_name: 1,
          goodCount: 1,
          reject_count: 1,
          startup_reject: 1,
          fault: 1,
          blocked: 1,
          waiting: 1,
          batch: 1,
          updt: 1,
          ready: 1,
          pdt: 1,
          not_used: 1,
          changeover: 1,
          manual_stop: 1,
          total_batch_duration: {
            $round: [
              {
                $divide: [
                  {
                    $subtract: ["$batch_end", "$batch_start"],
                  },
                  1000,
                ],
              },
              0,
            ],
          },
        },
      },
    ]);
    // res.send(data)
    //console.log(data)
    var shift_arr = [];
    var send_data = [];
    data.forEach(async (element, i) => {
      if (element.isCurrent) {
        var machine_temp = tempGood.find(
          (data) => data.machine == element.machine_name
        );
        var machine_condition = condition.find(
          (data) => data.machine == element.machine_name
        );
        var current_good_count =
          machine_temp.current_good_value - machine_temp.shift_start_good_count;
        var current_reject_count, startup_reject;
        if (machine_temp.changeover_mode) {
          current_reject_count = 0;
          startup_reject =
            machine_temp.current_reject_value -
            machine_temp.shift_start_reject_count;
        } else {
          current_reject_count =
            machine_temp.current_reject_value -
            machine_temp.shift_start_reject_count;
          startup_reject = 0;
        }
        var current_duration = moment().diff(
          moment(machine_condition.last_update),
          "seconds"
        );
        var current_condition = machine_condition.condition;
        element.goodCount += current_good_count;
        element.reject_count += current_reject_count;
        element.startup_reject += startup_reject;
        var duration_type = checkMajorMinor(current_duration);
        if (machine_condition.condition != "executing") {
          if (machine_condition.condition == "fault") {
            current_condition = "stop";
          }
          //console.log(machine_condition.condition)
          element[machine_condition.condition]["duration"] += current_duration;
          element[machine_condition.condition]["count"] += 1;
          var filter_duration = element[machine_condition.condition][
            "details"
          ].find((data) => data.duration_type == duration_type);
          filter_duration.duration += current_duration;
          filter_duration.count += 1;
          var check_code = filter_duration["duration_details"].find(
            (data) => data.fault_name == machine_condition.code
          );
          var check_index = filter_duration["duration_details"].findIndex(
            (data) => data.fault_name == machine_condition.code
          );
          if (check_code) {
            var check_data = {
              duration: (check_code.duration += current_duration),
              count: (check_code.count += 1),
              fault_name: check_code.fault_name,
            };
            filter_duration["duration_details"][check_index] = check_data;
          } else {
            filter_duration["duration_details"].push({
              duration: current_duration,
              count: 1,
              fault_name: machine_condition.code,
            });
          }
        }
      }
      var shift_data = shift_arr.find(
        (data) => data.machine == element.machine_name
      );
      if (!shift_data) {
        shift_arr.push({
          major_fault: 0,
          major_fault_count: 0,
          minor_fault: 0,
          minor_fault_count: 0,
          goodCount: 0,
          machine: element.machine_name,
          reject_count: 0,
          startup_reject: 0,
          pdt: 0,
          changeover: 0,
          updt: 0,
          ready: 0,
          ready_count: 0,
          major_manual_stop: 0,
          major_manual_stop_count: 0,
          minor_manual_stop: 0,
          minor_manual_stop_count: 0,
          total_batch_time: 0,
          working_time: 0,
          productive_time: 0,
          production_time: 0,
          performance_time: 0,
          net_operating_time: 0,
          idle_time: 0,
          reject_time: 0,
          changeover_wastage_time: 0,
          waiting: 0,
          waiting_count: 0,
          blocked_count: 0,
          blocked: 0,
          batch_wise: [],
          performance: 0,
        });
        shift_data = shift_arr.find(
          (data) => data.machine == element.machine_name
        );
      }
      var major_fault = element.fault.details.find(
        (data) => data.duration_type == "major"
      );
      var minor_fault = element.fault.details.find(
        (data) => data.duration_type == "minor"
      );
      shift_data.major_fault += convertMinute(major_fault.duration);
      shift_data.major_fault_count += major_fault.count;
      shift_data.minor_fault += convertMinute(minor_fault.duration);
      shift_data.minor_fault_count += minor_fault.count;
      //console.log(shift_data.goodCount,element.goodCount)
      shift_data.goodCount += element.goodCount;
      //console.log(shift_data.goodCount,element.goodCount)
      shift_data.machine = element.machine_name;
      shift_data.reject_count += element.reject_count;
      shift_data.startup_reject += element.startup_reject;
      shift_data.pdt += convertMinute(element.pdt.duration);
      shift_data.changeover += convertMinute(element.changeover.duration);
      shift_data.updt += convertMinute(element.updt.duration);
      var major_manual_stop = element.manual_stop.details.find(
        (data) => data.duration_type == "major"
      );
      var minor_manual_stop = element.manual_stop.details.find(
        (data) => data.duration_type == "minor"
      );
      shift_data.major_manual_stop += convertMinute(major_manual_stop.duration);
      shift_data.major_manual_stop_count += major_manual_stop.count;
      shift_data.minor_manual_stop += convertMinute(minor_manual_stop.duration);
      shift_data.minor_manual_stop_count += minor_manual_stop.count;
      var batch_cal = Batchcalculation(
        element.goodCount,
        element.reject_count,
        element.total_batch_duration,
        element.pdt.duration,
        element.changeover.duration,
        element.updt.duration,
        major_fault.duration,
        major_fault.count,
        minor_fault.duration,
        major_manual_stop.duration,
        minor_manual_stop.duration,
        element.blocked.duration,
        element.waiting.duration,
        element.rated_speed,
        element.startup_reject,
        element.ready.duration
      );
      shift_data.batch_wise.push(batch_cal);
      shift_data.waiting += convertMinute(element.waiting.duration);
      shift_data.blocked += convertMinute(element.blocked.duration);
      shift_data.waiting_count += element.waiting.count;
      shift_data.blocked_count += element.blocked.count;
      shift_data.ready_count += element.ready.count;
      shift_data.ready += element.ready.duration;
      shift_data.total_batch_time += batch_cal.total_time;
      shift_data.working_time += batch_cal.working_time;
      shift_data.production_time += batch_cal.production_time;
      shift_data.performance_time += batch_cal.performance_time;
      shift_data.net_operating_time += batch_cal.net_operating_time;
      shift_data.idle_time += batch_cal.idle_time;
      shift_data.reject_time += batch_cal.reject_time;
      shift_data.changeover_wastage_time += batch_cal.changeover_wastage_time;
      shift_data.productive_time += batch_cal.productive_time;
      shift_data.shift_name = shift;
      if (i + 1 == data.length) {
        //console.log(shift_data)
        shift_arr.forEach(async (shift, i) => {
          var cal = calculation(
            shift.total_batch_time,
            shift.working_time,
            shift.production_time,
            shift.performance_time,
            shift.net_operating_time,
            shift.idle_time,
            shift.reject_time,
            shift.changeover_wastage_time,
            shift.productive_time
          );
          var mtbf = MttrValidation(
            shift.working_time / shift.major_fault_count
          );
          var avg_speed = MttrValidation(
            (shift.goodCount + shift.reject_count) /
              (shift.production_time - shift.idle_time)
          );
          avg_speed = Math.round(avg_speed * 60);
          var mttr = MttrValidation(
            shift.major_fault / shift.major_fault_count
          );
          var compare_obj = {
            oee: Number((cal.oee * 100).toFixed(2)),
            performance: Number((cal.performance * 100).toFixed(2)),
            aviability: Number((cal.aviability * 100).toFixed(2)),
            quality: Number((cal.quality * 100).toFixed(2)),
            goodCount: shift.goodCount,
            reject_count: shift.reject_count,
            major_fault_count: shift.major_stop_count,
            changeover_wastage: element.startup_reject,
            major_fault_count: shift.major_fault_count,
            totalTheoreticalTime: shift_data.total_batch_time,
            minspeed: batch_data.product_name.blister_min,
            rated_speed: element.rated_speed,
            average_speed: avg_speed,
            current_speed:
              machine_temp.bpm * batch_data.product_name.blister_per_format,
          };
          send_data.push({
            oee: await getColour(
              compare_obj,
              shift.machine,
              "",
              "oee",
              (cal.oee * 100).toFixed(2),
              " %"
            ),
            performance: await getColour(
              compare_obj,
              shift.machine,
              "",
              "performance",
              (cal.performance * 100).toFixed(2),
              " %"
            ),
            aviability: await getColour(
              compare_obj,
              shift.machine,
              "",
              "aviability",
              (cal.aviability * 100).toFixed(2),
              " %"
            ),
            quality: await getColour(
              compare_obj,
              shift.machine,
              "",
              "quality",
              (cal.quality * 100).toFixed(2),
              " %"
            ),
            shift_fault: shift.major_fault,
            shift_fault_count: shift.major_fault_count,
            shift_updt: shift.updt,
            goodCount: shift.goodCount,
            changeover: shift.changeover,
            major_stop: shift.major_stop,
            major_stop_count: await getColour(
              compare_obj,
              shift.machine,
              "",
              "major_fault_count",
              shift.major_fault_count,
              ""
            ),
            minor_fault: shift.minor_fault,
            minor_fault_count: shift.minor_fault_count,
            operator_name: element.operator_name,
            condition: current_condition,
            avg_speed: await getColour(
              compare_obj,
              shift.machine,
              "",
              "average_speed",
              avg_speed,
              ""
            ),
            ready: shift.ready,
            reject_count: shift.reject_count,
            current_timeStamp: moment().local().format(),
            shift_mtbf: mtbf.toFixed(2),
            shift: shift.shift_name,
            shift_changeover_wastage: shift_data.startup_reject,
            date: d,
            machine: shift.machine,
            shift_mttr: mttr.toFixed(2),
            shift_speed_loss: cal.speed_loss,
            shift_idel_time:
              shift.minor_manual_stop_count +
              shift.blocked_count +
              shift.waiting_count +
              shift.minor_fault_count +
              shift.ready_count +
              " / " +
              cal.idle_time,
            shift_totalTheoreticalTime: cal.total_time,
            shift_totalPlanProdTime: cal.working_time,
            shift_netOperatingTime: cal.net_operating_time,
            shift_grossOperatingTime: cal.production_time,
            batch_wise: data,
            batch_wise_cal: shift_data.batch_wise,
            shift_inProcessRejectTime: cal.reject_time,
            shift_changeOverWastageTime: cal.changeover_wastage_time,
            shift_productiveTime: cal.productive_time,
          });
          if (i + 1 == shift_arr.length) {
            shift_res = send_data;
            last_update = new Date();
            cb(send_data);
          }
        });
        //res.send(shift_data)
      }
    });
  }
}

router.get("/shift/all", async (req, res) => {
  var line_id = req.query.line_id;
  add15minCache(line_id, (data) => {
    res.send(data);
  });
});
//pre_shift_Calcuation
router.get('/preshiftcalculation',async(req,res)=>{
  var shift = await Shift.find({});
  var current = shift.find((data)=>data.position == 'current');
  var pre_shift = shift.find((data)=>data.position == 'pre_shift');
  var pre_pre_shift = shift.find((data)=>data.position == 'pre_pre_shift');
  var current_return = startEndData(current.shiftStartTime,current.shiftEndTime,current.date,current.shiftName)
  var pre_return = startEndData(pre_shift.shiftStartTime,pre_shift.shiftEndTime,pre_shift.date,pre_shift.shiftName)
  var pre_pre_return = startEndData(pre_pre_shift.shiftStartTime,pre_pre_shift.shiftEndTime,pre_pre_shift.date,pre_pre_shift.shiftName)
  res.send({
    current_shift:{
      CurrentShift:current_return.shift,
      shift:current_return.shift,
      date:current_return.date,
      current_timeStamp:moment().local().format(),
      shiftStartTime:current_return.shiftStartTime,
      shiftEndTime:current_return.shiftEndTime
    },
    pre_shift: {
      shift:pre_return.shift,
      date:pre_return.date,
      //current_timeStamp:moment().local().format(),
      shiftStartTime:pre_return.shiftStartTime,
      shiftEndTime:pre_return.shiftEndTime
    },
    pre_pre_shift: {
      shift:pre_pre_return.shift,
      date:pre_pre_return.date,
      //current_timeStamp:moment().local().format(),
      shiftStartTime:pre_pre_return.shiftStartTime,
      shiftEndTime:pre_pre_return.shiftEndTime
    }
  })
})
//calculation function
function calculation(
  total_batch_time,
  working_time,
  production_time,
  performance_time,
  net_operating_time,
  idle_time,
  reject_time,
  changeover_wastage_time,
  productive_time
) {
  var data = {};
  var speed_loss = performance_time - idle_time;
  if (speed_loss < 70) {
    speed_loss = 0;
  }
  data.performance = checkValidation(net_operating_time / production_time);
  data.quality = checkValidation(productive_time / net_operating_time);
  data.aviability = checkValidation(production_time / working_time);
  data.idle_time = convertHHMM(idle_time);
  data.working_time = convertHHMM(working_time);
  data.speed_loss = convertHHMM(Math.floor(speed_loss));
  data.performance_time = convertHHMM(Math.floor(performance_time));
  data.oee = data.quality * data.aviability * data.performance;
  //data.mtbf = convertHHMM(MttrValidation(Math.round(working_time / major_fault_count)));
  //data.mttr = convertHHMM(MttrValidation(Math.round(major_fault / major_fault_count)));
  data.production_time = convertHHMM(Math.round(production_time));
  data.total_time = convertHHMM(total_batch_time);
  data.reject_time = convertHHMM(reject_time);
  data.changeover_wastage_time = convertHHMM(changeover_wastage_time);
  data.net_operating_time = convertHHMM(Math.floor(net_operating_time));
  data.productive_time = convertHHMM(Math.floor(productive_time));
  return data;
}
//batch wise calculation
function Batchcalculation(
  goodCount,
  reject_count,
  total_batch_time,
  pdt,
  changeover,
  updt,
  major_fault,
  major_fault_count,
  minor_fault,
  major_manual_stop,
  minor_manual_stop,
  blocked,
  waiting,
  rated_speed,
  changeover_reject,
  ready
) {
  //console.log(goodCount, reject_count, total_batch_time, pdt, changeover, updt, major_fault, major_fault_count,minor_fault,major_manual_stop,minor_manual_stop,blocked,waiting, rated_speed,changeover_reject,ready)
  rated_speed /= 60; //to convert in second
  var data = {};
  var total_count = goodCount + reject_count;
  var working_time = total_batch_time - pdt - updt;
  var production_time =
    working_time - major_fault - major_manual_stop - changeover;
  if (production_time < 70) {
    production_time = 0;
  }
  var performance_time = production_time - total_count / rated_speed;
  var reject_time = Math.floor(reject_count / rated_speed);
  var changeover_wastage_time = Math.floor(changeover_reject / rated_speed);
  var idle_time = blocked + waiting + minor_manual_stop + minor_fault + ready;
  //console.log(performance_time)
  var speed_loss = performance_time - idle_time;
  // if(speed_loss < 70){
  //   speed_loss = 0
  // }
  var net_operating_time = production_time - idle_time - speed_loss;
  if (net_operating_time < 70) {
    net_operating_time = 0;
  }
  var productive_time = net_operating_time - reject_time; //- changeover_wastage_time;
  if (productive_time < 70) {
    productive_time = 0;
  }
  data.performance = checkValidation(net_operating_time / production_time);
  data.quality = checkValidation(productive_time / net_operating_time);
  data.aviability = checkValidation(production_time / working_time);
  data.idle_time = idle_time;
  data.working_time = working_time;
  data.speed_loss = Math.floor(speed_loss);
  data.performance_time = Math.floor(performance_time);
  data.oee = data.quality * data.aviability * data.performance;
  data.mtbf = convertHHMM(
    MttrValidation(Math.round(working_time / major_fault_count))
  );
  data.mttr = convertHHMM(
    MttrValidation(Math.round(major_fault / major_fault_count))
  );
  data.production_time = Math.floor(production_time);
  data.total_time = total_batch_time;
  data.reject_time = reject_time;
  data.changeover_wastage_time = changeover_wastage_time;
  data.net_operating_time = Math.floor(net_operating_time);
  data.productive_time = Math.floor(productive_time);
  return data;
}

function checkValidation(value) {
  if (value < 0 || value === Infinity || !value) {
    return 0;
  } else if (value > 1) {
    return 1;
  } else {
    return value;
  }
}
function convertHHMM(totalSeconds) {
  var init = totalSeconds;
  h = Math.floor(Math.abs(totalSeconds) / 3600);
  totalSeconds = Math.abs(totalSeconds) % 3600;
  m = Math.floor(totalSeconds / 60);
  s = totalSeconds % 60;
  if (init < 0) {
    return (
      "-(" + checkNumber(h) + ":" + checkNumber(m) + ":" + checkNumber(s) + ")"
    );
  } else {
    return checkNumber(h) + ":" + checkNumber(m) + ":" + checkNumber(s);
  }
}
function convertMinute(seconds) {
  return Math.round(seconds / 60);
}

//function check major minor
function checkMajorMinor(duration) {
  if (duration > major_minor_duration * 60) {
    return "major";
  } else {
    return "minor";
  }
}

function MttrValidation(value) {
  if (value < 0 || value === Infinity || !value) {
    return 0;
  } else {
    return value;
  }
}

function avgSpeedValidation(value) {
  if (value < 0) {
    return "N/A";
  } else {
    return value;
  }
}

function startEndData(start_time, end_time, date, shift) {
  var shiftStartTime, shiftEndTime, date;
  shiftStartTime =
    moment(date).utc().format("YYYY-MM-DDT") +
    checkNumber(Math.floor(start_time / 60)) +
    ":" +
    checkNumber(start_time % 60) +
    ":00";
  if (start_time > end_time) {
    shiftEndTime =
      moment(date).utc().add(1, "days").format("YYYY-MM-DDT") +
      checkNumber(Math.floor(end_time / 60)) +
      ":" +
      checkNumber(end_time % 60) +
      ":00";
  } else {
    shiftEndTime =
      moment(date).utc().format("YYYY-MM-DDT") +
      checkNumber(Math.floor(end_time / 60)) +
      ":" +
      checkNumber(end_time % 60) +
      ":00";
  }
  return {
    shiftStartTime: shiftStartTime,
    shiftEndTime: shiftEndTime,
    date: date,
    shift: shift,
  };
}
function checkNumber(number) {
  if (number < 10) {
    return `0${number}`;
  } else {
    return number;
  }
}
module.exports = router;
