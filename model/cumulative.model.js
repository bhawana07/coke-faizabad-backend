var mongoose = require("mongoose");

var cumulativeSchema = new mongoose.Schema({
  goodcount: {
    type: Number,
    default: 0,
  },
  reject_count: {
    type: Number,
    default: 0,
  },
  cycle_count: {
    type: Number,
    default: 0,
  },
  waiting_time: {
    type: Number,
    default: 0,
  },
  waiting_count: {
    type: Number,
    default: 0,
  },
  ready_count: {
    type: Number,
    default: 0,
  },
  ready_time: {
    type: Number,
    default: 0,
  },
  executing_time: {
    type: Number,
    default: 0,
  },
  executing_count: {
    type: Number,
    default: 0,
  },
  minor_manual_stop_count: {
    type: Number,
    default: 0,
  },
  minor_manual_stop_time: {
    type: Number,
    default: 0,
  },
  major_manual_stop_count: {
    type: Number,
    default: 0,
  },
  major_manual_stop_time: {
    type: Number,
    default: 0,
  },
  blocked_count: {
    type: Number,
    default: 0,
  },
  blocked_time: {
    type: Number,
    default: 0,
  },
  updt_count: {
    type: Number,
    default: 0,
  },
  updt_time: {
    type: Number,
    default: 0,
  },
  minor_fault_time: {
    type: Number,
    default: 0,
  },
  minor_fault_count: {
    type: Number,
    default: 0,
  },
  major_fault_count: {
    type: Number,
    default: 0,
  },
  major_fault_time: {
    type: Number,
    default: 0,
  },
  pdt_time: {
    type: Number,
    default: 0,
  },
  pdt_count: {
    type: Number,
    default: 0,
  },
  changeover_count: {
    type: Number,
    default: 0,
  },
  changeover_time: {
    type: Number,
    default: 0,
  },
  cip_count: {
    type: Number,
    default: 0,
  },
  cip_time: {
    type: Number,
    default: 0,
  },
  machine_name: {
    type: String,
  },
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
  total_energy: {
    type: Number,
    default: 0,
  },
});

var Cumulative = mongoose.model("Cumulative", cumulativeSchema);

//add commulative counts
const addCountInCummulative = async (
  line_id,
  machine_name,
  good_count,
  reject_count,
  cycle_count,
  total_energy,
  cb
) => {
  var machine = await Cumulative.findOne({
    line_id: line_id,
    machine_name: machine_name,
  });
  if (machine) {
    machine.good_count += good_count;
    machine.reject_count += reject_count;
    machine.cycle_count += cycle_count;
    machine.total_energy += total_energy;
    var save = await machine.save();
    cb(save);
  } else {
    var new_machine = new Cumulative({
      line_id: line_id,
      machine_name: machine_name,
    });
    var save = await new_machine.save();
    cb(save);
  }
};

//add cumulative state
const addStateInCummulative = async (
  line_id,
  machine_name,
  state,
  duration,
  duration_type,
  cb
) => {
  var machine = await Cumulative.findOne({
    line_id: line_id,
    machine_name: machine_name,
  });
  if (machine) {
    if (state == "fault" || state == "manual_stop") {
      if (duration_type == "major") {
        machine[`major_${state}_time`] += duration;
        machine[`major_${state}_count`]++;
      } else {
        machine[`minor_${state}_time`] = duration;
        machine[`minor_${state}_count`]++;
      }
      var save = await machine.save();
      cb(save);
    } else {
      machine[`${state}_time`] += duration;
      machine[`${state}_count`]++;
      var save = await machine.save();
      cb(save);
    }
  } else {
    var new_machine = new Cumulative({
      line_id: line_id,
      machine_name: machine_name,
    });
    var save = await new_machine.save();
    cb(save);
  }
};

module.exports = {
  Cumulative,
  addCountInCummulative,
  addStateInCummulative,
};
