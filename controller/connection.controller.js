var express = require('express');
var router = express.Router();
var { getConnection } = require('../model/connection.model');
var moment = require('moment');
//take line_id and design data and sended 
router.get('/', async (req, res) => {
  const line_id = req.query.line_id || req.body.line_id;
  if (!line_id) {
    res.status(400).send('Please Send Line ID');
    return;
  }

  try {
    const connections = await getConnection(line_id);
    const send_data = connections.map((element) => ({
      machine_name: element.machine_name,
      status: element.status,
      current_timestamp: moment().local().format(),
    }));
    res.send(send_data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
module.exports = router;