var mongoose = require("mongoose");
var connectionLogSchema = mongoose.Schema({
  machine_name: {
    type: String,
  },
  error_name: {
    type: String,
  },
  start_time: {
    type: Date,
    default: Date.now,
  },
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
  end_time: {
    type: Date,
    default: null,
  },
});

var connectionLog = mongoose.model("ConnectionLog", connectionLogSchema);

const postConnectionStop = async (machine, stop_name, timestamp, line_id) => {
  try {
    // Attempt to update the existing document
    const updatedDoc = await connectionLog.findOneAndUpdate(
      { machine_name: machine, end_time: null, line_id: line_id },
      { end_time: timestamp },
      { new: true }
    );

    // If no document is updated, create a new one
    if (!updatedDoc) {
      const newData = new connectionLog({
        machine_name: machine,
        error_name: stop_name,
        start_time: timestamp,
        line_id: line_id,
      });

      await newData.save();
    }
  } catch (err) {
    // Handle errors, e.g., log them or perform other actions
    console.error(err);
    // Optionally rethrow the error if you want to propagate it further
    // throw err;
  }
};


//new log
var firstLog  = async (machine, stop_name, timestamp,line_id) =>{
    var data = new connectionLog({
      machine_name: machine,
      error_name: stop_name,
      start_time: timestamp,
      line_id:line_id,
      });
    data.save();
}
module.exports.connectionLog  = connectionLog ;
module.exports.postConnectionStop = postConnectionStop;
module.exports.firstLog = firstLog