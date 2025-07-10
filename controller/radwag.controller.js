var express = require("express");
var router = express.Router();
var { Radwag } = require("../model/radwag.model");
var {
  Batchskutrigger,
} = require("../model/batch.model");
var { FGEX } = require("../model/fgex.model");
var { Que } = require("../model/que.model");
//post api for sap


router.post("/", async (req, res) => {
  try {
    const authHeader = req.headers["auth-token"] || req.headers["Auth-Token"];
    if (!authHeader || authHeader !== "sfw0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiK8") {
      return res.status(401).json({
        status: "Unauthorized",
        message: "Please send a valid token",
      });
    }

    const { recipe_name, recipe_code, batch_number, postApiHitFrom } = req.body;
    const data = req.body;

    if (!recipe_code) {
      return res.status(401).json({
        status: "error",
        res: "Radwag validation failed: recipe_code: Path `recipe_code` is required.",
      });
    }

    const existingData = await Radwag.findOne({ recipe_name, recipe_code, batch_number });

    if (existingData) {
      const updatedData = await Radwag.findOneAndUpdate(
        { recipe_name, recipe_code, batch_number },
        data,
        { runValidators: true, new: true }
      );

      return res.status(200).json({
        status: "ok",
        res: updatedData,
      });
    } else {
      const newRecord = new Radwag(req.body);
      const save = await newRecord.save();

      return res.status(200).json({
        status: "Ok",
        res: save,
      });
    }
  } catch (error) {
    res.status(402).json({
      status: "error",
      res: error.message,
    });
  }
});




router.get("/", async (req, res) => {
  var token = req.query.token;
  if (token == "sfw0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ8") {
    var data = await Sap.aggregate([
      // {
      //   $match: {
      //     current_status: {
      //       $in: ["unassign", "early_batch_end"],
      //     },
      //     HalbCode: {
      //       $ne: null,
      //     },
      //   },
      // },
      // {
      //   $lookup: {
      //     from: "fgexes",
      //     let: { halb_code: "$HalbCode", fgex: "$ProductCode" },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: {
      //             $and: [
      //               {
      //                 $eq: ["$halb_code", "$$halb_code"],
      //               },
      //               {
      //                 $eq: ["$fgex", "$$fgex"],
      //               },
      //             ],
      //           },
      //         },
      //       },
      //     ],
      //     as: "fgex",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$fgex",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $project: {
      //     isUsed: 1,
      //     postApiHitFrom: 1,
      //     PONumber: 1,
      //     LOTNumber: 1,
      //     HalbCode: 1,
      //     LOTSize: 1,
      //     PlantCode: 1,
      //     ProductCode: 1,
      //     ProductDescription: 1,
      //     status: "$current_status",
      //     UpdateTimestamp: 1,
      //     createdAt: 1,
      //     updatedAt: 1,
      //     ratedSpeed: {
      //       $ifNull: ["$fgex.rated_speed", null],
      //     },
      //     layout: {
      //       $ifNull: ["$fgex.layout_no", null],
      //     },
      //     ProductName: {
      //       $ifNull: ["$fgex.product_name", null],
      //     },
      //   },
      // },
      {
        $sort:{
          _id:-1
        }
      }
    ]);
    var send_data = [];
    data.forEach((fgex,i)=>{
      if(fgex.HalbCode && (fgex.current_status  == "unassign" || fgex.current_status  == "early_batch_end")){
        fgex. status = fgex.current_status;
         send_data.push(fgex)
      }
      if(i+1 == data.length){
        res.send(send_data);
      }
    })
  } else {
    res.send("you are not authorized to access data");
  }
});



module.exports = router;
