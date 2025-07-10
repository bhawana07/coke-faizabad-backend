var express = require('express');
var router = express.Router();
var { getConnection } = require('../model/connection.model');
var moment = require('moment');
//take line_id and design data and sended 
router.get('/' , async (req,res)=>{
	var line_id = req.body.line_id;
	if(!line_id){
		res.send("Please Send Line ID");
		return
	}
	var connection = await getConnection(line_id);
	var send_data = [];
	connection.forEach((element,i) => {
		send_data.push({
		machine_name:element.machine_name,
		status : element.status,
		current_timestamp:moment().local().format(),
		});
		if((i+1) == connection.length){
			res.send(data)
		}
	});	
});
module.exports = router;