var mongoose = require("mongoose");
var moment = require("moment");
var { CurrentShift } = require("./shift.model")

var stopSchema = new mongoose.Schema({
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
  date: {
    type: Date,
  },
  shift: {
    type: String,
  },
  shift_start_timestamp:{
    type:Date
  },
  shift_end_timestamp:{
    type:Date
  },
  machine_wise: [
    {
      machine_name: {
        type: String,
      },
      event_wise: [
        {
          parent_stop: {
            type: String,
          },
          stop_name: {
            type: String,
          },
          timestamp: {
            type: Date,
          },
          batch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Batch",
          },
          critical_off: {
            type: Boolean,
            default: false,
          },
          critical_off_timestamp: {
            type: Date,
          },
          vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
          },
          fromChange:{
            type: String
          },
          referance_id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
          },
          good_count: {
            type: Number,
          },
        },
      ],
    },
  ],
});
stopSchema.index({ date: -1, line_id: 1 });
var Stop = mongoose.model("Stop", stopSchema);

let queue = [];
let isProcessing = false; // Flag to track queue processing
let processingLock = false; // Lock to ensure atomic update of isProcessing flag

async function processQueue() {
  // Acquire lock before entering the processing loop
  if (processingLock) {
    return;
  }

  processingLock = true; // Set the lock to prevent other invocations
  isProcessing = true; // Set flag to prevent redundant calls

  try {
    while (queue.length > 0) {
      const task = queue.shift();
      const { line_id, date, shift, machine_name, ...eventData } = task.machineData;
      const _id = `${line_id}_${moment(date).local().format("YYYYMMDD")}_${shift}`;
      let stop = await Stop.findOne({ line_id,date,shift });
      var current_shift =  await CurrentShift();
      if (!stop) {
        var data = new Stop({
          line_id: line_id,
          date: date,
          shift: shift,
          shift_start_timestamp:current_shift.shiftStartTime,
          shift_end_timestamp:current_shift.shiftEndTime,
          machine_wise: [{ machine_name, event_wise: [eventData] }],
        });
        await data.save();
      } else {
        const machineIndex = stop.machine_wise.findIndex((m) => m.machine_name === machine_name);

        if (machineIndex === -1) {
          await Stop.updateOne(
            { line_id,date,shift },
            { $push: { machine_wise: { machine_name, event_wise: [eventData] } } }
          );
        } else {
          await Stop.updateOne(
            { line_id,date,shift },
            {
              $push: { "machine_wise.$[machineElement].event_wise": eventData },
            },
            {
              arrayFilters: [
                { "machineElement.machine_name": machine_name },
              ],
            }
          );
        }
      }
      task.cb(null, 'Task processed successfully');
    }
  } catch (err) {
    console.error(err);
    // Handling error here; you may choose to rethrow it or log it accordingly
  } finally {
    isProcessing = false; // Reset flag after processing the queue
    processingLock = false; // Release the lock
  }
}

function postStop(machineData, cb) {
  queue.push({ machineData, cb });

  if (!isProcessing) {
    processQueue(); // Start processing only if not already in progress
  }
}

var getStop = async (lineId, date, shift, machineName, eventId) => {
  try {
    const stop = await Stop.findOne({
      line_id: lineId,
      date: date,
      shift: shift,
    });

    if (!stop) {
      console.log('Stop not found.');
      return null;
    }

    const machine = stop.machine_wise.find((m) => m.machine_name === machineName);

    if (!machine) {
      console.log('Machine not found.');
      return null;
    }

    const event = machine.event_wise.find((e) => e._id.equals(eventId));

    if (event) {
      return event;
    } else {
      console.log('Event not found.');
      return null;
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const updateCriticalStop = async (lineId, date, shift, machineName, callback) => {
  try {
    const stop = await Stop.findOne({
      line_id: lineId,
      date: date,
      shift: shift,
      'machine_wise.machine_name': machineName,
    }).sort({ 'machine_wise.event_wise.timestamp': -1 }).limit(1);

    if (stop) {
      const latestEvent = stop.machine_wise[0].event_wise[0];

      // Update the latest event with critical stop details
      const updatedStop = await Stop.findOneAndUpdate(
        {
          line_id: lineId,
          date: date,
          shift: shift,
          'machine_wise.machine_name': machineName,
          'machine_wise.event_wise._id': latestEvent._id,
        },
        {
          $set: {
            'machine_wise.$.event_wise.$.critical_off': true,
            'machine_wise.$.event_wise.$.critical_off_timestamp': new Date(),
          },
        },
        { new: true } // Return the updated document
      );

      const updatedEvent = updatedStop.machine_wise[0].event_wise[0];
      callback(null, updatedEvent); // Pass only the updated event to the callback
    } else {
      callback('No matching record found', null);
    }
  } catch (error) {
    callback(error.message, null);
  }
};

const updateStopManually = async (updateData, callback) => {
  try {
      const { line_id, shift, date, stop_id, stop_name } = updateData;

      // Find the stop
      const stop = await Stop.findOne({ line_id, shift, date });
      if (!stop) {
          throw new Error('Stop not found.');
      }

      // Find the specific event within event_wise using stop_id
      const event = stop.machine_wise.flatMap((machine) => machine.event_wise)
          .find((e) => e._id.toString() === stop_id);

      if (!event) {
          throw new Error('Event not found.');
      }

      // Update the stop data
      event.stop_name = stop_name + '_2001';
      event.parent_stop = stop_name;
      event.fromChange = 'manual';

      // Save the updated stop
      await stop.save();

      // Invoke the callback if provided
      if (callback && typeof callback === 'function') {
          callback(null, 'Stop updated successfully.');
      }
  } catch (error) {
      console.error(error);
      // Invoke the callback with the error if provided
      if (callback && typeof callback === 'function') {
          callback(error);
      }
  }
};


module.exports.Stop = Stop;
module.exports.postStop = postStop;
module.exports.getStop = getStop;
module.exports.updateCriticalStop = updateCriticalStop;
module.exports.updateStopManually = updateStopManually;

