var mongoose = require("mongoose");
var { ciptypeMaster } = require("./ciptypemaster.model");
var { CurrentShift } = require("./shift.model")
var moment = require("moment");
var CIPMaster = mongoose.Schema(
  {
    cip_state: {
      type: String,
    },
    cip_start_timestamp: {
      type: Date,
      default: Date.now(),
    },
    cip_end_timestamp: {
      type: Date,
      default: null,
    },
    cip_type_string: {
      type: String,
      defualt: "automatic",
    },
    cip_type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "cipTypeMaster",
    },
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
    updated_by: String,
    water_use: {
      type: Number,
      default: 0,
    },
    start_date: {
      type: Date,
    },
    end_date: {
      type: Date,
      default:null
    },
    history_array: [
      {
        date: {
          type: Date,
          default: Date.now(),
        },
        state: String,
        updated_by: String,
        water_use: Number,
      },
    ],
  },
  { timestamps: true }
);

//start automatic CIp
var addNewCip = async (line_id, date,cb) => {
  //var cipmaster = await ciptypeMaster.findOne();
  var checkCip = await cipMaster.findOne({
    line_id: line_id,
    cip_end_timestamp: null,
  });
  if (checkCip) {
    checkCip.cip_end_timestamp = new Date();
    checkCip.end_date = date;
    await checkCip.save();
    var newCip = new cipMaster({
      cip_state: "start",
      cip_start_timestamp: new Date(),
      line_id: line_id,
      start_date:date,
      cip_type_string: "automatic",
      //cip_type: cipmaster._id,
      history_array: [
        {
          date: new Date(),
          state: "start",
          updated_by: "system",
          water_use: 0,
        },
      ],
    });
    var save = await newCip.save();
    cb(save);
  } else {
    var LastCip = await cipMaster.findOne({
      line_id: line_id,
      end_date: null,
    });
    LastCip.end_date = date;
    LastCip.save(async (err,doc)=>{
      if (err) return cb(err);
      var newCip = new cipMaster({
        cip_state: "start",
        line_id: line_id,
        cip_type_string: "automatic",
        cip_start_timestamp: new Date(),
        start_date:date,
        //cip_type: cipmaster._id,
        history_array: [
          {
            state: "start",
            cip_start_timestamp: new Date(),
            updated_by: "system",
            water_use: 0,
          },
        ],
      });
      var save = await newCip.save();
      cb(save);
    })
    
  }
};

//end cip
var endCip = async (line_id, water_use, cb) => {
  var checkCip = await cipMaster.findOne({
    line_id: line_id,
    cip_end_timestamp: null,
  });
  checkCip.cip_end_timestamp = new Date();
  checkCip.water_use = water_use;
  var save = await checkCip.save();
  cb(save);
};

var getCurrentCip = async(line_id,date) =>{
  var getCipData = await cipMaster.findOne({line_id:line_id,end_date:null});
  if(!getCipData){
    var newCip = new cipMaster({
      cip_state: "start",
      cip_start_timestamp: new Date(),
      cip_end_timestamp:new Date(),
      line_id: line_id,
      start_date:date,
      cip_type_string: "automatic",
      //cip_type: cipmaster._id,
      history_array: [
        {
          date: new Date(),
          state: "start",
          updated_by: "system",
          water_use: 0,
        },
      ],
    });
    var save = await newCip.save();
    return save;
  }
 return getCipData
}

var cipMaster = mongoose.model("cipMaster", CIPMaster);
module.exports.cipMaster = cipMaster;
module.exports.addNewCip = addNewCip;
module.exports.endCip = endCip;
module.exports.getCurrentCip = getCurrentCip;
