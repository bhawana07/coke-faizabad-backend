var express = require("express");
var moment = require("moment");
var router = express.Router();
var {
  changeOver,
  changesku,
  updateChangeOver,
} = require("../model/changeover.model");
var { Batchskutrigger, updateBatchEnd } = require("../model/batch.model");
const { EventEmitter } = require("events");
var { Type } = require("../model/type.model");
var { Sap } = require("../model/sap.model");
var { addToQue, Que, removeFromQue } = require("../model/que.model");
var { FGEX } = require("../model/fgex.model");
var mongoose = require("mongoose");
var { Roster } = require("../model/roster.model");
var { SkuMaster } = require("../model/product.model");
var { CurrentShift } = require("../model/shift.model");
var { changeOverMaster } = require("../model/changeovermaster.model");
var { Que } = require("../model/que.model");
var { addLine } = require("../model/addLine.model");
var { cipMaster, endCip } = require("../model/cipmaster.model");
var {
  Changeover_checklist,
  endChecklist,
  addChangeoverId,
} = require("../model/changeover_checklist.model");
var {
  checklistGroupmaster,
  checklist,
} = require("../model/schedule_mantaiance.model");

var {
  updateChangeoverMode,
  updateVendor,
  updateMode,
  TempGood,
} = require("../model/goodTemp.model");
var { Condition, getCondition } = require("../model/status.model");
var { Line } = require("../model/manualEntry.model");
//var { maintananaceMailer,ChangeovermailFormatter } = require('./email.controller');
var { add15minCache } = require("./multiline.controller");
const { getApi } = require("./apiHit.controller");
const { vendortrigger } = require("../model/vendertrigger.model");
var { vendor } = require("../model/vender.model");

const e = new EventEmitter();
//var critical_machine = "cam_blister";

router.get("/current", async (req, res) => {
  var line_id = req.query.line_id;
  if (!line_id) {
    res.status(404).send("Please Send Line_id");
    return;
  }
  var data = await changeOver
    .find({ changeover_end_date: null, line_id: line_id })
    .populate("changeover_type_id")
    .populate("product_id");
  var send_arr = [];
  if (data.length > 0) {
    data.forEach((element) => {
      var data_arr = { ...element._doc };
      data_arr.changeover_start_date = moment(data_arr.changeover_start_date)
        .local()
        .format("YYYY-MM-DDTHH:mm:ss");
      data_arr.current_timeStamp = moment()
        .local()
        .format("YYYY-MM-DDTHH:mm:ss");
      send_arr.push(data_arr);
      if (send_arr.length == data.length) {
        res.send(send_arr);
      }
    });
  } else {
    res.send(data);
  }
});

router.get("/roo", async (req, res) => {
  var curretshitordate = await CurrentShift();
  var shift = curretshitordate.shift;
  var d = curretshitordate.date;
  ////console.log(shift, d);
  //var get_opretor = await Roster.findOne({date:d})
  ////console.log(get_opretor.shift_wise);
  var data = await Roster.find(
    { date: d },
    { shift_wise: { $elemMatch: { shift_name: shift } } }
  );
  ////console.log(data[0].shift_wise[0].operator_name);
  res.send(data);
});

router.get("/changeoverreport", async (req, res) => {
  var line_id = req.query.line_id;
  var startDate = moment(req.query.startDate).format("YYYY-MM-DDTHH:mm:ss");
  var endDate = moment(req.query.endDate).format("YYYY-MM-DDTHH:mm:ss");
  var data = await changeOver.aggregate([
    {
      $match: {
        $and: [
          {
            changeover_start_date: {
              $lte: new Date(endDate),
            },
          },
          {
            changeover_start_date: {
              $gte: new Date(startDate),
            },
          },
        ],
        changeover_end_date: { $ne: null },
      },
    },
    {
      $lookup: {
        from: "changeovermasters",
        localField: "changeover_type_id",
        foreignField: "_id",
        as: "type",
      },
    },
    {
      $lookup: {
        from: "addlines",
        localField: "line_id",
        foreignField: "_id",
        as: "line_data",
      },
    },
    {
      $unwind: {
        path: "$line_wise",
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
      $lookup: {
        from: "fgexes",
        localField: "product_id",
        foreignField: "_id",
        as: "product",
      },
    },
    {
      $lookup: {
        from: "fgexes",
        localField: "pre_product_id",
        foreignField: "_id",
        as: "pre_product",
      },
    },
    {
      $lookup: {
        from: "equipment",
        let: {
          line_id: "$line_id",
          equipment_name: "$line_data.critical_machine",
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
                    $eq: ["$equipment_name", "$$equipment_name"],
                  },
                ],
              },
            },
          },
        ],
        as: "machine",
      },
    },
    {
      $unwind: {
        path: "$shift_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$pre_product",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$type",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$product",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$line",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$machine",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "rosters",
        let: {
          date: "$shift_wise.date",
          shift: "$shift_wise.shift",
          line_id: "$line_id",
        },
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
      $lookup: {
        from: "projects",
        let: {
          date: "$shift_wise.date",
          shift: "$shift_wise.shift",
          batch: "$batch_name",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$date", "$$date"] },
                  { $eq: ["$line_id", line_id] },
                ],
              },
            },
          },
          {
            $project: {
              shift_wise: {
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
              path: "$shift_wise",
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
              let: { batch_name: "$shift_wise.batch_wise.batch" },
              pipeline: [
                { $match: { $expr: { $eq: ["$_id", "$$batch_name"] } } },
              ],
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
            $match: {
              $expr: {
                $eq: ["$batch.batch", "$$batch"],
              },
            },
          },
          {
            $project: {
              machine_wise: {
                $filter: {
                  input: "$shift_wise.batch_wise.machine_wise",
                  as: "machine_wise",
                  cond: {
                    $eq: [
                      "$$machine_wise.machine_name",
                      "$line_data.critical_machine",
                    ],
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
              changeover_wastage: "$machine_wise.startup_reject",
            },
          },
        ],
        as: "project",
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
        path: "$project",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        changeover_wastage: {
          $ifNull: ["$project.changeover_wastage", 0],
        },
        operator_name: {
          $ifNull: ["$roster.operator.display_name", "Operator Not Defined"],
        },
        date: { $ifNull: ["$shift_wise.date", "$date"] },
        shift_quality_power_off: {
          $ifNull: ["$shift_wise.quality_power_off", 0],
        },
        shift_mechanical_power_off: {
          $ifNull: ["$shift_wise.mechanical_power_off", 0],
        },
        mechanical_power_off: { $ifNull: ["$mechanical_power_off", 0] },
        quality_power_off: { $ifNull: ["$quality_power_off", 0] },
        shift: { $ifNull: ["$shift_wise.shift", "$shift"] },
        line: "$line.line_name",
        changeover_finish_type: { $ifNull: ["$finished_type", "manual"] },
        batch_name: "$batch_name",
        batch_size: "$batch_size",
        changeover_start_date: "$changeover_start_date",
        changeover_end_date: { $ifNull: ["$changeover_end_date", new Date()] },
        changeover_finish: {
          $ifNull: ["$changeover_finished", "$changeover_end_date"],
        },
        type: "$type.changeover_name",
        standard_duration: "$type.standard_duration",
        shift_changeover_start_time: {
          $ifNull: [
            "$shift_wise.changeover_start_time",
            "$changeover_start_date",
          ],
        },
        shift_changeover_end_time: {
          $ifNull: ["$shift_wise.changeover_end_time", "$changeover_end_date"],
        },
        machine_name: "$machine.display_name",
        product_name: "$product.product_name",
        from_fgex: "$product.fgex",
        layout: "$product.layout_no",
        pre_layout: "$pre_product.layout_no",
        to_fgex: "$pre_product.fgex",
      },
    },
    {
      $project: {
        changeover_wastage: 1,
        operator_name: 1,
        date: 1,
        shift: 1,
        line: 1,
        changeover_finish_type: 1,
        batch_name: 1,
        batch_size: 1,
        changeover_finish_time: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S.%L",
            date: "$changeover_finish",
            timezone: "+05:30",
          },
        },
        type: 1,
        standard_duration: {
          $multiply: ["$standard_duration", 60],
        },
        machine_name: 1,
        product_name: 1,
        from_fgex: 1,
        mechanical_power_off: 1,
        quality_power_off: 1,
        shift_mechanical_power_off: 1,
        shift_quality_power_off: 1,
        to_fgex: 1,
        layout: 1,
        pre_layout: 1,
        shift_changeover_start_time: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S.%L",
            date: "$shift_changeover_start_time",
            timezone: "+05:30",
          },
        },
        shift_changeover_end_time: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S.%L",
            date: "$shift_changeover_end_time",
            timezone: "+05:30",
          },
        },
        changeover_start_time: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S.%L",
            date: "$changeover_start_date",
            timezone: "+05:30",
          },
        },
        production_start: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S.%L",
            date: "$changeover_end_date",
            timezone: "+05:30",
          },
        },
        actual_total_time: {
          $round: [
            {
              $subtract: [
                {
                  $divide: [
                    {
                      $subtract: [
                        "$changeover_end_date",
                        "$changeover_start_date",
                      ],
                    },
                    1000,
                  ],
                },
                {
                  $sum: ["$mechanical_power_off", "$quality_power_off"],
                },
              ],
            },
            0,
          ],
        },
        shift_actual_time: {
          $round: [
            {
              $subtract: [
                {
                  $divide: [
                    {
                      $subtract: [
                        "$shift_changeover_end_time",
                        "$shift_changeover_start_time",
                      ],
                    },
                    1000,
                  ],
                },
                {
                  $sum: [
                    "$shift_mechanical_power_off",
                    "$shift_quality_power_off",
                  ],
                },
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $project: {
        changeover_wastage: 1,
        operator_name: 1,
        date: 1,
        shift: 1,
        line: 1,
        changeover_finish_type: 1,
        batch_name: 1,
        batch_size: 1,
        changeover_finish_time: 1,
        type: 1,
        standard_duration: 1,
        machine_name: 1,
        product_name: 1,
        from_fgex: 1,
        mechanical_power_off: 1,
        quality_power_off: 1,
        shift_mechanical_power_off: 1,
        shift_quality_power_off: 1,
        to_fgex: 1,
        layout: 1,
        pre_layout: 1,
        shift_changeover_start_time: 1,
        shift_changeover_end_time: 1,
        changeover_start_time: 1,
        production_start: 1,
        actual_total_time: 1,
        shift_actual_time: 1,
        changeover_split: {
          $cond: [
            {
              $lte: ["$actual_total_time", 0],
            },
            "$standard_duration",
            {
              $divide: ["$standard_duration", "$actual_total_time"],
            },
          ],
        },
      },
    },
    {
      $project: {
        changeover_wastage: 1,
        operator_name: 1,
        date: 1,
        shift: 1,
        line: 1,
        changeover_finish_type: 1,
        batch_name: 1,
        batch_size: 1,
        changeover_finish_time: 1,
        type: 1,
        standard_duration: 1,
        machine_name: 1,
        product_name: 1,
        from_fgex: 1,
        mechanical_power_off: 1,
        quality_power_off: 1,
        shift_mechanical_power_off: 1,
        shift_quality_power_off: 1,
        to_fgex: 1,
        layout: 1,
        pre_layout: 1,
        shift_changeover_start_time: 1,
        shift_changeover_end_time: 1,
        changeover_start_time: 1,
        production_start: 1,
        actual_total_time: 1,
        standard_duration_split: {
          $multiply: ["$changeover_split", "$shift_actual_time"],
        },
        shift_actual_time: 1,
        changeover_split: 1,
      },
    },
  ]);
  res.send(data);
});

var lineBatchend = {};
router.post("/batchEnd", async (req, res) => {
  var { line_id, type, remark, end_cause, user_name, lotNumber } = req.body;
  if (!line_id) {
    res.status(404).send("Please send line id");
    return;
  } else {
    if (!lineBatchend[line_id]) {
      lineBatchend[line_id] = true;
      if (!lotNumber) {
        res.status(409).send("Please send batch");
        lineBatchend[line_id] = false;
        return;
      }
      var current_batch = await Batchskutrigger.findOne({
        batch: lotNumber,
      }).populate("product_name");
      if (!current_batch) {
        res.status(409).send(`Batch Not Found`);
        lineBatchend[line_id] = false;
        return;
      }
      if (current_batch.end_time) {
        res
          .status(409)
          .send(
            `This Batch already end at ${moment(current_batch.end_time)
              .local()
              .format()}`
          );
        lineBatchend[line_id] = false;
        return;
      }
      //if end cause is null
      if (!end_cause && type == "early_batch_end") {
        res.status(409).send("Please send casue");
        lineBatchend[line_id] = false;
        return;
      }
      //atleast 1 min for batch start
      if (new Date() - new Date(current_batch.start_time) < 60000) {
        res.status(409).send("Please wait atleast 1 min to finish the batch");
        lineBatchend[line_id] = false;
        return;
      }

      //if 2 time same batch
      if (current_batch.batch_end_type) {
        res
          .status(409)
          .send(`This Batch already end by ${current_batch.batch_end_by}`);
        lineBatchend[line_id] = false;
        return;
      }
      var timestamp = moment().format("YYYY-MM-DDTHH:mm:ss");
      var line_data = await addLine.findOne({ line_id: line_id }).populate({
        path: "line_id",
        populate: { path: "plant_id", populate: { path: "location_id" } },
      });
      var sap = await Sap.findOne({ PONumber: current_batch.po_number });
      var temp = await TempGood.findOne({
        line_id: line_id,
        machine: line_data.critical_machine,
      });
      if (type == "early_batch_end") {
        sap.current_status = type;
        var spt = sap.LOTNumber.split("_");
        var cause = await Type.findOne({ _id: end_cause });
        var good_count = !current_batch.t200CountUse
          ? temp.current_good_value - temp.batch_start_good_count
          : (temp.current_no_of_case - temp.batch_start_no_of_case) *
            current_batch.product_name.No_of_blisters;
        //lot size deduction
        if (sap.LOTSize - good_count < 0) {
          sap.LOTSize = 0;
        } else {
          sap.LOTSize -= good_count;
        }
        //update sap data
        if (!spt[1]) {
          sap.LOTNumber = sap.LOTNumber + "_A";
        } else {
          var suffix = nextChar(spt[1]);
          sap.LOTNumber = spt[0] + "_" + suffix;
        }
        getApi(
          `${process.env.early_batch_end_email_link}?osd=${
            line_data.line_id.plant_id.location_id.location_name
          }&hl=${line_data.line_id.plant_id.plant_name}&ln=${
            line_data.line_id.line_name
          }&bst=${moment(current_batch.start_time)
            .local()
            .format("DD-MM-YYYY - hh:mm:ss A")}&bet=${moment()
            .local()
            .format("DD-MM-YYYY - hh:mm:ss A")}&bn=${current_batch.batch}&m=${
            temp.machine_mode
          }&r=${cause.display_name}&o=${temp.current_operator}`,
          {
            "content-type": "application/json",
            authorization: `Bearer ${process.env.dashboardAuthToken}`,
            Accept: "application/json",
          },
          (api_res) => {
            //console.log(api_res)
          }
        );
        global.writeTagInPlc(
          line_data.super_end_plc_tag_write,
          1,
          line_data.mqtt_topic_name
        );
        current_batch.batch_end_time = timestamp;
        current_batch.batch_end_type = type;
        current_batch.batch_end_from = "supervisor_screen";
        current_batch.batch_end_by = user_name;
        current_batch.remark = remark;
        current_batch.end_case = end_cause;
        current_batch.save(async (err, data) => {
          if (err) {
            res.status(400).send(err.message);
            lineBatchend[line_id] = false;
          } else {
            if (temp.machine_mode == "changeover") {
              line_data.global_changeover = false;
              line_data.save(async (err, data) => {
                if (err) {
                  res.status(400).send(err.message);
                  lineBatchend[line_id] = false;
                } else {
                  var sap_save = await sap.save();
                  var temp_save = await temp.save();
                  res.send({
                    update: "ok",
                    addline: data,
                    sap: sap_save,
                    temp: temp_save,
                  });
                  lineBatchend[line_id] = false;
                }
              });
            } else {
              temp.machine_mode = type;
              var sap_save = await sap.save();
              var temp_save = await temp.save();
              res.send({
                update: "ok",
                sap: sap_save,
                batch: data,
                temp: temp_save,
              });
              lineBatchend[line_id] = false;
            }
          }
        });

        //early batch end edds here
      } else {
        sap.current_status = type;
        getApi(
          `${process.env.batch_end_email_link}?osd=${
            line_data.line_id.plant_id.location_id.location_name
          }&hl=${line_data.line_id.plant_id.plant_name}&ln=${
            line_data.line_id.line_name
          }&bn=${current_batch.batch}&bet=${moment()
            .local()
            .format("DD-MM-YYYY - hh:mm:ss A")}`,
          {
            "content-type": "application/json",
            authorization: `Bearer ${process.env.dashboardAuthToken}`,
            Accept: "application/json",
          },
          (api_res) => {
            //console.log(api_res)
          }
        );
        global.writeTagInPlc(
          line_data.super_end_plc_tag_write,
          1,
          line_data.mqtt_topic_name
        );
        current_batch.batch_end_time = timestamp;
        current_batch.batch_end_type = type;
        current_batch.batch_end_from = "supervisor_screen";
        current_batch.batch_end_by = user_name;
        current_batch.save(async (err, data) => {
          if (err) {
            res.status(400).send(err.message);
            lineBatchend[line_id] = false;
          } else {
            temp.machine_mode = type;
            var sap_save = await sap.save();
            var temp_save = await temp.save();
            res.send({
              update: "ok",
              sap: sap_save,
              batch: data,
              temp: temp_save,
            });
            lineBatchend[line_id] = false;
          }
        });
      }
    } else {
      res.status(409).send("Please wait first request to execute");
    }
  }
});
var lineque = {};
//add to que
router.post("/queue", async (req, res) => {
  var { line_id, po_id, fgex, user_name } = req.body;
  if (!line_id) {
    res.status(404).send("Please send line id");
    return;
  } else {
    if (!lineque[line_id]) {
      lineque[line_id] = true;
      if (!po_id) {
        addToQue(
          { line_id: line_id, po_id: po_id, fgex: null, user_name: user_name },
          (data) => {
            res.send(data);
            lineque[line_id] = false;
          }
        );
      } else {
        var checksap = await Sap.findOne({ _id: po_id });
        if (!checksap) {
          res.status(404).send("PO Not Found");
          lineque[line_id] = false;
          return;
        }
        var checkFgex = await FGEX.findOne({
          _id: fgex,
        });
        if (!checkFgex) {
          res.status(404).send("Fgex not found in master,Please add on Master");
          lineque[line_id] = false;
          return;
        }

        // var checkbatchtrigger = await Batchskutrigger.findOne({
        //   batch: checksap.LOTNumber,
        // }).populate("line_id");
        // if (checkbatchtrigger) {
        //   res
        //     .status(404)
        //     .send(
        //       `This PO already assigned in ${checkbatchtrigger.line_id.line_name} on ${checkbatchtrigger.start_time}`
        //     );
        //   lineque[line_id] = false;
        //   return;
        // }

        // var checkqueue = await Que.findOne({
        //   po_id: po_id,
        //   line_id: { $ne: line_id },
        // }).populate("line_id");
        // if (checkqueue) {
        //   res.status(401).send(`Po already queue in ${line_id.line_name}`);
        //   lineque[line_id] = false;
        //   return;
        // }
        addToQue(
          {
            line_id: line_id,
            po_id: po_id,
            fgex: checkFgex._id,
            user_name: user_name,
          },
          (data) => {
            res.send(data);
            lineque[line_id] = false;
          }
        );
      }
    } else {
      res.status(409).send("Please wait first request to execute");
    }
  }
});
//get Api
router.get("/dashboard", async (req, res) => {
  if (!req.query.line_id) {
    res.send("Please send valid line id");
    return;
  }
  var line_plant_id = await Line.findOne({ _id: req.query.line_id });
  try {
    if (!line_plant_id) {
      res.status(404).send("Please send valid line id");
      return;
    }
    var plant_id = line_plant_id.plant_id;
    var data = await Batchskutrigger.aggregate([
      {
        $match: {
          end_time: null,
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
        $match: {
          $expr: {
            $eq: ["$line.plant_id", plant_id],
          },
        },
      },
      {
        $lookup: {
          from: "fgexes",
          localField: "product_name",
          foreignField: "_id",
          as: "fgex",
        },
      },
      {
        $lookup: {
          from: "ques",
          localField: "line_id",
          foreignField: "line_id",
          as: "que",
        },
      },
      {
        $lookup: {
          from: "tempgoods",
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
                      $eq: ["$machine", "$$machine"],
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
          path: "$fgex",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$temp",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$que",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "rosters",
          let: {
            line_id: "$line_id",
            date: "$temp.date",
            shift: "$temp.current_shift",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$date", "$$date"],
                    },
                    {
                      $eq: ["$line_id", "$$line_id"],
                    },
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
        $lookup: {
          from: "fgexes",
          localField: "que.fgex",
          foreignField: "_id",
          as: "que_fgex",
        },
      },
      {
        $lookup: {
          from: "saps",
          localField: "que.po_id",
          foreignField: "_id",
          as: "que_po",
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
          path: "$que_po",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$que_fgex",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          PONumber: "$po_number",
          lotNumber: "$batch",
          lotSize: "$batch_size",
          plant: "Mayo",
          fgex: "$fgex.sku_number",
          product: "$fgex.sku_description",
          recipe_code: "$fgex.recipe_code",
          recipe_description: "$fgex.recipe_description",
          preform_code: "$fgex.preform_code",
          ratedSpeed: "$fgex.rated_speed",
          lineNumber: "$line.line_name",
          lineId: "$line._id",
          currentMode: "$temp.machine_mode",
          po_id: null,
          goodCount: {
            $cond: [
              {
                $eq: ["$t200CountUse", true],
              },
              {
                $multiply: [
                  {
                    $subtract: [
                      "$temp.current_no_of_case",
                      "$temp.batch_start_no_of_case",
                    ],
                  },
                  "$fgex.No_of_blisters",
                ],
              },
              {
                $subtract: [
                  "$temp.current_good_value",
                  "$temp.batch_start_good_count",
                ],
              },
            ],
          },
          poStatus: "assigned",
          startDate: "$fgex.start_time",
          currentOperator: {
            $ifNull: ["$roster.operator.display_name", "Not Defined"],
          },
          totalProdHrsNeeded: "0",
          likelydateTime: "0",
          queue: {
            fgex: "$que_fgex.sku_number",
            product: "$que_fgex.sku_description",
            recipe_code: "$que_fgex.recipe_code",
            recipe_description: "$que_fgex.recipe_description",
            preform_code: "$que_fgex.preform_code",
            ratedSpeed: "$que_fgex.rated_speed",
            poStatus: "queue",
            PONumber: "$que_po.PONumber",
            lotNumber: "$que_po.LOTNumber",
            po_id: "$que_po._id",
            lotSize: "$que_po.LOTSize",
            totalProdHrsNeeded: null,
            likelydateTime: null,
            startDate: null,
            goodCount: null,
            currentMode: "$temp.machine_mode",
            lineNumber: "$line.line_name",
            lineId: "$line._id",
            plant: "Matoda",
          },
        },
      },
    ]);
    //res.send(data)
    var send_arr = [];
    add15minCache(null, (batch_data, array) => {
      data.forEach((element, i) => {
        var queue = element.queue;
        var batch_res = array.find(
          (line) => line.line_id == String(element.lineId)
        );
        if (!batch_res) {
          //console.log("no batch found")
          ////console.log(batch_data, array, element.lineId)
        }
        //element.batch_res = batch_res;
        element.startDate = moment(batch_res.batch_start_utc)
          .local()
          .format("DD-MM-YYYY - hh:mm:ss A");
        element.hallName = batch_res.hallName;
        if (Number(batch_res.batch_oee) <= 10) {
          element.totalProdHrsNeeded = Math.round(
            batch_res.changover_standard_duration +
              element.lotSize / (element.ratedSpeed / 60) +
              batch_res.updt_time
          );
        } else {
          element.totalProdHrsNeeded = Math.round(
            ((batch_res.ppt_time_sec - batch_res.changeover_time_sec) *
              element.lotSize) /
              batch_res.case_count +
              batch_res.changeover_time_sec +
              batch_res.pdt_time +
              batch_res.updt_time
          );
        }
        element.likelydateTime = moment(batch_res.batch_start_utc)
          .add(element.totalProdHrsNeeded, "seconds")
          .local()
          .format("DD-MM-YYYY - hh:mm:ss A");
        queue.fgex ? send_arr.push(element, queue) : send_arr.push(element);
        if (data.length == i + 1) {
          res.send(send_arr);
        }
      });
    });
  } catch (error) {
    res.send("Please send valid line id");
  }
});
var lineChangeOver = {};

router.get("/currentcip", async (req, res) => {
  var line_id = req.query.line_id;
  var data = await cipMaster.findOne({
    line_id: line_id,
    cip_end_timestamp: null,
  });
  if (data) {
    res.send(data);
  } else {
    res.send({});
  }
});

router.post("/cip", async (req, res) => {
  var cip_state = req.body.cip_state;
  var timestamp = moment().format("YYYY-MM-DDTHH:mm:ss");
  var que = await Que.findOne({ line_id: req.body.line_id }).populate("fgex");
  if (!que || !que.fgex) {
    res.status(409).send("Please Que PO First");
    return;
  }
  var current_product = await Batchskutrigger.findOne({
    end_time: null,
  }).populate("product_name");
  if (current_product.product_name.recipe_code != que.fgex.recipe_code) {
    res
      .status(409)
      .send("Recipe Code doesn't match with Que PO SKU Recipe Code");
    return;
  }
  var checknullcip = await cipMaster.findOne({
    line_id: req.body.line_id,
    cip_end_timestamp: null,
  });
  if (cip_state == "pause" || (cip_state == "resume" && checknullcip)) {
    checknullcip.cip_state = req.body.cip_state;
    checknullcip.updated_by = req.body.updated_by;
    checknullcip.water_use = req.body.water_use;
    checknullcip.history_array.push({
      state: cip_state,
      updated_by: req.body.updated_by,
      water_use: req.body.water_use,
    });
    try {
      var save = await checknullcip.save();
      res.status(200).send(save);
    } catch (error) {
      res.status(400).send(err.message);
    }
  } else if (cip_state == "end" && checknullcip) {
    var line_data = await addLine.findOne({ line_id: req.body.line_id });
    checknullcip.cip_state = req.body.cip_state;
    checknullcip.cip_end_timestamp = timestamp;
    checknullcip.water_use = req.body.water_use;
    checknullcip.updated_by = req.body.updated_by;
    checknullcip.history_array.push({
      state: cip_state,
      updated_by: req.body.updated_by,
      water_use: req.body.water_use,
    });
    try {
      line_data.cip_mode = false;
      line_data.cip_type = 0;
      await line_data.save();
      var save = await checknullcip.save();
      res.status(200).send(save);
    } catch (error) {
      res.status(400).send(err.message);
    }
  } else {
    if (cip_state == "start" && !checknullcip) {
      var line_data = await addLine.findOne({ line_id: req.body.line_id });
      var data = new cipMaster({
        line_id: req.body.line_id,
        cip_type_string: "manual",
        cip_type: req.body.cip_type,
        cip_start_timestamp: new Date(),
        created_by: req.body.updated_by,
        updated_by: req.body.updated_by,
        water_use: req.body.water_use,
        history_array: [
          {
            date: new Date(),
            state: cip_state,
            updated_by: req.body.updated_by,
            water_use: req.body.water_use,
          },
        ],
        cip_state: "start",
      });
      try {
        data.save(async (err, data) => {
          var send_arr = [];
          if (!err) {
            line_data.machine_wise.forEach(async (element, i) => {
              var temp = await TempGood.findOne({
                line_id: req.body.line_id,
                machine: element.machine_name,
              });
              temp.machine_mode = "cip";
              var temp_save = await temp.save();
              send_arr.push(temp_save);
              if (line_data.machine_wise.length == send_arr.length) {
                line_data.cip_mode = true;
                line_data.cip_type = 2;
                await line_data.save();
                res.status(200).send(send_arr);
              }
            });
          }
        });
      } catch (error) {
        res.status(400).send(error.message);
      }
    } else {
      res.status(404).send("Please end CIP first or start a new cip");
    }
  }
});
//checklist changeover
router.post("/checklist", async (req, res) => {
  var { line_id } = req.body;
  var checkchangeover = await changeOver.findOne({
    line_id: line_id,
    changeover_end_date: null,
  });
  var checkgroupcheklist = await checklistGroupmaster.findOne({
    line_id: line_id,
    checklist_group_name: "changeover",
  });
  var check_changover_checklist = await Changeover_checklist.findOne({
    line_id: line_id,
    end_time: null,
  });
  if (!check_changover_checklist) {
    var raw_data = new Changeover_checklist({
      line_id: line_id,
      changeover_id: checkchangeover ? checkchangeover._id : null,
      changeover_group_checklist_id: checkgroupcheklist
        ? checkgroupcheklist._id
        : null,
      checklist_items: checkgroupcheklist.checklist_in_checklist_group
        ? checkgroupcheklist.checklist_in_checklist_group
        : [],
    });
    var result = await raw_data.save();
    res.send(result);
  } else {
    check_changover_checklist.checklist_items = req.body.checklist_items;
    var save = check_changover_checklist.save();
    res.send(save);
  }
});

router.get("/checklist", async (req, res) => {
  var line_id = req.query.line_id;
  var send_data = await Changeover_checklist.findOne({
    line_id: line_id,
    end_time: null,
  })
    .populate("line_id")
    .populate("checklist_items.checklist_id");
  if (send_data) {
    res.send(send_data);
  } else {
    res.send({});
  }
});

//////////////////////////////////////////////////////////////////////////
router.post("/", async (req, res) => {
  let { fgex, sku_number, po_id, line_id, user_name, changeover_reason } =
    req.body;
  ChangeoverFromFunction(
    line_id,
    sku_number,
    user_name,
    changeover_reason,
    (err, data) => {
      if (err) {
        res.status(409).send(err);
      } else {
        res.status(200).send(data);
      }
    }
  );
});

//vendor changeover
router.post("/vendor", async (req, res) => {
  let { line_id, user_name } = req.body;
  postVendor(line_id, user_name, true, (data) => {
    res.status(data.status).send(data.msg);
  });
});

router.get("/currentvender", async (req, res) => {
  var line_id = req.query.line_id;
  var find_vendor = await vendortrigger
    .findOne({ line_id: line_id, end_date: null })
    .populate({ path: "line_id" })
    .populate({ path: "vendor" });
  res.send(find_vendor);
});

//type of changeover
const getTypeOfChangeover = async (obj, user_name, cb) => {
  var type = "Product to Product";
  let { pre_fgex, fgex, pre_halb_code, halb_code, pre_layout, layout } = obj;
  ////console.log(pre_fgex, fgex, pre_halb_code, halb_code, pre_layout, layout);
  if (pre_fgex == fgex && pre_halb_code == halb_code && pre_layout == layout) {
    type = "Batch to Batch";
  }
  if (pre_fgex != fgex && pre_halb_code == halb_code && pre_layout == layout) {
    type = "FGex Changeover";
  }
  var changeover_type_id = await changeOverMaster.findOne({
    changeover_name: type,
  });
  return new Promise((resolve, reject) => {
    resolve(changeover_type_id);
  });
};

const ChangeoverFromFunction = async (
  line_id,
  sku_number,
  user_name,
  changeover_reason,
  cb
) => {
  try {
    var line_data = await addLine
      .findOne({ line_id: line_id })
      .populate("line_id");
    let timestamp = moment().format("YYYY-MM-DDTHH:mm:ss");
    var changeover_obj = {};
    var changeover_type = await changeOverMaster.findOne();
    var pre_changeover = await changeOver.findOne({
      line_id: line_id,
      changeover_to_date: null,
    });
    var currentShift = await CurrentShift();
    var shift = currentShift.shift;
    var d = currentShift.date;

    let checkFgex = await FGEX.findOne({
      _id:sku_number
    });
    if (!checkFgex) {
      cb("Fgex not found in master, Please add on Master", null);
      return;
    }
    var pre_batch = await Batchskutrigger.findOne({
      line_id: line_id,
      end_time: null,
    }).populate("product_name");
    var liveConditionofLine = await Condition.findOne({
      line_id: line_id,
      machine: line_data.critical_machine,
    });
    if (
      liveConditionofLine.condition == "changeover" ||
      liveConditionofLine.condition == "cip"
    ) {
      if (liveConditionofLine.condition == "cip") {
        changeover_obj.line_id = line_id;
        changeover_obj.changeover_start_date = timestamp;
        changeover_obj.batch_name = pre_batch.batch;
        changeover_obj.batch_size = 500000;
        changeover_obj.changeover_type_id = changeover_type._id;
        changeover_obj.standard_duration = changeover_type.standard_duration;
        changeover_obj.product_id = checkFgex._id;
        changeover_obj.fgex = checkFgex.fgex;
        changeover_obj.pre_batch = pre_batch.batch;
        changeover_obj.pre_product_id = pre_batch.product_name._id;
        changeover_obj.shift = shift;
        changeover_obj.date = d;
        changeover_obj.changeover_from_date = d;
        changeover_obj.operator = "6140f6d853fb6b0692d68476";
        changeover_obj.shift_wise = [
          {
            date: d,
            shift: shift,
            changeover_start_time: timestamp,
            opertor: "6140f6d853fb6b0692d68476",
          },
        ];
        var raw = new changeOver(changeover_obj);
        await raw.save();
        pre_changeover.changeover_to_date = d;
        await pre_changeover.save();

        const updateResult = await TempGood.updateMany(
          { line_id },
          { $set: { changeover_mode: true } }
        );

        if (updateResult.acknowledged) {
          pre_batch.product_name = checkFgex._id;
          line_data.global_changeover = true;
          await pre_batch.save();
          await line_data.save();
          cb(
            "Line is Already in CIP or Changeover. Only Product changed",
            null
          );
        } else {
          cb("Error updating changeover mode", null);
        }
      } else {
        pre_batch.product_name = checkFgex._id;
        await pre_batch.save();
        cb("Line is Already in CIP or Changeover Only Product changed", null);
      }
    } else {
      var current_cip = await cipMaster.findOne({
        line_id: line_id,
        end_date: null,
      });

      var batch_obj = {};
      let batch_timestamp = moment().format("HHmm");

      var auto_batch = `${line_data.line_id.line_batch}${moment().format(
        "YY"
      )}${checkFgex.sku_number}${moment().dayOfYear()}_${batch_timestamp}`;
      batch_obj.start_time = timestamp;
      batch_obj.start_date = d;
      batch_obj.product_name = checkFgex._id;
      batch_obj.line_id = line_id;
      batch_obj.batch = auto_batch;
      batch_obj.batch_set_by = user_name;
      batch_obj.batch_size = 500000;
      var new_batch = new Batchskutrigger(batch_obj);
      var result = await new_batch.save();

      // changeover data
      changeover_obj.line_id = line_id;
      changeover_obj.changeover_start_date = timestamp;
      changeover_obj.batch_name = auto_batch;
      changeover_obj.batch_size = 500000;
      changeover_obj.changeover_type_id = changeover_type._id;
      changeover_obj.standard_duration = changeover_type.standard_duration;
      changeover_obj.product_id = checkFgex._id;
      changeover_obj.fgex = checkFgex.fgex;
      changeover_obj.pre_batch = pre_batch.batch;
      changeover_obj.pre_product_id = pre_batch.product_name._id;
      changeover_obj.shift = shift;
      changeover_obj.date = d;
      changeover_obj.changeover_from_date = d;
      changeover_obj.operator = "6140f6d853fb6b0692d68476";
      changeover_obj.changeover_reason = changeover_reason;
      changeover_obj.shift_wise = [
        {
          date: d,
          shift: shift,
          changeover_start_time: timestamp,
          opertor: "6140f6d853fb6b0692d68476",
        },
      ];

      // pre_batch
      pre_batch.end_time = timestamp;
      pre_batch.end_date = d;
      await pre_batch.save();

      // change sap sataus
      pre_changeover.changeover_to_date = d;
      await pre_changeover.save();

      const raw = new changeOver(changeover_obj);
      var data = await raw.save();

      const ch_data = await updateChangeoverMode(
        line_id,
        result._id,
        line_data,
        data._id,
        current_cip._id,
        true,
        "",
        ()=>{
          
        }
      );

      line_data.global_changeover = true;
      line_data.cip_mode = false;
      line_data.cip_type = 0;
      await line_data.save();
      global.ChangeoverMode[line_id] = false;
      cb(ch_data, null);  
    }
  } catch (err) {
    console.error(err);
    cb(err, null);
  }
};

//add next charter in batch
function nextChar(c) {
  return String.fromCharCode(c.charCodeAt(0) + 1);
}
var linevendorend = {};
//post vendor
async function postVendor(line_id, user_name, isSameSize, cb) {
  var vendor_name = await vendor.findOne();
  if (!line_id) {
    res.status(409).send("Please send valid line id");
  } else {
    if (!linevendorend[line_id]) {
      linevendorend[line_id] = true;
      let timestamp = moment().format("YYYY-MM-DDTHH:mm:ss");
      var line_data = await addLine
        .findOne({ line_id: line_id })
        .populate("line_id");
      var auto_vendor = `${line_data.line_id.line_batch}${moment().format(
        "YYYYMMDDTHHmmss"
      )}`;
      var pre_vendor = await vendortrigger
        .findOne({
          line_id: line_id,
          end_date: null,
        })
        .populate("vendor");
      if (new Date() - new Date(pre_vendor.start_time) < 60000 && !isSameSize) {
        cb({
          status: 401,
          msg: "Please wait at least 1 min to finish 1st batch",
        });
        linevendorend[line_id] = false;
        return;
      } else {
        var currentShift = await CurrentShift();
        var shift = currentShift.shift;
        var d = currentShift.date;
        var vendor_obj = {};
        vendor_obj.start_time = timestamp;
        vendor_obj.start_date = d;
        vendor_obj.vendor = vendor_name._id;
        vendor_obj.line_id = line_id;
        vendor_obj.vendor_name = auto_vendor;
        vendor_obj.vendor_set_by = user_name;
        var new_vendor = new vendortrigger(vendor_obj);
        new_vendor.save(async (err, result) => {
          if (err) {
            cb({
              status: 401,
              msg: err.message,
            });
            linevendorend[line_id] = false;
          } else {
            pre_vendor.end_date = d;
            pre_vendor.end_time = timestamp;
            await pre_vendor.save();
            if (!isSameSize) {
              linevendorend[line_id] = false;
              cb({
                status: 200,
                msg: result,
              });
            } else {
              updateVendor(line_id, new_vendor._id, line_data, (ch_data) => {
                cb({
                  status: 200,
                  msg: ch_data,
                });
                linevendorend[line_id] = false;
              });
            }
          }
        });
      }
    } else {
      cb({
        status: 409,
        msg: "Please wait first request to execute",
      });
    }
  }
}
module.exports.Changeover = router;
module.exports.ChangeoverFromFunction = ChangeoverFromFunction;
