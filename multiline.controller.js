var express = require("express");
var mongoose = require("mongoose");
var moment = require("moment");
var { TempGood } = require("../model/goodTemp.model");
var { addLine } = require("../model/addLine.model");
var { getColour } = require("../model/threshhold.model");
var { Roster } = require("../model/roster.model");
var { changeOver } = require("../model/changeover.model");
var { vendortrigger } = require("../model/vendertrigger.model");
var fault_name_obj = require("../fault.json");
var major_minor_count_sec = 5 * 60;
var router = express.Router();

router.get("/header", async (req, res) => {
  var line_id = req.query.line_id;
  var response = await TempGood.aggregate([
    {
      $match: {
        line_id: mongoose.Types.ObjectId(line_id),
      },
    },
    {
      $lookup: {
        from: "addlines",
        localField: "line_id",
        foreignField: "line_id",
        as: "line_data",
      },
    },
    {
      $unwind: {
        path: "$line_data",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        $expr: {
          $eq: ["$machine", "$line_data.critical_machine"],
        },
      },
    },
    {
      $lookup: {
        from: "connections",
        let: { line_id: "$line_id", machine: "$line_data.critical_machine" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ["$line_id", "$$line_id"],
                  },
                  {
                    $eq: ["$machine_name", "$$machine"],
                  },
                ],
              },
            },
          },
        ],
        as: "connection",
      },
    },
    {
      $lookup: {
        from: "batchskutriggers",
        localField: "currnt_batch",
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
      $lookup: {
        from: "shifts",
        localField: "current_shift",
        foreignField: "shiftName",
        as: "shift",
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
        path: "$shift",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$connection",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "lines",
        localField: "line_id",
        foreignField: "_id",
        as: "line",
      },
    },
    {
      $unwind: {
        path: "$line",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "plants",
        localField: "line.plant_id",
        foreignField: "_id",
        as: "plant",
      },
    },
    {
      $unwind: {
        path: "$plant",
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);
  var data = response[0];
  res.send({
    currentSKU: data.fgex.product_name,
    currentShift: data.current_shift,
    currentShiftTiming: `${
      checkNumber(Math.floor(data.shift.shiftStartTime / 60)) +
      ":" +
      checkNumber(data.shift.shiftStartTime % 60)
    } to ${
      checkNumber(Math.floor(data.shift.shiftEndTime / 60)) +
      ":" +
      checkNumber(data.shift.shiftEndTime % 60)
    }`,
    currentDate: moment().local().format("YYYY-MM-DD  hh:mm:ss A"),
    currentOperator: data.current_operator,
    lineName: data.line.line_name,
    hallName: data.plant ? data.plant.plant_name : "Please map line with Plant",
    connectionDetails: {
      connectionStatus: data.connection.status,
      lastUpdatedAt: moment(data.connection.lastUpdate).local().format(),
    },
  });
});

var last_update = new Date();
var multi_res;
var raw_data;
var inside = false;
//15 min buffer
async function add15minCache(line_id, cb) {
  var machine_wise_obj = {};
  if ((new Date() - last_update <= 15000 || inside) && multi_res) {
    var line_data = multi_res.filter(
      (line) => String(line.line_id) == String(line_id)
    );
    cb(line_data, multi_res, raw_data);
  } else {
    inside = true;
    var data = await addLine.aggregate([
      { $unwind: "$machine_wise" },
      {
        $lookup: {
          from: "tempgoods",
          let: {
            line_id: "$line_id",
            machine_name: "$machine_wise.machine_name",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$line_id", "$$line_id"],
                    },
                    {
                      $eq: ["$machine", "$$machine_name"],
                    },
                  ],
                },
              },
            },
          ],
          as: "temp",
        },
      },
      {
        $unwind: {
          path: "$temp",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "status",
          let: {
            line_id: "$line_id",
            machine_name: "$machine_wise.machine_name",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$line_id", "$$line_id"],
                    },
                    {
                      $eq: ["$machine", "$$machine_name"],
                    },
                  ],
                },
              },
            },
          ],
          as: "status",
        },
      },
      {
        $lookup: {
          from: "alarms",
          let: {
            line_id: "$line_id",
            machine_name: "$machine_wise.machine_name",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$line_id", "$$line_id"],
                    },
                    {
                      $eq: ["$machine_name", "$$machine_name"],
                    },
                  ],
                },
              },
            },
          ],
          as: "alarm",
        },
      },
      {
        $lookup: {
          from: "equipment",
          let: { line_id: "$temp.line_id", equipment_name: "$temp.machine" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$line_id", "$$line_id"],
                    },
                    {
                      $eq: ["$equipment_name", "$$equipment_name"],
                    },
                  ],
                },
              },
            },
          ],
          as: "equipment",
        },
      },
      {
        $unwind: {
          path: "$status",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$alarm",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$equipment",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "projects",
          let: {
            line_id: "$line_id",
            machine_name: "$machine_wise.machine_name",
            date: "$temp.date",
            shift: "$temp.current_shift",
            batch: "$temp.currnt_batch",
            current_state: "$status.condition",
            code: "$status.code",
            last_update: "$status.last_update",
            current_good_count: "$temp.current_good_value",
            shift_start_good_count: "$temp.shift_start_good_count",
            current_reject_count: "$temp.current_reject_value",
            shift_start_reject_count: "$temp.shift_start_reject_count",
            current_cycle_count: "$temp.current_cycle_count",
            shift_start_cycle_count: "$temp.shift_start_cycle_count",
            critical_machine: "$critical_machine",
            product_type: "$equipment.product",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$line_id", "$$line_id"],
                    },
                    {
                      $eq: ["$date", "$$date"],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                line_id: 1,
                date: 1,
                shift_wise: {
                  $filter: {
                    input: "$shift_wise",
                    as: "shift_data",
                    cond: {
                      $eq: ["$$shift_data.shift_name", "$$shift"],
                    },
                  },
                },
              },
            },
            {
              $unwind: {
                path: "$shift_wise",
                preserveNullAndEmptyArrays: true,
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
                path: "$shift_wise.batch_wise",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $unwind: {
                path: "$operator_name",
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
              $lookup: {
                from: "changeovers",
                localField: "shift_wise.batch_wise.changeover",
                foreignField: "_id",
                as: "batch_changeover",
              },
            },
            {
              $unwind: {
                path: "$batch_changeover",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "changeovermasters",
                localField: "batch_changeover.changeover_type_id",
                foreignField: "_id",
                as: "changeover_type",
              },
            },
            {
              $unwind: {
                path: "$changeover_type",
                preserveNullAndEmptyArrays: true,
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
                path: "$shift_wise.batch_wise.vendor_wise",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "vendors",
                localField: "shift_wise.batch_wise.vendor_wise.vendor",
                foreignField: "_id",
                as: "vendor",
              },
            },
            {
              $unwind: {
                path: "$vendor",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                line_id: 1,
                date: 1,
                operator_name: 1,
                batch_start_timestamp: "$shift_wise.batch_wise.start_timestamp",
                batch: 1,
                fgex: 1,
                batch_end_timestamp: "$shift_wise.batch_wise.end_timestamp",
                vendor: "$vendor.vendor",
                batch_changeover: {
                  $round: [
                    {
                      $divide: [
                        {
                          $subtract: [
                            {
                              $ifNull: [
                                "$batch_changeover.changeover_end_date",
                                new Date(),
                              ],
                            },
                            "$batch_changeover.changeover_start_date",
                          ],
                        },
                        1000,
                      ],
                    },
                    0,
                  ],
                },
                standard_duration: {
                  $ifNull: ["$changeover_type.standard_duration", 0],
                },
                batch_power_off: {
                  $ifNull: [
                    {
                      $sum: [
                        "$batch_changeover.quality_power_off",
                        "$batch_changeover.mechanical_power_off",
                      ],
                    },
                    0,
                  ],
                },
                machine_wise: {
                  $filter: {
                    input: "$shift_wise.batch_wise.vendor_wise.machine_wise",
                    as: "machine_data",
                    cond: {
                      $eq: ["$$machine_data.machine_name", "$$machine_name"],
                    },
                  },
                },
              },
            },
            {
              $unwind: {
                path: "$machine_wise",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                line_id: 1,
                date: 1,
                operator_name: 1,
                batch_start_timestamp: 1,
                batch: 1,
                fgex: 1,
                vendor: 1,
                batch_end_timestamp: 1,
                good_count: "$machine_wise.goodCount",
                machine_name: "$machine_wise.machine_name",
                reject_count: "$machine_wise.reject_count",
                startup_reject: "$machine_wise.startup_reject",
                cycle_count: "$machine_wise.cycle_count",
                blockedCriticaloff: "$machine_wise.blockedCriticaloff",
                waitingCriticaloff: "$machine_wise.waitingCriticaloff",
                batch_changeover: {
                  $ifNull: ["$batch_changeover", 2],
                },
                batch_power_off: {
                  $ifNull: ["$batch_power_off", 1],
                },
                standard_duration: {
                  $multiply: ["$standard_duration", 60],
                },
                fault: {
                  $filter: {
                    input: "$machine_wise.stop_wise",
                    as: "stop",
                    cond: { $eq: ["$$stop.stop_name", "fault"] },
                  },
                },
                schedule_maintance: {
                  $filter: {
                    input: "$machine_wise.stop_wise",
                    as: "stop",
                    cond: { $eq: ["$$stop.stop_name", "schedule_maintance"] },
                  },
                },
                changeover: {
                  $filter: {
                    input: "$machine_wise.stop_wise",
                    as: "stop",
                    cond: { $eq: ["$$stop.stop_name", "changeover"] },
                  },
                },
                cip: {
                  $filter: {
                    input: "$machine_wise.stop_wise",
                    as: "stop",
                    cond: { $eq: ["$$stop.stop_name", "cip"] },
                  },
                },
                blocked: {
                  $filter: {
                    input: "$machine_wise.stop_wise",
                    as: "stop",
                    cond: { $eq: ["$$stop.stop_name", "blocked"] },
                  },
                },
                pdt: {
                  $filter: {
                    input: "$machine_wise.stop_wise",
                    as: "stop",
                    cond: { $eq: ["$$stop.stop_name", "pdt"] },
                  },
                },
                manual_stop: {
                  $filter: {
                    input: "$machine_wise.stop_wise",
                    as: "stop",
                    cond: { $eq: ["$$stop.stop_name", "manual_stop"] },
                  },
                },
                updt: {
                  $filter: {
                    input: "$machine_wise.stop_wise",
                    as: "stop",
                    cond: { $eq: ["$$stop.stop_name", "updt"] },
                  },
                },
                waiting: {
                  $filter: {
                    input: "$machine_wise.stop_wise",
                    as: "stop",
                    cond: { $eq: ["$$stop.stop_name", "waiting"] },
                  },
                },
                not_used: {
                  $filter: {
                    input: "$machine_wise.stop_wise",
                    as: "stop",
                    cond: { $eq: ["$$stop.stop_name", "not_used"] },
                  },
                },
                ready: {
                  $filter: {
                    input: "$machine_wise.stop_wise",
                    as: "stop",
                    cond: { $eq: ["$$stop.stop_name", "ready"] },
                  },
                },
                executing: {
                  $filter: {
                    input: "$machine_wise.stop_wise",
                    as: "stop",
                    cond: { $eq: ["$$stop.stop_name", "executing"] },
                  },
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
                path: "$cip",
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
              $unwind: {
                path: "$executing",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $unwind: {
                path: "$schedule_maintance",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                line_id: 1,
                date: 1,
                operator_name: 1,
                batch_start_timestamp: 1,
                batch: 1,
                fgex: 1,
                batch_end_timestamp: 1,
                schedule_maintance: 1,
                blockedCriticaloff: 1,
                waitingCriticaloff: 1,
                machine_name: 1,
                good_count: {
                  $cond: [
                    {
                      $eq: ["$batch._id", "$$batch"],
                    },
                    {
                      $sum: [
                        "$good_count",
                        {
                          $subtract: [
                            "$$current_good_count",
                            "$$shift_start_good_count",
                          ],
                        },
                      ],
                    },
                    "$good_count",
                  ],
                },
                reject_count: {
                  $cond: [
                    {
                      $eq: ["$batch._id", "$$batch"],
                    },
                    {
                      $sum: [
                        "$reject_count",
                        {
                          $subtract: [
                            "$$current_reject_count",
                            "$$shift_start_reject_count",
                          ],
                        },
                      ],
                    },
                    "$reject_count",
                  ],
                },
                startup_reject: 1,
                cycle_count: {
                  $cond: [
                    {
                      $eq: ["$batch._id", "$$batch"],
                    },
                    {
                      $sum: [
                        "$cycle_count",
                        {
                          $subtract: [
                            "$$current_cycle_count",
                            "$$shift_start_cycle_count",
                          ],
                        },
                      ],
                    },
                    "$cycle_count",
                  ],
                },
                changeover_split: {
                  $cond: [
                    {
                      $lte: [
                        {
                          $subtract: ["$batch_changeover", "$batch_power_off"],
                        },
                        0,
                      ],
                    },
                    "$standard_duration",
                    {
                      $divide: [
                        "$standard_duration",
                        {
                          $subtract: ["$batch_changeover", "$batch_power_off"],
                        },
                      ],
                    },
                  ],
                },
                fault: 1,
                ready: 1,
                executing: 1,
                blocked: 1,
                waiting: 1,
                updt: 1,
                pdt: 1,
                changeover: 1,
                cip:1,
                duration: {
                  $round: [
                    {
                      $divide: [
                        { $subtract: [new Date(), "$$last_update"] },
                        1000,
                      ],
                    },
                    0,
                  ],
                },
                manual_stop: 1,
                major_fault: {
                  $filter: {
                    input: "$fault.details",
                    as: "stop",
                    cond: { $eq: ["$$stop.duration_type", "major"] },
                  },
                },
                minor_fault: {
                  $filter: {
                    input: "$fault.details",
                    as: "stop",
                    cond: { $eq: ["$$stop.duration_type", "minor"] },
                  },
                },
                major_manual_stop: {
                  $filter: {
                    input: "$manual_stop.details",
                    as: "stop",
                    cond: { $eq: ["$$stop.duration_type", "major"] },
                  },
                },
                minor_manual_stop: {
                  $filter: {
                    input: "$manual_stop.details",
                    as: "stop",
                    cond: { $eq: ["$$stop.duration_type", "minor"] },
                  },
                },
              },
            },
            {
              $unwind: {
                path: "$major_manual_stop",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $unwind: {
                path: "$minor_manual_stop",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $unwind: {
                path: "$major_fault",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $unwind: {
                path: "$minor_fault",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                line_id: 1,
                date: 1,
                operator_name: 1,
                batch_start_timestamp: 1,
                batch: 1,
                fgex: 1,
                machine_name: 1,
                batch_end_timestamp: 1,
                changeover_split: 1,
                duration: 1,
                good_count: 1,
                reject_count: 1,
                startup_reject: 1,
                blockedCriticaloff: 1,
                waitingCriticaloff: 1,
                cycle_count: 1,
                duration_type: {
                  $cond: [
                    {
                      $gt: ["$duration", major_minor_count_sec],
                    },
                    2,
                    3,
                  ],
                },
                blocked: "$blocked.duration",
                blocked_count: "$blocked.count",
                waiting: "$waiting.duration",
                waiting_count: "$waiting.count",
                pdt: "$pdt.duration",
                pdt_count: "$pdt.count",
                schedule_maintance: "$schedule_maintance.duration",
                schedule_maintance_count: "$schedule_maintance.count",
                updt: "$updt.duration",
                ready: "$ready.duration",
                ready_count: "$ready.count",
                executing: "$executing.duration",
                updt_count: "$updt.count",
                changeover: "$changeover.duration",
                changeover_count: "$changeover.count",
                cip: "$cip.duration",
                cip_count: "$cip.count",
                major_fault: "$major_fault.duration",
                major_fault_count: "$major_fault.count",
                minor_fault: "$minor_fault.duration",
                minor_fault_count: "$minor_fault.count",
                major_manual_stop: "$major_manual_stop.duration",
                major_manual_stop_count: "$major_manual_stop.count",
                minor_manual_stop: "$minor_manual_stop.duration",
                minor_manual_stop_count: "$minor_manual_stop.count",
              },
            },
            {
              $project: {
                line_id: 1,
                date: 1,
                operator_name: 1,
                batch_start_timestamp: 1,
                batch: 1,
                fgex: 1,
                machine_name: 1,
                blockedCriticaloff: 1,
                waitingCriticaloff: 1,
                cycle_count: {
                  $cond: [
                    {
                      $eq: ["$$product_type", "case"],
                    },
                    {
                      $multiply: ["$fgex.bottles_per_case", "$cycle_count"],
                    },
                    "$cycle_count",
                  ],
                },
                good_count: {
                  $cond: [
                    {
                      $eq: ["$$product_type", "case"],
                    },
                    {
                      $multiply: ["$fgex.bottles_per_case", "$good_count"],
                    },
                    "$good_count",
                  ],
                },
                raw_good_count: "$good_count",
                raw_cycle_count: "$cycle_count",
                reject_count: 1,
                startup_reject: 1,
                batch_end_timestamp: {
                  $ifNull: ["$batch_end_timestamp", new Date()],
                },
                changeover_split: 1,
                duration: 1,
                blocked: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "blocked"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                      ],
                    },
                    {
                      $sum: ["$blocked", "$duration"],
                    },
                    "$blocked",
                  ],
                },
                blocked_count: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "blocked"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                      ],
                    },
                    {
                      $sum: ["$blocked_count", 1],
                    },
                    "$blocked_count",
                  ],
                },
                cip: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "cip"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                      ],
                    },
                    {
                      $sum: ["$cip", "$duration"],
                    },
                    "$cip",
                  ],
                },
                cip_count: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "cip"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                      ],
                    },
                    {
                      $sum: ["$cip_count", 1],
                    },
                    "$cip_count",
                  ],
                },
                waiting: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "waiting"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                      ],
                    },
                    {
                      $sum: ["$waiting", "$duration"],
                    },
                    "$waiting",
                  ],
                },
                waiting_count: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "waiting"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                      ],
                    },
                    {
                      $sum: ["$waiting_count", 1],
                    },
                    "$waiting_count",
                  ],
                },
                pdt: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "pdt"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                      ],
                    },
                    {
                      $sum: ["$pdt", "$duration"],
                    },
                    "$pdt",
                  ],
                },
                pdt_count: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "pdt"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                      ],
                    },
                    {
                      $sum: ["$pdt_count", 1],
                    },
                    "$pdt_count",
                  ],
                },
                schedule_maintance: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "schedule_maintance"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                      ],
                    },
                    {
                      $sum: ["$schedule_maintance", "$duration"],
                    },
                    "$schedule_maintance",
                  ],
                },
                schedule_maintance_count: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "schedule_maintance"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                      ],
                    },
                    {
                      $sum: ["$schedule_maintance_count", 1],
                    },
                    "$schedule_maintance_count",
                  ],
                },
                updt: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                        {
                          $eq: ["$$current_state", "updt"],
                        },
                      ],
                    },
                    {
                      $sum: ["$updt", "$duration"],
                    },
                    "$updt",
                  ],
                },
                ready_count: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "ready"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                      ],
                    },
                    {
                      $sum: ["$ready_count", 1],
                    },
                    "$ready_count",
                  ],
                },
                ready: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                        {
                          $eq: ["$$current_state", "ready"],
                        },
                      ],
                    },
                    {
                      $sum: ["$ready", "$duration"],
                    },
                    "$ready",
                  ],
                },
                executing: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                        {
                          $eq: ["$$current_state", "executing"],
                        },
                      ],
                    },
                    {
                      $sum: ["$executing", "$duration"],
                    },
                    "$executing",
                  ],
                },
                updt_count: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                        {
                          $eq: ["$$current_state", "updt"],
                        },
                      ],
                    },
                    {
                      $sum: ["$updt_count", 1],
                    },
                    "$updt_count",
                  ],
                },
                changeover: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                        {
                          $eq: ["$$current_state", "changeover"],
                        },
                      ],
                    },
                    {
                      $sum: ["$changeover", "$duration"],
                    },
                    "$changeover",
                  ],
                },
                changeover_count: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                        {
                          $eq: ["$$current_state", "changeover"],
                        },
                      ],
                    },
                    {
                      $sum: ["$changeover_count", 1],
                    },
                    "$changeover_count",
                  ],
                },
                major_fault: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$duration_type", 2],
                        },
                        {
                          $eq: ["$$current_state", "fault"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                      ],
                    },
                    {
                      $sum: ["$major_fault", "$duration"],
                    },
                    "$major_fault",
                  ],
                },
                major_fault_count: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "fault"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                        {
                          $eq: ["$duration_type", 2],
                        },
                      ],
                    },
                    {
                      $sum: ["$major_fault_count", 1],
                    },
                    "$major_fault_count",
                  ],
                },
                minor_fault: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "fault"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                        {
                          $eq: ["$duration_type", 3],
                        },
                      ],
                    },
                    {
                      $sum: ["$minor_fault", "$duration"],
                    },
                    "$minor_fault",
                  ],
                },
                minor_fault_count: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "fault"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                        {
                          $eq: ["$duration_type", 3],
                        },
                      ],
                    },
                    {
                      $sum: ["$minor_fault_count", 1],
                    },
                    "$minor_fault_count",
                  ],
                },
                major_manual_stop: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "manual_stop"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                        {
                          $eq: ["$duration_type", 2],
                        },
                      ],
                    },
                    {
                      $sum: ["$major_manual_stop", "$duration"],
                    },
                    "$major_manual_stop",
                  ],
                },
                major_manual_stop_count: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "manual_stop"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                        {
                          $eq: ["$duration_type", 2],
                        },
                      ],
                    },
                    {
                      $sum: ["$major_manual_stop_count", 1],
                    },
                    "$major_manual_stop_count",
                  ],
                },
                minor_manual_stop: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$$current_state", "manual_stop"],
                        },
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                        {
                          $eq: ["$duration_type", 3],
                        },
                      ],
                    },
                    {
                      $sum: ["$minor_manual_stop", "$duration"],
                    },
                    "$minor_manual_stop",
                  ],
                },
                minor_manual_stop_count: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$batch._id", "$$batch"],
                        },
                        {
                          $eq: ["$$current_state", "manual_stop"],
                        },
                        {
                          $eq: ["$duration_type", 3],
                        },
                      ],
                    },
                    {
                      $sum: ["$minor_manual_stop_count", 1],
                    },
                    "$minor_manual_stop_count",
                  ],
                },
              },
            },
            {
              $project: {
                line_id: 1,
                date: 1,
                operator_name: 1,
                good_count: 1,
                raw_good_count: 1,
                raw_cycle_count: 1,
                cycle_count: 1,
                machine_name: 1,
                reject_count: 1,
                startup_reject: 1,
                batch_start_timestamp: 1,
                batch: 1,
                fgex: 1,
                batch_end_timestamp: 1,
                total_time: {
                  $divide: [
                    {
                      $subtract: [
                        "$batch_end_timestamp",
                        "$batch_start_timestamp",
                      ],
                    },
                    1000,
                  ],
                },
                changeover_split: 1,
                duration: 1,
                blocked: {
                  $cond: [
                    {
                      $eq: ["$machine_name", "$$critical_machine"],
                    },
                    {
                      $subtract: ["$blocked", "$blockedCriticaloff"],
                    },
                    "$blocked",
                  ],
                },
                blocked_count: 1,
                cip:1,
                cip_count:1,
                waiting: {
                  $cond: [
                    {
                      $eq: ["$machine_name", "$$critical_machine"],
                    },
                    {
                      $subtract: ["$waiting", "$waitingCriticaloff"],
                    },
                    "$waiting",
                  ],
                },
                waiting_count: 1,
                pdt: {
                  $cond: [
                    {
                      $gte: ["$changeover_split", 1],
                    },
                    {
                      $sum: ["$changeover", "$pdt"],
                    },
                    {
                      $sum: [
                        "$pdt",
                        { $multiply: ["$changeover_split", "$changeover"] },
                      ],
                    },
                  ],
                },
                pdt_count: 1,
                schedule_maintance: 1,
                schedule_maintance_count: 1,
                blockedCriticaloff: 1,
                waitingCriticaloff: 1,
                updt: 1,
                ready: 1,
                ready_count: 1,
                executing: 1,
                updt_count: 1,
                changeover: {
                  $cond: [
                    {
                      $gte: ["$changeover_split", 1],
                    },
                    0,
                    {
                      $subtract: [
                        "$changeover",
                        { $multiply: ["$changeover_split", "$changeover"] },
                      ],
                    },
                  ],
                },
                changeover_count: 1,
                major_fault: 1,
                major_fault_count: 1,
                minor_fault: 1,
                minor_fault_count: 1,
                major_manual_stop: 1,
                major_manual_stop_count: 1,
                minor_manual_stop: 1,
                minor_manual_stop_count: 1,
                rated_speed: "$fgex.rated_speed",
              },
            },
            {
              $unwind: {
                path: "$rated_speed",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                line_id: 1,
                date: 1,
                operator_name: 1,
                batch_start_timestamp: 1,
                batch: 1,
                fgex: 1,
                machine_name: 1,
                schedule_maintance: 1,
                schedule_maintance_count: 1,
                blockedCriticaloff: 1,
                waitingCriticaloff: 1,
                rated_speed: {
                  $ifNull: [
                    {
                      $divide: ["$fgex.rated_speed", 60],
                    },
                    1,
                  ],
                },
                goodCount: "$good_count",
                raw_good_count: 1,
                raw_cycle_count: 1,
                cycle_count: 1,
                reject_count: 1,
                startup_reject: 1,
                batch_end_timestamp: 1,
                total_time: 1,
                changeover_split: 1,
                duration: 1,
                blocked: 1,
                blocked_count: 1,
                cip:1,
                cip_count:1,
                waiting: 1,
                waiting_count: 1,
                pdt: 1,
                pdt_count: 1,
                updt: 1,
                ready: 1,
                ready_count: 1,
                executing: 1,
                updt_count: 1,
                changeover: 1,
                changeover_count: 1,
                major_fault: 1,
                major_fault_count: 1,
                minor_fault: 1,
                minor_fault_count: 1,
                major_manual_stop: 1,
                major_manual_stop_count: 1,
                minor_manual_stop: 1,
                minor_manual_stop_count: 1,
                ppt_time: {
                  $round: [
                    {
                      $subtract: [
                        "$total_time",
                        {
                          $sum: ["$pdt", "$updt", "$schedule_maintance","$cip"],
                        },
                      ],
                    },
                    0,
                  ],
                },
                got_time: {
                  $round: [
                    {
                      $subtract: [
                        "$total_time",
                        {
                          $sum: [
                            "$pdt",
                            "$updt",
                            "$major_fault",
                            "$major_manual_stop",
                            "$changeover",
                            "$waitingCriticaloff",
                            "$blockedCriticaloff",
                          ],
                        },
                      ],
                    },
                    0,
                  ],
                },
                idle_time: {
                  $sum: [
                    "$blocked",
                    "$waiting",
                    "$minor_fault",
                    "$minor_manual_stop",
                    "$ready",
                  ],
                },
                idle_count: {
                  $sum: [
                    "$blocked_count",
                    "$waiting_count",
                    "$minor_fault_count",
                    "$minor_manual_stop_count",
                    "$ready_count",
                  ],
                },
              },
            },
            {
              $project: {
                line_id: 1,
                date: 1,
                operator_name: 1,
                batch_start_timestamp: 1,
                batch: 1,
                fgex: 1,
                machine_name: 1,
                schedule_maintance: 1,
                schedule_maintance_count: 1,
                blockedCriticaloff: 1,
                waitingCriticaloff: 1,
                goodCount: 1,
                raw_good_count: 1,
                raw_cycle_count: 1,
                cycle_count: 1,
                reject_count: 1,
                startup_reject: 1,
                batch_end_timestamp: 1,
                changeover_split: 1,
                duration: 1,
                blocked: 1,
                blocked_count: 1,
                cip:1,
                cip_count:1,
                waiting: 1,
                waiting_count: 1,
                pdt: 1,
                pdt_count: 1,
                updt: 1,
                ready: 1,
                ready_count: 1,
                executing: 1,
                updt_count: 1,
                changeover: 1,
                changeover_count: 1,
                major_fault: 1,
                major_fault_count: 1,
                minor_fault: 1,
                minor_fault_count: 1,
                major_manual_stop: 1,
                major_manual_stop_count: 1,
                minor_manual_stop: 1,
                minor_manual_stop_count: 1,
                rated_speed: 1,
                total_time: 1,
                ppt_time: 1,
                got_time: {
                  $cond: [
                    {
                      $lt: ["$got_time", 60],
                    },
                    0,
                    "$got_time",
                  ],
                },
                performance_time: {
                  $cond: [
                    {
                      $or: [
                        {
                          $lte: ["$got_time", 60],
                        },
                        { $lt: [{ $sum: ["$goodCount", "$reject_count"] }, 0] },
                      ],
                    },
                    0,
                    {
                      $round: [
                        {
                          $subtract: [
                            "$got_time",
                            {
                              $divide: [
                                { $sum: ["$goodCount", "$reject_count"] },
                                "$rated_speed",
                              ],
                            },
                          ],
                        },
                        0,
                      ],
                    },
                  ],
                },
                reject_time: {
                  $round: [
                    {
                      $divide: ["$reject_count", "$rated_speed"],
                    },
                    0,
                  ],
                },
                changeover_wastage_time: {
                  $round: [
                    {
                      $divide: ["$startup_reject", "$rated_speed"],
                    },
                    0,
                  ],
                },
                idle_time: 1,
                idle_count: 1,
              },
            },
            {
              $project: {
                line_id: 1,
                date: 1,
                operator_name: 1,
                batch_start_timestamp: 1,
                batch: 1,
                fgex: 1,
                machine_name: 1,
                schedule_maintance: 1,
                schedule_maintance_count: 1,
                blockedCriticaloff: 1,
                waitingCriticaloff: 1,
                goodCount: 1,
                raw_good_count: 1,
                raw_cycle_count: 1,
                cycle_count: 1,
                reject_count: 1,
                startup_reject: 1,
                batch_end_timestamp: 1,
                changeover_split: 1,
                duration: 1,
                blocked: 1,
                blocked_count: 1,
                cip:1,
                cip_count:1,
                waiting: 1,
                waiting_count: 1,
                pdt: 1,
                pdt_count: 1,
                updt: 1,
                ready: 1,
                ready_count: 1,
                executing: 1,
                updt_count: 1,
                changeover: 1,
                changeover_count: 1,
                major_fault: 1,
                major_fault_count: 1,
                minor_fault: 1,
                minor_fault_count: 1,
                major_manual_stop: 1,
                major_manual_stop_count: 1,
                minor_manual_stop: 1,
                minor_manual_stop_count: 1,
                rated_speed: 1,
                total_time: 1,
                ppt_time: 1,
                got_time: 1,
                performance_time: 1,
                reject_time: 1,
                changeover_wastage_time: 1,
                idle_time: 1,
                idle_count: 1,
                speed_loss: {
                  $subtract: ["$performance_time", "$idle_time"],
                },
              },
            },
            {
              $project: {
                line_id: 1,
                date: 1,
                operator_name: 1,
                batch_start_timestamp: 1,
                batch: 1,
                fgex: 1,
                machine_name: 1,
                schedule_maintance: 1,
                schedule_maintance_count: 1,
                blockedCriticaloff: 1,
                waitingCriticaloff: 1,
                goodCount: 1,
                raw_good_count: 1,
                raw_cycle_count: 1,
                cycle_count: 1,
                reject_count: 1,
                startup_reject: 1,
                batch_end_timestamp: 1,
                changeover_split: 1,
                duration: 1,
                blocked: 1,
                blocked_count: 1,
                cip:1,
                cip_count:1,
                waiting: 1,
                waiting_count: 1,
                pdt: 1,
                pdt_count: 1,
                updt: 1,
                ready: 1,
                ready_count: 1,
                executing: 1,
                updt_count: 1,
                changeover: 1,
                changeover_count: 1,
                major_fault: 1,
                major_fault_count: 1,
                minor_fault: 1,
                minor_fault_count: 1,
                major_manual_stop: 1,
                major_manual_stop_count: 1,
                minor_manual_stop: 1,
                minor_manual_stop_count: 1,
                rated_speed: 1,
                total_time: 1,
                ppt_time: 1,
                got_time: 1,
                performance_time: 1,
                reject_time: 1,
                changeover_wastage_time: 1,
                idle_time: 1,
                idle_count: 1,
                speed_loss: 1,
                net_operating_time: {
                  $subtract: [
                    "$got_time",
                    {
                      $sum: ["$idle_time", "$speed_loss"],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                line_id: 1,
                date: 1,
                operator_name: 1,
                batch_start_timestamp: 1,
                batch: 1,
                fgex: 1,
                machine_name: 1,
                schedule_maintance: 1,
                schedule_maintance_count: 1,
                blockedCriticaloff: 1,
                waitingCriticaloff: 1,
                goodCount: 1,
                raw_good_count: 1,
                raw_cycle_count: 1,
                cycle_count: 1,
                reject_count: 1,
                startup_reject: 1,
                batch_end_timestamp: 1,
                changeover_split: 1,
                duration: 1,
                blocked: 1,
                blocked_count: 1,
                cip:1,
                cip_count:1,
                waiting: 1,
                waiting_count: 1,
                pdt: 1,
                pdt_count: 1,
                updt: 1,
                ready: 1,
                ready_count: 1,
                executing: 1,
                updt_count: 1,
                changeover: 1,
                changeover_count: 1,
                major_fault: 1,
                major_fault_count: 1,
                minor_fault: 1,
                minor_fault_count: 1,
                major_manual_stop: 1,
                major_manual_stop_count: 1,
                minor_manual_stop: 1,
                minor_manual_stop_count: 1,
                rated_speed: 1,
                total_time: 1,
                ppt_time: 1,
                got_time: 1,
                performance_time: 1,
                reject_time: 1,
                changeover_wastage_time: 1,
                idle_time: 1,
                idle_count: 1,
                speed_loss: 1,
                net_operating_time: 1,
                productive_time: {
                  $subtract: ["$net_operating_time", "$reject_time"],
                },
              },
            },
            {
              $group: {
                _id: "$machine_name",
                goodCount: { $sum: "$goodCount" },
                raw_good_count: { $sum: "$raw_good_count" },
                raw_cycle_count: { $sum: "$raw_cycle_count" },
                cycle_count: { $sum: "$cycle_count" },
                reject_count: { $sum: "$reject_count" },
                blocked: { $sum: "$blocked" },
                blocked_count: { $sum: "$blocked_count" },
                cip:{ $sum: "$cip" },
                cip_count:{ $sum: "$cip_count" },
                waiting: { $sum: "$waiting" },
                waiting_count: { $sum: "$waiting_count" },
                major_manual_stop: { $sum: "$major_manual_stop" },
                major_manual_stop_count: { $sum: "$major_manual_stop_count" },
                minor_manual_stop: { $sum: "$minor_manual_stop" },
                minor_manual_stop_count: { $sum: "$minor_manual_stop_count" },
                major_fault: { $sum: "$major_fault" },
                major_fault_count: { $sum: "$major_fault_count" },
                minor_fault: { $sum: "$minor_fault" },
                minor_fault_count: { $sum: "$minor_fault_count" },
                pdt: { $sum: "$pdt" },
                pdt_count: { $sum: "$pdt_count" },
                schedule_maintance: { $sum: "$schedule_maintance" },
                schedule_maintance_count: { $sum: "$schedule_maintance_count" },
                updt: { $sum: "$updt" },
                blockedCriticaloff: { $sum: "$blockedCriticaloff" },
                waitingCriticaloff: { $sum: "$waitingCriticaloff" },
                updt_count: { $sum: "$updt_count" },
                changeover: { $sum: "$changeover" },
                changeover_count: { $sum: "$changeover_count" },
                ready: { $sum: "$ready" },
                ready_count: { $sum: "$ready_count" },
                executing: { $sum: "$executing" },
                idle_time: { $sum: "$idle_time" },
                idle_count: { $sum: "$idle_count" },
                total_time: { $sum: "$total_time" },
                ppt_time: { $sum: "$ppt_time" },
                got_time: { $sum: "$got_time" },
                performance_time: { $sum: "$performance_time" },
                net_operating_time: { $sum: "$net_operating_time" },
                speed_loss: { $sum: "$speed_loss" },
                reject_time: { $sum: "$reject_time" },
                startup_reject: { $sum: "$startup_reject" },
                productive_time: { $sum: "$productive_time" },
                changeover_wastage_time: { $sum: "$changeover_wastage_time" },
                batch_wise: {
                  $push: "$$ROOT",
                },
              },
            },
          ],
          as: "shift_batch_wise_array",
        },
      },
      {
        $lookup: {
          from: "batchskutriggers",
          localField: "temp.currnt_batch",
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
        $unwind: {
          path: "$shift_batch_wise_array",
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
        $lookup: {
          from: "changeovers",
          localField: "batch.batch",
          foreignField: "batch_name",
          as: "changeover",
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
          path: "$changeover",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "lines",
          localField: "line_id",
          foreignField: "_id",
          as: "line",
        },
      },
      {
        $unwind: {
          path: "$line",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "plants",
          localField: "line.plant_id",
          foreignField: "_id",
          as: "plant",
        },
      },
      {
        $unwind: {
          path: "$plant",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    //cb(data);
    var mode_json = {
      executing: "Running",
      ready: "Idle",
      waiting: "Waiting",
      blocked: "Blocked",
      stop: "Fault",
      pdt: "Plant Down Time",
      manual_stop: "Manual Stop",
      updt: "Power Off",
      changeover: "Changeover",
    };
    var send_array = [];
    data.forEach(async (element, j) => {
      var push_obj = {};
      //push_obj.raw = element;
      if (element.status && element.status.last_update) {
        var current_duration = moment().diff(
          moment(element.status.last_update),
          "seconds"
        );
        var batch_duration = moment().diff(
          moment(element.batch.start_time),
          "seconds"
        );
        //console.log(element.batch.start_time);
        var batch_good_count =
          element.equipment.product == "case"
            ? (element.temp.current_good_value -
                element.temp.batch_start_good_count) *
              element.fgex.bottles_per_case
            : element.temp.current_good_value -
              element.temp.batch_start_good_count;
        var batch_reject_count =
          element.temp.current_reject_value -
          element.temp.batch_start_reject_count;
        var batch_cycle_count =
          element.equipment.product == "case"
            ? (element.temp.current_cycle_count -
                element.temp.batch_start_cycle_count) *
              element.fgex.bottles_per_case
            : element.temp.current_cycle_count -
              element.temp.batch_start_cycle_count;
        // var shift_buffer_count = eval(shift_buffer_count_obj[element.machine_wise.machine_name]);
        // var batch_buffer_count = eval(batch_buffer_count_obj[element.machine_wise.machine_name]);
        // var changeover_buffer_count_obj = {
        //   sidel: "(machine_wise_obj.sidel.temp.current_cycle_count - machine_wise_obj.sidel.temp.changeover_start_cycle_count) - (machine_wise_obj.sidel.temp.current_good_value - machine_wise_obj.sidel.temp.changeover_start_good_count)",
        //   filler:"(machine_wise_obj.sidel.temp.current_good_value - machine_wise_obj.sidel.temp.changeover_start_good_count) - (machine_wise_obj.filler.temp.current_cycle_count - machine_wise_obj.filler.temp.changeover_start_cycle_count)",
        //   labeler:"(machine_wise_obj.filler.temp.current_good_value - machine_wise_obj.filler.temp.changeover_start_good_count) - (machine_wise_obj.labeler.temp.current_good_value - machine_wise_obj.labeler.temp.changeover_start_good_count)",
        //   shrink:"(machine_wise_obj.filler.temp.current_good_value - machine_wise_obj.filler.temp.changeover_start_good_count) - (machine_wise_obj.shrink.temp.current_cycle_count - machine_wise_obj.shrink.temp.changeover_start_cycle_count) * element.fgex.bottles_per_case",
        // }
        // var changeover_buffer_count = eval(changeover_buffer_count_obj[element.machine_wise.machine_name]);
        var batch_rated_speed = element.fgex.rated_speed;
        var startup_reject = element.status.startup_reject;
        var average_speed = MttrValidation(
          Math.round(
            ((element.shift_batch_wise_array.goodCount +
              element.shift_batch_wise_array.reject_count) /
              element.shift_batch_wise_array.executing) *
              60
          )
        );
        if (
          element.status.condition == "fault" ||
          element.status.condition == "manual_stop"
        ) {
          var duration_type = checkMajorMinor(current_duration);
          if (element.status.condition == "fault" && duration_type == "major") {
            var batch_fault_code = element.status.batch_wise_fault_array.find(
              (data) => data.fault_code == element.status.code
            );
            var fault_obj = {
              fault_code: element.status.code,
              duration: current_duration,
              count: 1,
            };
            //batch wise array perform
            if (!batch_fault_code) {
              element.status.batch_wise_fault_array.push(fault_obj);
            } else {
              var ind = element.status.batch_wise_fault_array.findIndex(
                (data) => data.fault_code == element.status.code
              );
              element.status.batch_wise_fault_array[ind] = {
                fault_code: element.status.code,
                duration: current_duration + batch_fault_code.duration,
                count: 1 + batch_fault_code.count,
              };
            }
            //shift wise array perform
            element.status[
              `batch_wise_${duration_type}_${element.status.condition}_count`
            ] += 1;
            element.status[
              `batch_wise_${duration_type}_${element.status.condition}_duration`
            ] += current_duration;
          } else {
            element.status[
              `batch_wise_${duration_type}_${element.status.condition}_count`
            ] += 1;
            element.status[
              `batch_wise_${duration_type}_${element.status.condition}_duration`
            ] += current_duration;
          }
        } else {
          element.status[`batch_wise_${element.status.condition}_count`] += 1;
          element.status[`batch_wise_${element.status.condition}_duration`] +=
            current_duration;
        }
        var changover_standard_duration = element.changeover
          ? element.changeover.standard_duration * 60
          : 0;
        var batch_average_speed = MttrValidation(
          Math.round(
            (batch_good_count / element.status.batch_wise_executing_duration) *
              60
          )
        );
        //std changeover into pdt
        if (changover_standard_duration > 0) {
          if (
            element.status.batch_wise_changeover_duration <
            changover_standard_duration
          ) {
            element.status.batch_wise_pdt_duration +=
              element.status.batch_wise_changeover_duration;
            element.status.batch_wise_changeover_duration = 0;
            element.status.batch_wise_pdt_count += 1;
          } else {
            var extra_duration =
              element.status.batch_wise_changeover_duration -
              changover_standard_duration;
            element.status.batch_wise_pdt_duration +=
              changover_standard_duration;
            element.status.batch_wise_pdt_count += 1;
            element.status.batch_wise_changeover_duration = extra_duration;
          }
        }
        //when changeover all reject will statup reject
        if (element.status.condition == "changeover") {
          batch_reject_count = 0;
          startup_reject = batch_reject_count;
        }
        var batch_cal_data = calculation(
          batch_good_count,
          batch_reject_count || 0,
          batch_duration,
          element.status.batch_wise_pdt_duration,
          element.status.batch_wise_changeover_duration,
          element.status.batch_wise_updt_duration,
          element.status.batch_wise_major_fault_duration,
          element.status.batch_wise_major_fault_count,
          element.status.batch_wise_minor_fault_duration,
          element.status.batch_wise_major_manual_stop_duration,
          element.status.batch_wise_minor_manual_stop_duration,
          element.status.batch_wise_blocked_duration,
          element.status.batch_wise_waiting_duration,
          batch_rated_speed,
          startup_reject,
          element.status.batch_wise_ready_duration
        );
        var shift_cal_data = Shiftcalculation(
          element.shift_batch_wise_array.total_time,
          element.shift_batch_wise_array.ppt_time,
          element.shift_batch_wise_array.got_time,
          element.shift_batch_wise_array.performance_time,
          element.shift_batch_wise_array.net_operating_time,
          element.shift_batch_wise_array.idle_time,
          element.shift_batch_wise_array.reject_time,
          element.shift_batch_wise_array.changeover_wastage_time,
          element.shift_batch_wise_array.productive_time
        );
        var compare_obj = {
          oee: Number((batch_cal_data.oee * 100).toFixed(2)),
          performance: Number((batch_cal_data.performance * 100).toFixed(2)),
          aviability: Number((batch_cal_data.aviability * 100).toFixed(2)),
          quality: Number((batch_cal_data.quality * 100).toFixed(2)),
          goodCount: batch_good_count,
          reject_count: batch_reject_count,
          major_fault_count: element.status.batch_wise_major_fault_count,
          changeover_wastage: element.shift_batch_wise_array.startup_reject,
          totalTheoreticalTime: element.shift_batch_wise_array.total_time,
          minspeed: element.fgex.blister_min,
          rated_speed: element.fgex.rated_speed,
          average_speed: batch_average_speed,
          current_speed: element.temp.bpm,
        };
        push_obj.shift_fault = `${
          element.shift_batch_wise_array.major_fault_count
        } / ${convertHHMM(element.shift_batch_wise_array.major_fault)}`;
        push_obj.shift_fault_count =
          element.shift_batch_wise_array.major_fault_count;
        push_obj.shift_manual_stop = `${
          element.shift_batch_wise_array.major_manual_stop_count
        } / ${convertHHMM(element.shift_batch_wise_array.major_manual_stop)}`;
        push_obj.shift_manual_stop_count =
          element.shift_batch_wise_array.major_manual_stop_count;
        push_obj.shift_updt = `${
          element.shift_batch_wise_array.updt_count
        } / ${convertHHMM(element.shift_batch_wise_array.updt)}`;
        push_obj.shift_waiting = `${
          element.shift_batch_wise_array.waiting_count
        } / ${convertHHMM(element.shift_batch_wise_array.waiting)}`;
        push_obj.shift_blocked = `${
          element.shift_batch_wise_array.blocked_count
        } / ${convertHHMM(element.shift_batch_wise_array.blocked)}`;
        push_obj.shift_idle = `${
          element.shift_batch_wise_array.ready_count
        } / ${convertHHMM(element.shift_batch_wise_array.ready)}`;
        push_obj.shift_pdt = `${
          element.shift_batch_wise_array.pdt_count
        } / ${convertHHMM(element.shift_batch_wise_array.pdt)}`;
        push_obj.shift_goodCount = `${element.shift_batch_wise_array.raw_good_count} / ${element.shift_batch_wise_array.reject_count}`;
        push_obj.shift_cycle_count =
          element.shift_batch_wise_array.raw_cycle_count;
        push_obj.shift_calculation_good_count = batch_good_count;
        push_obj.shift_changeover = `${
          element.shift_batch_wise_array.changeover_count
        } / ${convertHHMM(element.shift_batch_wise_array.changeover)}`;
        push_obj.shift_minor_fault = `${
          element.shift_batch_wise_array.minor_fault_count
        } / ${convertHHMM(element.shift_batch_wise_array.minor_fault)}`;
        push_obj.shift_minor_fault_count =
          element.shift_batch_wise_array.minor_fault_count;
        push_obj.shift_minor_manual_stop =
          element.shift_batch_wise_array.minor_manual_stop;
        push_obj.shift_minor_manual_stop_count =
          element.shift_batch_wise_array.minor_manual_stop_count;
        push_obj.shift_operator_name =
          element.shift_batch_wise_array.batch_wise[0].operator_name;
        push_obj.condition = element.status.condition;
        push_obj.shift_ready = element.shift_batch_wise_array.ready;
        push_obj.shift_reject_count =
          element.shift_batch_wise_array.reject_count;
        push_obj.shift_buffer_count = 0;
        push_obj.current_timeStamp = moment().local().format();
        var total_fault_count =
          element.shift_batch_wise_array.major_fault_count +
          element.shift_batch_wise_array.minor_fault_count;
        var total_fault_duration =
          element.shift_batch_wise_array.major_fault +
          element.shift_batch_wise_array.minor_fault;
        push_obj.total_fault = `${total_fault_count} / ${convertHHMM(
          total_fault_duration
        )}`;
        push_obj.total_manual_stop = `${
          element.shift_batch_wise_array.major_manual_stop_count +
          element.shift_batch_wise_array.minor_manual_stop_count
        } / ${convertHHMM(
          element.shift_batch_wise_array.major_manual_stop +
            element.shift_batch_wise_array.minor_manual_stop
        )}`;
        var total_downtime = `${
          total_fault_count +
          element.shift_batch_wise_array.major_manual_stop_count +
          element.shift_batch_wise_array.minor_manual_stop_count +
          element.shift_batch_wise_array.ready_count +
          element.shift_batch_wise_array.waiting_count +
          element.shift_batch_wise_array.blocked_count
        } / ${convertHHMM(
          total_fault_duration +
            element.shift_batch_wise_array.major_manual_stop +
            element.shift_batch_wise_array.minor_manual_stop +
            element.shift_batch_wise_array.ready +
            element.shift_batch_wise_array.blocked +
            element.shift_batch_wise_array.waiting
        )}
        `;
        push_obj.total_downtime = total_downtime;
        push_obj.shift_mtbf = convertHHMM(
          MttrValidation(
            Math.round(
              total_fault_count > 0
                ? element.shift_batch_wise_array.ppt_time / total_fault_count
                : element.shift_batch_wise_array.ppt_time
            )
          )
        );
        push_obj.shift_mttr = convertHHMM(
          MttrValidation(Math.round(total_fault_duration / total_fault_count))
        );
        push_obj.shift = element.temp.current_shift;
        push_obj.date = element.temp.date;
        push_obj.shift_changeover_wastage =
          element.shift_batch_wise_array.startup_reject;
        push_obj.shift_executing = convertHHMM(
          element.shift_batch_wise_array.executing
        );
        push_obj.shift_critical_stop =
          element.shift_batch_wise_array.blockedCriticaloff +
          element.shift_batch_wise_array.waitingCriticaloff;
        push_obj.machine_name = element.machine_wise.machine_name;
        push_obj.shift_speed_loss = shift_cal_data.speed_loss;
        push_obj.shift_idel_time = `${
          element.shift_batch_wise_array.idle_count
        } / ${convertHHMM(element.shift_batch_wise_array.idle_time)}`;
        push_obj.shift_idle_time_sec = element.shift_batch_wise_array.idle_time;
        push_obj.shift_idle_count = element.shift_batch_wise_array.idle_count;
        push_obj.shift_totalTheoreticalTime = shift_cal_data.total_time;
        push_obj.shift_totalPlanProdTime = shift_cal_data.ppt_time;
        push_obj.shift_netOperatingTime = shift_cal_data.net_operating_time;
        push_obj.shift_grossOperatingTime = shift_cal_data.got_time;
        push_obj.shift_inProcessRejectTime = shift_cal_data.reject_time;
        push_obj.shift_changeOverWastageTime =
          shift_cal_data.changeover_wastage_time;
        push_obj.shift_performance_time = shift_cal_data.performance_time;
        push_obj.shift_productiveTime = shift_cal_data.productive_time;
        push_obj.shift_oee = (shift_cal_data.oee * 100).toFixed(2);
        push_obj.shift_performance = (shift_cal_data.performance * 100).toFixed(
          2
        );
        push_obj.shift_aviability = (shift_cal_data.aviability * 100).toFixed(
          2
        );
        push_obj.shift_quality = (shift_cal_data.quality * 100).toFixed(2);
        push_obj.shift_major_stop_count =
          element.shift_batch_wise_array.major_fault_count;
        push_obj.shift_avg_speed = average_speed;
        push_obj.total_count = element.shift_batch_wise_array.raw_good_count;
        //batch wise data
        var batch_wise_sort_arr = [];
        var shift_wise_sort_arr = [];
        if (element.status.batch_wise_fault_array.length > 0) {
          batch_wise_sort_arr = element.status.batch_wise_fault_array.sort(
            (a, b) => {
              return b.duration - a.duration;
            }
          );
        }
        if (element.status.shift_wise_fault_array.length > 0) {
          shift_wise_sort_arr = element.status.batch_wise_fault_array.sort(
            (a, b) => {
              return b.duration - a.duration;
            }
          );
        }
        push_obj["batch_fault_1"] = "-";
        push_obj["batch_fault_2"] = "-";
        push_obj["batch_fault_3"] = "-";
        push_obj["batch_fault_4"] = "-";
        push_obj["batch_fault_5"] = "-";
        push_obj["shift_fault_1"] = "-";
        push_obj["shift_fault_2"] = "-";
        push_obj["shift_fault_3"] = "-";
        push_obj["shift_fault_4"] = "-";
        push_obj["shift_fault_5"] = "-";
        push_obj["batch_fault"] = `${
          element.status.batch_wise_major_fault_count
        } / ${convertHHMM(element.status.batch_wise_major_fault_duration)}`;
        var count = 1;
        batch_wise_sort_arr.forEach((fault) => {
          if (fault.fault_code) {
            var fault_name_q = fault_name_obj[element.machine_wise.machine_name]
              ? fault_name_obj[element.machine_wise.machine_name].fault_code
              : "Fault Not defined in Fault Json";
            push_obj[`fault_${count}`] = `${fault_name_q}  ${
              fault.count
            } / ${convertHHMM(Math.round(fault.duration))} `;
            count++;
          }
        });
        //shift wise
        var shift_count = 1;
        shift_wise_sort_arr.forEach((fault) => {
          if (fault.fault_code) {
            var fault_name_q = fault_name_obj[element.machine_wise.machine_name]
              ? fault_name_obj[element.machine_wise.machine_name].fault_code
              : "Fault Not defined in Fault Json";
            push_obj[`fault_${count}`] = `${fault_name_q}  ${
              fault.count
            } / ${convertHHMM(Math.round(fault.duration))} `;
            shift_count++;
          }
        });
        push_obj.batch = element.batch.batch;
        push_obj.target_quantity =
          360 *
          element.fgex.tablet_per_blister *
          element.fgex.bottles_per_case *
          element.fgex.machine_cycle;
        push_obj.batch_size = element.batch.batch_size;
        push_obj["batch_changeover_wastage"] = element.status.startup_reject;
        push_obj["product"] = element.fgex.product_name;
        push_obj["fgex_details"] =
          element.fgex.sku_number +
          " / " +
          element.fgex.rated_speed +
          " / " +
          batch_cycle_count;
        push_obj["fgex"] = element.fgex.fgex;
        push_obj["product_id"] = element.fgex;
        push_obj["batch_total_count"] = batch_good_count + batch_reject_count;
        push_obj["batch_good_count"] =
          element.temp.current_good_value - element.temp.batch_start_good_count;
        push_obj["batch_reject_count"] = batch_reject_count;
        push_obj["changeover_reject_count"] = 0;
        push_obj["batch_waiting"] = `${
          element.status.batch_wise_waiting_count
        } / ${convertHHMM(element.status.batch_wise_waiting_duration)}`;
        push_obj["batch_count"] = `${batch_good_count} / ${batch_reject_count}`;
        push_obj["batch_blocked"] = `${
          element.status.batch_wise_blocked_count
        } / ${convertHHMM(element.status.batch_wise_blocked_duration)}`;
        push_obj["batch_changeover_time"] = `${convertHHMM(
          element.status.batch_wise_changeover_duration
        )}`;
        push_obj["batch_ready"] = `${convertHHMM(
          element.status.batch_wise_ready_duration
        )}`;
        push_obj["batch_manual_stop"] = `${
          element.status.batch_wise_major_manual_stop_count
        } / ${convertHHMM(
          element.status.batch_wise_major_manual_stop_duration
        )}`;
        push_obj["batch_minor_manual_stop"] = `${
          element.status.batch_wise_minor_manual_stop_count
        } / ${convertHHMM(
          element.status.batch_wise_minor_manual_stop_duration
        )}`;
        push_obj["batch_minor_fault"] = `${
          element.status.batch_wise_minor_fault_count
        } / ${convertHHMM(element.status.batch_wise_minor_fault_duration)}`;
        push_obj["batch_start_time"] = moment(element.batch.start_time).format(
          "DD-MM-YYYY - HH:mm:ss"
        );
        push_obj["batch_pdt"] = `${
          element.status.batch_wise_pdt_count
        } / ${convertHHMM(element.status.batch_wise_pdt_duration)}`;
        push_obj["shift"] = element.temp.current_shift;
        push_obj["batch_updt"] = `${
          element.status.batch_wise_updt_count
        } / ${convertHHMM(element.status.batch_wise_updt_duration)}`;
        push_obj["batch_oee"] = await getColour(
          compare_obj,
          "oee",
          (batch_cal_data.oee * 100).toFixed(2),
          " %"
        );
        push_obj["batch_aviability"] = await getColour(
          compare_obj,
          "aviability",
          (batch_cal_data.aviability * 100).toFixed(2),
          " %"
        );
        push_obj["batch_performance"] = await getColour(
          compare_obj,
          "performance",
          (batch_cal_data.performance * 100).toFixed(2),
          " %"
        );
        push_obj["batch_quality"] = await getColour(
          compare_obj,
          "quality",
          (batch_cal_data.quality * 100).toFixed(2),
          " %"
        );
        push_obj["batch_avg_speed"] = await getColour(
          compare_obj,
          "average_speed",
          batch_average_speed,
          ""
        );
        push_obj["batch_mttr"] = batch_cal_data.mttr;
        push_obj["batch_mtbf"] = batch_cal_data.mtbf;
        push_obj["mode"] = element.temp.mode;
        push_obj["batch_speed_loss"] = batch_cal_data.speed_loss;
        push_obj["batch_idel_time"] =
          element.status.batch_wise_minor_manual_stop_count +
          element.status.batch_wise_blocked_count +
          element.status.batch_wise_waiting_count +
          element.status.batch_wise_minor_fault_count +
          element.status.batch_wise_ready_count +
          " / " +
          batch_cal_data.idel_time;
        push_obj["batch_totalTheoreticalTime"] = batch_cal_data.total_time;
        push_obj["batch_cycle_count"] =
          element.temp.current_cycle_count -
          element.temp.batch_start_cycle_count;
        push_obj["batch_totalPlanProdTime"] = batch_cal_data.ppt_time;
        push_obj["batch_netOperatingTime"] = batch_cal_data.net_operating_time;
        push_obj["batch_grossOperatingTime"] = batch_cal_data.got_time;
        push_obj["batch_inProcessRejectTime"] = batch_cal_data.reject_time;
        push_obj["batch_changeOverWastageTime"] =
          batch_cal_data.changeover_wastage_time;
        push_obj["batch_productiveTime"] = batch_cal_data.productive_time;
        push_obj["speed_blisters"] = `${element.temp.bpm} / ${average_speed}`;
        push_obj["state_mode"] = mode_json[element.status.condition];
        push_obj["batch_changover_standard_duration"] =
          changover_standard_duration;
        push_obj["batch_pdt_time"] = element.status.batch_wise_pdt_duration;
        push_obj["batch_updt_time"] = element.status.batch_wise_updt_duration;
        push_obj["batch_ppt_time_sec"] = batch_cal_data.ppt_time_sec;
        push_obj["batch_changeover_time_sec"] =
          element.status.batch_wise_changeover_duration;
        push_obj["batch_start_utc"] = element.batch.start_time;
        push_obj["machine"] = {
          code: element.machine_wise.machine_name,
          name: element.equipment.display_name,
          isCritical:
            element.critical_machine == element.machine_wise.machine_name,
        };
        push_obj["lineName"] = element.line.line_name;
        push_obj["line_id"] = element.line._id;
        push_obj["total_weight"] = 12;
        push_obj["total_no_of_batch"] = 2;
        push_obj["water_use"] = 0;
        push_obj["hallName"] = element.plant
          ? element.plant.plant_name
          : "Please map in database";
        var current_first_fault_name = fault_name_obj[
          element.machine_wise.machine_name
        ]
          ? fault_name_obj[element.machine_wise.machine_name][
              `fault_${element.alarm.current_first_fault}`
            ]
          : "Fault Not Defined in Fault JSON";
        push_obj["current_first_fault"] = {
          name: current_first_fault_name,
          code: element.alarm.current_first_fault,
        };
        push_obj.alarm = push_obj.alarm || [];
        element.alarm.alarm.forEach((alarm) => {
          var alarm_name = fault_name_obj[element.machine_wise.machine_name]
            ? fault_name_obj[element.machine_wise.machine_name][
                `fault_${alarm}`
              ]
            : "Fault Not Defined in Fault JSON";
          push_obj.alarm.push({
            name: alarm_name,
            code: alarm,
          });
        });
        send_array.push(push_obj);
        if (send_array.length == data.length) {
          multi_res = send_array;
          raw_data = data;
          last_update = new Date();
          var line_data = send_array.filter(
            (line) => String(line.line_id) == String(line_id)
          );
          cb(line_data, multi_res, data);
        }
        //loop end
      } else {
        cb(data, data, data);
      }
    });

    inside = false;
  }
}

async function getLiveChartData(line_id, cb) {
  var send_arr = [];
  var addLines = await addLine
    .findOne({ line_id: line_id })
    .populate("line_id");
  var changeover = await changeOver.findOne({ line_id:line_id,changeover_to_date: null });
  var vendor = await vendortrigger.findOne({line_id:line_id, end_date: null });
  add15minCache(line_id, (x, y, data) => {
    var critical_mach = data.find((mac) => {
      return mac.equipment.isCritical;
    });

    var last_machine_data = data.find((mac) => {
      return (addLines.last_machine = mac.equipment.equipment_name);
    });
    var batch_wise_arr = critical_mach.shift_batch_wise_array.batch_wise;
    batch_wise_arr.forEach((element) => {
      var push_obj = {
        _id: element._id,
        // shrink_good_count: last_machine_data.shift_goodCount,
        // shrink_final_count: last_machine_data.shift_cycle_count,
        // line_buffer: critical_machine_data.shift_cycle_count - last_machine_data.shift_cycle_count,
        // sidel_buffer: machine_wise_obj["sidel"].shift_buffer_count,
        // labeler_buffer: machine_wise_obj["labeler"].shift_buffer_count,
        // shrink_buffer: machine_wise_obj["shrink"].shift_buffer_count,
        // filler_buffer: machine_wise_obj["filler"].shift_buffer_count,
        changeover_id: moment(changeover.changeover_start_date)
          .local()
          .format(),
        vender: vendor.vendor_name,
        vendor_start_timestamp: moment(vendor.start_time)
          .local()
          .format("YYYY-MM-DDTHH:mm:ss"),
        vendor_end_timestamp: vendor.end_time,
        minor_manual_stop_crtical_stop: 0,
        major_manual_stop_crtical_stop: 0,
        line_id: line_id,
        filler_critical_off_minor_manual_stop: 0,
        labeler_critical_off_minor_manual_stop: 0,
        shrink_critical_off_minor_manual_stop: 0,
        filler_critical_off_major_manual_stop: 0,
        labeler_critical_off_major_manual_stop: 0,
        shrink_critical_off_major_manual_stop: 0,
        filler_critical_off_blocked: 0,
        labeler_critical_off_blocked: 0,
        shrink_critical_off_blocked: 0,
        filler_critical_off_ready: 0,
        labeler_critical_off_ready: 0,
        shrink_critical_off_ready: 0,
        last_machine_goodcount:
          last_machine_data.shift_batch_wise_array.goodCount,
        line_id: critical_mach.line.line_name,
        line_id_name:critical_mach.line._id,
        plant_id: critical_mach.plant.plant_name,
        location_id: critical_mach.plant.plant_name,
        shift: critical_mach.temp.current_shift,
        machine_name: critical_mach.equipment.display_name,
        cycleCount: element.goodCount,
        case_count: element.goodCount,
        roll_changeover: element.goodCount,
        operator_name: critical_mach.temp.current_operator,
        peak_speed: critical_mach.temp.bpm,
        blister_format: element.fgex.bottles_per_case,
        layout: element.fgex.layout_no,
        product: element.fgex.sku_name,
        //pack: element.fgex.product_name.pack,
        batch_name: element.batch.batch,
        batch_size: element.batch.batch_size,
        t200Use: element.batch.t200CountUse,
        changeover_type: "Product to Product",
        cause: "-",
        remark: "-",
        calculated_reject: element.startup_reject,
        setup_changeover: 0,
        batch_end_type: "batch_end",
        rated_speed: element.rated_speed,
        month: moment().local().format("MMM-YYYY"),
        blocked_count: element.blocked_count,
        waiting_count: element.waiting_count,
        break_pdt: 0,
        co_pdt: element.pdt,
        updt_count: element.updt_count,
        changeover_count: element.changeover_count,
        major_fault_count: element.major_fault_count,
        minor_fault_count: element.minor_fault_count,
        major_manual_stop_count: element.major_manual_stop_count,
        minor_manual_stop_count: element.minor_manual_stop_count,
        mechanical_changeover: 0,
        co_pdt_count: 0,
        break_pdt_count: 0,
        reject_count: element.reject_count,
        pdt_count: 0,
        avg_speed:
          (element.goodCount + element.reject_count) / element.executing,
        performance_time: element.performance_time,
        reject_time: element.reject_time,
        changeover_wastage_time: element.changeover_wastage_time,
        speed_loss: element.speed_loss,
        net_operating_time: element.net_operating_time,
        fgex: element.fgex.sku_number,
        total_idle_time: element.idle_time,
        total_idle_count: 0,
        idle_time: 0,
        idle_count: 0,
        date: critical_mach.temp.date,
        batch_start: element.batch_start_timestamp,
        batch_end: element.batch_end_timestamp,
        changeover_wastage: element.startup_reject,
        planed_production_time: element.ppt_time,
        goodcount: element.goodCount,
        nmx_count: element.goodCount,
        blocked_time: element.blocked,
        waiting_time: element.waiting,
        major_manual_stop_time: element.major_manual_stop,
        minor_manual_stop_time: element.minor_manual_stop,
        pdt_time: element.pdt,
        updt_time: element.updt,
        changeover_time: element.changeover,
        gross_operating_time: element.got_time,
        theoretical_time: element.total_time,
        major_fault_time: element.major_fault,
        minor_fault_time: element.minor_fault,
        good_count_machine: "T200",
        executing: element.executing,
        productive_time: element.productive_time,
      };
      send_arr.push(push_obj);
      if (send_arr.length == batch_wise_arr.length) {
        cb(send_arr);
      }
    });
  });
}

async function getLiveChartDataAllMachine(line_id,cb){
  var send_data = [];
  var tempData = await TempGood.findOne({line_id:line_id}).populate({ path: "currnt_batch", populate: { path: "product_name" } }).populate("vendor");
  add15minCache(line_id, (x, y, data) => {
    data.forEach(element => {
      var shift_data = {...element.shift_batch_wise_array};
      delete shift_data.batch_wise;
      shift_data.temp = tempData;
      send_data.push(shift_data);
      if(send_data.length == data.length){
        cb(send_data);
      }
    });
  });
}
//dashboard
router.get("/dashboard", async (req, res) => {
  var line_id = req.query.line_id;
  if (!line_id) {
    res.send("Please send line id");
    return;
  }
  add15minCache(line_id, (data, x, y) => {
    // var = { ...data };
    // raw.raw = {};
    res.send(data);
  });
});

//dsahboard chart
router.get("/livechart", async (req, res) => {
  var line_id = req.query.line_id;
  if (!line_id) {
    res.send("Please send line id");
    return;
  }
  getLiveChartDataAllMachine(line_id, (data) => {
    res.send(data);
  });
});
router.get("/operator", async (req, res) => {
  var line_id = req.query.line_id;
  //console.log(line_id)
  var send_data = [];
  var data = await Roster.find({
    line_id: line_id,
    date: {
      $gte: new Date(req.query.startdate),
      $lte: new Date(req.query.endate),
    },
  });
  if (data.length == 0) {
    res.send([]);
  } else {
    data.forEach((element, i) => {
      var shift_A_obj = element.shift_wise.find(
        (shift) => shift.shift_name == "Shift A"
      );
      var shift_B_obj = element.shift_wise.find(
        (shift) => shift.shift_name == "Shift B"
      );
      var shift_C_obj = element.shift_wise.find(
        (shift) => shift.shift_name == "Shift C"
      );
      send_data.push({
        date: element.date,
        OperatorIdShiftA: shift_A_obj ? shift_A_obj.operator_name : null,
        OperatorIdShiftB: shift_B_obj ? shift_B_obj.operator_name : null,
        OperatorIdShiftC: shift_C_obj ? shift_C_obj.operator_name : null,
      });
      if (i + 1 == data.length) {
        res.send(send_data);
      }
    });
  }
});
//run on refresh
// add15minCache("60792675ccb6b07e81dd75c5",()=>{
// });
function checkNumber(number) {
  if (number < 10) {
    return `0${number}`;
  } else {
    return number;
  }
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

function MttrValidation(value) {
  if (value < 0 || value === Infinity || !value) {
    return 0;
  } else {
    return value;
  }
}
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
  ready,
  cip
) {
  var data = {};
  var total_count = goodCount + reject_count;
  var ppt_time = total_batch_time - pdt - updt - cip;
  var got_time = ppt_time - major_fault - major_manual_stop - changeover;
  //console.log(ppt_time,changeover,major_fault,major_manual_stop,got_time,updt)
  if (got_time < 70) {
    got_time = 0;
  }
  var performance_time = convertMinutes(got_time) - total_count / rated_speed;
  var reject_time = Math.floor((reject_count / rated_speed) * 60);
  var changeover_wastage_time = Math.floor(
    (changeover_reject / rated_speed) * 60
  );
  var idle_time = blocked + waiting + minor_manual_stop + minor_fault + ready;
  var speed_loss = performance_time * 60 - idle_time;
  var net_operating_time = got_time - idle_time - speed_loss;
  var productive_time = net_operating_time - reject_time; //- changeover_wastage_time;
  data.performance = MttrValidation(
    total_count / (rated_speed * convertMinutes(got_time))
  );
  data.quality = checkValidation(goodCount / total_count);
  data.aviability = checkValidation(got_time / ppt_time);
  data.idel_time = convertHHMM(idle_time);
  data.ppt_time = convertHHMM(ppt_time);
  data.ppt_time_sec = ppt_time;
  data.speed_loss = convertHHMM(Math.floor(speed_loss));
  data.performance_time = convertHHMM(Math.floor(performance_time * 60));
  data.oee = data.quality * data.aviability * data.performance;
  data.mtbf = convertHHMM(
    MttrValidation(
      Math.round(
        major_fault_count > 0 ? ppt_time / major_fault_count : ppt_time
      )
    )
  );
  data.mttr = convertHHMM(
    MttrValidation(Math.round(major_fault / major_fault_count))
  );
  data.got_time = convertHHMM(Math.round(got_time));
  data.total_time = convertHHMM(total_batch_time);
  data.reject_time = convertHHMM(reject_time);
  data.changeover_wastage_time = convertHHMM(changeover_wastage_time);
  data.net_operating_time = convertHHMM(Math.floor(net_operating_time));
  data.productive_time = convertHHMM(Math.floor(productive_time));
  return data;
}
//shift wise calulatio
function Shiftcalculation(
  total_batch_time,
  ppt_time,
  got_time,
  performance_time,
  net_operating_time,
  idle_time,
  reject_time,
  changeover_wastage_time,
  productive_time
) {
  var data = {};
  var speed_loss = performance_time - idle_time;
  data.performance = MttrValidation(net_operating_time / got_time);
  data.quality = checkValidation(productive_time / net_operating_time);
  data.aviability = checkValidation(got_time / ppt_time);
  data.idle_time = convertHHMM(idle_time);
  data.ppt_time = convertHHMM(ppt_time);
  data.speed_loss = convertHHMM(Math.floor(speed_loss));
  data.performance_time = convertHHMM(Math.floor(performance_time));
  data.oee = data.quality * data.aviability * data.performance;
  //data.mtbf = convertHHMM(MttrValidation(Math.round(ppt_time / major_fault_count)));
  //data.mttr = convertHHMM(MttrValidation(Math.round(major_fault / major_fault_count)));
  data.got_time = convertHHMM(Math.round(got_time));
  data.total_time = convertHHMM(total_batch_time);
  data.reject_time = convertHHMM(reject_time);
  data.changeover_wastage_time = convertHHMM(changeover_wastage_time);
  data.net_operating_time = convertHHMM(Math.floor(net_operating_time));
  data.productive_time = convertHHMM(Math.floor(productive_time));
  return data;
}

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
//function check major minor
function checkMajorMinor(duration) {
  if (duration > major_minor_count_sec) {
    return "major";
  } else {
    return "minor";
  }
}
function convertMinutes(totalSeconds) {
  h = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  m = Math.floor(totalSeconds / 60);
  return h * 60 + m;
}
module.exports = {
  router,
  add15minCache,
  getLiveChartData,
  getLiveChartDataAllMachine
};
