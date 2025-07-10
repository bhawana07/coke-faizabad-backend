var mongoose = require('mongoose')
var formatSchema = new mongoose.Schema({
    format_name: {
        type: String,
        require: true
    },
    line_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "line"
    },
    blister_per_format: {
        type: Number,
        require: true
    },
    format_code: {
        type: String,
        require: true
    },
    rated_speed: {
        type: Number,
        require: true
    },
    machine_speed: {
        type: Number,
        require: true
    },
    tablet_per_blister: {
        type: Number,
        require: true
    },
}, { timestamps: true })
var Format = mongoose.model('format', formatSchema);
module.exports.Format = Format;