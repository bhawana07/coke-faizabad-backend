var express = require("express");
var mongoose = require("mongoose");
var moment = require("moment");
var {TempGood} = require("../model/goodTemp.model");
var {Connection} = require("../model/connection.model");
var { CurrentShift, updateShiftPosition } = require("../model/shift.model");
var router = express.Router();


router.get("/header", async (req, res) => {
  var line_id = req.query.line_id;
  try{
  const senddata = await TempGood.aggregate([
    {
      $match:{
        line_id:line_id
      }
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
        path: "$line_data",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match:{
        machine:"$line_data.critical_machine"
      }
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
        from: "fgexes",
        localField: "currnt_batch",
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
  ])
  res.send(senddata)
  }catch(err){
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});


module.exports = router;
