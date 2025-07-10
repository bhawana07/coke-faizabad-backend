var express = require('express');
var router = express.Router();
var { Partdata, ScheduleMaintenance, Parttype, checklist, Activity, Stock, checklistGroupmaster } = require("../model/schedule_mantaiance.model")
var moment = require('moment');
var { indgredentMaster } = require("../model/indgredient.model")
var { changeOverMaster } = require("../model/changeovermaster.model")
var { ciptypeMaster } = require("../model/ciptypemaster.model")
var { cipMaster } = require("../model/cipmaster.model")
var { weeklyOff, weekoffadd } = require("../model/weeklyOff.model")
var {Que} =require("../model/que.model")

const {
    Worker, isMainThread, parentPort, workerData
} = require('worker_threads');
const { Batchskutrigger } = require('../model/batch.model');


const updateOrSaveDocument = async (Model, data) => {
    try {
      if (data._id) {
        const updatedData = await Model.updateOne({ _id: data._id }, data);
        return { status: "ok", message: "Data successfully updated in the database" };
      } else {
        const newDocument = new Model(data);
        await newDocument.save();
        return { status: "ok", message: "Data successfully saved in the database" };
      }
    } catch (error) {
      return { status: "error", message: error.message };
    }
  };


//take line_id and design data and sended 
router.post('/partdata', async (req, res) => {
    try {
      const data = req.body;
  
      const result = await updateOrSaveDocument(Partdata, data);
  
      if (result.status === "ok") {
        res.status(200).send(result);
      } else {
        res.status(400).send(result);
      }
    } catch (error) {
      res.status(500).send({ status: "error", message: error.message });
    }
  });

router.post('/indgredent', async (req, res) => {
    var data = req.body;
    var checkbatch = await indgredentMaster.findOne({batch_no:batch_no})
    if (checkbatch) {
        checkbatch.manual_weight = req.body.manual_weight;
           try {
            var save = await checkbatch.save();
            res.status(200).send(save)
        } catch (error) {
            res.status(400).send(error.message)
        }
    } else {
        var data = new indgredentMaster(req.body);
        try {
            var save = await data.save();
            res.status(200).send(save)
        } catch (error) {
            res.status(400).send(error.message)
        }
    }

});

router.post('/ciptypemaster', async (req, res) => {
  try {
    const data = req.body;

    const result = await updateOrSaveDocument(ciptypeMaster, data);

    if (result.status === "ok") {
      res.status(200).send(result);
    } else {
      res.status(400).send(result);
    }
  } catch (error) {
    res.status(500).send({ status: "error", message: error.message });
  }
});



router.post('/changeovermaster', async (req, res) => {
    try {
      const data = req.body;
  
      const result = await updateOrSaveDocument(changeOverMaster, data);
  
      if (result.status === "ok") {
        res.status(200).send(result);
      } else {
        res.status(400).send(result);
      }
    } catch (error) {
      res.status(500).send({ status: "error", message: error.message });
    }
  });



router.get('/indgredent', async (req, res) => {
    var line_id = req.query.line_id;
    var data = await indgredentMaster.find({ line_id: line_id }).populate({ path: 'line_id' }).populate({ path: 'batch_no' });
    res.send(data)
});

router.get('/ciptypemaster', async (req, res) => {
    var line_id = req.query.line_id;
    var data = await ciptypeMaster.find({});
    res.send(data)
});

router.get('/cipmaster', async (req, res) => {
    var line_id = req.query.line_id;
    var data = await cipMaster.find({});
    res.send(data)
});

router.get('/changeovermaster', async (req, res) => {
    var line_id = req.query.line_id;
    var data = await changeOverMaster.find({});
    res.send(data)
});


router.get('/partdata', async (req, res) => {
    var line_id = req.query.line_id;
    var data = await Partdata.find({ line_id: line_id }).populate({ path: 'line_id' }).populate({ path: 'machine_id' }).populate({ path: 'activity_id' }).populate({ path: 'checklist_id' }).populate({ path: 'type_of_part_id' });
    res.send(data)
})

router.post('/parttype', async (req, res) => {
  try {
    const data = req.body;

    const result = await updateOrSaveDocument(Parttype, data);

    if (result.status === "ok") {
      res.status(200).send(result);
    } else {
      res.status(400).send(result);
    }
  } catch (error) {
    res.status(500).send({ status: "error", message: error.message });
  }
});

router.get('/parttype', async (req, res) => {
    var line_id = req.query.line_id;
    var data = await Parttype.find({ line_id: line_id }).populate({ path: 'line_id' });
    res.send(data)
});

router.post('/groupmasterchecklist', async (req, res) => {
    try {
      const data = req.body;
  
      const result = await updateOrSaveDocument(checklistGroupmaster, data);
  
      if (result.status === "ok") {
        res.status(200).send(result);
      } else {
        res.status(400).send(result);
      }
    } catch (error) {
      res.status(500).send({ status: "error", message: error.message });
    }
  });

router.get('/groupmasterchecklist', async (req, res) => {
    var line_id = req.query.line_id;
    var data = await checklistGroupmaster.find({ line_id: line_id }).populate({ path: 'line_id' }).populate({ path: 'checklist_in_checklist_group.checklist_id' });
    res.send(data)
});

router.post('/checklist', async (req, res) => {
    try {
      const data = req.body;
  
      const result = await updateOrSaveDocument(checklist, data);
  
      if (result.status === "ok") {
        res.status(200).send(result);
      } else {
        res.status(400).send(result);
      }
    } catch (error) {
      res.status(500).send({ status: "error", message: error.message });
    }
});



router.get('/checklist', async (req, res) => {
    var line_id = req.query.line_id;
    var data = await checklist.find({ line_id: line_id }).populate({ path: 'line_id' });;
    res.send(data)
});

router.post('/scheduleMaintenance', async (req, res) => {
    try {
      const data = req.body;
  
      const result = await updateOrSaveDocument(ScheduleMaintenance, data);
  
      if (result.status === "ok") {
        res.status(200).send(result);
      } else {
        res.status(400).send(result);
      }
    } catch (error) {
      res.status(500).send({ status: "error", message: error.message });
    }
  });
  

router.get('/scheduleMaintenance', async (req, res) => {
    var line_id = req.query.line_id;
    var data = await ScheduleMaintenance.find({ line_id: line_id });
    res.send(data)
});

router.post('/stock', async (req, res) => {
    try {
      const data = req.body;
  
      const result = await updateOrSaveDocument(Stock, data);
  
      if (result.status === "ok") {
        res.status(200).send(result);
      } else {
        res.status(400).send(result);
      }
    } catch (error) {
      res.status(500).send({ status: "error", message: error.message });
    }
  
});

router.get('/stock', async (req, res) => {
    var line_id = req.query.line_id;
    var data = await Stock.find({ line_id: line_id }).populate({ path: 'line_id' }).populate({ path: 'part_id' });
    res.send(data)
});

router.post('/activity', async (req, res) => {
    try {
      const data = req.body;
  
      const result = await updateOrSaveDocument(Activity, data);
  
      if (result.status === "ok") {
        res.status(200).send(result);
      } else {
        res.status(400).send(result);
      }
    } catch (error) {
      res.status(500).send({ status: "error", message: error.message });
    }
  });

router.get('/weekoff', async (req, res) => {
    var year = req.query.year;
    console.log(year);
    var data = await weeklyOff.find({ year: year })
    //console.log(data);
    res.send(data)
});

router.post('/weekoff', async (req, res) => {
    var data = req.body;
    var Ddata = await weeklyOff.deleteMany({})
    try {
        weekoffadd(req.body, (err, data) => {
            if (!err) {
                res.send(data)
            } else {
                res.send(err)
            }
        })
    } catch (e) {
        res.status(402).send(e)
    }
});

router.get('/activity', async (req, res) => {
    var line_id = req.query.line_id;
    var data = await Activity.find({ line_id: line_id }).populate({ path: 'line_id' });;
    res.send(data)
});


router.get('/worker', async (req, res) => {
    const worker = new Worker('./worker.js')
    worker.on('message', (data) => {
        res.status(200).json({ total: data })
    })
});

module.exports = router;