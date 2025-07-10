var mongoose = require("mongoose");
var moment = require("moment");
var changeover_checklist = mongoose.Schema(
  {
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
    changeover_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "changeovers",
    },
    start_time: {
      type: Date,
      default: Date.now(),
    },
    end_time: {
      type: Date,
      default: null,
    },
    changeover_group_checklist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "checklistgroupmasters",
    },
    checklist_items: [
      {
        checklist_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "checklist",
        },
        status: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  { timestamps: true }
);
var Changeover_checklist = mongoose.model(
  "changeover_checklist",
  changeover_checklist
);

//end cip
var endChecklist = async (line_id, cb) => {
  var checkChangeoverchecklist = await Changeover_checklist.findOne({
    line_id: line_id,
    end_timep: null,
  });
  if (checkChangeoverchecklist) {
    checkChangeoverchecklist.end_time = new Date();
    var save = await checkChangeoverchecklist.save();
    cb(save);
  } else {
    cb("ok");
  }
};

//add checgover in cip
var addChangeoverId = async (line_id, changeoverId, cb) => {
  var checkChangeoverchecklist = await Changeover_checklist.findOne({
    line_id: line_id,
    end_timep: null,
  });
  if (checkChangeoverchecklist) {
    checkChangeoverchecklist.changeover_id = changeoverId;
    var save = await checkChangeoverchecklist.save();
    cb(save);
  } else {
    cb(null);
  }
};

module.exports = {
  Changeover_checklist,
  endChecklist,
  addChangeoverId,
};
