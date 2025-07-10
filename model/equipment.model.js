var mongoose = require('mongoose');

var equipmentSchema = new mongoose.Schema({
    equipment_name: {
        type: String
    },
    display_name: {
        type: String
    },
	line_id:{
		type: mongoose.Schema.Types.ObjectId,
        ref: 'line'
	},
    created_date: {
        type: Date,
        default: Date.now
    },
    last_modified_by:{
        type:String
      },
    product: {
        type: String,
        default:"bottle"
    },
    equipment_type:{
        type: String,
        default:"machine"
    },
});

var Equipment = new mongoose.model('equipment', equipmentSchema);

module.exports.Equipment = Equipment;