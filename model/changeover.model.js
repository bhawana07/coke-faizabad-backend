var mongoose = require("mongoose");
var moment = require("moment");
var { CurrentShift } = require("./shift.model");
var { Condition } = require("./status.model");
var { updateSetupPoweroff } = require("./project.model");
// var {skuAdd} = require("./sku.model");
var ChangeOver = mongoose.Schema(
  {
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
    changeover_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "changeovermaster",
    },
    changeover_reason: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "changeover_reason",
    },
    changeover_end_date: {
      type: Date,
      default: null,
    },
    changeover_start_date: {
      type: Date,
      default: Date.now,
    },
    changeover_from_date: {
      type: Date,
    },
    changeover_to_date: {
      type: Date,
      default: null,
    },
    batch_name: {
      type: String,
    },
    standard_duration: {
      type: Number,
    },
    total_number_of_batch: {
      type: Number,
      default: 1,
    },
    batch_size: {
      type: String,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fgex",
    },
    fgex: {
      type: String,
      require: true,
    },
    pre_batch: {
      type: String,
    },
    pre_product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fgex",
    },
    shift: {
      type: String,
    },
    date: {
      type: Date,
    },
    changeover_finished: {
      type: Date,
      default: null,
    },
    finished_type: {
      type: String,
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "operator",
    },
    quality_power_off: {
      type: Number,
      default: 0,
    },
    mechanical_power_off: {
      type: Number,
      default: 0,
    },
    recipe_name: String,
    checklistgroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "checklistgroupMaster",
    },
    checklist: [
      {
        checklist: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "checklist",
        },
        start_time: {
          type: Date,
        },
        end_time: {
          type: Date,
          default: null,
        },
      },
    ],
    batch_end_cause: {},
    shift_wise: [
      {
        date: {
          type: Date,
        },
        shift: String,
        changeover_start_time: Date,
        changeover_end_time: {
          type: Date,
          default: null,
        },
        quality_power_off: {
          type: Number,
          default: 0,
        },
        mechanical_power_off: {
          type: Number,
          default: 0,
        },
        setup_time: {
          type: Date,
          default: null,
        },
        operator: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "operator",
        },
      },
    ],
  },
  { timestamps: true }
);

var changeOver = mongoose.model("changeOver", ChangeOver);

const getIsNullTrue = async (line_id) => {
  let changeover = await changeOver.findOne({
    line_id: line_id,
    changeover_end_date: null,
  });
  return changeover;
};

//get last changeover
const getLastChangeover = async (line_id) => {
  let changeover = await changeOver.findOne({
    line_id: line_id,
    changeover_to_date: null,
  });
  return changeover;
};


// Update ChangeOver
const updateChangeOver = async (type, line_id, batch_end_cause,cb) => {
  try {
    const power_off = 0;
    const data = await changeOver.updateOne(
      {
        line_id: line_id,
        changeover_end_date: null,
        "shift_wise.changeover_end_time": null,
      },
      {
        $set: {
          changeover_end_date: new Date(),
          finished_type: type,
          batch_end_cause: batch_end_cause,
          "shift_wise.$.changeover_end_time": new Date(),
        },
        $inc: {
          power_off: power_off,
          "shift_wise.$.power_off": power_off,
        },
      }
    );
    cb(data);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

/////push and update new shift
const pushAndUpdateChangeover = async (shift, operator, date, setup, line_id,cb) => {
  try {
    const timestamp = new Date();
    const setup_timestamp = setup ? timestamp : null;
    await changeOver.updateOne(
      {
        line_id: line_id,
        changeover_end_date: null,
        "shift_wise.changeover_end_time": null,
      },
      {
        $set: {
          "shift_wise.$.changeover_end_time": new Date(),
        },
      }
    );
    const data = await changeOver.updateOne(
      {
        changeover_end_date: null,
        line_id: line_id,
      },
      {
        $push: {
          shift_wise: {
            shift: shift,
            changeover_start_time: timestamp,
            setup_time: setup_timestamp,
            operator: operator,
            date: date,
          },
        },
      }
    );
     cb(data);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

//add setup mode
// Change Setup Mode
const changeSetupMode = async (line_id, timestamp,cb) => {
  try {
    const data = await changeOver.updateOne(
      {
        changeover_end_date: null,
        "shift_wise.changeover_end_time": null,
        line_id: line_id,
      },
      {
        $set: {
          "shift_wise.$.setup_time": timestamp,
          changeover_finished: timestamp,
        },
      }
    );
    cb(data);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Update Power Off
const updatePowerOff = async (shift, value, d, line_id, batch, machine, vendor) => {
  try {
    const check = await changeOver.findOne({
      changeover_end_date: null,
      line_id: line_id,
    });

    const fieldToUpdate = check.changeover_finished
      ? "quality_power_off"
      : "mechanical_power_off";

    const data = await changeOver.updateOne(
      {
        changeover_end_date: null,
        shift_wise: { $elemMatch: { date: d, shift: shift } },
        line_id: line_id,
      },
      {
        $inc: {
          [`shift_wise.$.${fieldToUpdate}`]: value,
          [fieldToUpdate]: value,
        },
      }
    );

    if (check.changeover_finished) {
      await updateSetupPoweroff(line_id, d, shift, batch, machine, value, vendor);
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};


module.exports.changeOver = changeOver;
module.exports.getIsNullTrue = getIsNullTrue;
module.exports.pushAndUpdateChangeover = pushAndUpdateChangeover;
module.exports.updateChangeOver = updateChangeOver;
module.exports.updatePowerOff = updatePowerOff;
module.exports.changeSetupMode = changeSetupMode;
module.exports.getLastChangeover = getLastChangeover;
