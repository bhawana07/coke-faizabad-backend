var mongoose = require("mongoose");
var rosterschema = new mongoose.Schema(
  {
    date: {
      type: Date,
    },
    line_id: {
      require: true,
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
    last_modified_by: {
      type: String,
    },
    shift_wise: [
      {
        shift_name: {
          type: String,
        },
        operator_name: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "operator",
        },
      },
    ],
  },
  { timestamps: true }
);

var Roster = mongoose.model("roster", rosterschema);

var postRoster = async (obj, cb) => {
  console.log(obj);
  var save = await Roster.bulkWrite(
    obj.map((obj) => ({
      updateOne: {
        filter: { line_id: obj.line_id, date: obj.date },
        update: obj,
        upsert: true,
      },
    }))
  );
  try {
    cb(null, save);
  } catch (error) {
    cb(error);
  }
};

var getDateWiseRoster = async (date, line_id) => {
  var getdata = await Roster.findOne({ date: date, line_id: line_id })
    .populate("shift_wise.operator_name")
    .populate("line_id");
  return getdata;
};

var getshiftWiseRoster = async (date, shift, line_id) => {
  //console.log(new Date(date),shift);
  const getdata = await Roster.findOne(
    {
      date: new Date(date),
      "shift_wise.shift_name": shift,
      line_id: line_id,
    },
    {
      "shift_wise.$": 1,
      date: 1,
      line_id: 1,
    }
  )
    .populate("shift_wise.operator_name")
    .populate("line_id");
  return getdata;
};

var indexoperatorid = async (date, shift, line_id) => {
  //console.log(new Date(date),shift);
  const getdata = await Roster.findOne(
    {
      date: new Date(date),
      "shift_wise.shift_name": shift,
      line_id: line_id,
    },
    {
      "shift_wise.$": 1,
      date: 1,
      line_id: 1,
    }
  ).populate("shift_wise.operator_name");
  //var result = getdata.shift_wise[0]._id
  var result =
    getdata && getdata.shift_wise[0].operator_name
      ? {
          _id: getdata.shift_wise[0].operator_name._id,
          operator_name: getdata.shift_wise[0].operator_name.display_name,
        }
      : { _id: "5e8c6c256a457c1ef8dd615e", operator_name: "Not Defined" };
  return result;
};

module.exports.Roster = Roster;
module.exports.postRoster = postRoster;
module.exports.getDateWiseRoster = getDateWiseRoster;
module.exports.getshiftWiseRoster = getshiftWiseRoster;
module.exports.indexoperatorid = indexoperatorid;
