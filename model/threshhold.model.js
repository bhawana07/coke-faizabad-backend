const mongoose = require("mongoose");
var mathjs = require('mathjs')
var moment = require('moment')
var ThresholdSchema = new mongoose.Schema(
    {
        line_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "line",
          },
        machine_name: {
            type: String
        },
        parameterName: {
            type: String
        },
        comment: {
            type: String
        },
        threshold: [
            {
                condition: {
                    type: String
                },
                backgroundColor: {
                    type: String
                },
                fontColor: {
                    type: String
                }
            }
        ]
    },
    { timestamps: true });

var Threshold = mongoose.model("Threshold", ThresholdSchema);

var getColour = async (obj, parameter, value, sign, cb) => {
    var data = await Threshold.findOne({ parameterName: parameter });
    if (cb) {
        data.threshold.some(element => {
            var check = mathjs.evaluate(element.condition, obj)
            if (check === true) {
                cb({
                    condition: element.condition,
                    backgroundColor: element.backgroundColor,
                    fontColor: element.fontColor,
                    value: value + sign
                })
            }
        }) 
    } else {
        return new Promise((resolve, reject) => {
            data.threshold.some(element => {
                var check = mathjs.evaluate(element.condition, obj)
                if (check === true) {
                    resolve({
                        condition: element.condition,
                        backgroundColor: element.backgroundColor,
                        fontColor: element.fontColor,
                        value: value + sign
                    })
                    return
                }
            })
        })
    }
}
convettimeinsecond = async(time)=>{
   // time = "12:12:12";
    tt = time.split(":");
    console.log(tt);
    sec = tt[0] * 3600 + tt[1] * 60 + tt[2] * 1;
    console.log(sec)
}

module.exports.Threshold = Threshold;
module.exports.getColour = getColour;
module.exports.convettimeinsecond = convettimeinsecond;