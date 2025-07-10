const mongoose = require("mongoose");
var moment = require("moment");
//var { FGEX } = require("../model/fgex.model");
var { CurrentShift } = require("../model/shift.model");
//const { changeOverMaster } = require("../model/changeovermaster.model");
//var { Roster } = require("../model/roster.model");
var moment = require("moment");
var { addLine } = require("../model/addLine.model")
//const { Sap } = require("../model/sap.model");
var {
  TempGood,
  batchChangeProcessSide,
  updateChangeoverMode,
  updateCipMode
} = require("../model/goodTemp.model");
const { Batchskutrigger } = require("../model/batch.model");
const { addNewIndgredentMaster } = require("../model/indgredient.model");
const { addNewCip } = require("../model/cipmaster.model");

const batch_formed = async (line_id, d, plc_no_of_batch, cb) => {
  var batch = await Batchskutrigger.findOne({
    line_id: line_id,
    end_time: null,
  })
    .populate("product_name")
    .populate("line_id");
  var year = moment(d).format("YY");
  var dayOfYear = moment(d).dayOfYear();
  let timestamp = moment().format("YYYY-MM-DDTHH:mm:ss");
  var auto_batch;
  if (batch) {
    auto_batch = `${batch.line_id.line_batch}-${
      batch.product_name.sku_number
    }-${moment().format("YYYYMMDDHHmm")}`;
  }
  batch.end_time = timestamp;
  batch.end_date = d;
  batch.save();
  var data = new Batchskutrigger({
    start_time: new Date(),
    start_date: d,
    batch_size: 28800,
    po_number: batch.po_number,
    product_name: batch.product_name._id,
    line_id: line_id,
    //format: "5ea94dd6b5959e13903d309e",
    batch: auto_batch,
  });
  data.save().then((batch_data) => {
    batchChangeProcessSide(
      line_id,
      batch_data._id,
      plc_no_of_batch,
      (data) => {
        addNewIndgredentMaster(line_id, batch_data._id, () => {
          cb(data);
        });
      }
    );

  }).catch((error) => {
    console.error(error)
    // Handle errors here
  });;
};

const batchChangeOnCip = async (line_id,obj,cb) => {
  var pre_batch = await Batchskutrigger.findOne({
    line_id: line_id,
    end_time: null,
  }).populate("product_name");
  var lineData = await addLine.findOne({line_id:line_id}).populate("line_id");
  var d = obj.date;
  var changeover_id = obj.changeover_id;
  addNewCip(line_id, d, (newCip) => {
    let timestamp = moment().format("YYYY-MM-DDTHH:mm:ss");
    let batch_timestamp = moment().format("HHmm");
    var auto_batch = `${lineData.line_id.line_batch}${moment().format("YY")}${
      pre_batch.product_name.sku_number
    }${moment().dayOfYear()}_${batch_timestamp}`;
    var new_batch = new Batchskutrigger({
      start_time: timestamp,
      start_date: d,
      product_name: pre_batch.product_name._id,
      line_id: line_id,
      batch: auto_batch,
      batch_set_by: "From CIP Auto Batch",
      batch_size: 500000,
    });
    new_batch.save().then( async(result)  => {
        updateCipMode(
          line_id,
          {
            batch:result._id,
            addLine:lineData,
            changeover_id:changeover_id,
            cip:newCip._id,
            isSameType:true,
            venodr_id:""
          },
          () => {}
        );
        pre_batch.end_time = timestamp;
        pre_batch.end_date = d;
        await pre_batch.save();
        cb(result)
      
    }).catch((err)=>{
      console.error(err)
    });
  });
};

module.exports = {
  batch_formed,
  batchChangeOnCip,
};
