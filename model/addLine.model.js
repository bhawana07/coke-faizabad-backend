var mongoose = require("mongoose");
var { Equipment } = require("./equipment.model");
var { addNewCip, endCip } = require("./cipmaster.model");

var moment = require("moment");

var addLineSchema = new mongoose.Schema({
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
    required: true,
  },
  global_changeover: {
    default: false,
    type: Boolean,
  },
  global_cip: {
    default: false,
    type: Boolean,
  },
  cip_type: {
    type: Number,
    default: 0,
  },
  cip_mode: {
    default: false,
    type: Boolean,
  },
  global_setup: {
    default: false,
    type: Boolean,
  },
  critical_machine: {
    type: String,
    default: "filler",
  },
  total_no_of_machine:{
    type:Number,
    default:4
  },
  mqtt_topic: {
    type: String,
  },
  first_machine: {
    type: String,
    default: "blow_molding",
  },
  last_machine: {
    type: String,
    default: "shrink",
  },
  first_machine_position: {
    type: Number,
    default: 1,
  },
  last_machine_position: {
    type: Number,
    default: 6,
  },
  date_change_shift: {
    type: String,
    default: "Shift B",
  },
  thing_name: {
    type: String,
  },
  last_connected: {
    type: Date,
    default: Date.now,
  },
  water_use: {
    type: Number,
    default: 0,
  },
  no_of_batch_from_plc: {
    type: Number,
  },
  manual_no_batch: {
    type: Number,
  },
  sku: {
    type: Number,
  },
  is15minAlert: {
    type: Boolean,
    default: false,
  },
  is30minAlert: {
    type: Boolean,
    default: false,
  },
  is60minAlert: {
    type: Boolean,
    default: false,
  },
  last_machine_count_machine: {
    type: String,
  },
  cip_timestamp:{
    type:Date
  },
  machine_wise: [
    {
      machine_name: {
        type: String,
      },
      //plc tag
      machine_state: {
        type: Number,
      },
      machine_mode: {
        type: Number,
      },
      waiting: {
        type: Number,
      },
      cip: {
        type: Boolean,
        default: false,
      },
      ready: {
        type: Number,
        defualt: 0,
      },
      blocked: {
        type: Number,
      },
      first_fault: {
        type: Number,
      },
      input_count: {
        type: Number,
      },
      good_count: {
        type: Number,
      },
      reject_count: {
        type: Number,
      },
      bpm: {
        type: Number,
      },
      cycle_count: {
        type: Number,
        default: 0,
      },
      cap_count: {
        type: Number,
        default: 0,
      },
      label_count: {
        type: Number,
        default: 0,
      },
      updt: {
        type: Number,
      },
      fault_scroll: {
        type: Number,
      },
      manual_stop: {
        type: Boolean,
      },
      executing: {
        type: Boolean,
      },
      watch_dog: {
        type: Boolean,
      },
      RecipeNumber:{
        type:Number
      },
      isConnected: {
        type: Boolean,
        default: true,
      },
      nozzel_weight: [],
      plc_timestamp: {
        type: Date,
        default: Date.now,
      },
      gateway_last_connect: {
        type: Date,
        default: Date.now,
      },

      rated_speed: {
        type: Number,
      },
    },
  ],
});

var addLine = mongoose.model("addLine", addLineSchema);



//get line data
const MqttLineData = async (line_id, machine_name, obj, cb) => {
  try {
    // Find the document and populate the line_id field.
    const mqttLine = await addLine.findOne({ line_id }).populate('line_id');

    if (!mqttLine) {
      // Create and save a new line document if it doesn't exist.
      const newLine = new addLine({ line_id });
      await newLine.save();
      return cb ? cb(newLine) : newLine;
    }

    // Locate the machine in the machine_wise array.
    const machine = mqttLine.machine_wise.find((mach) => mach.machine_name === machine_name);

    if (!machine) {
      // Create a new Equipment and push a new machine record if it doesn't exist.
      const equipment = new Equipment({
        equipment_name: machine_name,
        display_name: machine_name.toUpperCase(),
        line_id,
        rated_speed: obj.rated_speed,
        isCritical: false,
      });

      mqttLine.machine_wise.push({
        machine_name,
        machine_state: obj.machine_state,
        waiting: obj.waiting,
        blocked: obj.blocked,
        first_fault: obj.first_fault,
        good_count: obj.good_count,
        reject_count: obj.reject_count,
        bpm: obj.bpm,
        cycle_count: obj.cycle_count,
        cap_count: obj.cap_count,
        label_count: obj.label_count,
        updt: obj.updt,
        fault_scroll: obj.fault_scroll,
        manual_stop: obj.manual_stop,
        watch_dog: obj.watch_dog,
        rated_speed: obj.rated_speed,
        executing: obj.executing,
        cip: obj.cip,
        ready: obj.ready,
      });

      await Promise.all([equipment.save(), mqttLine.save()]);
      return cb ? cb(mqttLine) : mqttLine;
    }

    // If the machine is not connected, retain its previous gateway_last_connect value.
    if (!obj.isConnected) {
      obj.gateway_last_connect = machine.gateway_last_connect;
    }

    // Helper to build update object for nested machine_wise fields using for...in loop.
    const buildUpdateFields = (data) => {
      const updateFields = {};
      for (const key in data) {
        if (data[key] != null) { // filters out null and undefined
          updateFields[`machine_wise.$[machineElement].${key}`] = data[key];
        }
      }
      return updateFields;
    };

    // Helper to build dynamic update object for top-level fields using a loop.
    const buildDynamicUpdate = (data) => {
      const update = { last_connected: new Date() };
      ['cip_type', 'cip_mode', 'water_use', 'no_of_batch_from_plc', 'cip_timestamp', 'sku']
        .forEach(key => {
          if (data[key] != null) update[key] = data[key];
        });
      return update;
    };

    if (machine_name === mqttLine.critical_machine) {
      // For the critical machine: if cip_type equals 1 and global_cip is not set, update it immediately.
      if (obj.cip_type === 1 && !mqttLine.global_cip) {
        mqttLine.global_cip = true;
        const savedLine = await mqttLine.save();
        return cb ? cb(savedLine) : savedLine;
      } else {
        // Combine the dynamic top-level updates with the nested machine update.
        await addLine.updateOne(
          { line_id },
          {
            $set: {
              ...buildDynamicUpdate(obj),
              ...buildUpdateFields(obj),
            },
          },
          { arrayFilters: [{ 'machineElement.machine_name': machine_name }] }
        );
      }
    } else {
      // For non-critical machines, update only the nested machine_wise fields.
      await addLine.updateOne(
        { line_id },
        { $set: buildUpdateFields(obj) },
        { arrayFilters: [{ 'machineElement.machine_name': machine_name }] }
      );
    }

    return cb ? cb(mqttLine) : mqttLine;
  } catch (error) {
    return cb ? cb(error) : Promise.reject(error);
  }
};

//dynamic update line
var updateLineData = async (line_id, tag, value, cb) => {
  try {
    var save = await addLine.updateOne(
      { line_id: line_id },
      { $set: { [tag]: value } }
    );
    cb(save);
    // No need for a callback here
  } catch (error) {
    // Handle errors here
    console.error(error);
  }
};

//reset Alert
var resetAlert = async (line_id) => {
  try {
    await addLine.updateOne(
      { line_id: line_id },
      {
        $set: {
          is15minAlert: false,
          is30minAlert: false,
          is60minAlert: false,
        },
      }
    );
    // No need for a callback here
  } catch (error) {
    // Handle errors here
    console.error(error);
  }
};

module.exports = {
  addLine,
  MqttLineData,
  updateLineData,
  resetAlert,
};
