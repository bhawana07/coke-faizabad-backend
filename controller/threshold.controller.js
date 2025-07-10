var express = require("express")
var mathjs = require('mathjs')
var router = express.Router();
const {Threshold,getColour,convettimeinsecond} = require("../model/threshhold.model");


router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const _id = req.body._id;

    let save;
    if (_id) {
      save = await Threshold.updateOne({ _id }, { $push: { threshold: data.threshold }});
    } else {
      const raw = new Threshold(req.body);
      save = await raw.save();
    }

    res.status(200).send(save);
  } catch (error) {
    res.status(400).send(error.message);
  }
});


router.get('/threshold_data', async (req, res) => {
    var machine_name = req.query.machine_name
    var parameterName = req.query.parameterName
    // getColour({major_fault_duration :10,manual_stop_duration :10,Total_Planned_time:10,oee:54}, "cam_blister", "5f182b5319e89819007653cb","oee",(data)=>{
    //     res.send(data)
    // })

    //convettimeinsecond("12:12:12")
    //var data = await Threshold.findOne({machine_name:machine_name,parameterName:parameterName});
    
    var data = await Threshold.find({});
    res.send(data)
    // var BreakException = {};
    // try {
    //     data.threshold.forEach(element => {
    //         var oee = 90
    //         console.log(eval(element.condition));
    //         if (eval(element.condition) === true) {
    //             console.log(element.condition, element.backgroundColor, element.fontColor);
    //             res.send({
    //                 condition: element.condition,
    //                 backgroundColor: element.backgroundColor,
    //                 fontColor: element.fontColor
    //             })
    //             send_obj.backgroundColor = element.condition

    //             throw BreakException
    //         }
    //     });
    // } catch (e) {
    //     if (e !== BreakException) throw e;
    // }


    // data.threshold.forEach(element => {
    //     // console.log(element.backgroundColor);
    //     //console.log(eval(element.condition));
    //     console.log(element.condition)
    //     console.log(mathjs.evaluate(element.condition , {oee:90}))
        
    //     if (eval(element.condition) === true ){
    //         console.log(element.condition, element.backgroundColor,element.fontColor );
    //         var data = {
    //             condition: element.condition,
    //             backgroundColor: element.backgroundColor,
    //             fontColor: element.fontColor
    //         }
    //         res.send(data) 
    //     }
    // // });
    // console.log(mathjs.evaluate("major_fault_duration + manual_stop_duration > 0.1 * Total_Planned_time", {
    //     major_fault_duration: 10,
    //     manual_stop_duration: 10,
    //     Total_Planned_time: 10
    // }))
})

module.exports = router