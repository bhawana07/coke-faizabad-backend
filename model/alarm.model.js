var mongoose = require("mongoose");

var alarmSchema = new mongoose.Schema(
  {
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
    machine_name: {
      type: String,
    },
    current_first_fault: {
      type: Number,
      default:0
    },
    active: {
      type: Boolean,
      default:false
    },
    alarm: [],
  },
  { timestamps: true }
);

var Alarm = mongoose.model("Alarm", alarmSchema);

//update alarm end time in dartbase
var updateAlarm = async (machine_name, line_id, current_first_fault, code) => {
  //console.log(machine_name, line_id, current_first_fault, code)
  var alarm = await Alarm.findOne({
    machine_name: machine_name,
    line_id: line_id,
  });
   if(!alarm){
      var new_alarm = new Alarm({
        machine_name: machine_name,
        line_id: line_id,
      });
      var save = await new_alarm.save();
   }else{
    alarm.active = true;
    alarm.current_first_fault = current_first_fault;
    if (alarm.alarm.length > 3) {
      alarm.alarm.pop();
      alarm.alarm.unshift(code);
    } else {
      alarm.alarm.push(code);
    }
    var save = await alarm.save();
   }
  //console.log(save)
};

//update alarm status

var updateAlarmStatus = async (machine_name, line_id) => {
  var alarm = await Alarm.updateOne(
    {
      machine_name: machine_name,
      line_id: line_id,
    },
    {
      $set: {
        current_first_fault: 0,
        active: false,
        alarm: [],
      },
    },
    {
      upsert: true,
    }
  );
};

module.exports.Alarm = Alarm;
module.exports.updateAlarm = updateAlarm;
module.exports.updateAlarmStatus = updateAlarmStatus;
