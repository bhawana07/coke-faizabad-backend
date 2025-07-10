var mongoose = require("mongoose");
var moment = require("moment");
var Fgex = mongoose.Schema(
  {
    fgex: {
      type: String,
    },
    product_name: {
      type: String,
    },
    pack: {
      type: Number,
    },
    halb_code: {
      type: String,
    },
    // type: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "type",
    // },
    type: String,
    blister_size: {
      type: String,
    },
    blister_min: Number,
    blister_max: Number,
    current_machine: String,
    blister_per_format: Number,
    machine_cycle: Number,
    tablet_per_blister: {
      type: Number,
      default: 0,
    },
    layout_no: String,
    weight_per_format: Number,
    Remark: String,
    Secondary_machines_speed: Number,
    T200_use: {
      type: Boolean,
    },
    No_of_blisters: Number,
    last_updateby: String,

    recipe_type: Number,
    max_batch_time_fryma: Number,
    recipe_description: String,
    recipe_max_run_time: Number,
    preform_code: Number,
    preform_description: String,
    sku_number: Number,
    sku_description: String,
    fryma_number: Number,
    fryma_weight: Number,
    rated_speed: Number,
    maximum_speed: Number,
    bottles_per_case: Number,
    cases_per_pallet: Number,
    equipment_to_be_used: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "equipment"
    }],
    fryma_manpower: Number,
    filling_manpower: Number,
    recipe_code: Number,
    recipe_type: Number,
    net_weight: Number,
    updateArr: [
      {
        data: {},
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

Fgex.index({ sku_number: 1 });
var FGEX = mongoose.model("Fgex", Fgex);

module.exports.FGEX = FGEX;
