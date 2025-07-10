var express = require("express");
var mongoose = require("mongoose");
var moment = require("moment");
var router = express.Router();
var { CurrentShift } = require("../model/shift.model");
var { Project } = require("../model/project.model");
var { TempGood } = require("../model/goodTemp.model");
var { Condition } = require("../model/status.model");
var { Batchskutrigger } = require("../model/batch.model");
var { changeOver } = require("../model/changeover.model");
var { addLine } = require("../model/addLine.model");
var fault_obj = require("../fault.json");
var major_minor_duration = 5;
var last_update = new Date();
var shift_res;
async function add15minCache(line_id, cb) {
  //console.log(new Date() - last_update)
  if (new Date() - last_update <= 15000 && shift_res) {
    //console.log("From sku 15 min ")
    cb(shift_res);
  } else {
    //console.log(line_id )
    // var batch_data = await Batchskutrigger.findOne({ line_id:line_id,end_time: null }).populate(
    //   "product_name"
    // );
    // //console.log(batch_data);
    // var batch = batch_data._id;
     //var end = moment(d).format("YYYY-MM-DD");
    // var start = moment(batch_data.start_date).format("YYYY-MM-DD");
    // var total_time = data.total_time;
    // var tempGood = await TempGood.find({ line_id: line_id });
    // var condition = await Condition.find({ line_id: line_id });
    // var changover_data = await changeOver.findOne({ line_id: line_id, batch_name: batch_data.batch }).populate("changeover_type_id");
    // var changover_standard_duration =
    //   changover_data.changeover_type_id.standard_duration * 60;
    //console.log(batch_data.start_time,d,new Date(batch_data.start_time) > new Date(d))
    var data = await addLine.aggregate([    
        
      { $unwind: "$machine_wise" },
      {
        $lookup: {
          from: "tempgoods",
          let: { line_id: "$line_id", machine_name: "$machine_wise.machine_name" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                     {
                       $eq:["$line_id","$$line_id"]
                     },
                     {
                      $eq:["$machine","$$machine_name"]
                    },
                  ]
                }
              }
            },
          ],
          as: "temp"
        }
      },
      {
        $unwind: {
          path: "$temp",
          preserveNullAndEmptyArrays: true,
        },
      },
      // {
      //   $match: {
      //     line_id:  new mongoose.Types.ObjectId(line_id),
      //     $and: [
      //       {
      //         date: {
      //           $lte: new Date(end),
      //         },
      //       },
      //       {
      //         date: {
      //           $gte: new Date(start),
      //         },
      //       },
      //     ],
      //   },
      // },
      // { $unwind: "$shift_wise" },
      // {
      //   $lookup: {
      //     from: "operators",
      //     localField: "shift_wise.operator_name",
      //     foreignField: "_id",
      //     as: "operator_name",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$operator_name",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$shift_wise.batch_wise",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $match: {
      //     "shift_wise.batch_wise.batch": mongoose.Types.ObjectId(batch),
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$shift_wise.batch_wise.machine_wise",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $project: {
      //     line_id: "$line_id",
      //     shift: "$shift_wise.shift_name",
      //     machine_name: "$shift_wise.batch_wise.machine_wise.machine_name",
      //     goodCount: "$shift_wise.batch_wise.machine_wise.goodCount",
      //     reject_count: "$shift_wise.batch_wise.machine_wise.reject_count",
      //     startup_reject: "$shift_wise.batch_wise.machine_wise.startup_reject",
      //     fault: {
      //       $filter: {
      //         input: "$shift_wise.batch_wise.machine_wise.stop_wise",
      //         as: "stop",
      //         cond: { $eq: ["$$stop.stop_name", "fault"] },
      //       },
      //     },
      //     date: "$date",
      //     changeover: {
      //       $filter: {
      //         input: "$shift_wise.batch_wise.machine_wise.stop_wise",
      //         as: "stop",
      //         cond: { $eq: ["$$stop.stop_name", "changeover"] },
      //       },
      //     },
      //     blocked: {
      //       $filter: {
      //         input: "$shift_wise.batch_wise.machine_wise.stop_wise",
      //         as: "stop",
      //         cond: { $eq: ["$$stop.stop_name", "blocked"] },
      //       },
      //     },
      //     pdt: {
      //       $filter: {
      //         input: "$shift_wise.batch_wise.machine_wise.stop_wise",
      //         as: "stop",
      //         cond: { $eq: ["$$stop.stop_name", "pdt"] },
      //       },
      //     },
      //     manual_stop: {
      //       $filter: {
      //         input: "$shift_wise.batch_wise.machine_wise.stop_wise",
      //         as: "stop",
      //         cond: { $eq: ["$$stop.stop_name", "manual_stop"] },
      //       },
      //     },
      //     updt: {
      //       $filter: {
      //         input: "$shift_wise.batch_wise.machine_wise.stop_wise",
      //         as: "stop",
      //         cond: { $eq: ["$$stop.stop_name", "updt"] },
      //       },
      //     },
      //     waiting: {
      //       $filter: {
      //         input: "$shift_wise.batch_wise.machine_wise.stop_wise",
      //         as: "stop",
      //         cond: { $eq: ["$$stop.stop_name", "waiting"] },
      //       },
      //     },
      //     ready: {
      //       $filter: {
      //         input: "$shift_wise.batch_wise.machine_wise.stop_wise",
      //         as: "stop",
      //         cond: { $eq: ["$$stop.stop_name", "ready"] },
      //       },
      //     },
      //     operator_name: {
      //       $ifNull: ["$operator_name", "Not Defined"],
      //     },
      //     batch_start: "$shift_wise.batch_wise.start_timestamp",
      //     batch_end: {
      //       $ifNull: ["$shift_wise.batch_wise.end_timestamp", new Date()],
      //     },
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$waiting",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$changeover",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$pdt",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$updt",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$blocked",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$manual_stop",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$fault",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$ready",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $project: {
      //     line_id: 1,
      //     rated_speed: 1,
      //     isCurrent: 1,
      //     machine_name: 1,
      //     goodCount: 1,
      //     reject_count: 1,
      //     operator_name: 1,
      //     date: 1,
      //     shift: 1,
      //     fault: 1,
      //     blocked: 1,
      //     waiting: 1,
      //     updt: 1,
      //     ready: 1,
      //     startup_reject: 1,
      //     pdt: 1,
      //     changeover: 1,
      //     manual_stop: 1,
      //     major_fault: {
      //       $filter: {
      //         input: "$fault.details",
      //         as: "stop",
      //         cond: { $eq: ["$$stop.duration_type", "major"] },
      //       },
      //     },
      //     minor_fault: {
      //       $filter: {
      //         input: "$fault.details",
      //         as: "stop",
      //         cond: { $eq: ["$$stop.duration_type", "minor"] },
      //       },
      //     },
      //     major_manual_stop: {
      //       $filter: {
      //         input: "$manual_stop.details",
      //         as: "stop",
      //         cond: { $eq: ["$$stop.duration_type", "major"] },
      //       },
      //     },
      //     minor_manual_stop: {
      //       $filter: {
      //         input: "$manual_stop.details",
      //         as: "stop",
      //         cond: { $eq: ["$$stop.duration_type", "minor"] },
      //       },
      //     },
      //     total_batch_duration: {
      //       $round: [
      //         {
      //           $divide: [
      //             {
      //               $subtract: ["$batch_end", "$batch_start"],
      //             },
      //             1000 * 60,
      //           ],
      //         },
      //         0,
      //       ],
      //     },
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$major_manual_stop",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$minor_manual_stop",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$major_fault",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$minor_fault",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $group: {
      //     _id: {
      //       shift: "$shift",
      //       date: "$date",
      //       machine_name: "$machine_name",
      //       operator_name: "$operator_name",
      //     },
      //     goodCount: { $sum: "$goodCount" },
      //     reject_count: { $sum: "$reject_count" },
      //     startup_reject: { $sum: "$startup_reject" },
      //     blocked: { $sum: "$blocked.duration" },
      //     blocked_count: { $sum: "$blocked.count" },
      //     waiting: { $sum: "$waiting.duration" },
      //     waiting_count: { $sum: "$waiting.count" },
      //     major_manual_stop: { $sum: "$major_manual_stop.duration" },
      //     major_manual_stop_count: { $sum: "$major_manual_stop.count" },
      //     minor_manual_stop: { $sum: "$minor_manual_stop.duration" },
      //     minor_manual_stop_count: { $sum: "$minor_manual_stop.count" },
      //     pdt: { $sum: "$pdt.duration" },
      //     pdt_count: { $sum: "$pdt.count" },
      //     updt: { $sum: "$updt.duration" },
      //     updt_count: { $sum: "$updt.count" },
      //     ready: { $sum: "$ready.duration" },
      //     ready_count: { $sum: "$ready.count" },
      //     changeover: { $sum: "$changeover.duration" },
      //     changeover_count: { $sum: "$changeover.count" },
      //     major_fault: { $sum: "$major_fault.duration" },
      //     major_fault_count: { $sum: "$major_fault.count" },
      //     minor_fault: { $sum: "$minor_fault.duration" },
      //     minor_fault_count: { $sum: "$minor_fault.count" },
      //     total_batch_duration: { $sum: "$total_batch_duration" },
      //     fault_arr: {
      //       $push: "$major_fault.duration_details",
      //     },
      //   },
      // },
      // {
      //   $group: {
      //     _id: "$_id.date",
      //     shift: {
      //       $push: {
      //         shift: "$_id.shift",
      //         machine_name: "$_id.machine_name",
      //         operator_name: "$_id.operator_name",
      //         fault_arr: "$fault_arr",
      //         goodCount: "$goodCount",
      //         reject_count: "$reject_count",
      //         startup_reject: "$startup_reject",
      //         blocked: "$blocked",
      //         blocked_count: "$blocked_count",
      //         waiting: "$waiting",
      //         waiting_count: "$waiting_count",
      //         manual_stop: "$manual_stop",
      //         manual_stop_count: "$manual_stop_count",
      //         pdt: "$pdt",
      //         pdt_count: "$pdt_count",
      //         updt: "$updt",
      //         updt_count: "$updt_count",
      //         ready: "$ready",
      //         ready_count: "$ready_count",
      //         changeover: "$changeover",
      //         changeover_count: "$changeover_count",
      //         major_fault: "$major_fault",
      //         major_fault_count: "$major_fault_count",
      //         minor_fault: "$minor_fault",
      //         minor_fault_count: "$minor_fault_count",
      //         major_manual_stop: "$major_manual_stop",
      //         major_manual_stop_count: "$major_manual_stop_count",
      //         minor_manual_stop: "$minor_manual_stop",
      //         minor_manual_stop_count: "$minor_manual_stop_count",
      //         total_batch_duration: "$total_batch_duration",
      //       },
      //     },
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$shift",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $group: {
      //     _id: "$shift.machine_name",
      //     goodCount: { $sum: "$shift.goodCount" },
      //     reject_count: { $sum: "$shift.reject_count" },
      //     startup_reject: { $sum: "$shift.startup_reject" },
      //     blocked: { $sum: "$shift.blocked" },
      //     blocked_count: { $sum: "$shift.blocked_count" },
      //     waiting: { $sum: "$shift.waiting" },
      //     waiting_count: { $sum: "$shift.waiting_count" },
      //     manual_stop: { $sum: "$shift.manual_stop" },
      //     manual_stop_count: { $sum: "$shift.manual_stop_count" },
      //     pdt: { $sum: "$shift.pdt" },
      //     pdt_count: { $sum: "$shift.pdt_count" },
      //     changeover: { $sum: "$shift.changeover" },
      //     changeover_count: { $sum: "$shift.changeover_count" },
      //     updt: { $sum: "$shift.updt" },
      //     updt_count: { $sum: "$shift.updt_count" },
      //     ready: { $sum: "$shift.ready" },
      //     ready_count: { $sum: "$shift.ready_count" },
      //     major_manual_stop: { $sum: "$shift.major_manual_stop" },
      //     major_manual_stop_count: { $sum: "$shift.major_manual_stop_count" },
      //     minor_manual_stop: { $sum: "$shift.minor_manual_stop" },
      //     minor_manual_stop_count: { $sum: "$shift.minor_manual_stop_count" },
      //     major_fault: { $sum: "$shift.major_fault" },
      //     major_fault_count: { $sum: "$shift.major_fault_count" },
      //     minor_fault: { $sum: "$shift.minor_fault" },
      //     minor_fault_count: { $sum: "$shift.minor_fault_count" },
      //     total_batch_duration: { $sum: "$shift.total_batch_duration" },
      //     fault_arr: {
      //       $push: "$shift.fault_arr",
      //     },
      //     shift_wise: {
      //       $push: {
      //         shift: "$shift.shift",
      //         goodCount: "$shift.goodCount",
      //         date: "$_id",
      //         reject_count: "$shift.reject_count",
      //         operator_name: "$shift.operator_name",
      //       },
      //     },
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$fault_arr",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$fault_arr",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$fault_arr",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // // {
      // //   $match: {
      // //     fault_arr: {
      // //       $ne: null,
      // //     },
      // //   },
      // // },
      // {
      //   $project: {
      //     _id: 1,
      //     goodCount: 1,
      //     reject_count: 1,
      //     startup_reject: 1,
      //     shift_wise: 1,
      //     blocked: 1,
      //     blocked_count: 1,
      //     waiting: 1,
      //     waiting_count: 1,
      //     major_manual_stop: 1,
      //     major_manual_stop_count: 1,
      //     minor_manual_stop: 1,
      //     minor_manual_stop_count: 1,
      //     pdt: 1,
      //     pdt_count: 1,
      //     updt: 1,
      //     updt_count: 1,
      //     ready: 1,
      //     ready_count: 1,
      //     changeover: 1,
      //     changeover_count: 1,
      //     major_fault: 1,
      //     major_fault_count: 1,
      //     minor_fault: 1,
      //     minor_fault_count: 1,
      //     total_batch_duration: 1,
      //     fault_arr: 1,
      //   },
      // },
      // {
      //   $group: {
      //     _id: {
      //       machine_name: "$_id",
      //       fault_name: "$fault_arr.fault_name",
      //     },
      //     duration: { $sum: "$fault_arr.duration" },
      //     count: { $sum: "$fault_arr.count" },
      //     parent_arr: {
      //       $push: {
      //         goodCount: "$goodCount",
      //         reject_count: "$reject_count",
      //         startup_reject: "$startup_reject",
      //         blocked: "$blocked",
      //         blocked_count: "$blocked_count",
      //         waiting: "$waiting",
      //         waiting_count: "$waiting_count",
      //         pdt: "$pdt",
      //         pdt_count: "$pdt_count",
      //         updt: "$updt",
      //         updt_count: "$updt_count",
      //         ready: "$ready",
      //         ready_count: "$ready_count",
      //         changeover: "$changeover",
      //         changeover_count: "$changeover_count",
      //         major_fault: "$major_fault",
      //         major_fault_count: "$major_fault_count",
      //         minor_fault: "$minor_fault",
      //         minor_fault_count: "$minor_fault_count",
      //         major_manual_stop: "$major_manual_stop",
      //         major_manual_stop_count: "$major_manual_stop_count",
      //         minor_manual_stop: "$minor_manual_stop",
      //         minor_manual_stop_count: "$minor_manual_stop_count",
      //         total_batch_duration: "$total_batch_duration",
      //         shift_wise: "$shift_wise",
      //       },
      //     },
      //   },
      // },
      // {
      //   $group: {
      //     _id: "$_id.machine_name",
      //     fault_arr: {
      //       $push: {
      //         fault_name: "$_id.fault_name",
      //         duration: "$duration",
      //         count: "$count",
      //       },
      //     },
      //     parent_arr: { $addToSet: "$parent_arr" },
      //   },
      // },
      // {
      //   $project: {
      //     machine_name: "$_id",
      //     fault_arr: "$fault_arr",
      //     parent_arr: { $arrayElemAt: ["$parent_arr", 0] },
      //   },
      // },
      // {
      //   $project: {
      //     machine_name: "$_id",
      //     fault_arr: "$fault_arr",
      //     parent_arr: { $arrayElemAt: ["$parent_arr", 0] },
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$parent_arr",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $project: {
      //     machine_name: 1,
      //     fault_arr: 1,
      //     goodCount: "$parent_arr.goodCount",
      //     reject_count: "$parent_arr.reject_count",
      //     startup_reject: "$parent_arr.startup_reject",
      //     blocked: "$parent_arr.blocked",
      //     blocked_count: "$parent_arr.blocked_count",
      //     waiting: "$parent_arr.waiting",
      //     waiting_count: "$parent_arr.waiting_count",
      //     pdt: "$parent_arr.pdt",
      //     pdt_count: "$parent_arr.pdt_count",
      //     updt: "$parent_arr.updt",
      //     updt_count: "$parent_arr.updt_count",
      //     ready: "$parent_arr.ready",
      //     ready_count: "$parent_arr.ready_count",
      //     changeover: "$parent_arr.changeover",
      //     major_fault: "$parent_arr.major_fault",
      //     major_fault_count: "$parent_arr.major_fault_count",
      //     minor_fault: "$parent_arr.minor_fault",
      //     minor_fault_count: "$parent_arr.minor_fault_count",
      //     major_manual_stop: "$parent_arr.major_manual_stop",
      //     major_manual_stop_count: "$parent_arr.major_manual_stop_count",
      //     minor_manual_stop: "$parent_arr.minor_manual_stop",
      //     minor_manual_stop_count: "$parent_arr.minor_manual_stop_count",
      //     total_batch_duration: "$parent_arr.total_batch_duration",
      //   },
      // },
    ]);
    // var mode_json = {
    //   executing: "Running",
    //   ready: "Idle",
    //   waiting: "Waiting",
    //   blocked: "Blocked",
    //   stop: "Fault",
    //   pdt: "Plant Down Time",
    //   manual_stop: "Manual Stop",
    //   updt: "Power Off",
    //   changeover: "Changeover",
    // };
    // var send_arr = [];
     cb(data)
    // data.forEach((element, i) => {
    //   send_data = {};
    //   var machine_temp = tempGood.find((data) => data.machine == element._id);
    //   var machine_condition = condition.find(
    //     (data) => data.machine == element._id
    //   );
    //   var current_good_count = machine_temp.current_good_value - machine_temp.shift_start_good_count;
    //   var cycle_count = machine_temp.current_cycle_count - machine_temp.shift_start_cycle_count;
    //   var case_count = (machine_temp.current_no_of_case - machine_temp.batch_start_no_of_case) * batch_data.product_name.No_of_blisters;
    //   var current_reject_count, startup_reject;
    //   if (machine_temp.changeover_mode) {
    //     current_reject_count = 0;
    //     startup_reject =
    //       machine_temp.current_reject_value -
    //       machine_temp.shift_start_reject_count;
    //   } else {
    //     current_reject_count =
    //       machine_temp.current_reject_value -
    //       machine_temp.shift_start_reject_count;
    //     startup_reject = 0;
    //   }

    //   element.goodCount += current_good_count;
    //   element.reject_count += current_reject_count;
    //   element.startup_reject += startup_reject;
    //   var current_condition = machine_condition.condition;
    //   var current_duration = moment().diff(
    //     moment(machine_condition.last_update),
    //     "seconds"
    //   );
    //   var duration_type = checkMajorMinor(current_duration);
    //   if (machine_condition.condition == "fault") {
    //     current_condition = "stop";
    //     if (duration_type == "major") {
    //       element["major_fault"] += current_duration;
    //       element["major_fault_count"] += 1;
    //       var check_code = element.fault_arr.find(
    //         (data) => data.fault_name == machine_condition.code
    //       );
    //       var check_index = element.fault_arr.findIndex(
    //         (data) => data.fault_name == machine_condition.code
    //       );
    //       if (check_code) {
    //         var check_data = {
    //           duration: check_code.duration + current_duration,
    //           count: check_code.count + 1,
    //           fault_name: check_code.fault_name,
    //         };
    //         element.fault_arr[check_index] = check_data;
    //       } else {
    //         element.fault_arr.push({
    //           duration: current_duration,
    //           count: 1,
    //           fault_name: machine_condition.code,
    //         });
    //       }
    //     } else {
    //       element["minor_fault"] += current_duration;
    //       element["minor_fault_count"] += 1;
    //     }
    //   } else if (machine_condition.condition == "manual_stop") {
    //     element[duration_type + "_manual_stop"] += current_duration;
    //     element[duration_type + "manual_stop_count"] += 1;
    //   } else {
    //     if (machine_condition.condition != "executing") {
    //       element[machine_condition.condition] += current_duration;
    //       element[machine_condition.condition + "_count"] += 1;
    //     }
    //   }
    //   var sort_arr = [];
    //   if (element.fault_arr) {
    //     sort_arr = element.fault_arr.sort((a, b) => {
    //       return b.duration - a.duration;
    //     });
    //   }
    //   if (element.changeover < changover_standard_duration) {
    //     element.pdt += element.changeover;
    //     element.changeover = 0;
    //     element.pdt_count += 1;
    //   } else {
    //     var extra_duration = element.changeover - changover_standard_duration;
    //     element.pdt += changover_standard_duration;
    //     element.pdt_count += 1;
    //     element.changeover = extra_duration;
    //   }
    //   var cal_data = calculation(
    //     element.goodCount,
    //     element.reject_count,
    //     element.total_batch_duration,
    //     element.pdt,
    //     element.changeover,
    //     element.updt,
    //     element.major_fault,
    //     element.major_fault_count,
    //     element.minor_fault,
    //     element.major_manual_stop,
    //     element.minor_manual_stop,
    //     element.blocked,
    //     element.waiting,
    //     batch_data.product_name.rated_speed,
    //     element.startup_reject,
    //     element.ready
    //   );
    //   send_data["fault_1"] = "-";
    //   send_data["fault_2"] = "-";
    //   send_data["fault_3"] = "-";
    //   send_data["fault_4"] = "-";
    //   send_data["fault_5"] = "-";
    //   send_data["fault"] = `${element.major_fault_count} / ${convertHHMM(
    //     element.major_fault
    //   )}`;
    //   send_data["batch"] = batch_data.batch;
    //   //send_data['format_obj'] = batch_data.format;
    //   //send_data['product_obj'] = batch_data.product_name;
    //   send_data["target_quantity"] =
    //     360 *
    //     batch_data.product_name.tablet_per_blister *
    //     batch_data.product_name.blister_per_format *
    //     batch_data.product_name.machine_cycle;
    //   send_data["batch_size"] = batch_data.batch_size;
    //   send_data["changeover_wastage"] = element.startup_reject;
    //   send_data["product"] = batch_data.product_name.product_name;
    //   send_data["fgex_details"] =
    //     batch_data.product_name.fgex +
    //     " / " +
    //     batch_data.product_name.rated_speed +
    //     " / " +
    //     cycle_count;
    //   send_data["fgex"] = batch_data.product_name.fgex;
    //   send_data["product_id"] = batch_data.product_name;
    //   send_data["total_count"] = element.goodCount + element.reject_count;
    //   send_data["batch_good_count"] = element.goodCount;
    //   send_data["batch_reject_count"] = element.reject_count;
    //   send_data["waiting"] = `${element.waiting_count} / ${convertHHMM(
    //     element.waiting
    //   )}`;
    //   send_data["count"] = `${element.goodCount} / ${element.reject_count}`;
    //   send_data["blocked"] = `${element.blocked_count} / ${convertHHMM(
    //     element.blocked
    //   )}`;
    //   send_data["changeover_time"] = `${convertHHMM(element.changeover)}`;
    //   send_data["ready"] = `${convertHHMM(element.ready)}`;
    //   send_data["batch_manual_stop"] = `${
    //     element.major_manual_stop_count
    //   } / ${convertHHMM(element.major_manual_stop)}`;
    //   send_data["batch_minor_manual_stop"] = `${
    //     element.minor_manual_stop_count
    //   } / ${convertHHMM(element.minor_manual_stop)}`;
    //   send_data["minor_fault"] = `${element.minor_fault_count} / ${convertHHMM(
    //     element.minor_fault
    //   )}`;
    //   send_data["batch_start_time"] = moment(batch_data.start_time).format(
    //     "DD-MM-YYYY - HH:mm:ss"
    //   );
    //   send_data["pdt"] = `${element.pdt_count} / ${convertHHMM(element.pdt)}`;
    //   send_data["shift"] = shift;
    //   send_data["updt"] = `${element.updt_count} / ${convertHHMM(
    //     element.updt
    //   )}`;
    //   send_data["batch_oee"] = (cal_data.oee * 100).toFixed(2);
    //   send_data["batch_aviability"] = (cal_data.aviability * 100).toFixed(2);
    //   send_data["batch_performance"] = (cal_data.performance * 100).toFixed(2);
    //   send_data["batch_quality"] = (cal_data.quality * 100).toFixed(2);
    //   send_data["batch_mttr"] = cal_data.mttr;
    //   send_data["batch_mtbf"] = cal_data.mtbf;
    //   (send_data["condition"] = current_condition),
    //     (send_data["mode"] = machine_temp.mode);
    //   send_data["speed_loss"] = cal_data.speed_loss;
    //   send_data["idel_time"] =
    //     element.minor_manual_stop_count +
    //     element.blocked_count +
    //     element.waiting_count +
    //     element.minor_fault_count +
    //     element.ready_count +
    //     " / " +
    //     cal_data.idel_time;
    //   send_data["totalTheoreticalTime"] = cal_data.total_time;
    //   send_data["case_count"] = case_count;
    //   send_data["totalPlanProdTime"] = cal_data.working_time;
    //   send_data["netOperatingTime"] = cal_data.net_operating_time;
    //   send_data["grossOperatingTime"] = cal_data.production_time;
    //   send_data["inProcessRejectTime"] = cal_data.reject_time;
    //   send_data["changeOverWastageTime"] = cal_data.changeover_wastage_time;
    //   send_data["productiveTime"] = cal_data.productive_time;
    //   send_data["current_timeStamp"] = moment().local().format();
    //   send_data["speed_blisters"] =
    //     machine_temp.bpm * batch_data.product_name.blister_per_format;
    //   send_data["machine"] = element._id;
    //   send_data["state_mode"] = mode_json[current_condition];
    //   send_data["changover_standard_duration"] =changover_standard_duration;
    //   send_data["pdt_time"] = element.pdt;
    //   send_data["updt_time"] = element.updt;
    //   send_data["ppt_time"] = cal_data.ppt_time;
    //   send_data["changeover_time_sec"] = element.changeover;
    //   send_data["batch_start_utc"] = batch_data.start_time;
    //   //send_data['data'] = data
    //   var count = 1;
    //   sort_arr.forEach((fault) => {
    //     if (fault.fault_name) {
    //       send_data[`fault_${count}`] = `${
    //         fault_obj[element._id][fault.fault_name]
    //       }  ${fault.count} / ${convertHHMM(Math.round(fault.duration))} `;
    //       count++;
    //     }
    //   });
    //   send_arr.push(send_data);
    //   if (send_arr.length == i + 1) {
    //     shift_res = send_arr;
    //     last_update = new Date();
    //     cb(send_arr);
    //   }
    // });
  }
  //return send_arr;
}
router.get("/", (req, res) => {
  var line_id = req.query.line_id;
  add15minCache(line_id, (data) => {
    res.send(data);
  });
});

function calculation(
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
  //console.log(goodCount, reject_count, total_batch_time, pdt, changeover, updt, major_fault, major_fault_count,minor_fault,major_manual_stop,minor_manual_stop, rated_speed)
  var data = {};
  var total_count = goodCount + reject_count;
  var working_time = total_batch_time * 60 - pdt - updt;
  var production_time =
    working_time - major_fault - major_manual_stop - changeover;
  if (production_time < 70) {
    production_time = 0;
  }
  var performance_time =
    convertMinutes(production_time) - total_count / rated_speed;
  var reject_time = Math.floor((reject_count / rated_speed) * 60);
  var changeover_wastage_time = Math.floor(
    (changeover_reject / rated_speed) * 60
  );
  var idle_time = blocked + waiting + minor_manual_stop + minor_fault + ready;
  //console.log(performance_time)
  var speed_loss = performance_time * 60 - idle_time;
  // if(speed_loss < 70){
  // speed_loss = 0
  // }
  var net_operating_time = production_time - idle_time - speed_loss;
  if (net_operating_time < 70) {
    net_operating_time = 0;
  }
  var productive_time = net_operating_time - reject_time; //- changeover_wastage_time;
  data.performance = checkValidation(
    total_count / (rated_speed * convertMinutes(production_time))
  );
  data.quality = checkValidation(goodCount / total_count);
  data.aviability = checkValidation(production_time / working_time);
  data.idel_time = convertHHMM(idle_time);
  data.working_time = convertHHMM(working_time);
  data.ppt_time = working_time;
  data.speed_loss = convertHHMM(Math.floor(speed_loss));
  data.performance_time = convertHHMM(Math.floor(performance_time * 60));
  data.oee = data.quality * data.aviability * data.performance;
  data.mtbf = convertHHMM(
    MttrValidation(Math.round(working_time / major_fault_count))
  );
  data.mttr = convertHHMM(
    MttrValidation(Math.round(major_fault / major_fault_count))
  );
  data.production_time = convertHHMM(Math.round(production_time));
  data.total_time = convertHHMM(total_batch_time * 60);
  data.reject_time = convertHHMM(reject_time);
  data.changeover_wastage_time = convertHHMM(changeover_wastage_time);
  data.net_operating_time = convertHHMM(Math.floor(net_operating_time));
  data.productive_time = convertHHMM(Math.floor(productive_time));
  return data;
}
//
function checkValidation(value) {
  if (value < 0 || value === Infinity || !value) {
    return 0;
  } else if (value > 1) {
    return 1;
  } else {
    return value;
  }
}

function MttrValidation(value) {
  if (value < 0 || value === Infinity || !value) {
    return 0;
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

function checkNumber(number) {
  if (number < 10) {
    return `0${number}`;
  } else {
    return number;
  }
}
function convertMinutes(totalSeconds) {
  h = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  m = Math.floor(totalSeconds / 60);
  return h * 60 + m;
}

//function check major minor
function checkMajorMinor(duration) {
  if (duration > major_minor_duration * 60) {
    return "major";
  } else {
    return "minor";
  }
}
module.exports = {router,add15minCache};
