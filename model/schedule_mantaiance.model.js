var mongoose = require("mongoose");

var PartSchema = new mongoose.Schema(
    {
        line_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'line'
        },
        machine_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "equipment",
        },
        part_number: {
            type: String
        },
        activity_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Activity",
            required: true
        },
        base_type: String,
        value_of_basetype: {
            type: Number

        },
        checklist_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "checklistgroupMaster",
        },
        manpower: {
            type: Number
        },
        type_of_part_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Parttype",
            required: true
        },
        created_by: {
            type: String
        },
        updated_by: {
            type: String
        }

    },
    { timestamps: true }
);


var stockSchema = new mongoose.Schema(
    {
        line_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'line'
        },
        part_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "partdata",
        },
        stock_in_store: {
            type: Number
        },
        created_by: {
            type: String
        },
        updated_by: {
            type: String
        }
    },
    { timestamps: true }
);


var ActivitySchema = new mongoose.Schema(
    {
        line_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'line'
        },
        activity_name: {
            type: String
        },
        part_replace_name: {
            type: String
        },
        created_by: {
            type: String
        },
        updated_by: {
            type: String
        }

    },
    { timestamps: true }
);

var checklistSchema = new mongoose.Schema(
    {
        line_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'line'
        },
        checklist_item: {
            type: String
        },
        is_part_change: {
            type: Boolean
        },
        created_by: {
            type: String
        },
        updated_by: {
            type: String
        }

    },
    { timestamps: true }
);


var PartTypeSchema = new mongoose.Schema(
    {
        line_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'line'
        },
        part_type_name : {
            type: String
        },
        created_by: {
            type: String
        },
        updated_by: {
            type: String
        }


    },
    { timestamps: true }
);

var checklistgroupmasterSchema = new mongoose.Schema(
    {
        line_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'line'
        },
        checklist_group_name: {
            type: String
        },
        checklist_in_checklist_group:[{
            is_mandatory:Boolean,
            checklist_id:{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'checklist'
            },
        }],
        created_by: {
            type: String
        },
        updated_by: {
            type: String
        }


    },
    { timestamps: true }
);



const ScheduleMaintenanceSchema = new mongoose.Schema(
    {
        line_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'line'
        },
        type_of_maintenance: {
            type: String,
            enum: { values: ['Preventive', 'Breakdown'], message: '{VALUE} is not supported' },
            required: true
        },
        schedule_date: { 
            type: Date, 
            required: true 
        },
        name_of_part: {
            type: String
        },
        is_check_list: {
            type: Boolean
        },
        created_by: {
            type: String
        },
        updated_by: {
            type: String
        }
    },
    { timestamps: true }
);





var Partdata = new mongoose.model('partdata', PartSchema);
var ScheduleMaintenance = new mongoose.model('ScheduleMaintenance', ScheduleMaintenanceSchema);
var Parttype = new mongoose.model('Parttype', PartTypeSchema);
var checklist = new mongoose.model('checklist', checklistSchema);
var Activity = new mongoose.model('Activity', ActivitySchema);
var Stock = new mongoose.model('stock', stockSchema);
var checklistGroupmaster = new mongoose.model('checklistgroupMaster', checklistgroupmasterSchema);





module.exports.Partdata = Partdata
module.exports.ScheduleMaintenance = ScheduleMaintenance
module.exports.Parttype = Parttype
module.exports.checklist = checklist
module.exports.Activity = Activity
module.exports.Stock = Stock
module.exports.checklistGroupmaster = checklistGroupmaster
