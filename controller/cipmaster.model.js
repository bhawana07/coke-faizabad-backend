var mongoose = require("mongoose");
var { ciptypeMaster } = require("./ciptypemaster.model");
var moment = require("moment");
var CIPMaster = mongoose.Schema(
  {
    cip_state: {
      type: String,
    },
    cip_start_timestamp: {
      type: Date,
      default: Date.now(),
    },
    cip_end_timestamp: {
      type: Date,
      default: null,
    },
    cip_type_string: {
      type: String,
      defualt: "automatic",
    },
    cip_type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "cipTypeMaster",
    },
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
    updated_by: String,
    water_use: {
      type: Number,
      default: 0,
    },
    history_array: [
      {
        date: {
          type: Date,
          default: Date.now(),
        },
        state: String,
        updated_by: String,
        water_use: Number,
      },
    ],
  },
  { timestamps: true }
);

//start automatic CIp
var addNewCip = async (line_id, cb) => {
  var cipmaster = await ciptypeMaster.findOne();
  var checkCip = await cipMaster.findOne({
    line_id: line_id,
    cip_end_timestamp: null,
  });
  if (checkCip) {
    checkCip.cip_end_timestamp = new Date();
    await checkCip.save();
    var newCip = new cipMaster({
      cip_state: "start",
      line_id: line_id,
      cip_type_string: "automatic",
      cip_start_timestamp: new Date(),
      cip_type: cipmaster._id,
      history_array: [
        {
          state: "start",
          updated_by: "system",
          water_use: 0,
        },
      ],
    });
    var save = await newCip.save();
    cb(save);
  } else {
    var newCip = new cipMaster({
      cip_state: "start",
      line_id: line_id,
      cip_type_string: "automatic",
      cip_type: cipmaster._id,
      history_array: [
        {
          state: "start",
          updated_by: "system",
          water_use: 0,
        },
      ],
    });
    var save = await newCip.save();
    cb(save);
  }
};

//end cip
var endCip = async (line_id, water_use, cb) => {
  var checkCip = await cipMaster.findOne({
    line_id: line_id,
    cip_end_timestamp: null,
  });
  checkCip.cip_end_timestamp = new Date();
  checkCip.water_use = water_use;
  var save = await checkCip.save();
  cb(save);
};

var cipMaster = mongoose.model("cipMaster", CIPMaster);
module.exports.cipMaster = cipMaster;
module.exports.addNewCip = addNewCip;
module.exports.endCip = endCip;
