var mongoose = require("mongoose");
var { Shift } = require("./shift.model");
var { addLine } = require("./addLine.model");
var companySchema = new mongoose.Schema({
  company_name: {
    type: String,
    unique: true,
  },
  company_code: {
    type: String,
    unique: true,
  },
});

var changeoveregionmaster = new mongoose.Schema({
  changeover_region: {
    type: String,
  },
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
});
var countrySchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "company",
  },
  country_name: {
    type: String,
  },
  country_code: {
    type: String,
  },
});
var stateSchema = new mongoose.Schema({
  country_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "country",
  },
  state_name: {
    type: String,
  },
  state_code: {
    type: String,
  },
});

var locationSchema = new mongoose.Schema({
  state_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "state",
  },
  location_name: {
    type: String,
  },
  location_code: {
    type: String,
  },
});

var plantSchema = new mongoose.Schema({
  plant_name: {
    type: String,
  },
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "location",
  },
  plant_code: {
    type: String,
  },
});

var lineSchema = new mongoose.Schema({
  plant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "plant",
  },
  line_name: {
    type: String,
  },
  line_number: {
    type: Number,
  },
  line_code: {
    type: String,
  },
  line_batch: {
    type: String,
  },
  line_type: {
    type: String,
  },
  mqtt_topic: {
    type: String,
  },
});

var skuSchema = new mongoose.Schema({
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
  sku_number: {
    type: Number,
  },
  equipment: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "equipment",
    },
  ],
  sku_name: {
    type: String,
  },
  rated_speed: {
    type: Number,
  },
  bpc: {
    type: Number,
  },
  min_weight_range: {
    type: Number,
  },
  max_weight_range: {
    type: Number,
  },
  last_modified_by: {
    type: String,
  },
});
//pdt
var pdtSchema = new mongoose.Schema(
  {
    pdt_name: {
      type: String,
    },
    pdt_start_time: {
      type: Number,
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
    },
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
    pdt_code: {
      type: Number,
    },
    last_modified_by: {
      type: String,
    },
    pdt_end_time: {
      type: Number,
    },
  },
  { timestamps: true }
);

var holidaySchema = new mongoose.Schema({
  holiday_date: {
    type: Date,
  },
  holiday_name: {
    type: String,
  },
  plant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "plant",
  },
  line_id: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
  ],
});

var rejectQuantitySchema = new mongoose.Schema({
  line: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
  machine_name: {
    type: String,
  },
  quantity: {
    type: Number,
  },
  shift_name: {
    type: String,
  },
  date: {
    type: Date,
  },
  created_date: {
    type: Date,
    default: Date.now,
  },
  comments: [
    {
      user_name: {
        type: String,
      },
      comment: {
        type: String,
      },
      created_date: {
        type: Date,
        default: Date.now,
      },
      depth: {
        type: Number,
        default: 0,
      },
      parent_id: {
        type: String,
        default: null,
      },
    },
  ],
});

//fault_name
var faultNameSchema = new mongoose.Schema({
  machine_name: {
    type: String,
  },
  short_desc: {
    type: String,
  },
  long_desc: {
    type: String,
  },
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
  code: {
    type: Number,
  },
  created_date: {
    type: Date,
    default: Date.now,
  },
  last_modified_by: {
    type: String,
  },
});
//status colour
var statuscolourSchema = new mongoose.Schema(
  {
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
    color: {
      type: String,
    },
    state_name: {
      type: String,
    },
    text: {
      type: String,
    },
  },
  { timestamps: true }
);

//schedule maintanance
var scheduleMaintananceSchema = new mongoose.Schema({
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
  title: {
    type: String,
  },
  start_time: {
    type: Date,
  },
  end_time: {
    type: Date,
  },
  created_date: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    default: "Pending",
  },
  closed_date: {
    type: Date,
    default: null,
  },
  modified_date: {
    type: Date,
    default: Date.now,
  },
  last_modified_by: {
    type: String,
  },
  type: {
    type: String,
  },
  code: {
    type: String,
  },
  activity: [
    {
      machine_name: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "equipment",
      },
      activity: {
        type: String,
      },
      byWhom: {
        type: String,
      },
      comment: {
        type: String,
      },
    },
  ],
});

// weekly off
var weeklyOffSchema = new mongoose.Schema({
  line_id: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
  ],
  week: {
    type: Number,
  },
  week_days: [
    {
      type: Number,
    },
  ],
});

var manualSchema = new mongoose.Schema({
  shift: [
    {
      line: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "line",
      },
      shift_name: {
        type: String,
      },
      start_time: {
        type: Number,
      },
      end_time: {
        type: Number,
      },
    },
  ],
  pdt: [
    {
      line: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "line",
      },
      pdt_name: {
        type: String,
      },
      shift: {
        type: String,
      },
      start_time: {
        type: Number,
      },
      end_time: {
        type: Number,
      },
    },
  ],
  weekly_off: [
    {
      line: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "line",
      },
      day: {
        type: Number,
      },
      week_days: [
        {
          type: Number,
        },
      ],
    },
  ],
  holiday: [
    {
      line: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "line",
      },
      location: {
        type: String,
      },
      name: {
        type: String,
      },
      date: {
        type: Date,
      },
    },
  ],
  report_generation: [
    {
      report_name: {
        type: String,
      },
      email_recipient: [
        {
          type: String,
        },
      ],
    },
  ],
  manual: [
    {
      line: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "line",
      },
      major_accident: {
        type: Number,
      },
      minor_accident: {
        type: Number,
      },
      absenteeism: {
        type: Number,
      },
      unauthorised: {
        type: Number,
      },
    },
  ],
});

var Manual = new mongoose.model("manual_data", manualSchema);
var Company = new mongoose.model("company", companySchema);
var Changeoverregion = new mongoose.model(
  "changeover_reason",
  changeoveregionmaster
);

var Country = new mongoose.model("country", countrySchema);
var State = new mongoose.model("state", stateSchema);
var Location = new mongoose.model("location", locationSchema);
var Plant = new mongoose.model("plant", plantSchema);
var Line = new mongoose.model("line", lineSchema);
var Sku = new mongoose.model("sku", skuSchema);
var qualityReject = new mongoose.model("qualityReject", rejectQuantitySchema);
var faultName = new mongoose.model("faultName", faultNameSchema);
var Holiday = new mongoose.model("holiday", holidaySchema);
var WeeklyOff = new mongoose.model("weeklyOff", weeklyOffSchema);
var scheduleMaintanance = new mongoose.model(
  "scheduleMaintanance",
  scheduleMaintananceSchema
);
var Statuscolour = new mongoose.model("statusColor", statuscolourSchema);
var Pdt = new mongoose.model("pdt", pdtSchema);
// add company name in database
var addCompany = async (name, code) => {
  var data = await Company.findOne({ company_name: name, company_code: code });
  if (data) {
    return {
      type: "Duplicate",
      statusCode: 409,
      message: "Duplicate record found",
    };
  } else {
    var company = new Company({
      company_name: name,
      company_code: code,
    });
    var result = await company.save();
    var statu = {
      statusCode: 200,
    };
    return { ...statu, ...result._doc };
  }
};

// add country in datbase
var addCountry = async (company_id, country, code) => {
  var data = await Country.findOne({
    company_id: company_id,
    country_name: country,
    country_code: code,
  });
  if (data) {
    return {
      type: "Duplicate",
      statusCode: 409,
      message: "Duplicate record found",
    };
  } else {
    var country = new Country({
      company_id: company_id,
      country_name: country,
      country_code: code,
    });
    var result = await country.save();
    var statu = {
      statusCode: 200,
    };
    return { ...statu, ...result._doc };
  }
};
//get company
var getCompany = async () => {
  //var company = await Company.aggregate().lookup({ from: 'countries', localField: '_id', foreignField: 'company', as: 'country' }).lookup({ from: 'states', localField: '_id', foreignField: 'country', as: 'state' });
  var company = await Company.aggregate([
    {
      $lookup: {
        from: "countries",
        let: { company_id: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$company_id", "$$company_id"] } } },
          {
            $lookup: {
              from: "states",
              let: { country_id: "$_id" },
              pipeline: [
                { $match: { $expr: { $eq: ["$country_id", "$$country_id"] } } },
                {
                  $lookup: {
                    from: "locations",
                    let: { state_id: "$_id" },
                    pipeline: [
                      {
                        $match: { $expr: { $eq: ["$state_id", "$$state_id"] } },
                      },
                      {
                        $lookup: {
                          from: "plants",
                          let: { location_id: "$_id" },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$location_id", "$$location_id"],
                                },
                              },
                            },
                            {
                              $lookup: {
                                from: "lines",
                                let: { plant_id: "$_id" },
                                pipeline: [
                                  {
                                    $match: {
                                      $expr: {
                                        $eq: ["$plant_id", "$$plant_id"],
                                      },
                                    },
                                  },
                                  {
                                    $lookup: {
                                      from: "equipment",
                                      let: { line_id: "$_id" },
                                      pipeline: [
                                        {
                                          $match: {
                                            $expr: {
                                              $eq: ["$line_id", "$$line_id"],
                                            },
                                          },
                                        },
                                      ],
                                      as: "equipments",
                                    },
                                  },
                                  {
                                    $lookup: {
                                      from: "skus",
                                      let: { line_id: "$_id" },
                                      pipeline: [
                                        {
                                          $match: {
                                            $expr: {
                                              $eq: ["$line_id", "$$line_id"],
                                            },
                                          },
                                        },
                                        {
                                          $lookup: {
                                            from: "equipment",
                                            localField: "equipment",
                                            foreignField: "_id",
                                            as: "equipment",
                                          },
                                        },
                                      ],
                                      as: "skus",
                                    },
                                  },
                                  {
                                    $lookup: {
                                      from: "shifts",
                                      let: { line_id: "$_id" },
                                      pipeline: [
                                        {
                                          $match: {
                                            $expr: {
                                              $eq: ["$line_id", "$$line_id"],
                                            },
                                          },
                                        },
                                      ],
                                      as: "shifts",
                                    },
                                  },
                                ],
                                as: "lines",
                              },
                            },
                          ],
                          as: "plants",
                        },
                      },
                    ],
                    as: "locations",
                  },
                },
              ],
              as: "states",
            },
          },
        ],
        as: "countries",
      },
    },
  ]);
  return company;
};

// get country
var getCountry = async (company_id) => {
  if (company_id == "all") {
    var country = await Country.find({}).populate("company_id");
    return country;
  } else {
    var country = await Country.find({ company_id: company_id }).populate(
      "company_id"
    );
    return country;
  }
};

// add state in database
var addState = async (country_id, state, code) => {
  var data = await State.findOne({
    country_id: country_id,
    state_name: state,
    state_code: code,
  });
  if (data) {
    return {
      type: "Duplicate",
      statusCode: 409,
      message: "Duplicate record found",
    };
  } else {
    var state = new State({
      country_id: country_id,
      state_name: state,
      state_code: code,
    });
    var result = await state.save();
    var statu = {
      statusCode: 200,
    };
    return { ...statu, ...result._doc };
  }
};

//get state from database
var getState = async (country_id) => {
  if (country_id == "all") {
    var state = await State.find({}).populate({
      path: "country_id",
      select: "country_name",
      populate: {
        path: "company_id",
        select: "company_name",
      },
    });
    return state;
  } else {
    var state = await State.find({ country_id: country_id }).populate({
      path: "country_id",
      select: "country_name",
      populate: {
        path: "company_id",
        select: "company_name",
      },
    });
    return state;
  }
};
// add location in database
var addLocation = async (state_id, location, code) => {
  var data = await Location.findOne({
    state_id: state_id,
    location_name: location,
    location_code: code,
  });
  if (data) {
    return {
      type: "Duplicate",
      statusCode: 409,
      message: "Duplicate record found",
    };
  } else {
    var location = new Location({
      state_id: state_id,
      location_name: location,
      location_code: code,
    });
    var result = await location.save();
    var statu = {
      statusCode: 200,
    };
    return { ...statu, ...result._doc };
  }
};

//get location from database
var getLocation = async (state_id) => {
  if (state_id == "all") {
    var location = await Location.find({}).populate({
      path: "state_id",
      select: "state_name",
      populate: {
        path: "country_id",
        select: "country_name",
        populate: {
          path: "company_id",
          select: "company_name",
        },
      },
    });
    return location;
  } else {
    var location = await Location.find({ state_id: state_id }).populate({
      path: "state_id",
      select: "state_name",
      populate: {
        path: "country_id",
        select: "country_name",
        populate: {
          path: "company_id",
          select: "company_name",
        },
      },
    });
    return location;
  }
};

// add plant in database
var addPlant = async (location_id, plant, code) => {
  var data = await Plant.findOne({
    location_id: location_id,
    plant_name: plant,
    plant_code: code,
  });
  if (data) {
    return {
      type: "Duplicate",
      statusCode: 409,
      message: "Duplicate record found",
    };
  } else {
    var plant = new Plant({
      location_id: location_id,
      plant_name: plant,
      plant_code: code,
    });
    var result = await plant.save();
    var statu = {
      statusCode: 200,
    };
    return { ...statu, ...result._doc };
  }
};

//get plant from database
var getPlant = async (location_id) => {
  if (location_id == "all") {
    var plant = await Plant.find({}).populate({
      path: "location_id",
      select: "location_name",
      populate: {
        path: "state_id",
        select: "state_name",
        populate: {
          path: "country_id",
          select: "country_name",
          populate: {
            path: "company_id",
            select: "company_name",
          },
        },
      },
    });
    return plant;
  } else {
    var plant = await Plant.find({ location_id: location_id });
    return plant;
  }
};

// add line in database
// var addLine = async (plant_id, line, code) => {
//     var data = await Line.findOne({ plant_id: plant_id, line_name: line,line_code:code });
//     if (data) {
//         return {
//             type: "Duplicate",
//             statusCode: 409,
//             message: "Duplicate record found"
//         }
//     } else {
//         var line = new Line({
//             plant_id: plant_id,
//             line_name: line,
//             line_code: code
//         })
//         var result = await line.save();
// 		var statu = {
// 					statusCode:200
// 				}
// 		return {...statu,...result._doc}
//     }
// };

//get plant from database
var getLine = async (plant_id) => {
  if (plant_id == "all") {
    var line = await Line.find({}).populate({
      path: "plant",
      select: "plant_name",
      populate: {
        path: "location",
        select: "location_name",
        populate: {
          path: "state",
          select: "state_name",
          populate: {
            path: "country",
            select: "country_name",
            populate: {
              path: "company",
              select: "company_name",
            },
          },
        },
      },
    });
    return line;
  } else {
    var line = await Line.find({ plant_id: plant_id });
    return line;
  }
};

var getLineDetails = async (line_id) => {
  if (plant_id == "all") {
    var line = await Line.find({}).populate({
      path: "plant_id",
      select: "plant_name",
      populate: {
        path: "location_id",
        select: "location_name",
        populate: {
          path: "state_id",
          select: "state_name",
          populate: {
            path: "country_id",
            select: "country_name",
            populate: {
              path: "company_id",
              select: "company_name",
            },
          },
        },
      },
    });
    return line;
  } else {
    var line = await Line.find({ _id: line_id }).populate({
      path: "plant_id",
      select: "plant_name",
      populate: {
        path: "location_id",
        select: "location_name",
        populate: {
          path: "state_id",
          select: "state_name",
          populate: {
            path: "country_id",
            select: "country_name",
            populate: {
              path: "company_id",
              select: "company_name",
            },
          },
        },
      },
    });
    return line;
  }
};

//add sku in data base

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                                   update function                                                     //
//                                                                                                                       //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var updateValue = async (collection, id, obj) => {
  if (collection == "Country") {
    var result = await Country.findOne({ _id: id });
    if (!result) {
      return {
        type: "Not Found",
        statusCode: 404,
        message: "No record found",
      };
    } else {
      var check_data = await Country.findOne({
        country_name: obj.country_name,
        country_code: obj.country_code,
        company_id: obj.company_id,
        _id: { $ne: id },
      });
      if (check_data) {
        return {
          type: "Duplicate",
          statusCode: 409,
          message: "Duplicate record found",
        };
      } else {
        result.country_name = obj.country_name;
        result.company_id = obj.company_id;
        result.country_code = obj.country_code;
        var save = await result.save();
        /*   var country = await Country.findOne({ _id: save._id }).populate('company');
                var data = {
                    company_name: country.company.company_name,
                    country_id: country._id,
                    statusCode: 200,
                    country_name: country.country_name
                }
                return data */
        var statu = {
          statusCode: 200,
        };
        return { ...statu, ...save._doc };
      }
    }
  } else if (collection == "State") {
    var result = await State.findOne({ _id: id });
    if (!result) {
      return {
        type: "Not Found",
        statusCode: 404,
        message: "Duplicate record found",
      };
    } else {
      var check_data = await State.findOne({
        state_name: obj.state_name,
        state_code: obj.state_code,
        country_id: obj.country,
        _id: { $ne: id },
      });
      if (check_data) {
        return {
          type: "Duplicate",
          statusCode: 409,
          message: "Duplicate record found",
        };
      } else {
        result.state_name = obj.state_name;
        result.country_id = obj.country;
        result.state_code = obj.state_code;
        var save = await result.save();
        var statu = {
          statusCode: 200,
        };
        /* var state = await State.findOne({ _id: save._id }).populate({
                    path: 'country',
                    select: 'country_name',
                    populate: {
                        path: 'company',
                        select: 'company_name',
                    }
                });
                var data = {
                    company_name: state.country.company.company_name,
                    state_id: state._id,
                    statusCode: 200,
                    country_name: state.country.country_name,
                    state_name: state.state_name
                } */
        return { ...statu, ...save._doc };
      }
    }
  } else if (collection == "Location") {
    var result = await Location.findOne({ _id: id });
    if (!result) {
      return {
        type: "Not Found",
        statusCode: 404,
        message: "Record not found",
      };
    } else {
      var check_data = await Location.findOne({
        location_name: obj.location_name,
        location_code: obj.location_code,
        state_id: obj.state,
        _id: { $ne: id },
      });
      if (check_data) {
        return {
          type: "Duplicate",
          statusCode: 409,
          message: "Duplicate record found",
        };
      } else {
        result.location_name = obj.location_name;
        result.state_id = obj.state;
        result.location_code = obj.location_code;
        var save = await result.save();
        /* var location = await Location.findOne({ _id: save._id }).populate({
                    path: 'state',
                    select: 'state_name',
                    populate: {
                        path: 'country',
                        select: 'country_name',
                        populate: {
                            path: 'company',
                            select: 'company_name',
                        }
                    }
                });
                var data = {
                    location_name: location.location_name,
                    company_name: location.state.country.company.company_name,
                    location_id: location._id,
                    statusCode: 200,
                    country_name: location.state.country.country_name,
                    state_name: location.state.state_name
                }
                return data */
        var statu = {
          statusCode: 200,
        };
        return { ...statu, ...save._doc };
      }
    }
  } else if (collection == "Plant") {
    var result = await Plant.findOne({ _id: id });
    if (!result) {
      return {
        type: "Not Found",
        statusCode: 404,
        message: "Record not found",
      };
    } else {
      var check_data = await Plant.findOne({
        plant_name: obj.plant_name,
        plant_code: obj.plant_code,
        location_id: obj.location,
        _id: { $ne: id },
      });
      if (check_data) {
        return {
          type: "Duplicate",
          statusCode: 409,
          message: "Duplicate record found",
        };
      } else {
        result.plant_name = obj.plant_name;
        result.location_id = obj.location;
        result.plant_code = obj.plant_code;
        var save = await result.save();
        /* var plant = await Plant.findOne({ _id: save._id }).populate({
                    path: 'location',
                    select: 'location_name',
                    populate: {
                        path: 'state',
                        select: 'state_name',
                        populate: {
                            path: 'country',
                            select: 'country_name',
                            populate: {
                                path: 'company',
                                select: 'company_name',
                            }
                        }
                    }
                });
                var data = {
                    plant_name: plant.plant_name,
                    location_name: plant.location.location_name,
                    company_name: plant.location.state.country.company.company_name,
                    plant_id: plant._id,
                    statusCode: 200,
                    country_name: plant.location.state.country.country_name,
                    state_name: plant.location.state.state_name
                }
                return data */
        var statu = {
          statusCode: 200,
        };
        return { ...statu, ...save._doc };
      }
    }
  } else if (collection == "Line") {
    var result = await Line.findOne({ _id: id });
    if (!result) {
      return {
        type: "Not Found",
        statusCode: 404,
        message: "Record not found",
      };
    } else {
      var check_data = await Line.findOne({
        line_name: obj.line_name,
        line_code: obj.line_code,
        plant_id: obj.plant,
        _id: { $ne: id },
      });
      if (check_data) {
        return {
          type: "Duplicate",
          statusCode: 409,
          message: "Duplicate record found",
        };
      } else {
        result.line_name = obj.line_name;
        result.plant_id = obj.plant;
        result.line_id = obj.line_id;
        result.line_code = obj.line_code;
        var save = await result.save();
        /*      var line = await Line.findOne({ _id: save._id }).populate({
                    path: 'plant',
                    select: 'plant_name',
                    populate: {
                        path: 'location',
                        select: 'location_name',
                        populate: {
                            path: 'state',
                            select: 'state_name',
                            populate: {
                                path: 'country',
                                select: 'country_name',
                                populate: {
                                    path: 'company',
                                    select: 'company_name',
                                }
                            }
                        }
                    },
                });
                var data = {
                    line_name: line.line_name,
                    plant_name: line.plant.plant_name,
                    location_name: line.plant.location.location_name,
                    company_name: line.plant.location.state.country.company.company_name,
                    line_id: line._id,
                    statusCode: 200,
                    country_name: line.plant.location.state.country.country_name,
                    state_name: line.plant.location.state.state_name
                }
                return data */
        var statu = {
          statusCode: 200,
        };
        return { ...statu, ...save._doc };
      }
    }
  } else if (collection == "Company") {
    var result = await Company.findOne({ _id: id });
    if (!result) {
      return {
        type: "Not Found",
        statusCode: 404,
        message: "Record Not Found",
      };
    } else {
      var check_data = await Company.findOne({
        company_name: obj.company_name,
        _id: { $ne: id },
      });
      if (check_data) {
        return {
          type: "Duplicate",
          statusCode: 409,
          message: "Duplicate record found",
        };
      } else {
        result.company_name = obj.company_name;
        result.company_code = obj.company_code;
        var data = await result.save();
        return {
          company_name: data.company_name,
          company_id: data._id,
          statusCode: 200,
        };
      }
    }
  }
};

//check line existance
//check line existance
var checkLineFromMqttTopic = async (topic, line_name, code,crtical_machine, cb) => {
  var static_plant_id = "5ea9bcda415c6b028abbdb8e";
  var line = await Line.findOne({ line_code: line_name });
  if (!line) {
    var line = new Line({
      plant_id: static_plant_id,
      line_name: line_name,
      line_code: code,
      line_type:"filling",
      mqtt_topic: topic,
      line_batch: line_name.toUpperCase(),
    });
    var result = await line.save();
    var addline = new addLine({
      line_id: result._id,
      mqtt_topic: topic,
      thing_name: line_name,
      critical_machine: crtical_machine,
    });
    await addline.save();
    cb(result);
  } else {
    cb(line);
  }
};


module.exports.Manual = Manual;
module.exports.Sku = Sku;
module.exports.qualityReject = qualityReject;
module.exports.faultName = faultName;
module.exports.Pdt = Pdt;
module.exports.scheduleMaintanance = scheduleMaintanance;
module.exports.Statuscolour = Statuscolour;
module.exports.Line = Line;
module.exports.Holiday = Holiday;
module.exports.WeeklyOff = WeeklyOff;
module.exports.Changeoverregion = Changeoverregion;
//add function
module.exports.addCompany = addCompany;
module.exports.addCountry = addCountry;
module.exports.addState = addState;
module.exports.addLocation = addLocation;
module.exports.addPlant = addPlant;
//module.exports.addLine = addLine;
module.exports.updateValue = updateValue;
//get function
module.exports.getCompany = getCompany;
module.exports.getCountry = getCountry;
module.exports.getState = getState;
module.exports.getLocation = getLocation;
module.exports.getPlant = getPlant;
module.exports.getLine = getLine;
module.exports.getLineDetails = getLineDetails;
module.exports.checkLineFromMqttTopic = checkLineFromMqttTopic;
