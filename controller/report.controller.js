var express = require("express");
var mongoose = require("mongoose");
var moment = require("moment");
var router = express.Router();
var { Project, getDayWiseReport,getShiftDatewiseCount } = require("../model/project.model");
var {History,adjustMatchCount} = require("../model/history.model")
var { Batchskutrigger } = require("../model/batch.model");
var { changeOver } = require("../model/changeover.model");
var fault_obj = require("../fault.json");
var { getColour } = require("../model/threshhold.model");
var { addLine } = require("../model/addLine.model");
const { Equipment } = require("../model/equipment.model");
var { getLiveChartData } = require("./multiline.controller");
var roll_changeover_time_multification = 4 * 60;
//batch wise report
router.get("/batch", async (req, res) => {
  var line_id = req.query.line_id;
  var batch = req.query.batch;
  var end;
  var batch_data = await Batchskutrigger.findOne({ batch: batch }).populate(
    "product_name"
  );
  var changeover = await changeOver
    .findOne({ batch_name: batch })
    .populate("line_id")
    .populate("changeover_type_id");
  var equipment_arr = await Equipment.find({ line_id: line_id });
  var changover_standard_duration = changeover
    ? changeover.changeover_type_id.standard_duration * 60
    : 0;
  //var addLines = await addLine.findOne({ line_id: req.query.line_id });
  //console.log(changeover)
  var batch = batch_data._id;
  var start;
  if (batch_data.start_date) {
    start = moment(batch_data.start_date).format("YYYY-MM-DD");
  } else {
    start = moment(batch_data.start_time).local().format("YYYY-MM-DD");
  }
  var batch_end;
  if (!batch_data.end_time) {
    end = moment().local().format("YYYY-MM-DD");
    batch_end = moment().local().format();
  } else {
    end = moment(batch_data.end_time).local().format("YYYY-MM-DD");
    batch_end = moment(batch_data.end_time).local().format();
  }
  var data = await Project.aggregate([
    {
      $match: {
        line_id:  new mongoose.Types.ObjectId(line_id),
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
    { $unwind: "$shift_wise" },
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
      $match: {
        "shift_wise.batch_wise.batch": new mongoose.Types.ObjectId(batch),
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
        path: "$batch",
        preserveNullAndEmptyArrays: true,
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
      $unwind: {
        path: "$shift_wise.batch_wise.vendor_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "vendortriggers",
        localField: "shift_wise.batch_wise.vendor_wise.vendor",
        foreignField: "_id",
        as: "vendertrigger",
      },
    },
    {
      $unwind: {
        path: "$vendertrigger",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "vendors",
        localField: "vendertrigger.vendor",
        foreignField: "_id",
        as: "vender",
      },
    },
    {
      $unwind: {
        path: "$vender",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$shift_wise.batch_wise.vendor_wise.machine_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        line_id: "$line_id",
        shift: "$shift_wise.shift_name",
        machine_name:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
          goodCount: "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
          raw_good_count:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
            manual_casecount:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.manual_casecount",
        raw_cycle_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
        cycle_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
        reject_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.reject_count",
        startup_reject:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.startup_reject",
        waitingCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.waitingCriticaloff",
        blockedCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.blockedCriticaloff",
        major_manual_stopCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.major_manual_stopCriticaloff",
        minor_manual_stopCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.minor_manual_stopCriticaloff",
        readyCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.readyCriticaloff",
        critical_off:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.critical_off",
        schedule_maintance: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "schedule_maintance"] },
          },
        },
        vender_name: "$vender.vendor",
        changeover_id: {
          $dateToString: {
            format: "%Y%m%d%H%M",
            date: "$batch_changeover.changeover_start_date",
            timezone: "+05:30",
          },
        },

        startup_reject:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.startup_reject",
        fault: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "fault"] },
          },
        },
        date: "$date",
        changeover: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "changeover"] },
          },
        },
        blocked: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "blocked"] },
          },
        },
        cip: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "cip"] },
          },
        },
        pdt: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "pdt"] },
          },
        },
        manual_stop: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "manual_stop"] },
          },
        },
        updt: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "updt"] },
          },
        },
        waiting: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "waiting"] },
          },
        },
        ready: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "ready"] },
          },
        },
        operator_name: {
          $ifNull: ["$operator_name", "Not Defined"],
        },
        batch_start: "$shift_wise.batch_wise.start_timestamp",
        batch_end: {
          $ifNull: ["$shift_wise.batch_wise.end_timestamp", new Date()],
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
        path: "$schedule_maintance",
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
        path: "$ready",
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
      $project: {
        line_id: 1,
        rated_speed: 1,
        isCurrent: 1,
        machine_name: 1,
        goodCount: 1,
        manual_casecount:1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        cycle_count: 1,
        reject_count: 1,
        startup_reject: 1,
        waitingCriticaloff: 1,
        blockedCriticaloff: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        critical_off: 1,
        schedule_maintance: 1,
        vender_name: 1,
        reject_count: 1,
        startup_reject: 1,
        operator_name: 1,
        date: 1,
        shift: 1,
        fault: 1,
        ready: 1,
        blocked: 1,
        waiting: 1,
        updt: 1,
        pdt: 1,
        cip:1,
        changeover_id: 1,
        changeover: 1,
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
        total_batch_duration: {
          $round: [
            {
              $divide: [
                {
                  $subtract: ["$batch_end", "$batch_start"],
                },
                1000 * 60,
              ],
            },
            0,
          ],
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
      $group: {
        _id: {
          shift: "$shift",
          vender_name: "$vender_name",
          changeover_id: "$changeover_id",
          date: "$date",
          machine_name: "$machine_name",
          operator_name: "$operator_name",
        },
        goodCount: { $sum: "$goodCount" },
        manual_casecount:{ $sum: "$manual_casecount" },
        raw_good_count: { $sum: "$raw_good_count" },
        raw_cycle_count: { $sum: "$raw_cycle_count" },
        cycle_count: { $sum: "$cycle_count" },
        reject_count: { $sum: "$reject_count" },
        waitingCriticaloff: { $sum: "$waitingCriticaloff" },
        blockedCriticaloff: { $sum: "$blockedCriticaloff" },
        major_manual_stopCriticaloff: { $sum: "$major_manual_stopCriticaloff" },
        minor_manual_stopCriticaloff: { $sum: "$minor_manual_stopCriticaloff" },
        readyCriticaloff: { $sum: "$readyCriticaloff" },
        schedule_maintance: { $sum: "$schedule_maintance.duration" },
        schedule_maintance_count: { $sum: "$schedule_maintance.count" },
        case_count: { $sum: "$case_count" },
        roll_changeover: { $sum: "$roll_changeover" },
        reject_count: { $sum: "$reject_count" },
        startup_reject: { $sum: "$startup_reject" },
        blocked: { $sum: "$blocked.duration" },
        blocked_count: { $sum: "$blocked.count" },
        cip: { $sum: "$cip.duration" },
        cip_count: { $sum: "$cip.count" },
        waiting: { $sum: "$waiting.duration" },
        waiting_count: { $sum: "$waiting.count" },
        major_manual_stop: { $sum: "$major_manual_stop.duration" },
        major_manual_stop_count: { $sum: "$major_manual_stop.count" },
        minor_manual_stop: { $sum: "$minor_manual_stop.duration" },
        minor_manual_stop_count: { $sum: "$minor_manual_stop.count" },
        pdt: { $sum: "$pdt.duration" },
        pdt_count: { $sum: "$pdt.count" },
        updt: { $sum: "$updt.duration" },
        ready: { $sum: "$ready.duration" },
        updt_count: { $sum: "$updt.count" },
        ready_count: { $sum: "$ready.count" },
        changeover: { $sum: "$changeover.duration" },
        changeover_count: { $sum: "$changeover.count" },
        major_fault: { $sum: "$major_fault.duration" },
        major_fault_count: { $sum: "$major_fault.count" },
        minor_fault: { $sum: "$minor_fault.duration" },
        minor_fault_count: { $sum: "$minor_fault.count" },
        total_batch_duration: { $sum: "$total_batch_duration" },
        fault_arr: {
          $push: "$major_fault.duration_details",
        },
        critical_off: {
          $push: "$critical_off",
        },
      },
    },
    {
      $group: {
        _id: "$_id.date",
        shift: {
          $push: {
            shift: "$_id.shift",
            vender_name: "$_id.vender_name",
            machine_name: "$_id.machine_name",
            operator_name: "$_id.operator_name",
            fault_arr: "$fault_arr",
            goodCount: "$goodCount",
            manual_casecount: "$manual_casecount",
            changeover_id: "$_id.changeover_id",
            case_count: "$case_count",
            cycle_count: "$cycle_count",
            waitingCriticaloff: "$waitingCriticaloff",
            blockedCriticaloff: "$blockedCriticaloff",
            major_manual_stopCriticaloff: "$major_manual_stopCriticaloff",
            minor_manual_stopCriticaloff: "$minor_manual_stopCriticaloff",
            readyCriticaloff: "$readyCriticaloff",
            schedule_maintance: "$schedule_maintance",
            raw_good_count: "$raw_good_count",
            raw_cycle_count: "$raw_cycle_count",
            reject_count: "$reject_count",
            changeover_id: "$changeover_id",
            startup_reject: "$startup_reject",
            blocked: "$blocked",
            schedule_maintance: "$schedule_maintance",
            schedule_maintance_count: "$schedule_maintance_count",
            blocked_count: "$blocked_count",
            waiting: "$waiting",
            waiting_count: "$waiting_count",
            cip: "$cip",
            cip_count: "$cip_count",
            manual_stop: "$manual_stop",
            manual_stop_count: "$manual_stop_count",
            pdt: "$pdt",
            pdt_count: "$pdt_count",
            updt: "$updt",
            ready: "$ready",
            updt_count: "$updt_count",
            ready_count: "$ready_count",
            changeover: "$changeover",
            changeover_count: "$changeover_count",
            major_fault: "$major_fault",
            major_fault_count: "$major_fault_count",
            minor_fault: "$minor_fault",
            minor_fault_count: "$minor_fault_count",
            major_manual_stop: "$major_manual_stop",
            major_manual_stop_count: "$major_manual_stop_count",
            minor_manual_stop: "$minor_manual_stop",
            minor_manual_stop_count: "$minor_manual_stop_count",
            total_batch_duration: "$total_batch_duration",
          },
        },
      },
    },
    {
      $unwind: {
        path: "$shift",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: "$shift.machine_name",
        goodCount: { $sum: "$shift.goodCount" },
        manual_casecount: { $sum: "$shift.manual_casecount"},
        raw_good_count: { $sum: "$shift.raw_good_count" },
        raw_cycle_count: { $sum: "$shift.raw_cycle_count" },
        cycle_count: { $sum: "$shift.cycle_count" },
        reject_count: { $sum: "$shift.reject_count" },
        startup_reject: { $sum: "$shift.startup_reject" },
        waitingCriticaloff: { $sum: "$shift.waitingCriticaloff" },
        blockedCriticaloff: { $sum: "$shift.blockedCriticaloff" },
        major_manual_stopCriticaloff: {
          $sum: "$shift.major_manual_stopCriticaloff",
        },
        minor_manual_stopCriticaloff: {
          $sum: "$shift.minor_manual_stopCriticaloff",
        },
        readyCriticaloff: { $sum: "$shift.readyCriticaloff" },
        schedule_maintance: { $sum: "$shift.schedule_maintance.duration" },
        schedule_maintance_count: { $sum: "$shift.schedule_maintance.count" },
        blocked: { $sum: "$shift.blocked" },
        blocked_count: { $sum: "$shift.blocked_count" },
        waiting: { $sum: "$shift.waiting" },
        waiting_count: { $sum: "$shift.waiting_count" },
        manual_stop: { $sum: "$shift.manual_stop" },
        manual_stop_count: { $sum: "$shift.manual_stop_count" },
        pdt: { $sum: "$shift.pdt" },
        pdt_count: { $sum: "$shift.pdt_count" },
        cip: { $sum: "$shift.cip" },
        cip_count: { $sum: "$shift.cip_count" },
        changeover: { $sum: "$shift.changeover" },
        changeover_count: { $sum: "$shift.changeover_count" },
        updt: { $sum: "$shift.updt" },
        ready: { $sum: "$shift.ready" },
        updt_count: { $sum: "$shift.updt_count" },
        ready_count: { $sum: "$shift.ready_count" },
        major_manual_stop: { $sum: "$shift.major_manual_stop" },
        major_manual_stop_count: { $sum: "$shift.major_manual_stop_count" },
        minor_manual_stop: { $sum: "$shift.minor_manual_stop" },
        minor_manual_stop_count: { $sum: "$shift.minor_manual_stop_count" },
        major_fault: { $sum: "$shift.major_fault" },
        major_fault_count: { $sum: "$shift.major_fault_count" },
        minor_fault: { $sum: "$shift.minor_fault" },
        minor_fault_count: { $sum: "$shift.minor_fault_count" },
        total_batch_duration: { $sum: "$shift.total_batch_duration" },
        fault_arr: {
          $push: "$shift.fault_arr",
        },
        critical_off: {
          $push: "$critical_off",
        },
        shift_wise: {
          $push: {
            shift: "$shift.shift",
            goodCount: "$shift.goodCount",
            manual_casecount : "$shift.manual_casecount",
            case_count: "$shift.case_count",
            roll_changeover: "$shift.roll_changeover",
            date: "$_id",
            reject_count: "$shift.reject_count",
            operator_name: "$shift.operator_name",
          },
        },
      },
    },
    {
      $unwind: {
        path: "$fault_arr",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$fault_arr",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$fault_arr",
        preserveNullAndEmptyArrays: true,
      },
    },
    // {
    //   $match: {
    //     fault_arr: {
    //       $ne: null,
    //     },
    //   },
    // },
    {
      $project: {
        _id: 1,
        goodCount: 1,
        manual_casecount:1,
        case_count: 1,
        vender_name: 1,
        changeover_id: 1,
        roll_changeover: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        cycle_count: 1,
        reject_count: 1,
        waitingCriticaloff: 1,
        blockedCriticaloff: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        schedule_maintance: 1,
        schedule_maintance_count: 1,
        startup_reject: 1,
        shift_wise: 1,
        blocked: 1,
        ready: 1,
        blocked_count: 1,
        waiting: 1,
        waiting_count: 1,
        cip: 1,
        cip_count: 1,
        major_manual_stop: 1,
        major_manual_stop_count: 1,
        minor_manual_stop: 1,
        minor_manual_stop_count: 1,
        pdt: 1,
        pdt_count: 1,
        updt: 1,
        updt_count: 1,
        ready_count: 1,
        changeover: 1,
        changeover_count: 1,
        major_fault: 1,
        major_fault_count: 1,
        minor_fault: 1,
        minor_fault_count: 1,
        total_batch_duration: 1,
        fault_arr: 1,
        critical_off: 1,
      },
    },

    {
      $unwind: {
        path: "$fault_arr",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$fault_arr",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "statusnames",
        let: { stop_name: "$fault_arr.fault_name", machine_name: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ["$machine_name", "$$machine_name"],
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
      $unwind: {
        path: "$status_name",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $group: {
        _id: {
          machine_name: "$_id",
          fault_name: "$fault_arr.fault_name",
          display_name: "$status_name.fault_name",
        },
        duration: { $sum: "$fault_arr.duration" },
        count: { $sum: "$fault_arr.count" },
        parent_arr: {
          $push: {
            goodCount: "$goodCount",
            manual_casecount: "$manual_casecount",
            changeover_id: "$_id.changeover_id",
            case_count: "$case_count",
            cycle_count: "$cycle_count",
            waitingCriticaloff: "$waitingCriticaloff",
            blockedCriticaloff: "$blockedCriticaloff",
            major_manual_stopCriticaloff: "$major_manual_stopCriticaloff",
            minor_manual_stopCriticaloff: "$minor_manual_stopCriticaloff",
            readyCriticaloff: "$readyCriticaloff",
            schedule_maintance: "$schedule_maintance",
            raw_good_count: "$raw_good_count",
            raw_cycle_count: "$raw_cycle_count",
            reject_count: "$reject_count",
            changeover_id: "$changeover_id",
            startup_reject: "$startup_reject",
            blocked: "$blocked",
            blocked_count: "$blocked_count",
            waiting: "$waiting",
            waiting_count: "$waiting_count",
            cip: "$cip",
            cip_count: "$cip_count",
            pdt: "$pdt",
            pdt_count: "$pdt_count",
            updt: "$updt",
            ready: "$ready",
            updt_count: "$updt_count",
            ready_count: "$ready_count",
            changeover: "$changeover",
            changeover_count: "$changeover_count",
            major_fault: "$major_fault",
            major_fault_count: "$major_fault_count",
            minor_fault: "$minor_fault",
            minor_fault_count: "$minor_fault_count",
            major_manual_stop: "$major_manual_stop",
            major_manual_stop_count: "$major_manual_stop_count",
            minor_manual_stop: "$minor_manual_stop",
            minor_manual_stop_count: "$minor_manual_stop_count",
            total_batch_duration: "$total_batch_duration",
            shift_wise: "$shift_wise",
            status_name: "$status_name",
          },
        },
      },
    },

    {
      $group: {
        _id: "$_id.machine_name",
        fault_arr: {
          $push: {
            fault_name: "$_id.fault_name",
            display_name: "$_id.display_name",
            duration: "$duration",
            count: "$count",
          },
        },
        parent_arr: { $addToSet: "$parent_arr" },
      },
    },

    // // // //.................
    {
      $project: {
        machine_name: "$_id",
        fault_arr: "$fault_arr",
        parent_arr: { $arrayElemAt: ["$parent_arr", 0] },
      },
    },
    {
      $project: {
        machine_name: "$_id",
        fault_arr: "$fault_arr",
        parent_arr: { $arrayElemAt: ["$parent_arr", 0] },
      },
    },
    {
      $unwind: {
        path: "$parent_arr",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        machine_name: 1,
        fault_arr: 1,
        goodCount: "$parent_arr.goodCount",
        case_count: "$parent_arr.case_count",
        manual_casecount: "$parent_arr.manual_casecount",
        vender_name: "$parent_arr.vender_name",
        changeover_id: "$parent_arr.changeover_id",
        roll_changeover: "$parent_arr.roll_changeover",
        raw_good_count: "$parent_arr.raw_good_count",
        raw_cycle_count: "$parent_arr.raw_cycle_count",
        cycle_count: "$parent_arr.cycle_count",
        reject_count: "$parent_arr.reject_count",
        waitingCriticaloff: "$parent_arr.waitingCriticaloff",
        blockedCriticaloff: "$parent_arr.blockedCriticaloff",
        major_manual_stopCriticaloff:
          "$parent_arr.major_manual_stopCriticaloff",
        minor_manual_stopCriticaloff:
          "$parent_arr.minor_manual_stopCriticaloff",
        readyCriticaloff: "$parent_arr.readyCriticaloff",
        schedule_maintance: "$parent_arr.schedule_maintance",
        schedule_maintance_count: "$parent_arr.schedule_maintance_count",
        startup_reject: "$parent_arr.startup_reject",
        blocked: "$parent_arr.blocked",
        blocked_count: "$parent_arr.blocked_count",
        waiting: "$parent_arr.waiting",
        waiting_count: "$parent_arr.waiting_count",
        cip: "$parent_arr.cip",
        cip_count: "$parent_arr.cip_count",
        pdt: "$parent_arr.pdt",
        pdt_count: "$parent_arr.pdt_count",
        updt: "$parent_arr.updt",
        ready: "$parent_arr.ready",
        updt_count: "$parent_arr.updt_count",
        ready_count: "$parent_arr.ready_count",
        shift_wise: "$parent_arr.shift_wise",
        changeover: "$parent_arr.changeover",
        major_fault: "$parent_arr.major_fault",
        major_fault_count: "$parent_arr.major_fault_count",
        minor_fault: "$parent_arr.minor_fault",
        minor_fault_count: "$parent_arr.minor_fault_count",
        major_manual_stop: "$parent_arr.major_manual_stop",
        major_manual_stop_count: "$parent_arr.major_manual_stop_count",
        minor_manual_stop: "$parent_arr.minor_manual_stop",
        minor_manual_stop_count: "$parent_arr.minor_manual_stop_count",
        total_batch_duration: "$parent_arr.total_batch_duration",
      },
    },
  ]);
  //res.send(data)
  var send_data = {};
  var co_pdt = 0;
  var break_pdt = 0;
  var co_pdt_count = 0;
  var break_pdt_count = 0;
  send_data["fault"] = {};
  send_data["date"] = {};
  send_data["operator"] = {};
  send_data["changeover_duration"] = {};
  send_data["actual_production_time"] = {};
  send_data["batch"] = {};
  send_data["batch_size"] = {};
  send_data["shift_good"] = {};
  send_data["shift_case_count"] = {};
  send_data["fgex"] = {};
  send_data["product"] = {};
  send_data["idle"] = {};
  send_data["speed_loss"] = {};
  send_data["waiting"] = {};
  send_data["ready"] = {};
  send_data["blocked"] = {};
  send_data["changeover"] = {};
  send_data["pdt"] = {};
  send_data["co_pdt"] = {};
  send_data["break_pdt"] = {};
  send_data["updt"] = {};
  send_data["ready"] = {};
  send_data["manual_stop"] = {};
  send_data["oee"] = {};
  send_data["performance"] = {};
  send_data["quality"] = {};
  send_data["aviability"] = {};
  send_data["mttr"] = {};
  send_data["mtbf"] = {};
  send_data["sle"] = {};
  send_data["me"] = {};
  send_data["count"] = {};
  send_data["minor_fault"] = {};
  send_data["minor_fault_count"] = {};
  send_data["minor_manual_stop"] = {};
  send_data["minor_manual_stop_count"] = {};
  send_data["speed_loss"] = {};
  send_data["totalTheoreticalTime"] = {};
  send_data["totalPlanProdTime"] = {};
  send_data["netOperatingTime"] = {};
  send_data["grossOperatingTime"] = {};
  send_data["inProcessRejectTime"] = {};
  send_data["changeOverWastageTime"] = {};
  send_data["productiveTime"] = {};
  send_data["changeover_wastage"] = {};
  send_data["fgex_details"] = {};
  send_data["batch_date"] = {};
  send_data["changeover_duration_details"] = {};
  send_data["shift_wise_details"] = {};
  send_data["fault_details"] = {};
  send_data["finished_type"] = {};
  send_data["cause"] = {};
  send_data["changeover_mechanical_time"] = {};
  send_data["changeover_setup_time"] = {};
  send_data["line_data"] = {};
  send_data["buffer"] = {};
  send_data["good_count"] = {};
  send_data["manual_casecount"] = {}
  send_data.bottle_per_case = batch_data.product_name.bottles_per_case;

  var batch_duration = moment.duration(
    moment(batch_end).diff(moment(batch_data.start_time))
  );
  var changeover_mechanical_time = 0;
  var changeover_setup_time = 0;
  var changeover_format = 0;
  if (changeover) {
    changeover_mechanical_time = changeover.changeover_finished
      ? (new Date(changeover.changeover_finished) -
        new Date(changeover.changeover_start_date)) /
      1000 -
      changeover.mechanical_power_off
      : (new Date(changeover.changeover_end_date) -
        new Date(changeover.changeover_start_date)) /
      1000;
    changeover_setup_time = changeover.changeover_finished
      ? (new Date(changeover.changeover_end_date) -
        new Date(changeover.changeover_finished)) /
      1000 -
      changeover.quality_power_off
      : 0;
    changeover_format = moment.duration(
      moment(changeover.changeover_end_date).diff(
        moment(changeover.changeover_start_date)
      )
    );
  }
  var counter = 0;
  var machine_wise_obj = {};
  data.forEach(async (machine, i) => {
    var equipment = equipment_arr.find((a) => a.equipment_name == machine._id);
    machine.goodCount =
      equipment.product == "case"
        ? machine.goodCount * batch_data.product_name.bottles_per_case
        : machine.goodCount ;
    if(machine.manual_casecount){
      machine.goodCount += machine.manual_casecount
    } ; 
    // console.log("goodCount:-",machine.goodCount, machine.manual_casecount)
    machine.cycle_count =
      equipment.product == "case"
        ? machine.cycle_count * batch_data.product_name.bottles_per_case
        : machine.cycle_count;
    machine_wise_obj[machine._id] = machine;
    //res.send(machine_wise_obj)
    if (i + 1 == data.length) {
      data.forEach((element) => {
        var equipment = equipment_arr.find(
          (a) => a.equipment_name == element._id
        );
        // var critical_machine_data = machine_wise_obj[addLines.critical_machine];
        // var last_machine_data = machine_wise_obj[addLines.last_machine];

        // var waiting_stop = machine_wise_obj["filler"].waitingCriticaloff + machine_wise_obj["shrink"].waitingCriticaloff + machine_wise_obj["labeler"].waitingCriticaloff;
        // var blocked_stop = machine_wise_obj["filler"].blockedCriticaloff + machine_wise_obj["shrink"].blockedCriticaloff + machine_wise_obj["labeler"].blockedCriticaloff;
        // var ready_stop = machine_wise_obj["filler"].readyCriticaloff + machine_wise_obj["shrink"].readyCriticaloff + machine_wise_obj["labeler"].readyCriticaloff;
        // var minor_manual_stop_crtical_stop = machine_wise_obj["filler"].minor_manual_stopCriticaloff + machine_wise_obj["shrink"].minor_manual_stopCriticaloff + machine_wise_obj["labeler"].minor_manual_stopCriticaloff;
        var sort_arr = element.fault_arr.sort((a, b) => {
          return b.duration - a.duration;
        });
        var operator = "";
        var shift_good = "";
        var shift_case_count = "";

        // var batch_cal_data = calculation(
        //   last_machine_data.cycle_count,
        //   critical_machine_data.reject_count,
        //   critical_machine_data.total_batch_duration,
        //   critical_machine_data.pdt,
        //   critical_machine_data.changeover,
        //   critical_machine_data.updt,
        //   critical_machine_data.major_fault,
        //   critical_machine_data.major_fault_count,
        //   critical_machine_data.minor_fault,
        //   critical_machine_data.major_manual_stop,
        //   critical_machine_data.minor_manual_stop,
        //   critical_machine_data.blocked,
        //   critical_machine_data.waiting,
        //   batch_data.product_name.rated_speed / 60,
        //   critical_machine_data.startup_reject,
        //   critical_machine_data.ready,
        //   critical_machine_data.schedule_maintance,
        //   waiting_stop,
        //   blocked_stop,
        //   ready_stop,
        //   minor_manual_stop_crtical_stop
        // );
        // line_data = {}
        // line_data.oee = batch_cal_data.oee * 100;
        // line_data.aviability = batch_cal_data.aviability * 100;
        // line_data.quality = batch_cal_data.quality * 100;
        // line_data.performance = batch_cal_data.performance * 100;
        // line_data.performance_time = batch_cal_data.performance_time
        // line_data.planed_production_time = batch_cal_data.working_time_sec;
        // line_data.gross_operating_time = batch_cal_data.production_time_sec;
        // line_data.performance_time = batch_cal_data.performance_time_sec;
        // line_data.reject_time = batch_cal_data.reject_time_sec;
        // line_data.total_idle_time = batch_cal_data.idle_time_sec;
        // line_data.total_idle_count = critical_machine_data.ready_count + critical_machine_data.minor_fault_count + critical_machine_data.major_manual_stop_count + critical_machine_data.blocked_count + critical_machine_data.waiting_count;
        // line_data.speed_loss = batch_cal_data.speed_loss_sec;
        // line_data.net_operating_time = batch_cal_data.net_operating_time_sec;
        // line_data.productive_time = batch_cal_data.productive_time_sec;
        // send_data["line_data"] = line_data;
        var shift_wise_arr = element.shift_wise.sort((a, b) => {
          return a.shift.localeCompare(b.shift);
        });
        shift_wise_arr = element.shift_wise.sort((a, b) => {
          return new Date(a.date) - new Date(b.date);
        });
        send_data["shift_wise_details"][
          element._id
        ] = `<strong>S.N </strong>| <strong> Date </strong> | <strong> Shift </strong> | <strong> Operator name </stromg> | <strong> Blister Good Count </strong> | <strong> Blister Reject Count </strong> ;`;
        shift_wise_arr.forEach((data, i) => {
          send_data["shift_wise_details"][element._id] += `${i + 1} | ${moment(
            data.date
          ).format("DD-MM-YYYY")} | ${data.shift} | ${data.operator_name.display_name || "Not Defined"
            } | ${data.goodCount} | ${data.reject_count} ;`;
          operator += `${data.shift} | ${data.operator_name.display_name || "Not Defined"
            };  `;
          shift_good += `${data.shift} - ${data.goodCount}/${data.reject_count
            }/${data.case_count * batch_data.product_name.bottles_per_case};  `;
        });
        // if (element.changeover < changover_standard_duration) {
        //   break_pdt += element.pdt;
        //   break_pdt_count += element.pdt_count;
        //   element.pdt += element.changeover;
        //   co_pdt += element.changeover;
        //   co_pdt_count += 1;
        //   element.changeover = 0;
        //   element.pdt_count += 1;
        // } else {
        //   break_pdt += element.pdt;
        //   break_pdt_count += element.pdt_count;
        //   var extra_duration = element.changeover - changover_standard_duration;
        //   element.pdt += changover_standard_duration;
        //   element.pdt_count += 1;
        //   co_pdt += changover_standard_duration;
        //   co_pdt_count += 1;
        //   element.changeover = extra_duration;
        // }
        var cal_data = calculation(
          element.goodCount,
          element.reject_count,
          element.total_batch_duration * 60,
          element.pdt,
          element.changeover,
          element.updt,
          element.major_fault,
          element.major_fault_count,
          element.minor_fault,
          element.major_manual_stop,
          element.minor_manual_stop,
          element.blocked,
          element.waiting,
          batch_data.product_name.rated_speed / 60,
          element.startup_reject,
          element.ready,
          element.schedule_maintance,
          0,
          0,
          0,
          0,
          element.cip || 0
        );

        send_data["date"][element._id] = `${moment(
          batch_data.start_time
        ).format("DD-MM-YY - HH:mm:00")} To ${moment(batch_end).format(
          "DD-MM-YY - HH:mm:00"
        )} / ${checkNumber(Math.floor(batch_duration.asHours()))}:${checkNumber(
          Math.floor(batch_duration.asMinutes() % 60)
        )}:00 / `;
        send_data["batch_date"][
          element._id
        ] = `<strong>Start </strong>|
              <strong>CIP/PC</strong>  |
              <strong>Production Start</strong>  |
              <strong>End</strong> |
               <strong>Duration</strong> | 
               <strong>SKU</strong>;
        ${moment(
          batch_data.start_time
        ).format("DD-MM-YY - HH:mm:00")}
         | ${convertHHMM(
          element.cip
        )} 
        | 
        ${moment(batch_data.start_time).add(element.cip + element.changeover, 'seconds').format("DD-MM-YY - HH:mm:00")}

         | ${moment(batch_end).format(
          "DD-MM-YY - HH:mm:00"
        )} |
        ${checkNumber(Math.floor(batch_duration.asHours()))}:${checkNumber(
          Math.floor(batch_duration.asMinutes() % 60)
        )}:00 | ${batch_data.product_name.sku_description};`;
        send_data["operator"][element._id] = operator;
        send_data["shift_good"][element._id] = shift_good;
        send_data["good_count"][element._id] = element.raw_good_count + (element.manual_casecount ? element.manual_casecount : 0);
        // send_data["good_count"][element._id] = `${
        //   (element.manual_casecount ? element.manual_casecount : 0) + element.raw_good_count }`;
            
            if (element.hasOwnProperty("manual_casecount")) {
              send_data["manual_casecount"][element._id] = element.manual_casecount;
            }   
        send_data["shift_case_count"][element._id] = shift_case_count;
        send_data["buffer"][element._id] = element.reject_count;
        send_data["batch"][element._id] = batch_data.batch;
        send_data["changeover_mechanical_time"][element._id] = convertHHMM(changeover_mechanical_time);
        send_data["changeover_setup_time"][element._id] = convertHHMM(changeover_setup_time);
        send_data["fgex"][element._id] =
          batch_data.product_name.fgex +
          " / " +
          batch_data.batch +
          " / " +
          batch_data.product_name.product_name;
        send_data["fgex_details"][element._id] =
          `<strong>Fgex</strong> | <strong>Batch No.</strong> | <strong>Product Name</strong>;` +
          batch_data.product_name.fgex +
          " | " +
          batch_data.batch +
          " | " +
          batch_data.product_name.product_name +
          ";";
        send_data["product"][element._id] =
          batch_data.product_name.product_name;
        send_data["actual_production_time"][element._id] =
          cal_data.production_time;
        send_data["speed_loss"][element._id] = cal_data.speed_loss;
        send_data["idle"][element._id] =
          element.minor_manual_stop_count +
          element.blocked_count +
          element.waiting_count +
          element.minor_fault_count +
          element.ready_count +
          " | " +
          cal_data.idel_time +
          "| -;";
        send_data["totalTheoreticalTime"][element._id] = cal_data.total_time;
        send_data["totalPlanProdTime"][element._id] = cal_data.working_time;
        send_data["netOperatingTime"][element._id] =
          cal_data.net_operating_time;
        send_data["grossOperatingTime"][element._id] = cal_data.production_time;
        send_data["inProcessRejectTime"][element._id] = cal_data.reject_time;
        send_data["changeOverWastageTime"][element._id] =
          cal_data.changeover_wastage_time;
        send_data["productiveTime"][element._id] = cal_data.productive_time;
        send_data["batch_size"][element._id] = `${batch_data.batch_size} / ${(
          ((element.goodCount + element.reject_count) / batch_data.batch_size) *
          100
        ).toFixed(2)}%`;
        if (!changeover) {
          send_data["changeover_duration"][element._id] = "N/A";
          send_data["changeover_duration_details"][element._id] = "00:00:00";
        } else {
          send_data["changeover_duration"][element._id] = `${moment(
            changeover.changeover_start_date
          ).format("DD-MM-YY - HH:mm:00")} To ${moment(
            changeover.changeover_end_date
          ).format("DD-MM-YY - HH:mm:00")} / ${checkNumber(
            Math.floor(changeover_format.asHours())
          )}:${checkNumber(Math.floor(changeover_format.asMinutes() % 60))}:00`;
          send_data["changeover_duration_details"][
            element._id
          ] = ` ${checkNumber(
            Math.floor(changeover_format.asHours())
          )}:${checkNumber(
            Math.floor(changeover_format.asMinutes() % 60)
          )}:00;`;
        }
        send_data["waiting"][element._id] = ` ${element.waiting_count
          } | ${convertHHMM(element.waiting)} | -;`;
        send_data["count"][
          element._id
        ] = `<strong>Blister Good Count</strong> | <strong>Blister Reject Count</strong> | <strong>T200 Good Count</strong>;${element.goodCount
        } | ${element.reject_count}  | ${element.case_count * batch_data.product_name.bottles_per_case
          };`;
        send_data["blocked"][element._id] = `${element.blocked_count
          } | ${convertHHMM(element.blocked)} | -;`;
        send_data["changeover"][element._id] = `${convertHHMM(
          element.changeover
        )} `;
        send_data["ready"][element._id] = `${convertHHMM(element.ready)} `;
        send_data["manual_stop"][element._id] = `${element.major_manual_stop_count
          } | ${convertHHMM(element.major_manual_stop)} | -;`;
        send_data["co_pdt"][element._id] = `${co_pdt_count} | ${convertHHMM(
          co_pdt
        )} | -;`;
        send_data["break_pdt"][
          element._id
        ] = `${break_pdt_count} | ${convertHHMM(break_pdt)} | -;`;
        send_data["pdt"][element._id] = `${element.pdt_count} | ${convertHHMM(
          element.pdt
        )} | -;`;
        send_data["updt"][element._id] = `${element.updt_count} | ${convertHHMM(
          element.updt
        )} | -;`;
        send_data["minor_fault"][element._id] = `${element.minor_fault_count
          } | ${convertHHMM(element.minor_fault)} | -;`;
        send_data["minor_manual_stop"][element._id] = `${element.minor_manual_stop_count
          } | ${convertHHMM(element.minor_manual_stop)} | -;`;
        send_data["finished_type"][element._id] = batch_data.batch_end_type;
        send_data["cause"][element._id] = `${batch_data.end_case ? batch_data.end_case.display_name : "-"
          } | ${batch_data.remark ? batch_data.remark : "-"}`;
        var compare_obj = {
          oee: Number((cal_data.oee * 100).toFixed(2)),
          performance: Number((cal_data.performance * 100).toFixed(2)),
          aviability: Number((cal_data.aviability * 100).toFixed(2)),
          quality: Number((cal_data.quality * 100).toFixed(2)),
          //goodCount:shift.goodCount,
          //reject_count: shift.reject_count,
          major_fault_count: element.major_fault_count,
          changeover_wastage: element.startup_reject,
          totalTheoreticalTime: cal_data.total_time,
          //minspeed:batch_data.product_name.blister_min,
          //average_speed:avg_speed,
          //current_speed:machine_temp.bpm * batch_data.product_name.bottles_per_case,
        };
        //console.log(compare_obj,element._id,cal_data.quality)

        send_data["mttr"][element._id] = cal_data.mttr;
        send_data["mtbf"][element._id] = cal_data.mtbf;
        send_data["me"][element._id] = cal_data.me;
        send_data["sle"][element._id] = cal_data.sle;
        send_data["changeover_wastage"][element._id] = element.startup_reject;
        var count = 1;
        send_data["fault_details"][
          element._id
        ] = `<strong>Fault Name </strong> | <strong> Fault Duration </strong>;`;
        sort_arr.forEach((fault) => {
          if (fault.fault_name) {
            send_data["fault_details"][element._id] += `${fault.display_name
              } | ${convertHHMM(fault.duration)};`;
            send_data[`fault_${count}`] = send_data[`fault_${count}`] || {};
            // send_data[`fault_${count}`][element._id] = `${fault.display_name
            //   }  ${fault.count} / ${convertHHMM(fault.duration)}`;
            count++;
          }
        });
        getColour(
          compare_obj,
          "major_fault_count",
          `${element.major_fault_count} | ${convertHHMM(
            element.major_fault
          )} | - ;`,
          "",
          (fault) => {
            send_data["fault"][element._id] = fault;
            getColour(
              compare_obj,
              "quality",
              (cal_data.quality * 100).toFixed(2),
              "",
              (quality) => {
                send_data["quality"][element._id] = quality;
                getColour(
                  compare_obj,
                  "oee",
                  (cal_data.oee * 100).toFixed(2),
                  "",
                  (oee) => {
                    send_data["oee"][element._id] = oee;
                    getColour(
                      compare_obj,
                      "aviability",
                      (cal_data.aviability * 100).toFixed(2),
                      "",
                      (aviability) => {
                        send_data["aviability"][element._id] = aviability;
                        getColour(
                          compare_obj,
                          "performance",
                          (cal_data.performance * 100).toFixed(2),
                          "",
                          (performance) => {
                            send_data["performance"][element._id] = performance;
                            counter++;
                            if (counter == data.length) {
                              res.send(send_data);
                            }
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    }
  });
});


//shift wise report
router.get("/shift", async (req, res) => {
  var line_id = req.query.line_id;
  var shift = req.query.shift;
  var date = req.query.date;
  var total_time = 480 * 60;
  var data = await Project.aggregate([
    {
      $match: {
        line_id:  new mongoose.Types.ObjectId(line_id),
        date: new Date(date),
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
      $lookup: {
        from: "changeovers",
        localField: "shift_wise.batch_wise.changeover",
        foreignField: "_id",
        as: "batch_changeover",
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
        path: "$batch_changeover",
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
        from: "lines",
        localField: "line_id",
        foreignField: "_id",
        as: "line",
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
        path: "$line",
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
        from: "vendortriggers",
        localField: "shift_wise.batch_wise.vendor_wise.vendor",
        foreignField: "_id",
        as: "vendertrigger",
      },
    },
    {
      $unwind: {
        path: "$vendertrigger",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "vendors",
        localField: "vendertrigger.vendor",
        foreignField: "_id",
        as: "vender",
      },
    },
    {
      $unwind: {
        path: "$vender",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$shift_wise.batch_wise.vendor_wise.machine_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "equipment",
        let: {
          line_id: "$line_id",
          equipment_name:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
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
      $lookup: {
        from: "plants",
        localField: "line.plant_id",
        foreignField: "_id",
        as: "plant",
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
      $lookup: {
        from: "types",
        localField: "batch.end_case",
        foreignField: "_id",
        as: "cause",
      },
    },
    {
      $unwind: {
        path: "$machine",
        preserveNullAndEmptyArrays: true,
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
        path: "$cause",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$plant",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "locations",
        localField: "plant.location_id",
        foreignField: "_id",
        as: "location",
      },
    },
    {
      $unwind: {
        path: "$location",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        line_id: "$line.line_name",
        plant_id: "$plant.plant_name",
        location_id: "$location.location_name",
        shift: "$shift_wise.shift_name",
        machine_name: "$machine.display_name",
        machine: "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
        line: "$line_id",
        goodCount: {
          $cond: [
            {
              $eq: ["$machine.product", "case"],
            },
            {
              $add: [
                {
                  $multiply: [
                    "$fgex.bottles_per_case",
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
                  ],
                },
                { $ifNull: ["$shift_wise.batch_wise.vendor_wise.machine_wise.manual_casecount", 0] }
              ],
            },
            {
              $add: [
                "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
                { $ifNull: ["$shift_wise.batch_wise.vendor_wise.machine_wise.manual_casecount", 0] }
              ],
            }
          ],
        },
        raw_good_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
        manual_casecount:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.manual_casecount",
               
        raw_cycle_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
        cycle_count: {
          $cond: [
            {
              $eq: ["$machine.product", "case"],
            },
            {
              $multiply: [
                "$fgex.bottles_per_case",
                "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
              ],
            },
            "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
          ],
        },
        reject_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.reject_count",
        startup_reject:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.startup_reject",
        waitingCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.waitingCriticaloff",
        blockedCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.blockedCriticaloff",
        major_manual_stopCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.major_manual_stopCriticaloff",
        minor_manual_stopCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.minor_manual_stopCriticaloff",
        readyCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.readyCriticaloff",
        critical_off:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.critical_off",
        standard_duration: {
          $multiply: ["$changeover_type.standard_duration", 60],
        },
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
        fault: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "fault"] },
          },
        },
        date: "$date",
        month_name: { $month: "$date" },
        year: { $year: "$date" },
        changeover: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "changeover"] },
          },
        },
        changeover_id: {
          $dateToString: {
            format: "%Y%m%d%H%M",
            date: "$batch_changeover.changeover_start_date",
            timezone: "+05:30",
          },
        },
        blocked: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "blocked"] },
          },
        },
        cip: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "cip"] },
          },
        },
        pdt: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "pdt"] },
          },
        },
        manual_stop: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "manual_stop"] },
          },
        },
        updt: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "updt"] },
          },
        },
        waiting: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "waiting"] },
          },
        },
        ready: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "ready"] },
          },
        },
        schedule_maintance: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "schedule_maintance"] },
          },
        },
        operator_name: {
          $ifNull: ["$operator_name.display_name", "Operator Not Defined"],
        },
        batch_start: "$shift_wise.batch_wise.vendor_wise.start_timestamp",
        batch_end: "$shift_wise.batch_wise.vendor_wise.end_timestamp",
        rated_speed: {
          $ifNull: ["$fgex.rated_speed", 60],
        },
        peak_speed: "$shift_wise.batch_wise.vendor_wise.machine_wise.max_bpm",
        format: "$fgex.sku_number",
        layout: "$fgex.layout_no",
        product: "$fgex.sku_description",
        pack: "$fgex.pack",
        batch_name: "$batch.batch",
        vender_name: "$vender.vendor",
        batch_size: "$batch.batch_size",
        changeover_type: "$changeover_type.changeover_name",
        cause: {
          $ifNull: ["$cause.display_name", "-"],
        },
        remark: { $ifNull: ["$batch.remark", "-"] },
        batch_end_type: "$batch.batch_end_type",
        setup: {
          $subtract: [
            {
              $ifNull: ["$shift_wise.batch_wise.machine_wise.setup_time", 0],
            },
            {
              $ifNull: [
                "$shift_wise.batch_wise.machine_wise.set_up_power_off",
                0,
              ],
            },
          ],
        },
      },
    },
    {
      $match: {
        batch_end: { $ne: null },
      },
    },
    {
      $unwind: {
        path: "$schedule_maintance",
        preserveNullAndEmptyArrays: true,
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
        path: "$cip",
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
        path: "$ready",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        month: {
          $let: {
            vars: {
              monthsInString: [
                ,
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ],
            },
            in: {
              $arrayElemAt: ["$$monthsInString", "$month_name"],
            },
          },
        },
      },
    },
    {
      $project: {
        line_id: 1,
        plant_id: 1,
        location_id: 1,
        pack: 1,
        changeover_id: 1,
        vender_name: 1,
        plant_id: 1,
        rated_speed: 1,
        isCurrent: 1,
        schedule_maintance: 1,
        machine_name: 1,
        goodCount: 1,
        manual_casecount:1,
        peak_speed: 1,
        reject_count: 1,
        operator_name: 1,
        standard_duration: 1,
        waitingCriticaloff: 1,
        blockedCriticaloff: 1,
        manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        critical_off: 1,
        cycle_count: 1,
        machine: 1,
        line: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        changeover_split: {
          $ifNull:[
            {
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
            1

          ]
        },
        date: 1,
        case_count: 1,
        roll_changeover: 1,
        month: "$month",
        year: 1,
        shift: 1,
        fault: 1,
        ready: 1,
        blocked: 1,
        cip: 1,
        waiting: 1,
        updt: 1,
        pdt: 1,
        format: 1,
        layout: 1,
        product: 1,
        changeover: 1,
        manual_stop: 1,
        startup_reject: 1,
        mechanical_changeover: {
          $subtract: ["$changeover.duration", "$setup"],
        },
        setup_changeover: "$setup",
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
        batch_start: 1,
        batch_end: 1,
        batch_size: 1,
        batch_name: 1,
        t200Use: 1,
        changeover_type: 1,
        cause: 1,
        remark: 1,
        batch_end_type: {
          $ifNull: ["$batch_end_type", "Running"],
        },
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
        plant_id: 1,
        location_id: 1,
        pack: 1,
        rated_speed: {
          $divide: ["$rated_speed", 60],
        },
        changeover_id: 1,
        format: 1,
        machine: 1,
        line: 1,
        product: 1,
        machine_name: 1,
        goodCount: 1,
        manual_casecount:1,
        vender_name: 1,
        reject_count: 1,
        case_count: 1,
        roll_changeover: 1,
        batch_name: 1,
        batch_size: 1,
        operator_name: 1,
        standard_duration: 1,
        total_batch_duration: 1,
        date: 1,
        waitingCriticaloff: 1,
        blockedCriticaloff: 1,
        readyCriticaloff: 1,
        critical_off: 1,
        cycle_count: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        month: { $concat: ["$month", "-", { $toString: "$year" }] },
        shift: 1,
        peak_speed: 1,
        layout: 1,
        batch_start: 1,
        batch_end: 1,
        startup_reject: 1,
        major_manual_stopCriticaloff: {
          $ifNull: ["$major_manual_stopCriticaloff", 0],
        },
        minor_manual_stopCriticaloff: {
          $ifNull: ["$minor_manual_stopCriticaloff", 0],
        },
        schedule_maintance: {
          $ifNull: ["$schedule_maintance.duration", 0],
        },
        schedule_maintance_count: {
          $ifNull: ["$schedule_maintance.count", 0],
        },
        blocked: {
          $ifNull: ["$blocked.duration", 0],
        },
        blocked_count: {
          $ifNull: ["$blocked.count", 0],
        },
        cip: {
          $ifNull: ["$cip.duration", 0],
        },
        cip_count: {
          $ifNull: ["$cip.count", 0],
        },
        waiting: {
          $ifNull: ["$waiting.duration", 0],
        },
        waiting_count: {
          $ifNull: ["$waiting.count", 0],
        },
        break_pdt: {
          $ifNull: ["$pdt.duration", 0],
        },
        co_pdt: {
          $cond: [
            {
              $gte: ["$changeover_split", 1],
            },
            {
              $ifNull: ["$changeover.duration", 0],
            },
            {
              $multiply: [
                "$changeover_split",
                {
                  $ifNull: ["$changeover.duration", 0],
                },
              ],
            },
          ],
        },
        pdt: {
          $cond: [
            {
              $gte: ["$changeover_split", 1],
            },
            {
              $sum: [
                {
                  $ifNull: ["$changeover.duration", 0],
                },
                {
                  $ifNull: ["$pdt.duration", 0],
                },
              ],
            },
            {
              $sum: [
                {
                  $ifNull: ["$pdt.duration", 0],
                },
                {
                  $multiply: [
                    "$changeover_split",
                    {
                      $ifNull: ["$changeover.duration", 0],
                    },
                  ],
                },
              ],
            },
          ],
        },
        pdt_count: {
          $ifNull: ["$pdt.count", 0],
        },
        updt: {
          $ifNull: ["$updt.duration", 0],
        },
        ready: {
          $ifNull: ["$ready.duration", 0],
        },
        ready_count: {
          $ifNull: ["$ready.count", 0],
        },
        updt_count: "$updt.count",
        changeover: {
          $cond: [
            {
              $gte: ["$changeover_split", 1],
            },
            0,
            {
              $subtract: [
                {
                  $ifNull: ["$changeover.duration", 0],
                },
                {
                  $multiply: [
                    "$changeover_split",
                    {
                      $ifNull: ["$changeover.duration", 0],
                    },
                  ],
                },
              ],
            },
          ],
        },
        changeover_count: {
          $ifNull: ["$changeover.count", 0],
        },
        major_fault: {
          $ifNull: ["$major_fault.duration", 0],
        },
        major_fault_count: {
          $ifNull: ["$major_fault.count", 0],
        },
        minor_fault: {
          $ifNull: ["$minor_fault.duration", 0],
        },
        minor_fault_count: {
          $ifNull: ["$minor_fault.count", 0],
        },
        fault_arr: "$major_fault.duration_details",
        major_manual_stop: {
          $ifNull: ["$major_manual_stop.duration", 0],
        },
        major_manual_stop_count: {
          $ifNull: ["$major_manual_stop.count", 0],
        },
        minor_manual_stop: {
          $ifNull: ["$minor_manual_stop.duration", 0],
        },
        minor_manual_stop_count: {
          $ifNull: ["$minor_manual_stop.count", 0],
        },
        t200Use: 1,
        changeover_type: 1,
        cause: 1,
        remark: 1,
        batch_end_type: 1,
        mechanical_changeover: {
          $cond: [
            {
              $lt: ["$mechanical_changeover", 0],
            },
            0,
            "$mechanical_changeover",
          ],
        },
        setup_changeover: 1,
      },
    },
    {
      $project: {
        line_id: 1,
        plant_id: 1,
        location_id: 1,
        pack: 1,
        rated_speed: 1,
        format: 1,
        product: 1,
        changeover_id: 1,
        waitingCriticaloff: 1,
        machine: 1,
        line: 1,
        fault_arr: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        blockedCriticaloff: {
          $ifNull: ["$blockedCriticaloff", 0],
        },
        manual_stopCriticaloff: {
          $ifNull: ["$manual_stopCriticaloff", 0],
        },
        readyCriticaloff: {
          $ifNull: ["$readyCriticaloff", 0],
        },
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        critical_off: 1,
        cycle_count: 1,
        vender_name: 1,
        schedule_maintance: {
          $ifNull: ["$schedule_maintance.duration", 0],
        },
        schedule_maintance_count: {
          $ifNull: ["$schedule_maintance.count", 0],
        },
        machine_name: 1,
        goodCount: 1,
        manual_casecount:1,
        reject_count: 1,
        case_count: 1,
        roll_changeover: 1,
        batch_name: 1,
        batch_size: 1,
        operator_name: 1,
        date: 1,
        month: 1,
        shift: 1,
        peak_speed: 1,
        changeover_pdt: 1,
        layout: 1,
        batch_start: 1,
        batch_end: 1,
        startup_reject: 1,
        blocked: 1,
        blocked_count: 1,
        cip: 1,
        cip_count: 1,
        waiting: 1,
        waiting_count: 1,
        pdt: 1,
        pdt_count: 1,
        break_pdt: 1,
        co_pdt: 1,
        co_pdt_count: {
          $cond: [
            {
              $gt: ["$co_pdt", 0],
            },
            1,
            0,
          ],
        },
        break_pdt_count: "$pdt_count",
        updt: 1,
        ready: 1,
        ready_count: 1,
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
        total_batch_duration: 1,
        changeover_type: 1,
        cause: 1,
        remark: 1,
        batch_end_type: 1,
        mechanical_changeover: 1,
        setup_changeover: 1,
      },
    },
    {
      $project: {
        line_id: 1,
        plant_id: 1,
        location_id: 1,
        pack: 1,
        changeover_id: 1,
        waitingCriticaloff: 1,
        machine: 1,
        line: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        blockedCriticaloff: 1,
        manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        critical_off: 1,
        cycle_count: 1,
        vender_name: 1,
        schedule_maintance: 1,
        schedule_maintance_count: 1,
        fault_arr: 1,
        ready_count: 1,
        rated_speed: 1,
        format: 1,
        product: 1,
        machine_name: 1,
        goodCount: 1,
        manual_casecount:1,
        case_count: 1,
        oll_changeover: 1,
        reject_count: 1,
        batch_name: 1,
        batch_size: 1,
        operator_name: 1,
        date: 1,
        shift: 1,
        batch_start: 1,
        batch_end: 1,
        startup_reject: 1,
        blocked: 1,
        blocked_count: 1,
        cip: 1,
        cip_count: 1,
        waiting: 1,
        waiting_count: 1,
        pdt: 1,
        pdt_count: 1,
        break_pdt: 1,
        co_pdt: 1,
        co_pdt_count: {
          $cond: [
            {
              $gt: ["$co_pdt", 0],
            },
            1,
            0,
          ],
        },
        break_pdt_count: "$pdt_count",
        updt: 1,
        ready: 1,
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
        fault_arr: 1,
        t200Use: 1,
        npt: {
          $round: [
            {
              $subtract: [
                "$total_batch_duration",
                {
                  $sum: ["$schedule_break", "$pdt"],
                },
              ],
            },
            0,
          ],
        },
        working_time: {
          $round: [
            {
              $subtract: [
                "$total_batch_duration",
                {
                  $sum: ["$pdt", "$updt", "$schedule_maintance", "$cip"],
                },
              ],
            },
            0,
          ],
        },
        production_time: {
          $round: [
            {
              $subtract: [
                "$total_batch_duration",
                {
                  $sum: [
                    "$pdt",
                    "$updt",
                    "$changeover",
                    "$schedule_maintance",
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
        total_batch_duration: 1,
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
        rated_speed: 1,
        format: 1,
        plant_id: 1,
        location_id: 1,
        pack: 1,
        changeover_id: 1,
        waitingCriticaloff: 1,
        machine: 1,
        line: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        blockedCriticaloff: 1,
        manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        critical_off: 1,
        cycle_count: 1,
        vender_name: 1,
        schedule_maintance: 1,
        schedule_maintance_count: 1,
        fault_arr: 1,
        product: 1,
        machine_name: 1,
        idle_time: 1,
        idle_count: 1,
        operator_name: 1,
        date: 1,
        shift: 1,
        batch_name: 1,
        batch_size: 1,
        batch_start: 1,
        batch_end: 1,
        startup_reject: 1,
        working_time: 1,
        goodCount: 1,
        manual_casecount:1,
        case_count: 1,
        roll_changeover: 1,
        reject_count: 1,
        blocked: 1,
        ready: 1,
        blocked_count: 1,
        cip: 1,
        cip_count: 1,
        waiting: 1,
        waiting_count: 1,
        major_manual_stop: 1,
        major_manual_stop_count: 1,
        minor_manual_stop: 1,
        minor_manual_stop_count: 1,
        pdt: 1,
        pdt_count: {
          $sum: ["$co_pdt_count", "$break_pdt_count"],
        },
        break_pdt: 1,
        break_pdt_count: 1,
        co_pdt_count: 1,
        co_pdt: 1,
        updt: 1,
        updt_count: 1,
        changeover: 1,
        changeover_count: 1,
        total_batch_duration: 1,
        major_fault: 1,
        major_fault_count: 1,
        minor_fault: 1,
        minor_fault_count: 1,
        idle_time: 1,
        idle_count: 1,
        npt:1,
        production_time: {
          $cond: [
            {
              $lt: ["$production_time", 60],
            },
            0,
            "$production_time",
          ],
        },
        avg_speed: {
          $cond: [
            {
              $or: [
                {
                  $lte: ["$production_time", 60],
                },
                { $lte: [{ $sum: ["$goodCount", "$reject_count"] }, 0] },
                {
                  $lte: [{ $subtract: ["$production_time", "$idle_time"] }, 0],
                },
              ],
            },
            0,
            {
              $round: [
                {
                  $divide: [
                    { $sum: ["$goodCount", "$reject_count"] },
                    {
                      $subtract: [
                        "$production_time",
                        {
                          $sum: [
                            "$idle_time",
                            "$major_fault",
                            "$major_manual_stop",
                          ],
                        },
                      ],
                    },
                  ],
                },
                0,
              ],
            },
          ],
        },
        et: {
          $cond: [
            {
              $or: [
                {
                  $lte: ["$npt", 60],
                },
                { $lt: [{ $sum: ["$goodCount", "$reject_count"] }, 0] },
              ],
            },
            0,
            {
              $round: [
                {
                  $divide: [
                    { $sum: ["$goodCount", "$reject_count"] },
                    "$rated_speed",
                  ],
                },
                0,
              ],
            },
          ],
        },
        performance_time: {
          $cond: [
            {
              $or: [
                {
                  $lte: ["$production_time", 60],
                },
                //{ $lt: [{ $sum: ["$goodCount", "$reject_count"] }, 0] },
              ],
            },
            0,
            {
              $round: [
                {
                  $subtract: [
                    "$production_time",
                    {
                      $divide: [
                        {
                          $sum: ["$goodCount", "$reject_count"],
                        },
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
      },
    },
    {
      $project: {
        line_id: 1,
        rated_speed: 1,
        plant_id: 1,
        location_id: 1,
        pack: 1,
        changeover_id: 1,
        waitingCriticaloff: 1,
        machine: 1,
        line: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        blockedCriticaloff: 1,
        manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        critical_off: 1,
        cycle_count: 1,
        vender_name: 1,
        schedule_maintance: 1,
        schedule_maintance_count: 1,
        cip: 1,
        cip_count: 1,
        fault_arr: 1,
        format: 1,
        product: 1,
        et: 1,
        npt: 1,
        machine_name: 1,
        idle_time: 1,
        idle_count: 1,
        operator_name: 1,
        date: 1,
        shift: 1,
        ready: 1,
        batch_name: 1,
        batch_size: 1,
        batch_start: 1,
        batch_end: 1,
        startup_reject: 1,
        working_time: 1,
        goodCount: 1,
        manual_casecount:1,
        case_count: 1,
        roll_changeover: 1,
        reject_count: 1,
        blocked: 1,
        blocked_count: 1,
        waiting: 1,
        waiting_count: 1,
        major_manual_stop: 1,
        major_manual_stop_count: 1,
        minor_manual_stop: 1,
        minor_manual_stop_count: 1,
        pdt: 1,
        fault_arr: 1,
        pdt_count: 1,
        break_pdt: 1,
        co_pdt: 1,
        break_pdt_count: 1,
        co_pdt_count: 1,
        updt: 1,
        updt_count: 1,
        changeover: 1,
        changeover_count: 1,
        production_time: 1,
        total_batch_duration: 1,
        major_fault: 1,
        major_fault_count: 1,
        minor_fault: 1,
        minor_fault_count: 1,
        changeover_wastage_time: 1,
        reject_time: 1,
        performance_time: 1,
        speed_loss: {
          $subtract: ["$performance_time", "$idle_time"],
        },
      },
    },
    {
      $project: {
        line_id: 1,
        rated_speed: 1,
        format: 1,
        product: 1,
        machine_name: 1,
        idle_time: 1,
        idle_count: 1,
        operator_name: 1,
        date: 1,
        shift: 1,
        plant_id: 1,
        location_id: 1,
        pack: 1,
        changeover_id: 1,
        waitingCriticaloff: 1,
        machine: 1,
        line: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        blockedCriticaloff: 1,
        manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        critical_off: 1,
        cycle_count: 1,
        vender_name: 1,
        schedule_maintance: 1,
        schedule_maintance_count: 1,
        cip: 1,
        cip_count: 1,
        fault_arr: 1,
        ready: 1,
        batch_name: 1,
        batch_size: 1,
        batch_start: 1,
        batch_end: 1,
        startup_reject: 1,
        working_time: 1,
        goodCount: 1,
        manual_casecount:1,
        case_count: 1,
        roll_changeover: 1,
        reject_count: 1,
        blocked: 1,
        blocked_count: 1,
        waiting: 1,
        waiting_count: 1,
        major_manual_stop: 1,
        major_manual_stop_count: 1,
        minor_manual_stop: 1,
        minor_manual_stop_count: 1,
        pdt: 1,
        pdt_count: 1,
        break_pdt: 1,
        co_pdt: 1,
        break_pdt_count: 1,
        co_pdt_count: 1,
        updt: 1,
        updt_count: 1,
        changeover: 1,
        changeover_count: 1,
        production_time: 1,
        total_batch_duration: 1,
        major_fault: 1,
        major_fault_count: 1,
        minor_fault: 1,
        minor_fault_count: 1,
        changeover_wastage_time: 1,
        reject_time: 1,
        performance_time: 1,
        speed_loss: 1,
        et: 1,
        npt: 1,
        net_operating_time: {
          $subtract: ["$production_time", {
            $sum: ["$idle_time", "$speed_loss"]
          }],
          //  $cond:[
          //   {
          //     $lte:["$performance_time", 0]
          //   },
          //   0,
          //   {
          //     $subtract: ["$production_time", {
          //       $sum:["$idle_time", "$speed_loss"]
          //     }],
          //   }
          // ] 
        },
      },
    },
    {
      $project: {
        line_id: 1,
        rated_speed: 1,
        format: 1,
        product: 1,
        machine_name: 1,
        idle_time: 1,
        idle_count: 1,
        ready: 1,
        operator_name: 1,
        date: 1,
        shift: 1,
        plant_id: 1,
        location_id: 1,
        pack: 1,
        changeover_id: 1,
        waitingCriticaloff: 1,
        machine: 1,
        line: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        blockedCriticaloff: 1,
        manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        critical_off: 1,
        cycle_count: 1,
        vender_name: 1,
        schedule_maintance: 1,
        schedule_maintance_count: 1,
        cip: 1,
        cip_count: 1,
        fault_arr: 1,
        batch_name: 1,
        batch_size: 1,
        case_count: 1,
        roll_changeover: 1,
        batch_start: 1,
        batch_end: 1,
        startup_reject: 1,
        working_time: 1,
        goodCount: 1,
        manual_casecount:1,
        reject_count: 1,
        blocked: 1,
        blocked_count: 1,
        waiting: 1,
        waiting_count: 1,
        major_manual_stop: 1,
        major_manual_stop_count: 1,
        minor_manual_stop: 1,
        minor_manual_stop_count: 1,
        pdt: 1,
        pdt_count: 1,
        break_pdt: 1,
        co_pdt: 1,
        break_pdt_count: 1,
        co_pdt_count: 1,
        updt: 1,
        updt_count: 1,
        changeover: 1,
        changeover_count: 1,
        production_time: 1,
        total_batch_duration: 1,
        major_fault: 1,
        major_fault_count: 1,
        minor_fault: 1,
        minor_fault_count: 1,
        changeover_wastage_time: 1,
        reject_time: 1,
        performance_time: 1,
        speed_loss: 1,
        net_operating_time: 1,
        et: 1,
        npt: 1,
        productive_time: {
          $subtract: [
            "$net_operating_time",
            "$reject_time",
            // {
            //   $sum: ["$reject_time", "$changeover_wastage_time"],
            // },
          ],
        },
      },
    },
    {
      $group: {
        _id: "$machine",
        goodCount: { $sum: "$goodCount" },
        manual_casecount:{ $sum: "$manual_casecount" },
        reject_count: { $sum: "$reject_count" },
        performance: { $sum: "$performance" },
        blocked: { $sum: "$blocked" },
        blocked_count: { $sum: "$blocked_count" },
        raw_good_count: { $sum: "$raw_good_count" },
        raw_cycle_count: { $sum: "$raw_cycle_count" },
        cycle_count: { $sum: "$cycle_count" },
        blockedCriticaloff: { $sum: "$blockedCriticaloff" },
        manual_stopCriticaloff: { $sum: "$manual_stopCriticaloff" },
        readyCriticaloff: { $sum: "$readyCriticaloff" },
        major_manual_stopCriticaloff: { $sum: "$major_manual_stopCriticaloff" },
        minor_manual_stopCriticaloff: { $sum: "$minor_manual_stopCriticaloff" },
        schedule_maintance: { $sum: "$schedule_maintance" },
        schedule_maintance_count: { $sum: "$schedule_maintance_count" },
        cip: { $sum: "$cip" },
        cip_count: { $sum: "$cip_count" },
        waitingCriticaloff: { $sum: "$waitingCriticaloff" },
        waiting: { $sum: "$waiting" },
        waiting_count: { $sum: "$waiting_count" },
        working_time: { $sum: "$working_time" },
        manual_stop: { $sum: "$manual_stop" },
        manual_stop_count: { $sum: "$manual_stop_count" },
        pdt: { $sum: "$pdt" },
        co_pdt: { $sum: "$co_pdt" },
        break_pdt: { $sum: "$break_pdt" },
        co_pdt_count: { $sum: "$co_pdt_count" },
        break_pdt_count: { $sum: "$break_pdt_count" },
        pdt_count: { $sum: "$pdt_count" },
        updt: { $sum: "$updt" },
        updt_count: { $sum: "$updt_count" },
        ready: { $sum: "$ready" },
        ready_count: { $sum: "$ready_count" },
        productive_time: { $sum: "$productive_time" },
        npt: { $sum: "$npt" },
        et: { $sum: "$et" },
        net_operating_time: { $sum: "$net_operating_time" },
        speed_loss: { $sum: "$speed_loss" },
        performance_time: { $sum: "$performance_time" },
        reject_time: { $sum: "$reject_time" },
        changeover_wastage_time: { $sum: "$changeover_wastage_time" },
        idle_time: { $sum: "$idle_time" },
        total_batch_duration: { $sum: "$total_batch_duration" },
        production_time: { $sum: "$production_time" },
        startup_reject: { $sum: "$startup_reject" },
        idle_count: { $sum: "$idle_count" },
        changeover: { $sum: "$changeover" },
        changeover_count: { $sum: "$changeover_count" },
        major_manual_stop: { $sum: "$major_manual_stop" },
        major_manual_stop_count: { $sum: "$major_manual_stop_count" },
        minor_manual_stop: { $sum: "$minor_manual_stop" },
        minor_manual_stop_count: { $sum: "$minor_manual_stop_count" },
        major_fault: { $sum: "$major_fault" },
        major_fault_count: { $sum: "$major_fault_count" },
        minor_fault: { $sum: "$minor_fault" },
        minor_fault_count: { $sum: "$minor_fault_count" },
        fault_arr: {
          $push: "$fault_arr",
        },
        batch_wise: {
          $push: "$$ROOT",
        },
      },
    },
    {
      $unwind: {
        path: "$fault_arr",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$fault_arr",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "statusnames",
        let: { stop_name: "$fault_arr.fault_name", machine_name: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ["$machine_name", "$$machine_name"],
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
      $unwind: {
        path: "$status_name",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        goodCount: 1,
        manual_casecount:1,
        reject_count: 1,
        performance: 1,
        blocked: 1,
        rated_speed: 1,
        blocked_count: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        cycle_count: 1,
        blockedCriticaloff: 1,
        manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        schedule_maintance: 1,
        schedule_maintance_count: 1,
        cip: 1,
        cip_count: 1,
        waitingCriticaloff: 1,
        waiting: 1,
        waiting_count: 1,
        working_time: 1,
        manual_stop: 1,
        manual_stop_count: 1,
        pdt: 1,
        co_pdt: 1,
        break_pdt: 1,
        co_pdt_count: 1,
        break_pdt_count: 1,
        pdt_count: 1,
        updt: 1,
        updt_count: 1,
        ready: 1,
        ready_count: 1,
        productive_time: 1,
        net_operating_time: 1,
        speed_loss: 1,
        performance_time: 1,
        reject_time: 1,
        changeover_wastage_time: 1,
        idle_time: 1,
        total_batch_duration: 1,
        production_time: 1,

        startup_reject: 1,
        idle_count: 1,
        changeover: 1,
        changeover_count: 1,
        major_manual_stop: 1,
        major_manual_stop_count: 1,
        minor_manual_stop: 1,
        minor_manual_stop_count: 1,
        major_fault: 1,
        major_fault_count: 1,
        minor_fault: 1,
        minor_fault_count: 1,
        et: 1,
        npt: 1,
        fault_arr: {
          duration: "$fault_arr.duration",
          count: "$fault_arr.count",
          _id: "$fault_arr._id",
          fault_name: "$fault_arr.fault_name",
          display_name: "$status_name.fault_name",
        },
        batch_wise: 1,
      },
    },
    {
      $group: {
        _id: {
          machine_name: "$_id",
          fault_name: "$fault_arr.fault_name",
          display_name: "$fault_arr.display_name",
        },
        duration: { $sum: "$fault_arr.duration" },
        count: { $sum: "$fault_arr.count" },
        parent_arr: {
          $push: "$$ROOT",
        },
      },
    },
    {
      $group: {
        _id: "$_id.machine_name",
        fault_arr: {
          $push: {
            fault_name: "$_id.fault_name",
            duration: {
              $round: ["$duration", 2],
            },
            count: "$count",
            display_name: "$_id.display_name",
          },
        },
        parent_arr: { $addToSet: "$parent_arr" },
      },
    },
    {
      $project: {
        machine_name: "$_id",
        fault_arr: "$fault_arr",
        parent_arr: { $arrayElemAt: ["$parent_arr", 0] },
      },
    },
    {
      $project: {
        machine_name: "$_id",
        fault_arr: "$fault_arr",
        parent_arr: { $arrayElemAt: ["$parent_arr", 0] },
      },
    },
    {
      $unwind: {
        path: "$parent_arr",
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);
  // res.send(data)
  // console.log(data)
  var send_data = {};
  var send_counter = 0;
  // major_manual_stopCriticaloff: 1,
  // minor_manual_stopCriticaloff: 1,
  //send_data["fault_arr"] = {};
  send_data["major_manual_stopCriticaloff"] = {};
  send_data["minor_manual_stopCriticaloff"] = {};
  send_data["schedule_maintance_count"] = {};
  send_data["schedule_maintance"] = {};
  send_data["cip_count"] = {};
  send_data["cip"] = {};
  send_data["blockedCriticaloff"] = {};
  send_data["manual_stopCriticaloff"] = {};
  send_data["waitingCriticaloff"] = {};
  send_data["readyCriticaloff"] = {};
  send_data["critical_off"] = {};
  send_data["minor_manual_stop"] = {};
  send_data["minor_manual_stop_count"] = {};
  send_data["cycle_count"] = {};
  send_data["changeover_id"] = {};
  send_data["vender_name"] = {};
  send_data["good_count"] = {};
  send_data["manual_casecount"] = {};
  send_data["cycle_count"] = {};
  send_data["reject_count"] = {};
  send_data["fault"] = {};
  send_data["date"] = {};
  send_data["operator"] = {};
  send_data["shift"] = {};
  send_data["actual_production_time"] = {};
  send_data["batch"] = {};
  send_data["batch_size"] = {};
  send_data["batch_good"] = {};
  send_data["batch_case_count"] = {};
  send_data["batch_roll_changeover"] = {};
  send_data["waiting"] = {};
  send_data["blocked"] = {};
  send_data["changeover"] = {};
  send_data["changeover_wastage"] = {};
  send_data["pdt"] = {};
  send_data["co_pdt"] = {};
  send_data["break_pdt"] = {};
  send_data["ready"] = {};
  send_data["updt"] = {};
  send_data["manual_stop"] = {};
  send_data["oee"] = {};
  send_data["performance"] = {};
  send_data["quality"] = {};
  send_data["aviability"] = {};
  send_data["mttr"] = {};
  send_data["mtbf"] = {};
  send_data["count"] = {};
  send_data["speed_loss"] = {};
  send_data["idle"] = {};
  send_data["executing"] = {};
  send_data["total_idle"] = {};
  send_data["totalTheoreticalTime"] = {};
  send_data["totalPlanProdTime"] = {};
  send_data["netOperatingTime"] = {};
  send_data["grossOperatingTime"] = {};
  send_data["inProcessRejectTime"] = {};
  send_data["changeOverWastageTime"] = {};
  send_data["productiveTime"] = {};
  send_data["batch_details"] = {};
  send_data["fault_details"] = {};
  send_data["avg_speed"] = {};
  send_data["buffer"] = {};
  send_data["line_data"] = {};
  send_data["minor_fault"] = {};
  send_data["npt"] = {};
  send_data["et"] = {};
  send_data["me"] = {};
  send_data["sle"] = {};
  //send_data["batch_wise_data"] = data;
  //  var batch_duration = moment.duration(moment(batch_end).diff(moment(batch_data.start_time)));
  //  var changeover_format = moment.duration(moment(changeover.end_time).diff(moment(changeover.start_time)));
  machine_wise_obj = {};
  if (data.length > 0) {
    data.forEach(async (machine, i) => {
      machine_wise_obj[machine._id] = machine;
      //console.log(machine_wise_obj[machine._id], machine,"........................")
      if (i + 1 == data.length) {
        data.forEach(async (element, j) => {
          var sort_arr = element.fault_arr.sort((a, b) => {
            return b.duration - a.duration;
          });
          var batch_format = "";
          var batch_good = "";
          var batch_size = "";
          var batch_wise_arr = element.parent_arr.batch_wise.sort((a, b) => {
            return b.batch_end - a.batch_start;
          });
          //send_data["batch_wise_data"] = batch_wise_arr;
          var operator = "";
          var batch_counter = 1;
          var batch_details =
            "<strong>S.N </strong> | <strong>Batch </strong>| <strong> From-To </strong> | <strong> Batch Duration </strong> | <strong> Product Name </strong> | Batch Good Count | Batch Reject Count ;";
          batch_wise_arr.forEach((data, i) => {
            //res.send(data)
            var batch_duration = moment.duration(
              moment(data.batch_end).diff(moment(data.batch_start))
            );
            batch_details += `${i + 1}|  ${data.batch_name} | ${moment(
              data.batch_start
            ).format("DD-MM-YY - HH:mm:ss")} To ${moment(data.batch_end).format(
              "DD-MM-YY - HH:mm:ss"
            )} | ${checkNumber(
              Math.floor(batch_duration.asHours())
            )}:${checkNumber(
              Math.floor(batch_duration.asMinutes() % 60)
            )}:00 | ${data.product} | ${data.goodCount} | ${data.reject_count
              };`;
            // send_data[`batch_${batch_counter}`][element._id] = `${data.batch
            //   } ${moment(data.batch_start).format("DD-MM-YY - HH:mm:ss")} To ${moment(
            //     data.batch_end
            //   ).format("DD-MM-YY - HH:mm:ss")} | ${Math.floor(
            //     batch_duration.asHours()
            //   )} Hours ${Math.floor(batch_duration.asMinutes() % 60)} Minutes`;
            batch_format += `${data.batch_name} | ${data.format} | ${data.product};  `;
            batch_good += `${data.batch_name} | ${data.goodCount} | ${data.reject_count}; | ${data.case_count}; `;
            operator = data.operator_name;
            vender_name = data.vender_name;
            changeover_id = data.changeover_id;
            critical_off = data.critical_off;
            batch_counter++;
          });
          send_data["batch_details"][element._id] = batch_details;
          console.log(element.parent_arr)
          var cal = Shiftcalculation(
            element.parent_arr.total_batch_duration,
            element.parent_arr.working_time,
            element.parent_arr.production_time,
            element.parent_arr.performance_time,
            element.parent_arr.net_operating_time,
            element.parent_arr.idle_time,
            element.parent_arr.reject_time,
            element.parent_arr.changeover_wastage_time,
            element.parent_arr.productive_time,
            element.parent_arr.npt,
            element.parent_arr.et,
            element.parent_arr.cip,
            element.parent_arr.changeover
          );
          var executing =
            element.parent_arr.total_batch_duration -
            (element.parent_arr.pdt +
              element.parent_arr.changeover +
              element.parent_arr.updt +
              element.parent_arr.major_fault +
              element.parent_arr.minor_fault +
              element.parent_arr.major_manual_stop +
              element.parent_arr.minor_manual_stop +
              element.parent_arr.blocked +
              element.parent_arr.waiting +
              element.parent_arr.ready +
              element.parent_arr.schedule_maintance +
              element.parent_arr.cip);
          var avg_speed = element.parent_arr.goodCount / executing;
          send_data["executing"][element._id] =
            executing < 70 ? 0 : convertHHMM(executing);
          send_data["avg_speed"][element._id] =
            executing < 70 ? 0 : Math.round(avg_speed * 60);
          send_data["date"][element._id] = date;
          send_data["shift"][
            element._id
          ] = `${shift} / ${batch_wise_arr.length}`;
          send_data["operator"][element._id] = operator;
          send_data["batch_good"][element._id] = batch_good;
          send_data["changeover_id"][element._id] = changeover_id;
          send_data["vender_name"][element._id] = vender_name;
          if (element.parent_arr.hasOwnProperty("manual_casecount")) {
            send_data["manual_casecount"][element._id] = element.parent_arr.manual_casecount;
          }       
          send_data["good_count"][element._id] = `${
            (element.parent_arr.manual_casecount 
              ? element.parent_arr.manual_casecount 
              : 0) + element.parent_arr.raw_good_count
          } / ${element.parent_arr.raw_cycle_count}`;
          
        
          send_data["buffer"][element._id] = element.parent_arr.reject_count;
          send_data["cycle_count"][element._id] =
            element.parent_arr.raw_cycle_count;
          send_data["minor_manual_stopCriticaloff"][element._id] = convertHHMM(
            element.parent_arr.minor_manual_stopCriticaloff
          );
          send_data["major_manual_stopCriticaloff"][element._id] = convertHHMM(
            element.parent_arr.major_manual_stopCriticaloff
          );
          send_data["reject_count"][element._id] =
            element.parent_arr.reject_count;
          send_data["minor_manual_stop"][element._id] =
            element.parent_arr.minor_manual_stop_count +
            "|" +
            convertHHMM(element.parent_arr.minor_manual_stop) +
            "| -";
          send_data["minor_fault"][element._id] =
            element.parent_arr.minor_fault_count +
            "|" +
            convertHHMM(element.parent_arr.minor_fault) +
            "| -";
          send_data["waitingCriticaloff"][element._id] = convertHHMM(
            element.parent_arr.waitingCriticaloff
          );
          send_data["schedule_maintance"][element._id] =
            element.parent_arr.schedule_maintance_count +
            "|" +
            convertHHMM(element.parent_arr.schedule_maintance) +
            "| -";
          send_data["cip"][element._id] =
            element.parent_arr.cip_count +
            "|" +
            convertHHMM(element.parent_arr.cip) +
            "| -";
          send_data["blockedCriticaloff"][element._id] = convertHHMM(
            element.parent_arr.blockedCriticaloff
          );
          send_data["manual_stopCriticaloff"][element._id] = convertHHMM(
            element.parent_arr.manual_stopCriticaloff
          );
          send_data["readyCriticaloff"][element._id] = convertHHMM(
            element.parent_arr.readyCriticaloff
          );
          send_data["critical_off"][element._id] = critical_off;
          send_data["batch"][element._id] = batch_format;
          send_data["actual_production_time"][element._id] =
            cal.production_time;
          send_data["changeover_wastage"][element._id] = element.startup_reject;
          send_data["batch_size"][element._id] = batch_size;
          send_data["waiting"][element._id] = `${element.parent_arr.waiting_count
            } | ${convertHHMM(element.parent_arr.waiting)} | -;`;
          send_data["count"][
            element._id
          ] = `${element.parent_arr.goodCount} / ${element.parent_arr.reject_count} / ${element.parent_arr.raw_cycle_count}`;
          send_data["blocked"][element._id] = `${element.parent_arr.blocked_count
            } | ${convertHHMM(element.parent_arr.blocked)} | -;`;
          send_data["ready"][element._id] = `${convertHHMM(
            element.parent_arr.ready
          )}`;
          send_data["changeover"][element._id] = `${element.parent_arr.changeover_count
            } | ${convertHHMM(element.parent_arr.changeover)} | -;`;
          send_data["manual_stop"][element._id] = `${element.parent_arr.major_manual_stop_count
            } | ${convertHHMM(element.parent_arr.major_manual_stop)} | -;`;
          send_data["pdt"][element._id] = `${element.parent_arr.pdt_count
            } | ${convertHHMM(element.parent_arr.pdt)} | - ;`;
          send_data["co_pdt"][element._id] = `${element.parent_arr.co_pdt_count
            } | ${convertHHMM(element.parent_arr.co_pdt)} | - ;`;
          send_data["break_pdt"][element._id] = `${element.parent_arr.break_pdt_count
            } | ${convertHHMM(element.parent_arr.break_pdt)} | - ;`;
          send_data["updt"][element._id] = `${element.parent_arr.updt_count
            } | ${convertHHMM(element.parent_arr.updt)} | -;`;
          var mtbf =
            element.parent_arr.major_fault_count +
              element.parent_arr.minor_fault_count ==
              0
              ? convertHHMM(
                element.parent_arr.working_time -
                element.parent_arr.changeover_wastage_time -
                element.parent_arr.minor_fault -
                element.parent_arr.major_fault
              )
              : convertHHMM(
                MttrValidation(
                  Math.round(
                    (element.parent_arr.working_time -
                      element.parent_arr.changeover_wastage_time -
                      element.parent_arr.minor_fault -
                      element.parent_arr.major_fault) /
                    (element.parent_arr.major_fault_count +
                      element.parent_arr.minor_fault_count)
                  )
                )
              );
          var mttr = convertHHMM(
            MttrValidation(
              Math.round(
                (element.parent_arr.major_fault +
                  element.parent_arr.minor_fault) /
                (element.parent_arr.major_fault_count +
                  element.parent_arr.minor_fault_count)
              )
            )
          );
          var compare_obj = {
            oee: Number((cal.oee * 100).toFixed(2)),
            performance: Number((cal.performance * 100).toFixed(2)),
            aviability: Number((cal.aviability * 100).toFixed(2)),
            quality: Number((cal.quality * 100).toFixed(2)),
            sle:cal.sle,
            me:cal.me,
            goodCount: element.goodCount,
            manual_casecount: element.manual_casecount,
            reject_count: element.reject_count,
            major_fault_count: element.major_stop_count,
            changeover_wastage: element.startup_reject,
            major_fault_count: element.parent_arr.major_fault_count,
            totalTheoreticalTime: cal.total_time,
            minspeed: 0,
            //average_speed:avg_speed,
            //current_speed:machine_temp.bpm * batch_data.product_name.bottles_per_case,
          };
          send_data["mttr"][element._id] = mttr;
          send_data["mtbf"][element._id] = mtbf;
          send_data["sle"][element._id] = cal.sle;
          send_data["me"][element._id] = cal.me;
          send_data["speed_loss"][element._id] = cal.speed_loss;
          send_data["total_idle"][element._id] =
            element.parent_arr.idle_count + " | " + cal.idle_time + ";";
          send_data["totalTheoreticalTime"][element._id] = cal.total_time;
          send_data["totalPlanProdTime"][element._id] = cal.ppt_time;
          send_data["netOperatingTime"][element._id] = cal.net_operating_time;
          send_data["grossOperatingTime"][element._id] = cal.got_time;
          send_data["inProcessRejectTime"][element._id] = cal.reject_time;
          send_data["changeOverWastageTime"][element._id] =
            cal.changeover_wastage_time;
          send_data["productiveTime"][element._id] = cal.productive_time;
          send_data["npt"][element._id] = cal.npt;
          send_data["et"][element._id] = cal.et;
          var count = 1;
          send_data["fault_details"][
            element._id
          ] = `<strong>Fault Name </strong> | <strong> Fault Duration </strong>;`;
          sort_arr.forEach((fault) => {
            if (fault.fault_name) {
              send_data["fault_details"][element._id] += `${fault.display_name
                } | ${convertHHMM(fault.duration)};`;
              send_data[`fault_${count}`] = send_data[`fault_${count}`] || {};
              // send_data[`fault_${count}`][element._id] = `${fault.display_name
              //   }  ${fault.count} / ${convertHHMM(fault.duration)}`;
              count++;
            }
          });
          getColour(
            compare_obj,
            "major_fault_count",
            `${element.parent_arr.major_fault_count} | ${convertHHMM(
              element.parent_arr.major_fault
            )} | - ;`,
            "",
            (fault) => {
              send_data["fault"][element._id] = fault;
              getColour(
                compare_obj,
                "quality",
                (cal.quality * 100).toFixed(2),
                "",
                (quality) => {
                  send_data["quality"][element._id] = quality;
                  getColour(
                    compare_obj,
                    "oee",
                    (cal.oee * 100).toFixed(2),
                    "",
                    (oee) => {
                      send_data["oee"][element._id] = oee;
                      getColour(
                        compare_obj,
                        "aviability",
                        (cal.aviability * 100).toFixed(2),
                        "",
                        (aviability) => {
                          send_data["aviability"][element._id] = aviability;
                          getColour(
                            compare_obj,
                            "performance",
                            (cal.performance * 100).toFixed(2),
                            "",
                            (performance) => {
                              send_data["performance"][element._id] =
                                performance;
                              send_counter++;
                              if (send_counter == data.length) {
                                res.send(send_data);
                              }
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        });
      }
    });
  } else {
    res.send({});
  }
});

//chart wise report

router.get("/chart", async (req, res) => {
  var line_id = req.query.line_id;
  var shift = req.query.shift;
  var startDate = req.query.startDate;
  var endDate = req.query.endDate;
  var isLiveDate = false;
  var current_date = moment().local().format("YYYY-MM-DD");
  if (
    (moment(current_date).isAfter(startDate) ||
      moment(current_date).isSame(startDate)) &&
    (moment(current_date).isBefore(endDate) ||
      moment(current_date).isSame(endDate))
  ) {
    isLiveDate = true;
  }
  if (
    isLiveDate &&
    moment(current_date).isSame(startDate) &&
    moment(current_date).isSame(endDate)
  ) {
    getLiveChartData(line_id, (ch_data) => {
      res.send(ch_data);
    });
    return;
  }
  var line_match;
  if (line_id) {
    line_match = {
      $match: {
        line_id:  new mongoose.Types.ObjectId(line_id),
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
        //line_id:  new mongoose.Types.ObjectId(line_id),
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
  var data = await Project.aggregate([
    line_match,
    { $unwind: "$shift_wise" },
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
      $lookup: {
        from: "changeovers",
        localField: "shift_wise.batch_wise.changeover",
        foreignField: "_id",
        as: "batch_changeover",
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
        path: "$batch_changeover",
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
        from: "lines",
        localField: "line_id",
        foreignField: "_id",
        as: "line",
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
        path: "$line",
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
        from: "vendortriggers",
        localField: "shift_wise.batch_wise.vendor_wise.vendor",
        foreignField: "_id",
        as: "vendertrigger",
      },
    },
    {
      $unwind: {
        path: "$vendertrigger",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "vendors",
        localField: "vendertrigger.vendor",
        foreignField: "_id",
        as: "vender",
      },
    },
    {
      $unwind: {
        path: "$vender",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$shift_wise.batch_wise.vendor_wise.machine_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "equipment",
        let: {
          line_id: "$line_id",
          equipment_name:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
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
      $lookup: {
        from: "plants",
        localField: "line.plant_id",
        foreignField: "_id",
        as: "plant",
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
      $lookup: {
        from: "types",
        localField: "batch.end_case",
        foreignField: "_id",
        as: "cause",
      },
    },
    {
      $unwind: {
        path: "$machine",
        preserveNullAndEmptyArrays: true,
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
        path: "$cause",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$plant",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "locations",
        localField: "plant.location_id",
        foreignField: "_id",
        as: "location",
      },
    },
    {
      $unwind: {
        path: "$location",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        line_id: "$line.line_name",
        plant_id: "$plant.plant_name",
        location_id: "$location.location_name",
        shift: "$shift_wise.shift_name",
        machine_name: "$machine.display_name",
        machine: "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
        line: "$line_id",
        goodCount: {
          $cond: [
            {
              $eq: ["$machine.product", "case"],
            },
            {
              $multiply: [
                "$fgex.bottles_per_case",
                "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
              ],
            },
            "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
          ],
        },
        manual_casecount:  "$shift_wise.batch_wise.vendor_wise.machine_wise.manual_casecount",
        raw_good_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
          manual_casecount: "$shift_wise.batch_wise.vendor_wise.machine_wise.manual_casecount", 

        raw_cycle_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
        cycle_count: {
          $cond: [
            {
              $eq: ["$machine.product", "case"],
            },
            {
              $multiply: [
                "$fgex.bottles_per_case",
                "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
              ],
            },
            "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
          ],
        },
        reject_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.reject_count",
        startup_reject:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.startup_reject",
        waitingCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.waitingCriticaloff",
        blockedCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.blockedCriticaloff",
        major_manual_stopCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.major_manual_stopCriticaloff",
        minor_manual_stopCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.minor_manual_stopCriticaloff",
        readyCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.readyCriticaloff",
        critical_off:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.critical_off",
        standard_duration: {
          $multiply: ["$changeover_type.standard_duration", 60],
        },
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
        fault: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "fault"] },
          },
        },
        date: "$date",
        month_name: { $month: "$date" },
        year: { $year: "$date" },
        changeover: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "changeover"] },
          },
        },
        changeover_id: {
          $dateToString: {
            format: "%Y%m%d%H%M",
            date: "$batch_changeover.changeover_start_date",
            timezone: "+05:30",
          },
        },
        blocked: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "blocked"] },
          },
        },
        pdt: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "pdt"] },
          },
        },
        cip: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "cip"] },
          },
        },
        manual_stop: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "manual_stop"] },
          },
        },
        updt: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "updt"] },
          },
        },
        waiting: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "waiting"] },
          },
        },
        ready: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "ready"] },
          },
        },
        schedule_maintance: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "schedule_maintance"] },
          },
        },
        operator_name: {
          $ifNull: ["$operator_name.display_name", "Operator Not Defined"],
        },
        batch_start: "$shift_wise.batch_wise.vendor_wise.start_timestamp",
        batch_end: "$shift_wise.batch_wise.vendor_wise.end_timestamp",
        rated_speed: {
          $ifNull: ["$fgex.rated_speed", 60],
        },
        peak_speed: "$shift_wise.batch_wise.vendor_wise.machine_wise.max_bpm",
        format: "$fgex.sku_number",
        layout: "$fgex.layout_no",
        product: "$fgex.sku_description",
        pack: "$fgex.pack",
        recipe_code: "$fgex.recipe_code",
        recipe_description: "$fgex.recipe_description",
        preform_code: "$fgex.preform_code",
        bpc: "$fgex.bottles_per_case",
        batch_name:{
          $ifNull:[
            "$batch.manual_batch_name"
            ,
            "$batch.batch"
          ]
        },
		system_batch_name: "$batch.batch",
        bottles_per_case: "$fgex.bottles_per_case",
        vender_name: "$vendertrigger.vendor_name",
        vendor_start_timestamp: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S",
            date: "$vendertrigger.start_time",
            timezone: "+05:30",
          },
        },
        vendor_end_timestamp: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S",
            date: "$vendertrigger.end_time",
            timezone: "+05:30",
          },
        },
        batch_size: "$batch.batch_size",
        changeover_type: "$changeover_type.changeover_name",
        cause: {
          $ifNull: ["$cause.display_name", "-"],
        },
        remark: { $ifNull: ["$batch.remark", "-"] },
        batch_end_type: "$batch.batch_end_type",
        setup: {
          $subtract: [
            {
              $ifNull: ["$shift_wise.batch_wise.machine_wise.setup_time", 0],
            },
            {
              $ifNull: [
                "$shift_wise.batch_wise.machine_wise.set_up_power_off",
                0,
              ],
            },
          ],
        },
      },
    },
    {
      $match: {
        batch_end: { $ne: null },
      },
    },
    {
      $unwind: {
        path: "$schedule_maintance",
        preserveNullAndEmptyArrays: true,
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
        path: "$cip",
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
        path: "$ready",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        month: {
          $let: {
            vars: {
              monthsInString: [
                ,
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ],
            },
            in: {
              $arrayElemAt: ["$$monthsInString", "$month_name"],
            },
          },
        },
      },
    },
    {
      $project: {
        line_id: 1,
        plant_id: 1,
        location_id: 1,
        pack: 1,
        changeover_id: 1,
        vender_name: 1,
        plant_id: 1,
        rated_speed: 1,
        isCurrent: 1,
        recipe_code: 1,
        recipe_description: 1,
        preform_code: 1,
        schedule_maintance: 1,
        machine_name: 1,
        goodCount: 1,
        manual_casecount:1,
        peak_speed: 1,
        reject_count: 1,
        operator_name: 1,
        standard_duration: 1,
        waitingCriticaloff: 1,
        blockedCriticaloff: 1,
        manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        critical_off: 1,
        vendor_start_timestamp: 1,
        vendor_end_timestamp: 1,
        cycle_count: 1,
        machine: 1,
        line: 1,
        bpc: 1,
        bottles_per_case: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        changeover_split: {
          $ifNull:[
            {
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
            1

          ]
        },
        date: 1,
        case_count: 1,
        roll_changeover: 1,
        month: "$month",
        year: 1,
        shift: 1,
        fault: 1,
        ready: 1,
        blocked: 1,
        waiting: 1,
        updt: 1,
        cip: 1,
        pdt: 1,
        format: 1,
        layout: 1,
        product: 1,
        changeover: 1,
        manual_stop: 1,
        startup_reject: 1,
        mechanical_changeover: {
          $subtract: ["$changeover.duration", "$setup"],
        },
        setup_changeover: "$setup",
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
        batch_start: 1,
        batch_end: 1,
        batch_size: 1,
        batch_name: 1,
		system_batch_name:1,
        t200Use: 1,
        changeover_type: 1,
        cause: 1,
        remark: 1,
        batch_end_type: {
          $ifNull: ["$batch_end_type", "Running"],
        },
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
        plant_id: 1,
        location_id: 1,
        pack: 1,
        rated_speed: {
          $divide: ["$rated_speed", 60],
        },
        changeover_id: 1,
        format: 1,
        machine: 1,
        recipe_code: 1,
        recipe_description: 1,
        preform_code: 1,
        line: 1,
        vendor_start_timestamp: 1,
        vendor_end_timestamp: 1,
        bpc: 1,
        product: 1,
        recipe_code: 1,
        recipe_description: 1,
        preform_code: 1,
        machine_name: 1,
        goodCount: 1,
        manual_casecount:1,
        vender_name: 1,
        reject_count: 1,
        case_count: 1,
        roll_changeover: 1,
        batch_name: 1,
		system_batch_name:1,
        batch_size: 1,
        operator_name: 1,
        standard_duration: 1,
        total_batch_duration: 1,
        date: 1,
        waitingCriticaloff: 1,
        blockedCriticaloff: 1,
        readyCriticaloff: 1,
        critical_off: 1,
        cycle_count: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        month: { $concat: ["$month", "-", { $toString: "$year" }] },
        shift: 1,
        peak_speed: 1,
        layout: 1,
        batch_start: 1,
        batch_end: 1,
        startup_reject: 1,
        major_manual_stopCriticaloff: {
          $ifNull: ["$major_manual_stopCriticaloff", 0],
        },
        minor_manual_stopCriticaloff: {
          $ifNull: ["$minor_manual_stopCriticaloff", 0],
        },
        schedule_maintance: {
          $ifNull: ["$schedule_maintance.duration", 0],
        },
        schedule_maintance_count: {
          $ifNull: ["$schedule_maintance.count", 0],
        },
        blocked: {
          $ifNull: ["$blocked.duration", 0],
        },
        blocked_count: {
          $ifNull: ["$blocked.count", 0],
        },
        waiting: {
          $ifNull: ["$waiting.duration", 0],
        },
        waiting_count: {
          $ifNull: ["$waiting.count", 0],
        },
        break_pdt: {
          $ifNull: ["$pdt.duration", 0],
        },
        co_pdt: {
          $cond: [
            {
              $gte: ["$changeover_split", 1],
            },
            {
              $ifNull: ["$changeover.duration", 0],
            },
            {
              $multiply: [
                "$changeover_split",
                {
                  $ifNull: ["$changeover.duration", 0],
                },
              ],
            },
          ],
        },
        pdt: {
          $cond: [
            {
              $gte: ["$changeover_split", 1],
            },
            {
              $sum: [
                {
                  $ifNull: ["$changeover.duration", 0],
                },
                {
                  $ifNull: ["$pdt.duration", 0],
                },
              ],
            },
            {
              $sum: [
                {
                  $ifNull: ["$pdt.duration", 0],
                },
                {
                  $multiply: [
                    "$changeover_split",
                    {
                      $ifNull: ["$changeover.duration", 0],
                    },
                  ],
                },
              ],
            },
          ],
        },
        pdt_count: {
          $ifNull: ["$pdt.count", 0],
        },
        updt: {
          $ifNull: ["$updt.duration", 0],
        },
        cip: {
          $ifNull: ["$cip.duration", 0],
        },
        ready: {
          $ifNull: ["$ready.duration", 0],
        },
        ready_count: {
          $ifNull: ["$ready.count", 0],
        },
        updt_count: "$updt.count",
        cip_count: "$cip.count",
        changeover: {
          $cond: [
            {
              $gte: ["$changeover_split", 1],
            },
            0,
            {
              $subtract: [
                {
                  $ifNull: ["$changeover.duration", 0],
                },
                {
                  $multiply: [
                    "$changeover_split",
                    {
                      $ifNull: ["$changeover.duration", 0],
                    },
                  ],
                },
              ],
            },
          ],
        },
        changeover_count: {
          $ifNull: ["$changeover.count", 0],
        },
        major_fault: {
          $ifNull: ["$major_fault.duration", 0],
        },
        major_fault_count: {
          $ifNull: ["$major_fault.count", 0],
        },
        minor_fault: {
          $ifNull: ["$minor_fault.duration", 0],
        },
        minor_fault_count: {
          $ifNull: ["$minor_fault.count", 0],
        },
        major_manual_stop: {
          $ifNull: ["$major_manual_stop.duration", 0],
        },
        major_manual_stop_count: {
          $ifNull: ["$major_manual_stop.count", 0],
        },
        minor_manual_stop: {
          $ifNull: ["$minor_manual_stop.duration", 0],
        },
        minor_manual_stop_count: {
          $ifNull: ["$minor_manual_stop.count", 0],
        },
        t200Use: 1,
        changeover_type: 1,
        cause: 1,
        remark: 1,
        batch_end_type: 1,
        mechanical_changeover: {
          $cond: [
            {
              $lt: ["$mechanical_changeover", 0],
            },
            0,
            "$mechanical_changeover",
          ],
        },
        setup_changeover: 1,
      },
    },
    {
      $project: {
        line_id: 1,
        plant_id: 1,
        location_id: 1,
        pack: 1,
        rated_speed: 1,
        format: 1,
        product: 1,
        bpc: 1,
        recipe_code: 1,
        recipe_description: 1,
        preform_code: 1,
        recipe_code: 1,
        recipe_description: 1,
        preform_code: 1,
        changeover_id: 1,
        waitingCriticaloff: 1,
        machine: 1,
        vendor_start_timestamp: 1,
        vendor_end_timestamp: 1,
        line: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        blockedCriticaloff: {
          $ifNull: ["$blockedCriticaloff", 0],
        },
        manual_stopCriticaloff: {
          $ifNull: ["$manual_stopCriticaloff", 0],
        },
        readyCriticaloff: {
          $ifNull: ["$readyCriticaloff", 0],
        },
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        critical_off: 1,
        cycle_count: 1,
        vender_name: 1,
        schedule_maintance: {
          $ifNull: ["$schedule_maintance.duration", 0],
        },
        schedule_maintance_count: {
          $ifNull: ["$schedule_maintance.count", 0],
        },
        machine_name: 1,
        goodCount: 1,
        manual_casecount:1,
        reject_count: 1,
        case_count: 1,
        roll_changeover: 1,
        batch_name: 1,
		system_batch_name:1,
        batch_size: 1,
        operator_name: 1,
        date: 1,
        month: 1,
        shift: 1,
        peak_speed: 1,
        changeover_pdt: 1,
        layout: 1,
        batch_start: 1,
        batch_end: 1,
        startup_reject: 1,
        blocked: 1,
        blocked_count: 1,
        waiting: 1,
        waiting_count: 1,
        pdt: 1,
        pdt_count: 1,
        cip: 1,
        cip_count: 1,
        break_pdt: 1,
        co_pdt: 1,
        co_pdt_count: {
          $cond: [
            {
              $gt: ["$co_pdt", 0],
            },
            1,
            0,
          ],
        },
        group_id: {
          $concat: [
            "$location_id",
            "$plant_id",
            "$line_id",
            "$shift",
            { $toString: "$date" },
            "$vender_name",
            "$batch_name",
			"$system_batch_name"
          ],
        },
        break_pdt_count: "$pdt_count",
        updt: 1,
        ready: 1,
        ready_count: 1,
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
        total_batch_duration: 1,
        changeover_type: 1,
        cause: 1,
        remark: 1,
        batch_end_type: 1,
        mechanical_changeover: 1,
        setup_changeover: 1,
      },
    },
    {
      $group: {
        _id: "$group_id",
        raw: {
          $push: "$$ROOT",
        },
      },
    },
  ]);
  // res.send(data);
  var send_arr = [];
  data.forEach(async (element) => {
    var addLines = await addLine.findOne({ line_id: element.raw[0].line });
    var machine_wise_obj = {};
    var critical_stop_wise_obj = {};
    element.raw.forEach((machine, i) => {
      machine_wise_obj[machine.machine] = machine;
      var waiting_stop = 0;
      var blocked_stop = 0;
      var minor_manual_stop_crtical_stop = 0;
      var ready_stop = 0;
      var major_manual_stop_crtical_stop = 0;
      if (addLines.critical_machine != machine.machine) {
        waiting_stop += machine.waitingCriticaloff;
        blocked_stop += machine.blockedCriticaloff;
        minor_manual_stop_crtical_stop += machine.minor_manual_stopCriticaloff;
        major_manual_stop_crtical_stop += machine.major_manual_stopCriticaloff;
        ready_stop += machine.readyCriticaloff;
        critical_stop_wise_obj[`${machine.machine}_critical_off_waiting`] =
          machine.waitingCriticaloff;
        critical_stop_wise_obj[`${machine.machine}_critical_off_blocked`] =
          machine.blockedCriticaloff;
        critical_stop_wise_obj[`${machine.machine}_critical_off_ready`] =
          machine.readyCriticaloff;
        critical_stop_wise_obj[
          `${machine.machine}_critical_off_minor_manual_stop`
        ] = machine.minor_manual_stopCriticaloff;
        critical_stop_wise_obj[
          `${machine.machine}_critical_off_major_manual_stop`
        ] = machine.major_manual_stopCriticaloff;
      }
      if (i + 1 == element.raw.length) {
        var critical_machine_data = machine_wise_obj[addLines.critical_machine];
        var last_machine_data =
          machine_wise_obj[addLines.last_machine_count_machine];
          // console.log(last_machine_data)
          var manual_casecount = last_machine_data.manual_casecount;
          var last_machine_goodcount = last_machine_data.manual_casecount ?( last_machine_data.manual_casecount +last_machine_data.raw_good_count )
          : last_machine_data.raw_good_count;
        var reject_count =
          critical_machine_data.goodCount - last_machine_data
            ? last_machine_data.raw_cycle_count
            : 0;

            // console.log(manual_casecount,last_machine_goodcount)
        var send_obj = {};
        var batch_cal_data = calculation(
          critical_machine_data.goodCount,
          reject_count < 0 ? 0 : reject_count,
          critical_machine_data.total_batch_duration,
          critical_machine_data.break_pdt + critical_machine_data.co_pdt,
          critical_machine_data.changeover,
          critical_machine_data.updt,
          critical_machine_data.major_fault,
          critical_machine_data.major_fault_count,
          critical_machine_data.minor_fault,
          critical_machine_data.major_manual_stop,
          critical_machine_data.minor_manual_stop,
          critical_machine_data.blocked,
          critical_machine_data.waiting,
          critical_machine_data.rated_speed,
          critical_machine_data.startup_reject,
          critical_machine_data.ready,
          critical_machine_data.schedule_maintance,
          waiting_stop,
          blocked_stop,
          ready_stop,
          minor_manual_stop_crtical_stop,
          critical_machine_data.cip || 0
        );
        send_obj.line_buffer = 0;
        (send_obj.major_manual_stopCriticaloff =
          critical_machine_data.major_manual_stopCriticaloff),
          (send_obj.minor_manual_stopCriticaloff =
            critical_machine_data.major_manual_stopCriticaloff),
          (send_obj.changeover_count = critical_machine_data.changeover_count);
        send_obj.reject_count = reject_count < 0 ? 0 : reject_count; // critical_machine_data.reject_count
        send_obj.co_pdt_count = critical_machine_data.co_pdt_count;
        send_obj.break_pdt_count = critical_machine_data.pdt_count;
        (send_obj.vendor_start_timestamp =
          critical_machine_data.vendor_start_timestamp),
          (send_obj.vendor_end_timestamp =
            critical_machine_data.vendor_end_timestamp
              ? critical_machine_data.vendor_end_timestamp
              : null),
          (send_obj.pdt_count =
            critical_machine_data.pdt_count +
            critical_machine_data.co_pdt_count);
        send_obj.vender = critical_machine_data.vender_name;
        send_obj.plant_id = critical_machine_data.plant_id;
        send_obj.location_id = critical_machine_data.location_id;
        send_obj.date = critical_machine_data.date;
        send_obj.cycleCount = critical_machine_data.cycle_count;
        send_obj.shift = critical_machine_data.shift;
        send_obj.operator_name = critical_machine_data.operator_name;
        send_obj.peak_speed = critical_machine_data.peak_speed;
        send_obj.product = critical_machine_data.product;
        send_obj.system_batch_name = critical_machine_data.system_batch_name;
        send_obj.changeover_type = critical_machine_data.changeover_type;
        send_obj.setup_changeover = critical_machine_data.setup_changeover;
        send_obj.rated_speed = critical_machine_data.rated_speed;
        send_obj.bpc = critical_machine_data.bpc;
        send_obj.month = critical_machine_data.month;
        send_obj.oee = batch_cal_data.oee;
        send_obj.aviability = batch_cal_data.aviability;
        send_obj.quality = batch_cal_data.quality;
        send_obj.performance_time = batch_cal_data.performance_time;
        send_obj.fgex = critical_machine_data.format;
        send_obj.goodcount = critical_machine_data.goodCount;
        send_obj.last_machine_goodcount = last_machine_goodcount,
        send_obj.manual_casecount = manual_casecount,
        send_obj.last_machine_cycle_count = last_machine_data
          ? last_machine_data.raw_cycle_count
          : 0;
        send_obj.batch_name = critical_machine_data.batch_name;
        send_obj.changeover_id = critical_machine_data.changeover_id;
        var executing =
          critical_machine_data.total_batch_duration -
          (critical_machine_data.break_pdt +
            critical_machine_data.co_pdt +
            critical_machine_data.changeover +
            critical_machine_data.updt +
            critical_machine_data.cip +
            critical_machine_data.major_fault +
            critical_machine_data.minor_fault +
            critical_machine_data.major_manual_stop +
            critical_machine_data.minor_manual_stop +
            critical_machine_data.blocked +
            critical_machine_data.waiting +
            critical_machine_data.ready +
            critical_machine_data.schedule_maintance);
        send_obj.executing = executing < 70 ? 0 : executing;
        // var check_line_is_in_updt =
        //   critical_machine_data.goodCount < 500 && executing < 1200;
        var check_line_is_in_updt = false;
        send_obj.minor_fault_time = check_line_is_in_updt
          ? 0
          : critical_machine_data.minor_fault;
        send_obj.major_fault_time = check_line_is_in_updt
          ? 0
          : critical_machine_data.major_fault;
        send_obj.minor_fault_count = check_line_is_in_updt
          ? 0
          : critical_machine_data.minor_fault_count;
        send_obj.major_fault_count = check_line_is_in_updt
          ? 0
          : critical_machine_data.major_fault_count;
        send_obj.minor_manual_stop_time = check_line_is_in_updt
          ? 0
          : critical_machine_data.minor_manual_stop -
          minor_manual_stop_crtical_stop;
        send_obj.major_manual_stop_time = check_line_is_in_updt
          ? 0
          : critical_machine_data.major_manual_stop -
          major_manual_stop_crtical_stop;
        send_obj.minor_manual_stop_count = check_line_is_in_updt
          ? 0
          : critical_machine_data.minor_manual_stop_count;
        send_obj.major_manual_stop_count = check_line_is_in_updt
          ? 0
          : critical_machine_data.major_manual_stop_count;
        send_obj.changeover_time = check_line_is_in_updt
          ? 0
          : critical_machine_data.changeover;
        send_obj.break_pdt = check_line_is_in_updt
          ? 0
          : critical_machine_data.break_pdt;
        send_obj.co_pdt = check_line_is_in_updt
          ? 0
          : critical_machine_data.co_pdt;
        send_obj.blocked_time = check_line_is_in_updt
          ? 0
          : //: critical_machine_data.blocked - blocked_stop;
          critical_machine_data.blocked;
        send_obj.blocked_count = check_line_is_in_updt
          ? 0
          : critical_machine_data.blocked_count;

        send_obj.cip_time = check_line_is_in_updt
          ? 0
          : //: critical_machine_data.cip - cip_stop;
          critical_machine_data.cip;
        send_obj.cip_count = check_line_is_in_updt
          ? 0
          : critical_machine_data.cip_count;
        send_obj.waiting_time = check_line_is_in_updt
          ? 0
          : //: critical_machine_data.waiting - waiting_stop;
          critical_machine_data.waiting;
        send_obj.waiting_count = check_line_is_in_updt
          ? 0
          : critical_machine_data.waiting_count;
        send_obj.recipe_code = critical_machine_data.preform_code;
        send_obj.recipe_description = critical_machine_data.recipe_description;
        send_obj.preform_code = critical_machine_data.preform_code;
        send_obj.idle_time = check_line_is_in_updt
          ? 0
          : critical_machine_data.ready;
        //: critical_machine_data.ready - ready_stop;
        send_obj.idle_count = check_line_is_in_updt
          ? 0
          : critical_machine_data.ready_count;
        send_obj.sidel_waiting_count = critical_machine_data.waiting_count;
        send_obj.updt_count = critical_machine_data.updt_count;
        send_obj.theoretical_time = critical_machine_data.total_batch_duration;
        // send_obj.updt_time =
        //   critical_machine_data.goodCount < 500 && executing < 1200
        //     ? critical_machine_data.total_batch_duration - send_obj.break_pdt
        //     : critical_machine_data.updt;
        send_obj.updt_time = critical_machine_data.updt;
        send_obj.planed_production_time =
          critical_machine_data.goodCount < 500 && executing < 1200
            ? 0
            : batch_cal_data.working_time_sec;
        send_obj.gross_operating_time =
          critical_machine_data.goodCount < 500 && executing < 1200
            ? 0
            : batch_cal_data.production_time_sec;
        send_obj.performance_time =
          critical_machine_data.goodCount < 500 && executing < 1200
            ? 0
            : batch_cal_data.performance_time_sec;
        send_obj.reject_time = batch_cal_data.reject_time_sec;
        send_obj.total_idle_time = batch_cal_data.idle_time_sec;
        send_obj.total_idle_count =
          critical_machine_data.ready_count +
          critical_machine_data.minor_fault_count +
          critical_machine_data.major_manual_stop_count +
          critical_machine_data.blocked_count +
          critical_machine_data.waiting_count;
        send_obj.speed_loss = batch_cal_data.speed_loss_sec;
        send_obj.net_operating_time = batch_cal_data.net_operating_time_sec;
        send_obj.productive_time = batch_cal_data.productive_time_sec;
        send_arr.push({ ...send_obj, ...critical_stop_wise_obj });
        if (send_arr.length == data.length) {
          if (isLiveDate) {
            getLiveChartData(line_id, (ch_data) => {
              var local_obj = { ...ch_data[0] };
              delete local_obj.line_id;
              delete local_obj.line_id_name;
              send_arr.push(local_obj);
              res.send(send_arr);
            });
          } else {
            res.send(send_arr);
          }
        }
      }
    });
  });
});



router.get("/chart2", async (req, res) => {
  var line_id = req.query.line_id;
  var machine_arr = req.query.machine_arr
    ? req.query.machine_arr.split(";")
    : [];
  var shift = req.query.shift;
  var startDate = req.query.startDate;
  var endDate = req.query.endDate;
  var isLiveDate = false;
  var current_date = moment().local().format("YYYY-MM-DD");
  if (
    (moment(current_date).isAfter(startDate) ||
      moment(current_date).isSame(startDate)) &&
    (moment(current_date).isBefore(endDate) ||
      moment(current_date).isSame(endDate))
  ) {
    isLiveDate = true;
  }
  var line_match;
  if (line_id) {
    line_match = {
      $match: {
        line_id:  new mongoose.Types.ObjectId(line_id),
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
        //line_id:  new mongoose.Types.ObjectId(line_id),
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
  var data = await Project.aggregate([
    line_match,
    { $unwind: "$shift_wise" },
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
      $lookup: {
        from: "changeovers",
        localField: "shift_wise.batch_wise.changeover",
        foreignField: "_id",
        as: "batch_changeover",
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
        path: "$batch_changeover",
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
        from: "lines",
        localField: "line_id",
        foreignField: "_id",
        as: "line",
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
        path: "$line",
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
        from: "vendortriggers",
        localField: "shift_wise.batch_wise.vendor_wise.vendor",
        foreignField: "_id",
        as: "vendertrigger",
      },
    },
    {
      $unwind: {
        path: "$vendertrigger",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "vendors",
        localField: "vendertrigger.vendor",
        foreignField: "_id",
        as: "vender",
      },
    },
    {
      $unwind: {
        path: "$vender",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$shift_wise.batch_wise.vendor_wise.machine_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "equipment",
        let: {
          line_id: "$line_id",
          equipment_name:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
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
      $lookup: {
        from: "plants",
        localField: "line.plant_id",
        foreignField: "_id",
        as: "plant",
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
      $lookup: {
        from: "types",
        localField: "batch.end_case",
        foreignField: "_id",
        as: "cause",
      },
    },
    {
      $unwind: {
        path: "$machine",
        preserveNullAndEmptyArrays: true,
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
        path: "$cause",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$plant",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "locations",
        localField: "plant.location_id",
        foreignField: "_id",
        as: "location",
      },
    },
    {
      $unwind: {
        path: "$location",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        line_id: "$line.line_name",
        plant_id: "$plant.plant_name",
        location_id: "$location.location_name",
        shift: "$shift_wise.shift_name",
        machine_name: "$machine.display_name",
        machine: "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
        line: "$line_id",
        goodCount: {
          $cond: [
            {
              $eq: ["$machine.product", "case"],
            },
            {
              $multiply: [
                "$fgex.bottles_per_case",
                "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
              ],
            },
            "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
          ],
        },
        raw_good_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
        raw_cycle_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
        cycle_count: {
          $cond: [
            {
              $eq: ["$machine.product", "case"],
            },
            {
              $multiply: [
                "$fgex.bottles_per_case",
                "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
              ],
            },
            "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
          ],
        },
        reject_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.reject_count",
        startup_reject:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.startup_reject",
        waitingCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.waitingCriticaloff",
        blockedCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.blockedCriticaloff",
        major_manual_stopCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.major_manual_stopCriticaloff",
        minor_manual_stopCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.minor_manual_stopCriticaloff",
        readyCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.readyCriticaloff",
        critical_off:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.critical_off",
        standard_duration: {
          $multiply: ["$changeover_type.standard_duration", 60],
        },
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
        fault: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "fault"] },
          },
        },
        date: "$date",
        month_name: { $month: "$date" },
        year: { $year: "$date" },
        changeover: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "changeover"] },
          },
        },
        changeover_id: {
          $dateToString: {
            format: "%Y%m%d%H%M",
            date: "$batch_changeover.changeover_start_date",
            timezone: "+05:30",
          },
        },
        blocked: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "blocked"] },
          },
        },
        pdt: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "pdt"] },
          },
        },
        cip: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "cip"] },
          },
        },
        manual_stop: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "manual_stop"] },
          },
        },
        updt: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "updt"] },
          },
        },
        waiting: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "waiting"] },
          },
        },
        ready: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "ready"] },
          },
        },
        schedule_maintance: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "schedule_maintance"] },
          },
        },
        operator_name: {
          $ifNull: ["$operator_name.display_name", "Operator Not Defined"],
        },
        batch_start: "$shift_wise.batch_wise.vendor_wise.start_timestamp",
        batch_end: "$shift_wise.batch_wise.vendor_wise.end_timestamp",
        rated_speed: {
          $ifNull: ["$fgex.rated_speed", 60],
        },
        peak_speed: "$shift_wise.batch_wise.vendor_wise.machine_wise.max_bpm",
        format: "$fgex.sku_number",
        layout: "$fgex.layout_no",
        bottles_per_case: "$fgex.bottles_per_case",
        product: "$fgex.sku_description",
        pack: "$fgex.pack",
        recipe_code: "$fgex.recipe_code",
        recipe_description: "$fgex.recipe_description",
        preform_code: "$fgex.preform_code",
        bpc: "$fgex.bottles_per_case",
        batch_name:{
          $ifNull:[
            "$batch.manual_batch_name"
            ,
            "$batch.batch"
          ]
        },

        vender_name: "$vendertrigger.vendor_name",
        vendor_start_timestamp: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S",
            date: "$vendertrigger.start_time",
            timezone: "+05:30",
          },
        },
        vendor_end_timestamp: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S",
            date: "$vendertrigger.end_time",
            timezone: "+05:30",
          },
        },
        batch_size: "$batch.batch_size",
        changeover_type: "$changeover_type.changeover_name",
        cause: {
          $ifNull: ["$cause.display_name", "-"],
        },
        remark: { $ifNull: ["$batch.remark", "-"] },
        batch_end_type: "$batch.batch_end_type",
        setup: {
          $subtract: [
            {
              $ifNull: ["$shift_wise.batch_wise.machine_wise.setup_time", 0],
            },
            {
              $ifNull: [
                "$shift_wise.batch_wise.machine_wise.set_up_power_off",
                0,
              ],
            },
          ],
        },
      },
    },
    {
      $match: {
        batch_end: { $ne: null },
      },
    },
    {
      $unwind: {
        path: "$schedule_maintance",
        preserveNullAndEmptyArrays: true,
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
        path: "$cip",
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
        path: "$ready",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        month: {
          $let: {
            vars: {
              monthsInString: [
                ,
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ],
            },
            in: {
              $arrayElemAt: ["$$monthsInString", "$month_name"],
            },
          },
        },
      },
    },
    {
      $project: {
        line_id: 1,
        plant_id: 1,
        location_id: 1,
        pack: 1,
        changeover_id: 1,
        vender_name: 1,
        plant_id: 1,
        rated_speed: 1,
        isCurrent: 1,
        recipe_code: 1,
        recipe_description: 1,
        preform_code: 1,
        schedule_maintance: 1,
        machine_name: 1,
        goodCount: 1,
        peak_speed: 1,
        reject_count: 1,
        operator_name: 1,
        standard_duration: 1,
        waitingCriticaloff: 1,
        blockedCriticaloff: 1,
        manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        critical_off: 1,
        vendor_start_timestamp: 1,
        vendor_end_timestamp: 1,
        cycle_count: 1,
        machine: 1,
        line: 1,
        bpc: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
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
        date: 1,
        case_count: 1,
        roll_changeover: 1,
        month: "$month",
        year: 1,
        shift: 1,
        fault: 1,
        ready: 1,
        blocked: 1,
        waiting: 1,
        updt: 1,
        pdt: 1,
        cip: 1,
        format: 1,
        layout: 1,
        product: 1,
        changeover: 1,
        manual_stop: 1,
        startup_reject: 1,
        mechanical_changeover: {
          $subtract: ["$changeover.duration", "$setup"],
        },
        setup_changeover: "$setup",
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
        batch_start: 1,
        batch_end: 1,
        batch_size: 1,
        batch_name: 1,
        t200Use: 1,
        changeover_type: 1,
        cause: 1,
        remark: 1,
        batch_end_type: {
          $ifNull: ["$batch_end_type", "Running"],
        },
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
        plant_id: 1,
        location_id: 1,
        pack: 1,
        rated_speed: {
          $divide: ["$rated_speed", 60],
        },
        changeover_id: 1,
        format: 1,
        machine: 1,
        recipe_code: 1,
        recipe_description: 1,
        preform_code: 1,
        line: 1,
        vendor_start_timestamp: 1,
        vendor_end_timestamp: 1,
        bpc: 1,
        product: 1,
        preform_code: 1,
        machine_name: 1,
        goodCount: 1,
        vender_name: 1,
        reject_count: 1,
        case_count: 1,
        roll_changeover: 1,
        batch_name: 1,
        batch_size: 1,
        operator_name: 1,
        standard_duration: 1,
        total_batch_duration: 1,
        date: 1,
        waitingCriticaloff: 1,
        blockedCriticaloff: 1,
        readyCriticaloff: 1,
        critical_off: 1,
        cycle_count: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        month: { $concat: ["$month", "-", { $toString: "$year" }] },
        shift: 1,
        peak_speed: 1,
        layout: 1,
        batch_start: 1,
        batch_end: 1,
        startup_reject: 1,
        major_manual_stopCriticaloff: {
          $ifNull: ["$major_manual_stopCriticaloff", 0],
        },
        minor_manual_stopCriticaloff: {
          $ifNull: ["$minor_manual_stopCriticaloff", 0],
        },
        schedule_maintance: {
          $ifNull: ["$schedule_maintance.duration", 0],
        },
        schedule_maintance_count: {
          $ifNull: ["$schedule_maintance.count", 0],
        },
        blocked: {
          $ifNull: ["$blocked.duration", 0],
        },
        blocked_count: {
          $ifNull: ["$blocked.count", 0],
        },
        waiting: {
          $ifNull: ["$waiting.duration", 0],
        },
        waiting_count: {
          $ifNull: ["$waiting.count", 0],
        },
        cip: {
          $ifNull: ["$cip.duration", 0],
        },
        cip_count: {
          $ifNull: ["$cip.count", 0],
        },
        break_pdt: {
          $ifNull: ["$pdt.duration", 0],
        },
        co_pdt: {
          $cond: [
            {
              $gte: ["$changeover_split", 1],
            },
            {
              $ifNull: ["$changeover.duration", 0],
            },
            {
              $multiply: [
                "$changeover_split",
                {
                  $ifNull: ["$changeover.duration", 0],
                },
              ],
            },
          ],
        },
        pdt: {
          $cond: [
            {
              $gte: ["$changeover_split", 1],
            },
            {
              $sum: [
                {
                  $ifNull: ["$changeover.duration", 0],
                },
                {
                  $ifNull: ["$pdt.duration", 0],
                },
              ],
            },
            {
              $sum: [
                {
                  $ifNull: ["$pdt.duration", 0],
                },
                {
                  $multiply: [
                    "$changeover_split",
                    {
                      $ifNull: ["$changeover.duration", 0],
                    },
                  ],
                },
              ],
            },
          ],
        },
        pdt_count: {
          $ifNull: ["$pdt.count", 0],
        },
        updt: {
          $ifNull: ["$updt.duration", 0],
        },
        ready: {
          $ifNull: ["$ready.duration", 0],
        },
        ready_count: {
          $ifNull: ["$ready.count", 0],
        },
        updt_count: "$updt.count",
        changeover: {
          $cond: [
            {
              $gte: ["$changeover_split", 1],
            },
            0,
            {
              $subtract: [
                {
                  $ifNull: ["$changeover.duration", 0],
                },
                {
                  $multiply: [
                    "$changeover_split",
                    {
                      $ifNull: ["$changeover.duration", 0],
                    },
                  ],
                },
              ],
            },
          ],
        },
        changeover_count: {
          $ifNull: ["$changeover.count", 0],
        },
        major_fault: {
          $ifNull: ["$major_fault.duration", 0],
        },
        major_fault_count: {
          $ifNull: ["$major_fault.count", 0],
        },
        minor_fault: {
          $ifNull: ["$minor_fault.duration", 0],
        },
        minor_fault_count: {
          $ifNull: ["$minor_fault.count", 0],
        },
        major_manual_stop: {
          $ifNull: ["$major_manual_stop.duration", 0],
        },
        major_manual_stop_count: {
          $ifNull: ["$major_manual_stop.count", 0],
        },
        minor_manual_stop: {
          $ifNull: ["$minor_manual_stop.duration", 0],
        },
        minor_manual_stop_count: {
          $ifNull: ["$minor_manual_stop.count", 0],
        },
        t200Use: 1,
        changeover_type: 1,
        cause: 1,
        remark: 1,
        batch_end_type: 1,
        mechanical_changeover: {
          $cond: [
            {
              $lt: ["$mechanical_changeover", 0],
            },
            0,
            "$mechanical_changeover",
          ],
        },
        setup_changeover: 1,
      },
    },
    {
      $project: {
        line_id: 1,
        plant_id: 1,
        location_id: 1,
        pack: 1,
        rated_speed: 1,
        format: 1,
        product: 1,
        bpc: 1,
        recipe_code: 1,
        recipe_description: 1,
        preform_code: 1,
        preform_code: 1,
        changeover_id: 1,
        waitingCriticaloff: 1,
        machine: 1,
        vendor_start_timestamp: 1,
        vendor_end_timestamp: 1,
        line: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        blockedCriticaloff: {
          $ifNull: ["$blockedCriticaloff", 0],
        },
        manual_stopCriticaloff: {
          $ifNull: ["$manual_stopCriticaloff", 0],
        },
        readyCriticaloff: {
          $ifNull: ["$readyCriticaloff", 0],
        },
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        critical_off: 1,
        cycle_count: 1,
        vender_name: 1,
        schedule_maintance: {
          $ifNull: ["$schedule_maintance.duration", 0],
        },
        schedule_maintance_count: {
          $ifNull: ["$schedule_maintance.count", 0],
        },
        machine_name: 1,
        goodCount: 1,
        reject_count: 1,
        case_count: 1,
        roll_changeover: 1,
        batch_name: 1,
        batch_size: 1,
        operator_name: 1,
        date: 1,
        month: 1,
        shift: 1,
        peak_speed: 1,
        changeover_pdt: 1,
        layout: 1,
        batch_start: 1,
        batch_end: 1,
        startup_reject: 1,
        blocked: 1,
        blocked_count: 1,
        waiting: 1,
        waiting_count: 1,
        cip: 1,
        cip_count: 1,
        pdt: 1,
        pdt_count: 1,
        break_pdt: 1,
        co_pdt: 1,
        co_pdt_count: {
          $cond: [
            {
              $gt: ["$co_pdt", 0],
            },
            1,
            0,
          ],
        },
        group_id: {
          $concat: [
            "$location_id",
            "$plant_id",
            "$line_id",
            "$shift",
            { $toString: "$date" },
            "$vender_name",
            "$batch_name",
          ],
        },
        break_pdt_count: "$pdt_count",
        updt: 1,
        ready: 1,
        ready_count: 1,
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
        total_batch_duration: 1,
        changeover_type: 1,
        cause: 1,
        remark: 1,
        batch_end_type: 1,
        mechanical_changeover: 1,
        setup_changeover: 1,
      },
    },
    {
      $group: {
        _id: "$group_id",
        raw: {
          $push: "$$ROOT",
        },
      },
    },
  ]);
  // res.send(data);
  var send_arr = [];
  if (machine_arr.length == 0 || !machine_arr) {
    data.forEach(async (element) => {
      var addLines = await addLine.findOne({ line_id: element.raw[0].line });
      var machine_wise_obj = {};
      var critical_stop_wise_obj = {};
      element.raw.forEach((machine, i) => {
        machine_wise_obj[machine.machine] = machine;
        var waiting_stop = 0;
        var blocked_stop = 0;
        var minor_manual_stop_crtical_stop = 0;
        var ready_stop = 0;
        var major_manual_stop_crtical_stop = 0;
        if (addLines.critical_machine != machine.machine) {
          waiting_stop += machine.waitingCriticaloff;
          blocked_stop += machine.blockedCriticaloff;
          minor_manual_stop_crtical_stop +=
            machine.minor_manual_stopCriticaloff;
          major_manual_stop_crtical_stop +=
            machine.major_manual_stopCriticaloff;
          ready_stop += machine.readyCriticaloff;
          critical_stop_wise_obj[`${machine.machine}_critical_off_waiting`] =
            machine.waitingCriticaloff;
          critical_stop_wise_obj[`${machine.machine}_critical_off_blocked`] =
            machine.blockedCriticaloff;
          critical_stop_wise_obj[`${machine.machine}_critical_off_ready`] =
            machine.readyCriticaloff;
          critical_stop_wise_obj[
            `${machine.machine}_critical_off_minor_manual_stop`
          ] = machine.minor_manual_stopCriticaloff;
          critical_stop_wise_obj[
            `${machine.machine}_critical_off_major_manual_stop`
          ] = machine.major_manual_stopCriticaloff;
        }
        if (i + 1 == element.raw.length) {
          var critical_machine_data =
            machine_wise_obj[addLines.critical_machine];
          var last_machine_data =
            machine_wise_obj[addLines.last_machine_count_machine];
          var reject_count =
            critical_machine_data.goodCount - last_machine_data
              ? last_machine_data.raw_cycle_count
              : 0;

          var send_obj = {};
          var batch_cal_data = calculation(
            critical_machine_data.goodCount,
            reject_count < 0 ? 0 : reject_count,
            critical_machine_data.total_batch_duration,
            critical_machine_data.break_pdt + critical_machine_data.co_pdt,
            critical_machine_data.changeover,
            critical_machine_data.updt,
            critical_machine_data.major_fault,
            critical_machine_data.major_fault_count,
            critical_machine_data.minor_fault,
            critical_machine_data.major_manual_stop,
            critical_machine_data.minor_manual_stop,
            critical_machine_data.blocked,
            critical_machine_data.waiting,
            critical_machine_data.rated_speed,
            critical_machine_data.startup_reject,
            critical_machine_data.ready,
            critical_machine_data.schedule_maintance,
            waiting_stop,
            blocked_stop,
            ready_stop,
            minor_manual_stop_crtical_stop,
            critical_machine_data.cip
          );
          send_obj.line_buffer = 0;
          (send_obj.major_manual_stopCriticaloff =
            critical_machine_data.major_manual_stopCriticaloff),
            (send_obj.minor_manual_stopCriticaloff =
              critical_machine_data.major_manual_stopCriticaloff),
            (send_obj.changeover_count =
              critical_machine_data.changeover_count);
          send_obj.reject_count = reject_count < 0 ? 0 : reject_count; // critical_machine_data.reject_count
          send_obj.co_pdt_count = critical_machine_data.co_pdt_count;
          send_obj.break_pdt_count = critical_machine_data.pdt_count;
          (send_obj.vendor_start_timestamp =
            critical_machine_data.vendor_start_timestamp),
            (send_obj.vendor_end_timestamp =
              critical_machine_data.vendor_end_timestamp
                ? critical_machine_data.vendor_end_timestamp
                : null),
            (send_obj.pdt_count =
              critical_machine_data.pdt_count +
              critical_machine_data.co_pdt_count);
          send_obj.vender = critical_machine_data.vender_name;
          send_obj.plant_id = critical_machine_data.plant_id;
          send_obj.location_id = critical_machine_data.location_id;
          send_obj.date = critical_machine_data.date;

          send_obj.cycleCount = critical_machine_data.cycle_count;
          send_obj.shift = critical_machine_data.shift;
          send_obj.operator_name = critical_machine_data.operator_name;
          send_obj.peak_speed = critical_machine_data.peak_speed;
          send_obj.product = critical_machine_data.product;
          send_obj.batch_name = critical_machine_data.batch_name;
          send_obj.changeover_type = critical_machine_data.changeover_type;

          send_obj.setup_changeover = critical_machine_data.setup_changeover;
          send_obj.rated_speed = critical_machine_data.rated_speed;
          send_obj.bpc = critical_machine_data.bpc;
          send_obj.month = critical_machine_data.month;
          send_obj.oee = batch_cal_data.oee;
          send_obj.aviability = batch_cal_data.aviability;
          send_obj.quality = batch_cal_data.quality;
          send_obj.performance_time = batch_cal_data.performance_time;
          send_obj.fgex = critical_machine_data.format;
          send_obj.goodcount = critical_machine_data.goodCount;
          send_obj.last_machine_goodcount = last_machine_data
            ? last_machine_data.raw_good_count
            : 0;
          send_obj.last_machine_cycle_count = last_machine_data
            ? last_machine_data.raw_cycle_count
            : 0;

          send_obj.batch_name = critical_machine_data.batch_name;
          send_obj.changeover_id = critical_machine_data.changeover_id;
          var executing =
            critical_machine_data.total_batch_duration -
            (critical_machine_data.break_pdt +
              critical_machine_data.co_pdt +
              critical_machine_data.changeover +
              critical_machine_data.updt +
              critical_machine_data.cip +
              critical_machine_data.major_fault +
              critical_machine_data.minor_fault +
              critical_machine_data.major_manual_stop +
              critical_machine_data.minor_manual_stop +
              critical_machine_data.blocked +
              critical_machine_data.waiting +
              critical_machine_data.ready +
              critical_machine_data.schedule_maintance);
          send_obj.executing = executing < 70 ? 0 : executing;
          // var check_line_is_in_updt =
          //   critical_machine_data.goodCount < 500 && executing < 1200;
          var check_line_is_in_updt = false;
          send_obj.minor_fault_time = check_line_is_in_updt
            ? 0
            : critical_machine_data.minor_fault;
          send_obj.major_fault_time = check_line_is_in_updt
            ? 0
            : critical_machine_data.major_fault;
          send_obj.minor_fault_count = check_line_is_in_updt
            ? 0
            : critical_machine_data.minor_fault_count;
          send_obj.major_fault_count = check_line_is_in_updt
            ? 0
            : critical_machine_data.major_fault_count;
          send_obj.minor_manual_stop_time = check_line_is_in_updt
            ? 0
            : critical_machine_data.minor_manual_stop -
            minor_manual_stop_crtical_stop;
          send_obj.major_manual_stop_time = check_line_is_in_updt
            ? 0
            : critical_machine_data.major_manual_stop -
            major_manual_stop_crtical_stop;
          send_obj.minor_manual_stop_count = check_line_is_in_updt
            ? 0
            : critical_machine_data.minor_manual_stop_count;
          send_obj.major_manual_stop_count = check_line_is_in_updt
            ? 0
            : critical_machine_data.major_manual_stop_count;
          send_obj.changeover_time = check_line_is_in_updt
            ? 0
            : critical_machine_data.changeover;
          send_obj.break_pdt = check_line_is_in_updt
            ? 0
            : critical_machine_data.break_pdt;
          send_obj.co_pdt = check_line_is_in_updt
            ? 0
            : critical_machine_data.co_pdt;
          send_obj.blocked_time = check_line_is_in_updt
            ? 0
            : critical_machine_data.blocked;
          send_obj.blocked_count = check_line_is_in_updt
            ? 0
            : critical_machine_data.blocked_count;
          send_obj.cip_time = check_line_is_in_updt
            ? 0
            : critical_machine_data.cip;
          send_obj.cip_count = check_line_is_in_updt
            ? 0
            : critical_machine_data.cip_count;
          send_obj.waiting_time = check_line_is_in_updt
            ? 0
            : critical_machine_data.waiting;
          send_obj.waiting_count = check_line_is_in_updt
            ? 0
            : critical_machine_data.waiting_count;
          send_obj.recipe_code = critical_machine_data.preform_code;
          send_obj.recipe_description =
            critical_machine_data.recipe_description;

          send_obj.preform_code = critical_machine_data.preform_code;
          send_obj.idle_time = check_line_is_in_updt
            ? 0
            : critical_machine_data.ready;
          send_obj.idle_count = check_line_is_in_updt
            ? 0
            : critical_machine_data.ready_count;
          send_obj.sidel_waiting_count = critical_machine_data.waiting_count;

          send_obj.updt_count = critical_machine_data.updt_count;
          send_obj.theoretical_time =
            critical_machine_data.total_batch_duration;
          // send_obj.updt_time =
          //   critical_machine_data.goodCount < 500 && executing < 1200
          //     ? critical_machine_data.total_batch_duration - send_obj.break_pdt
          //     : critical_machine_data.updt;
          send_obj.updt_time = critical_machine_data.updt;
          send_obj.planed_production_time =
            critical_machine_data.goodCount < 500 && executing < 1200
              ? 0
              : batch_cal_data.working_time_sec;
          send_obj.gross_operating_time =
            critical_machine_data.goodCount < 500 && executing < 1200
              ? 0
              : batch_cal_data.production_time_sec;
          send_obj.performance_time =
            critical_machine_data.goodCount < 500 && executing < 1200
              ? 0
              : batch_cal_data.performance_time_sec;
          send_obj.reject_time = batch_cal_data.reject_time_sec;
          send_obj.total_idle_time = batch_cal_data.idle_time_sec;
          send_obj.total_idle_count =
            critical_machine_data.ready_count +
            critical_machine_data.minor_fault_count +
            critical_machine_data.major_manual_stop_count +
            critical_machine_data.blocked_count +
            critical_machine_data.waiting_count;
          send_obj.speed_loss = batch_cal_data.speed_loss_sec;
          send_obj.net_operating_time = batch_cal_data.net_operating_time_sec;
          send_obj.productive_time = batch_cal_data.productive_time_sec;
          send_arr.push({ ...send_obj, ...critical_stop_wise_obj });
          if (send_arr.length == data.length) {
            if (isLiveDate) {
              getLiveChartData(line_id, (ch_data) => {
                send_arr.push(ch_data[0]);
                res.send(send_arr);
              });
            } else {
              res.send(send_arr);
            }
          }
        }
      });
    });
  } else {
    var data_counter = 0;
    data.forEach(async (element, i) => {
      var machine_l = 0;
      data_counter ++;
      element.raw.forEach((machine) => {
        if (machine_arr.includes(machine.machine)) {
          var send_obj = {};
          var reject_count = machine.goodCount - machine.raw_cycle_count ?? 0;
          var batch_cal_data = calculation(
            machine.product == "case" ? machine.cycle_count : machine.goodCount,
            reject_count < 0 ? 0 : machine.reject_count,
            machine.total_batch_duration,
            machine.break_pdt + machine.co_pdt,
            machine.changeover,
            machine.updt,
            machine.major_fault,
            machine.major_fault_count,
            machine.minor_fault,
            machine.major_manual_stop,
            machine.minor_manual_stop,
            machine.blocked,
            machine.waiting,
            machine.rated_speed,
            machine.startup_reject,
            machine.ready,
            machine.schedule_maintance,
            0,
            0,
            0,
            0,
            machine.cip
          );
          send_obj.line_buffer = 0;
          send_obj.break_pdt = machine.break_pdt - machine.schedule_maintance;
          send_obj.schedule_maintenance = machine.schedule_maintance;
          send_obj.schedule_maintenance_count =
            machine.schedule_maintance_count;
          send_obj.changeover_count = machine.changeover_count;
          send_obj.changeover_time = machine.changeover;
          send_obj.reject_count = machine.reject_count;
          send_obj.co_pdt = machine.co_pdt;
          send_obj.co_pdt_count = machine.co_pdt_count;
          send_obj.break_pdt_count =
            machine.pdt_count - machine.schedule_maintance_count;
          send_obj.indgredent_weight = machine.indgredent_weight;
          send_obj.manual_weight = machine.manual_weight;
          send_obj.water_weight = machine.water_weight;
          send_obj.total_weight =
            machine.indgredent_weight +
            machine.water_weight +
            machine.manual_weight;
          (send_obj.vendor_start_timestamp = machine.vendor_start_timestamp),
            (send_obj.vendor_end_timestamp = machine.vendor_end_timestamp
              ? machine.vendor_end_timestamp
              : null),
            (send_obj.pdt_count = machine.pdt_count + machine.co_pdt_count);
          send_obj.vender = machine.vender_name;
          send_obj.line_type = machine.line_type;
          send_obj.plant_id = machine.plant_id;
          send_obj.location_id = machine.location_id;
          send_obj.date = machine.date;
          send_obj.preform_count = machine.cycle_count;
          send_obj.cap_count = machine.cap_count || 0;
          send_obj.shift = machine.shift;
          send_obj.bottles_per_case = machine.bottles_per_case;
          send_obj.net_weight = machine.net_weight;
          send_obj.operator_name = machine.operator_name;
          send_obj.machine_name = machine.machine;
          send_obj.peak_speed = machine.peak_speed;
          send_obj.batch_start_timestamp = machine.batch_start_timestamp;
          send_obj.batch_end_timestamp = machine.batch_end_timestamp;
          send_obj.product = machine.product;
          send_obj.batch_name = machine.batch_name;
          send_obj.changeover_type = machine.changeover_type;
          send_obj.setup_changeover = machine.setup_changeover;
          send_obj.setup_changeover = machine.setup_changeover;
          send_obj.rated_speed = machine.rated_speed;
          send_obj.bpc = machine.bpc;
          send_obj.month = machine.month;
          send_obj.oee = batch_cal_data.oee;
          send_obj.aviability = batch_cal_data.aviability;
          send_obj.quality = batch_cal_data.quality;
          send_obj.performance_time = batch_cal_data.performance_time;
          send_obj.fgex = machine.format;
          send_obj.goodcount = machine.goodCount;
          send_obj.batch_name = machine.batch_name;
          send_obj.changeover_id = machine.changeover_id;
          send_obj.minor_fault_time = machine.minor_fault;
          send_obj.major_fault_time = machine.major_fault;
          send_obj.minor_fault_count = machine.minor_fault_count;
          send_obj.major_fault_count = machine.major_fault_count;
          send_obj.minor_manual_stop_time = machine.minor_manual_stop;
          send_obj.major_manual_stop_time = machine.major_manual_stop;
          send_obj.minor_manual_stop_count = machine.minor_manual_stop_count;
          send_obj.major_manual_stop_count = machine.major_manual_stop_count;
          send_obj.blocked_time = machine.blocked;
          send_obj.blocked_count = machine.blocked_count;
          send_obj.waiting_time = machine.waiting;
          send_obj.waiting_count = machine.waiting_count;
          send_obj.recipe_id = machine.recipe_id;
          send_obj.recipe_description = machine.recipe_description;
          send_obj.po_number = machine.po_number;
          send_obj.max_bpm = machine.max_bpm;
          send_obj.connected_line = machine.connected_line;
          send_obj.recipe_code = machine.recipe_code;
          send_obj.recipe_description = machine.recipe_description;
          send_obj.preform_code = machine.preform_code;
          send_obj.idle_time = machine.ready;
          send_obj.idle_count = machine.ready_count;
          send_obj.sidel_waiting_count = machine.waiting_count;
          send_obj.updt_time = machine.updt;
          send_obj.updt_count = machine.updt_count;
          send_obj.cip_time = machine.cip;
          send_obj.cip_count = machine.cip_count;
          var executing =
            machine.total_batch_duration -
            (machine.break_pdt +
              machine.co_pdt +
              machine.changeover +
              machine.updt +
              machine.major_fault +
              machine.minor_fault +
              machine.major_manual_stop +
              machine.minor_manual_stop +
              machine.blocked +
              machine.waiting +
              machine.ready);
          send_obj.executing = executing < 70 ? 0 : executing;
          send_obj.theoretical_time = machine.total_batch_duration;
          send_obj.planed_production_time = batch_cal_data.working_time_sec;
          send_obj.gross_operating_time = batch_cal_data.production_time_sec;
          send_obj.performance_time = batch_cal_data.performance_time_sec;
          send_obj.reject_time = batch_cal_data.reject_time_sec;
          send_obj.total_idle_time = batch_cal_data.idle_time_sec;
          send_obj.total_idle_count =
            machine.ready_count +
            machine.minor_fault_count +
            machine.major_manual_stop_count +
            machine.blocked_count +
            machine.waiting_count;
          send_obj.speed_loss = batch_cal_data.speed_loss_sec;
          send_obj.net_operating_time = batch_cal_data.net_operating_time_sec;
          send_obj.productive_time = batch_cal_data.productive_time_sec;
          send_arr.push(send_obj);
        }
        machine_l++;
        if (data_counter == data.length && machine_l == element.raw.length) {
          res.send(send_arr);
        }
        
      });
    });
  }
});



function yearlyAggregationQuery(startDate, endDate, groupBy) {
  return [
    {
      $match: {
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
    },
    {
      $unwind: {
        path: "$shift_wise",
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
      $lookup: {
        from: "changeovers",
        localField:
          "shift_wise.batch_wise.changeover",
        foreignField: "_id",
        as: "batch_changeover",
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
        path: "$batch_changeover",
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
      $unwind: {
        path: "$shift_wise.batch_wise.vendor_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$shift_wise.batch_wise.vendor_wise.machine_wise",
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
      $match: {
        "shift_wise.batch_wise.vendor_wise.machine_wise.machine_name":
          "filler",
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
        path: "$plant",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "locations",
        localField: "plant.location_id",
        foreignField: "_id",
        as: "location",
      },
    },
    {
      $unwind: {
        path: "$location",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        line_id: "$line.line_name",
        date: {
          $dateToString: {
            date: "$date",
            // Replace "dateFieldName" with your actual date field name
            format: "%Y-%m-%d",
            // Format as dd-mm-yyyy
            timezone: "UTC",
          },
        },
        plant_id: "$plant.plant_name",
        shift: "$shift_wise.shift_name",
        machine_name: "$machine.display_name",
        machine:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
        line: "$line_id",
        goodCount: {
          $cond: [
            {
              $eq: ["$machine.product", "case"],
            },
            {
              $multiply: [
                "$fgex.bottles_per_case",
                "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
              ],
            },
            "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
          ],
        },
        cycle_count: {
          $cond: [
            {
              $eq: ["$machine.product", "case"],
            },
            {
              $multiply: [
                "$fgex.bottles_per_case",
                "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
              ],
            },
            "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
          ],
        },
        month_name: {
          $month: "$date",
        },
        year: {
          $year: "$date",
        },
        changeover_id: {
          $dateToString: {
            format: "%Y%m%d%H%M",
            date: "$batch_changeover.changeover_start_date",
            timezone: "+05:30",
          },
        },
        total_time: {
          $divide: [
            {
              $subtract: [
                "$shift_wise.batch_wise.end_timestamp",
                "$shift_wise.batch_wise.start_timestamp",
              ],
            },
            1000,
          ],
        },
        changeover: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: [
                "$$stop.stop_name",
                "changeover",
              ],
            },
          },
        },
        blocked: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "blocked"],
            },
          },
        },
        updt: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "updt"],
            },
          },
        },
        pdt: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "pdt"],
            },
          },
        },
        cip: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "cip"],
            },
          },
        },
        fault: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "fault"],
            },
          },
        },
        manual_stop: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: [
                "$$stop.stop_name",
                "manual_stop",
              ],
            },
          },
        },
        waiting: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "waiting"],
            },
          },
        },
        ready: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "ready"],
            },
          },
        },
        executing: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: [
                "$$stop.stop_name",
                "executing",
              ],
            },
          },
        },
        schedule_maintance: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: [
                "$$stop.stop_name",
                "schedule_maintance",
              ],
            },
          },
        },
        rated_speed: {
          $ifNull: ["$fgex.rated_speed", 60],
        },
        format: "$fgex.sku_number",
        bottles_per_case: "$fgex.bottles_per_case",
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
        path: "$schedule_maintance",
        preserveNullAndEmptyArrays: true,
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
        path: "$cip",
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
      $project: {
        line_id: 1,
        date: 1,
        shift: 1,
        total_time: 1,
        goodCount: 1,
        pdt: {
          $ifNull: ["$pdt.duration", 0],
        },
        updt: {
          $ifNull: ["$updt.duration", 0],
        },
        changeover: {
          $ifNull: ["$changeover.duration", 0],
        },
        cip: {
          $ifNull: ["$cip.duration", 0],
        },
        blocked: {
          $ifNull: ["$blocked.duration", 0],
        },
        ready: {
          $ifNull: ["$ready.duration", 0],
        },
        manual_stop: {
          $ifNull: ["$manual_stop.duration", 0],
        },
        fault: {
          $ifNull: ["$fault.duration", 0],
        },
        executing: {
          $ifNull: ["$executing.duration", 0],
        },
        schedule_maintance: {
          $ifNull: [
            "$schedule_maintance.duration",
            0,
          ],
        },
        et: {
          $multiply: [
            {
              $divide: [
                "$goodCount",
                "$rated_speed",
              ],
            },
            60,
          ],
        },
        major_fault: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$fault.details",
                as: "stop",
                cond: {
                  $eq: [
                    "$$stop.duration_type",
                    "major",
                  ],
                },
              },
            },
            0,
          ],
        },
        minor_fault: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$fault.details",
                as: "stop",
                cond: {
                  $eq: [
                    "$$stop.duration_type",
                    "minor",
                  ],
                },
              },
            },
            0,
          ],
        },
        major_manual_stop: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$manual_stop.details",
                as: "stop",
                cond: {
                  $eq: [
                    "$$stop.duration_type",
                    "major",
                  ],
                },
              },
            },
            0,
          ],
        },
        minor_manual_stop: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$manual_stop.details",
                as: "stop",
                cond: {
                  $eq: [
                    "$$stop.duration_type",
                    "minor",
                  ],
                },
              },
            },
            0,
          ],
        },
      },
    },
    {
      $project: {
        line_id: 1,
        date: 1,
        shift: 1,
        total_time: 1,
        goodCount: 1,
        pdt: 1,
        updt: 1,
        changeover: 1,
        cip: 1,
        blocked: 1,
        ready: 1,
        manual_stop: 1,
        fault: 1,
        executing: 1,
        schedule_maintance: 1,
        major_fault: {
          $ifNull: ["$major_fault.duration", 0],
        },
        minor_fault: {
          $ifNull: ["$minor_fault.duration", 0],
        },
        major_manual_stop: {
          $ifNull: [
            "$major_manual_stop.duration",
            0,
          ],
        },
        minor_manual_stop: {
          $ifNull: [
            "$minor_manual_stop.duration",
            0,
          ],
        },
        et: { $round: "$et" },
      },
    },
    {
      $group: {
        _id: groupBy,
        //Group By
        goodCount: {
          $sum: "$goodCount",
        },
        total_time: {
          $sum: "$total_time",
        },
        pdt: {
          $sum: "$pdt",
        },
        updt: {
          $sum: "$updt",
        },
        changeover: {
          $sum: "$changeover",
        },
        cip: {
          $sum: "$cip",
        },
        blocked: {
          $sum: "$blocked",
        },
        ready: {
          $sum: "$ready",
        },
        manual_stop: {
          $sum: "$manual_stop",
        },
        minor_manual_stop: {
          $sum: "$minor_manual_stop",
        },
        major_manual_stop: {
          $sum: "$major_manual_stop",
        },
        fault: {
          $sum: "$fault",
        },
        minor_fault: {
          $sum: "$minor_fault",
        },
        major_fault: {
          $sum: "$major_fault",
        },
        executing: {
          $sum: "$executing",
        },
        schedule_maintance: {
          $sum: "$schedule_maintance",
        },
        et: {
          $sum: "$et",
        },
      },
    },
    {
      $project: {
        line_id: "$_id.line_id",
        shift: "$_id.shift",
        date: "$_id.date",
        _id: 0,
        goodCount: 1,
        total_time: 1,
        pdt: 1,
        updt: 1,
        changeover: 1,
        cip: 1,
        blocked: 1,
        ready: 1,
        manual_stop: 1,
        minor_manual_stop: 1,
        major_manual_stop: 1,
        fault: 1,
        minor_fault: 1,
        major_fault: 1,
        executing: 1,
        schedule_maintenance: 1,
        et: 1,
      },
    },
  ]
}
function yearlyLastMachineCountQuery(yearlystartDate, monthlyStartDate, dailyStartDate, endDate, groupBy) {
  return [
    {
      $facet: {
        yearlyLastmachineCounts: [
          {
            $match: {
              $and: [
                {
                  date: {
                    $lte: new Date(endDate),
                  },
                },
                {
                  date: {
                    $gte: new Date(yearlystartDate),
                  },
                },
              ],
            },
          },
          {
            $unwind: "$shift_wise",
          },
          {
            $unwind: {
              path: "$shift_wise.batch_wise",
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
            $unwind: {
              path: "$shift_wise.batch_wise.vendor_wise.machine_wise",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              line_id: 1,
              "shift_wise.batch_wise.vendor_wise.machine_wise": 1,
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
              from: "addlines",
              localField: "line._id",
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
          {
            $match: {
              $expr: {
                $eq: [
                  "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
                  "$addline.last_machine_count_machine",
                ],
              },
            },
          },
          {
            $project: {
              line_id: "$line.line_name",
              line: "$line_id",
              goodCount:
                "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
            },
          },
          {
            $group: {
              _id: {
                line_id: "$line_id",
              },
              goodCount: {
                $sum: "$goodCount",
              },
            },
          },
          {
            $project: {
              line_id: "$_id.line_id",
              _id: 0,
              goodCount: 1,
            },
          },
        ],
        yearlydata: [
          {
            $match: {
              $and: [
                {
                  date: {
                    $lte: new Date(endDate),
                  },
                },
                {
                  date: {
                    $gte: new Date(yearlystartDate),
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$shift_wise",
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
              localField:
                "shift_wise.batch_wise.batch",
              foreignField: "_id",
              as: "batch",
            },
          },
          {
            $lookup: {
              from: "changeovers",
              localField:
                "shift_wise.batch_wise.changeover",
              foreignField: "_id",
              as: "batch_changeover",
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
              path: "$batch_changeover",
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
            $unwind: {
              path: "$shift_wise.batch_wise.vendor_wise",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$shift_wise.batch_wise.vendor_wise.machine_wise",
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
            $lookup: {
              from: "addlines",
              localField: "line._id",
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
          {
            $match: {
              $expr: {
                $eq: [
                  "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
                  "$addline.critical_machine",
                ],
              },
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
              path: "$plant",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "locations",
              localField: "plant.location_id",
              foreignField: "_id",
              as: "location",
            },
          },
          {
            $unwind: {
              path: "$location",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              line_id: "$line.line_name",
              date: {
                $dateToString: {
                  date: "$date",
                  // Replace "dateFieldName" with your actual date field name
                  format: "%d-%m-%Y",
                  // Format as dd-mm-yyyy
                  timezone: "UTC",
                },
              },
              plant_id: "$plant.plant_name",
              shift: "$shift_wise.shift_name",
              machine_name: "$machine.display_name",
              machine:
                "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
              line: "$line_id",
              goodCount: {
                $cond: [
                  {
                    $eq: [
                      "$machine.product",
                      "case",
                    ],
                  },
                  {
                    $multiply: [
                      "$fgex.bottles_per_case",
                      "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
                    ],
                  },
                  "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
                ],
              },
              cycle_count: {
                $cond: [
                  {
                    $eq: [
                      "$machine.product",
                      "case",
                    ],
                  },
                  {
                    $multiply: [
                      "$fgex.bottles_per_case",
                      "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
                    ],
                  },
                  "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
                ],
              },
              month_name: {
                $month: "$date",
              },
              year: {
                $year: "$date",
              },
              changeover_id: {
                $dateToString: {
                  format: "%Y%m%d%H%M",
                  date: "$batch_changeover.changeover_start_date",
                  timezone: "+05:30",
                },
              },
              total_time: {
                $divide: [
                  {
                    $subtract: [
                      "$shift_wise.batch_wise.end_timestamp",
                      "$shift_wise.batch_wise.start_timestamp",
                    ],
                  },
                  1000,
                ],
              },
              changeover: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "changeover",
                    ],
                  },
                },
              },
              blocked: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "blocked",
                    ],
                  },
                },
              },
              updt: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "updt",
                    ],
                  },
                },
              },
              pdt: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "pdt",
                    ],
                  },
                },
              },
              cip: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "cip",
                    ],
                  },
                },
              },
              fault: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "fault",
                    ],
                  },
                },
              },
              manual_stop: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "manual_stop",
                    ],
                  },
                },
              },
              waiting: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "waiting",
                    ],
                  },
                },
              },
              ready: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "ready",
                    ],
                  },
                },
              },
              executing: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "executing",
                    ],
                  },
                },
              },
              schedule_maintance: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "schedule_maintance",
                    ],
                  },
                },
              },
              rated_speed: {
                $ifNull: ["$fgex.rated_speed", 60],
              },
              format: "$fgex.sku_number",
              bottles_per_case:
                "$fgex.bottles_per_case",
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
              path: "$schedule_maintance",
              preserveNullAndEmptyArrays: true,
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
              path: "$cip",
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
            $project: {
              line_id: 1,
              date: 1,
              shift: 1,
              total_time: 1,
              goodCount: 1,
              pdt: {
                $ifNull: ["$pdt.duration", 0],
              },
              updt: {
                $ifNull: ["$updt.duration", 0],
              },
              changeover: {
                $ifNull: [
                  "$changeover.duration",
                  0,
                ],
              },
              cip: {
                $ifNull: ["$cip.duration", 0],
              },
              blocked: {
                $ifNull: ["$blocked.duration", 0],
              },
              ready: {
                $ifNull: ["$ready.duration", 0],
              },
              manual_stop: {
                $ifNull: [
                  "$manual_stop.duration",
                  0,
                ],
              },
              fault: {
                $ifNull: ["$fault.duration", 0],
              },
              executing: {
                $ifNull: ["$executing.duration", 0],
              },
              schedule_maintance: {
                $ifNull: [
                  "$schedule_maintance.duration",
                  0,
                ],
              },
              et: {
                $multiply: [
                  {
                    $divide: [
                      "$goodCount",
                      "$rated_speed",
                    ],
                  },
                  60,
                ],
              },
              major_fault: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$fault.details",
                      as: "stop",
                      cond: {
                        $eq: [
                          "$$stop.duration_type",
                          "major",
                        ],
                      },
                    },
                  },
                  0,
                ],
              },
              minor_fault: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$fault.details",
                      as: "stop",
                      cond: {
                        $eq: [
                          "$$stop.duration_type",
                          "minor",
                        ],
                      },
                    },
                  },
                  0,
                ],
              },
              major_manual_stop: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$manual_stop.details",
                      as: "stop",
                      cond: {
                        $eq: [
                          "$$stop.duration_type",
                          "major",
                        ],
                      },
                    },
                  },
                  0,
                ],
              },
              minor_manual_stop: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$manual_stop.details",
                      as: "stop",
                      cond: {
                        $eq: [
                          "$$stop.duration_type",
                          "minor",
                        ],
                      },
                    },
                  },
                  0,
                ],
              },
            },
          },
          {
            $project: {
              line_id: 1,
              date: 1,
              shift: 1,
              total_time: 1,
              goodCount: 1,
              pdt: 1,
              updt: 1,
              changeover: 1,
              cip: 1,
              blocked: 1,
              ready: 1,
              manual_stop: 1,
              fault: 1,
              executing: 1,
              schedule_maintance: 1,
              major_fault: {
                $ifNull: [
                  "$major_fault.duration",
                  0,
                ],
              },
              minor_fault: {
                $ifNull: [
                  "$minor_fault.duration",
                  0,
                ],
              },
              major_manual_stop: {
                $ifNull: [
                  "$major_manual_stop.duration",
                  0,
                ],
              },
              minor_manual_stop: {
                $ifNull: [
                  "$minor_manual_stop.duration",
                  0,
                ],
              },
              et: 1,
            },
          },
          {
            $group: {
              _id: {
                line_id: "$line_id",
              },
              goodCount: {
                $sum: "$goodCount",
              },
              total_time: {
                $sum: "$total_time",
              },
              pdt: {
                $sum: "$pdt",
              },
              updt: {
                $sum: "$updt",
              },
              changeover: {
                $sum: "$changeover",
              },
              cip: {
                $sum: "$cip",
              },
              blocked: {
                $sum: "$blocked",
              },
              ready: {
                $sum: "$ready",
              },
              manual_stop: {
                $sum: "$manual_stop",
              },
              minor_manual_stop: {
                $sum: "$minor_manual_stop",
              },
              major_manual_stop: {
                $sum: "$major_manual_stop",
              },
              fault: {
                $sum: "$fault",
              },
              minor_fault: {
                $sum: "$minor_fault",
              },
              major_fault: {
                $sum: "$major_fault",
              },
              executing: {
                $sum: "$executing",
              },
              schedule_maintance: {
                $sum: "$schedule_maintance",
              },
              et: {
                $sum: "$et",
              },
            },
          },
          {
            $project: {
              line_id: "$_id.line_id",
              _id: 0,
              goodCount: 1,
              total_time: 1,
              pdt: 1,
              updt: 1,
              changeover: 1,
              cip: 1,
              blocked: 1,
              ready: 1,
              manual_stop: 1,
              minor_manual_stop: 1,
              major_manual_stop: 1,
              fault: 1,
              minor_fault: 1,
              major_fault: 1,
              executing: 1,
              schedule_maintenance: 1,
              et: 1,
              shift: 1,
            },
          },
        ],
        monthlyLastmachineCounts: [
          {
            $match: {
              $and: [
                {
                  date: {
                    $lte: new Date(endDate),
                  },
                },
                {
                  date: {
                    $gte: new Date(monthlyStartDate),
                  },
                },
              ],
            },
          },
          {
            $unwind: "$shift_wise",
          },
          {
            $unwind: {
              path: "$shift_wise.batch_wise",
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
            $unwind: {
              path: "$shift_wise.batch_wise.vendor_wise.machine_wise",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              line_id: 1,
              "shift_wise.batch_wise.vendor_wise.machine_wise": 1,
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
              from: "addlines",
              localField: "line._id",
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
          {
            $match: {
              $expr: {
                $eq: [
                  "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
                  "$addline.last_machine_count_machine",
                ],
              },
            },
          },
          {
            $project: {
              line_id: "$line.line_name",
              line: "$line_id",
              goodCount:
                "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
            },
          },
          {
            $group: {
              _id: {
                line_id: "$line_id",
              },
              goodCount: {
                $sum: "$goodCount",
              },
            },
          },
          {
            $project: {
              line_id: "$_id.line_id",
              _id: 0,
              goodCount: 1,
            },
          },
        ],
        monthlydata: [
          {
            $match: {
              $and: [
                {
                  date: {
                    $lte: new Date(endDate),
                  },
                },
                {
                  date: {
                    $gte: new Date(monthlyStartDate),
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$shift_wise",
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
              localField:
                "shift_wise.batch_wise.batch",
              foreignField: "_id",
              as: "batch",
            },
          },
          {
            $lookup: {
              from: "changeovers",
              localField:
                "shift_wise.batch_wise.changeover",
              foreignField: "_id",
              as: "batch_changeover",
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
              path: "$batch_changeover",
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
            $unwind: {
              path: "$shift_wise.batch_wise.vendor_wise",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$shift_wise.batch_wise.vendor_wise.machine_wise",
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
            $lookup: {
              from: "addlines",
              localField: "line._id",
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
          {
            $match: {
              $expr: {
                $eq: [
                  "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
                  "$addline.critical_machine",
                ],
              },
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
              path: "$plant",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "locations",
              localField: "plant.location_id",
              foreignField: "_id",
              as: "location",
            },
          },
          {
            $unwind: {
              path: "$location",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              line_id: "$line.line_name",
              date: {
                $dateToString: {
                  date: "$date",
                  // Replace "dateFieldName" with your actual date field name
                  format: "%d-%m-%Y",
                  // Format as dd-mm-yyyy
                  timezone: "UTC",
                },
              },
              plant_id: "$plant.plant_name",
              shift: "$shift_wise.shift_name",
              machine_name: "$machine.display_name",
              machine:
                "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
              line: "$line_id",
              goodCount: {
                $cond: [
                  {
                    $eq: [
                      "$machine.product",
                      "case",
                    ],
                  },
                  {
                    $multiply: [
                      "$fgex.bottles_per_case",
                      "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
                    ],
                  },
                  "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
                ],
              },
              cycle_count: {
                $cond: [
                  {
                    $eq: [
                      "$machine.product",
                      "case",
                    ],
                  },
                  {
                    $multiply: [
                      "$fgex.bottles_per_case",
                      "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
                    ],
                  },
                  "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
                ],
              },
              month_name: {
                $month: "$date",
              },
              year: {
                $year: "$date",
              },
              changeover_id: {
                $dateToString: {
                  format: "%Y%m%d%H%M",
                  date: "$batch_changeover.changeover_start_date",
                  timezone: "+05:30",
                },
              },
              total_time: {
                $divide: [
                  {
                    $subtract: [
                      "$shift_wise.batch_wise.end_timestamp",
                      "$shift_wise.batch_wise.start_timestamp",
                    ],
                  },
                  1000,
                ],
              },
              changeover: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "changeover",
                    ],
                  },
                },
              },
              blocked: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "blocked",
                    ],
                  },
                },
              },
              updt: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "updt",
                    ],
                  },
                },
              },
              pdt: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "pdt",
                    ],
                  },
                },
              },
              cip: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "cip",
                    ],
                  },
                },
              },
              fault: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "fault",
                    ],
                  },
                },
              },
              manual_stop: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "manual_stop",
                    ],
                  },
                },
              },
              waiting: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "waiting",
                    ],
                  },
                },
              },
              ready: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "ready",
                    ],
                  },
                },
              },
              executing: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "executing",
                    ],
                  },
                },
              },
              schedule_maintance: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "schedule_maintance",
                    ],
                  },
                },
              },
              rated_speed: {
                $ifNull: ["$fgex.rated_speed", 60],
              },
              format: "$fgex.sku_number",
              bottles_per_case:
                "$fgex.bottles_per_case",
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
              path: "$schedule_maintance",
              preserveNullAndEmptyArrays: true,
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
              path: "$cip",
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
            $project: {
              line_id: 1,
              date: 1,
              shift: 1,
              total_time: 1,
              goodCount: 1,
              pdt: {
                $ifNull: ["$pdt.duration", 0],
              },
              updt: {
                $ifNull: ["$updt.duration", 0],
              },
              changeover: {
                $ifNull: [
                  "$changeover.duration",
                  0,
                ],
              },
              cip: {
                $ifNull: ["$cip.duration", 0],
              },
              blocked: {
                $ifNull: ["$blocked.duration", 0],
              },
              ready: {
                $ifNull: ["$ready.duration", 0],
              },
              manual_stop: {
                $ifNull: [
                  "$manual_stop.duration",
                  0,
                ],
              },
              fault: {
                $ifNull: ["$fault.duration", 0],
              },
              executing: {
                $ifNull: ["$executing.duration", 0],
              },
              schedule_maintance: {
                $ifNull: [
                  "$schedule_maintance.duration",
                  0,
                ],
              },
              et: {
                $multiply: [
                  {
                    $divide: [
                      "$goodCount",
                      "$rated_speed",
                    ],
                  },
                  60,
                ],
              },
              major_fault: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$fault.details",
                      as: "stop",
                      cond: {
                        $eq: [
                          "$$stop.duration_type",
                          "major",
                        ],
                      },
                    },
                  },
                  0,
                ],
              },
              minor_fault: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$fault.details",
                      as: "stop",
                      cond: {
                        $eq: [
                          "$$stop.duration_type",
                          "minor",
                        ],
                      },
                    },
                  },
                  0,
                ],
              },
              major_manual_stop: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$manual_stop.details",
                      as: "stop",
                      cond: {
                        $eq: [
                          "$$stop.duration_type",
                          "major",
                        ],
                      },
                    },
                  },
                  0,
                ],
              },
              minor_manual_stop: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$manual_stop.details",
                      as: "stop",
                      cond: {
                        $eq: [
                          "$$stop.duration_type",
                          "minor",
                        ],
                      },
                    },
                  },
                  0,
                ],
              },
            },
          },
          {
            $project: {
              line_id: 1,
              date: 1,
              shift: 1,
              total_time: 1,
              goodCount: 1,
              pdt: 1,
              updt: 1,
              changeover: 1,
              cip: 1,
              blocked: 1,
              ready: 1,
              manual_stop: 1,
              fault: 1,
              executing: 1,
              schedule_maintance: 1,
              major_fault: {
                $ifNull: [
                  "$major_fault.duration",
                  0,
                ],
              },
              minor_fault: {
                $ifNull: [
                  "$minor_fault.duration",
                  0,
                ],
              },
              major_manual_stop: {
                $ifNull: [
                  "$major_manual_stop.duration",
                  0,
                ],
              },
              minor_manual_stop: {
                $ifNull: [
                  "$minor_manual_stop.duration",
                  0,
                ],
              },
              et: 1,
            },
          },
          {
            $group: {
              _id: {
                line_id: "$line_id",
              },
              goodCount: {
                $sum: "$goodCount",
              },
              total_time: {
                $sum: "$total_time",
              },
              pdt: {
                $sum: "$pdt",
              },
              updt: {
                $sum: "$updt",
              },
              changeover: {
                $sum: "$changeover",
              },
              cip: {
                $sum: "$cip",
              },
              blocked: {
                $sum: "$blocked",
              },
              ready: {
                $sum: "$ready",
              },
              manual_stop: {
                $sum: "$manual_stop",
              },
              minor_manual_stop: {
                $sum: "$minor_manual_stop",
              },
              major_manual_stop: {
                $sum: "$major_manual_stop",
              },
              fault: {
                $sum: "$fault",
              },
              minor_fault: {
                $sum: "$minor_fault",
              },
              major_fault: {
                $sum: "$major_fault",
              },
              executing: {
                $sum: "$executing",
              },
              schedule_maintance: {
                $sum: "$schedule_maintance",
              },
              et: {
                $sum: "$et",
              },
            },
          },
          {
            $project: {
              line_id: "$_id.line_id",
              _id: 0,
              goodCount: 1,
              total_time: 1,
              pdt: 1,
              updt: 1,
              changeover: 1,
              cip: 1,
              blocked: 1,
              ready: 1,
              manual_stop: 1,
              minor_manual_stop: 1,
              major_manual_stop: 1,
              fault: 1,
              minor_fault: 1,
              major_fault: 1,
              executing: 1,
              schedule_maintenance: 1,
              et: 1,
              shift: 1,
            },
          },
        ],
        dailydata: [
          {
            $match: {
              $and: [
                {
                  date: {
                    $lte: new Date(endDate),
                  },
                },
                {
                  date: {
                    $gte: new Date(dailyStartDate),
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$shift_wise",
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
              localField:
                "shift_wise.batch_wise.batch",
              foreignField: "_id",
              as: "batch",
            },
          },
          {
            $lookup: {
              from: "changeovers",
              localField:
                "shift_wise.batch_wise.changeover",
              foreignField: "_id",
              as: "batch_changeover",
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
              path: "$batch_changeover",
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
            $unwind: {
              path: "$shift_wise.batch_wise.vendor_wise",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$shift_wise.batch_wise.vendor_wise.machine_wise",
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
            $lookup: {
              from: "addlines",
              localField: "line._id",
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
          {
            $match: {
              $expr: {
                $eq: [
                  "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
                  "$addline.critical_machine",
                ],
              },
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
              path: "$plant",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "locations",
              localField: "plant.location_id",
              foreignField: "_id",
              as: "location",
            },
          },
          {
            $unwind: {
              path: "$location",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              line_id: "$line.line_name",
              date: {
                $dateToString: {
                  date: "$date",
                  // Replace "dateFieldName" with your actual date field name
                  format: "%d-%m-%Y",
                  // Format as dd-mm-yyyy
                  timezone: "UTC",
                },
              },
              plant_id: "$plant.plant_name",
              shift: "$shift_wise.shift_name",
              machine_name: "$machine.display_name",
              machine:
                "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
              line: "$line_id",
              goodCount: {
                $cond: [
                  {
                    $eq: [
                      "$machine.product",
                      "case",
                    ],
                  },
                  {
                    $multiply: [
                      "$fgex.bottles_per_case",
                      "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
                    ],
                  },
                  "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
                ],
              },
              cycle_count: {
                $cond: [
                  {
                    $eq: [
                      "$machine.product",
                      "case",
                    ],
                  },
                  {
                    $multiply: [
                      "$fgex.bottles_per_case",
                      "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
                    ],
                  },
                  "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
                ],
              },
              month_name: {
                $month: "$date",
              },
              year: {
                $year: "$date",
              },
              changeover_id: {
                $dateToString: {
                  format: "%Y%m%d%H%M",
                  date: "$batch_changeover.changeover_start_date",
                  timezone: "+05:30",
                },
              },
              total_time: {
                $divide: [
                  {
                    $subtract: [
                      "$shift_wise.batch_wise.end_timestamp",
                      "$shift_wise.batch_wise.start_timestamp",
                    ],
                  },
                  1000,
                ],
              },
              changeover: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "changeover",
                    ],
                  },
                },
              },
              blocked: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "blocked",
                    ],
                  },
                },
              },
              updt: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "updt",
                    ],
                  },
                },
              },
              pdt: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "pdt",
                    ],
                  },
                },
              },
              cip: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "cip",
                    ],
                  },
                },
              },
              fault: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "fault",
                    ],
                  },
                },
              },
              manual_stop: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "manual_stop",
                    ],
                  },
                },
              },
              waiting: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "waiting",
                    ],
                  },
                },
              },
              ready: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "ready",
                    ],
                  },
                },
              },
              executing: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "executing",
                    ],
                  },
                },
              },
              schedule_maintance: {
                $filter: {
                  input:
                    "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
                  as: "stop",
                  cond: {
                    $eq: [
                      "$$stop.stop_name",
                      "schedule_maintance",
                    ],
                  },
                },
              },
              rated_speed: {
                $ifNull: ["$fgex.rated_speed", 60],
              },
              format: "$fgex.sku_number",
              bottles_per_case:
                "$fgex.bottles_per_case",
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
              path: "$schedule_maintance",
              preserveNullAndEmptyArrays: true,
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
              path: "$cip",
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
            $project: {
              line_id: 1,
              date: 1,
              shift: 1,
              total_time: 1,
              goodCount: 1,
              pdt: {
                $ifNull: ["$pdt.duration", 0],
              },
              updt: {
                $ifNull: ["$updt.duration", 0],
              },
              changeover: {
                $ifNull: [
                  "$changeover.duration",
                  0,
                ],
              },
              cip: {
                $ifNull: ["$cip.duration", 0],
              },
              blocked: {
                $ifNull: ["$blocked.duration", 0],
              },
              ready: {
                $ifNull: ["$ready.duration", 0],
              },
              manual_stop: {
                $ifNull: [
                  "$manual_stop.duration",
                  0,
                ],
              },
              fault: {
                $ifNull: ["$fault.duration", 0],
              },
              executing: {
                $ifNull: ["$executing.duration", 0],
              },
              schedule_maintance: {
                $ifNull: [
                  "$schedule_maintance.duration",
                  0,
                ],
              },
              et: {
                $multiply: [
                  {
                    $divide: [
                      "$goodCount",
                      "$rated_speed",
                    ],
                  },
                  60,
                ],
              },
              major_fault: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$fault.details",
                      as: "stop",
                      cond: {
                        $eq: [
                          "$$stop.duration_type",
                          "major",
                        ],
                      },
                    },
                  },
                  0,
                ],
              },
              minor_fault: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$fault.details",
                      as: "stop",
                      cond: {
                        $eq: [
                          "$$stop.duration_type",
                          "minor",
                        ],
                      },
                    },
                  },
                  0,
                ],
              },
              major_manual_stop: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$manual_stop.details",
                      as: "stop",
                      cond: {
                        $eq: [
                          "$$stop.duration_type",
                          "major",
                        ],
                      },
                    },
                  },
                  0,
                ],
              },
              minor_manual_stop: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$manual_stop.details",
                      as: "stop",
                      cond: {
                        $eq: [
                          "$$stop.duration_type",
                          "minor",
                        ],
                      },
                    },
                  },
                  0,
                ],
              },
            },
          },
          {
            $project: {
              line_id: 1,
              date: 1,
              shift: 1,
              total_time: 1,
              goodCount: 1,
              pdt: 1,
              updt: 1,
              changeover: 1,
              cip: 1,
              blocked: 1,
              ready: 1,
              manual_stop: 1,
              fault: 1,
              executing: 1,
              schedule_maintance: 1,
              major_fault: {
                $ifNull: [
                  "$major_fault.duration",
                  0,
                ],
              },
              minor_fault: {
                $ifNull: [
                  "$minor_fault.duration",
                  0,
                ],
              },
              major_manual_stop: {
                $ifNull: [
                  "$major_manual_stop.duration",
                  0,
                ],
              },
              minor_manual_stop: {
                $ifNull: [
                  "$minor_manual_stop.duration",
                  0,
                ],
              },
              et: 1,
            },
          },
          {
            $group: {
              _id: {
                line_id: "$line_id",
              },
              goodCount: {
                $sum: "$goodCount",
              },
              total_time: {
                $sum: "$total_time",
              },
              pdt: {
                $sum: "$pdt",
              },
              updt: {
                $sum: "$updt",
              },
              changeover: {
                $sum: "$changeover",
              },
              cip: {
                $sum: "$cip",
              },
              blocked: {
                $sum: "$blocked",
              },
              ready: {
                $sum: "$ready",
              },
              manual_stop: {
                $sum: "$manual_stop",
              },
              minor_manual_stop: {
                $sum: "$minor_manual_stop",
              },
              major_manual_stop: {
                $sum: "$major_manual_stop",
              },
              fault: {
                $sum: "$fault",
              },
              minor_fault: {
                $sum: "$minor_fault",
              },
              major_fault: {
                $sum: "$major_fault",
              },
              executing: {
                $sum: "$executing",
              },
              schedule_maintance: {
                $sum: "$schedule_maintance",
              },
              et: {
                $sum: "$et",
              },
            },
          },
          {
            $project: {
              line_id: "$_id.line_id",
              _id: 0,
              goodCount: 1,
              total_time: 1,
              pdt: 1,
              updt: 1,
              changeover: 1,
              cip: 1,
              blocked: 1,
              ready: 1,
              manual_stop: 1,
              minor_manual_stop: 1,
              major_manual_stop: 1,
              fault: 1,
              minor_fault: 1,
              major_fault: 1,
              executing: 1,
              schedule_maintenance: 1,
              et: 1,
              shift: 1,
            },
          },
        ],
        dailyLastmachineCounts: [
          {
            $match: {
              $and: [
                {
                  date: {
                    $lte: new Date(endDate),
                  },
                },
                {
                  date: {
                    $gte: new Date(dailyStartDate),
                  },
                },
              ],
            },
          },
          {
            $unwind: "$shift_wise",
          },
          {
            $unwind: {
              path: "$shift_wise.batch_wise",
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
            $unwind: {
              path: "$shift_wise.batch_wise.vendor_wise.machine_wise",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              line_id: 1,
              "shift_wise.batch_wise.vendor_wise.machine_wise": 1,
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
              from: "addlines",
              localField: "line._id",
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
          {
            $match: {
              $expr: {
                $eq: [
                  "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
                  "$addline.last_machine_count_machine",
                ],
              },
            },
          },
          {
            $project: {
              line_id: "$line.line_name",
              line: "$line_id",
              goodCount:
                "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
            },
          },
          {
            $group: {
              _id: {
                line_id: "$line_id",
              },
              goodCount: {
                $sum: "$goodCount",
              },
            },
          },
          {
            $project: {
              line_id: "$_id.line_id",
              _id: 0,
              goodCount: 1,
            },
          },
        ],
        // You can add more facets here
      },
    },
    {
      $project: {
        yearlydata: {
          $map: {
            input: "$yearlydata",
            as: "yearly",
            in: {
              $let: {
                vars: {
                  caseCountObj: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input:
                            "$yearlyLastmachineCounts",
                          as: "machine",
                          cond: {
                            $eq: [
                              "$$machine.line_id",
                              "$$yearly.line_id",
                            ],
                          },
                        },
                      },
                      0, // We take the first element since there should be only one match
                    ],
                  },
                },

                in: {
                  $mergeObjects: [
                    "$$yearly",
                    {
                      casecount:
                        "$$caseCountObj.goodCount", // Add the casecount from the matched object
                    },
                  ],
                },
              },
            },
          },
        },
        monthlydata: {
          $map: {
            input: "$monthlydata",
            as: "monthly",
            in: {
              $let: {
                vars: {
                  caseCountObj: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input:
                            "$monthlyLastmachineCounts",
                          as: "machine",
                          cond: {
                            $eq: [
                              "$$machine.line_id",
                              "$$monthly.line_id",
                            ],
                          },
                        },
                      },
                      0, // We take the first element since there should be only one match
                    ],
                  },
                },

                in: {
                  $mergeObjects: [
                    "$$monthly",
                    {
                      casecount:
                        "$$caseCountObj.goodCount", // Add the casecount from the matched object
                    },
                  ],
                },
              },
            },
          },
        },
        dailydata: {
          $map: {
            input: "$dailydata",
            as: "daily",
            in: {
              $let: {
                vars: {
                  caseCountObj: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input:
                            "$dailyLastmachineCounts",
                          as: "machine",
                          cond: {
                            $eq: [
                              "$$machine.line_id",
                              "$$daily.line_id",
                            ],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },

                in: {
                  $mergeObjects: [
                    "$$daily",
                    {
                      casecount:
                        "$$caseCountObj.goodCount", // Add the casecount from the matched object
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
  ]
}

router.get("/yearly", async (req, res) => {
  const startDate = new Date(req.query.startDate);
  const endDate = new Date(req.query.endDate);
  // Yearly dates
  const yearlyStartDate = `${startDate.getFullYear()}-01-01`;
  // Monthly dates
  const monthlyStartDate = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-01`;
  // Daily dates
  const dailyStartDate = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`;

  var groupBy = {
    line_id: "$line_id",
  }

  var yearlydata = await Project.aggregate(yearlyAggregationQuery(startDate, endDate, groupBy));
  yearlydata = yearlydata.map(obj => ({ ...obj, interval: 'yearly' }));
  var monthlydata = await Project.aggregate(yearlyAggregationQuery(monthlyStartDate, endDate, groupBy));
  monthlydata = monthlydata.map(obj => ({ ...obj, interval: 'monthly' }));
  var dailydata = await Project.aggregate(yearlyAggregationQuery(dailyStartDate, endDate, groupBy));
  dailydata = dailydata.map(obj => ({ ...obj, interval: 'daily' }));
  res.send([...yearlydata, ...monthlydata, ...dailydata]);
});

router.get("/yearlydata", async (req, res) => {
  const startDate = new Date(req.query.startDate);
  const endDate = new Date(req.query.endDate);
  // Yearly dates
  const yearlyStartDate = `${startDate.getFullYear()}-01-01`;
  // Monthly dates
  const monthlyStartDate = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-01`;
  // Daily dates
  const dailyStartDate = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`;

  var groupBy = {
    line_id: "$line_id",
  }

  var yearlydata = await Project.aggregate(yearlyLastMachineCountQuery(yearlyStartDate, monthlyStartDate, dailyStartDate, endDate, groupBy));
  // var yearlyLastMachineCount = await Project.aggregate(yearlyLastMachineCountQuery(startDate, endDate, groupBy));
  // // yearlydata = yearlydata.map(obj => ({ ...obj, interval: 'yearly' }));

  // yearlydata = yearlydata.map(obj1 => {
  //   let matchingObject = yearlyLastMachineCount.find(obj2 => obj2.line_id === obj1.line_id);
  //   return matchingObject ? { ...obj1, goodCount: matchingObject.goodCount, interval: 'yearly' } : obj1;
  // });

  // var monthlydata = await Project.aggregate(yearlyAggregationQuery(monthlyStartDate, endDate, groupBy));
  // var monthlyLastMachineCount = await Project.aggregate(yearlyLastMachineCountQuery(startDate, endDate, groupBy));

  // monthlydata = monthlydata.map(obj1 => {
  //   let matchingObject = monthlyLastMachineCount.find(obj2 => obj2.line_id === obj1.line_id);
  //   return matchingObject ? { ...obj1, goodCount: matchingObject.goodCount, interval: 'monthly' } : obj1;
  // });

  // var dailydata = await Project.aggregate(yearlyAggregationQuery(dailyStartDate, endDate, groupBy));
  // var dailyLastMachineCount = await Project.aggregate(yearlyLastMachineCountQuery(startDate, endDate, groupBy));

  // dailydata = dailydata.map(obj1 => {
  //   let matchingObject = dailyLastMachineCount.find(obj2 => obj2.line_id === obj1.line_id);
  //   return matchingObject ? { ...obj1, goodCount: matchingObject.goodCount, interval: 'daily' } : obj1;
  // });
  res.send([...yearlydata]);
});

router.get("/yearlyshiftwise", async (req, res) => {
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  var groupBy = {
    line_id: "$line_id",
    shift: "$shift",
    date: "$date",
  }
  var data = await Project.aggregate(yearlyAggregationQuery(startDate, endDate, groupBy));
  res.send(data);
});

function yearlyFinal(startDate, monthlyStartDate, dailyStartDate, endDate, groupBy) {
  return [
    {
      $match: {
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
    },
    {
      $unwind: {
        path: "$shift_wise",
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
      $lookup: {
        from: "changeovers",
        localField:
          "shift_wise.batch_wise.changeover",
        foreignField: "_id",
        as: "batch_changeover",
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
        path: "$batch_changeover",
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
      $unwind: {
        path: "$shift_wise.batch_wise.vendor_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "addlines",
        localField: "line._id",
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
    {
      $addFields: {
        case_count: {
          $arrayElemAt: [
            {
              $filter: {
                input:
                  "$shift_wise.batch_wise.vendor_wise.machine_wise",
                as: "data",
                cond: {
                  $eq: [
                    "$$data.machine_name",
                    "$addline.last_machine_count_machine",
                  ],
                },
              },
            },
            0, // Index 0 since we expect only one object
          ],
        },
      },
    },
    {
      $unwind: {
        path: "$shift_wise.batch_wise.vendor_wise.machine_wise",
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
      $match: {
        $expr: {
          $eq: [
            "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
            "$addline.critical_machine",
          ],
        },
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
        path: "$plant",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "locations",
        localField: "plant.location_id",
        foreignField: "_id",
        as: "location",
      },
    },
    {
      $unwind: {
        path: "$location",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        case_count: "$case_count.goodCount",
        line_id: "$line.line_name",
        date: {
          $dateToString: {
            date: "$date",
            // Replace "dateFieldName" with your actual date field name
            format: "%d-%m-%Y",
            // Format as dd-mm-yyyy
            timezone: "UTC",
          },
        },
        plant_id: "$plant.plant_name",
        shift: "$shift_wise.shift_name",
        machine_name: "$machine.display_name",
        machine:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
        line: "$line_id",
        goodCount: {
          $cond: [
            {
              $eq: ["$machine.product", "case"],
            },
            {
              $multiply: [
                "$fgex.bottles_per_case",
                "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
              ],
            },
            "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
          ],
        },
        cycle_count: {
          $cond: [
            {
              $eq: ["$machine.product", "case"],
            },
            {
              $multiply: [
                "$fgex.bottles_per_case",
                "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
              ],
            },
            "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
          ],
        },
        month_name: {
          $month: "$date",
        },
        year: {
          $year: "$date",
        },
        changeover_id: {
          $dateToString: {
            format: "%Y%m%d%H%M",
            date: "$batch_changeover.changeover_start_date",
            timezone: "+05:30",
          },
        },
        total_time: {
          $divide: [
            {
              $subtract: [
                "$shift_wise.batch_wise.end_timestamp",
                "$shift_wise.batch_wise.start_timestamp",
              ],
            },
            1000,
          ],
        },
        changeover: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: [
                "$$stop.stop_name",
                "changeover",
              ],
            },
          },
        },
        blocked: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "blocked"],
            },
          },
        },
        updt: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "updt"],
            },
          },
        },
        pdt: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "pdt"],
            },
          },
        },
        cip: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "cip"],
            },
          },
        },
        fault: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "fault"],
            },
          },
        },
        manual_stop: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: [
                "$$stop.stop_name",
                "manual_stop",
              ],
            },
          },
        },
        waiting: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "waiting"],
            },
          },
        },
        ready: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "ready"],
            },
          },
        },
        executing: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: [
                "$$stop.stop_name",
                "executing",
              ],
            },
          },
        },
        schedule_maintance: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: [
                "$$stop.stop_name",
                "schedule_maintance",
              ],
            },
          },
        },
        rated_speed: {
          $ifNull: ["$fgex.rated_speed", 60],
        },
        format: "$fgex.sku_number",
        bottles_per_case: "$fgex.bottles_per_case",
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
        path: "$schedule_maintance",
        preserveNullAndEmptyArrays: true,
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
        path: "$cip",
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
      $project: {
        case_count: 1,
        line_id: 1,
        date: 1,
        shift: 1,
        total_time: 1,
        goodCount: 1,
        pdt: {
          $ifNull: ["$pdt.duration", 0],
        },
        updt: {
          $ifNull: ["$updt.duration", 0],
        },
        changeover: {
          $ifNull: ["$changeover.duration", 0],
        },
        cip: {
          $ifNull: ["$cip.duration", 0],
        },
        blocked: {
          $ifNull: ["$blocked.duration", 0],
        },
        ready: {
          $ifNull: ["$ready.duration", 0],
        },
        manual_stop: {
          $ifNull: ["$manual_stop.duration", 0],
        },
        fault: {
          $ifNull: ["$fault.duration", 0],
        },
        executing: {
          $ifNull: ["$executing.duration", 0],
        },
        schedule_maintance: {
          $ifNull: [
            "$schedule_maintance.duration",
            0,
          ],
        },
        et: {
          $multiply: [
            {
              $divide: [
                "$goodCount",
                "$rated_speed",
              ],
            },
            60,
          ],
        },
        major_fault: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$fault.details",
                as: "stop",
                cond: {
                  $eq: [
                    "$$stop.duration_type",
                    "major",
                  ],
                },
              },
            },
            0,
          ],
        },
        minor_fault: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$fault.details",
                as: "stop",
                cond: {
                  $eq: [
                    "$$stop.duration_type",
                    "minor",
                  ],
                },
              },
            },
            0,
          ],
        },
        major_manual_stop: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$manual_stop.details",
                as: "stop",
                cond: {
                  $eq: [
                    "$$stop.duration_type",
                    "major",
                  ],
                },
              },
            },
            0,
          ],
        },
        minor_manual_stop: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$manual_stop.details",
                as: "stop",
                cond: {
                  $eq: [
                    "$$stop.duration_type",
                    "minor",
                  ],
                },
              },
            },
            0,
          ],
        },
      },
    },
    {
      $project: {
        case_count: 1,
        line_id: 1,
        date: 1,
        shift: 1,
        total_time: 1,
        goodCount: 1,
        pdt: 1,
        updt: 1,
        changeover: 1,
        cip: 1,
        blocked: 1,
        ready: 1,
        manual_stop: 1,
        fault: 1,
        executing: 1,
        schedule_maintance: 1,
        major_fault: {
          $ifNull: ["$major_fault.duration", 0],
        },
        minor_fault: {
          $ifNull: ["$minor_fault.duration", 0],
        },
        major_manual_stop: {
          $ifNull: [
            "$major_manual_stop.duration",
            0,
          ],
        },
        minor_manual_stop: {
          $ifNull: [
            "$minor_manual_stop.duration",
            0,
          ],
        },
        et: 1,
      },
    },
    {
      $group: {
        _id: {
          line_id: "$line_id",
          shift: "$shift",
          date: "$date",
        },
        case_count: {
          $sum: "$case_count",
        },
        goodCount: {
          $sum: "$goodCount",
        },
        total_time: {
          $sum: "$total_time",
        },
        pdt: {
          $sum: "$pdt",
        },
        updt: {
          $sum: "$updt",
        },
        changeover: {
          $sum: "$changeover",
        },
        cip: {
          $sum: "$cip",
        },
        blocked: {
          $sum: "$blocked",
        },
        ready: {
          $sum: "$ready",
        },
        manual_stop: {
          $sum: "$manual_stop",
        },
        minor_manual_stop: {
          $sum: "$minor_manual_stop",
        },
        major_manual_stop: {
          $sum: "$major_manual_stop",
        },
        fault: {
          $sum: "$fault",
        },
        minor_fault: {
          $sum: "$minor_fault",
        },
        major_fault: {
          $sum: "$major_fault",
        },
        executing: {
          $sum: "$executing",
        },
        schedule_maintance: {
          $sum: "$schedule_maintance",
        },
        et: {
          $sum: "$et",
        },
      },
    },
    {
      $project: {
        _id: 0,
        case_count: 1,
        goodCount: 1,
        total_time: 1,
        pdt: 1,
        updt: 1,
        changeover: 1,
        cip: 1,
        blocked: 1,
        ready: 1,
        manual_stop: 1,
        minor_manual_stop: 1,
        major_manual_stop: 1,
        fault: 1,
        minor_fault: 1,
        major_fault: 1,
        executing: 1,
        schedule_maintenance: 1,
        et: 1,
        line_id: "$_id.line_id",
        date: "$_id.date",
        shift: "$_id.shift",
      },
    },
  ]
}

router.get("/yearlyfinal", async (req, res) => {
  const startDate = new Date(req.query.startDate);
  const endDate = new Date(req.query.endDate);
  // Yearly dates
  const yearlyStartDate = `${startDate.getFullYear()}-01-01`;
  // Monthly dates
  const monthlyStartDate = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-01`;
  // Daily dates
  const dailyStartDate = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`;

  var groupBy = {
    line_id: "$line_id",
  }

  var yearlydata = await Project.aggregate(yearlyFinal(startDate, monthlyStartDate, dailyStartDate, endDate, groupBy));
  res.send([...yearlydata]);
});

function yearlyFinalDashboard(startDate, endDate) {
  return [
    {
      $match: {
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
    },
  {
    $unwind: {
      path: "$shift_wise"
    }
  },
  {
    $unwind: {
      path: "$shift_wise.batch_wise",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $lookup: {
      from: "batchskutriggers",
      localField: "shift_wise.batch_wise.batch",
      foreignField: "_id",
      as: "batch"
    }
  },
  {
    $lookup: {
      from: "changeovers",
      localField:
        "shift_wise.batch_wise.changeover",
      foreignField: "_id",
      as: "batch_changeover"
    }
  },
  {
    $unwind: {
      path: "$batch",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $unwind: {
      path: "$batch_changeover",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $lookup: {
      from: "fgexes",
      localField: "batch.product_name",
      foreignField: "_id",
      as: "fgex"
    }
  },
  {
    $unwind: {
      path: "$fgex",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $lookup: {
      from: "lines",
      localField: "line_id",
      foreignField: "_id",
      as: "line"
    }
  },
  {
    $unwind: {
      path: "$line",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $unwind: {
      path: "$shift_wise.batch_wise.vendor_wise",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $lookup: {
      from: "addlines",
      localField: "line._id",
      foreignField: "line_id",
      as: "addline"
    }
  },
  {
    $unwind: {
      path: "$addline",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $addFields: {
      case_count: {
        $arrayElemAt: [
          {
            $filter: {
              input:
                "$shift_wise.batch_wise.vendor_wise.machine_wise",
              as: "data",
              cond: {
                $eq: [
                  "$$data.machine_name",
                  "$addline.last_machine_count_machine"
                ]
              }
            }
          },
          0 // Index 0 since we expect only one object
        ]
      }
    }
  },
  {
    $unwind: {
      path: "$shift_wise.batch_wise.vendor_wise.machine_wise",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $lookup: {
      from: "plants",
      localField: "line.plant_id",
      foreignField: "_id",
      as: "plant"
    }
  },
  {
    $match: {
      $expr: {
        $eq: [
          "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
          "$addline.critical_machine"
        ]
      }
    }
  },
  {
    $unwind: {
      path: "$changeover_type",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $unwind: {
      path: "$plant",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $lookup: {
      from: "locations",
      localField: "plant.location_id",
      foreignField: "_id",
      as: "location"
    }
  },
  {
    $unwind: {
      path: "$location",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $project: {
      case_count: "$case_count.goodCount",
      line_name: "$line.line_name",
      line: "$line_id",
      line_code: "$line.line_code",
      date: {
        $dateToString: {
          date: "$date",
          // Replace "dateFieldName" with your actual date field name
          format: "%d-%m-%Y",
          // Format as dd-mm-yyyy
          timezone: "UTC"
        }
      },
      plant_id: "$plant.plant_name",
      shift: "$shift_wise.shift_name",
      machine_name: "$machine.display_name",
      machine:
        "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
      line_id: "$line_id",
      goodCount: {
        $cond: [
          {
            $eq: ["$machine.product", "case"]
          },
          {
            $multiply: [
              "$fgex.bottles_per_case",
              "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount"
            ]
          },
          "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount"
        ]
      },
      cycle_count: {
        $cond: [
          {
            $eq: ["$machine.product", "case"]
          },
          {
            $multiply: [
              "$fgex.bottles_per_case",
              "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count"
            ]
          },
          "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count"
        ]
      },
      month_name: {
        $month: "$date"
      },
      year: {
        $year: "$date"
      },
      changeover_id: {
        $dateToString: {
          format: "%Y%m%d%H%M",
          date: "$batch_changeover.changeover_start_date",
          timezone: "+05:30"
        }
      },
      total_time: {
        $divide: [
          {
            $subtract: [
              "$shift_wise.batch_wise.end_timestamp",
              "$shift_wise.batch_wise.start_timestamp"
            ]
          },
          1000
        ]
      },
      changeover: {
        $filter: {
          input:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
          as: "stop",
          cond: {
            $eq: [
              "$$stop.stop_name",
              "changeover"
            ]
          }
        }
      },
      blocked: {
        $filter: {
          input:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
          as: "stop",
          cond: {
            $eq: ["$$stop.stop_name", "blocked"]
          }
        }
      },
      updt: {
        $filter: {
          input:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
          as: "stop",
          cond: {
            $eq: ["$$stop.stop_name", "updt"]
          }
        }
      },
      pdt: {
        $filter: {
          input:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
          as: "stop",
          cond: {
            $eq: ["$$stop.stop_name", "pdt"]
          }
        }
      },
      cip: {
        $filter: {
          input:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
          as: "stop",
          cond: {
            $eq: ["$$stop.stop_name", "cip"]
          }
        }
      },
      fault: {
        $filter: {
          input:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
          as: "stop",
          cond: {
            $eq: ["$$stop.stop_name", "fault"]
          }
        }
      },
      manual_stop: {
        $filter: {
          input:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
          as: "stop",
          cond: {
            $eq: [
              "$$stop.stop_name",
              "manual_stop"
            ]
          }
        }
      },
      waiting: {
        $filter: {
          input:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
          as: "stop",
          cond: {
            $eq: ["$$stop.stop_name", "waiting"]
          }
        }
      },
      ready: {
        $filter: {
          input:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
          as: "stop",
          cond: {
            $eq: ["$$stop.stop_name", "ready"]
          }
        }
      },
      executing: {
        $filter: {
          input:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
          as: "stop",
          cond: {
            $eq: ["$$stop.stop_name", "executing"]
          }
        }
      },
      schedule_maintance: {
        $filter: {
          input:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
          as: "stop",
          cond: {
            $eq: [
              "$$stop.stop_name",
              "schedule_maintance"
            ]
          }
        }
      },
      rated_speed: {
        $ifNull: ["$fgex.rated_speed", 60]
      },
      format: "$fgex.sku_number",
      bottles_per_case: "$fgex.bottles_per_case"
    }
  },
  {
    $unwind: {
      path: "$fault",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $unwind: {
      path: "$schedule_maintance",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $unwind: {
      path: "$waiting",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $unwind: {
      path: "$changeover",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $unwind: {
      path: "$pdt",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $unwind: {
      path: "$cip",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $unwind: {
      path: "$updt",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $unwind: {
      path: "$blocked",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $unwind: {
      path: "$manual_stop",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $unwind: {
      path: "$fault",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $unwind: {
      path: "$ready",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $unwind: {
      path: "$executing",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $project: {
      case_count: 1,
      line_id: 1,
      line_name: 1,
      line_code: 1,
      line: 1,
      date: 1,
      shift: 1,
      total_time: 1,
      goodCount: 1,
      pdt: {
        $ifNull: ["$pdt.duration", 0]
      },
      updt: {
        $ifNull: ["$updt.duration", 0]
      },
      changeover: {
        $ifNull: ["$changeover.duration", 0]
      },
      cip: {
        $ifNull: ["$cip.duration", 0]
      },
      blocked: {
        $ifNull: ["$blocked.duration", 0]
      },
      ready: {
        $ifNull: ["$ready.duration", 0]
      },
      manual_stop: {
        $ifNull: ["$manual_stop.duration", 0]
      },
      fault: {
        $ifNull: ["$fault.duration", 0]
      },
      executing: {
        $ifNull: ["$executing.duration", 0]
      },
      schedule_maintance: {
        $ifNull: [
          "$schedule_maintance.duration",
          0
        ]
      },
      et: {
        $multiply: [
          {
            $divide: [
              "$goodCount",
              "$rated_speed"
            ]
          },
          60
        ]
      },
      major_fault: {
        $arrayElemAt: [
          {
            $filter: {
              input: "$fault.details",
              as: "stop",
              cond: {
                $eq: [
                  "$$stop.duration_type",
                  "major"
                ]
              }
            }
          },
          0
        ]
      },
      minor_fault: {
        $arrayElemAt: [
          {
            $filter: {
              input: "$fault.details",
              as: "stop",
              cond: {
                $eq: [
                  "$$stop.duration_type",
                  "minor"
                ]
              }
            }
          },
          0
        ]
      },
      major_manual_stop: {
        $arrayElemAt: [
          {
            $filter: {
              input: "$manual_stop.details",
              as: "stop",
              cond: {
                $eq: [
                  "$$stop.duration_type",
                  "major"
                ]
              }
            }
          },
          0
        ]
      },
      minor_manual_stop: {
        $arrayElemAt: [
          {
            $filter: {
              input: "$manual_stop.details",
              as: "stop",
              cond: {
                $eq: [
                  "$$stop.duration_type",
                  "minor"
                ]
              }
            }
          },
          0
        ]
      }
    }
  },
  {
    $project: {
      case_count: 1,
      line_name: 1,
      line_id: 1,
      line_code: 1,
      date: 1,
      shift: 1,
      total_time: 1,
      goodCount: 1,
      pdt: 1,
      updt: 1,
      changeover: 1,
      cip: 1,
      blocked: 1,
      ready: 1,
      manual_stop: 1,
      fault: 1,
      executing: 1,
      schedule_maintance: 1,
      major_fault: {
        $ifNull: ["$major_fault.duration", 0]
      },
      minor_fault: {
        $ifNull: ["$minor_fault.duration", 0]
      },
      major_manual_stop: {
        $ifNull: [
          "$major_manual_stop.duration",
          0
        ]
      },
      minor_manual_stop: {
        $ifNull: [
          "$minor_manual_stop.duration",
          0
        ]
      },
      et: 1
    }
  },
  {
    $group: {
      _id: {
        line_id: "$line_id",
        line_name: "$line_name",
        line_code: "$line_code"
        
      },
      case_count: {
        $sum: "$case_count"
      },
      goodCount: {
        $sum: "$goodCount"
      },
      total_time: {
        $sum: "$total_time"
      },
      pdt: {
        $sum: "$pdt"
      },
      updt: {
        $sum: "$updt"
      },
      changeover: {
        $sum: "$changeover"
      },
      cip: {
        $sum: "$cip"
      },
      blocked: {
        $sum: "$blocked"
      },
      ready: {
        $sum: "$ready"
      },
      manual_stop: {
        $sum: "$manual_stop"
      },
      minor_manual_stop: {
        $sum: "$minor_manual_stop"
      },
      major_manual_stop: {
        $sum: "$major_manual_stop"
      },
      fault: {
        $sum: "$fault"
      },
      minor_fault: {
        $sum: "$minor_fault"
      },
      major_fault: {
        $sum: "$major_fault"
      },
      executing: {
        $sum: "$executing"
      },
      schedule_maintance: {
        $sum: "$schedule_maintance"
      },
      et: {
        $sum: "$et"
      }
    }
  },
  {
    $project: {
      _id: 0,
      case_count: 1,
      goodCount: 1,
      total_time: 1,
      pdt: 1,
      updt: 1,
      changeover: 1,
      cip: 1,
      blocked: 1,
      ready: 1,
      manual_stop: 1,
      minor_manual_stop: 1,
      major_manual_stop: 1,
      fault: 1,
      minor_fault: 1,
      major_fault: 1,
      executing: 1,
      schedule_maintenance: 1,
      et: 1,
      line_id: "$_id.line_id",
      line_name: "$_id.line_name",
      line_code: "$_id.line_code",
      date: "$_id.date",
      shift: "$_id.shift"
    }
  }
]
}

router.get("/yearlyFinalDashboard", async (req, res) => {
  const startDate = new Date(req.query.startDate);
  const endDate = new Date(req.query.endDate);

  // Monthly dates
  const monthlyStartDate = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-01`;
  // Daily dates
  const dailyStartDate = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`;


  var yearlydata = await Project.aggregate(yearlyFinalDashboard(startDate, endDate));
  var monthlydata = await Project.aggregate(yearlyFinalDashboard(monthlyStartDate, endDate));
  var dailydata = await Project.aggregate(yearlyFinalDashboard(dailyStartDate, endDate));

  const mergedData = { yearlydata, monthlydata, dailydata };
  
  //console.log(mergedData);
  res.send([mergedData]);
});

function getDailySensorData(queryDate)
{
  return [
    {
      $match: {
         date: new Date(queryDate),
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
      $unwind: {
        path: "$time_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$time_wise.data",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        line_code: "$line.line_code",
        start_timestamp:
          "$time_wise.start_timestamp",
        end_timestamp: "$time_wise.end_timestamp",
        machine_code:
          "$time_wise.data.machine_name",
        good_count: "$time_wise.data.goodcount",
      },
    },
    {
      $group: {
        _id: {
          line_code: "$line_code",
          start_timestamp: "$start_timestamp",
          end_timestamp: "$end_timestamp",
        },
        machines: {
          $push: {
            machine_code: "$machine_code",
            good_count: "$good_count",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        line_code: "$_id.line_code",
        start: {
          $dateToString: {
            format: "%Y-%m-%d %H:%M:%S",
            date: "$_id.start_timestamp",
            timezone: "+05:30",
          },
        },
        end: {
          $dateToString: {
            format: "%Y-%m-%d %H:%M:%S",
            date: "$_id.end_timestamp",
            timezone: "+05:30",
          },
        },
        data: "$machines",
        originalStart: "$_id.start_timestamp"
      },
    },
    {
      $sort: {
        originalStart: 1 // Sort in ascending order; use -1 for descending
      }
    },
    {
      $group: {
        _id: "$line_code",
        machines: {
          $push: {
            start: "$start",
            end: "$end",
            data: "$data",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        line_code: "$_id",
        sensor_data: "$machines",
      },
    },
  ]
}

const apiKey = "8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e";//process.env.API_KEY; // Store this securely in an environment variable

const validateApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (key && key === apiKey) {
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
};

// Middleware for input validation
const validateQueryDate = (req, res, next) => {
  const date = req.query.date;
  if (date && !isNaN(new Date(date).getTime())) {
    next();
  } else {
    res.status(400).send('Invalid date format');
  }
};

router.get('/datewise-sensordata', validateApiKey, validateQueryDate, async (req, res) => {
  const queryDate = new Date(req.query.date);
  try {
    const data = await History.aggregate(getDailySensorData(queryDate));
    res.send(data);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.get("/day", async (req, res) => {
  var line_id = req.query.line_id;
  var date = req.query.date;
  getDayWiseReport(line_id, date, (data) => {
    res.send(data);
  })
  //res.send(data);
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
  ready,
  schedule_maintance,
  waitingCriticaloff,
  blockedCriticaloff,
  readyCriticaloff,
  minor_manual_stopCriticaloff,
  cip
) {
  var data = {};
  var total_count = goodCount + reject_count;
  //working time is PPT
  var working_time = total_batch_time - pdt - updt - schedule_maintance - cip - changeover;
  if (working_time < 70) {
    working_time = 0;
  }
  //production time : GOT
  var production_time =
    working_time - major_fault - major_manual_stop;
  if (production_time < 70) {
    production_time = 0;
  }
  var performance_time = production_time - total_count / rated_speed;
  var reject_time = Math.floor(reject_count / rated_speed);
  var changeover_wastage_time = Math.floor(changeover_reject / rated_speed);
  var idle_time = blocked + waiting + minor_manual_stop + minor_fault + ready;
  //var idle_time = (blocked - blockedCriticaloff) + (waiting - minor_manual_stopCriticaloff) + minor_manual_stop + minor_fault + (ready - readyCriticaloff);
  //console.log(performance_time)
  var speed_loss = performance_time - idle_time;
  var net_operating_time = production_time - idle_time - speed_loss;
  var productive_time = net_operating_time - reject_time; //- changeover_wastage_time;
  data.working_time_sec = working_time;
  data.production_time_sec = production_time;
  data.performance_time_sec = performance_time;
  data.reject_time_sec = reject_time;
  data.idle_time_sec = idle_time;
  data.speed_loss_sec = speed_loss;
  data.net_operating_time_sec = net_operating_time;
  data.productive_time_sec = productive_time;
  data.performance = checkValidation(
    total_count / (rated_speed * working_time)
  );
  data.quality = checkValidation(goodCount / total_count);
  data.aviability = checkValidation(production_time / working_time);
  data.idel_time = convertHHMM(idle_time);
  data.working_time = convertHHMM(working_time);
  data.speed_loss = convertHHMM(Math.floor(speed_loss));
  data.performance_time = convertHHMM(Math.floor(performance_time));
  data.oee = data.quality * data.aviability * data.performance;
  data.mtbf = convertHHMM(
    MttrValidation(
      Math.round(working_time - major_fault - minor_fault / major_fault_count)
    )
  );
  data.mttr = convertHHMM(
    MttrValidation(Math.round(major_fault / major_fault_count))
  );
  data.production_time = convertHHMM(Math.round(production_time));
  data.total_time = convertHHMM(total_batch_time);
  data.reject_time = convertHHMM(reject_time);
  data.changeover_wastage_time = convertHHMM(changeover_wastage_time);
  data.net_operating_time = convertHHMM(Math.floor(net_operating_time));
  data.productive_time = convertHHMM(Math.floor(productive_time));

  var npt = total_batch_time - pdt;
  var et = total_count / rated_speed;
  if (npt < 70) {
    npt = 0;
  }
  var me = checkValidation(et / (npt - cip - changeover));

  var sle = checkValidation(et / npt);
  data.et = MttrValidation(et);
  data.npt = MttrValidation(npt);
  data.me = (MttrValidation(me * 100)).toFixed(2);
  data.sle = (MttrValidation(sle * 100)).toFixed(2);
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
  productive_time,
  npt,
  et,
  cip,
  changeover,
) {
  var data = {};
  if (npt < 70) {
    npt = 0;
  }
  var me = checkValidation(et/ (npt - cip - changeover));
  var sle = checkValidation(et / npt);
  var speed_loss = performance_time - idle_time;
  data.performance = checkValidation(net_operating_time / got_time);
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
  data.npt = convertHHMM(Math.floor(npt));
  data.et = convertHHMM(Math.floor(et));
  data.me = (MttrValidation(me) * 100).toFixed(2);
  data.sle = (MttrValidation(sle) * 100).toFixed(2);
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
  s = Math.round(totalSeconds % 60);
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

//----------------------------------added on 10th Dec 2024---------------------------
function yearlyFromOutputReport(startDate, monthlyStartDate, dailyStartDate, endDate, groupBy) {
  return [
    {
      $match: {
        $and: [
          {
            date: {
              $lte: new Date(endDate)
            }
          },
          {
            date: {
              $gte: new Date(startDate)
            }
          }
        ]
      }
    },
    {
      $unwind: {
        path: "$shift_wise"
      }
    },
    {
      $unwind: {
        path: "$shift_wise.batch_wise",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: "batchskutriggers",
        localField: "shift_wise.batch_wise.batch",
        foreignField: "_id",
        as: "batch"
      }
    },
    {
      $lookup: {
        from: "changeovers",
        localField:
          "shift_wise.batch_wise.changeover",
        foreignField: "_id",
        as: "batch_changeover"
      }
    },
    {
      $unwind: {
        path: "$batch",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$batch_changeover",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: "fgexes",
        localField: "batch.product_name",
        foreignField: "_id",
        as: "fgex"
      }
    },
    {
      $unwind: {
        path: "$fgex",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: "lines",
        localField: "line_id",
        foreignField: "_id",
        as: "line"
      }
    },
    {
      $unwind: {
        path: "$line",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$shift_wise.batch_wise.vendor_wise",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: "addlines",
        localField: "line._id",
        foreignField: "line_id",
        as: "addline"
      }
    },
    {
      $unwind: {
        path: "$addline",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $addFields: {
        case_count: {
          $arrayElemAt: [
            {
              $filter: {
                input:
                  "$shift_wise.batch_wise.vendor_wise.machine_wise",
                as: "data",
                cond: {
                  $eq: [
                    "$$data.machine_name",
                    "$addline.last_machine_count_machine"
                  ]
                }
              }
            },
            0 // Index 0 since we expect only one object
          ]
        }
      }
    },
    {
      $unwind: {
        path: "$shift_wise.batch_wise.vendor_wise.machine_wise",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: "plants",
        localField: "line.plant_id",
        foreignField: "_id",
        as: "plant"
      }
    },
    {
      $match: {
        $expr: {
          $eq: [
            "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
            "$addline.critical_machine"
          ]
        }
      }
    },
    {
      $unwind: {
        path: "$changeover_type",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$plant",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: "locations",
        localField: "plant.location_id",
        foreignField: "_id",
        as: "location"
      }
    },
    {
      $unwind: {
        path: "$location",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        case_count: "$case_count.goodCount",
        line_id: "$line.line_name",
        line: "$line._id",
        date: {
          $dateToString: {
            date: "$date",
            // Replace "dateFieldName" with your actual date field name
            format: "%d-%m-%Y",
            // Format as dd-mm-yyyy
            timezone: "UTC"
          }
        },
        plant_id: "$plant.plant_name",
        shift: "$shift_wise.shift_name",
        machine_name: "$machine.display_name",
        machine:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
        goodCount: {
          $cond: [
            {
              $eq: ["$machine.product", "case"]
            },
            {
              $multiply: [
                "$fgex.bottles_per_case",
                "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount"
              ]
            },
            "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount"
          ]
        },
        cycle_count: {
          $cond: [
            {
              $eq: ["$machine.product", "case"]
            },
            {
              $multiply: [
                "$fgex.bottles_per_case",
                "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count"
              ]
            },
            "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count"
          ]
        },
        month_name: {
          $month: "$date"
        },
        year: {
          $year: "$date"
        },
        changeover_id: {
          $dateToString: {
            format: "%Y%m%d%H%M",
            date: "$batch_changeover.changeover_start_date",
            timezone: "+05:30"
          }
        },
        total_time: {
          $divide: [
            {
              $subtract: [
                "$shift_wise.batch_wise.end_timestamp",
                "$shift_wise.batch_wise.start_timestamp"
              ]
            },
            1000
          ]
        },
        changeover: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: [
                "$$stop.stop_name",
                "changeover"
              ]
            }
          }
        },
        blocked: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "blocked"]
            }
          }
        },
        updt: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "updt"]
            }
          }
        },
        pdt: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "pdt"]
            }
          }
        },
        cip: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "cip"]
            }
          }
        },
        fault: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "fault"]
            }
          }
        },
        manual_stop: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: [
                "$$stop.stop_name",
                "manual_stop"
              ]
            }
          }
        },
        waiting: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "waiting"]
            }
          }
        },
        ready: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "ready"]
            }
          }
        },
        executing: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: ["$$stop.stop_name", "executing"]
            }
          }
        },
        schedule_maintance: {
          $filter: {
            input:
              "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: {
              $eq: [
                "$$stop.stop_name",
                "schedule_maintance"
              ]
            }
          }
        },
        rated_speed: {
          $ifNull: ["$fgex.rated_speed", 60]
        },
        format: "$fgex.sku_number",
        bottles_per_case: "$fgex.bottles_per_case"
      }
    },
    {
      $unwind: {
        path: "$fault",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$schedule_maintance",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$waiting",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$changeover",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$pdt",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$cip",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$updt",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$blocked",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$manual_stop",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$fault",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$ready",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$executing",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        case_count: 1,
        line_id: 1,
        line: 1,
        date: 1,
        shift: 1,
        total_time: 1,
        goodCount: 1,
        pdt: {
          $ifNull: ["$pdt.duration", 0]
        },
        updt: {
          $ifNull: ["$updt.duration", 0]
        },
        changeover: {
          $ifNull: ["$changeover.duration", 0]
        },
        cip: {
          $ifNull: ["$cip.duration", 0]
        },
        blocked: {
          $ifNull: ["$blocked.duration", 0]
        },
        ready: {
          $ifNull: ["$ready.duration", 0]
        },
        manual_stop: {
          $ifNull: ["$manual_stop.duration", 0]
        },
        fault: {
          $ifNull: ["$fault.duration", 0]
        },
        executing: {
          $ifNull: ["$executing.duration", 0]
        },
        schedule_maintance: {
          $ifNull: [
            "$schedule_maintance.duration",
            0
          ]
        },
        et: {
          $multiply: [
            {
              $divide: [
                "$goodCount",
                "$rated_speed"
              ]
            },
            60
          ]
        },
        major_fault: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$fault.details",
                as: "stop",
                cond: {
                  $eq: [
                    "$$stop.duration_type",
                    "major"
                  ]
                }
              }
            },
            0
          ]
        },
        minor_fault: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$fault.details",
                as: "stop",
                cond: {
                  $eq: [
                    "$$stop.duration_type",
                    "minor"
                  ]
                }
              }
            },
            0
          ]
        },
        major_manual_stop: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$manual_stop.details",
                as: "stop",
                cond: {
                  $eq: [
                    "$$stop.duration_type",
                    "major"
                  ]
                }
              }
            },
            0
          ]
        },
        minor_manual_stop: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$manual_stop.details",
                as: "stop",
                cond: {
                  $eq: [
                    "$$stop.duration_type",
                    "minor"
                  ]
                }
              }
            },
            0
          ]
        }
      }
    },
    {
      $project: {
        case_count: 1,
        line_id: 1,
        line: 1,
        date: 1,
        shift: 1,
        total_time: 1,
        goodCount: 1,
        pdt: 1,
        updt: 1,
        changeover: 1,
        cip: 1,
        blocked: 1,
        ready: 1,
        manual_stop: 1,
        fault: 1,
        executing: 1,
        schedule_maintance: 1,
        major_fault: {
          $ifNull: ["$major_fault.duration", 0]
        },
        minor_fault: {
          $ifNull: ["$minor_fault.duration", 0]
        },
        major_manual_stop: {
          $ifNull: [
            "$major_manual_stop.duration",
            0
          ]
        },
        minor_manual_stop: {
          $ifNull: [
            "$minor_manual_stop.duration",
            0
          ]
        },
        et: 1
      }
    },
    {
      $group: {
        _id: {
          line_id: "$line_id",
          shift: "$shift",
          date: "$date",
          line: "$line"
        },
        case_count: {
          $sum: "$case_count"
        },
        goodCount: {
          $sum: "$goodCount"
        },
        total_time: {
          $sum: "$total_time"
        },
        pdt: {
          $sum: "$pdt"
        },
        updt: {
          $sum: "$updt"
        },
        changeover: {
          $sum: "$changeover"
        },
        cip: {
          $sum: "$cip"
        },
        blocked: {
          $sum: "$blocked"
        },
        ready: {
          $sum: "$ready"
        },
        manual_stop: {
          $sum: "$manual_stop"
        },
        minor_manual_stop: {
          $sum: "$minor_manual_stop"
        },
        major_manual_stop: {
          $sum: "$major_manual_stop"
        },
        fault: {
          $sum: "$fault"
        },
        minor_fault: {
          $sum: "$minor_fault"
        },
        major_fault: {
          $sum: "$major_fault"
        },
        executing: {
          $sum: "$executing"
        },
        schedule_maintance: {
          $sum: "$schedule_maintance"
        },
        et: {
          $sum: "$et"
        }
      }
    },
    {
      $project: {
        _id: 0,
        case_count: 1,
        goodCount: 1,
        //total_time: 1,
        //pdt: 1,
        //updt: 1,
        //changeover: 1,
        //cip: 1,
        //blocked: 1,
        //ready: 1,
        //manual_stop: 1,
        //minor_manual_stop: 1,
        //major_manual_stop: 1,
        //fault: 1,
        //minor_fault: 1,
        //major_fault: 1,
        //executing: 1,
        //schedule_maintenance: 1,
        //et: 1,
        line_id: "$_id.line",
        //line_id: "$_id.line_id",
        date: "$_id.date",
        shift: "$_id.shift"
      }
    }
  ]
}

function HourlyGrouppedByDateShift(startDate, endDate) {
  return [
    {
      $match: {
        $and: [
          {
            date: {
              $lte: new Date(endDate)
            }
          },
          {
            date: {
              $gte: new Date(startDate)
            }
          }
        ]
      }
    },
    {
      $lookup: {
        from: "addlines",
        localField: "line_id",
        foreignField: "line_id",
        as: "addline"
      }
    },
    {
      $unwind: {
        path: "$addline",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: "$time_wise" // Unwind the array time_wise
    },
    {
      $unwind: "$time_wise.data" // Unwind the array inside time_wise.data
    },
    {
      $group: {
        _id: {
          line_id: "$line_id",
          shift: "$shift",
          date: "$date"
        },
        goodcount: {
          $sum: {
            $cond: [
              {
                $eq: [
                  "$time_wise.data.machine_name",
                  "$addline.critical_machine" // Use dynamic critical_machine
                ]
              },
              "$time_wise.data.goodcount",
              0
            ]
          }
        },
        case_count: {
          $sum: {
            $cond: [
              {
                $eq: [
                  "$time_wise.data.machine_name",
                  "$addline.last_machine_count_machine" // Use dynamic last_machine
                ]
              },
              "$time_wise.data.goodcount",
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        line_id: {
          $toString: "$_id.line_id"
        },
        shift: "$_id.shift",
        date: {
          $dateToString: {
            date: "$_id.date",
            format: "%d-%m-%Y",
            timezone: "UTC"
          }
        },
        goodCount: "$goodcount",
        case_count: 1
      }
    }
  ];
}


router.get("/HourlyGrouppedByDateShift", async (req, res) => {
  const startDate = new Date(req.query.startDate);
  const endDate = new Date(req.query.endDate);
  // Yearly dates
  const yearlyStartDate = `${startDate.getFullYear()}-01-01`;
  // Monthly dates
  const monthlyStartDate = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-01`;
  // Daily dates
  const dailyStartDate = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`;

  var groupBy = {
    line_id: "$line_id",
  }

  var yearlydata = await Project.aggregate(yearlyFromOutputReport(startDate, monthlyStartDate, dailyStartDate, endDate, groupBy));
  var hourlyGrouppedData = await History.aggregate(HourlyGrouppedByDateShift(startDate, endDate));
  const result = subtractOutputs(yearlydata, hourlyGrouppedData);
  res.send([...result]);
});

router.get("/matchCount", async (req, res) => {
  try {
    const { line_id, start_date, end_date } = req.query;
    const result = await adjustMatchCount(line_id, start_date, end_date);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error adjusting data:", error);
    res.status(500).json({ error: error.message || "An error occurred." });
  }
});

const subtractOutputs = (output1, output2) => {
  // Create a map from second output for quick look-up
  const secondOutputMap = new Map(
    output2.map(item => [
      `${item.line_id}-${item.date}-${item.shift}`,
      item
    ])
  );

  // Process the first output
  return output1.map(item => {
    const key = `${item.line_id}-${item.date}-${item.shift}`;
    const secondItem = secondOutputMap.get(key);

    if (secondItem) {
      return {
        ...item,
        case_count: item.case_count - secondItem.case_count,
        goodCount: item.goodCount - secondItem.goodCount
      };
    }

    return { ...item }; // No matching record in the second output
  });
};


module.exports = router;
