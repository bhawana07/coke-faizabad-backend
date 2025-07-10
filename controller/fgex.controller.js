var express = require("express")
var router = express.Router();
const { FGEX } = require("../model/fgex.model");


// router.post('/', async (req, res) => {
//     var data = req.body;
//     var _id = req.body._id;
//     var check = await FGEX.findOne({ _id: _id })
//     if (check) {
//         console.log("am i running")
//         check.updateArr.push({date:req.body});
//         check.save()
//         var save = FGEX.updateOne({ _id:_id }, data,(err, data) => {
//             console.log(save);
//             if (err) {
//                 res.status(400).send(err.message)
//             } else {
//                 res.status(200).send(data)
//             }
//         })
//     } else {
//         var raw = new FGEX(req.body);
//         try {
//             var save = await raw.save();
//             res.status(200).send(save)
//         } catch (error) {
//             res.status(400).send(error.message)
//         }
//     }
// });

router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const _id = req.body._id;

    if (_id) {
      const updatedData = await FGEX.findOneAndUpdate(
        { _id },
        {
          $set: data,
          $push: { updateArr: { data } },
        },
        { new: true }
      );

      res.status(200).send(updatedData);
    } else {
      const newFGEX = new FGEX(req.body);
      const savedData = await newFGEX.save();
      res.status(200).send(savedData);
    }
  } catch (error) {
    console.error(error);
    res.status(400).send(error.message);
  }
});

router.get('/', async (req, res) => {
    var line_id = req.query.line_id;
	var result = await FGEX.find({line_id:line_id}).populate('equipment_to_be_used')
    //FGEX.id()
    // if (fgex == "all") {
    //     result = await FGEX.find({}).populate('equipment')
    // } else {
    //     result = await FGEX.find({ fgex: fgex })//.populate('type');
    // }
    res.send(result);

})


router.get('/:id', async (req, res) => {
    var id = req.params.id
    var data = await FGEX.findById({ _id: id })//.populate('type')
    if (data) {
        res.send(data)
    } else {
        res.send("data _id not found")
    }

})




// router.get('/:id', async (req, res) => {
//     var id = req.params.id
//     var data = await FGEX._id(id)
//     data.remove();
//     data.save(function (err) {
//         if (err) return handleError(err);
//         console.log('the subdocs were removed');
//       });
    

// })

// parent.children.id(_id).remove();
// // Equivalent to `parent.child = null`
// parent.child.remove();
// parent.save(function (err) {
//   if (err) return handleError(err);
//   console.log('the subdocs were removed');
// });

// router.get('/', async (req, res) => {
//     var fgex = req.query.fgex
//     var data = await FGEX.find({ fgex: fgex }).sort({_id: -1}).limit(2);
//     const next = data[data.length - 1]._id
//     if (data) {
//         res.json({ data, next })
//     } else {
//         res.send("data _id not found")
//     }

// })


// router.get('/:page', async (req, res) => {
//         var fgex = req.query.fgex
//         var data = await FGEX.find({ fgex: fgex }).limit(1)
//             const resPerPage = 9; // results per page
//             const page = req.params.page || 1
//         res.send(data)
// })



module.exports = router