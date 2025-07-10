var express = require("express")
var router = express.Router();
const { Type } = require("../model/type.model")


router.post('/', async (req, res) => {
    try {
      const data = req.body;
      const _id = req.body._id;
  
      if (!data.line_id) {
        res.status(400).send("Please send Line id");
        return;
      }
  
      let save;
      if (_id) {
        save = await Type.updateOne({ _id }, data);
      } else {
        const type = new Type(req.body);
        save = await type.save();
      }
  
      res.status(200).send(save);
    } catch (error) {
      res.status(400).send(error.message);
    }
});
  

router.get('/', async (req, res) => {
    var type = req.query.type;
    var line_id = req.query.line_id;
    //  if(!line_id){
    //     res.send("Please send Line id");
    //     return
    //  }
    if (type == "all") {
        var data = await Type.find();
        //var data = await Type.find({line_id:line_id})
    } else {
        //var data = await Type.find({type:type,line_id:line_id});
        var data = await Type.find({ type: type });
    }
    res.send(data)
})

module.exports = router