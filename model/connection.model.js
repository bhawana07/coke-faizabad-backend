var mongoose = require('mongoose');
var { connectionLog, postConnectionStop, firstLog } = require('./connection_log')
const { getApi } = require("../controller/apiHit.controller");
var {addLine} = require("../model/addLine.model")
var connectionSchema = new mongoose.Schema({
    status: {
        type: String
    },
    machine_name: {
        type: String
    },
    lastUpdate: {
        type: Date,
        default: Date.now
    },
    line_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "line",
    },
});

var Connection = mongoose.model('Connection', connectionSchema);

var updateConnection = async function (status, machine, line_id,cb) {
    //console.log(status, machine, line_id);
    var addlinedata = await addLine.findOne()
    var connection = await Connection.findOne({ machine_name: machine, line_id: line_id }).populate({ path: 'line_id', populate: { path: 'plant_id' ,populate: { path: 'location_id'} }});;
    //console.log(connection.line_id.gateway_number||"Gateway2(Near Line 11);
    var timestamp = new Date();
    if (!connection) {
        var conn = new Connection({
            status: status,
            machine_name: machine,
            line_id: line_id
        });
        conn.save();
        firstLog(machine, status, timestamp, line_id)
        return;
    }
    //console.log(`${process.env.plc_error_email_link}?osd=${connection.line_id.plant_id.location_id.location_name}&hl=${connection.line_id.plant_id.plant_name}&ln=${connection.line_id.line_name}&gn=${connection.line_id.gateway_number||"Gateway2(Near Line 1)"}`);
    //console.log(`${process.env.gateway_error_email_link}?osd=${connection.line_id.plant_id.location_id.location_name}&hl=${connection.line_id.plant_id.plant_name}&ln=${connection.line_id.line_name}&gn=${connection.line_id.gateway_number||"Gateway2(Near Line 1)"}`);
    //firstLog(line_id,machine)
    if (status != connection.status) {
        //  if(status == "plc_error" && machine == addlinedata.critical_machine){
        //     getApi(`${process.env.plc_error_email_link}?osd=${connection.line_id.plant_id.location_id.location_name}&hl=${connection.line_id.plant_id.plant_name}&ln=${connection.line_id.line_name}&gn=${connection.line_id.gateway_number||"Gateway2(Near Line 1)"}`,
        //     {
        //       "content-type": "application/json",
        //        authorization: `Bearer ${process.env.dashboardAuthToken}`,
        //        Accept: "application/json",
        //     },(api_res)=>{
        //        console.log(api_res)
        //     })
        //  }
        //  if(status == "ipc_error" && machine == addlinedata.critical_machine){
        //    getApi(`${process.env.gateway_error_email_link}?osd=${connection.line_id.plant_id.location_id.location_name}&hl=${connection.line_id.plant_id.plant_name}&ln=${connection.line_id.line_name}&gn=${connection.line_id.gateway_number||"Gateway2(Near Line 1)"}`,
        //    {
        //      "content-type": "application/json",
        //       authorization: `Bearer ${process.env.dashboardAuthToken}`,
        //       Accept: "application/json",
        //    },(api_res)=>{
        //       console.log(api_res)
        //    })
        // }
        postConnectionStop(machine, status, timestamp, line_id)
        connection.status = status;
        connection.lastUpdate = timestamp;
        var save = await connection.save();
        cb(save)
    }else{
        cb(null)
    }
}
//updateConnection("plc_error","cam_blister","607cf8a24b10ed43282fbe66")

var getConnection = async function (line_id) {
    return Connection.find({ line_id });
}

module.exports.Connection = Connection;
module.exports.updateConnection = updateConnection;
module.exports.getConnection = getConnection;
