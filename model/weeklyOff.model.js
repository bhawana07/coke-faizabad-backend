var mongoose = require("mongoose");

var weeklySchema = new mongoose.Schema({
    name:{
        type:String
    },
    date:{
        type:Date,
        require:true,
       // unique: true
        },
    year:{
        type:Number
    }

},{timestamps:true});

var weeklyOff = mongoose.model("weeklyoff",weeklySchema);


var weekoffadd = async (obj, cb) => {
     var save = await weeklyOff.bulkWrite(obj.map(obj => ({
         updateOne: {
             filter: { date: obj.date},
             update:{
                date:obj.date,
                year: Number( obj.date.split("-")[0])
                },
             upsert: true
         }
     })))
     try {
          cb(null, save)
     } catch (error) {
         cb(error);
     }
 };

module.exports = {
    weeklyOff,weekoffadd
}