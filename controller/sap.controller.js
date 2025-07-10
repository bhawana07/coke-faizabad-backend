var express = require("express");
var router = express.Router();
var { Sap } = require("../model/sap.model");
var { Employee } = require("../model/employee.model");
var {
  Batchskutrigger,
} = require("../model/batch.model");
var { FGEX } = require("../model/fgex.model");
var { Que } = require("../model/que.model");
//post api for sap
router.post("/batch", async (req, res) => {
  var authHeader = req.headers["auth-token"] || req.headers["Auth-Token"];
  if (!authHeader || authHeader != "sfw0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ8") {
    console.log("you are not authorize");
    // res.status(401).send("you are not authorize")
    res.status(401).json({
      status: "Unauthorized",
      message: "pls send a valid token",
    });
  } else {
    var data = req.body;
    var PONumber = req.body.PONumber;
    data.postApiHitFrom = req.body.postApiHitFrom || "Intas Sap";
    //var check = await Sap.findOne({ PONumber: PONumber });
    if (!PONumber) {
      res
        .status(401)
        .send("SAP validation failed:PONumber: Path `PONumber` is required.");
    } else {
      var check = await Sap.findOne({ PONumber: PONumber });
      if (check) {
        try {
          const updatedSap = await Sap.updateOne(
            { PONumber: PONumber },
            data,
            { runValidators: true }
          );
      
          if (updatedSap.nModified > 0) {
            return {
              status: "ok",
              message: "Data successfully updated in the database",
            };
          } else {
            return {
              status: "error",
              message: "No matching document found for the provided PONumber",
            };
          }
        } catch (error) {
          console.error(error);
          throw new Error(error.message);
        }
      } else {
        var raw = new Sap(req.body);
        try {
          var save = await raw.save();
          res.status(200).send({
            status: "Ok",
            res: "Data Successfully save in database",
          });
        } catch (error) {
          res.status(400).send({
            status: "error",
            res: error.message,
          });
        }
      }
    }
  }
});

router.post("/employee", async (req, res) => {
  var authHeader = req.headers["auth-token"] || req.headers["Auth-Token"];
  if (!authHeader || authHeader != "sfw0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ8") {
    // res.status(401).send("you are not authorize")
    res.status(401).json({
      status: "Unauthorized",
      message: "pls send a valid token",
    });
  } else {
    var data = req.body;
    var Empcode = req.body.empCode;
    //console.log(EmployeeId);
    var datasearch = await Employee.findOne({ empCode: Empcode });
    //console.log(datasearch);
    if (datasearch) {
      var save = await Employee.update(
        { empCode: Empcode },
        data,
        (err, data) => {
          if (err) {
            res.status(400).send(err.message);
          } else {
            res.status(200).send(data);
          }
        }
      );
    } else {
      var raw = new Employee(req.body);
      try {
        var save = await raw.save();
        res.status(200).json({
          status: "ok",
          message: "Data Successfully save in database",
        });
      } catch (error) {
        res.status(400).send(error.message);
      }
    }
  }
});

router.get("/employee", async (req, res) => {
  var token = req.query.token;
  if (token == "sfw0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ8") {
    var data = await Employee.find({});
    res.send(data);
  } else {
    res.send("you are not authorized to access data");
  }
});

// router.get('/:token',async(req,res)=>{
//     req.params['token'] == "sfw0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ8"
//     //console.log( req.params['token'] == "sfw0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ8");
//     if( req.params['token'] == "sfw0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ8"){
//         var data = await Sap.find({})
//         res.send(data)
//     }
//     else{
//         res.send("you are not authorized to access data")
//     }
// });

router.get("/", async (req, res) => {
  var token = req.query.token;
    var data = await Sap.aggregate([
      {
        $match: {
          current_status: {
            $in: ["unassign", "early_batch_end"],
          },
        },
      },
      {
        $lookup: {
          from: "fgexes",
          localField: "sku_number",
          foreignField: "sku_number",
          as: "fgex",
        },
      },
      {
        $project:{
          isUsed: 1,
          postApiHitFrom: 1,
          PONumber: 1,
          LOTNumber: 1,
          LOTSize: 1,
          sku_number: 1,
          status: "$current_status",
          createdAt: 1,
          updatedAt: 1,
          fgex: { "$arrayElemAt": [ "$fgex", 0 ] } 
      }
      },
      { 
        $match: {
             fgex: { 
                "$exists": true, 
                "$ne": null 
            }
        }    
     },
      {
        $project: {
          isUsed: 1,
          postApiHitFrom: 1,
          PONumber: 1,
          LOTNumber: 1,
          LOTSize: 1,
          sku_number: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          ratedSpeed: {
            $ifNull: ["$fgex.rated_speed", null],
          },
          fgex_id: {
            $ifNull: ["$fgex._id", null],
          },
          recipe_code: {
            $ifNull: ["$fgex.recipe_code", null],
          },
          recipe_description: {
            $ifNull: ["$fgex.recipe_description", null],
          },
          sku_description: {
            $ifNull: ["$fgex.sku_description", null],
          },
          preform_code: {
            $ifNull: ["$fgex.preform_code", null],
          },
          preform_description: {
            $ifNull: ["$fgex.preform_description", null],
          },

        },
      },
      {
        $sort:{
          _id:-1
        }
      }
    ]);
   res.send(data)
});





router.get("/single_po_data", async (req, res) => {
  var token = req.query.token;
  var pono = req.query.poNo;
  if (token == "sfw0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ8") {
    var data = await Sap.findOne({ PONumber: pono });
    if (!data) {
      res.status(404).send(`${pono} doesn't exist.`);
      return;
    }
    // if (data.HalbCode == "" || data.HalbCode == null) {
    //   res.status(404).send(`${pono} Halb code is empty`);
    //   return;
    // }
    if (
      data.current_status == "assigned" ||
      data.current_status == "batch_end"
    ) {
      var checkassbatch = await Batchskutrigger.findOne({
        po_number: pono,
      }).populate("line_id");
      if (checkassbatch) {
        res.status(401).send(
          `${pono} was already assigned in ${checkassbatch.line_id.line_name} on ${checkassbatch.start_time}`
        );
      } else {
        res.status(402).send("found assiged but not found in batch");
      }
      return;
    }
    // var checkhalb = await FGEX.findOne({
    //   halb_code: data.HalbCode,
    //   fgex: data.ProductCode,
    // });
    // if (!checkhalb) {
    //   res.status(404).send(
    //     `FGex, Halb code combination doesn't exist in master for po - ${pono}`
    //   );
    //   return;
    // }
    var checkqueue = await Que.findOne({ po_id: data._id }).populate("line_id");
    if (checkqueue) {
      res.status(402).send(`${pono} is already queued in ${checkqueue.line_id.line_name}`);
      return;
    }
    res.send(data);
  } else {
    res.status(409).send("you are not authorized to access data");
  }
});

module.exports = router;
