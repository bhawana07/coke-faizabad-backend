var express = require("express");
var router = express.Router();
var moment = require("moment");
var mongoose = require("mongoose");
const axios = require('axios');
var Project = require("../model/project.model");
var { Stop, aggregate } = require("../model/stop.model");
var { History } = require("../model/history.model");
var { CurrentShift, Shift } = require("../model/shift.model");
const major_minor_duration = 5;
var { addLine } = require("../model/addLine.model");
var { Project } = require("../model/project.model");


//var { conveyormachine } = require("../model/equipment.model");
//var {getReworkDateRange,getReworkShiftWise} = require('../model/rework.model');

router.get("/daywise", async (req, res) => {
  var project_start = req.query["startDate"] + "T00:00:00.000+00:00";
  var project_end = req.query["endDate"] + "T00:00:00.000+00:00";
  var project = await Project.aggregate([
    {
      $match: {
        machine_name: "filler",
        $and: [
          {
            date: {
              $lte: new Date(project_end),
            },
          },
          {
            date: {
              $gte: new Date(project_start),
            },
          },
        ],
      },
    },
    {
      $group: {
        _id: "$date",
        goodCount: {
          $sum: "$goodCount",
        },
        rejected_quantity: {
          $sum: "$rejected_quantity",
        },
        critical_machine_off_time: {
          $sum: "$critical_machine_off_time",
        },
        critical_machine_off: {
          $sum: "$critical_machine_off",
        },
        blocked: {
          $sum: "$blocked",
        },
        waiting: {
          $sum: "$waiting",
        },
        no_of_stop: {
          $sum: "$no_of_stop",
        },
        pdt: {
          $sum: "$pdt",
        },
        fault: {
          $sum: "$stop",
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]);
  var rated_speed = 16;
  var total_time = 1440;
  var send_data = [];
  var para = req.query.parameter.split(",");
  para.forEach((data) => {
    send_data.push({
      name: data,
      data: [],
    });
  });
  project.forEach((data) => {
    var push_data = {};
    var fault_time = data.fault.toFixed(2);
    var fault_count = data.no_of_stop;
    var waiting_time = data.waiting.toFixed(2);
    var blocked_time = data.blocked.toFixed(2);
    var pdt = data.pdt.toFixed(2);
    var working_time = total_time - pdt;
    var total_working_time = working_time - fault_time;
    var aviability = (working_time - fault_time) / working_time;
    var total_count = data.goodCount + data.rejected_quantity;
    var performance = total_count / (rated_speed * (working_time - fault_time));
    var quality = data.goodCount / total_count;
    var break_down = fault_time / total_time;
    if (aviability < 0 || aviability == Infinity) {
      aviability = 0;
    }
    if (!performance || performance == Infinity || performance < 0) {
      performance = 0;
    }
    if (performance > 1) {
      performance = 1;
    }
    if (break_down > 1) {
      performance = 1;
    }
    if (!quality || quality == Infinity || quality < 0) {
      quality = 0;
    }
    if (!break_down || break_down == Infinity || break_down < 0) {
      break_down = 0;
    }
    if (quality > 1) {
      quality = 1;
    }
    var oee = aviability * performance * quality;
    if (!oee || oee == Infinity || oee < 0) {
      oee = 0;
    }
    if (oee > 1) {
      oee = 1;
    }
    push_data["date"] = data._id;
    var timestamp = moment(data._id).unix() * 1000;
    (push_data["machine_name"] = "Filler"),
      (push_data["oee"] = Number((oee * 100).toFixed(2)));
    push_data["break_down"] = Number((break_down * 100).toFixed(2));
    push_data["performance"] = Number((performance * 100).toFixed(2));
    push_data["fault_time"] = Number(fault_time);
    push_data["waiting_time"] = Number(waiting_time);
    push_data["aviability"] = Number((aviability * 100).toFixed(2));
    push_data["quality"] = Number((quality * 100).toFixed(2));
    push_data["no_of_stop"] = Number(fault_count);
    push_data["good_count"] = Number(data.goodCount);
    push_data["total_count"] = Number(total_count);
    push_data["rejected_quantity"] = Number(data.rejected_quantity);
    para.forEach((parameter) => {
      var parameter_find = send_data.find((data) => data.name == parameter);
      parameter_find.data.push([timestamp, push_data[parameter]]);
    });
    //send_data.push([timestamp,Number((oee * 100).toFixed(2))])
  });
  res.send(send_data);
});
router.get("/shiftwise", async (req, res) => {
  var project_start = req.query["startDate"] + "T00:00:00.000+00:00";
  var project_end = req.query["endDate"] + "T00:00:00.000+00:00";
  var send_data = [];
  var para = req.query.parameter.split(",");
  para.forEach((data) => {
    send_data.push({
      name: data,
      data: [],
    });
  });
  var project = await Project.find({
    machine_name: "filler",
    date: {
      $lte: new Date(project_end),
      $gte: new Date(project_start),
    },
  }).sort({
    date: 1,
    shiftName: 1,
  });
  var rated_speed = 16;
  var total_time = 720;

  project.forEach((data) => {
    var push_data = {};
    var fault_time = data.stop.toFixed(2);
    var fault_count = data.no_of_stop;
    var waiting_time = data.waiting.toFixed(2);
    var blocked_time = data.blocked.toFixed(2);
    var pdt = data.pdt.toFixed(2);
    var working_time = total_time - pdt;
    var total_working_time = working_time - fault_time;
    var aviability = Number((working_time - fault_time) / working_time).toFixed(
      2
    );
    var total_count = data.goodCount + data.rejected_quantity;
    var performance = Number(
      total_count / (rated_speed * (working_time - fault_time))
    ).toFixed(2);
    var quality = Number(data.goodCount / total_count).toFixed(2);
    var break_down = fault_time / total_time;
    if (aviability < 0 || aviability == Infinity) {
      aviability = 0;
    }
    if (!performance || performance == Infinity || performance < 0) {
      performance = 0;
    }
    if (performance > 1) {
      performance = 1;
    }
    if (break_down > 1) {
      performance = 1;
    }
    if (!quality || quality == Infinity || quality < 0) {
      quality = 0;
    }
    if (!break_down || break_down == Infinity || break_down < 0) {
      break_down = 0;
    }
    if (quality > 1) {
      quality = 1;
    }
    var oee = Number(aviability * performance * quality).toFixed(2);
    if (!oee || oee == Infinity || oee < 0) {
      oee = 0;
    }
    if (oee > 1) {
      oee = 1;
    }
    var timestamp;
    if (data.shiftName == "Shift A") {
      timestamp = moment(data.date).add(8, "hours").unix() * 1000;
    } else {
      timestamp = moment(data.date).add(20, "hours").unix() * 1000;
    }

    push_data["performance"] = Number((performance * 100).toFixed(2));
    push_data["break_down"] = Number((break_down * 100).toFixed(2));
    push_data["oee"] = Number((oee * 100).toFixed(2));
    push_data["fault_time"] = Number(fault_time);
    push_data["waiting_time"] = Number(waiting_time);
    push_data["aviability"] = Number((aviability * 100).toFixed(2));
    push_data["quality"] = Number((quality * 100).toFixed(2));
    push_data["no_of_stop"] = Number(fault_count);
    push_data["good_count"] = Number(data.goodCount);
    push_data["total_count"] = Number(total_count);
    push_data["rejected_quantity"] = Number(data.rejected_quantity);
    para.forEach((parameter) => {
      var parameter_find = send_data.find((data) => data.name == parameter);
      parameter_find.data.push([
        timestamp,
        push_data[parameter],
        data.shiftName,
      ]);
    });
    //send_data.push([timestamp,Number((oee * 100).toFixed(2)),push_data['shift']]);
  });
  res.send(send_data);
});
router.get("/oeeloss", async (req, res) => {
  var project_start = req.query["startDate"] + "T00:00:00.000+00:00";
  var project_end = req.query["endDate"] + "T00:00:00.000+00:00";
  var project = await Project.aggregate([
    {
      $match: {
        $and: [
          {
            date: {
              $lte: new Date(project_end),
            },
          },
          {
            date: {
              $gte: new Date(project_start),
            },
          },
        ],
      },
    },
    {
      $project: {
        machine_name: 1,
        duration: {
          $cond: {
            if: {
              $eq: ["$machine_name", "filler"],
            },
            then: {
              $round: ["$stop", 2],
            },
            else: {
              $round: ["$critical_machine_off_time", 2],
            },
          },
        },
      },
    },
    // Stage 1
    {
      $group: {
        _id: "$machine_name",
        sum: {
          $sum: "$duration",
        },
      },
    },
    // Stage 2
    {
      $group: {
        _id: null,
        total_sum: {
          $sum: "$sum",
        },
        machine_name: {
          $push: {
            machine_name: "$_id",
            duration: "$sum",
          },
        },
      },
    },
    // Stage 3
    {
      $unwind: {
        path: "$machine_name",
      },
    },
    {
      $project: {
        _id: 0,
        name: "$machine_name.machine_name",
        duration: {
          $round: ["$machine_name.duration", 2],
        },
        y: {
          $round: [
            {
              $multiply: [
                {
                  $divide: ["$machine_name.duration", "$total_sum"],
                },
                100,
              ],
            },
            2,
          ],
        },
        drilldown: "$machine_name.machine_name",
      },
    },
    {
      $match: {
        duration: {
          $gt: 0,
        },
      },
    },
    {
      $sort: {
        duration: -1,
      },
    },
  ]);
  res.send(project);
});
router.get("/shift", async (req, res) => {
  var date = req.query["date"] + "T00:00:00.000Z";
  var shift = req.query.shift;
  var type = req.query.type;
  var line_id = req.query.line_id;
  var total_time, start_timestamp, end_timestamp, shift;
  var current_shift = await Shift.findOne({ shiftName: shift });
  var machie_arr = [];
  if (type == "machine") {
    var data = await Project.findOne({
      shiftName: shift,
      date: req.query["date"] + "T00:00:00Z",
    }).populate({
      path: "sku",
      select: { _id: 0, equipments: 1 },
      populate: { path: "equipments", select: { _id: 0, equipment_name: 1 } },
    });
    if (!data) {
      res.send({
        line_id: line_id,
        shiftname: shift,
        shiftStartime: start_timestamp,
        shiftEndime: end_timestamp,
        data: [],
      });
      return;
    }
    data.sku.equipments.forEach((element) => {
      machie_arr.push(element.equipment_name);
    });
  } else {
    machie_arr = await conveyormachine();
  }
  start_timestamp =
    req.query["date"] +
    "T" +
    moment.utc(current_shift.shiftStartTime * 60000).format("HH:mm:ss");
  if (current_shift.shiftEndTime > current_shift.shiftStartTime) {
    end_timestamp =
      req.query["date"] +
      "T" +
      moment.utc(current_shift.shiftEndTime * 60000).format("HH:mm:ss");
  } else {
    end_timestamp =
      moment(req.query["date"]).add(1, "days").format("YYYY-MM-DD") +
      "T" +
      moment.utc(current_shift.shiftEndTime * 60000).format("HH:mm:ss");
  }
  var current_timestamp = moment().local().format();
  var project = await Project.aggregate([
    {
      $match: {
        machine_name: { $in: machie_arr },
        shiftName: shift,
        date: new Date(date),
      },
    },
    {
      $addFields: {
        rated_speed: {
          $switch: {
            branches: [
              { case: { $eq: ["$machine_name", "tmgcp"] }, then: 12 },
              {
                case: { $eq: ["$machine_name", "weigher_case_sealer"] },
                then: 12,
              },
              { case: { $eq: ["$machine_name", "pallet_id"] }, then: 0.2315 },
              { case: { $eq: ["$machine_name", "palletizer"] }, then: 0.2315 },
            ],
            default: 60,
          },
        },
      },
    },
    {
      $lookup: {
        from: "stops",
        let: { machine_name: "$machine_name" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$machine_name", "$$machine_name"] },

                  {
                    $or: [
                      {
                        $and: [
                          {
                            $lte: ["$start_time", new Date(start_timestamp)],
                          },
                          {
                            $gte: ["$end_time", new Date(start_timestamp)],
                          },
                        ],
                        $and: [
                          {
                            $lte: ["$start_time", new Date(end_timestamp)],
                          },
                          {
                            $gte: ["$end_time", new Date(end_timestamp)],
                          },
                        ],
                        $and: [
                          {
                            $gte: ["$start_time", new Date(start_timestamp)],
                          },
                          {
                            $lte: ["$end_time", new Date(end_timestamp)],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
        as: "stops",
      },
    },
    // {
    //     $lookup: {
    //         from: 'equipment',
    //         localField: 'machine_name',
    //         foreignField: 'equipment_name',
    //         as: 'equipments'
    //     }
    // },
    // {
    // $lookup: {
    // from: 'status',
    // localField: 'machine_name',
    // foreignField: 'machine_name',
    // as: 'condition'
    // }
    // },
    // {
    //     $unwind:{
    //         path:'$equipments',
    //         preserveNullAndEmptyArrays: true

    //     }
    // },
    // {
    //     $lookup: {
    //         from: 'skumasters',
    //         let: {
    //             sku_name: "$current_sku",
    //             equipment: "$equipments._id"
    //         },
    //         pipeline: [
    //             {
    //                 $match: {
    //                     $expr: {
    //                         $eq: ['$sku_name', '$$sku_name'],
    //                     }
    //                 }
    //             },
    //             {
    //                 $project:{
    //                     equipment_id:{
    //                         "$toObjectId":"$$equipment"
    //                     },
    //                     equipment:1
    //                 }
    //             },
    //             {
    //                 $project:
    //                     {
    //                         items: {
    //                              $filter: {
    //                                  input: "$equipment",
    //                                   as: "equipment",
    //                                   cond: { $eq: ["$$equipment.equipment_name", '$equipment_id'] }
    //                                 }
    //                             }
    //                         }
    //             },
    //             {
    //                 $unwind:{
    //                     path:'$items',
    //                     preserveNullAndEmptyArrays: true

    //                 }
    //             },

    //         ],
    //         as: 'sku'
    //     }
    // },

    // {
    //     $unwind:{
    //         path: "$equipment",
    //     }
    // },
    // {
    //     $lookup:{
    //         from:'equipment',
    //         localField:'equipment.equipment_name',
    //         foreignField:'_id',
    //         as:'equipment'
    //     }
    // },
    // {
    //     $unwind:{
    //         path:'$sku',
    //         preserveNullAndEmptyArrays: true

    //     }
    // },
    {
      $project: {
        //rated_speed: "$sku.items.rated_speed",
        //equipment: "$equipments",
        machine_name: 1,
        condition: 1,
        rated_speed: 1,
        critical_machine_off: 1,
        critical_machine_off_time: 1,
        goodCount: 1,
        rejected_quantity: 1,
        bpm: 1,
        mode: 1,
        stop: "$stops",
      },
    } /* , {
            $project: {
                rated_speed: 1,
                equipment: 1,
                machine_name: 1,
                rated_speed: 1,
                condition: 1,
                goodCount: 1,
                bpm:1,
                mode:1,
                rejected_quantity: 1,
                critical_machine_off: 1,
                critical_machine_off_time: 1,
                fault: {
                    $filter: {
                        input: "$stop",
                        as: "stop",
                        cond: { $eq: ["$$stop._id", 'fault'] }
                    }
                },
                waiting: {
                    $filter: {
                        input: "$stop",
                        as: "stop",
                        cond: { $eq: ["$$stop._id", 'waiting'] }
                    }
                },
                blocked: {
                    $filter: {
                        input: "$stop",
                        as: "stop",
                        cond: { $eq: ["$$stop._id", 'blocked'] }
                    }
                },
                manual_stop: {
                    $filter: {
                        input: "$stop",
                        as: "stop",
                        cond: { $eq: ["$$stop._id", 'manual_stop'] }
                    }
                },
            }
        },
        {
            $unwind: {
                path: '$fault',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $unwind: {
                path: '$blocked',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $unwind: {
                path: '$manual_stop',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $unwind: {
                path: '$condition',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $unwind: {
                path: '$waiting',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $project: {
                fault: { $ifNull: ["$fault", 0] },
                blocked: 1,
                manual_stop: 1,
                waiting: { $ifNull: ["$waiting", 0] },
                critical_machine_off: 1,
                condition: 1,
                goodCount: 1,
                bpm:1,
                mode:1,
                rejected_quantity: 1,
                rated_speed: 1,
                critical_machine_off_time: 1,
                lack_1: {
                    $filter: {
                        input: "$waiting.stop_breakup",
                        as: "stop",
                        cond: { $eq: ["$$stop.stop_name", 'waiting_1'] }
                    }
                },
                lack_2: {
                    $filter: {
                        input: "$waiting.stop_breakup",
                        as: "stop",
                        cond: { $eq: ["$$stop.stop_name", 'waiting_2'] }
                    }
                },
                machine_name: 1
            }
        }, 
        {
            $unwind: {
                path: '$lack_1',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $unwind: {
                path: '$lack_2',
                preserveNullAndEmptyArrays: true

            }
        },
        
        {
            $project: {
                aviability: {
                    $cond: [{ $lte: ['$fault', 0] }, 100, {
                        $round: [{
                                $divide: [{
                                    $subtract: [
                                        total_time,
                                        '$fault.total'
                                    ]
                                }, total_time]
                        }, 2]
                    }]
                },
                performance: {
                    $cond: [{
                        $or: [
                            { $lte: [{
                                $subtract: [
                                    total_time,
                                    '$fault.total'
                                ]
                            }, 0] },
                            { $lte: ['$goodCount', 0] },
                        ]
                    }, 0, {
                        $round: [{
                                $divide: ['$goodCount', {
                                    $multiply: [
                                        {
                                            $subtract: [
                                                total_time,
                                                '$fault.total'
                                            ]
                                        },
                                        '$rated_speed'
                                    ]
                                }]
                        }, 2]
                    }]
                },
                quality: {
                    $cond: [{ $lte: ["$goodCount", 0] }, 0, {
                        $round: [{
                                $divide: ['$goodCount', {
                                    $sum: [
                                        '$goodCount',
                                        '$rejected_quantity'
                                    ]
                                }]

                        }, 2]
                    }]
                },
                mttr:{
                    $cond: [{ $lte: ['$fault', 0] }, 'N/A', {
                        $round: [{
                                $divide: ['$fault.total','$fault.count']
                        }, 2]
                    }]
                },
                mtbf:{
                    $cond: [{ $lte: ['$fault', 0] }, 0, {
                        $round: [{
                                $divide: [total_time,'$fault.count']
                        }, 2]
                    }]
                },
                lack_1: { $ifNull: [{$concat:[{$toString:"$lack_1.stop_count"},"/",{$toString:"$lack_1.stop_total"}]}, "0/0"] },
                lack_2:  { $ifNull: [{$concat:[{$toString:"$lack_2.stop_count"},"/",{$toString:"$lack_2.stop_total"}]}, "0/0"] }, 
                machine_name:"$machine_name",
                total_count:'$goodCount',
                blocked:{ $ifNull: [{$concat:[{$toString:"$blocked.count"},"/",{$toString:"$blocked.total"}]}, "0/0"] },
                filler_min:{$round:['$critical_machine_off_time',2]},
                filler_stop:{$round:['$critical_machine_off',2]},
                shift: shift,
                no_of_stop:{ $ifNull: ["$fault.count", 0] },
                bpm:"$bpm",
                fault_duration:"$fault.total",
                mode:"$mode",/////
                condition:"$condition.current_condition",
                current_timestamp:current_timestamp,
                rejected_quantity:1,
            },
        },
        {
            $project:{
                oee:{
                    $round:[{
                        $multiply:['$performance','$quality','$aviability',100]
                    },2]
                    
                },
                lack_1: 1,
                lack_2:  1,
                performance:{$multiply:['$performance',100]},
                quality:{$multiply:['$quality',100]},
                aviability:{$multiply:['$aviability',100]},
                machine:'$machine_name',
                total_count:1,
                blocked:1,
                filler_min:1,
                filler_stop:1,
                shift: shift,
                time_loss:"0",
                bottle_loss:"0",
                bpm:1,
                mttr:1,
                no_of_stop:1,
                mode:"$mode",
                mtbf:1,
                condition:1,
                fault_duration:1,
                total_time:{ $ifNull: [total_time, 0] },
                current_timestamp:current_timestamp,
                rejected_quantity:1,
            }
        } */,
  ]);
  res.send(project);
});
router.get("/faultwise", async (req, res) => {
  var startDate = req.query["startDate"] + "T08:00:00+05:30";
  var end = req.query["endDate"] + "T08:00:00+05:30";
  var machine_name = req.query["machine"];
  var start = moment(start);
  var endDate = moment(end).local().add(1, "day").format();
  var line_id = req.query.line_id;
  if (!line_id) {
    res.status(404).send("Please send Line id");
    return;
  }
  var stop = await Stop.aggregate([
    {
      $match: {
        stop_name: /^fault_/,
        machine_name: machine_name,
        line_id: mongoose.Types.ObjectId(line_id),
        $or: [
          {
            end_time: null,
          },
          {
            $and: [
              {
                start_time: {
                  $lte: new Date(startDate),
                },
              },
              {
                end_time: {
                  $gte: new Date(startDate),
                },
              },
            ],
          },
          {
            $and: [
              {
                start_time: {
                  $lte: new Date(endDate),
                },
              },
              {
                end_time: {
                  $gte: new Date(endDate),
                },
              },
            ],
          },
          {
            $and: [
              {
                start_time: {
                  $gte: new Date(startDate),
                },
              },
              {
                end_time: {
                  $lte: new Date(endDate),
                },
              },
            ],
          },
        ],
      },
    },
    {
      $project: {
        stop_name: 1,
        machine_name: 1,
        start: {
          $cond: {
            if: { $lt: ["$start_time", new Date(startDate)] },
            then: new Date(startDate),
            else: "$start_time",
          },
        },
        end: {
          $switch: {
            branches: [
              { case: { $eq: ["$end_time", null] }, then: new Date() },
              {
                case: { $gt: ["$end_time", new Date(endDate)] },
                then: new Date(endDate),
              },
            ],
            default: "$end_time",
          },
        },
      },
    },
    {
      $project: {
        stop_name: 1,
        machine_name: 1,
        dateDifference: {
          $divide: [
            {
              $subtract: ["$end", "$start"],
            },
            1000 * 60,
          ],
        },
      },
    },
    {
      $group: {
        _id: "$stop_name",
        sum: {
          $sum: "$dateDifference",
        },
      },
    },
    {
      $group: {
        _id: null,
        total_sum: {
          $sum: "$sum",
        },
        stop_name: {
          $push: {
            stop_name: "$_id",
            duration: "$sum",
          },
        },
      },
    },
    {
      $unwind: {
        path: "$stop_name",
      },
    },
    {
      $project: {
        _id: 0,
        name: "$stop_name.stop_name",
        duration: {
          $round: ["$stop_name.duration", 2],
        },
        y: {
          $round: [
            {
              $multiply: [
                {
                  $divide: ["$stop_name.duration", "$total_sum"],
                },
                100,
              ],
            },
            2,
          ],
        },
      },
    },
    {
      $match: {
        duration: {
          $gt: 1,
        },
      },
    },
    {
      $sort: {
        duration: -1,
      },
    },
  ]);
  res.send(stop);
});

router.get("/state_wise_report", async (req, res) => {
  var date = req.query["date"] + "T00:00:00.000Z";
  var shift = req.query.shift;
  var state = new RegExp(req.query.machine_state);
  var total_time, start_timestamp, end_timestamp, shift;
  var line_id = req.query.line_id;
  if (!line_id) {
    res.status(404).send("Please send Line id");
    return;
  }
  var current_shift = await Shift.findOne({ shiftName: shift });
  start_timestamp =
    req.query["date"] +
    "T" +
    moment.utc(current_shift.shiftStartTime * 60000).format("HH:mm:ss");
  if (current_shift.shiftEndTime > current_shift.shiftStartTime) {
    end_timestamp =
      req.query["date"] +
      "T" +
      moment.utc(current_shift.shiftEndTime * 60000).format("HH:mm:ss");
  } else {
    end_timestamp =
      moment(req.query["date"]).add(1, "days").format("YYYY-MM-DD") +
      "T" +
      moment.utc(current_shift.shiftEndTime * 60000).format("HH:mm:ss");
  }
  var current_timestamp = moment().local().format();
  if (req.query.machine_state == "all") {
    var project = await Stop.aggregate([
      {
        $match: {
          //stop_name: state,
          line_id: mongoose.Types.ObjectId(line_id),
          $or: [
            {
              end_time: null,
            },
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(start_timestamp),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(start_timestamp),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(end_timestamp),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(end_timestamp),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $gte: new Date(start_timestamp),
                  },
                },
                {
                  end_time: {
                    $lte: new Date(end_timestamp),
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $lookup: {
          from: "statusnames",
          let: { line_id: "$line_id", stop_name: "$stop_name" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$line_id", "$$line_id"],
                    },
                    {
                      $eq: ["$fault_code", "$$stop_name"],
                    },
                  ],
                },
              },
            },
          ],
          as: "status_name",
        },
      },
      {
        $lookup: {
          from: "equipment",
          let: { line_id: "$line_id", equipment_name: "$machine_name" },
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
          as: "machine_name",
        },
      },
      {
        $lookup: {
          from: "comments",
          let: { stop_id: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$stop_id", "$$stop_id"] } } },
            {
              $lookup: {
                from: "faultcauses",
                let: { selected_causes: { $ifNull: ["$selected_causes", []] } },
                pipeline: [
                  { $match: { $expr: { $in: ["$_id", "$$selected_causes"] } } },
                ],
                as: "selected_causes",
              },
            },
            {
              $project: {
                selected_causes: 1,
                parts: 1,
                user_comment: {
                  $map: {
                    input: "$user_comment",
                    as: "comment",
                    in: {
                      username: "$$comment.user_name",
                      comment: "$$comment.comment",
                      comment_date: {
                        $dateToString: {
                          format: "%Y-%m-%dT%H:%M:%S.%L",
                          date: "$$comment.timestamp",
                          timezone: "+04:00",
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "rosters",
          let: { date: "$date", shift: "$shift" },
          pipeline: [
            { $match: { $expr: { $eq: ["$date", "$$date"] } } },
            // {
            //     $project: {
            //          operator: {
            //             $filter: {
            //               input: "$shift_wise",
            //               as: "shift_name",
            //               cond: { $eq: ["$$shift_name.shift_name", "$$shift"] },
            //             },
            //           }
            //     }
            // },
            // {
            //     $lookup: {
            //         from: 'faultcauses',
            //         let: { 'selected_causes': '$selected_causes' },
            //         pipeline: [
            //             { '$match': { '$expr': { '$in': ['$_id', '$$selected_causes'] } } },
            //         ],
            //         as: "selected_causes"
            //     }
            // },
          ],
          as: "roster",
        },
      },
      {
        $unwind: {
          path: "$status_name",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$roster",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$machine_name",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$comments",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          start_time: {
            $switch: {
              branches: [
                {
                  case: { $lte: ["$start_time", new Date(start_timestamp)] },
                  then: new Date(start_timestamp),
                },
                {
                  case: { $gt: ["$start_time", new Date(end_timestamp)] },
                  then: new Date(end_timestamp),
                },
              ],
              default: "$start_time",
            },
          },
          end_time: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$end_time", null] },
                  then: new Date(end_timestamp),
                },
                {
                  case: { $gt: ["$end_time", new Date(end_timestamp)] },
                  then: new Date(end_timestamp),
                },
              ],
              default: "$end_time",
            },
          },
          machine_name: "$machine_name.display_name",
          status_name: "$status_name",
          roster: "$roster",
          parts: {
            $reduce: {
              input: "$comments.parts",
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                  "$$this",
                ],
              },
            },
          },
          selected_causes: "$comments.selected_causes.cause_name",
          user_comment1: { $arrayElemAt: ["$comments.user_comment", 0] },
          stop_name: 1,
        },
      },
      {
        $lookup: {
          from: "batchskutriggers",
          localField: "batch",
          foreignField: "_id",
          as: "batch",
        },
      },
      {
        $lookup: {
          from: "fgexes",
          localField: "fgex",
          foreignField: "_id",
          as: "fgex",
        },
      },
      {
        $project: {
          stop_name: 1,
          machine_name: 1,
          roster: 1,
          start_time: {
            $dateToString: {
              format: "%Y-%m-%dT%H:%M:%S.%L",
              date: "$start_time",
              timezone: "+04:00",
            },
          },
          end_time: {
            $dateToString: {
              format: "%Y-%m-%dT%H:%M:%S.%L",
              date: "$end_time",
              timezone: "+04:00",
            },
          },
          fault_name: {
            $ifNull: ["$status_name.fault_name", "Not Define in Database"],
          },
          batch: "$batch.batch",
          fgex: "$fgex.fgex",
          shift: "$shift",
          date: "$date",
          operator_name: "$roster",
          parts: { $ifNull: ["$parts", ""] },
          user_comment1: {
            $ifNull: ["$user_comment1", {}],
          } /* {
                    username:"$user_comment1.user_name",
                    comment_date:"$user_comment1.timestamp",
                    comment:"$user_comment1.comment"
                } */,
          fault_cause: {
            $ifNull: [
              {
                $reduce: {
                  input: "$selected_causes",
                  initialValue: "",
                  in: {
                    $concat: [
                      "$$value",
                      { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                      "$$this",
                    ],
                  },
                },
              },
              "",
            ],
          },
          duration: {
            $round: [
              {
                $divide: [
                  {
                    $subtract: ["$end_time", "$start_time"],
                  },
                  1000 * 60,
                ],
              },
              2,
            ],
          },
        },
      },
      {
        $match: {
          $expr: {
            $gt: ["$duration", 0],
          },
        },
      },
    ]);
  } else {
    var project = await Stop.aggregate([
      {
        $match: {
          stop_name: state,
          line_id: mongoose.Types.ObjectId(line_id),
          $or: [
            {
              end_time: null,
            },
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(start_timestamp),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(start_timestamp),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(end_timestamp),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(end_timestamp),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $gte: new Date(start_timestamp),
                  },
                },
                {
                  end_time: {
                    $lte: new Date(end_timestamp),
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $lookup: {
          from: "statusnames",
          let: { line_id: "$line_id", stop_name: "$stop_name" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$line_id", "$$line_id"],
                    },
                    {
                      $eq: ["$fault_code", "$$stop_name"],
                    },
                  ],
                },
              },
            },
          ],
          as: "status_name",
        },
      },
      {
        $lookup: {
          from: "equipment",
          let: { line_id: "$line_id", equipment_name: "$machine_name" },
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
          as: "machine_name",
        },
      },
      {
        $lookup: {
          from: "batchskutriggers",
          localField: "batch",
          foreignField: "_id",
          as: "batch",
        },
      },
      {
        $lookup: {
          from: "fgexes",
          localField: "fgex",
          foreignField: "_id",
          as: "fgex",
        },
      },
      {
        $lookup: {
          from: "comments",
          let: { stop_id: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$stop_id", "$$stop_id"] } } },
            {
              $lookup: {
                from: "faultcauses",
                let: { selected_causes: { $ifNull: ["$selected_causes", []] } },
                pipeline: [
                  { $match: { $expr: { $in: ["$_id", "$$selected_causes"] } } },
                ],
                as: "selected_causes",
              },
            },
            {
              $project: {
                selected_causes: 1,
                parts: 1,
                user_comment: {
                  $map: {
                    input: "$user_comment",
                    as: "comment",
                    in: {
                      username: "$$comment.user_name",
                      comment: "$$comment.comment",
                      comment_date: {
                        $dateToString: {
                          format: "%Y-%m-%dT%H:%M:%S.%L",
                          date: "$$comment.timestamp",
                          timezone: "+05:00",
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "rosters",
          let: { date: new Date(date), shift: "$shift", line_id: "$line_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$date", "$$date"] },
                    { $eq: ["$line_id", "$$line_id"] },
                  ],
                },
              },
            },
            {
              $project: {
                operator: {
                  $filter: {
                    input: "$shift_wise",
                    as: "shift_name",
                    cond: { $eq: ["$$shift_name.shift_name", "$$shift"] },
                  },
                },
              },
            },
            {
              $unwind: {
                path: "$operator",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "operators",
                let: { operator_name: "$operator.operator_name" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$operator_name"] } } },
                ],
                as: "operator",
              },
            },
            {
              $unwind: {
                path: "$operator",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          as: "roster",
        },
      },
      {
        $unwind: {
          path: "$status_name",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$roster",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$machine_name",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$comments",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          start_time: {
            $switch: {
              branches: [
                {
                  case: { $lte: ["$start_time", new Date(start_timestamp)] },
                  then: new Date(start_timestamp),
                },
                {
                  case: { $gt: ["$start_time", new Date(end_timestamp)] },
                  then: new Date(end_timestamp),
                },
              ],
              default: "$start_time",
            },
          },
          end_time: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$end_time", null] },
                  then: new Date(end_timestamp),
                },
                {
                  case: { $gt: ["$end_time", new Date(end_timestamp)] },
                  then: new Date(end_timestamp),
                },
              ],
              default: "$end_time",
            },
          },
          machine_name: "$machine_name.display_name",
          status_name: "$status_name",
          batch: "$batch.batch",
          fgex: "$fgex.fgex",
          shift: "$shift",
          date: "$date",
          operator_name: "$roster.operator.display_name",
          parts: {
            $reduce: {
              input: "$comments.parts",
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                  "$$this",
                ],
              },
            },
          },
          selected_causes: "$comments.selected_causes.cause_name",
          user_comment1: { $arrayElemAt: ["$comments.user_comment", 0] },
          stop_name: 1,
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
          path: "$fgex",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          stop_name: 1,
          machine_name: 1,
          start_time: {
            $dateToString: {
              format: "%Y-%m-%dT%H:%M:%S.%L",
              date: "$start_time",
              timezone: "+04:00",
            },
          },
          end_time: {
            $dateToString: {
              format: "%Y-%m-%dT%H:%M:%S.%L",
              date: "$end_time",
              timezone: "+04:00",
            },
          },
          fault_name: {
            $ifNull: ["$status_name.fault_name", "Not Define in Database"],
          },
          parts: { $ifNull: ["$parts", ""] },
          batch: 1,
          fgex: 1,
          shift: 1,
          date: 1,
          operator_name: { $ifNull: ["$operator_name", "Not Defined"] },
          user_comment1: {
            $ifNull: ["$user_comment1", {}],
          } /* {
                    username:"$user_comment1.user_name",
                    comment_date:"$user_comment1.timestamp",
                    comment:"$user_comment1.comment"
                } */,
          fault_cause: {
            $ifNull: [
              {
                $reduce: {
                  input: "$selected_causes",
                  initialValue: "",
                  in: {
                    $concat: [
                      "$$value",
                      { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                      "$$this",
                    ],
                  },
                },
              },
              "",
            ],
          },
          duration: {
            $round: [
              {
                $divide: [
                  {
                    $subtract: ["$end_time", "$start_time"],
                  },
                  1000 * 60,
                ],
              },
              2,
            ],
          },
        },
      },
      {
        $match: {
          $expr: {
            $gt: ["$duration", 0],
          },
        },
      },
    ]);
  }

  res.send(project);
});
router.get("/day_state_wise_report", async (req, res) => {
  var start_timestamp = req.query.startDate + "T07:00:00";
  var date = req.query.startDate + "T00:00:00.000Z";
  var end = req.query.endDate + "T07:00:00";
  var state = new RegExp(req.query.machine_state);
  var duration = Number(req.query.duration) * 60 || 0.7;
  var end_timestamp = moment(end).utc().local().add(1, "day").format();
  var line_id = req.query.line_id;
  if (!line_id) {
    res.status(404).send("Please send Line id");
    return;
  }
  if (req.query.machine_state == "all") {
    var project = await Stop.aggregate([
      {
        $match: {
          //stop_name: state,
          line_id: mongoose.Types.ObjectId(line_id),
          $or: [
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(start_timestamp),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(start_timestamp),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(end_timestamp),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(end_timestamp),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $gte: new Date(start_timestamp),
                  },
                },
                {
                  end_time: {
                    $lte: new Date(end_timestamp),
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $project: {
          start_time: {
            $switch: {
              branches: [
                {
                  case: { $lte: ["$start_time", new Date(start_timestamp)] },
                  then: new Date(start_timestamp),
                },
                {
                  case: { $gt: ["$start_time", new Date(end_timestamp)] },
                  then: new Date(end_timestamp),
                },
              ],
              default: "$start_time",
            },
          },
          end_time: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$end_time", null] },
                  then: new Date(end_timestamp),
                },
                {
                  case: { $gt: ["$end_time", new Date(end_timestamp)] },
                  then: new Date(end_timestamp),
                },
              ],
              default: "$end_time",
            },
          },
          machine_name: "$machine_name",
          batch: "$batch",
          fgex: "$fgex",
          shift: "$shift",
          date: "$date",
          stop_name: "$stop_name",
          line_id: 1,
        },
      },
      {
        $project: {
          start_time: {
            $switch: {
              branches: [
                {
                  case: { $lte: ["$start_time", new Date(start_timestamp)] },
                  then: new Date(start_timestamp),
                },
                {
                  case: { $gt: ["$start_time", new Date(end_timestamp)] },
                  then: new Date(end_timestamp),
                },
              ],
              default: "$start_time",
            },
          },
          end_time: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$end_time", null] },
                  then: new Date(end_timestamp),
                },
                {
                  case: { $gt: ["$end_time", new Date(end_timestamp)] },
                  then: new Date(end_timestamp),
                },
              ],
              default: "$end_time",
            },
          },
          machine_name: "$machine_name",
          batch: "$batch",
          fgex: "$fgex",
          shift: "$shift",
          date: "$date",
          stop_name: "$stop_name",
          line_id: 1,
        },
      },
      {
        $project: {
          start_time: 1,
          line_id: 1,
          end_time: 1,
          machine_name: 1,
          batch: 1,
          fgex: 1,
          shift: 1,
          date: 1,
          stop_name: 1,
          duration: {
            $round: [
              {
                $divide: [
                  {
                    $subtract: ["$end_time", "$start_time"],
                  },
                  1000,
                ],
              },
              2,
            ],
          },
        },
      },
      {
        $match: {
          $expr: {
            $gt: ["$duration", duration],
          },
        },
      },
      {
        $lookup: {
          from: "statusnames",
          let: {
            line_id: "$line_id",
            stop_name: "$stop_name",
            machine_name: "$machine_name",
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
                      $eq: ["$fault_code", "$$stop_name"],
                    },
                    {
                      $eq: ["$machine_name", "$$machine_name"],
                    },
                  ],
                },
              },
            },
          ],
          as: "status_name",
        },
      },
      {
        $lookup: {
          from: "equipment",
          let: { line_id: "$line_id", equipment_name: "$machine_name" },
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
          as: "machine_name",
        },
      },
      {
        $lookup: {
          from: "batchskutriggers",
          localField: "batch",
          foreignField: "_id",
          as: "batch",
        },
      },
      {
        $lookup: {
          from: "fgexes",
          localField: "fgex",
          foreignField: "_id",
          as: "fgex",
        },
      },
      {
        $lookup: {
          from: "comments",
          let: { stop_id: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$stop_id", "$$stop_id"] } } },
            {
              $lookup: {
                from: "faultcauses",
                let: { selected_causes: { $ifNull: ["$selected_causes", []] } },
                pipeline: [
                  { $match: { $expr: { $in: ["$_id", "$$selected_causes"] } } },
                ],
                as: "selected_causes",
              },
            },
            {
              $project: {
                selected_causes: 1,
                parts: 1,
                user_comment: {
                  $map: {
                    input: "$user_comment",
                    as: "comment",
                    in: {
                      username: "$$comment.user_name",
                      comment: "$$comment.comment",
                      comment_date: {
                        $dateToString: {
                          format: "%Y-%m-%dT%H:%M:%S.%L",
                          date: "$$comment.timestamp",
                          timezone: "+05:30",
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "rosters",
          let: { date: new Date(date), shift: "$shift", line_id: "$line_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$date", "$$date"] },
                    { $eq: ["$line_id", "$$line_id"] },
                  ],
                },
              },
            },
            {
              $project: {
                operator: {
                  $filter: {
                    input: "$shift_wise",
                    as: "shift_name",
                    cond: { $eq: ["$$shift_name.shift_name", "$$shift"] },
                  },
                },
              },
            },
            {
              $unwind: {
                path: "$operator",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "operators",
                let: { operator_name: "$operator.operator_name" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$operator_name"] } } },
                ],
                as: "operator",
              },
            },
            {
              $unwind: {
                path: "$operator",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          as: "roster",
        },
      },
      {
        $unwind: {
          path: "$status_name",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$roster",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$machine_name",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$comments",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          start_time: {
            $dateToString: {
              format: "%Y-%m-%dT%H:%M:%S.%L",
              date: "$start_time",
              timezone: "+05:30",
            },
          },
          end_time: {
            $dateToString: {
              format: "%Y-%m-%dT%H:%M:%S.%L",
              date: "$end_time",
              timezone: "+05:30",
            },
          },
          duration: 1,
          machine_name: "$machine_name.display_name",
          status_name: "$status_name",
          batch: "$batch.batch",
          fgex: "$fgex.fgex",
          shift: "$shift",
          date: "$date",
          operator_name: "$roster.operator.display_name",
          parts: {
            $reduce: {
              input: "$comments.parts",
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                  "$$this",
                ],
              },
            },
          },
          selected_causes: "$comments.selected_causes.cause_name",
          user_comment1: { $arrayElemAt: ["$comments.user_comment", 0] },
          stop_name: 1,
          line_id: 1,
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
          path: "$fgex",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          stop_name: 1,
          machine_name: 1,
          start_time: 1,
          end_time: 1,
          line_id: 1,
          duration: 1,
          fault_name: {
            $ifNull: ["$status_name.fault_name", "Not Define in Database"],
          },
          parts: { $ifNull: ["$parts", ""] },
          batch: 1,
          fgex: 1,
          shift: 1,
          date: 1,
          operator_name: { $ifNull: ["$operator_name", "Not Defined"] },
          user_comment1: {
            $ifNull: ["$user_comment1", {}],
          } /* {
                    username:"$user_comment1.user_name",
                    comment_date:"$user_comment1.timestamp",
                    comment:"$user_comment1.comment"
                } */,
          fault_cause: {
            $ifNull: [
              {
                $reduce: {
                  input: "$selected_causes",
                  initialValue: "",
                  in: {
                    $concat: [
                      "$$value",
                      { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                      "$$this",
                    ],
                  },
                },
              },
              "",
            ],
          },
        },
      },
    ]);
  } else {
    var project = await Stop.aggregate([
      {
        $match: {
          stop_name: state,
          line_id: mongoose.Types.ObjectId(line_id),
          $or: [
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(start_timestamp),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(start_timestamp),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(end_timestamp),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(end_timestamp),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $gte: new Date(start_timestamp),
                  },
                },
                {
                  end_time: {
                    $lte: new Date(end_timestamp),
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $project: {
          start_time: {
            $switch: {
              branches: [
                {
                  case: { $lte: ["$start_time", new Date(start_timestamp)] },
                  then: new Date(start_timestamp),
                },
                {
                  case: { $gt: ["$start_time", new Date(end_timestamp)] },
                  then: new Date(end_timestamp),
                },
              ],
              default: "$start_time",
            },
          },
          end_time: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$end_time", null] },
                  then: new Date(end_timestamp),
                },
                {
                  case: { $gt: ["$end_time", new Date(end_timestamp)] },
                  then: new Date(end_timestamp),
                },
              ],
              default: "$end_time",
            },
          },
          machine_name: "$machine_name",
          batch: "$batch",
          fgex: "$fgex",
          shift: "$shift",
          date: "$date",
          stop_name: "$stop_name",
          line_id: 1,
        },
      },
      {
        $project: {
          start_time: {
            $switch: {
              branches: [
                {
                  case: { $lte: ["$start_time", new Date(start_timestamp)] },
                  then: new Date(start_timestamp),
                },
                {
                  case: { $gt: ["$start_time", new Date(end_timestamp)] },
                  then: new Date(end_timestamp),
                },
              ],
              default: "$start_time",
            },
          },
          end_time: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$end_time", null] },
                  then: new Date(end_timestamp),
                },
                {
                  case: { $gt: ["$end_time", new Date(end_timestamp)] },
                  then: new Date(end_timestamp),
                },
              ],
              default: "$end_time",
            },
          },
          machine_name: "$machine_name",
          batch: "$batch",
          fgex: "$fgex",
          shift: "$shift",
          date: "$date",
          stop_name: "$stop_name",
          line_id: 1,
        },
      },
      {
        $project: {
          start_time: 1,
          end_time: 1,
          line_id: 1,
          machine_name: 1,
          batch: 1,
          fgex: 1,
          shift: 1,
          date: 1,
          stop_name: 1,
          duration: {
            $round: [
              {
                $divide: [
                  {
                    $subtract: ["$end_time", "$start_time"],
                  },
                  1000,
                ],
              },
              2,
            ],
          },
        },
      },
      {
        $match: {
          $expr: {
            $gt: ["$duration", duration],
          },
        },
      },
      {
        $lookup: {
          from: "statusnames",
          let: {
            line_id: "$line_id",
            stop_name: "$stop_name",
            machine_name: "$machine_name",
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
                      $eq: ["$fault_code", "$$stop_name"],
                    },
                    {
                      $eq: ["$machine_name", "$$machine_name"],
                    },
                  ],
                },
              },
            },
          ],
          as: "status_name",
        },
      },
      {
        $lookup: {
          from: "equipment",
          let: { line_id: "$line_id", equipment_name: "$machine_name" },
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
          as: "machine_name",
        },
      },
      {
        $lookup: {
          from: "batchskutriggers",
          localField: "batch",
          foreignField: "_id",
          as: "batch",
        },
      },
      {
        $lookup: {
          from: "fgexes",
          localField: "fgex",
          foreignField: "_id",
          as: "fgex",
        },
      },
      {
        $lookup: {
          from: "comments",
          let: { stop_id: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$stop_id", "$$stop_id"] } } },
            {
              $lookup: {
                from: "faultcauses",
                let: { selected_causes: { $ifNull: ["$selected_causes", []] } },
                pipeline: [
                  { $match: { $expr: { $in: ["$_id", "$$selected_causes"] } } },
                ],
                as: "selected_causes",
              },
            },
            {
              $project: {
                selected_causes: 1,
                parts: 1,
                user_comment: {
                  $map: {
                    input: "$user_comment",
                    as: "comment",
                    in: {
                      username: "$$comment.user_name",
                      comment: "$$comment.comment",
                      comment_date: {
                        $dateToString: {
                          format: "%Y-%m-%dT%H:%M:%S.%L",
                          date: "$$comment.timestamp",
                          timezone: "+05:30",
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "rosters",
          let: { date: new Date(date), shift: "$shift", line_id: "$line_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$date", "$$date"] },
                    { $eq: ["$line_id", "$$line_id"] },
                  ],
                },
              },
            },
            {
              $project: {
                operator: {
                  $filter: {
                    input: "$shift_wise",
                    as: "shift_name",
                    cond: { $eq: ["$$shift_name.shift_name", "$$shift"] },
                  },
                },
              },
            },
            {
              $unwind: {
                path: "$operator",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "operators",
                let: { operator_name: "$operator.operator_name" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$operator_name"] } } },
                ],
                as: "operator",
              },
            },
            {
              $unwind: {
                path: "$operator",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          as: "roster",
        },
      },
      {
        $unwind: {
          path: "$status_name",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$roster",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$machine_name",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$comments",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          start_time: {
            $dateToString: {
              format: "%Y-%m-%dT%H:%M:%S.%L",
              date: "$start_time",
              timezone: "+05:30",
            },
          },
          end_time: {
            $dateToString: {
              format: "%Y-%m-%dT%H:%M:%S.%L",
              date: "$end_time",
              timezone: "+05:30",
            },
          },
          duration: 1,
          line_id: 1,
          machine_name: "$machine_name.display_name",
          status_name: "$status_name",
          batch: "$batch.batch",
          fgex: "$fgex.fgex",
          shift: "$shift",
          date: "$date",
          operator_name: "$roster.operator.display_name",
          parts: {
            $reduce: {
              input: "$comments.parts",
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                  "$$this",
                ],
              },
            },
          },
          selected_causes: "$comments.selected_causes.cause_name",
          user_comment1: { $arrayElemAt: ["$comments.user_comment", 0] },
          stop_name: 1,
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
          path: "$fgex",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          stop_name: 1,
          line_id: 1,
          machine_name: 1,
          start_time: 1,
          end_time: 1,
          duration: 1,
          fault_name: {
            $ifNull: ["$status_name.fault_name", "Not Define in Database"],
          },
          parts: { $ifNull: ["$parts", ""] },
          batch: 1,
          fgex: 1,
          shift: 1,
          date: 1,
          operator_name: { $ifNull: ["$operator_name", "Not Defined"] },
          user_comment1: {
            $ifNull: ["$user_comment1", {}],
          } /* {
                    username:"$user_comment1.user_name",
                    comment_date:"$user_comment1.timestamp",
                    comment:"$user_comment1.comment"
                } */,
          fault_cause: {
            $ifNull: [
              {
                $reduce: {
                  input: "$selected_causes",
                  initialValue: "",
                  in: {
                    $concat: [
                      "$$value",
                      { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                      "$$this",
                    ],
                  },
                },
              },
              "",
            ],
          },
        },
      },
    ]);
  }

  res.send(project);
});

//major_duration

// router.get("/duration_wise", async (req, res) => {
//   try {
//     const duration = Number(req.query.duration) * 60;
//     //const days = req.query.days || 2;
//     const days = 5;
//     const end = moment().local().format("YYYY-MM-DD");
//     const start = moment().local().subtract(days, "day").format("YYYY-MM-DD");
//     console.log("start:", start, "end:", end)
//     const machine_arr = req.query.machine_arr.split(";");
//     const state_arr = req.query.state_arr.split(";");
//     const critical_machine = req.query.critical_machine;
//     const critical_machine_state = req.query.critical_machine_state_arr.split(";");
//     const line_id = req.query.line_id;

//     // Query to find stops within the specified date range and apply additional filters
//     const stops = await Stop.aggregate([
//       {
//         $match: {
//           line_id: new mongoose.Types.ObjectId(line_id),
//           $and: [
//             {
//               date: {
//                 $lte: new Date(end),
//               },
//             },
//             {
//               date: {
//                 $gte: new Date(start),
//               },
//             },
//           ],
//         },
//       },
//       {
//         $unwind: "$machine_wise"
//       },
//       {
//         $lookup: {
//           from: "equipment",
//           let: { line_id: "$line_id", equipment_name: "$machine_wise.machine_name" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     {
//                       $eq: ["$line_id", "$$line_id"],
//                     },
//                     {
//                       $eq: ["$equipment_name", "$$equipment_name"],
//                     },
//                   ],
//                 },
//               },
//             },
//           ],
//           as: "equipment_name",
//         },
//       },
//       {
//         $unwind: {
//           path: "$equipment_name",
//           preserveNullAndEmptyArrays: true,
//         },
//       },    
//       {
//         $addFields: {
//             "events": {
//                 $filter: {
//                     input: "$machine_wise.event_wise",
//                     as: "event",
//                     cond: {
//                         $lt: ["$$event.timestamp", "$shift_end_timestamp"]
//                     }
//                 }
//             }
//         }
//       },
//       {
//         $addFields: {
//             "events": {
//                 $map: {
//                     input: "$events",
//                     as: "event",
//                     in: {
//                         $mergeObjects: [
//                             "$$event",
//                             {
//                                 start_time: "$$event.timestamp",
//                                 end_time: {
//                                   $ifNull: [
//                                     {
//                                         $arrayElemAt: [
//                                             "$events.timestamp",
//                                             { $add: [{ $indexOfArray: ["$events", "$$event"] }, 1] }
//                                         ]
//                                     },
//                                     { $cond: { if: { $gt: ["$shift_end_timestamp", new Date()] }, then: new Date(), else: "$shift_end_timestamp" } }
//                                    ]
//                                 },
//                                 duration: {
//                                     $divide: [
//                                         {
//                                             $subtract: [
//                                                 {
//                                                   $ifNull: [
//                                                     {
//                                                         $arrayElemAt: [
//                                                             "$events.timestamp",
//                                                             { $add: [{ $indexOfArray: ["$machine_wise.event_wise", "$$event"] }, 1] }
//                                                         ]
//                                                     },
//                                                     { $cond: { if: { $gt: ["$shift_end_timestamp", new Date()] }, then: new Date(), else: "$shift_end_timestamp" } }
//                                                    ]
//                                                 },
//                                                 "$$event.timestamp"
//                                             ]
//                                         },
//                                         1000 // Milliseconds to seconds
//                                     ]
//                                 },
//                                 event_end_good_count: {
//                                     $ifNull: [
//                                         {
//                                             $arrayElemAt: [
//                                                 "$events.good_count",
//                                                 { $add: [{ $indexOfArray: ["$events", "$$event"] }, 1] }
//                                             ]
//                                         },
//                                         0
//                                     ]
//                                 },
//                                 event_start_good_count: "$$event.good_count"
//                             }
//                         ]
//                     }
//                 }
//             }
//         }
//        },
//       {
//         $project:{
//           machine_name:"$machine_wise.machine_name",
//           display_name:"$equipment_name.display_name",
//           date:1,
//           shift:1,
//           line_id:1,
//           events:1
//         }
  
//       },
//       {
//         $unwind: "$events"
//       },
//       {
//         $match: {
//           $or: [
//             {
//               $and: [
//                 {
//                   "events.parent_stop": {
//                     $in: critical_machine_state,
//                   },
//                 },
//                 {
//                   "machine_name": {
//                     $eq: critical_machine,
//                   },
//                 },
//               ],
//             },
//             {
//               $and: [
//                 {
//                   "events.parent_stop": {
//                     $in: state_arr,
//                   },
//                 },
//                 {
//                   "machine_name": {
//                     $in: machine_arr,
//                   },
//                 },
//                 {
//                   "machine_name": {
//                     $ne: critical_machine,
//                   },
//                 },
//               ],
//             },
//           ]
//         }
//       },
//       {
//         $match: {
//           $expr: {
//             $gt: ["$events.duration", duration],
//           },
//         },
//       },
//       {
//         $lookup: {
//           from: "comments",
//           let: { stop_id: "$events._id" },
//           pipeline: [
//             { $match: { $expr: { $eq: ["$stop_id", "$$stop_id"] } } },
//             {
//               $lookup: {
//                 from: "faultcauses",
//                 let: { selected_causes: { $ifNull: ["$selected_causes", []] } },
//                 pipeline: [
//                   { $match: { $expr: { $in: ["$_id", "$$selected_causes"] } } },
//                 ],
//                 as: "selected_causes",
//               },
//             },
//             {
//               $project: {
//                 selected_causes: 1,
//                 parts: 1,
//                 user_comment: {
//                   $map: {
//                     input: "$user_comment",
//                     as: "comment",
//                     in: {
//                       username: "$$comment.user_name",
//                       comment: "$$comment.comment",
//                       comment_date: {
//                         $dateToString: {
//                           format: "%Y-%m-%dT%H:%M:%S.%L",
//                           date: "$$comment.timestamp",
//                           timezone: "+05:30",
//                         },
//                       },
//                     },
//                   },
//                 },
//               },
//             },
//           ],
//           as: "comments",
//         },
//       },
//       {
//         $unwind: {
//           path: "$comments",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $lookup: {
//           from: "statusnames",
//           let: {
//             line_id: "$line_id",
//             stop_name: "$events.stop_name",
//             machine_name: "$machine_name",
//           },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     {
//                       $eq: ["$line_id", "$$line_id"],
//                     },
//                     {
//                       $eq: ["$fault_code", "$$stop_name"],
//                     },
//                     {
//                       $eq: ["$machine_name", "$$machine_name"],
//                     },
//                   ],
//                 },
//               },
//             },
//           ],
//           as: "status_name",
//         },
//       },
//       {
//         $unwind: {
//           path: "$status_name",
//           preserveNullAndEmptyArrays: true,
//         }
//       },
    
//       {
//         $project: {
//           _id:"$events._id",
//           stop_name: "$events.stop_name",
//           machine_name: "$machine_name",
//           machineName: "$display_name",
//           from: "$events.start_time",
//           to: "$events.end_time",
//           shift:"$shift",
//           date:"$date",
//           line_id:"$line_id",
//           vendor:"$events.vendor",
//           batch:"$events.batch",
//           stopName: {
//             $ifNull: ["$status_name.fault_name",  "$events.stop_name"],
//           },
//           duration: "$events.duration",
//           selected_causes: "$comments.selected_causes",
//           // comment:"$comments",
//           // user_comment1: { $arrayElemAt: ["$comments.user_comment", 0] },
//         },
//       },
//       {
//         $unwind: {
//           path: "$selected_causes",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $project: {
//           stop_name: 1,
//           machine_name: 1,
//           machineName: 1,
//           from: 1,
//           to: 1,
//           stopName: 1,
//           machineName: 1,
//           shift:1,
//           date:1,
//           line_id:1,
//           vendor:1,
//           batch:1,
//           duration: 1,
//           fault_cause_id: "$selected_causes._id",
//           fault_cause: {
//             $ifNull: ["$selected_causes.cause_name", "NA"],
//           },
//         },
//       },
//       {
//         $sort: {
//           from: -1,
//         },
//       },

//     ]);

//     res.json(stops);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Internal Server Error');
//   }
// });

router.get("/duration_wise", async (req, res) => {
  try {
    const durationSec     = Number(req.query.duration) * 60;  // minutes → seconds
    const daysBack        = Number(req.query.days) || 2;
    const now             = new Date();
    const startDate       = new Date(now.getTime() - daysBack * 86400e3);
    const lineId          = new mongoose.Types.ObjectId(req.query.line_id);

    const machines        = req.query.machine_arr.split(";");
    const otherStates     = req.query.state_arr.split(";");
    const criticalMachine = req.query.critical_machine;
    const criticalStates  = req.query.critical_machine_state_arr.split(";");

    const pipeline = [
      // A) date & line filter
      {
        $match: {
          line_id: lineId,
          date:    { $gte: startDate, $lte: now }
        }
      },
      // B) unwind per‐machine
      { $unwind: "$machine_wise" },

      // C) pair each event with its successor or shift end
      {
        $project: {
          line_id:               1,
          date:                  1,
          shift:                 1,
          shift_end_timestamp:   1,
          machine_name:          "$machine_wise.machine_name",
          eventPairs: {
            $zip: {
              inputs: [
                "$machine_wise.event_wise",
                {
                  $concatArrays: [
                    {
                      $cond: [
                        { $gt: [{ $size: "$machine_wise.event_wise" }, 1] },
                        {
                          $slice: [
                            "$machine_wise.event_wise.timestamp",
                            1,
                            { $subtract: [{ $size: "$machine_wise.event_wise" }, 1] }
                          ]
                        },
                        []
                      ]
                    },
                    [ "$shift_end_timestamp" ]
                  ]
                }
              ]
            }
          }
        }
      },

      // D) compute from, to (clamped to now), duration, etc.
      {
        $project: {
          line_id:    1,
          date:       1,
          shift:      1,
          machine_name: 1,
          events: {
            $map: {
              input: "$eventPairs",
              as:    "pair",
              in: {
                $let: {
                  vars: {
                    ev:     { $arrayElemAt: ["$$pair", 0] },
                    nextTs: { $arrayElemAt: ["$$pair", 1] }
                  },
                  in: {
                    _id:         "$$ev._id",
                    stop_name:   "$$ev.stop_name",
                    parent_stop: "$$ev.parent_stop",
                    vendor:      "$$ev.vendor",
                    batch:       "$$ev.batch",
                    from:        "$$ev.timestamp",
                    to: {
                      $cond: [
                        { $gt: ["$$nextTs", now] },
                        now,
                        "$$nextTs"
                      ]
                    },
                    duration: {
                      $divide: [
                        {
                          $subtract: [
                            {
                              $cond: [
                                { $gt: ["$$nextTs", now] },
                                now,
                                "$$nextTs"
                              ]
                            },
                            "$$ev.timestamp"
                          ]
                        },
                        1000
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      },

      // E) unwind events
      { $unwind: "$events" },

      // F) filter by duration & machine/state logic
      {
        $match: {
          "events.duration": { $gt: durationSec },
          $or: [
            {
              $and: [
                { machine_name: criticalMachine },
                { "events.parent_stop": { $in: criticalStates } }
              ]
            },
            {
              $and: [
                { machine_name: { $in: machines, $ne: criticalMachine } },
                { "events.parent_stop": { $in: otherStates } }
              ]
            }
          ]
        }
      },

      // G) equipment lookup
      {
        $lookup: {
          from: "equipment",
          let: { lid: "$line_id", m: "$machine_name" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$line_id",        "$$lid"] },
                    { $eq: ["$equipment_name", "$$m"]   }
                  ]
                }
              }
            },
            { $project: { display_name: 1 } }
          ],
          as: "equip"
        }
      },
      { $unwind: { path: "$equip", preserveNullAndEmptyArrays: true } },

      // H) comments & causes lookup
      {
        $lookup: {
          from: "comments",
          let: { stop_id: "$events._id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$stop_id", "$$stop_id"] } } },
            {
              $lookup: {
                from: "faultcauses",
                let: { selected_causes: { $ifNull: ["$selected_causes", []] } },
                pipeline: [
                  { $match: { $expr: { $in: ["$_id", "$$selected_causes"] } } }
                ],
                as: "selected_causes"
              }
            },
            {
              $project: {
                selected_causes: 1,
                parts:           1,
                user_comment: {
                  $map: {
                    input: "$user_comment",
                    as:    "c",
                    in: {
                      username:     "$$c.user_name",
                      comment:      "$$c.comment",
                      comment_date: {
                        $dateToString: {
                          format:   "%Y-%m-%dT%H:%M:%S.%L",
                          date:     "$$c.timestamp",
                          timezone: "+05:30"
                        }
                      }
                    }
                  }
                }
              }
            }
          ],
          as: "cmts"
        }
      },
      { $unwind: { path: "$cmts", preserveNullAndEmptyArrays: true } },

      // I) status name lookup
      {
        $lookup: {
          from: "statusnames",
          let: { lid: "$line_id", sn: "$events.stop_name", m: "$machine_name" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$line_id",    "$$lid"] },
                    { $eq: ["$fault_code", "$$sn"]  },
                    { $eq: ["$machine_name","$$m"]  }
                  ]
                }
              }
            },
            { $project: { fault_name: 1 } }
          ],
          as: "st"
        }
      },
      { $unwind: { path: "$st", preserveNullAndEmptyArrays: true } },

      // J) final shaping
      {
        $project: {
          _id:           "$events._id",
          stop_name:     "$events.stop_name",
          machine_name:  1,
          machineName:   "$equip.display_name",
          from:          "$events.from",
          to:            "$events.to",
          shift:         1,
          date:          1,
          line_id:       1,
          vendor:        "$events.vendor",
          batch:         "$events.batch",
          stopName:      { $ifNull: ["$st.fault_name", "$events.stop_name"] },
          duration:      "$events.duration",
          fault_cause:   { $arrayElemAt: ["$cmts.selected_causes", 0] }
        }
      },
      {
        $project: {
          _id:            1,
          stop_name:      1,
          machine_name:   1,
          machineName:    1,
          from:           1,
          to:             1,
          shift:          1,
          date:           1,
          line_id:        1,
          vendor:         1,
          batch:          1,
          stopName:       1,
          duration:       1,
          fault_cause:    { $ifNull: ["$fault_cause.cause_name", "NA"] },
          fault_cause_id: "$fault_cause._id"
        }
      }
    ];

    const stops = await mongoose.model("Stop")
      .aggregate(pipeline)
      .allowDiskUse(true);

    res.json(stops);
  }
  catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});



router.get("/duration_wise_mobile", async (req, res) => {
  try {
    const duration = Number(req.query.duration) * 60;
    const days = req.query.days || 2;
    const end = moment().local().format("YYYY-MM-DD");
    const start = moment().local().subtract(days, "day").format("YYYY-MM-DD");
    console.log("start:", start, "end:", end)

    const machine = req.query.machine;
    const state_arr = req.query.state_arr.split(";");
    const line_id = req.query.line_id;

    // Query to find stops within the specified date range and apply additional filters
    const stops = await Stop.aggregate([
      // 1. Match stops for the given line and date range
      {
        $match: {
          line_id: new mongoose.Types.ObjectId(line_id),
          date: {
            $lte: new Date(end),
            $gte: new Date(start)
          }
        }
      },
      // 2. Unwind the machine_wise array
      { $unwind: "$machine_wise" },
      // 3. Filter only those documents where machine_wise.machine_name equals req.query.machine
      {
        $match: {
          "machine_wise.machine_name": machine
        }
      },
      // 4. Lookup equipment data from "equipment" collection based on line and machine name
      {
        $lookup: {
          from: "equipment",
          let: { line_id: "$line_id", equipment_name: "$machine_wise.machine_name" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$line_id", "$$line_id"] },
                    { $eq: ["$equipment_name", "$$equipment_name"] }
                  ]
                }
              }
            }
          ],
          as: "equipment_name"
        }
      },
      {
        $unwind: {
          path: "$equipment_name",
          preserveNullAndEmptyArrays: true
        }
      },
      // 5. Add a new field 'events' filtering event_wise where event.timestamp is before shift_end_timestamp
      {
        $addFields: {
          events: {
            $filter: {
              input: "$machine_wise.event_wise",
              as: "event",
              cond: { $lt: ["$$event.timestamp", "$shift_end_timestamp"] }
            }
          }
        }
      },
      // 6. Map over events to add start_time, end_time, duration, etc.
      {
        $addFields: {
          events: {
            $map: {
              input: "$events",
              as: "event",
              in: {
                $mergeObjects: [
                  "$$event",
                  {
                    start_time: "$$event.timestamp",
                    end_time: {
                      $ifNull: [
                        {
                          $arrayElemAt: [
                            "$events.timestamp",
                            { $add: [{ $indexOfArray: ["$events", "$$event"] }, 1] }
                          ]
                        },
                        {
                          $cond: {
                            if: { $gt: ["$shift_end_timestamp", new Date()] },
                            then: new Date(),
                            else: "$shift_end_timestamp"
                          }
                        }
                      ]
                    },
                    duration: {
                      $divide: [
                        {
                          $subtract: [
                            {
                              $ifNull: [
                                {
                                  $arrayElemAt: [
                                    "$events.timestamp",
                                    { $add: [{ $indexOfArray: ["$machine_wise.event_wise", "$$event"] }, 1] }
                                  ]
                                },
                                {
                                  $cond: {
                                    if: { $gt: ["$shift_end_timestamp", new Date()] },
                                    then: new Date(),
                                    else: "$shift_end_timestamp"
                                  }
                                }
                              ]
                            },
                            "$$event.timestamp"
                          ]
                        },
                        1000 // Convert milliseconds to seconds
                      ]
                    },
                    event_end_good_count: {
                      $ifNull: [
                        {
                          $arrayElemAt: [
                            "$events.good_count",
                            { $add: [{ $indexOfArray: ["$events", "$$event"] }, 1] }
                          ]
                        },
                        0
                      ]
                    },
                    event_start_good_count: "$$event.good_count"
                  }
                ]
              }
            }
          }
        }
      },
      // 7. Project only the fields you need
      {
        $project: {
          machine_name: "$machine_wise.machine_name",
          display_name: "$equipment_name.display_name",
          date: 1,
          shift: 1,
          line_id: 1,
          shift_end_timestamp: 1,
          events: 1
        }
      },
      // 8. Unwind events array so each event is a separate document
      { $unwind: "$events" },
      // 9. Filter events based on parent_stop being in the provided state_arr
      {
        $match: {
          "events.parent_stop": { $in: state_arr }
        }
      },
      // 10. Filter events whose duration is greater than the provided duration
      {
        $match: {
          $expr: { $gt: ["$events.duration", duration] }
        }
      },
      // 11. Lookup comments for each event
      {
        $lookup: {
          from: "comments",
          let: { stop_id: "$events._id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$stop_id", "$$stop_id"] }
              }
            },
            {
              $lookup: {
                from: "faultcauses",
                let: { selected_causes: { $ifNull: ["$selected_causes", []] } },
                pipeline: [
                  { $match: { $expr: { $in: ["$_id", "$$selected_causes"] } } }
                ],
                as: "selected_causes"
              }
            },
            {
              $project: {
                selected_causes: 1,
                parts: 1,
                user_comment: {
                  $map: {
                    input: "$user_comment",
                    as: "comment",
                    in: {
                      username: "$$comment.user_name",
                      comment: "$$comment.comment",
                      comment_date: {
                        $dateToString: {
                          format: "%Y-%m-%dT%H:%M:%S.%L",
                          date: "$$comment.timestamp",
                          timezone: "+05:30"
                        }
                      }
                    }
                  }
                }
              }
            }
          ],
          as: "comments"
        }
      },
      {
        $unwind: {
          path: "$comments",
          preserveNullAndEmptyArrays: true
        }
      },
      // 12. Lookup status names based on line, stop name, and machine name
      {
        $lookup: {
          from: "statusnames",
          let: {
            line_id: "$line_id",
            stop_name: "$events.stop_name",
            machine_name: "$machine_name"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$line_id", "$$line_id"] },
                    { $eq: ["$fault_code", "$$stop_name"] },
                    { $eq: ["$machine_name", "$$machine_name"] }
                  ]
                }
              }
            }
          ],
          as: "status_name"
        }
      },
      {
        $unwind: {
          path: "$status_name",
          preserveNullAndEmptyArrays: true
        }
      },
      // 13. Project the final desired output
      {
        $project: {
          _id: "$events._id",
          stop_name: "$events.stop_name",
          parent_stop: "$events.parent_stop",
          machine_name: "$machine_name",
          machineName: "$display_name",
          from: "$events.start_time",
          to: "$events.end_time",
          shift: "$shift",
          date: "$date",
          line_id: "$line_id",
          vendor: "$events.vendor",
          batch: "$events.batch",
          stopName: { $ifNull: ["$status_name.fault_name", "$events.stop_name"] },
          duration: "$events.duration",
          selected_causes: "$comments.selected_causes"
        }
      },
      {
        $unwind: {
          path: "$selected_causes",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          stop_name: 1,
          parent_stop: 1,
          machine_name: 1,
          machineName: 1,
          from: 1,
          to: 1,
          stopName: 1,
          shift: 1,
          date: 1,
          line_id: 1,
          vendor: 1,
          batch: 1,
          duration: 1,
          fault_cause_id: "$selected_causes._id",
          fault_cause: { $ifNull: ["$selected_causes.cause_name", "NA"] }
        }
      },
      // 14. Finally, sort the results by start time descending
      {
        $sort: { from: -1 }
      }
    ]);


    res.json(stops);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

//Added on 26-09-2024
router.get("/duration_wise_date_filter", async (req, res) => {
  try {
    const duration = Number(req.query.duration) * 60;
    //const days = req.query.days || 2;
    //const days = 2;
    var start = req.query.startDate || moment().local().format("YYYY-MM-DD");
    var end = req.query.endDate || moment().local().format("YYYY-MM-DD");
    const machine_arr = req.query.machine_arr.split(";");
    const state_arr = req.query.state_arr.split(";");
    const critical_machine = req.query.critical_machine;
    const critical_machine_state = req.query.critical_machine_state_arr.split(";");
    const line_id = req.query.line_id;

    // Query to find stops within the specified date range and apply additional filters
    const stops = await Stop.aggregate([
      {
        $match: {
          line_id: new mongoose.Types.ObjectId(line_id),
          $and: [
            {
              date: {
                $lte: new Date(end),
              },
            },
            {
              date: {
                $gte: new Date(start),
              },
            },
          ],
        },
      },
      {
        $unwind: "$machine_wise"
      },
      {
        $lookup: {
          from: "equipment",
          let: { line_id: "$line_id", equipment_name: "$machine_wise.machine_name" },
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
          as: "equipment_name",
        },
      },
      {
        $unwind: {
          path: "$equipment_name",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          "events": {
            $filter: {
              input: "$machine_wise.event_wise",
              as: "event",
              cond: {
                $lt: ["$$event.timestamp", "$shift_end_timestamp"]
              }
            }
          }
        }
      },
      {
        $addFields: {
          "events": {
            $map: {
              input: "$events",
              as: "event",
              in: {
                $mergeObjects: [
                  "$$event",
                  {
                    start_time: "$$event.timestamp",
                    end_time: {
                      $ifNull: [
                        {
                          $arrayElemAt: [
                            "$events.timestamp",
                            { $add: [{ $indexOfArray: ["$events", "$$event"] }, 1] }
                          ]
                        },
                        { $cond: { if: { $gt: ["$shift_end_timestamp", new Date()] }, then: new Date(), else: "$shift_end_timestamp" } }
                      ]
                    },
                    duration: {
                      $divide: [
                        {
                          $subtract: [
                            {
                              $ifNull: [
                                {
                                  $arrayElemAt: [
                                    "$events.timestamp",
                                    { $add: [{ $indexOfArray: ["$machine_wise.event_wise", "$$event"] }, 1] }
                                  ]
                                },
                                { $cond: { if: { $gt: ["$shift_end_timestamp", new Date()] }, then: new Date(), else: "$shift_end_timestamp" } }
                              ]
                            },
                            "$$event.timestamp"
                          ]
                        },
                        1000 // Milliseconds to seconds
                      ]
                    },
                    event_end_good_count: {
                      $ifNull: [
                        {
                          $arrayElemAt: [
                            "$events.good_count",
                            { $add: [{ $indexOfArray: ["$events", "$$event"] }, 1] }
                          ]
                        },
                        0
                      ]
                    },
                    event_start_good_count: "$$event.good_count"
                  }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          machine_name: "$machine_wise.machine_name",
          display_name: "$equipment_name.display_name",
          date: 1,
          shift: 1,
          line_id: 1,
          events: 1
        }

      },
      {
        $unwind: "$events"
      },
      {
        $match: {
          $or: [
            {
              $and: [
                {
                  "events.parent_stop": {
                    $in: critical_machine_state,
                  },
                },
                {
                  "machine_name": {
                    $eq: critical_machine,
                  },
                },
              ],
            },
            {
              $and: [
                {
                  "events.parent_stop": {
                    $in: state_arr,
                  },
                },
                {
                  "machine_name": {
                    $in: machine_arr,
                  },
                },
                {
                  "machine_name": {
                    $ne: critical_machine,
                  },
                },
              ],
            },
          ]
        }
      },
      {
        $match: {
          $expr: {
            $gt: ["$events.duration", duration],
          },
        },
      },
      {
        $lookup: {
          from: "comments",
          let: { stop_id: "$events._id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$stop_id", "$$stop_id"] } } },
            {
              $lookup: {
                from: "faultcauses",
                let: { selected_causes: { $ifNull: ["$selected_causes", []] } },
                pipeline: [
                  { $match: { $expr: { $in: ["$_id", "$$selected_causes"] } } },
                ],
                as: "selected_causes",
              },
            },
            {
              $project: {
                selected_causes: 1,
                parts: 1,
                user_comment: {
                  $map: {
                    input: "$user_comment",
                    as: "comment",
                    in: {
                      username: "$$comment.user_name",
                      comment: "$$comment.comment",
                      comment_date: {
                        $dateToString: {
                          format: "%Y-%m-%dT%H:%M:%S.%L",
                          date: "$$comment.timestamp",
                          timezone: "+05:30",
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
          as: "comments",
        },
      },
      {
        $unwind: {
          path: "$comments",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "statusnames",
          let: {
            line_id: "$line_id",
            stop_name: "$events.stop_name",
            machine_name: "$machine_name",
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
                      $eq: ["$fault_code", "$$stop_name"],
                    },
                    {
                      $eq: ["$machine_name", "$$machine_name"],
                    },
                  ],
                },
              },
            },
          ],
          as: "status_name",
        },
      },
      {
        $unwind: {
          path: "$status_name",
          preserveNullAndEmptyArrays: true,
        }
      },

      {
        $project: {
          _id: "$events._id",
          stop_name: "$events.stop_name",
          machine_name: "$machine_name",
          machineName: "$display_name",
          from: "$events.start_time",
          to: "$events.end_time",
          shift: "$shift",
          date: "$date",
          line_id: "$line_id",
          vendor: "$events.vendor",
          batch: "$events.batch",
          stopName: {
            $ifNull: ["$status_name.fault_name", "$events.stop_name"],
          },
          duration: "$events.duration",
          selected_causes: "$comments.selected_causes",
          // comment:"$comments",
          // user_comment1: { $arrayElemAt: ["$comments.user_comment", 0] },
        },
      },
      {
        $unwind: {
          path: "$selected_causes",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          stop_name: 1,
          machine_name: 1,
          machineName: 1,
          from: 1,
          to: 1,
          stopName: 1,
          machineName: 1,
          shift: 1,
          date: 1,
          line_id: 1,
          vendor: 1,
          batch: 1,
          duration: 1,
          fault_cause_id: "$selected_causes._id",
          fault_cause: {
            $ifNull: ["$selected_causes.cause_name", "NA"],
          },
        },
      },
      {
        $sort: {
          from: -1,
        },
      },

    ]);

    res.json(stops);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


//new state wise report
router.get("/day_state_wise_report_2", async (req, res) => {
  try {
    // 1) parse inputs
    const {
      startDate: start,
      endDate:   end,
      machine_arr,
      state_arr,
      critical_machine,
      critical_machine_state_arr,
      duration:  durationMin,
      line_id
    } = req.query;

    if (!line_id) {
      return res.status(400).send("Please send Line id");
    }

    const machines       = machine_arr.split(";");
    const otherStates    = state_arr.split(";");
    const criticalStates = critical_machine_state_arr.split(";");
    const durationSec    = Number(durationMin) * 60 || 0.7;  // minutes → seconds

    // capture "now" once
    const now = new Date();

    // 2) optimized aggregation pipeline with clamp-to-now logic
    const pipeline = [
      // A) date & line filter
      {
        $match: {
          line_id: new mongoose.Types.ObjectId(line_id),
          date: {
            $gte: new Date(start),
            $lte: new Date(end)
          }
        }
      },

      // B) unwind & filter machines
      { $unwind: "$machine_wise" },
      {
        $match: {
          $or: [
            { "machine_wise.machine_name": critical_machine },
            {
              $and: [
                { "machine_wise.machine_name": { $in: machines } },
                { "machine_wise.machine_name": { $ne: critical_machine } }
              ]
            }
          ]
        }
      },

      // C) zip each event with the next timestamp (or shift end)
      {
        $project: {
          line_id:             1,
          date:                1,
          shift:               1,
          shift_end_timestamp: 1,
          machine_name:        "$machine_wise.machine_name",
          eventPairs: {
            $zip: {
              inputs: [
                "$machine_wise.event_wise",
                {
                  $concatArrays: [
                    {
                      $cond: [
                        { $gt: [{ $size: "$machine_wise.event_wise" }, 1] },
                        {
                          $slice: [
                            "$machine_wise.event_wise.timestamp",
                            1,
                            { $subtract: [{ $size: "$machine_wise.event_wise" }, 1] }
                          ]
                        },
                        []
                      ]
                    },
                    ["$shift_end_timestamp"]
                  ]
                }
              ]
            }
          }
        }
      },

      // D) compute flat events with start, clamped end, clamped duration
      {
        $project: {
          line_id:    1,
          date:       1,
          shift:      1,
          machine_name: 1,
          events: {
            $map: {
              input: "$eventPairs",
              as:    "pair",
              in: {
                $let: {
                  vars: {
                    ev:     { $arrayElemAt: ["$$pair", 0] },
                    nextTs: { $arrayElemAt: ["$$pair", 1] }
                  },
                  in: {
                    _id:         "$$ev._id",
                    stop_name:   "$$ev.stop_name",
                    parent_stop: "$$ev.parent_stop",
                    start_time:  "$$ev.timestamp",
                    batch:       "$$ev.batch",
                    end_time: {
                      $cond: [
                        { $gt: ["$$nextTs", now] },
                        now,
                        "$$nextTs"
                      ]
                    },
                    duration: {
                      $divide: [
                        {
                          $subtract: [
                            {
                              $cond: [
                                { $gt: ["$$nextTs", now] },
                                now,
                                "$$nextTs"
                              ]
                            },
                            "$$ev.timestamp"
                          ]
                        },
                        1000
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      },

      // E) unwind each event
      { $unwind: "$events" },

      // F) filter by duration & machine/state
      {
        $match: {
          "events.duration": { $gt: durationSec },
          $or: [
            {
              $and: [
                { machine_name: critical_machine },
                { "events.parent_stop": { $in: criticalStates } }
              ]
            },
            {
              $and: [
                { machine_name: { $in: machines, $ne: critical_machine } },
                { "events.parent_stop": { $in: otherStates } }
              ]
            }
          ]
        }
      },

      // G) equipment lookup
      {
        $lookup: {
          from: "equipment",
          let: { lid: "$line_id", m: "$machine_name" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$line_id",        "$$lid"] },
                    { $eq: ["$equipment_name", "$$m"]   }
                  ]
                }
              }
            },
            { $project: { display_name: 1 } }
          ],
          as: "equip"
        }
      },
      { $unwind: { path: "$equip", preserveNullAndEmptyArrays: true } },

      // H) comments & causes lookup
      {
        $lookup: {
          from: "comments",
          let: { sid: "$events._id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$stop_id", "$$sid"] } } },
            {
              $lookup: {
                from: "faultcauses",
                let: { sel: { $ifNull: ["$selected_causes", []] } },
                pipeline: [
                  { $match: { $expr: { $in: ["$_id", "$$sel"] } } },
                  { $project: { cause_name: 1 } }
                ],
                as: "causes"
              }
            },
            { $project: { causes: 1, parts: 1, user_comment: 1 } }
          ],
          as: "cmts"
        }
      },
      { $unwind: { path: "$cmts", preserveNullAndEmptyArrays: true } },

      // I) statusnames lookup
      {
        $lookup: {
          from: "statusnames",
          let: { lid: "$line_id", sn: "$events.stop_name", m: "$machine_name" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$line_id",    "$$lid"] },
                    { $eq: ["$fault_code", "$$sn"]  },
                    { $eq: ["$machine_name","$$m"]  }
                  ]
                }
              }
            },
            { $project: { fault_name: 1 } }
          ],
          as: "st"
        }
      },
      { $unwind: { path: "$st", preserveNullAndEmptyArrays: true } },

      // J) batch → fgex → roster → operator
      { $lookup: { from: "batchskutriggers", localField: "events.batch", foreignField: "_id", as: "batch" } },
      { $unwind: { path: "$batch", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "fgexes", localField: "batch.product_name", foreignField: "_id", as: "fgex" } },
      { $unwind: { path: "$fgex", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "rosters",
          let: { d: "$date", s: "$shift", lid: "$line_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$date", "$$d"] }, { $eq: ["$line_id", "$$lid"] }] } } },
            { $unwind: "$shift_wise" },
            { $match: { $expr: { $eq: ["$shift_wise.shift_name", "$$s"] } } },
            {
              $lookup: {
                from: "operators",
                localField: "shift_wise.operator_name",
                foreignField: "_id",
                as: "operator"
              }
            },
            { $unwind: { path: "$operator", preserveNullAndEmptyArrays: true } },
            { $project: { operator_name: "$operator.display_name" } }
          ],
          as: "rosters"
        }
      },
      { $unwind: { path: "$rosters", preserveNullAndEmptyArrays: true } },

      // K) final projection
      {
        $project: {
          _id:           "$events._id",
          stop_name:     "$events.stop_name",
          parent_stop:   "$events.parent_stop",
          machine_name:  "$equip.display_name",
          start_time: {
            $dateToString: {
              format:   "%Y-%m-%dT%H:%M:%S.%L",
              date:     "$events.start_time",
              timezone: "+05:30"
            }
          },
          end_time: {
            $dateToString: {
              format:   "%Y-%m-%dT%H:%M:%S.%L",
              date:     "$events.end_time",
              timezone: "+05:30"
            }
          },
          duration:      "$events.duration",
          fault_name:    { $ifNull: ["$st.fault_name", "$events.stop_name"] },
          parts:         {
            $ifNull: [{
              $reduce: {
                input:       "$cmts.parts",
                initialValue:"", 
                in: {
                  $concat: ["$$value", { $cond: [{ $eq: ["$$value",""] }, "","; "] }, "$$this"]
                }
              }
            }, ""]
          },
          batch:          "$batch.batch",
          fgex:           "$fgex.sku_description",
          shift:          "$shift",
          date:           "$date",
          operator_name:  { $ifNull: ["$rosters.operator_name","Not Defined"] },
          user_comment:   { $arrayElemAt: ["$cmts.user_comment",0] },
          fault_cause:    {
            $reduce: {
              input:       "$cmts.causes.cause_name",
              initialValue:"",
              in: {
                $concat: ["$$value",{$cond:[{$eq:["$$value",""]},"","; "]},"$$this"]
              }
            }
          }
        }
      },
      {
        $project: {
          _id:           1,
          stop_name:     1,
          parent_stop:   1,
          machine_name:  1,
          start_time:    1,
          end_time:      1,
          duration:      1,
          fault_name:    1,
          parts:         1,
          batch:         1,
          fgex:          1,
          shift:         1,
          date:          1,
          operator_name: 1,
          user_comment:  1,
          fault_cause:   { $ifNull: ["$fault_cause",""] }
        }
      }
    ];

    // 3) execute & return
    const report = await mongoose.model("Stop")
      .aggregate(pipeline)
      .allowDiskUse(true);

    res.json(report);
  }
  catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/day_state_wise_report_3", async (req, res) => {
  var start = req.query.startDate;
  var end = req.query.endDate;
  var machine_arr = req.query.machine_arr.split(";");
  var state_arr = req.query.state_arr.split(";");
  var critical_machine = req.query.critical_machine;
  var critical_machine_state = req.query.critical_machine_state_arr.split(";");
  var duration = Number(req.query.duration) * 60 || 0.7;
  var line_id = req.query.line_id;
  if (!line_id) {
    res.status(404).send("Please send Line id");
    return;
  }
  var project = await Stop.aggregate([
    {
      $match: {
        line_id: mongoose.Types.ObjectId(line_id),
        $and: [
          {
            date: {
              $lte: new Date(end),
            },
          },
          {
            date: {
              $gte: new Date(start),
            },
          },
        ],
        $or: [
          {
            $and: [
              {
                parent_stop: {
                  $in: critical_machine_state,
                },
              },
              {
                machine_name: {
                  $eq: critical_machine,
                },
              },
            ],
          },
          {
            $and: [
              {
                parent_stop: {
                  $in: state_arr,
                },
              },
              {
                machine_name: {
                  $in: machine_arr,
                },
              },
              {
                machine_name: {
                  $ne: critical_machine,
                },
              },
            ],
          },
        ],
      },
    },
    {
      $project: {
        start_time: 1,
        end_time: {
          $ifNull: ["$end_time", new Date()],
        },
        machine_name: 1,
        batch: 1,
        fgex: 1,
        shift: 1,
        date: 1,
        stop_name: 1,
        line_id: 1,
        parent_stop: 1,
        event_end_good_count: {
          $split: ["$event_end_data.shift_goodCount", " / "],
        },
        event_start_good_count: {
          $split: ["$event_start_data.shift_goodCount", " / "],
        },
      },
    },
    {
      $project: {
        start_time: 1,
        line_id: 1,
        end_time: 1,
        machine_name: 1,
        batch: 1,
        fgex: 1,
        shift: 1,
        date: 1,
        stop_name: 1,
        parent_stop: 1,
        event_end_good_count: {
          $ifNull: [
            {
              $toInt: { $arrayElemAt: ["$event_end_good_count", 0] },
            },
            0,
          ],
        },
        event_start_good_count: {
          $ifNull: [
            {
              $toInt: { $arrayElemAt: ["$event_start_good_count", 0] },
            },
            0,
          ],
        },
        duration: {
          $round: [
            {
              $divide: [
                {
                  $subtract: ["$end_time", "$start_time"],
                },
                1000,
              ],
            },
            2,
          ],
        },
      },
    },
    {
      $match: {
        $expr: {
          $gt: ["$duration", duration],
        },
      },
    },
    {
      $lookup: {
        from: "statusnames",
        let: {
          line_id: "$line_id",
          stop_name: "$stop_name",
          machine_name: "$machine_name",
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
                    $eq: ["$fault_code", "$$stop_name"],
                  },
                  {
                    $eq: ["$machine_name", "$$machine_name"],
                  },
                ],
              },
            },
          },
        ],
        as: "status_name",
      },
    },
    {
      $lookup: {
        from: "equipment",
        let: { line_id: "$line_id", equipment_name: "$machine_name" },
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
        as: "machine_name",
      },
    },
    {
      $lookup: {
        from: "batchskutriggers",
        localField: "batch",
        foreignField: "_id",
        as: "batch",
      },
    },
    {
      $lookup: {
        from: "fgexes",
        localField: "fgex",
        foreignField: "_id",
        as: "fgex",
      },
    },
    {
      $lookup: {
        from: "comments",
        let: { stop_id: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$stop_id", "$$stop_id"] } } },
          {
            $lookup: {
              from: "faultcauses",
              let: { selected_causes: { $ifNull: ["$selected_causes", []] } },
              pipeline: [
                { $match: { $expr: { $in: ["$_id", "$$selected_causes"] } } },
              ],
              as: "selected_causes",
            },
          },
          {
            $project: {
              selected_causes: 1,
              parts: 1,
              user_comment: {
                $map: {
                  input: "$user_comment",
                  as: "comment",
                  in: {
                    username: "$$comment.user_name",
                    comment: "$$comment.comment",
                    comment_date: {
                      $dateToString: {
                        format: "%Y-%m-%dT%H:%M:%S.%L",
                        date: "$$comment.timestamp",
                        timezone: "+05:30",
                      },
                    },
                  },
                },
              },
            },
          },
        ],
        as: "comments",
      },
    },
    {
      $lookup: {
        from: "rosters",
        let: { date: "$date", shift: "$shift", line_id: "$line_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$date", "$$date"] },
                  { $eq: ["$line_id", "$$line_id"] },
                ],
              },
            },
          },
          {
            $project: {
              operator: {
                $filter: {
                  input: "$shift_wise",
                  as: "shift_name",
                  cond: { $eq: ["$$shift_name.shift_name", "$$shift"] },
                },
              },
            },
          },
          {
            $unwind: {
              path: "$operator",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "operators",
              let: { operator_name: "$operator.operator_name" },
              pipeline: [
                { $match: { $expr: { $eq: ["$_id", "$$operator_name"] } } },
              ],
              as: "operator",
            },
          },
          {
            $unwind: {
              path: "$operator",
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
        as: "roster",
      },
    },
    {
      $unwind: {
        path: "$status_name",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$roster",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$machine_name",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$comments",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        start_time: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S.%L",
            date: "$start_time",
            timezone: "+05:30",
          },
        },
        end_time: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S.%L",
            date: "$end_time",
            timezone: "+05:30",
          },
        },
        duration: 1,
        parent_stop: 1,
        machine_name: "$machine_name.display_name",
        status_name: "$status_name",
        batch: "$batch.batch",
        fgex: "$fgex.fgex",
        shift: "$shift",
        date: "$date",
        operator_name: "$roster.operator.display_name",
        parts: {
          $reduce: {
            input: "$comments.parts",
            initialValue: "",
            in: {
              $concat: [
                "$$value",
                { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                "$$this",
              ],
            },
          },
        },
        selected_causes: "$comments.selected_causes.cause_name",
        user_comment1: { $arrayElemAt: ["$comments.user_comment", 0] },
        stop_name: 1,
        line_id: 1,
        event_end_good_count: 1,
        event_start_good_count: 1
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
        path: "$fgex",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        stop_name: 1,
        machine_name: 1,
        start_time: 1,
        end_time: 1,
        parent_stop: 1,
        line_id: 1,
        duration: 1,
        fault_name: {
          $ifNull: ["$status_name.fault_name", "Not Define in Database"],
        },
        parts: { $ifNull: ["$parts", ""] },
        batch: 1,
        fgex: 1,
        shift: 1,
        date: 1,
        event_end_good_count: 1,
        event_start_good_count: 1,
        operator_name: { $ifNull: ["$operator_name", "Not Defined"] },
        user_comment1: {
          $ifNull: ["$user_comment1", {}],
        } /* {
                    username:"$user_comment1.user_name",
                    comment_date:"$user_comment1.timestamp",
                    comment:"$user_comment1.comment"
                } */,
        fault_cause: {
          $ifNull: [
            {
              $reduce: {
                input: "$selected_causes",
                initialValue: "",
                in: {
                  $concat: [
                    "$$value",
                    { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                    "$$this",
                  ],
                },
              },
            },
            "",
          ],
        },
      },
    },
  ]);

  res.send(project);
});

router.get('/day_state_wise_report_combined', async (req, res) => {
  // Extract the query parameters from the request
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const machine_arr = req.query.machine_arr;
  const state_arr = req.query.state_arr;
  const critical_machine = req.query.critical_machine;
  const critical_machine_state_arr = req.query.critical_machine_state_arr;
  const duration = req.query.duration; // Convert duration to seconds

  // Check if line_ids are provided, split them into an array
  let lineIds = req.query.multiple_line_ids;
  if (!lineIds) {
    res.status(404).send("Please send Line id");
    return;
  }
  lineIds = lineIds.split(";"); // Split line_ids if provided as a semicolon-separated string

  // API base URL
  const baseUrl = 'http://localhost/api/trend/day_state_wise_report_2'; // Replace with your actual API base URL

  let combinedResults = [];

  try {
    // Iterate over all line_ids
    for (const line_id of lineIds) {
      // Construct the API URL with dynamic line_id and query parameters
      const apiUrl = `${baseUrl}?startDate=${startDate}&endDate=${endDate}&duration=${duration}&line_id=${line_id}&machine_arr=${machine_arr}&state_arr=${state_arr}&critical_machine=${critical_machine}&critical_machine_state_arr=${critical_machine_state_arr}`;

      console.log(apiUrl);
      // Make the API call
      const response = await axios.get(apiUrl);
const rows = Array.isArray(response.data)
  ? response.data
  : [ response.data ];

// for each row, spread its existing props and add your line_id
const decorated = rows.map(row => ({
  ...row,
  line_id,        // ← this is the per-loop variable
}));

      combinedResults.push(...decorated);

    }

    // Send the combined results as the response
    res.send(combinedResults);
  } catch (error) {
    console.error('Error while fetching or combining data:', error.message);
    res.status(500).send('An error occurred while fetching data.');
  }
});

router.get("/state_wise", async (req, res) => {
  var date = req.query["date"] + "T00:00:00.000Z";
  var shift = req.query.shift;
  var state = new RegExp(req.query.machine_state);
  //console.log(state)
  var total_time, start_timestamp, end_timestamp, shift;
  // var current_shift = await CurrentShift();
  // var current_shift = cur_shift.CurrentShift
  // console.log(cur_shift);
  var current_shift = await Shift.findOne({ shiftName: shift });
  // console.log(current_shift);
  var oper = await Project.findOne({ date: date, shiftName: shift }).populate(
    "operator_name"
  );
  //console.log(oper);
  var operater = oper.operator_name.operator_name;
  start_timestamp = req.query["date"]; //+ "T" + moment.utc(current_shift.shiftStartTime * 60000).format('HH:mm:ss');
  if (current_shift.shiftEndTime > current_shift.shiftStartTime) {
    end_timestamp =
      req.query["date"] +
      "T" +
      moment.utc(current_shift.shiftEndTime * 60000).format("HH:mm:ss");
  } else {
    end_timestamp =
      moment(req.query["date"]).add(1, "days").format("YYYY-MM-DD") +
      "T" +
      moment.utc(current_shift.shiftEndTime * 60000).format("HH:mm:ss");
  }
  var current_timestamp = moment().local().format();
  var project = await Stop.aggregate([
    {
      $match: {
        stop_name: state,
        $or: [
          {
            end_time: null,
          },
          {
            $and: [
              {
                start_time: {
                  $lte: new Date(start_timestamp),
                },
              },
              {
                end_time: {
                  $gte: new Date(start_timestamp),
                },
              },
            ],
          },
          {
            $and: [
              {
                start_time: {
                  $lte: new Date(end_timestamp),
                },
              },
              {
                end_time: {
                  $gte: new Date(end_timestamp),
                },
              },
            ],
          },
          {
            $and: [
              {
                start_time: {
                  $gte: new Date(start_timestamp),
                },
              },
              {
                end_time: {
                  $lte: new Date(end_timestamp),
                },
              },
            ],
          },
        ],
      },
    },
    {
      $lookup: {
        from: "statusnames",
        localField: "stop_name",
        foreignField: "fault_code",
        as: "status_name",
      },
    },
    {
      $lookup: {
        from: "equipment",
        localField: "machine_name",
        foreignField: "equipment_name",
        as: "machine_name",
      },
    },
    {
      $lookup: {
        from: "comments",
        let: { stop_id: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$stop_id", "$$stop_id"] } } },
          {
            $lookup: {
              from: "faultcauses",
              let: { selected_causes: { $ifNull: ["$selected_causes", []] } },
              pipeline: [
                { $match: { $expr: { $in: ["$_id", "$$selected_causes"] } } },
              ],
              as: "selected_causes",
            },
          },
          {
            $project: {
              selected_causes: 1,
              parts: 1,
              user_comment: {
                $map: {
                  input: "$user_comment",
                  as: "comment",
                  in: {
                    username: "$$comment.user_name",
                    comment: "$$comment.comment",
                    comment_date: {
                      $dateToString: {
                        format: "%Y-%m-%dT%H:%M:%S.%L+04:00",
                        date: "$$comment.timestamp",
                        timezone: "+04:00",
                      },
                    },
                  },
                },
              },
            },
          },
        ],
        as: "comments",
      },
    },
    {
      $unwind: {
        path: "$status_name",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$machine_name",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$comments",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        start_time: {
          $switch: {
            branches: [
              {
                case: { $lte: ["$start_time", new Date(start_timestamp)] },
                then: new Date(start_timestamp),
              },
              {
                case: { $gt: ["$start_time", new Date(end_timestamp)] },
                then: new Date(end_timestamp),
              },
            ],
            default: "$start_time",
          },
        },
        end_time: {
          $switch: {
            branches: [
              {
                case: { $eq: ["$end_time", null] },
                then: new Date(end_timestamp),
              },
              {
                case: { $gt: ["$end_time", new Date(end_timestamp)] },
                then: new Date(end_timestamp),
              },
            ],
            default: "$end_time",
          },
        },
        machine_name: "$machine_name.display_name",
        status_name: "$status_name",
        parts: {
          $reduce: {
            input: "$comments.parts",
            initialValue: "",
            in: {
              $concat: [
                "$$value",
                { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                "$$this",
              ],
            },
          },
        },
        selected_causes: "$comments.selected_causes.cause_name",
        user_comment1: { $arrayElemAt: ["$comments.user_comment", 0] },
        stop_name: 1,
      },
    },
    {
      $project: {
        stop_name: 1,
        machine_name: 1,
        start_time: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S.%L+04:00",
            date: "$start_time",
            timezone: "+04:00",
          },
        },
        end_time: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S.%L+04:00",
            date: "$end_time",
            timezone: "+04:00",
          },
        },
        fault_name: "$status_name.fault_name",
        shift: current_shift.shiftName,
        operator: operater,
        parts: { $ifNull: ["$parts", ""] },
        user_comment1: {
          $ifNull: ["$user_comment1", {}],
        } /* {
				username:"$user_comment1.user_name",
				comment_date:"$user_comment1.timestamp",
				comment:"$user_comment1.comment"
			} */,
        fault_cause: {
          $ifNull: [
            {
              $reduce: {
                input: "$selected_causes",
                initialValue: "",
                in: {
                  $concat: [
                    "$$value",
                    { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                    "$$this",
                  ],
                },
              },
            },
            "",
          ],
        },
        duration: {
          $round: [
            {
              $divide: [
                {
                  $subtract: ["$end_time", "$start_time"],
                },
                1000 * 60,
              ],
            },
            2,
          ],
        },
      },
    },
    {
      $match: {
        $expr: {
          $gt: ["$duration", 0],
        },
      },
    },
  ]);
  res.send(project);
});

router.get("/shifthistory", async (req, res) => {
  try {
    const line_id = req.query.line_id;
    if (!line_id) {
      return res.status(400).send("Please send Line id");
    }

    // 1) Get current shift/date
    const { shift: current_shift, date: current_date } = await CurrentShift();
    const date  = req.query.date  ? new Date(req.query.date + "T00:00:00.000Z") : current_date;
    const shift = req.query.shift || current_shift;

    // 2) Capture "now" once
    const now = new Date();

    // 3) Build pipeline
    const pipeline = [
      // A) match the right line/shift/date
      { $match: {
          line_id: new mongoose.Types.ObjectId(line_id),
          shift,
          date
        }
      },

      // B) unwind per‐machine
      { $unwind: "$machine_wise" },

      // C) lookup display_name
      {
        $lookup: {
          from: "equipment",
          let: { lid: "$line_id", m: "$machine_wise.machine_name" },
          pipeline: [
            { $match: {
                $expr: {
                  $and: [
                    { $eq: ["$line_id",        "$$lid"] },
                    { $eq: ["$equipment_name", "$$m"]   }
                  ]
                }
              }
            },
            { $project: { display_name: 1 } }
          ],
          as: "equip"
        }
      },
      { $unwind: { path: "$equip", preserveNullAndEmptyArrays: true } },

      // D) zip each event with the next one (or a dummy shift‐end event)
      {
        $project: {
          line_id:              1,
          date:                 1,
          shift:                1,
          shift_start_timestamp: 1,
          shift_end_timestamp:   1,
          machine_name:         "$machine_wise.machine_name",
          display_name:         "$equip.display_name",
          eventPairs: {
            $zip: {
              inputs: [
                "$machine_wise.event_wise",
                {
                  $concatArrays: [
                    {
                      $cond: [
                        { $gt: [{ $size: "$machine_wise.event_wise" }, 1 ] },
                        { $slice: [
                            "$machine_wise.event_wise",
                            1,
                            { $subtract: [
                                { $size: "$machine_wise.event_wise" },
                                1
                              ]
                            }
                          ]
                        },
                        []
                      ]
                    },
                    // dummy object carrying shift_end + zero good_count
                    [{ timestamp: "$shift_end_timestamp", good_count: 0 }]
                  ]
                }
              ]
            }
          }
        }
      },

      // E) compute start/end/duration/good‐counts in one pass
      {
        $addFields: {
          events: {
            $map: {
              input: "$eventPairs",
              as:    "pair",
              in: {
                $let: {
                  vars: {
                    ev:        { $arrayElemAt: ["$$pair", 0] },
                    rawNextEv: { $arrayElemAt: ["$$pair", 1] }
                  },
                  in: {
                    $mergeObjects: [
                      "$$ev",
                      {
                        start_time:           "$$ev.timestamp",
                        end_time: {
                          $cond: [
                            { $gt: ["$$rawNextEv.timestamp", now] },
                            now,
                            "$$rawNextEv.timestamp"
                          ]
                        },
                        duration: {
                          $divide: [
                            {
                              $subtract: [
                                {
                                  $cond: [
                                    { $gt: ["$$rawNextEv.timestamp", now] },
                                    now,
                                    "$$rawNextEv.timestamp"
                                  ]
                                },
                                "$$ev.timestamp"
                              ]
                            },
                            1000
                          ]
                        },
                        event_end_good_count:   { $ifNull: ["$$rawNextEv.good_count", 0] },
                        event_start_good_count: "$$ev.good_count"
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },

      // F) drop any events timestamped at/after shift end
      {
        $addFields: {
          events: {
            $filter: {
              input: "$events",
              as:    "e",
              cond:  { $lt: ["$$e.timestamp", "$shift_end_timestamp"] }
            }
          }
        }
      },

      // G) unwind back to one‐event docs
      { $unwind: "$events" },

      // H) lookup human‐friendly fault_name
      {
        $lookup: {
          from: "statusnames",
          let: { lid: "$line_id", sn: "$events.stop_name", m: "$machine_name" },
          pipeline: [
            { $match: {
                $expr: {
                  $and: [
                    { $eq: ["$line_id",       "$$lid"] },
                    { $eq: ["$fault_code",    "$$sn"] },
                    { $eq: ["$machine_name", "$$m"] }
                  ]
                }
              }
            },
            { $project: { fault_name: 1 } }
          ],
          as: "st"
        }
      },
      { $unwind: { path: "$st", preserveNullAndEmptyArrays: true } },

      // I) massage fields exactly as before
      {
        $addFields: {
          "events.fault_name":  { $ifNull: ["$st.fault_name", "$events.stop_name"] },
          "events.stop_name":   "$events.parent_stop",
          "events.machine_name":"$machine_name",
          "events.display_name":"$display_name"
        }
      },

      // J) group back into one shift‐document
      {
        $group: {
          _id: {
            line_id:          "$line_id",
            shift:            "$shift",
            date:             "$date",
            shift_start_time: "$shift_start_timestamp",
            shift_end_time:   "$shift_end_timestamp"
          },
          events: { $push: "$events" }
        }
      },

      // K) final reshape to match your original output
      {
        $project: {
          _id:           0,
          line_id:       "$_id.line_id",
          shiftname:     "$_id.shift",
          shiftStartime: {
            $dateToString: {
              date:     "$_id.shift_start_time",
              format:   "%Y-%m-%dT%H:%M:%S",
              timezone: "Asia/Kolkata"
            }
          },
          shiftEndime: {
            $dateToString: {
              date:     "$_id.shift_end_time",
              format:   "%Y-%m-%dT%H:%M:%S",
              timezone: "Asia/Kolkata"
            }
          },
          date:   "$_id.date",
          events: 1
        }
      }
    ];

    // 4) execute
    const result = await mongoose.model("Stop")
      .aggregate(pipeline)
      .allowDiskUse(true);

    // return exactly what you did before
    res.send(result[0] || { events: [] });
  }
  catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/history", async (req, res) => {
  var line_id = req.query.line_id;
  var shift = req.query.shift;
  var startDate = req.query.startDate;
  var endDate = req.query.endDate;
  var type = req.query.type;
  var total_time = 3600;
  var line_match;
  if (line_id && !type) {
    if (shift) {
      line_match = {
        $match: {
          line_id: new mongoose.Types.ObjectId(line_id),
          shift: shift,
          $and: [
            {
              date: {
                $lte: new Date(endDate),
              },
            },
            {
              date: {
                $gte: new Date(startDate),
              },
            },
          ],
        },
      };
    } else {
      line_match = {
        $match: {
          line_id: new mongoose.Types.ObjectId(line_id),
          $and: [
            {
              date: {
                $lte: new Date(endDate),
              },
            },
            {
              date: {
                $gte: new Date(startDate),
              },
            },
          ],
        },
      };
    }
  } else {
    if (shift) {
      line_match = {
        $match: {
          //line_id: mongoose.Types.ObjectId(line_id),
          shift: shift,
          $and: [
            {
              date: {
                $lte: new Date(endDate),
              },
            },
            {
              date: {
                $gte: new Date(startDate),
              },
            },
          ],
        },
      };
    } else {
      if (!startDate || !endDate) {
        var data = await CurrentShift();
        var current_shift = data.shift;
        var current_date = data.date;
        line_match = {
          $match: {
            //line_id: mongoose.Types.ObjectId(line_id),
            shift: current_shift,
            date: new Date(current_date)
          },
        };
      } else {
        line_match = {
          $match: {
            //line_id: mongoose.Types.ObjectId(line_id),
            $and: [
              {
                date: {
                  $lte: new Date(endDate),
                },
              },
              {
                date: {
                  $gte: new Date(startDate),
                },
              },
            ],
          },
        };
      }
    }
  }
  var data = await History.aggregate([
    line_match,
    {
      $lookup: {
        from: "addlines",
        localField: "line_id",
        foreignField: "line_id",
        as: "addline",
      },
    },
    {
      $unwind: {
        path: "$addline",
        preserveNullAndEmptyArrays: true,
      },
    },
    { $unwind: "$time_wise" },
    {
      $unwind: {
        path: "$time_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        last_machine_data: {
          $filter: {
            input: "$time_wise.data",
            as: "data",
            cond: {
              $eq: [
                "$$data.machine_name",
                "$addline.last_machine_count_machine",
              ],
            },
          },
        },
        critical_machine_data: {
          $filter: {
            input: "$time_wise.data",
            as: "data",
            cond: { $eq: ["$$data.machine_name", "$addline.critical_machine"] },
          },
        },
      },
    },
    {
      $addFields: {
        critical_machine_data: {
          $arrayElemAt: ["$critical_machine_data", 0],
        },
        last_machine_data: {
          $arrayElemAt: ["$last_machine_data", 0],
        },
      },
    },
    {
      $project: {
        start_time: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M",
            date: "$time_wise.start_timestamp",
            timezone: "+05:30",
          },
        },
        end_time: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M",
            date: "$time_wise.end_timestamp",
            timezone: "+05:30",
          },
        },
        machine: {
          code: "$critical_machine_data.machine_name",
          name: "$critical_machine_data.machine_name",
        },
        date: "$date",
        shift: "$shift",
        line_id: "$line_id",
        operator_name: "$critical_machine_data.operator_name",
        total_energy: "$critical_machine_data.total_energy",
        fgex: "$time_wise.fgex.sku_description",
        bottles_per_case: "$time_wise.fgex.bottles_per_case",
        fgex_number: "$time_wise.fgex.sku_number",
        ...nonNegativeFields([
          'goodcount',
          'reject_count',
          'executing.duration',
          'major_fault.duration',
          'minor_fault.duration',
          'major_fault.count',
          'minor_fault.count',
          'pdt.duration',
          'pdt.count',
          'updt.duration',
          'updt.count',
          'cip.duration',
          'cip.count',
          'changeover.duration',
          'changeover.count',
          'blocked.duration',
          'blocked.count',
          'waiting.duration',
          'waiting.count',
          'major_manual_stop.duration',
          'minor_manual_stop.duration',
          'major_manual_stop.count',
          'minor_manual_stop.count',
          'ready.duration',
          'ready.count'
        ]),
        speed: {
          $cond: [
            {
              $or: [
                { $lte: ["$critical_machine_data.executing.duration", 60] },
                { $eq: ["$critical_machine_data.goodcount", 0] },
              ],
            },
            0,
            {
              $round: [
                {
                  $divide: [
                    "$critical_machine_data.goodcount",
                    { $divide: ["$critical_machine_data.executing.duration", 60] },
                  ],
                },
                0,
              ],
            },
          ],
        },
        rated_speed: { $divide: ["$time_wise.fgex.rated_speed", 60] },
        rated_speed_case: {
          $cond: [
            {
              $or: [
                { $eq: ["$time_wise.fgex.bottles_per_case", 0] },
                { $eq: ["$time_wise.fgex.rated_speed", 0] }
              ]
            },
            0,
            {
              $divide: [
                {
                  $divide: ["$time_wise.fgex.rated_speed", 60]
                },
                "$time_wise.fgex.bottles_per_case"
              ]
            }
          ]
        },
        last_machine_goodcount: "$last_machine_data.goodcount",
        manual_casecount: "$last_machine_data.manual_casecount",
        last_machine_pdt: "$last_machine_data.pdt.duration",
        last_machine_cip: "$last_machine_data.cip.duration",
        last_machine_changeover: "$last_machine_data.changeover.duration",

      }
    },
    {
      $project: {
        start_time: 1,
        end_time: 1,
        machine: 1,
        date: 1,
        shift: 1,
        line_id: 1,
        goodcount: 1,
        last_machine_goodcount: 1,
        manual_casecount: 1,
        last_machine_cip: 1,
        last_machine_pdt: 1,
        last_machine_changeover: 1,
        reject_count: 1,
        executing: 1,
        major_fault: 1,
        minor_fault: 1,
        major_fault_count: 1,
        minor_fault_count: 1,
        pdt: 1,
        pdt_count: 1,
        updt: 1,
        updt_count: 1,
        cip: 1,
        cip_count: 1,
        changeover: 1,
        changeover_count: 1,
        blocked: 1,
        blocked_count: 1,
        waiting: 1,
        waiting_count: 1,
        major_manual_stop: 1,
        minor_manual_stop: 1,
        major_manual_stop_count: 1,
        minor_manual_stop_count: 1,
        idle: 1,
        idle_count: 1,
        operator_name: 1,
        total_energy: 1,
        speed: 1,
        rated_speed: 1,
        fgex: 1,
        bottles_per_case: 1,
        fgex_number: 1,
        total_time: total_time,
        et: {
          $divide: ["$goodcount", "$rated_speed"],
        },
        npt: {
          $round: [
            {
              $subtract: [
                total_time,
                {
                  $sum: ["$pdt"],
                },
              ],
            },
            0,
          ],
        },
        last_machine_npt: {
          $round: [
            {
              $subtract: [
                total_time,
                {
                  $sum: ["$last_machine_pdt"],
                },
              ],
            },
            0,
          ],
        },
        last_machine_et: {
          $divide: ["$last_machine_goodcount", "$rated_speed_case"],
        },
        rated_speed_case: 1,

        ppt_time: {
          $round: [
            {
              $subtract: [
                total_time,
                {
                  $sum: ["$pdt", "$updt", "$changeover", "$cip"],
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
                total_time,
                {
                  $sum: [
                    "$pdt",
                    "$updt",
                    "$changeover",
                    "$cip",
                    "$major_fault",
                    "$major_manual_stop",
                  ],
                },
              ],
            },
            0,
          ],
        },
        total_idle_time: {
          $sum: [
            "$blocked",
            "$waiting",
            "$minor_fault",
            "$minor_manual_stop",
            "$ready",
          ],
        },
      },
    },
    {
      $project: {
        start_time: 1,
        end_time: 1,
        machine: 1,
        date: 1,
        shift: 1,
        line_id: 1,
        goodcount: 1,
        last_machine_goodcount: 1,
        manual_casecount: 1,
        last_machine_cip: 1,
        last_machine_pdt: 1,
        last_machine_changeover: 1,
        reject_count: 1,
        executing: 1,
        major_fault: 1,
        minor_fault: 1,
        major_fault_count: 1,
        minor_fault_count: 1,
        pdt: 1,
        pdt_count: 1,
        updt: 1,
        updt_count: 1,
        cip: 1,
        cip_count: 1,
        changeover: 1,
        rated_speed_case: 1,
        changeover_count: 1,
        blocked: 1,
        blocked_count: 1,
        waiting: 1,
        waiting_count: 1,
        major_manual_stop: 1,
        minor_manual_stop: 1,
        major_manual_stop_count: 1,
        minor_manual_stop_count: 1,
        idle: 1,
        idle_count: 1,
        operator_name: 1,
        total_energy: 1,
        speed: 1,
        rated_speed: 1,
        fgex: 1,
        bottles_per_case: 1,
        fgex_number: 1,
        total_time: 1,
        ppt_time: {
          $cond: [
            {
              $lt: ["$ppt_time", 60],
            },
            0,
            "$ppt_time",
          ],
        },
        got_time: {
          $cond: [
            {
              $lt: ["$got_time", 60],
            },
            0,
            "$got_time",
          ],
        },
        total_idle_time: 1,
        performance_time: {
          $cond: [
            {
              $or: [
                {
                  $lte: ["$got_time", 60],
                },
                //{ $lt: [{ $sum: ["$goodCount", "$reject_count"] }, 0] },
              ],
            },
            0,
            {
              $round: [
                {
                  $subtract: [
                    "$got_time",
                    {
                      $sum: [
                        {
                          $divide: [
                            {
                              $sum: ["$goodcount", "$reject_count"],
                            },
                            "$rated_speed",
                          ],
                        },
                        "$major_fault",
                        "$major_manual_stop",
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
        et: { $round: "$et" },
        last_machine_npt: { $round: "$last_machine_npt" },
        last_machine_et: { $round: "$last_machine_et" },
        npt: {
          $cond: [
            {
              $lt: ["$npt", 70],
            },
            0,
            "$npt",
          ],
        },
      },
    },
    {
      $project: {
        start_time: 1,
        end_time: 1,
        machine: 1,
        date: 1,
        shift: 1,
        line_id: 1,
        goodcount: 1,
        last_machine_goodcount: 1,
        manual_casecount: 1,
        last_machine_cip: 1,
        last_machine_pdt: 1,
        last_machine_changeover: 1,
        et: 1,
        npt: 1,
        reject_count: 1,
        executing: 1,
        major_fault: 1,
        minor_fault: 1,
        major_fault_count: 1,
        minor_fault_count: 1,
        pdt: 1,
        pdt_count: 1,
        updt: 1,
        updt_count: 1,
        cip: 1,
        cip_count: 1,
        changeover: 1,
        changeover_count: 1,
        blocked: 1,
        blocked_count: 1,
        waiting: 1,
        waiting_count: 1,
        major_manual_stop: 1,
        minor_manual_stop: 1,
        major_manual_stop_count: 1,
        minor_manual_stop_count: 1,
        idle: 1,
        idle_count: 1,
        operator_name: 1,
        total_energy: 1,
        speed: 1,
        last_machine_et: 1,
        last_machine_npt: 1,
        rated_speed_case: 1,
        rated_speed: 1,
        fgex: 1,
        bottles_per_case: 1,
        fgex_number: 1,
        total_time: 1,
        ppt_time: 1,
        got_time: 1,
        total_idle_time: 1,
        performance_time: 1,
        reject_time: 1,
        speed_loss: {
          $subtract: ["$performance_time", "$total_idle_time"],
        },
      },
    },
    {
      $project: {
        start_time: 1,
        end_time: 1,
        machine: 1,
        date: 1,
        shift: 1,
        line_id: 1,
        goodcount: 1,
        last_machine_goodcount: 1,
        manual_casecount: 1,
        last_machine_cip: 1,
        last_machine_pdt: 1,
        last_machine_changeover: 1,
        et: 1,
        npt: 1,
        reject_count: 1,
        executing: 1,
        major_fault: 1,
        minor_fault: 1,
        major_fault_count: 1,
        minor_fault_count: 1,
        pdt: 1,
        pdt_count: 1,
        updt: 1,
        updt_count: 1,
        cip: 1,
        cip_count: 1,
        changeover: 1,
        changeover_count: 1,
        blocked: 1,
        blocked_count: 1,
        waiting: 1,
        waiting_count: 1,
        major_manual_stop: 1,
        minor_manual_stop: 1,
        major_manual_stop_count: 1,
        minor_manual_stop_count: 1,
        idle: 1,
        idle_count: 1,
        operator_name: 1,
        total_energy: 1,
        speed: 1,
        rated_speed: 1,
        fgex: 1,
        bottles_per_case: 1,
        fgex_number: 1,
        total_time: 1,
        ppt_time: 1,
        got_time: 1,
        total_idle_time: 1,
        performance_time: 1,
        reject_time: 1,
        speed_loss: 1,
        last_machine_et: 1,
        last_machine_npt: 1,
        rated_speed_case: 1,
        net_operating_time: {
          $subtract: [
            "$got_time",
            {
              $sum: [
                "$total_idle_time",
                "$speed_loss",
              ],
            },
          ],
        },
      },
    },
    {
      $project: {
        start_time: 1,
        end_time: 1,
        machine: 1,
        date: 1,
        shift: 1,
        line_id: 1,
        goodcount: 1,
        last_machine_goodcount: 1,
        manual_casecount: 1,
        last_machine_cip: 1,
        last_machine_pdt: 1,
        last_machine_changeover: 1,
        et: 1,
        npt: 1,
        reject_count: 1,
        executing: 1,
        major_fault: 1,
        minor_fault: 1,
        major_fault_count: 1,
        minor_fault_count: 1,
        pdt: 1,
        pdt_count: 1,
        updt: 1,
        updt_count: 1,
        cip: 1,
        cip_count: 1,
        changeover: 1,
        changeover_count: 1,
        blocked: 1,
        blocked_count: 1,
        waiting: 1,
        waiting_count: 1,
        major_manual_stop: 1,
        minor_manual_stop: 1,
        major_manual_stop_count: 1,
        minor_manual_stop_count: 1,
        idle: 1,
        idle_count: 1,
        operator_name: 1,
        total_energy: 1,
        speed: 1,
        rated_speed: 1,
        fgex: 1,
        bottles_per_case: 1,
        fgex_number: 1,
        theoretical_time: "$total_time",
        planed_production_time: "$ppt_time",
        gross_operating_time: "$got_time",
        total_idle_time: 1,
        performance_time: 1,
        reject_time: 1,
        speed_loss: 1,
        net_operating_time: 1,
        last_machine_et: 1,
        last_machine_npt: 1,
        rated_speed_case: 1,
        productive_time: {
          $subtract: ["$net_operating_time", "$reject_time"],
        },
      },
    },
  ]);
  res.send(data);
});

// POST API to update hourly report
router.post('/update-history', async (req, res) => {
  try {
    // console.log(req.body.alloweventchartpopup)
    // if (!req.body.alloweventchartpopup) {
    //   return res.status(401).json({ message: 'Unauthorized', redirect: '/' });
    // }

    const { line_id, hourly_data, manual_case_count,  remark,userId,userName,original_total_count} = req.body;

    if (!line_id || !hourly_data || !Array.isArray(hourly_data)) {
      return res.status(400).json({ error: "Invalid request payload" });
    }
    if (original_total_count > 0) {
  const pctChange = Math.abs(manual_case_count - original_total_count) / original_total_count;
  if (pctChange > 0.021) {
    return res.status(400).json({
      error: `Total changed by ${(pctChange*100).toFixed(2)}% which exceeds the 2% limit.`
    });
  }
}

    // ✅ Fetch the Last Machine for the given line_id
    const lineDetails = await addLine.findOne({ line_id: line_id });

    if (!lineDetails || !lineDetails.last_machine_count_machine) {
      return res.status(400).json({ error: "No last machine found for the given line" });
    }

    const lastMachineName = lineDetails.last_machine_count_machine;

    for (const entry of hourly_data) {
      let { date, shift, start_timestamp, end_timestamp, manual_count } = entry;

      // ✅ Ensure date is stored correctly in MongoDB format
      const formattedDate = moment.utc(date, "YYYY-MM-DD").startOf('day').toDate();
      const projectDate = moment.utc(date, "YYYY-MM-DD").startOf('day').toISOString();
      const formattedStart = moment.utc(start_timestamp, 'YYYY-MM-DD HH:mm:ss').startOf('minute').toISOString();
      const formattedEnd = moment.utc(end_timestamp, 'YYYY-MM-DD HH:mm:ss').startOf('minute').toISOString();

      // ✅ Find ALL history entries matching `line_id`, `shift`, and `date`
      const histories = await History.find({ line_id, shift, date: formattedDate });

      if (!histories.length) {
        console.log(`⏭️ No history found for date: ${formattedDate}, shift: ${shift}. Skipping...`);
        continue;
      }

      for (const history of histories) {
        // ✅ Find existing `time_wise` entry
        const timeRecord = history.time_wise.find(
          (record) =>
            moment.utc(record.start_timestamp).startOf('minute').isSame(moment.utc(formattedStart).startOf('minute')) &&
            moment.utc(record.end_timestamp).startOf('minute').isSame(moment.utc(formattedEnd).startOf('minute'))
        );

        if (!timeRecord) {
          console.log(`⏭️ No matching time record for ${formattedStart} - ${formattedEnd}. Skipping...`);
          continue;
        }

        // ✅ Find the last machine inside `data` array using `lastMachineName`
        let machineData = timeRecord.data.find((dataItem) => dataItem.machine_name === lastMachineName);

        if (!machineData) {
          console.log(`⏭️ No matching last machine ${lastMachineName} found in time_wise data. Skipping...`);
          continue;
        }

        // ✅ Update `manual_casecount`
        machineData.manual_casecount = manual_count;

        // 2) record the change in updatedArr
            if (entry.original_count !== entry.manual_count) {
    history.updatedArr = history.updatedArr || [];
    history.updatedArr.push({
      date:             formattedDate,
      shift,
      start_timestamp:  formattedStart,
      end_timestamp:    formattedEnd,
      original_count:   entry.original_count,
      manual_count:     entry.manual_count,
      userId,
      userName,
      remark,
      timestamp:        new Date()
    });

  }


        // ✅ Save the updated history document
        await history.save();
        //console.log(`✅ Updated manual_casecount for machine: ${lastMachineName} in history record.`);
      }
      // console.log(line_id, projectDate)
    }

    // ────────────── Update Project Collection ──────────────
    // Group differences by date + shift (do this only once for all entries)
    const groupedCounts = {};

    // ✅ Step 1: Aggregate manual_count & original_count per shift + date
    for (const entry of hourly_data) {
      let { date, shift, manual_count, original_count } = entry;
      const formattedDate = moment.utc(date, "YYYY-MM-DD").startOf('day').toISOString();
      const key = `${formattedDate}_${shift}`;

      if (!groupedCounts[key]) {
        groupedCounts[key] = { totalOriginal: 0, totalManual: 0 };
      }
      groupedCounts[key].totalOriginal += original_count;
      groupedCounts[key].totalManual += manual_count;
    }
    // console.log(groupedCounts)
    // ✅ Step 2: Update projects **only once per shift**
    for (const key in groupedCounts) {
      // console.log(key)
      const [projectDate, shift] = key.split("_");
      const { totalOriginal, totalManual } = groupedCounts[key];

      const totalDifference = totalManual - totalOriginal; // ✅ Correctly calculate difference

      // ✅ Find the correct project document for the given date and line_id
      const project = await Project.findOne({
        line_id: new mongoose.Types.ObjectId(line_id),
        date: new Date(projectDate),
      });

      if (!project) {
        console.log(`⏭️ No project found for date: ${projectDate}. Skipping update...`);
        continue;
      }

      let shiftData = project.shift_wise.find((shiftEntry) => shiftEntry.shift_name === shift);
      if (!shiftData) {
        console.log(`⏭️ No matching shift (${shift}) found in project data. Skipping update...`);
        continue;
      }

      let lastMachineUpdated = false;

      // ✅ Find the last machine in machine_wise
      if (shiftData.batch_wise.length > 0) {
        const lastBatch = shiftData.batch_wise[shiftData.batch_wise.length - 1];

        if (lastBatch.vendor_wise.length > 0) {
          const lastVendor = lastBatch.vendor_wise[lastBatch.vendor_wise.length - 1];

          const lastMachine = lastVendor.machine_wise.find((m) => m.machine_name === lastMachineName);

          if (lastMachine) {
            // ✅ Ensure we update only once per shift
            lastMachine.manual_casecount = (lastMachine.manual_casecount || 0) + totalDifference;
            lastMachineUpdated = true;
          }
        }
      }

      if (lastMachineUpdated) {
        await project.save();
        //console.log(`✅ Updated manual_casecount with total difference: ${totalDifference} for shift: ${shift}`);
      } else {
        console.log(`⏭️ No matching machine found for shift: ${shift}. Skipping update...`);
      }
    }


    // ── (3) Save the remark(s) ─────────────────────────────────────────────

  if (remark && userId && userName) {
      const lineObjectId = new mongoose.Types.ObjectId(line_id);
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // dedupe by date
      const uniqueDates = Array.from(new Set(hourly_data.map(e => e.date)));
      for (const date of uniqueDates) {
        const dateObj = moment.utc(date, 'YYYY-MM-DD').startOf('day').toDate();

        // avoid exact duplicate
        const exists = await HourlyRemark.findOne({
          line_id: lineObjectId,
          date: dateObj,
          remarks: { $elemMatch: { userId: userObjectId, text: remark } }
        }).lean();

        if (!exists) {
          await HourlyRemark.findOneAndUpdate(
            { line_id: lineObjectId, date: dateObj },
            {
              $setOnInsert: { line_id: lineObjectId, date: dateObj },
              $push: {
                remarks: {
                  userId,
                  userName,
                  text: remark,
                  timestamp: new Date()
                }
              }
            },
            { upsert: true }
          );
        }
      }
    }
    return res.status(200).json({ success: true, message: "History and Project updated successfully." });

  } catch (error) {
    console.error("Error updating history and project:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


router.get("/reportday", async (req, res) => {
  var project_start = req.query["startDate"] + "T00:00:00.000+00:00";
  var project_end = req.query["endDate"] + "T00:00:00.000+00:00";
  var startDate = req.query["startDate"] + "T07:00:00";
  var end = req.query["endDate"] + "T07:00:00";
  var start = moment(start);
  var critical_machine = "siapi";
  var match = {
    $match: {
      $and: [
        {
          date: {
            $lte: new Date(project_end),
          },
        },
        {
          date: {
            $gte: new Date(project_start),
          },
        },
      ],
    },
  };
  var endDate = moment(end).utc().local().add(1, "day").format();
  var total_time = 480;
  var project = await Project.aggregate([
    match,
    {
      $lookup: {
        from: "skumasters",
        let: { sku: "$sku" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$sku"] } } },
          {
            $lookup: {
              from: "equipment",
              let: { equipments: "$equipments" },
              pipeline: [
                { $match: { $expr: { $in: ["$_id", "$$equipments"] } } },
                {
                  $project: {
                    _id: 0,
                    machine_name: "$equipment_name",
                  },
                },
              ],
              as: "equipments",
            },
          },
          {
            $project: {
              _id: 0,
              machine_name: "$equipments",
              rated_speed: 1,
              cpp: 1,
              sku_name: 1,
              bpc: 1,
            },
          },
          {
            $unwind: {
              path: "$machine_name",
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
        as: "sku",
      },
    },
    {
      $unwind: {
        path: "$sku",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        $expr: { $eq: ["$machine_name", "$sku.machine_name.machine_name"] },
      },
    },
    {
      $addFields: {
        rated_speed: {
          $switch: {
            branches: [
              {
                case: { $eq: ["$machine_name", "tmgcp"] },
                then: {
                  $divide: [
                    {
                      $divide: ["$sku.rated_speed", 60],
                    },
                    "$sku.bpc",
                  ],
                },
              },
              {
                case: { $eq: ["$machine_name", "weigher_case_sealer"] },
                then: {
                  $divide: [
                    {
                      $divide: ["$sku.rated_speed", 60],
                    },
                    "$sku.bpc",
                  ],
                },
              },
              {
                case: { $eq: ["$machine_name", "pallet_id"] },
                then: {
                  $divide: [
                    {
                      $divide: [
                        {
                          $divide: ["$sku.rated_speed", 60],
                        },
                        "$sku.bpc",
                      ],
                    },
                    "$sku.cpp",
                  ],
                },
              },
              {
                case: { $eq: ["$machine_name", "palletizer"] },
                then: {
                  $divide: [
                    {
                      $divide: [
                        {
                          $divide: ["$sku.rated_speed", 60],
                        },
                        "$sku.bpc",
                      ],
                    },
                    "$sku.cpp",
                  ],
                },
              },
            ],
            default: { $divide: ["$sku.rated_speed", 60] },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        machine_name: "$machine_name",
        sku: "$sku",
        date: "$date",
        shiftName: "$shiftName",
        stop: { $round: ["$stop", 2] },
        goodCount: "$goodCount",
        rejected_quantity: "$rejected_quantity",
        no_of_stop: "$no_of_stop",
        speed_loss: {
          $subtract: [
            total_time,
            {
              $subtract: [
                "$stop",
                {
                  $subtract: [
                    "$blocked",
                    {
                      $subtract: [
                        "$waiting",
                        {
                          $divide: ["$goodCount", "$rated_speed"],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        critical_machine_off: "$critical_machine_off",
        critical_machine_off_time: {
          $round: ["$critical_machine_off_time", 2],
        },
        manual_rejected_quantity: {
          $cond: [
            { $lte: ["$manual_rejected_quantity", 0] },
            "$rejected_quantity",
            "$manual_rejected_quantity",
          ],
        },
        manual_rework: {
          $cond: [{ $lte: ["$manual_rework", 0] }, 0, "$manual_rework"],
        },
        blocked: { $round: ["$blocked", 2] },
        waiting: { $round: ["$waiting", 2] },
        rated_speed: "$rated_speed",
      },
    },
    {
      $project: {
        total_days: 1,
        stop: 1,
        speed_loss: 1,
        bottle_loss: {
          $round: [
            {
              $multiply: [
                {
                  $sum: [
                    "$stop",
                    "$waiting",
                    "$blocked",
                    "$speed_loss",
                    {
                      $divide: ["$manual_rejected_quantity", "$rated_speed"],
                    },
                  ],
                },
                "$rated_speed",
              ],
            },
            0,
          ],
        },
        machine_name: 1,
        goodCount: 1,
        no_of_stop: 1,
        manual_rejected_quantity: 1,
        manual_rework: 1,
        critical_machine_off_time: 1,
        rejected_quantity: 1,
        blocked: 1,
        waiting: 1,
        sku_name: "$sku.sku_name",
        rated_speed: "$rated_speed",
        aviability: {
          $cond: [
            { $lte: ["$stop", 0] },
            1,
            {
              $round: [
                {
                  $divide: [
                    {
                      $subtract: [total_time, "$stop"],
                    },
                    total_time,
                  ],
                },
                2,
              ],
            },
          ],
        },
        performance: {
          $cond: [
            {
              $or: [
                {
                  $lte: [
                    {
                      $subtract: [total_time, "$stop"],
                    },
                    0,
                  ],
                },
                { $lte: ["$goodCount", 0] },
              ],
            },
            0,
            {
              $round: [
                {
                  $divide: [
                    "$goodCount",
                    {
                      $multiply: [
                        {
                          $subtract: [total_time, "$stop"],
                        },
                        "$rated_speed",
                      ],
                    },
                  ],
                },
                2,
              ],
            },
          ],
        },
        quality: {
          $cond: [
            {
              $lte: [
                {
                  $sum: ["$goodCount", "$manual_rejected_quantity"],
                },
                0,
              ],
            },
            0,
            {
              $round: [
                {
                  $divide: [
                    "$goodCount",
                    {
                      $sum: ["$goodCount", "$manual_rejected_quantity"],
                    },
                  ],
                },
                2,
              ],
            },
          ],
        },
      },
    },
    {
      $project: {
        total_days: 1,
        stop: 1,
        machine_name: 1,
        goodCount: 1,
        no_of_stop: 1,
        manual_rejected_quantity: 1,
        manual_rework: 1,
        critical_machine_off_time: 1,
        rejected_quantity: 1,
        blocked: 1,
        bottle_loss: {
          $cond: [{ $lt: ["$bottle_loss", 0] }, 0, "$bottle_loss"],
        },
        waiting: 1,
        sku_name: 1,
        rated_speed: 1,
        aviability: {
          $cond: [{ $gt: ["$aviability", 1] }, 1, "$aviability"],
        },
        performance: {
          $cond: [{ $gt: ["$performance", 1] }, 1, "$performance"],
        },
        quality: {
          $cond: [{ $gt: ["$quality", 1] }, 1, "$quality"],
        },
      },
    },
    {
      $group: {
        _id: "$machine_name",
        goodCount: { $sum: "$goodCount" },
        rated_speed: { $avg: "$rated_speed" },
        rejected_quantity: { $sum: "$rejected_quantity" },
        critical_machine_off_time: { $sum: "$critical_machine_off_time" },
        critical_machine_off: { $sum: "$critical_machine_off" },
        no_of_stop: { $sum: "$no_of_stop" },
        aviability: { $sum: "$aviability" },
        quality: { $sum: "$quality" },
        stop: { $sum: "$stop" },
        waiting: { $sum: "$waiting" },
        blocked: { $sum: "$blocked" },
        performance: { $sum: "$performance" },
        bottle_loss: { $sum: "$bottle_loss" },
        manual_rework: { $sum: "$manual_rework" },
        manual_rejected_quantity: { $sum: "$manual_rejected_quantity" },
        sku: { $addToSet: "$sku_name" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        machine_name: "$_id",
        goodCount: 1,
        rejected_quantity: 1,
        critical_machine_off_time: {
          $round: ["$critical_machine_off_time", 2],
        },
        critical_machine_off: 1,
        no_of_stop: 1,
        rated_speed: 1,
        manual_rework: 1,
        count: 1,
        sku: 1,
        bottle_loss: 1,
        stop: { $round: ["$stop", 2] },
        waiting: { $round: ["$waiting", 2] },
        blocked: { $round: ["$blocked", 2] },
        manual_rejected_quantity: 1,
        aviability: {
          $round: [
            {
              $divide: ["$aviability", "$count"],
            },
            2,
          ],
        },
        performance: {
          $round: [
            {
              $divide: ["$performance", "$count"],
            },
            2,
          ],
        },
        quality: {
          $round: [
            {
              $divide: ["$quality", "$count"],
            },
            2,
          ],
        },
      },
    },
    {
      $project: {
        machine_name: "$_id",
        goodCount: 1,
        count: 1,
        rejected_quantity: 1,
        rated_speed: 1,
        critical_machine_off_time: 1,
        oee: {
          $round: [
            {
              $multiply: ["$aviability", "$performance", "$quality", 100],
            },
            2,
          ],
        },
        critical_machine_off: 1,
        no_of_stop: 1,
        manual_rework: 1,
        sku: 1,
        stop: 1,
        waiting: 1,
        bottle_loss: 1,
        blocked: 1,
        manual_rejected_quantity: 1,
        aviability: { $round: [{ $multiply: ["$aviability", 100] }, 2] },
        performance: { $round: [{ $multiply: ["$performance", 100] }, 2] },
        quality: { $round: [{ $multiply: ["$quality", 100] }, 2] },
      },
    },
  ]);
  var machine_arr = [];
  var data_arr = [];
  var cal_arr = [];
  var send_obj = {};
  var machine_obj = {};
  machine_obj["vision"] = "-";
  machine_arr.push("vision");
  var parameter_wise, machine_wise, rework;
  project.forEach(async (data, i) => {
    machine_obj[data._id] = "-";
    machine_arr.push(data._id);
    data_arr.push(data);
    if (project.length == i + 1) {
      parameter_wise = await aggregate(
        "parameter_wise",
        startDate,
        endDate,
        machine_arr
      );
      machine_wise = await aggregate(
        "machine_wise",
        startDate,
        endDate,
        machine_arr
      );
      rework = await getReworkDateRange(
        project_start,
        project_end,
        machine_arr
      );
      var original_rework = {
        siapi: 0,
        and_or:
          rework["siapi"]["and_or_rework"] -
          rework["and_or"]["rework"] -
          rework["stack"]["Handle"],
        leaktester:
          rework["and_or"]["rework"] -
          rework["stack"]["Handle"] -
          rework["leak_tester"]["rework"],
        new_tech_labeller: rework["stack"]["Front_Label"],
        ave_glue: rework["stack"]["Front_Label"],
        indution:
          rework["rinse_fillcap"]["rinserfill_rework"] -
          rework["induction"]["rework"],
      };
      var original_reject = {
        new_tech_labeller: rework["stack"]["Front_Label"] || 0,
        ave_glue: rework["stack"]["Front_Label"] || 0,
        inkjet: rework["stack"]["Date"] || 0,
        siapi: rework["siapi"]["reject"] || 0,
        and_or: rework["and_or"]["reject"] || 0,
        tmgcp: rework["tmgcp"]["reject"] || 0,
        weigher_case_sealer: rework["weigher_case_sealer"]["reject"] || 0,
        outer_capper: rework["outer_capper"]["reject"] || 0,
        palletizer: rework["palletizer"]["reject"] || 0,
        pallet_id: rework["pallet_id"]["reject"] || 0,
        leak_tester: rework["leak_tester"]["reject"] || 0,
        induction: rework["induction"]["reject"] || 0,
        rinse_fillcap: rework["rinse_fillcap"]["reject"] || 0,
      };
      cal_arr.push({
        oee: 0,
        performance: 0,
        total_count: 0,
        quality: 0,
        manual_rejected_quantity:
          "Total_Reject:" +
          rework["stack"]["Total_Reject"] +
          "|Back_Label:" +
          rework["stack"]["Back_Label"] +
          "| Cap:" +
          rework["stack"]["Cap"] +
          "| Date:" +
          rework["stack"]["Date"] +
          "|Front_Label:" +
          rework["stack"]["Front_Label"] +
          "| Handle:" +
          rework["stack"]["Handle"],
        rejected_quantity:
          "Total_Reject:" +
          rework["stack"]["Total_Reject"] +
          "|Back_Label:" +
          rework["stack"]["Back_Label"] +
          "| Cap:" +
          rework["stack"]["Cap"] +
          "| Date:" +
          rework["stack"]["Date"] +
          "|Front_Label:" +
          rework["stack"]["Front_Label"] +
          "| Handle:" +
          rework["stack"]["Handle"],
        aviability: 0,
        good_count: "-",
        manual_rework: "-",
        bottle_loss: "-",
        machine: "vision",
        mttr: 0,
        mtbf: 0,
        no_of_stop: 0,
        filler_stop: 0,
        filler_min: 0,
      });
      data_arr.forEach((element, i) => {
        var fault = faultFilter(machine_wise, element._id, "fault");
        var waiting_data = faultFilter(machine_wise, element._id, "waiting");
        var blocked_data = faultFilter(machine_wise, element._id, "blocked");
        var stop,
          no_of_fault,
          stop_arr,
          waiting,
          waiting_arr,
          blocked,
          mtbf,
          mttr;
        if (!fault) {
          stop = 0;
          no_of_fault = 0;
          (stop_arr = []), (mtbf = "N/A"), (mttr = "N/A");
        } else {
          stop = fault.total;
          no_of_fault = fault.count;
          stop_arr = fault.stop_name;
          mtbf = (element.count * total_time) / fault.count;
          mttr = fault.total / fault.count;
        }
        if (!waiting_data) {
          waiting = 0;
          waiting_arr = [];
        } else {
          waiting = waiting_data.total;
          waiting_arr = waiting_data.stop_name;
        }
        if (!blocked_data) {
          blocked = 0;
        } else {
          blocked = blocked_data.total;
        }
        if (element._id == critical_machine) {
          send_obj["rated_speed"] = element.rated_speed;
          send_obj["critical_stop"] = send_obj["critical_stop"] || {};
          send_obj["critical_stop"]["machine_name"] = critical_machine;
          send_obj["critical_stop"]["stop"] = stop_arr;
          send_obj["critical_stop"]["waiting"] = waiting_arr;
          send_obj["critical_stop"]["blocked"] = blocked_data.stop_name;
        }
        cal_arr.push({
          machine: element._id,
          stop: stop,
          blocked: blocked,
          waiting: waiting,
          total_count: element.goodCount,
          waiting_arr: waiting_arr,
          no_of_stop: no_of_fault,
          stop_arr: stop_arr,
          oee: element.oee,
          aviability: element.aviability,
          performance: element.performance,
          quality: element.quality,
          mtbf: mtbf,
          mttr: mttr,
          bottle_loss: element.bottle_loss,
          manual_rejected_quantity: element.manual_rejected_quantity,
          rejected_quantity: original_reject[element._id] || 0,
          rework: original_rework[element._id] || 0,
          manual_rework: element.manual_rework,
          critical_machine_off: element.critical_machine_off,
          critical_machine_off_time: element.critical_machine_off_time,
          rated_speed: element.rated_speed,
        });
        if (data_arr.length == i + 1) {
          send_obj["parameter_wise"] = parameter_wise;
          send_obj["machine_wise "] = machine_wise;
          send_obj["project"] = cal_arr;
          send_obj["machine_obj"] = machine_obj;
          res.send(send_obj);
        }
      });
    }
  });
});

router.get("/reportshift", async (req, res) => {
  var date = req.query["date"] + "T00:00:00.000Z";
  var shift = req.query.shift;
  var start_timestamp, end_timestamp;
  var current_shift = await Shift.findOne({ shiftName: shift });
  var total_time = 480;
  start_timestamp =
    req.query["date"] +
    "T" +
    moment.utc(current_shift.shiftStartTime * 60000).format("HH:mm:ss");
  if (current_shift.shiftEndTime > current_shift.shiftStartTime) {
    end_timestamp =
      req.query["date"] +
      "T" +
      moment.utc(current_shift.shiftEndTime * 60000).format("HH:mm:ss");
  } else {
    end_timestamp =
      moment(req.query["date"]).add(1, "days").format("YYYY-MM-DD") +
      "T" +
      moment.utc(current_shift.shiftEndTime * 60000).format("HH:mm:ss");
  }
  var critical_machine = "siapi";
  var match = {
    $match: {
      $and: [
        {
          date: {
            $eq: new Date(date),
          },
        },
        {
          shiftName: {
            $eq: shift,
          },
        },
      ],
    },
  };
  var project = await Project.aggregate([
    match,
    {
      $lookup: {
        from: "skumasters",
        let: { sku: "$sku" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$sku"] } } },
          {
            $lookup: {
              from: "equipment",
              let: { equipments: "$equipments" },
              pipeline: [
                { $match: { $expr: { $in: ["$_id", "$$equipments"] } } },
                {
                  $project: {
                    _id: 0,
                    machine_name: "$equipment_name",
                  },
                },
              ],
              as: "equipments",
            },
          },
          {
            $project: {
              _id: 0,
              machine_name: "$equipments",
              rated_speed: 1,
              cpp: 1,
              sku_name: 1,
              bpc: 1,
            },
          },
          {
            $unwind: {
              path: "$machine_name",
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
        as: "sku",
      },
    },
    {
      $unwind: {
        path: "$sku",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        $expr: { $eq: ["$machine_name", "$sku.machine_name.machine_name"] },
      },
    },
    {
      $lookup: {
        from: "operators",
        localField: "operator_name",
        foreignField: "_id",
        as: "operator",
      },
    },
    {
      $unwind: {
        path: "$operator",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        rated_speed: {
          $switch: {
            branches: [
              {
                case: { $eq: ["$machine_name", "tmgcp"] },
                then: {
                  $divide: [
                    {
                      $divide: ["$sku.rated_speed", 60],
                    },
                    "$sku.bpc",
                  ],
                },
              },
              {
                case: { $eq: ["$machine_name", "weigher_case_sealer"] },
                then: {
                  $divide: [
                    {
                      $divide: ["$sku.rated_speed", 60],
                    },
                    "$sku.bpc",
                  ],
                },
              },
              {
                case: { $eq: ["$machine_name", "pallet_id"] },
                then: {
                  $divide: [
                    {
                      $divide: [
                        {
                          $divide: ["$sku.rated_speed", 60],
                        },
                        "$sku.bpc",
                      ],
                    },
                    "$sku.cpp",
                  ],
                },
              },
              {
                case: { $eq: ["$machine_name", "palletizer"] },
                then: {
                  $divide: [
                    {
                      $divide: [
                        {
                          $divide: ["$sku.rated_speed", 60],
                        },
                        "$sku.bpc",
                      ],
                    },
                    "$sku.cpp",
                  ],
                },
              },
            ],
            default: { $divide: ["$sku.rated_speed", 60] },
          },
        },
      },
    },
    {
      $project: {
        _id: "$machine_name",
        machine_name: "$machine_name",
        sku: "$sku.sku_name",
        date: "$date",
        shiftName: "$shiftName",
        goodCount: "$goodCount",
        rejected_quantity: "$rejected_quantity",
        no_of_stop: "$no_of_stop",
        critical_machine_off: "$critical_machine_off",
        critical_machine_off_time: {
          $round: ["$critical_machine_off_time", 2],
        },
        manual_rejected_quantity: {
          $cond: [
            { $lte: ["$manual_rejected_quantity", 0] },
            "$rejected_quantity",
            "$manual_rejected_quantity",
          ],
        },
        manual_rework: {
          $cond: [{ $lte: ["$manual_rework", 0] }, 0, "$manual_rework"],
        },
        operator_name: {
          $ifNull: ["$operator.operator_name", "Not Added for this date"],
        },
        rated_speed: "$rated_speed",
      },
    },
  ]);
  //calculatio
  var machine_arr = [];
  var data_arr = [];
  var cal_arr = [];
  var send_obj = {};
  var machine_obj = {};
  machine_obj["vision"] = "-";
  machine_arr.push("vision");
  var parameter_wise, machine_wise, rework;
  project.forEach(async (data, i) => {
    machine_obj[data.machine_name] = "-";
    machine_arr.push(data.machine_name);
    data_arr.push(data);
    if (project.length == i + 1) {
      parameter_wise = await aggregate(
        "parameter_wise",
        start_timestamp,
        end_timestamp,
        machine_arr
      );
      machine_wise = await aggregate(
        "machine_wise",
        start_timestamp,
        end_timestamp,
        machine_arr
      );
      rework = await getReworkShiftWise(date, shift);
      var original_rework = {
        siapi: 0,
        and_or:
          rework["siapi"]["and_or_rework"] -
          rework["and_or"]["rework"] -
          rework["stack"]["Handle"],
        leaktester:
          rework["and_or"]["rework"] -
          rework["stack"]["Handle"] -
          rework["leak_tester"]["rework"],
        new_tech_labeller: rework["stack"]["Front_Label"],
        ave_glue: rework["stack"]["Front_Label"],
        indution:
          rework["rinse_fillcap"]["rinserfill_rework"] -
          rework["induction"]["rework"],
      };
      var original_reject = {
        new_tech_labeller: rework["stack"]["Front_Label"] || 0,
        ave_glue: rework["stack"]["Front_Label"] || 0,
        inkjet: rework["stack"]["Date"] || 0,
        siapi: rework["siapi"]["reject"] || 0,
        and_or: rework["and_or"]["reject"] || 0,
        tmgcp: rework["tmgcp"]["reject"] || 0,
        weigher_case_sealer: rework["weigher_case_sealer"]["reject"] || 0,
        outer_capper: rework["outer_capper"]["reject"] || 0,
        palletizer: rework["palletizer"]["reject"] || 0,
        pallet_id: rework["pallet_id"]["reject"] || 0,
        leak_tester: rework["leak_tester"]["reject"] || 0,
        induction: rework["induction"]["reject"] || 0,
        rinse_fillcap: rework["rinse_fillcap"]["reject"] || 0,
      };
      cal_arr.push({
        oee: 0,
        performance: 0,
        total_count: 0,
        quality: 0,
        manual_rejected_quantity:
          "Total_Reject:" +
          rework["stack"]["Total_Reject"] +
          "|Back_Label:" +
          rework["stack"]["Back_Label"] +
          "| Cap:" +
          rework["stack"]["Cap"] +
          "| Date:" +
          rework["stack"]["Date"] +
          "|Front_Label:" +
          rework["stack"]["Front_Label"] +
          "| Handle:" +
          rework["stack"]["Handle"],
        rejected_quantity:
          "Total_Reject:" +
          rework["stack"]["Total_Reject"] +
          "|Back_Label:" +
          rework["stack"]["Back_Label"] +
          "| Cap:" +
          rework["stack"]["Cap"] +
          "| Date:" +
          rework["stack"]["Date"] +
          "|Front_Label:" +
          rework["stack"]["Front_Label"] +
          "| Handle:" +
          rework["stack"]["Handle"],
        aviability: 0,
        good_count: "-",
        manual_rework: "-",
        bottle_loss: "-",
        sku: "-",
        machine: "vision",
        mttr: 0,
        mtbf: 0,
        no_of_stop: 0,
        critical_machine_off: 0,
        critical_machine_off_time: 0,
      });
      data_arr.forEach((element, i) => {
        var fault = faultFilter(machine_wise, element._id, "fault");
        var waiting_data = faultFilter(machine_wise, element._id, "waiting");
        var blocked_data = faultFilter(machine_wise, element._id, "blocked");
        var stop,
          no_of_fault,
          stop_arr,
          waiting,
          waiting_arr,
          blocked,
          blocked_arr,
          mtbf,
          mttr;
        if (!fault) {
          stop = 0;
          no_of_fault = 0;
          (stop_arr = []), (mtbf = "N/A"), (mttr = "N/A");
        } else {
          stop = fault.total;
          no_of_fault = fault.count;
          stop_arr = fault.stop_name;
          mtbf = total_time / fault.count;
          mttr = fault.total / fault.count;
        }
        if (!waiting_data) {
          waiting = 0;
          waiting_arr = [];
        } else {
          waiting = waiting_data.total;
          waiting_arr = waiting_data.stop_name;
        }
        if (!blocked_data) {
          blocked = 0;
          blocked_arr = [];
        } else {
          blocked = blocked_data.total;
          blocked_arr = blocked_data.stop_name;
        }
        if (element._id == critical_machine) {
          send_obj["rated_speed"] = element.rated_speed;
          send_obj["critical_stop"] = send_obj["critical_stop"] || {};
          send_obj["critical_stop"]["machine_name"] = critical_machine;
          send_obj["critical_stop"]["stop"] = stop_arr;
          send_obj["critical_stop"]["waiting"] = waiting_arr;
          send_obj["critical_stop"]["blocked"] = blocked_arr;
          send_obj["start_timestamp"] = start_timestamp;
          send_obj["end_timestamp"] = end_timestamp;
          send_obj["date"] = moment(date).local().format("LL");
          send_obj["shift"] = shift;
          send_obj["operator_name"] = element.operator_name;
        }
        var cal_return = calculation(
          0,
          stop,
          element.goodCount,
          element.manual_rejected_quantity,
          shift,
          date,
          element.rated_speed
        );
        cal_arr.push({
          machine: element._id,
          stop: stop,
          blocked: blocked,
          waiting: waiting,
          sku: element.sku,
          total_count: element.goodCount,
          waiting_arr: waiting_arr,
          no_of_stop: no_of_fault,
          stop_arr: stop_arr,
          oee: cal_return.oee,
          aviability: cal_return.aviability,
          performance: cal_return.performance,
          quality: cal_return.quality,
          mtbf: mtbf,
          mttr: mttr,
          bottle_loss: element.bottle_loss,
          manual_rejected_quantity: element.manual_rejected_quantity,
          rejected_quantity: original_reject[element._id] || 0,
          rework: original_rework[element._id] || 0,
          manual_rework: element.manual_rework,
          critical_machine_off: element.critical_machine_off,
          critical_machine_off_time: element.critical_machine_off_time,
          rated_speed: element.rated_speed,
        });
        if (data_arr.length == i + 1) {
          send_obj["parameter_wise"] = parameter_wise;
          send_obj["machine_wise "] = machine_wise;
          send_obj["project"] = cal_arr;
          send_obj["machine_obj"] = machine_obj;
          res.send(send_obj);
        }
      });
    }
  });
});
var queryDate = function (query) {
  var year = Number(query.split("T")[0].split("-")[0]);
  var month = Number(query.split("T")[0].split("-")[1]) - 1;
  var date = Number(query.split("T")[0].split("-")[2]);
  var hour = Number(query.split("T")[1].split(":")[0]);
  var minute = Number(query.split("T")[1].split(":")[1]);
  var secound = Number(query.split("T")[1].split(":")[2]);

  return new Date(year, month, date, hour, minute, secound);
};

function getValue(machine_name, value) {
  console.log(machine_name, value);
  var data = faultDescritions[machine_name][value];
  return data;
}
function calculation(
  pdt_time,
  fault_time,
  total_good_count,
  total_reject_count,
  shift,
  date,
  rated_speed
) {
  //console.log(pdt_time, fault_time, total_good_count, total_reject_count, shift, date, rated_speed)
  var total_time = 480;
  var total_count = total_good_count + total_reject_count;
  var working_time = total_time - pdt_time;
  var aviability = checkValidation((working_time - fault_time) / working_time);
  var performance = checkValidation(
    total_good_count / (rated_speed * (working_time - fault_time))
  );
  var quality = checkValidation(total_good_count / total_count);
  var oee = aviability * performance * quality;
  return {
    oee: (oee * 100).toFixed(2),
    quality: (quality * 100).toFixed(2),
    performance: (performance * 100).toFixed(2),
    aviability: (aviability * 100).toFixed(2),
    total_good_count: total_good_count,
    shift: shift,
    date: date,
    total_reject_count: total_reject_count,
  };
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

function faultFilter(arr, machine_name, type) {
  var machine = arr.find((machine) => {
    return machine._id == machine_name;
  });
  if (machine) {
    var fault = machine.parent_stop.find((fault) => {
      return fault.parent_stop == type;
    });
    return fault;
  } else {
    return null;
  }
}


function nonNegativeFields(fieldNames,) {
  const fields = {};
  fieldNames.forEach(fieldName => {
    // Modify the field name based on the suffix
    let modifiedFieldName = fieldName;
    if (fieldName.endsWith('.count')) {
      modifiedFieldName = fieldName.replace('.count', '_count');
    } else if (fieldName.endsWith('.duration')) {
      modifiedFieldName = fieldName.replace('.duration', '');
    }

    // Apply the non-negative condition
    fields[modifiedFieldName] = {
      $cond: [
        { $lt: [`$critical_machine_data.${fieldName}`, 0] },
        0,
        `$critical_machine_data.${fieldName}`
      ]
    };

    fields["last_machine_" + modifiedFieldName] = {
      $cond: [
        { $lt: [`$last_machine_data.${fieldName}`, 0] },
        0,
        `$last_machine_data.${fieldName}`
      ]
    };
  });
  return fields;
}






module.exports = router;
