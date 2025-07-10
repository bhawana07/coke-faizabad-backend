var mongoose = require("mongoose");
var typeSchema = new mongoose.Schema(
  {
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
      required:true
    },
    type: {
      type: String,
      required:true
    },
    value:{
      type: String,
      required:true
    },
    display_name:{
      type:String
    },
    last_modified_by:{
      type:String
    },
    additional_data:[]
  },
  { timestamps: true }
);
var Type = mongoose.model("type", typeSchema);
module.exports.Type = Type;
