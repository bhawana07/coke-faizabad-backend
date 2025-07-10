var mongoose = require("mongoose");
var moment = require("moment");
var pre_shift;
var shiftSchema = new mongoose.Schema({
  shiftName: {
    type: String,
    required: true,
  },
  shiftStartTime: {
    type: Number,
    required: true,
  },
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
  position: {
    type: String,
  },
  date: {
    type: Date,
  },
  shiftEndTime: {
    type: Number,
    required: true,
  },
});
var Shift = mongoose.model("Shift", shiftSchema);


var currentShift = async function () {
  var now = moment().local();
  var today = now.hour();
  var hour = today * 60 + now.minutes();
  var shift, current_shift, total_time, d, shiftStartTime, data;
  
  // check hour between shift start and end time
  shift = await Shift.findOne({
    shiftStartTime: { $lte: hour },
    shiftEndTime: { $gte: hour },
  });
  
  // hour is not between shift start and end time
  if (!shift) {
    shift = await Shift.findOne().$where(
      "this.shiftStartTime > this.shiftEndTime"
    );
    
    if (!shift) {
      const shift_arr = [
        {
          shiftName: "Shift A",
          shiftStartTime: 420,
          shiftEndTime: 1140,
          position: "current",
        },
        {
          shiftName: "Shift B",
          shiftStartTime: 1140,
          shiftEndTime: 420,
          position: "pre_shift",
        },
      ];
      
      var data = await Shift.insertMany(shift_arr);
      return;
    }
    
    current_shift = shift.shiftName;
    
    if (hour < shift.shiftEndTime) {
      var date = moment().local().subtract(1, "days").startOf("day").format();
      var split = date.split("+");
      d = split[0] + "+00:00";
      total_time = hour + 1440 - shift.shiftStartTime;
    } else {
      d = moment().local().utcOffset("+00:00").startOf("day").format();
      total_time = hour - shift.shiftStartTime;
    }
    
    // Modify to include shiftStartTime and shiftEndTime in ISO format
    shiftStartTime = moment().startOf('day').add(shift.shiftStartTime, 'minutes').utc().toISOString();
    shiftEndTime = moment().startOf('day').add(shift.shiftEndTime, 'minutes').add(1, 'days').utc().toISOString();

    
    data = {
      date: d,
      shift: current_shift,
      total_time: total_time,
      shiftStartTime: shiftStartTime,
      shiftEndTime: shiftEndTime,
    };
  } else {
    current_shift = shift.shiftName;
    d = moment().local().utcOffset("+00:00").startOf("day").format();
    total_time = hour - shift.shiftStartTime;
    
    // Modify to include shiftStartTime and shiftEndTime in ISO format
    shiftStartTime = moment().startOf('day').add(shift.shiftStartTime, 'minutes').utc().toISOString();
    shiftEndTime = moment().startOf('day').add(shift.shiftEndTime, 'minutes').utc().toISOString();
    
    data = {
      date: d,
      shift: current_shift,
      total_time: total_time,
      shiftStartTime: shiftStartTime,
      shiftEndTime: shiftEndTime,
    };
  }
  
  if (pre_shift != undefined && pre_shift != data.shift) {
    updateShiftPosition(data.date);
  }
  
  pre_shift = data.shift;
  return data;
};



var updateShiftPosition = async function (date) {
  var current = await Shift.findOne({ position: "current" });
  var pre_shift = await Shift.findOne({ position: "pre_shift" });
  var pre_pre_shift = await Shift.findOne({ position: "pre_pre_shift" });
  current.position = "pre_shift";
  pre_shift.position = "pre_pre_shift";
  pre_pre_shift.position = "current";
  pre_pre_shift.date = date;
  current.save();
  pre_shift.save();
  pre_pre_shift.save();
};

var validShift = async function (shiftStartTime, shiftEndTime) {
  console.log(shiftStartTime, shiftEndTime);
  var result;
  var shift = await Shift.findOne({
    $or: [
      {
        $and: [
          {
            shiftStartTime: {
              $lte: shiftStartTime,
            },
          },
          {
            shiftEndTime: {
              $gte: shiftStartTime,
            },
          },
        ],
      },
      {
        $and: [
          {
            shiftStartTime: {
              $lte: shiftEndTime,
            },
          },
          {
            shiftEndTime: {
              $gte: shiftEndTime,
            },
          },
        ],
      },
      {
        $and: [
          {
            shiftStartTime: {
              $gte: shiftStartTime,
            },
          },
          {
            shiftEndTime: {
              $lte: shiftEndTime,
            },
          },
        ],
      },
      {
        $and: [
          {
            shiftStartTime: {
              $gte: shiftStartTime,
            },
          },
          {
            shiftEndTime: {
              $gte: shiftEndTime,
            },
          },
          {
            $expr: { $gt: ["$shiftStartTime", "$shiftEndTime"] },
          },
        ],
      },
    ],
  });
  if (shift) {
    if (
      shiftStartTime <= shift.shiftStartTime &&
      shiftEndTime <= shift.shiftEndTime
    ) {
      result = true;
    } else {
      result = false;
    }
  } else {
    result = false;
  }
  return result;
};
module.exports.Shift = Shift;
module.exports.CurrentShift = currentShift;
module.exports.validShift = validShift;
module.exports.updateShiftPosition = updateShiftPosition;
