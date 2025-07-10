const mongoose = require("mongoose");
var moment = require("moment");
var vendorschema = new mongoose.Schema(
  {
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
    vendor: {
      type: String,
      // unique: true,
    },
    bottle_size: {
      type: Number,
    },
    rated_speed: {
      type: Number,
    },
    remark: {
      type: String
    },
  },
  { timestamps: true }
);

var vendor = mongoose.model("vendor", vendorschema);

module.exports.vendor = vendor