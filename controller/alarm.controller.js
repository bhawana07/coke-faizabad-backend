var express = require("express");
var mongoose = require("mongoose");
var moment = require("moment");
var { Alarm } = require("../model/alarm.model");
var router = express.Router();
var fault_obj = require("../fault.json");

router.get("/", async (req, res) => {
  var line_id = req.query.line_id;
  var alarm = await Alarm.find({ line_id: line_id, active: true });
  var send_data = [];
  if (alarm.length) {
    alarm.forEach((element, i) => {
      var data = {};
      data.machine_name = element.machine_name;
      data.current_first_fault = {
		  code:element.current_first_fault,
		  name:fault_obj[element.machine_name][`fault_${element.current_first_fault}`]
	  };
      data.alarm = data.alarm || [];
      element.alarm.forEach((alarm) => {
        data.alarm.push({
          name: fault_obj[element.machine_name][`fault_${alarm}`],
          code:alarm,
        });
      });
      send_data.push(data);
      if (alarm.length == i + 1) {
        res.send(send_data);
      }
    });
  } else {
    res.send(send_data);
  }
});

module.exports = router;
