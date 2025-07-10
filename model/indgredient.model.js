var mongoose = require("mongoose");
var moment = require("moment");
var IndgredentMaster = mongoose.Schema(
  {
    batch_no: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "batchskutrigger",
    },
    from_weight_comp: [
      {
        indgredent_name: {
          type: String,
        },
        indgredent_weight: {
          type: Number,
        },
      },
    ],
    manual_weight: [
      {
        indgredent_name: {
          type: String,
        },
        indgredent_weight: {
          type: Number,
        },
      },
    ],
    water_weight: {
      type: Number,
      default: 0,
    },
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
  },
  { timestamps: true }
);

var indgredentMaster = mongoose.model("indgredentMaster", IndgredentMaster);
//add new Ingredent
var addNewIndgredentMaster = async (line_id, batch_no, cb) => {
  var new_indgredent = new indgredentMaster({
    line_id: line_id,
    batch_no: batch_no,
  });
  var save = await new_indgredent.save();
  cb(save);
};

var addWaterIndgredent = async (line_id, batch_no, water_use, cb) => {
  var indgredent = await indgredentMaster.findOne({
    batch_no: batch_no,
    line_id: line_id,
  });
  if (indgredent) {
    indgredent.water_weight = water_use;
    var save = await indgredent.save();
    cb(save);
  } else {
    {
      cb("No data");
    }
  }
};

var addWeighingComputerIndgredent = async (
  line_id,
  batch_no,
  from_weight_comp,
  cb
) => {
  var indgredent = await indgredentMaster.findOne({
    batch_no: batch_no,
    line_id: line_id,
  });
  indgredent.from_weight_comp = from_weight_comp;
  var save = await indgredent.save();
  cb(save);
};
module.exports = {
  indgredentMaster,
  addNewIndgredentMaster,
  addWaterIndgredent,
  addWeighingComputerIndgredent,
};
