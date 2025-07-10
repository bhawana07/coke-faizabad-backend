var mongoose = require("mongoose");
var { Stop,getStop,updateStopManually } = require("./stop.model");
var { Comment } = require("./comment.model");

var {
  addCountInCummulative,
  addStateInCummulative,
} = require("./cumulative.model");
var moment = require("moment");

var { addLine } = require("./addLine.model");

var projectSchema = new mongoose.Schema({
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
  date: {
    type: Date,
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
      batch_wise: [
        {
          batch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "batch",
          },
          changeover: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "changeover",
          },
          cip: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "cipmasters",
          },
          start_timestamp: {
            type: Date,
          },
          end_timestamp: {
            type: Date,
            default: null,
          },
          vendor_wise: [
            {
              vendor: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "vendor",
              },
              start_timestamp: {
                type: Date,
              },
              end_timestamp: {
                type: Date,
                default: null,
              },
              machine_wise: [
                {
                  machine_name: {
                    type: String,
                  },
                  goodCount: {
                    type: Number,
                    default: 0,
                  },
                  manual_casecount: 
                  { 
                    type: Number,
                  }, 
                  schedule_break: {
                    type: Number,
                    default: 0,
                  },
                  roll_changeover_count: {
                    type: Number,
                    default: 0,
                  },
                  max_bpm: {
                    type: Number,
                    default: 0,
                  },
                  startup_reject: {
                    type: Number,
                    default: 0,
                  },
                  case_count: {
                    type: Number,
                    default: 0,
                  },
                  reject_count: {
                    type: Number,
                    default: 0,
                  },
                  set_up_power_off: {
                    type: Number,
                    default: 0,
                  },
                  setup_time: {
                    type: Number,
                    default: 0,
                  },
                  cycle_count: {
                    type: Number,
                    default: 0,
                  },
                  waitingCriticaloff: {
                    type: Number,
                    default: 0,
                  },
                  blockedCriticaloff: {
                    type: Number,
                    default: 0,
                  },
                  major_manual_stopCriticaloff: {
                    type: Number,
                    default: 0,
                  },
                  minor_manual_stopCriticaloff: {
                    type: Number,
                    default: 0,
                  },
                  readyCriticaloff: {
                    type: Number,
                    default: 0,
                  },
                  critical_off: [
                    {
                      machine_name: {
                        type: String,
                      },
                      duration: {
                        type: Number,
                      },
                      stop_id: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "stop",
                      },
                      blocked_id: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "stop",
                      },
                      timestamp: {
                        type: Date,
                        default: Date.now,
                      },
                      type: {
                        type: String,
                      },
                    },
                  ],
                  stop_wise: [
                    {
                      stop_name: {
                        type: String,
                      },
                      duration: {
                        type: Number,
                        default: 0,
                      },
                      count: {
                        type: Number,
                        default: 0,
                      },
                      details: [
                        {
                          duration_type: {
                            type: String,
                          },
                          duration: {
                            type: Number,
                            default: 0,
                          },
                          count: {
                            type: Number,
                            default: 0,
                          },
                          duration_details: [
                            {
                              fault_name: {
                                type: String,
                              },
                              fault_id: {
                                type: mongoose.Schema.Types.ObjectId,
                                ref: "fault",
                              },
                              duration: {
                                type: Number,
                                default: 0,
                              },
                              count: {
                                type: Number,
                                default: 0,
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
projectSchema.index({ date: -1, line_id: 1 }, { unique: true });
var Project = mongoose.model("Project", projectSchema);
//state array
var state_arr = [
  "changeover",
  "not_used",
  "updt",
  "pdt",
  "fault",
  "blocked",
  "waiting",
  "manual_stop",
  "ready",
  "executing",
  "cip",
  "critical_blocked",
  "critical_waiting",
  "critical_ready",
  "critical_manual_stop",
  "schedule_maintance",
];
//duration for major minor in minute
var major_minor_duration = 5;

let commonQueue = [];
let isProcessingCommonQueue = false;
let processingLockCommonQueue = false;

async function processCommonQueue() {
  if (processingLockCommonQueue) {
    return;
  }

  processingLockCommonQueue = true;
  isProcessingCommonQueue = true;

  try {
    while (commonQueue.length > 0) {
      const task = commonQueue.shift();
      await task(); // Execute the task
    }
  } catch (err) {
    console.error(err);
  } finally {
    isProcessingCommonQueue = false;
    processingLockCommonQueue = false;
  }
}

function addToCommonQueue(task) {
  commonQueue.push(task);

  if (!isProcessingCommonQueue) {
    processCommonQueue(); // Start processing only if not already in progress
  }
}

function registerFunction(name, implementation) {
  return async (...args) => {
    const task = async () => {
      await implementation(...args);
    };

    addToCommonQueue(task);
  };
}



//add shift data in database
module.exports.addShiftData = registerFunction('addShiftData', async (
  line_id,
  date,
  shift_name,
  operator_name,
  batch,
  vendor,
  changeover,
  cip,
  cb
) => {
  const timestamp = moment().format("YYYY-MM-DDTHH:mm");
  const shiftData = {
    shift_name: shift_name,
    operator_name: operator_name,
    batch_wise: [
      {
        batch: batch,
        changeover: changeover,
        cip: cip,
        start_timestamp: timestamp,
        vendor_wise: [
          {
            start_timestamp: timestamp,
            vendor: vendor,
          },
        ],
      },
    ],
  };

  const query = {
    line_id: line_id,
    date: date,
    "shift_wise.shift_name": { $ne: shift_name }
  };
  const update = { $push: { shift_wise: shiftData } };
  const options = { upsert: true, setDefaultsOnInsert: true };

  try {
    const result = await Project.updateOne(query, update, options);
    cb(result);
  } catch (err) {
    console.error(err);
    cb(err);
  }
});

module.exports.addBatchData = registerFunction('addBatchData',async (
  line_id,
  date,
  shift,
  batch,
  vendor,
  changeover,
  cip,
  cb
) => {
  try {
    const timestamp = moment().format("YYYY-MM-DDTHH:mm");
    const batch_data = {
      batch: batch,
      changeover: changeover,
      cip: cip,
      start_timestamp: timestamp,
      vendor_wise: [
        {
          vendor: vendor,
          start_timestamp: timestamp,
        },
      ],
    };

    // Update documents where end_timestamp is null
    await Project.updateOne(
      {
        line_id: line_id,
        date: date,
        "shift_wise.batch_wise.end_timestamp": null,
        "shift_wise.batch_wise.vendor_wise.end_timestamp": null,
      },
      {
        $set: {
          "shift_wise.$[shiftElement].batch_wise.$[batchElement].end_timestamp":
            timestamp,
          "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].end_timestamp":
            timestamp,
        },
      },
      {
        arrayFilters: [
          { "shiftElement.shift_name": shift },
          { "batchElement.end_timestamp": null },
          { "vendorElement.end_timestamp": null },
        ],
      }
    );

    // Push new batch data
    await Project.updateOne(
      {
        line_id: line_id,
        date: date,
      },
      {
        $push: {
          "shift_wise.$[shiftElement].batch_wise": batch_data,
        },
      },
      {
        arrayFilters: [{ "shiftElement.shift_name": shift }],
      }
    );

    return cb ? cb ("Data added successfully") : "Data added successfully";
  } catch (err) {
    console.log(err);
    throw err; // Propagate the error
  }
});

module.exports.addVendorData = registerFunction('addVendorData',
 async (line_id, date, shift, batch, vendor,cb) => {
  try {
    const timestamp = moment().format("YYYY-MM-DDTHH:mm");
    const vendor_data = {
      vendor: vendor,
      start_timestamp: timestamp,
    };

    // Update documents where end_timestamp is null
    await Project.updateOne(
      {
        line_id: line_id,
        date: date,
        "shift_wise.batch_wise.vendor_wise.end_timestamp": null,
      },
      {
        $set: {
          "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].end_timestamp":
            timestamp,
        },
      },
      {
        arrayFilters: [
          { "shiftElement.shift_name": shift },
          { "batchElement.batch": batch },
          { "vendorElement.end_timestamp": null },
        ],
      }
    );

    // Push new vendor data
    await Project.updateOne(
      {
        line_id: line_id,
        date: date,
      },
      {
        $push: {
          "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise":
            vendor_data,
        },
      },
      {
        arrayFilters: [
          { "shiftElement.shift_name": shift },
          { "batchElement.batch": batch },
        ],
      }
    );

    return cb ? cb ("Vendor data added successfully") : "Vendor data added successfully";
  } catch (err) {
    throw err; // Propagate the error
  }
});

//batch end on shift end
module.exports.batchEnd = registerFunction('batchEnd', async (line_id, date, shift, cb) => {
  try {
    var timestamp = moment().format("YYYY-MM-DDTHH:mm");
    var result = await Project.updateOne(
      {
        line_id: line_id,
        date: date,
      },
      {
        $set: {
          "shift_wise.$[shiftElement].batch_wise.$[batchElement].end_timestamp":
            timestamp,
          "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].end_timestamp":
            timestamp,
        },
      },
      {
        arrayFilters: [
          { "shiftElement.shift_name": shift },
          { "batchElement.end_timestamp": null },
          { "vendorElement.end_timestamp": null },
        ],
      }
    );
    cb(result);
  } catch (error) {
    throw err;
  }
});
//add machine data in database
module.exports.addMachineData = registerFunction('addMachineData', async (
  line_id,
  date,
  shift,
  operator_name,
  batch,
  vendor,
  machine_name,
  changeover,
  cip,
  cb
) => {
  const stop_wise = state_arr.map((element) => {
    return {
      stop_name: element,
      details: [
        {
          duration_type: "major",
        },
        {
          duration_type: "minor",
        },
      ],
    };
  });

  const machineData = {
    machine_name: machine_name,
    stop_wise: stop_wise,
  };
 
  var checkShiftData = await Project.findOne({line_id,date});
  if(!checkShiftData){
    // Wait for the shift addition to complete before adding machine data
  await module.exports.addShiftData(line_id, date, shift, operator_name, batch, vendor, changeover, cip, () => {});
  }
  
  const query = { line_id: line_id, date: date };
  const update = {
    $push: {
      "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise":
        machineData,
    },
  };
  const arrayFilters = [
    { "shiftElement.shift_name": shift },
    { "batchElement.batch": batch },
    { "vendorElement.vendor": vendor },
  ];

  const options = { arrayFilters, upsert: true, setDefaultsOnInsert: true };

  try {
    const result = await Project.updateOne(query, update, options);
    cb(result);
  } catch (err) {
    console.error(err);
    cb(err);
  }
});



//add stop data
async function updateStopData(
  lineId,
  date,
  shift,
  machine,
  stop,
  code,
  duration,
  batch,
  vendor,
  cb
) {
  const durationType = checkMajorMinor(duration);
  const faultData = { fault_name: code, count: 1, duration };

  try {
    const updateQuery = {
      $inc: {
        "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[stopElement].count": 1,
        "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[stopElement].duration": duration,
        "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[stopElement].details.$[detailsElement].count": 1,
        "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[stopElement].details.$[detailsElement].duration": duration,
      },
      $push: {
        "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[stopElement].details.$[detailsElement].duration_details": faultData,
      },
    };

    const arrayFilters = [
      { "shiftElement.shift_name": shift },
      { "machineElement.machine_name": machine },
      { "batchElement.batch": batch },
      { "vendorElement.vendor": vendor },
      { "stopElement.stop_name": stop },
      { "detailsElement.duration_type": durationType },
    ];

    const result = await Project.updateOne(
      { line_id: lineId, date: date },
      updateQuery,
      { arrayFilters, upsert: true }
    );

    // Add to cumulative state if needed (assuming addStateInCummulative is async)
     addStateInCummulative(lineId, machine, stop, duration, durationType,()=>{

     });

     cb(result);
  } catch (err) {
    console.error("Error updating stop data:", err);
    throw err; // Rethrow or handle as needed
  }
}

const updateGoodCount = async (
  line_id,
  date,
  shift,
  batch,
  vendor,
  machine,
  goodCount,
  reject_count,
  cycle_count,
  cb
) => {
  try {
    await addCountInCummulative(line_id, machine, goodCount, reject_count, cycle_count,0, () => {});

    const result = await Project.updateOne(
      {
        line_id: line_id,
        date: date,
      },
      {
        $inc: {
          [`shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].goodCount`]: goodCount,
          [`shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].reject_count`]: reject_count,
          [`shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].cycle_count`]: cycle_count,
        },
      },
      {
        arrayFilters: [
          { "shiftElement.shift_name": shift },
          { "machineElement.machine_name": machine },
          { "batchElement.batch": batch },
          { "vendorElement.vendor": vendor },
        ],
      }
    );

    if (cb) {
      cb(result);
    }
    
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
//update bpm and mode
const updateMaxBpm = async (
  line_id,
  date,
  shift,
  operator_name,
  batch,
  vendor,
  machine,
  bpm,
  cb
) => {
  try {
    const result = await Project.updateOne(
      {
        line_id: line_id,
        date: date,
      },
      {
        $set: {
          [`shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].max_bpm`]: bpm,
          // Add more fields to update if needed
        },
      },
      {
        arrayFilters: [
          { "shiftElement.shift_name": shift },
          { "machineElement.machine_name": machine },
          { "batchElement.batch": batch },
          { "vendorElement.vendor": vendor },
        ],
      }
    );

    if (cb) {
      cb(result);
    }

    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};


//update start rject
const updateStartupReject = async (
  line_id,
  date,
  shift,
  batch,
  machine,
  count,
  setup,
  vendor,
  cb
) => {
  try {
    const result = await Project.updateOne(
      {
        line_id: line_id,
        date: date,
      },
      {
        $inc: {
          [`shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].startup_reject`]: count,
          [`shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].setup_time`]: setup,
          // Add more fields to update if needed
        },
      },
      {
        arrayFilters: [
          { "shiftElement.shift_name": shift },
          { "machineElement.machine_name": machine },
          { "batchElement.batch": batch },
          { "vendorElement.vendor": vendor },
        ],
      }
    );

    if (cb) {
      cb(result);
    }

    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

//update setup power off
const updateSetupPoweroff = async (
  line_id,
  date,
  shift,
  batch,
  machine,
  value,
  vendor,
  cb
) => {
  try {
    const result = await Project.updateOne(
      {
        line_id: line_id,
        date: date,
      },
      {
        $inc: {
          [`shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].set_up_power_off`]: value,
          // Add more fields to update if needed
        },
      },
      {
        arrayFilters: [
          { "shiftElement.shift_name": shift },
          { "machineElement.machine_name": machine },
          { "batchElement.batch": batch },
          { "vendorElement.vendor": vendor },
        ],
      }
    );

    if (cb) {
      cb(result);
    }

    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

//update critical off
const updateCriticalOff = async (
  line_id,
  date,
  shift,
  batch,
  vendor,
  critical_machine,
  machine_name,
  type,
  duration,
  stop_id,
  blocked_id,
  cb
) => {
  try {
    const duration_type = checkMajorMinor(duration);
    const main_type = type;
    if (type === "manual_stop") {
      type = `${duration_type}_${type}`;
    }

    const push_obj = {
      machine_name: machine_name,
      duration: duration,
      stop_id: stop_id,
      blocked_id: blocked_id,
      type: type,
    };

    await updateStopData(
      line_id,
      date,
      shift,
      critical_machine,
      `critical_${main_type}`,
      machine_name,
      duration,
      batch,
      vendor,
      async () => {
        const result = await Project.updateOne(
          {
            line_id: line_id,
            date: date,
          },
          {
            $inc: {
              [`shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].${type}Criticaloff`]:
                duration,
            },
            $push: {
              [`shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].critical_off`]:
                push_obj,
            },
          },
          {
            arrayFilters: [
              { "shiftElement.shift_name": shift },
              { "machineElement.machine_name": critical_machine },
              { "batchElement.batch": batch },
              { "vendorElement.vendor": vendor },
            ],
          }
        );

        // Update on machine
        await Project.updateOne(
          {
            line_id: line_id,
            date: date,
          },
          {
            $inc: {
              [`shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].${type}Criticaloff`]:
                  duration,
            },
          },
          {
            arrayFilters: [
              { "shiftElement.shift_name": shift },
              { "machineElement.machine_name": machine_name },
              { "batchElement.batch": batch },
              { "vendorElement.vendor": vendor },
            ],
          }
        );

        if (cb) {
          cb(result);
        }
      }
    );
  } catch (error) {
    console.error(error);
    throw error;
  }
};


const changestop = async (obj) => {
  try {
    const stopdata = await getStop(obj.line_id, obj.date, obj.shift, obj.machine_name, obj.stop_id);
    const duration = (new Date(obj.to) - new Date(obj.from)) / 1000;
    const duration_type = checkMajorMinor(duration);
    const projectUpdateResult = await Project.updateOne(
      {
        line_id: obj.line_id,
        date: obj.date,
      },
      {
        $inc: {
          "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[stopElement].duration": -duration,
          "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[stopElement].count": -1,
          "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[stopElement].details.$[detailsElement].count": -1,
          "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[stopElement].details.$[detailsElement].duration": -duration,
          "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[stopElement].details.$[detailsElement].duration_details.$[durationDetailsElement].count": -1,
          "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[stopElement].details.$[detailsElement].duration_details.$[durationDetailsElement].duration": -duration,
        },
      },
      {
        arrayFilters: [
          { "shiftElement.shift_name": obj.shift },
          { "machineElement.machine_name": obj.machine_name },
          { "batchElement.batch": stopdata.batch },
          { "vendorElement.vendor": stopdata.vendor },
          { "stopElement.stop_name": stopdata.parent_stop },
          { "detailsElement.duration_type": duration_type },
          { "durationDetailsElement.fault_name": stopdata.stop_name },
        ],
      }
    );
    if (projectUpdateResult.acknowledged) {
      console.log(
        stopdata.batch,
        stopdata.vendor,
      )
        updateStopData(
        obj.line_id,
        obj.date,
        obj.shift,
        obj.machine_name,
        obj.machine_state,
        obj.machine_state + "_2001",
        duration,
        stopdata.batch,
        stopdata.vendor,
        (data)=>{
          console.log(data);

        }
      );

      await Comment.updateOne(
        { stop_id: obj.stop_id },
        {
          selected_causes: obj.selected_causes,
          user_comment: obj.user_comment,
          comment_date: moment(new Date()).format("YYYY-MM-DD"),
        },
        { upsert: true }
      );

      const stopUpdate = await updateStopManually({
        line_id: obj.line_id,
        date: obj.date,
        shift: obj.shift,
        machine_name: obj.machine_name,
        stop_id: obj.stop_id,
        stop_name: obj.machine_state,
      });

      return stopUpdate;
    } else {
      throw new Error('Update failed. No documents matched the filter criteria.');
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const handleSplitStop = async (eventSplitData, stopId, lineId, userName, date, shift, machineName) => {
  try {
    // Fetch the original stop data
    const stopData = await Stop.findOne({ line_id: lineId, date: date, shift: shift });
    if (!stopData) {
      throw new Error("Stop document not found.");
    }

    // Find the machine and event indices
    const machineIndex = stopData.machine_wise.findIndex((machine) => machine.machine_name === machineName);
    if (machineIndex === -1) {
      throw new Error(`Machine ${machineName} not found in Stop data.`);
    }

    const machine = stopData.machine_wise[machineIndex];
    const eventIndex = machine.event_wise.findIndex((event) => event._id.toString() === stopId);
    if (eventIndex === -1) {
      throw new Error(`Event with ID ${stopId} not found.`);
    }

    const parentEvent = machine.event_wise[eventIndex];

    // Save the original parent state (before modification)
    const originalParentState = parentEvent.parent_stop;

    // Adjust the original event's `to` time
    parentEvent.to = eventSplitData[0].from; // Set end time to the start of the first split
    parentEvent.stop_name = eventSplitData[0].machine_state; // Update parent stop_name
    parentEvent.parent_stop = parentEvent.stop_name; // Reflect the updated state

    // Calculate the total duration of the parent event using event_split_data
    const parentDuration = eventSplitData.reduce((total, split) => {
      const splitDuration = (new Date(split.to) - new Date(split.from)) / 1000; // Duration in seconds
      return total + splitDuration;
    }, 0);

    // Create new split events
    const splitEvents = eventSplitData.map((split) => ({
      parent_stop: split.machine_state,
      stop_name: split.machine_state,
      timestamp: new Date(split.from),
      batch: parentEvent.batch,
      vendor: parentEvent.vendor,
      from: split.from,
      to: split.to,
      selected_causes: [new mongoose.Types.ObjectId(split.selected_causes)],
      fromChange: "split",
      good_count: 0, // Default or calculated good count
    }));

    // Insert the updated parent event and split events in the correct order
    stopData.machine_wise[machineIndex].event_wise.splice(eventIndex + 1, 0, ...splitEvents);

    // Update the Stop document
    await Stop.updateOne(
      { line_id: lineId, date: date, shift: shift },
      { $set: { machine_wise: stopData.machine_wise } }
    );

    // Update the Project collection
    // Deduct parent state duration

//     console.log("Parent Update Details:");
// console.log("lineId:", lineId);
// console.log("date:", date);
// console.log("shift:", shift);
// console.log("batch:", parentEvent.batch);
// console.log("vendor:", parentEvent.vendor);
// console.log("machineName:", machineName);
// console.log("originalParentState:", originalParentState);
// console.log("duration_type:", checkMajorMinor(parentDuration));

    const parentUpdateResult = await Project.updateOne(
      { line_id: lineId, date: date },
      {
        $inc: {
          "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[stopElement].duration": -parentDuration,
          "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[stopElement].details.$[detailsElement].duration": -parentDuration,
          "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[stopElement].details.$[detailsElement].count": -1,
        },
      },
      {
        arrayFilters: [
          { "shiftElement.shift_name": shift },
      { "batchElement.batch": parentEvent.batch },
      { "vendorElement.vendor": parentEvent.vendor },
      { "machineElement.machine_name": machineName },
      { "stopElement.stop_name": originalParentState },
      { "detailsElement.duration_type": checkMajorMinor(parentDuration) }, 
        ],
      }
    );

    if (parentUpdateResult.modifiedCount === 0) {
      console.error("Parent state update failed.");
    }
    

    

    // Add durations for split states
    for (const split of eventSplitData) {
      const splitDuration = (new Date(split.to) - new Date(split.from)) / 1000; // In seconds

      const splitUpdateResult = await Project.updateOne(
        { line_id: lineId, date: date },
        {
          $inc: {
            [`shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[newStopElement].duration`]: splitDuration,
            [`shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[newStopElement].count`]: 1,
            "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[newStopElement].details.$[detailsElement].duration": splitDuration,
            "shift_wise.$[shiftElement].batch_wise.$[batchElement].vendor_wise.$[vendorElement].machine_wise.$[machineElement].stop_wise.$[newStopElement].details.$[detailsElement].count": 1,
          },
        },
        {
          arrayFilters: [
            { "shiftElement.shift_name": shift },
            { "batchElement.batch": parentEvent.batch },
            { "vendorElement.vendor": parentEvent.vendor },
            { "machineElement.machine_name": machineName },
            { "newStopElement.stop_name": split.machine_state },
            { "detailsElement.duration_type": checkMajorMinor(splitDuration) }, 

          ],
        }
      );

      if (splitUpdateResult.modifiedCount === 0) {
        console.error(`Split state ${split.machine_state} update failed.`);
      }

      await Comment.updateOne(
        { stop_id: stopId }, // Use stop_id as the unique identifier for the comment
        {
          $set: {
            machine_name: machineName, // Already present in the schema
            selected_causes: [new mongoose.Types.ObjectId(split.selected_causes)], // Update causes
            user_comment: [
              {
                user_name: userName,
                comment: split.user_comment || "State updated", // Add user comment
              },
            ],
            created_date: new Date(),
            comment_date: new Date(), // Add timestamps
          },
        },
        { upsert: true } // Create a new comment if one doesn't already exist
      );
      
    }

    return { message: "Splits processed successfully." };
  } catch (error) {
    console.error("Error in handleSplitStop:", error);
    throw error;
  }
};


const getDayWiseReport = async (line_id, date, cb) => {
  var addLines = await addLine
    .findOne({ line_id: line_id })
    .populate("line_id");
  var data = await Project.aggregate([
    {
      $match: {
        line_id: new mongoose.Types.ObjectId(line_id),
        date: new Date(date),
      },
    },
    { $unwind: "$shift_wise" },
    {
      $unwind: {
        path: "$shift_wise.batch_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "batchskutriggers",
        localField: "shift_wise.batch_wise.batch",
        foreignField: "_id",
        as: "batch",
      },
    },
    {
      $lookup: {
        from: "changeovers",
        localField: "shift_wise.batch_wise.changeover",
        foreignField: "_id",
        as: "batch_changeover",
      },
    },
    {
      $unwind: {
        path: "$batch",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$batch_changeover",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "fgexes",
        localField: "batch.product_name",
        foreignField: "_id",
        as: "fgex",
      },
    },
    {
      $lookup: {
        from: "lines",
        localField: "line_id",
        foreignField: "_id",
        as: "line",
      },
    },
    {
      $unwind: {
        path: "$fgex",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$line",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $unwind: {
        path: "$shift_wise.batch_wise.vendor_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$shift_wise.batch_wise.vendor_wise.machine_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "equipment",
        let: {
          line_id: "$line_id",
          equipment_name:
            "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ["$line_id", "$$line_id"],
                  },
                  {
                    $eq: ["$equipment_name", "$$equipment_name"],
                  },
                ],
              },
            },
          },
        ],
        as: "machine",
      },
    },
    {
      $lookup: {
        from: "changeovermasters",
        localField: "batch_changeover.changeover_type_id",
        foreignField: "_id",
        as: "changeover_type",
      },
    },
    {
      $unwind: {
        path: "$machine",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$changeover_type",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        line_id: "$line.line_name",
        shift: "$shift_wise.shift_name",
        machine: "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
        line: "$line_id",
        goodCount: {
          $cond: [
            {
              $eq: ["$machine.product", "case"],
            },
            {
              $multiply: [
                "$fgex.bottles_per_case",
                "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
              ],
            },
            "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
          ],
        },
        raw_good_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
        raw_cycle_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
        cycle_count: {
          $cond: [
            {
              $eq: ["$machine.product", "case"],
            },
            {
              $multiply: [
                "$fgex.bottles_per_case",
                "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
              ],
            },
            "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
          ],
        },
        reject_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.reject_count",
        startup_reject:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.startup_reject",
        schedule_break:
          "$shift_wise.batch_wise.vendor_wise.machine_wise. schedule_break",
        waitingCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.waitingCriticaloff",
        blockedCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.blockedCriticaloff",
        major_manual_stopCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.major_manual_stopCriticaloff",
        minor_manual_stopCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.minor_manual_stopCriticaloff",
        readyCriticaloff:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.readyCriticaloff",
        standard_duration: {
          $multiply: ["$changeover_type.standard_duration", 60],
        },
        batch_changeover: {
          $round: [
            {
              $divide: [
                {
                  $subtract: [
                    {
                      $ifNull: [
                        "$batch_changeover.changeover_end_date",
                        new Date(),
                      ],
                    },
                    "$batch_changeover.changeover_start_date",
                  ],
                },
                1000,
              ],
            },
            0,
          ],
        },
        batch_power_off: {
          $ifNull: [
            {
              $sum: [
                "$batch_changeover.quality_power_off",
                "$batch_changeover.mechanical_power_off",
              ],
            },
            0,
          ],
        },
        fault: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "fault"] },
          },
        },
        date: "$date",
        changeover: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "changeover"] },
          },
        },
        blocked: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "blocked"] },
          },
        },
        cip: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "cip"] },
          },
        },
        pdt: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "pdt"] },
          },
        },
        manual_stop: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "manual_stop"] },
          },
        },
        updt: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "updt"] },
          },
        },
        waiting: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "waiting"] },
          },
        },
        ready: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "ready"] },
          },
        },
        schedule_maintance: {
          $filter: {
            input: "$shift_wise.batch_wise.vendor_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "schedule_maintance"] },
          },
        },
        rated_speed: {
          $ifNull: ["$fgex.rated_speed", 60],
        },
        product: "$fgex.sku_description",
        batch_name: "$batch.batch",
        batch_start: "$shift_wise.batch_wise.vendor_wise.start_timestamp",
        batch_end: "$shift_wise.batch_wise.vendor_wise.end_timestamp",
        setup: {
          $subtract: [
            {
              $ifNull: ["$shift_wise.batch_wise.machine_wise.setup_time", 0],
            },
            {
              $ifNull: [
                "$shift_wise.batch_wise.machine_wise.set_up_power_off",
                0,
              ],
            },
          ],
        },
      },
    },
    {
      $match: {
        batch_end: { $ne: null },
      },
    },
    {
      $unwind: {
        path: "$schedule_maintance",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$waiting",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$changeover",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$pdt",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$cip",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$updt",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$blocked",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$manual_stop",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$fault",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$ready",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        line_id: 1,
        schedule_break: {
          $ifNull: ["$schedule_break", 0],
        },
        rated_speed: 1,
        schedule_maintance: 1,
        machine_name: 1,
        goodCount: 1,
        reject_count: 1,
        standard_duration: 1,
        waitingCriticaloff: 1,
        blockedCriticaloff: 1,
        manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        cycle_count: 1,
        machine: 1,
        line: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        changeover_split: {
          $cond: [
            {
              $lte: [
                {
                  $subtract: ["$batch_changeover", "$batch_power_off"],
                },
                0,
              ],
            },
            "$standard_duration",
            {
              $divide: [
                "$standard_duration",
                {
                  $subtract: ["$batch_changeover", "$batch_power_off"],
                },
              ],
            },
          ],
        },
        date: 1,
        case_count: 1,
        shift: 1,
        fault: 1,
        ready: 1,
        blocked: 1,
        cip: 1,
        waiting: 1,
        updt: 1,
        pdt: 1,
        product: 1,
        changeover: 1,
        manual_stop: 1,
        startup_reject: 1,
        mechanical_changeover: {
          $subtract: ["$changeover.duration", "$setup"],
        },
        setup_changeover: "$setup",
        batch_start: 1,
        batch_end: 1,
        batch_size: 1,
        batch_name: 1,
        changeover_type: 1,
        total_batch_duration: {
          $round: [
            {
              $divide: [
                {
                  $subtract: ["$batch_end", "$batch_start"],
                },
                1000,
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $project: {
        line_id: 1,
        schedule_break: 1,
        rated_speed: {
          $divide: ["$rated_speed", 60],
        },
        machine: 1,
        line: 1,
        product: 1,
        machine_name: 1,
        goodCount: 1,
        reject_count: 1,
        case_count: 1,
        batch_name: 1,
        standard_duration: 1,
        total_batch_duration: 1,
        date: 1,
        waitingCriticaloff: 1,
        blockedCriticaloff: 1,
        readyCriticaloff: 1,
        cycle_count: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        shift: 1,
        schedule_break: 1,
        batch_start: 1,
        batch_end: 1,
        startup_reject: 1,
        schedule_maintance: {
          $ifNull: ["$schedule_maintance.duration", 0],
        },
        schedule_maintance_count: {
          $ifNull: ["$schedule_maintance.count", 0],
        },
        blocked: {
          $ifNull: ["$blocked.duration", 0],
        },
        blocked_count: {
          $ifNull: ["$blocked.count", 0],
        },
        cip: {
          $ifNull: ["$cip.duration", 0],
        },
        cip_count: {
          $ifNull: ["$cip.count", 0],
        },
        waiting: {
          $ifNull: ["$waiting.duration", 0],
        },
        waiting_count: {
          $ifNull: ["$waiting.count", 0],
        },
        break_pdt: {
          $ifNull: ["$pdt.duration", 0],
        },
        co_pdt: {
          $cond: [
            {
              $gte: ["$changeover_split", 1],
            },
            {
              $ifNull: ["$changeover.duration", 0],
            },
            {
              $multiply: [
                "$changeover_split",
                {
                  $ifNull: ["$changeover.duration", 0],
                },
              ],
            },
          ],
        },
        pdt: {
          $cond: [
            {
              $gte: ["$changeover_split", 1],
            },
            {
              $sum: [
                {
                  $ifNull: ["$changeover.duration", 0],
                },
                {
                  $ifNull: ["$pdt.duration", 0],
                },
              ],
            },
            {
              $sum: [
                {
                  $ifNull: ["$pdt.duration", 0],
                },
                {
                  $multiply: [
                    "$changeover_split",
                    {
                      $ifNull: ["$changeover.duration", 0],
                    },
                  ],
                },
              ],
            },
          ],
        },
        pdt_count: {
          $ifNull: ["$pdt.count", 0],
        },
        updt: {
          $ifNull: ["$updt.duration", 0],
        },
        ready: {
          $ifNull: ["$ready.duration", 0],
        },
        ready_count: {
          $ifNull: ["$ready.count", 0],
        },
        updt_count: "$updt.count",
        changeover: {
          $cond: [
            {
              $gte: ["$changeover_split", 1],
            },
            0,
            {
              $subtract: [
                {
                  $ifNull: ["$changeover.duration", 0],
                },
                {
                  $multiply: [
                    "$changeover_split",
                    {
                      $ifNull: ["$changeover.duration", 0],
                    },
                  ],
                },
              ],
            },
          ],
        },
        changeover_count: {
          $ifNull: ["$changeover.count", 0],
        },
        fault: {
          $ifNull: ["$fault.duration", 0],
        },
        fault_count: {
          $ifNull: ["$fault.count", 0],
        },
        manual_stop: {
          $ifNull: ["$manual_stop.duration", 0],
        },
        manual_stop_count: {
          $ifNull: ["$manual_stop.count", 0],
        },
        changeover_type: 1,
        batch_end_type: 1,
        mechanical_changeover: {
          $cond: [
            {
              $lt: ["$mechanical_changeover", 0],
            },
            0,
            "$mechanical_changeover",
          ],
        },
        setup_changeover: 1,
      },
    },
    {
      $project: {
        line_id: 1,
        schedule_break: 1,
        waitingCriticaloff: 1,
        machine: 1,
        line: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        blockedCriticaloff: 1,
        manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        cycle_count: 1,
        schedule_maintance: 1,
        schedule_maintance_count: 1,
        ready_count: 1,
        rated_speed: 1,
        product: 1,
        machine_name: 1,
        goodCount: 1,
        case_count: 1,
        reject_count: 1,
        batch_name: 1,
        date: 1,
        shift: 1,
        batch_start: 1,
        batch_end: 1,
        blocked: 1,
        blocked_count: 1,
        cip: 1,
        cip_count: 1,
        waiting: 1,
        waiting_count: 1,
        pdt: 1,
        pdt_count: 1,
        break_pdt: 1,
        co_pdt: 1,
        co_pdt_count: {
          $cond: [
            {
              $gt: ["$co_pdt", 0],
            },
            1,
            0,
          ],
        },
        break_pdt_count: "$pdt_count",
        updt: 1,
        ready: 1,
        updt_count: 1,
        changeover: 1,
        changeover_count: 1,
        fault: 1,
        fault_count: 1,
        manual_stop: 1,
        manual_stop_count: 1,
        npt: {
          $round: [
            {
              $subtract: [
                "$total_batch_duration",
                {
                  $sum: ["$schedule_break", "$pdt"],
                },
              ],
            },
            0,
          ],
        },
        ppt_time: {
          $round: [
            {
              $subtract: [
                "$total_batch_duration",
                {
                  $sum: ["$pdt", "$schedule_maintance", "$cip", "$changeover"],
                },
              ],
            },
            0,
          ],
        },
        got_time: {
          $round: [
            {
              $subtract: [
                "$total_batch_duration",
                {
                  $sum: [
                    "$pdt",
                    "$updt",
                    "$changeover",
                    "$schedule_maintance",
                    "$cip",
                    "$fault",
                    "$manual_stop",
                  ],
                },
              ],
            },
            0,
          ],
        },
        total_batch_duration: 1,
        idle_time: {
          $sum: ["$blocked", "$waiting", "$ready"],
        },
        idle_count: {
          $sum: ["$blocked_count", "$waiting_count", "$ready_count"],
        },
      },
    },
    {
      $project: {
        line_id: 1,
        npt: 1,
        schedule_break: 1,
        rated_speed: 1,
        changeover_id: 1,
        waitingCriticaloff: 1,
        machine: 1,
        line: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        blockedCriticaloff: 1,
        manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        critical_off: 1,
        cycle_count: 1,
        schedule_maintance: 1,
        schedule_maintance_count: 1,
        product: 1,
        machine_name: 1,
        idle_time: 1,
        idle_count: 1,
        date: 1,
        shift: 1,
        batch_name: 1,
        batch_size: 1,
        batch_start: 1,
        batch_end: 1,
        startup_reject: 1,
        working_time: 1,
        goodCount: 1,
        case_count: 1,
        reject_count: 1,
        blocked: 1,
        ready: 1,
        blocked_count: 1,
        cip: 1,
        cip_count: 1,
        waiting: 1,
        waiting_count: 1,
        manual_stop: 1,
        manual_stop_count: 1,
        pdt: 1,
        pdt_count: {
          $sum: ["$co_pdt_count", "$break_pdt_count"],
        },
        break_pdt: 1,
        break_pdt_count: 1,
        co_pdt_count: 1,
        co_pdt: 1,
        updt: 1,
        updt_count: 1,
        changeover: 1,
        changeover_count: 1,
        total_batch_duration: 1,
        fault: 1,
        fault_count: 1,
        minor_fault: 1,
        minor_fault_count: 1,
        idle_time: 1,
        idle_count: 1,
        ppt_time: 1,
        got_time: {
          $cond: [
            {
              $lt: ["$got_time", 60],
            },
            0,
            "$got_time",
          ],
        },
        avg_speed: {
          $cond: [
            {
              $or: [
                {
                  $lte: ["$got_time", 60],
                },
                { $lte: [{ $sum: ["$goodCount", "$reject_count"] }, 0] },
                {
                  $lte: [{ $subtract: ["$got_time", "$idle_time"] }, 0],
                },
              ],
            },
            0,
            {
              $round: [
                {
                  $divide: [
                    { $sum: ["$goodCount", "$reject_count"] },
                    {
                      $subtract: [
                        "$got_time",
                        {
                          $sum: ["$idle_time", "$fault", "$manual_stop"],
                        },
                      ],
                    },
                  ],
                },
                0,
              ],
            },
          ],
        },
        et: {
          $cond: [
            {
              $or: [
                {
                  $lte: ["$npt", 60],
                },
                { $lt: [{ $sum: ["$goodCount", "$reject_count"] }, 0] },
              ],
            },
            0,
            {
              $round: [
                {
                  $divide: [
                    { $sum: ["$goodCount", "$reject_count"] },
                    "$rated_speed",
                  ],
                },
                0,
              ],
            },
          ],
        },
        performance_time: {
          $cond: [
            {
              $or: [
                {
                  $lte: ["$got_time", 60],
                },
                //{ $lt: [{ $sum: ["$goodCount", "$reject_count"] }, 0] },
              ],
            },
            0,
            {
              $round: [
                {
                  $subtract: [
                    "$got_time",
                    {
                      $sum: [
                        {
                          $divide: [
                            {
                              $sum: ["$goodCount", "$reject_count"],
                            },
                            "$rated_speed",
                          ],
                        },
                      ],
                    },
                  ],
                },
                0,
              ],
            },
          ],
        },
        reject_time: {
          $round: [
            {
              $divide: ["$reject_count", "$rated_speed"],
            },
            0,
          ],
        },
        changeover_wastage_time: {
          $round: [
            {
              $divide: ["$startup_reject", "$rated_speed"],
            },
            0,
          ],
        },
      },
    },
    {
      $project: {
        line_id: 1,
        schedule_break: 1,
        et: 1,
        npt: 1,
        rated_speed: 1,
        changeover_id: 1,
        waitingCriticaloff: 1,
        machine: 1,
        line: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        blockedCriticaloff: 1,
        manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        critical_off: 1,
        cycle_count: 1,
        vender_name: 1,
        schedule_maintance: 1,
        schedule_maintance_count: 1,
        cip: 1,
        cip_count: 1,
        fault_arr: 1,
        format: 1,
        product: 1,
        machine_name: 1,
        idle_time: 1,
        idle_count: 1,
        operator_name: 1,
        date: 1,
        shift: 1,
        ready: 1,
        batch_name: 1,
        batch_size: 1,
        batch_start: 1,
        batch_end: 1,
        startup_reject: 1,
        ppt_time: 1,
        goodCount: 1,
        case_count: 1,
        reject_count: 1,
        blocked: 1,
        blocked_count: 1,
        waiting: 1,
        waiting_count: 1,
        manual_stop: 1,
        manual_stop_count: 1,
        pdt: 1,
        fault_arr: 1,
        pdt_count: 1,
        break_pdt: 1,
        co_pdt: 1,
        break_pdt_count: 1,
        co_pdt_count: 1,
        updt: 1,
        updt_count: 1,
        changeover: 1,
        changeover_count: 1,
        got_time: 1,
        total_batch_duration: 1,
        fault: 1,
        fault_count: 1,
        changeover_wastage_time: 1,
        reject_time: 1,
        performance_time: 1,
        speed_loss: {
          $subtract: ["$performance_time", "$idle_time"],
        },
      },
    },
    {
      $project: {
        line_id: 1,
        schedule_break: 1,
        et: 1,
        npt: 1,
        product: 1,
        rated_speed: 1,
        machine_name: 1,
        idle_time: 1,
        idle_count: 1,
        operator_name: 1,
        date: 1,
        shift: 1,
        changeover_id: 1,
        waitingCriticaloff: 1,
        machine: 1,
        line: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        blockedCriticaloff: 1,
        manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        critical_off: 1,
        cycle_count: 1,
        vender_name: 1,
        schedule_maintance: 1,
        schedule_maintance_count: 1,
        cip: 1,
        cip_count: 1,
        fault_arr: 1,
        ready: 1,
        batch_name: 1,
        batch_size: 1,
        batch_start: 1,
        batch_end: 1,
        startup_reject: 1,
        ppt_time: 1,
        goodCount: 1,
        case_count: 1,
        roll_changeover: 1,
        reject_count: 1,
        blocked: 1,
        blocked_count: 1,
        waiting: 1,
        waiting_count: 1,
        manual_stop: 1,
        manual_stop_count: 1,
        pdt: 1,
        pdt_count: 1,
        break_pdt: 1,
        co_pdt: 1,
        break_pdt_count: 1,
        co_pdt_count: 1,
        updt: 1,
        updt_count: 1,
        changeover: 1,
        changeover_count: 1,
        got_time: 1,
        total_batch_duration: 1,
        fault: 1,
        fault_count: 1,
        changeover_wastage_time: 1,
        reject_time: 1,
        performance_time: 1,
        speed_loss: 1,
        net_operating_time: {
          $subtract: [
            "$got_time",
            {
              $sum: ["$idle_time", "$speed_loss"],
            },
          ],
        },
      },
    },
    {
      $project: {
        line_id: 1,
        schedule_break: 1,
        et: 1,
        npt: 1,
        rated_speed: 1,
        product: 1,
        machine_name: 1,
        idle_time: 1,
        idle_count: 1,
        ready: 1,
        date: 1,
        shift: 1,
        changeover_id: 1,
        waitingCriticaloff: 1,
        machine: 1,
        line: 1,
        raw_good_count: 1,
        raw_cycle_count: 1,
        blockedCriticaloff: 1,
        manual_stopCriticaloff: 1,
        readyCriticaloff: 1,
        major_manual_stopCriticaloff: 1,
        minor_manual_stopCriticaloff: 1,
        critical_off: 1,
        cycle_count: 1,
        vender_name: 1,
        schedule_maintance: 1,
        schedule_maintance_count: 1,
        cip: 1,
        cip_count: 1,
        fault_arr: 1,
        batch_name: 1,
        batch_size: 1,
        case_count: 1,
        roll_changeover: 1,
        batch_start: 1,
        batch_end: 1,
        startup_reject: 1,
        ppt_time: 1,
        goodCount: 1,
        reject_count: 1,
        blocked: 1,
        blocked_count: 1,
        waiting: 1,
        waiting_count: 1,
        manual_stop: 1,
        manual_stop_count: 1,
        pdt: 1,
        pdt_count: 1,
        break_pdt: 1,
        co_pdt: 1,
        break_pdt_count: 1,
        co_pdt_count: 1,
        updt: 1,
        updt_count: 1,
        changeover: 1,
        changeover_count: 1,
        got_time: 1,
        total_batch_duration: 1,
        fault: 1,
        fault_count: 1,
        changeover_wastage_time: 1,
        reject_time: 1,
        performance_time: 1,
        speed_loss: 1,
        net_operating_time: 1,
        group_id: {
          $concat: ["$line_id", "$shift", "$machine", { $toString: "$date" }],
        },
        productive_time: {
          $subtract: [
            "$net_operating_time",
            "$reject_time",
            // {
            //   $sum: ["$reject_time", "$changeover_wastage_time"],
            // },
          ],
        },
      },
    },
    {
      $group: {
        _id: {
          main_id: "$group_id",
          shift: "$shift",
          machine: "$machine",
        },
        goodCount: { $sum: "$goodCount" },
        schedule_break: { $sum: "$schedule_break" },
        et: { $sum: "$et" },
        npt: { $sum: "$npt" },
        raw_good_count: { $sum: "$raw_good_count" },
        raw_cycle_count: { $sum: "$raw_cycle_count" },
        cycle_count: { $sum: "$cycle_count" },
        reject_count: { $sum: "$reject_count" },
        waitingCriticaloff: { $sum: "$waitingCriticaloff" },
        blockedCriticaloff: { $sum: "$blockedCriticaloff" },
        major_manual_stopCriticaloff: { $sum: "$major_manual_stopCriticaloff" },
        minor_manual_stopCriticaloff: { $sum: "$minor_manual_stopCriticaloff" },
        readyCriticaloff: { $sum: "$readyCriticaloff" },
        schedule_maintance: { $sum: "$schedule_maintance.duration" },
        schedule_maintance_count: { $sum: "$schedule_maintance.count" },
        case_count: { $sum: "$case_count" },
        startup_reject: { $sum: "$startup_reject" },
        blocked: { $sum: "$blocked" },
        blocked_count: { $sum: "$blocked_count" },
        waiting: { $sum: "$waiting" },
        waiting_count: { $sum: "$waiting_count" },
        manual_stop: { $sum: "$manual_stop" },
        manual_stop_count: { $sum: "$manual_stop_count" },
        pdt: { $sum: "$pdt" },
        pdt_count: { $sum: "$pdt_count" },
        cip: { $sum: "$cip" },
        cip_count: { $sum: "$cip_count" },
        updt: { $sum: "$updt" },
        ready: { $sum: "$ready" },
        updt_count: { $sum: "$updt_count" },
        ready_count: { $sum: "$ready_count" },
        changeover: { $sum: "$changeover" },
        changeover_count: { $sum: "$changeover_count" },
        fault: { $sum: "$fault" },
        fault_count: { $sum: "$fault_count" },
        total_time: { $sum: "$total_batch_duration" },
        ppt_time: { $sum: "$ppt_time" },
        got_time: { $sum: "$got_time" },
        performance_time: { $sum: "$performance_time" },
        speed_loss: { $sum: "$speed_loss" },
        net_operating_time: { $sum: "$net_operating_time" },
        productive_time: { $sum: "$productive_time" },
        raw: {
          $push: "$$ROOT",
        },
      },
    },
    {
      $group: {
        _id: "$_id.shift",
        raw: {
          $push: "$$ROOT",
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]);
  var send_data = `${addLines.line_id.line_name} Line ${moment(date)
    .local()
    .format("DD MMM")} Report `;
  send_data += "\n\n";
  var date_wise_obj = {};
    console.log(data);
  if (data.length > 0) {
    data.forEach((element, i) => {
      var critical_machine = element.raw.find(
        (me) => me._id.machine == addLines.critical_machine
      );

      var last_machine = element.raw.find(
        (me) => me._id.machine == addLines.last_machine_count_machine
      );

      date_wise_obj["critical_machine"] =
        date_wise_obj["critical_machine"] || {};
      date_wise_obj["last_machine"] = date_wise_obj["last_machine"] || {};

      date_wise_obj["critical_machine"]["good_count"] =
        date_wise_obj["critical_machine"]["good_count"] || 0;
      date_wise_obj["critical_machine"]["good_count"] +=
        critical_machine.raw_good_count;

      date_wise_obj["last_machine"]["good_count"] =
        date_wise_obj["last_machine"]["good_count"] || 0;
      date_wise_obj["last_machine"]["good_count"] +=
        last_machine.raw_good_count;

      date_wise_obj["critical_machine"]["reject_count"] =
        date_wise_obj["critical_machine"]["reject_count"] || 0;
      date_wise_obj["critical_machine"]["reject_count"] +=
        critical_machine.reject_count;

      date_wise_obj["critical_machine"]["total_time"] =
        date_wise_obj["critical_machine"]["total_time"] || 0;
      date_wise_obj["critical_machine"]["total_time"] +=
        critical_machine.total_time;

      date_wise_obj["critical_machine"]["ppt_time"] =
        date_wise_obj["critical_machine"]["ppt_time"] || 0;
      date_wise_obj["critical_machine"]["ppt_time"] +=
        critical_machine.ppt_time;

      date_wise_obj["critical_machine"]["got_time"] =
        date_wise_obj["critical_machine"]["got_time"] || 0;
      date_wise_obj["critical_machine"]["got_time"] +=
        critical_machine.got_time;

      date_wise_obj["critical_machine"]["performance_time"] =
        date_wise_obj["critical_machine"]["performance_time"] || 0;
      date_wise_obj["critical_machine"]["performance_time"] +=
        critical_machine.performance_time;

      date_wise_obj["critical_machine"]["speed_loss"] =
        date_wise_obj["critical_machine"]["speed_loss"] || 0;
      date_wise_obj["critical_machine"]["speed_loss"] +=
        critical_machine.speed_loss;

      date_wise_obj["critical_machine"]["net_operating_time"] =
        date_wise_obj["critical_machine"]["net_operating_time"] || 0;
      date_wise_obj["critical_machine"]["net_operating_time"] +=
        critical_machine.net_operating_time;

      date_wise_obj["critical_machine"]["productive_time"] =
        date_wise_obj["critical_machine"]["productive_time"] || 0;
      date_wise_obj["critical_machine"]["productive_time"] +=
        critical_machine.productive_time;

      date_wise_obj["critical_machine"]["cip"] =
        date_wise_obj["critical_machine"]["cip"] || 0;
      date_wise_obj["critical_machine"]["cip"] += critical_machine.cip;

      date_wise_obj["critical_machine"]["changeover"] =
        date_wise_obj["critical_machine"]["changeover"] || 0;
      date_wise_obj["critical_machine"]["changeover"] +=
        critical_machine.changeover;

      date_wise_obj["critical_machine"]["total_downtime"] =
        date_wise_obj["critical_machine"]["total_downtime"] || 0;
      date_wise_obj["critical_machine"]["total_downtime"] +=
        critical_machine.waiting +
        critical_machine.ready +
        critical_machine.blocked +
        critical_machine.fault +
        critical_machine.manual_stop;

      date_wise_obj["critical_machine"]["et"] =
        date_wise_obj["critical_machine"]["et"] || 0;
      date_wise_obj["critical_machine"]["et"] += critical_machine.et;

      date_wise_obj["critical_machine"]["npt"] =
        date_wise_obj["critical_machine"]["npt"] || 0;
      date_wise_obj["critical_machine"]["npt"] += critical_machine.npt;
      // Sort the data based on batch start time
      let shift_sku_wise = last_machine.raw.sort(
        (a, b) => new Date(a.batch_start) - new Date(b.batch_start)
      );

      // Group by the 'product' key and get the start and end times for each SKU
      const results = {};

      shift_sku_wise.forEach((item) => {
        const productKey = item.product;
        if (!results[productKey]) {
          results[productKey] = {
            start: item.batch_start,
            end: item.batch_end,
            count: item.raw_good_count,
          };
        } else {
          results[productKey].end = item.batch_end;
          results[productKey].count += item.raw_good_count;
        }
      });
      var counter = 1;

      send_data += `<b> ${critical_machine._id.shift} Bottle Production :&#8658</b> ${critical_machine.raw_good_count}\n`;
      for (const product in results) {
        send_data += `SKU${counter} &#8658 ${product} (From ${moment(
          results[product].start
        ).format("HH:mm")} to ${moment(results[product].end).format(
          "HH:mm"
        )}, case count ${results[product].count})\n`;
        counter++;
      }

      send_data += `<b> ${critical_machine._id.shift} Case Output :&#8658</b> ${last_machine.raw_good_count}\n`;

      send_data += `<b> ${
        critical_machine._id.shift
      } Down time :&#8658</b> ${convertHHMM(
        critical_machine.waiting +
          critical_machine.ready +
          critical_machine.blocked +
          critical_machine.fault +
          critical_machine.manual_stop
      )}\n`;

      // send_data += `<b> ${critical_machine._id.shift} OEE :&#8658</b> ${(
      //   checkValidation(critical_machine.productive_time / critical_machine.ppt_time) *
      //   100
      // ).toFixed(2)}% \n`;

      send_data += `<b> ${critical_machine._id.shift} Avg ME :&#8658</b> ${(
        checkValidation(
          critical_machine.et /
            (critical_machine.npt -
              critical_machine.cip -
              critical_machine.changeover)
        ) * 100
      ).toFixed(2)}% \n`;

      send_data += `<b> ${critical_machine._id.shift} Avg SLE :&#8658</b> ${(
        checkValidation(critical_machine.et / critical_machine.npt) * 100
      ).toFixed(2)}% \n`;

      send_data += "\n";
      if (i + 1 == data.length) {
        send_data += `<b> Total Bottle Production :&#8658</b> ${date_wise_obj.critical_machine.good_count}\n`;

        send_data += `<b> Total Case Output :&#8658</b> ${date_wise_obj.last_machine.good_count}\n`;

        send_data += `<b> Total Down time :&#8658</b> ${convertHHMM(
          date_wise_obj.critical_machine.total_downtime
        )}\n`;

        // send_data += `<b> Total OEE :&#8658</b> ${(
        //   checkValidation(date_wise_obj.critical_machine.productive_time /
        //     date_wise_obj.critical_machine.ppt_time) *
        //   100
        // ).toFixed(2)}% \n`;

        send_data += `<b> Total Day Avg ME :&#8658</b> ${(
          checkValidation(
            date_wise_obj.critical_machine.et /
              (date_wise_obj.critical_machine.npt -
                date_wise_obj.critical_machine.cip -
                date_wise_obj.critical_machine.changeover)
          ) * 100
        ).toFixed(2)}% \n`;

        send_data += `<b> Total Day Avg SLE :&#8658</b> ${(
          checkValidation(
            date_wise_obj.critical_machine.et /
              date_wise_obj.critical_machine.npt
          ) * 100
        ).toFixed(2)}% \n`;
        cb(send_data);
      }
    });
  } else {
    cb("No Data Found For This Date");
  }
};

const getShiftDatewiseCount = async (line_id,date) =>{ 
  var data = await Project.aggregate([
    {
      $match: {
        line_id: new mongoose.Types.ObjectId(line_id),
        date: new Date(date),
      },
    },
    { $unwind: "$shift_wise" },
    {
      $unwind: {
        path: "$shift_wise.batch_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$shift_wise.batch_wise.vendor_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$shift_wise.batch_wise.vendor_wise.machine_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$machine",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        line_id: "$line.line_name",
        shift: "$shift_wise.shift_name",
        machine: "$shift_wise.batch_wise.vendor_wise.machine_wise.machine_name",
        line: "$line_id",
        raw_good_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.goodCount",
        raw_cycle_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.cycle_count",
        reject_count:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.reject_count",
        startup_reject:
          "$shift_wise.batch_wise.vendor_wise.machine_wise.startup_reject",
        date: "$date",
        batch_end: "$shift_wise.batch_wise.vendor_wise.end_timestamp",
      },
    },
    {
      $match: {
        batch_end: { $ne: null },
      },
    },
    {
      $project: {
        shift: 1,
        machine: 1,
        raw_good_count:1,
        raw_cycle_count:1,
        reject_count:1,
        startup_reject:1,
        date: 1,
        group_id: {
          $concat: ["$line_id", "$shift", "$machine", { $toString: "$date" }],
        },
        
      },
    },
    {
      $group: {
        _id: {
          main_id: "$group_id",
          shift: "$shift",
          machine: "$machine",
        },
        good_count: { $sum: "$raw_good_count" },
        cycle_count: { $sum: "$raw_cycle_count" },
        reject_count: { $sum: "$reject_count" },
        startup_reject: { $sum: "$startup_reject" },
        raw: {
          $push: "$$ROOT",
        },
      },
    },
    {
      $group: {
        _id: "$_id.shift",
        raw: {
          $push: "$$ROOT",
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]);

  return data;

}

//function check major minor
function checkMajorMinor(duration) {
  if (duration > major_minor_duration * 60) {
    return "major";
  } else {
    return "minor";
  }
}

function convertHHMM(totalSeconds) {
  var init = totalSeconds;
  h = Math.floor(Math.abs(totalSeconds) / 3600);
  totalSeconds = Math.abs(totalSeconds) % 3600;
  m = Math.floor(totalSeconds / 60);
  s = Math.round(totalSeconds % 60);
  if (init < 0) {
    return (
      "-(" + checkNumber(h) + ":" + checkNumber(m) + ":" + checkNumber(s) + ")"
    );
  } else {
    return checkNumber(h) + ":" + checkNumber(m) + ":" + checkNumber(s);
  }
}
function checkNumber(number) {
  if (number < 10) {
    return `0${number}`;
  } else {
    return number;
  }
}

function checkValidation(value) {
  if (value < 0 || value === Infinity || !value) {
    return 0;
  } else if (value > 1) {
    return 0.99;
  } else {
    return value;
  }
}

function MttrValidation(value) {
  if (value < 0 || value === Infinity || !value) {
    return 0;
  } else {
    return value;
  }
}

function checkNumber(number) {
  if (number < 10) {
    return `0${number}`;
  } else {
    return number;
  }
}

module.exports.Project = Project;
module.exports.updateStopData = updateStopData;
//module.exports.addShiftData = addShiftData;
//module.exports.addMachineData = addMachineData;
//module.exports.addBatchData = addBatchData;
//module.exports.addVendorData = addVendorData;
//module.exports.batchEnd = batchEnd;
module.exports.updateGoodCount = updateGoodCount;
module.exports.updateMaxBpm = updateMaxBpm;
module.exports.updateStartupReject = updateStartupReject;
module.exports.updateSetupPoweroff = updateSetupPoweroff;
module.exports.updateCriticalOff = updateCriticalOff;
module.exports.getShiftDatewiseCount = getShiftDatewiseCount;
module.exports.changestop = changestop; 
module.exports.handleSplitStop = handleSplitStop;
module.exports.getDayWiseReport = getDayWiseReport;
