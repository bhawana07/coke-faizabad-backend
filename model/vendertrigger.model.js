const mongoose = require("mongoose");
var moment = require("moment");
var { vendor } = require("./vender.model")
var vendortrischema = new mongoose.Schema(
  {
    start_time: {
      type: Date,
      default: Date.now(),
    },
    end_time:{
      type: Date,
      default:null
    },
    start_date: {
      type: Date,
      default: Date.now(),
    },
    end_date: {
      type: Date,
      default: null
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendor",
    },
    vendor_name: {
      type: String,
    },
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
    vendor_set_by:{
      type:String
    }
  },
  { timestamps: true }
);

var vendortrigger = mongoose.model("vendortrigger", vendortrischema);

var getCurrentvendor = async (line_id) => {
  var check_vendor = await vendortrigger.findOne({ line_id: line_id, end_time: null })
  if (!check_vendor) {
    var new_vendor = new vendor({
      line_id: line_id,
      bottle_size: 340,
      vendor: "vendor_" + line_id

    });
    var vendor_save = await new_vendor.save()
    var data = new vendortrigger({
      vendor: vendor_save._id,
      line_id: line_id,
      vendor_name: "intial_" + line_id,
    });
    var result = await data.save();
    return result;
  }
  return check_vendor;
};

module.exports.vendortrigger = vendortrigger;
module.exports.getCurrentvendor = getCurrentvendor