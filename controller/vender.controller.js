var express = require("express")
var router = express.Router();
const { vendortrigger } = require("../model/vendortrigger.model");



router.post('/assignvendor', async (req, res) => {
    var data = req.body;
    var check_vendor = await vendortrigger.findOne({vendor_name:data.vendor_name})
    if(check_vendor ){
        res.send("already vendor present")
    }
    var find_vendor = await vendortrigger.findOne({line_id:data.line_id,end_date:null})
    find_vendor.end_date = new Date();
    find_vendor.save();
    var new_vendor = new vendortrigger(req.body); 
    var result = await new_vendor.save();
    res.send("vendor assign")
});









module.exports = router