const mongoose = require("mongoose");
var moment = require("moment");
var { FGEX } = require("../model/fgex.model");
const chageover = require("./changeover.model");
const { changeOverMaster } = require("./changeovermaster.model");
var { addNewCip } = require("./cipmaster.model")
//var { Roster } = require("./roster.model");
var moment = require("moment");
//const { Sap } = require("./sap.model");
//var { TempGood, batch_Change_Processsite } = require("./goodTemp.model");
//const { Type } = require("./type.model");
//const { getApi } = require("../controller/apiHit.controller");
var moment = require("moment");
var batchskutrigger = new mongoose.Schema(
  {
    start_time: {
      type: Date,
      required: true,
      default: Date.now(),
    },
    start_date: {
      type: Date,
    },
    end_date: {
      type: Date,
    },
    // target_quantity: {
    //   type: Number,
    // },
    product_name: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fgex",
    },
    manual_batch_name:{
      type: String,
    },
    po_number: {
      type: String,
    },
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
    batch: {
      type: String,
      unique: true,
    },
    batch_set_by: {
      type: String,
      default: "Sap",
    },
    batch_end_type: {
      type: String,
    },
    batch_end_time: {
      type: Date,
    },
    batch_end_by: {
      type: String,
    },
    production_end_time: {
      type: Date,
    },
    batch_end_from: {
      type: String,
    },
    t200CountUse: {
      type: Boolean,
    },
    // format: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "format",
    // },
    batch_size: {
      type: Number,
    },
    end_time: {
      type: Date,
      default: null,
    },
    rated_speed: {
      type: Number,
    },
    remark: {
      type: String,
    },
    end_case: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "type",
    },
  },
  { timestamps: true }
);

var Batchskutrigger = mongoose.model("batchskutrigger", batchskutrigger);

const getCurrentBatch = async (line_id, d, year, dayOfYear,line_batch) => {
  const timestamp = moment().format("YYYY-MM-DDTHH:mm:ss");
  const batch_timestamp = moment().format("HHmm");

  const findActiveBatch = async () => {
    return Batchskutrigger.findOne({
      line_id: line_id,
      end_time: null,
    }).populate("product_name").populate("line_id");
  };

  const generateAutoBatch = async () => {
    const product = await FGEX.findOne();
    return {
      auto_batch:`First_${line_batch}${year}${product.sku_number}${dayOfYear}_${batch_timestamp}`,
      product:product
    };
  };

  const createNewBatch = async (auto_batch,product) => {
    const data = new Batchskutrigger({
      start_time: new Date(),
      start_date: d,
      batch_size: 28800,
      product_name: product._id,
      line_id: line_id,
      batch: auto_batch,
    });

    const master_data = new changeOverMaster({
      changeover_type: "filling",
      standard_duration: 120,
    });

    const master_save = await master_data.save();

    const changover_data = new chageover.changeOver({
      line_id: line_id,
      changeover_end_date: timestamp,
      changeover_start_date: timestamp,
      changeover_type_id: master_save._id,
      changeover_from_date: moment().local().format("YYYY-MM-DD"),
      batch_name: auto_batch,
      product_id: product._id,
    });

    await changover_data.save();

     addNewCip(line_id, d,()=>{

     }); 
    const result = await data.save();

    return result;
  };

  const checkAndEndBatch = async (batch) => {
    if (moment().diff(batch.start_time, 'days') > 7) {
      const auto_batch = `${batch.line_id.line_batch}${year}${batch.product_name.sku_number}${dayOfYear}_${batch_timestamp}`;

      const data = new Batchskutrigger({
        start_date: d,
        start_time: timestamp,
        batch_size: 64800,
        product_name: batch.product_name,
        line_id: line_id,
        batch: auto_batch,
      });

      const result = await data.save();

      batch.end_time = timestamp;
      batch.end_date = d;
      await batch.save();

      return result;
    }

    return batch;
  };

  const batch = await findActiveBatch();

  if (!batch) {
    let { auto_batch,product }  = await generateAutoBatch();
    return createNewBatch(auto_batch,product);
  }

  return checkAndEndBatch(batch);
};


var postSkuTrigger = async (
  batch_name,
  product,
  batch_size,
  line_id,
  start_date
) => {
  console.log(batch_name, product, batch_size, line_id, start_date);
  var batch = await Batchskutrigger.findOne({ end_time: null });
  // batch.isactive = false;
  batch.end_time = new Date();
  batch.end_date = start_date;
  batch.save();
  var new_batch = new Batchskutrigger({
    start_time: moment().format("YYYY-MM-DDTHH:mm:ss"),
    //target_quantity: target_quantity,
    start_date: start_date,
    batch_size: batch_size,
    line_id: line_id,
    product_name: product,
    batch: batch_name,
  });
  //console.log(new_batch);
  var result = await new_batch.save();
  if (result) {
    return result;
  } else {
    return "duplicate";
  }
};

var MachineCheckSku = async () => {
  var arr = [];
  var data = await Batchskutrigger.findOne({ isactive: true }).populate({
    path: "sku",
    select: { _id: 0, equipments: 1 },
    populate: { path: "equipments", select: { _id: 0, equipment_name: 1 } },
  });
  //console.log(data)
  data.sku.equipments.forEach((element) => {
    arr.push(element.equipment_name);
  });
  return arr;
};

//change batch end
// var updateBatchEnd = async(line_id,batch_end_time,batch_end_type,batch_end_from,batch_end_by,remark,end_cause,osd,hall,line_name,critical_machine,cb)=>{
//   var batch = await Batchskutrigger.findOne({ end_time: null,line_id:line_id }).populate("product_name");
//   var sap = await Sap.findOne({PONumber:batch.po_number});
//   sap.current_status = batch_end_type;
//   var spt = sap.LOTNumber.split("_");
//   var temp;
//   if(batch_end_type == 'early_batch_end'){
//     temp = await TempGood.findOne({line_id:line_id,machine:critical_machine});
//     var cause = await Type.findOne({_id:end_cause});
//     var good_count =  !batch.t200CountUse ? temp.current_good_value - temp.batch_start_good_count : (temp.current_no_of_case- temp.batch_start_no_of_case) * batch.product_name.No_of_blisters;
// 	if((sap.LOTSize - good_count) < 0){
// 		sap.LOTSize = 0
// 	}else{
// 		sap.LOTSize -= good_count
// 	}
//     if(!spt[1]){
//        sap.LOTNumber = sap.LOTNumber+"_A"
//     }else{
//        var suffix = nextChar(spt[1])
//        sap.LOTNumber = spt[0]+"_"+suffix
//     }
//     //console.log(`https://abc.smartfactoryworx.tech/v1/email/intas/early-batch-end?ln=${cause.line_id.line_name}&bst=${moment(batch.batch_start_time).local().format( "DD-MM-YYYY - hh:mm:ss A")}&bet=${moment().local().format( "DD-MM-YYYY - hh:mm:ss A")}&bn=${batch.batch}&m=${temp.machine_mode}&r=${cause.display_name}&o=${temp.current_operator}`)
//     getApi(`${process.env.early_batch_end_email_link}?osd=${osd}&hl=${hall}&ln=${line_name}&bst=${moment(batch.start_time).local().format( "DD-MM-YYYY - hh:mm:ss A")}&bet=${moment().local().format( "DD-MM-YYYY - hh:mm:ss A")}&bn=${batch.batch}&m=${temp.machine_mode}&r=${cause.display_name}&o=${temp.current_operator}`,
//     {
//       "content-type": "application/json",
//        authorization: `Bearer ${process.env.dashboardAuthToken}`,
//        Accept: "application/json",
//     },(api_res)=>{
//        console.log(api_res)
//     })
//     batch.batch_end_time = batch_end_time;
//     batch.batch_end_type = batch_end_type;
//     batch.batch_end_from = batch_end_from;
//     batch.batch_end_by = batch_end_by;
//     batch.remark = remark;
//     batch.end_case = end_cause;
//     var sap_save = await sap.save()
//     var save = await batch.save();
//     cb({
//       temp:temp,
//       batch:save,
//       sap:sap_save
//     })
//   }else{
//     getApi(`${process.env.batch_end_email_link}?osd=${osd}&hl=${hall}&ln=${line_name}&bn=${batch.batch}&bet=${moment().local().format( "DD-MM-YYYY - hh:mm:ss A")}`,
//     {
//       "content-type": "application/json",
//        authorization: `Bearer ${process.env.dashboardAuthToken}`,
//        Accept: "application/json",
//     },(api_res)=>{
//        console.log(api_res)
//     });
//     batch.batch_end_time = batch_end_time;
//     batch.batch_end_type = batch_end_type;
//     batch.batch_end_from = batch_end_from;
//     batch.batch_end_by = batch_end_by;
//     batch.remark = remark;
//     batch.end_case = end_cause;
//     var sap_save = await sap.save()
//     var save = await batch.save();
//     cb({
//       temp:temp,
//       batch:save,
//       sap:sap_save
//     })
//   }
// }
//add next charter in batch
function nextChar(c) {
  return String.fromCharCode(c.charCodeAt(0) + 1);
}
module.exports.Batchskutrigger = Batchskutrigger;
module.exports.getCurrentBatch = getCurrentBatch;
module.exports.postSkuTrigger = postSkuTrigger;
//module.exports.updateBatchEnd = updateBatchEnd;
