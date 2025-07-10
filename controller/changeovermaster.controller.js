var express = require("express")
var router = express.Router();
const {changeOverMaster} = require("../model/changeovermaster.model");


router.post('/', async (req, res) => {
    try {
      const data = req.body;
      const _id = req.body._id;
  
      if (_id) {
        const updatedData = await ChangeOverMaster.updateOne({ _id }, data);
        res.status(200).send(updatedData);
      } else {
        const newChangeOverMaster = new changeOverMaster(req.body);
        const savedData = await newChangeOverMaster.save();
        res.status(200).send(savedData);
      }
    } catch (error) {
      console.error(error);
      res.status(400).send(error.message);
    }
  });
  

router.get('/', async (req, res) => {
    var data = await changeOverMaster.find({});
    res.send(data)
   })

module.exports = router