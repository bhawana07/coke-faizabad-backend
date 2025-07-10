var mongoose = require("mongoose");
var alertSchema = mongoose.Schema(
  {
    alert_name: {
      type: String,
    },
    shift: {
      type: String,
    },
    date: {
      type: Date,
    },
    is_email_send: {
      type: Boolean,
      default: false,
    },
    cc: String,
    to: String,
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
    remark: String,
  },
  { timestamps: true }
);

var Alerts = mongoose.model("Alerts", alertSchema);

var Addalerts = async (
  line_id,
  Alert_name,
  shift,
  d,
  email_sent,
  cc,
  to,
  remark,
  cb
) => {
  var data = new Alerts({
    shift: shift,
    date: d,
    is_email_send: email_sent,
    to: to,
    line_id: line_id,
    cc: cc,
    alert_name: Alert_name,
    remark: remark,
  });
  var result = await data.save();
  cb(result);
};

module.exports.Alerts = Alerts;
module.exports.Addalerts = Addalerts;
