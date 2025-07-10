var mongoose = require("mongoose");
var moment = require("moment");
var CIPtypeMaster = mongoose.Schema(
  {
    cip_type: {
      type: String
    },    
    standard_duration: {
      type: Number,
    },
   
  },
  { timestamps: true }
);
var ciptypeMaster = mongoose.model("cipTypeMaster",CIPtypeMaster);
module.exports.ciptypeMaster = ciptypeMaster;