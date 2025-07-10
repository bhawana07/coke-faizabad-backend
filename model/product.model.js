const mongoose = require("mongoose");
var NumberRequire = {
  type: Number,
};

var sku = new mongoose.Schema(
  {
    sku_name: {
      type: String,
      required: true
    },
    sku_number: NumberRequire,
    group: {
      type: String,
    },
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line"
    },
    bottle_neck: {
      type: String
    },
    bpm: {
      type:Number,
    },
    bpc:NumberRequire,
    cpp:NumberRequire,
    speed_per_shift: NumberRequire,
    reliver: {
      type: Number,
      default: 0
    },
    standard_speed: {
      type: Number
    },
    rated_speed: {
      type: Number
    },
    production_start_calculation_minute:{
      type:Number
    },
    min_weight_range:{
      type:Number
    },
    max_weight_range:{
    type:Number
    },
    changover_start_calculation_minute :{
      type:Number
    },
    manpower: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "type"
      }
    ],
    format_id: [
      {
          type: mongoose.Schema.Types.ObjectId,
          ref: "format"
      },
    ],
    equipments: [
      {
          type: mongoose.Schema.Types.ObjectId,
          ref: "equipment"
      },
    ]
  },
  { timestamps: true }
);

var SkuMaster = mongoose.model("skuMaster", sku);
module.exports.SkuMaster = SkuMaster;

