const moment = require("moment");
var mongoose = require("mongoose");
const { FGEX } = require("../model/fgex.model");
const { changeOverMaster } = require("./changeovermaster.model");
const { Batchskutrigger } = require("./batch.model");

var sapschema = new mongoose.Schema(
  {
    PONumber: {
      ///
      type: String,
      required: true,
    },
    sku_number: {
      type: Number,
      required: true,
    },
    LOTSize: {
      type: Number,
    },
    // EXPDATE: {
    //   type: Date,
    //   required: true,
    // },
    // MFGDATE: {
    //   type: Date,
    //   required: true,
    // },
    PlantCode: {
      type: String,
    },
    ProductCode: {
      type: String,
    },
    HalbCode: {
      type: String,
    },
    ProductDescription: {
      type: String,
    },
    // LineName: {
    //   type: String,
    //  // required: true,
    // },
    // LineCode:{
    //   type: String,
    // //  required: true,
    // },
    isUsed: {
      type: Boolean,
      default: false,
    },
    current_status: {
      type: String,
      default: "unassign",
    },
    postApiHitFrom: {
      type: String,
      default: "Intas Sap",
    },
    PlantName: {
      type: String,
    },
    UpdateTimestamp: {
      type: Date,
    },
    last_modified_by: {
      type: String,
    },
  },
  { timestamps: true }
);
sapschema.index({ PONumber: 1, current_status: -1 });
//sapschema.index({createdAt: 1},{expireAfterSeconds: 604800});
var Sap = mongoose.model("sap", sapschema);

///update sap assigen
var updateSapStatus = async (id) => {
  var result = await Sap.updateOne(
    {
      _id: id,
    },
    {
      $set: {
        current_status: "assign",
      },
    }
  );
  return result;
};

module.exports.Sap = Sap;
module.exports.updateSapStatus = updateSapStatus;
