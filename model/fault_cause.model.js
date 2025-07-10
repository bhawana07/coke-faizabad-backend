var mongoose = require('mongoose');
var { Line,Equipment } = require('./manualEntry.model');
var faultCauseSchema = new mongoose.Schema({
    machine_name: {
        type: mongoose.Schema.Types.ObjectId,
		ref:'equipment'
    },
	line_id:{
	 type: mongoose.Schema.Types.ObjectId,
	  ref: 'line'
    },
    cause_name: {
        type: String
    },
	machine_state:{
		type:String
	},
	fault_name:{
		type:String
	}
});

var FaultCause = mongoose.model('FaultCause',faultCauseSchema);

module.exports.FaultCause = FaultCause;