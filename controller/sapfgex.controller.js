var express = require("express");
var router = express.Router();
var { SapFgex } = require("../model/sapfgex.model");
//post api for sap
const updateOrSaveSapFgex = async (fgex, data) => {
  try {
    const existingData = await SapFgex.findOne({ fgex: fgex });

    if (existingData) {
      await SapFgex.updateOne({ fgex: fgex }, data);
      return {
        status: "ok",
        message: "Data successfully updated in the database",
      };
    } else {
      const newSapFgex = new SapFgex(data);
      await newSapFgex.save();
      return {
        status: "ok",
        message: "Data successfully saved in the database",
      };
    }
  } catch (error) {
    return { status: "error", message: error.message };
  }
};

router.post("/fgex", async (req, res) => {
  try {
    const data = req.body;
    const fgex = data.fgex;

    const result = await updateOrSaveSapFgex(fgex, data);

    if (result.status === "ok") {
      res.status(200).send(result);
    } else {
      res.status(400).send(result);
    }
  } catch (error) {
    res.status(500).send({ status: "error", message: error.message });
  }
});
module.exports = router;
