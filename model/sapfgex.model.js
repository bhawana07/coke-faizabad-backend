var mongoose = require("mongoose");
var sapfgexschema = new mongoose.Schema(
    {
        fgex: {
            type: String,
            required: true,
        },
        product_name: {
            type: String,
            required: true,
        },
        pack: {
            type: Number,
            required: true,
        },
        halb_code: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
            // type: mongoose.Schema.Types.ObjectId,
            // ref: "type",
        },
        blister_size: {
            type: String,
            required: true,
        },
        blister_min: {
            type: Number,
            required: true,
        },
        blister_max: {
            type: Number,
            required: true,
        },
        current_machine: {
            type: String,
            required: true,
        },
        blister_per_format: {
            type: Number,
            required: true,
        },
        machine_cycle: {
            type: Number,
            required: true,
        },
        rated_speed: {
            type: Number,
            required: true,
        },
        tablet_per_blister: {
            type: Number,
            required: true,
        },
        layout_no: String,
        weight_per_format: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true }
);
var SapFgex = mongoose.model("sapfgex", sapfgexschema);
module.exports.SapFgex = SapFgex;
