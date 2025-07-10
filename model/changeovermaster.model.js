var mongoose = require("mongoose");
var moment = require("moment");
var ChangeOverMaster = mongoose.Schema(
  {
    changeover_type: {
      type: String,
      enum: { values: ['filling', 'process'], message: '{VALUE} is not supported' },
      required: true
    },
    from_code: {
      type: String,
    },
    to_code: {
      type: String,
    },
    standard_duration: {
      type: Number,
    },
    cip:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "cip",
    },
    remain_co_time: {
      type: String,
      default:null
    },
    number_of_case_on_start: {
      type: String,
      default:null
    },
  },
  { timestamps: true }
);
var changeOverMaster = mongoose.model("changeovermaster", ChangeOverMaster);
module.exports.changeOverMaster = changeOverMaster;