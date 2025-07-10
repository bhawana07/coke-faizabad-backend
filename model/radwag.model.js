const moment = require("moment");
var mongoose = require("mongoose");

var radwagschema = new mongoose.Schema(
  {
  recipe_name: {///
      type: String,
      required: true,
  },
  recipe_code: {
      type: String,
      required: true,
  },
  batch_number: {
      type: String,
  },

  ingredient_arr: [
    {
        timestamp: {
            type: Date,
            required: true,
        },
        sap_ingredient_code: {
            type: String,
            required: true,
        },
        sap_ingredient_name: {
            type: String,
            required: true,
        },
        target_weight: {
            type: Number,
            required: true,
        },
        actual_weight: {
            type: Number,
            required: true,
        },

    },
  ],
  },      
  { timestamps: true }
);
var Radwag = mongoose.model("radwag", radwagschema);

module.exports = {
  Radwag
}
