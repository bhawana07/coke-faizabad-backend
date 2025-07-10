var mongoose = require('mongoose');
var  { Sap } = require('./sap.model');
var  { Fgex } = require('./fgex.model');
var queSchema = new mongoose.Schema({
    line_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "line",
    },
    status:{
        type:String
    },
    po_id:{
     type: mongoose.Schema.Types.ObjectId,
      ref: "sap",
    },
    fgex:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fgex",
    },
    user_name:{
        type:String
    }
},{timestamps:true});


var Que = mongoose.model('que',queSchema);

//add to que
var addToQue = async(obj,cb)=>{
    let {line_id,po_id,fgex,user_name  } = obj;
    var data = await Que.findOne({line_id:line_id,status:"queue"});
    if(!data){
        var que = new Que({
            line_id:line_id,
            status:"queue",
            po_id:po_id,
            fgex:fgex,
            user_name:user_name
        });
        var save = await que.save();
        cb(save)
    }else{
        data.fgex = fgex;
        data.po_id = po_id;
        var result = await data.save();
        cb(result)
    }
};

//remove from queue
var removeFromQue = async(po_id,line_id)=>{
    var data = await Que.findOne({line_id:line_id,po_id:po_id});
    if(data){
        data.po_id = null;
        data.fgex = null;
        data.save()
    }
}
module.exports = {
    Que,
    addToQue,
    removeFromQue
}