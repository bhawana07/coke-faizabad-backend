var mongoose = require('mongoose');
var moment =  require('moment');
var now = moment().local();
var hour = now.hour();
var statusnameschema = mongoose.Schema({
    line_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'line',
    },
    machine_name:{
        type:String
    },
    fault_code:{
        type:String
    },
    state:{
        type:String
    },
    fault_name:{
        type:String,
    },
    short_name:{
        type:String,
    },
    other_language:{
        type:String,
    }
},{timestamps:true});

var Statusname = mongoose.model("Statusname",statusnameschema);

var getStatus = async (machine_name,state,code)=>{
var data = await Statusname.findOne({state:state,machine_name:machine_name,fault_code:code});
if(!data){
    var new_data = new Statusname({
        machine_name:machine_name,
        line_id:"5e54a412ddf58e3866836970",
        fault_code:code,
        state:state,
        fault_name:code
    });
    var result = await new_data.save();
    return result
}
return data
}
module.exports.Statusname = Statusname;
module.exports.getStatus = getStatus;


