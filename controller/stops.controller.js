var express = require("express");
var router = express.Router();
var { Stop, aggregate } = require("../model/stop.model");
var faultDescritions = require("../fault.json");

var last_update = new Date();
var api_strat_date, api_end_date, stop_res;
async function add15minCache(startDate, endDate, cb) {
  if (new Date() - last_update <= 15000 && stop_res) {
    cb(stop_res);
  } else {
    var stop = await Stop.find({
      $or: [
        {
          end_time: null,
        },
        {
          $and: [
            {
              start_time: {
                $lte: new Date(startDate),
              },
            },
            {
              end_time: {
                $gte: new Date(startDate),
              },
            },
          ],
        },
        {
          $and: [
            {
              start_time: {
                $lte: new Date(endDate),
              },
            },
            {
              end_time: {
                $gte: new Date(endDate),
              },
            },
          ],
        },
        {
          $and: [
            {
              start_time: {
                $gte: new Date(startDate),
              },
            },
            {
              end_time: {
                $lte: new Date(endDate),
              },
            },
          ],
        },
      ],
    });
    var send_data = [];
    var end;
    if (endDate > new Date()) {
      end = new Date();
    } else {
      end = endDate;
    }
    for (var i = 0; i < stop.length; i++) {
      if (stop[i].end_time > end || stop[i].end_time == null) {
        stop[i].end_time = new Date();
      }
      if (stop[i].start_time < startDate) {
        stop[i].start_time = startDate;
      }
      if (stop[i].start_time > stop[i].end_time) {
        var data = await Stop.deleteMany({ _id: stop[i]._id });
        //console.log(data)
      }
      if (stop[i].stop_name.match(/^fault/g)) {
        var name = "stop_" + stop[i].stop_name.split("_")[1];
        if (!faultDescritions[stop[i].machine_name][stop[i].stop_name]) {
          //console.log(stop[i].machine_name, stop[i].stop_name)
        }
        var data = {
          stop_name: name,
          _id: stop[i]._id,
          full_fault_des:
            faultDescritions[stop[i].machine_name][stop[i].stop_name],
          short_fault_des:
            faultDescritions[stop[i].machine_name][stop[i].stop_name],
          machine_name: stop[i].machine_name,
          start_time: stop[i].start_time,
          end_time: stop[i].end_time,
          video_url: video_url(stop[i].start_time),
        };
        send_data.push(data);
        send_data.push(stop[i]);
      } else if (stop[i].stop_name.match(/^waiting_/g)) {
        var data = {
          _id: stop[i]._id,
          stop_name: "waiting",
          machine_name: stop[i].machine_name,
          start_time: stop[i].start_time,
          end_time: stop[i].end_time,
        };
        send_data.push(data);
      }else if (stop[i].stop_name.match(/^pdt_/g)) {
        var data = {
          _id: stop[i]._id,
          stop_name: "pdt",
          machine_name: stop[i].machine_name,
          start_time: stop[i].start_time,
          end_time: stop[i].end_time,
        };
        send_data.push(data);
      }
       else {
        send_data.push(stop[i]);
      }
    }
    stop_res = send_data;
    last_update = new Date();
    api_strat_date = startDate;
    api_end_date = endDate;
    cb(send_data);
  }
}
// new api
var video_server = "http://13.233.1.210/video/stop_";
router.get("/new", async (req, res) => {
  var query = Object.values(req.query)[0];
  var endQuery = Object.values(req.query)[1];
  var startDate = queryDate(query);
  var endDate = queryDate(endQuery);
  if (new Date(startDate) > new Date()) {
    res.send("Sorry I 'm not from Future");
  } else if (!endQuery || !query) {
    res.status(401).send("Not correct date format");
  } else {
    var send_data = add15minCache(startDate, endDate, (data) => {
      res.send(data);
    });
  }
});

router.get("/total", async (req, res) => {
  var query = Object.values(req.query)[0];
  var endQuery = Object.values(req.query)[1];
  var startDate = queryDate(query);
  var endDate = queryDate(endQuery);
  if (new Date(startDate) > new Date()) {
    res.send("Sorry I 'm not from Future");
  } else if (!endQuery || !query) {
    res.status(401).send("Not correct date format");
  } else {
    var stop = await Stop.aggregate([
      {
        $match: {
          $or: [
            {
              end_time: null,
            },
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(startDate),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(startDate),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(endDate),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(endDate),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $gte: new Date(startDate),
                  },
                },
                {
                  end_time: {
                    $lte: new Date(endDate),
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $project: {
          stop_name: 1,
          machine_name: 1,
          start: {
            $cond: {
              if: { $lt: ["$start_time", new Date(startDate)] },
              then: new Date(startDate),
              else: "$start_time",
            },
          },
          end: {
            $switch: {
              branches: [
                { case: { $eq: ["$end_time", null] }, then: new Date() },
                {
                  case: { $gt: ["$end_time", new Date(endDate)] },
                  then: new Date(endDate),
                },
              ],
              default: "$end_time",
            },
          },
        },
      },
      {
        $project: {
          stop_name: 1,
          machine_name: 1,
          dateDifference: {
            $divide: [
              {
                $subtract: ["$end", "$start"],
              },
              1000 * 60,
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            machine_name: "$machine_name",
            stop_name: "$stop_name",
          },
          total: { $sum: "$dateDifference" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.machine_name",
          details: {
            $push: {
              stop_name: "$_id.stop_name",
              total: "$total",
              count: "$count",
            },
          },
        },
      },
    ]);
    var send_data = [];
    stop.forEach((element) => {
      element.details.forEach((fault) => {
        var machine_filter = send_data.filter((data) => {
          return element._id == data.machine_name;
        });
        if (machine_filter.length == 0) {
          var data = {};
          if (fault.stop_name.match(/^fault/g)) {
            data["machine_name"] = element._id;
            data["details"] = [
              {
                stop_name: "fault",
                total: fault.total,
                count_wise: [
                  {
                    fault_name:
                      faultDescritions[element._id][fault.stop_name].full,
                    count: fault.count,
                  },
                ],
                duration_wise: [
                  {
                    fault_name:
                      faultDescritions[element._id][fault.stop_name].full,
                    duration: fault.total,
                  },
                ],
              },
            ];
          } else if (fault.stop_name.match(/^waiting_/g)) {
            data["machine_name"] = element._id;
            data["details"] = [
              {
                stop_name: "waiting",
                total: fault.total,
                count_wise: [
                  {
                    fault_name:
                      faultDescritions[element._id][fault.stop_name].full,
                    count: fault.count,
                  },
                ],
                duration_wise: [
                  {
                    fault_name:
                      faultDescritions[element._id][fault.stop_name].full,
                    duration: fault.total,
                  },
                ],
              },
            ];
          } else {
            data["machine_name"] = element._id;
            data["details"] = [
              {
                stop_name: fault.stop_name,
                count: fault.count,
                duration: fault.total,
              },
            ];
          }
          send_data.push(data);
        } else {
          var stop_name = send_data.find((x) => x.machine_name === element._id);
          if (fault.stop_name.match(/^fault/g)) {
            var fault_name = stop_name.details.find(
              (x) => x.stop_name === "fault"
            );
            if (!fault_name) {
              stop_name.details.push({
                stop_name: "fault",
                total: fault.total,
                count_wise: [
                  {
                    fault_name:
                      faultDescritions[element._id][fault.stop_name].full,
                    count: fault.count,
                  },
                ],
                duration_wise: [
                  {
                    fault_name:
                      faultDescritions[element._id][fault.stop_name].full,
                    duration: fault.total,
                  },
                ],
              });
            } else {
              fault_name.total += fault.total;
              fault_name.count_wise.push({
                fault_name: faultDescritions[element._id][fault.stop_name].full,
                count: fault.count,
              });
              fault_name.duration_wise.push({
                fault_name: faultDescritions[element._id][fault.stop_name].full,
                duration: fault.total,
              });
              fault_name.count_wise.sort((a, b) =>
                a.count > b.count ? -1 : 1
              );
              fault_name.duration_wise.sort((a, b) =>
                a.duration > b.duration ? -1 : 1
              );
            }
          } else if (fault.stop_name.match(/^waiting_/g)) {
            var fault_name = stop_name.details.find(
              (x) => x.stop_name === "waiting"
            );
            if (!fault_name) {
              stop_name.details.push({
                stop_name: "waiting",
                total: fault.total,
                details: [
                  {
                    fault_name:
                      faultDescritions[element._id][fault.stop_name].full,
                    count: fault.count,
                    duration: fault.total,
                  },
                ],
              });
            } else {
              fault_name.total += fault.total;
              fault_name.count_wise.push({
                fault_name: faultDescritions[element._id][fault.stop_name].full,
                count: fault.count,
              });
              fault_name.duration_wise.push({
                fault_name: faultDescritions[element._id][fault.stop_name].full,
                duration: fault.total,
              });
              fault_name.count_wise.sort((a, b) =>
                a.count > b.count ? -1 : 1
              );
              fault_name.duration_wise.sort((a, b) =>
                a.duration > b.duration ? -1 : 1
              );
            }
          } else {
            stop_name.details.push({
              stop_name: fault.stop_name,
              count: fault.count,
              duration: fault.total,
            });
          }
        }
      });
    });
    res.send(send_data);
  }
});

var all_max_bottle_loss = {
  bottle_loss: 0,
  shift: "Shift A",
};
// for only shift data
router.get("/shift/:id", async (req, res) => {
  var machine = req.params.id;
  var today = new Date();
  var year = today.getFullYear();
  var month = today.getMonth() + 1;
  var date = today.getDate();
  var startDate = queryDate(year + "-" + month + "-" + date + "T8:00:00");
  var endDate = queryDate(year + "-" + month + "-" + date + "T20:00:00");
  var stop = await Stop.aggregate([
    {
      $match: {
        machine_name: machine,
        $or: [
          {
            end_time: null,
          },
          {
            $and: [
              {
                start_time: {
                  $lte: new Date(startDate),
                },
              },
              {
                end_time: {
                  $gte: new Date(startDate),
                },
              },
            ],
          },
          {
            $and: [
              {
                start_time: {
                  $lte: new Date(endDate),
                },
              },
              {
                end_time: {
                  $gte: new Date(endDate),
                },
              },
            ],
          },
          {
            $and: [
              {
                start_time: {
                  $gte: new Date(startDate),
                },
              },
              {
                end_time: {
                  $lte: new Date(endDate),
                },
              },
            ],
          },
        ],
      },
    },
    {
      $project: {
        stop_name: 1,
        machine_name: 1,
        start: {
          $cond: {
            if: { $lt: ["$start_time", new Date(startDate)] },
            then: new Date(startDate),
            else: "$start_time",
          },
        },
        end: {
          $switch: {
            branches: [
              { case: { $eq: ["$end_time", null] }, then: new Date() },
              {
                case: { $gt: ["$end_time", new Date(endDate)] },
                then: new Date(endDate),
              },
            ],
            default: "$end_time",
          },
        },
      },
    },
    {
      $project: {
        stop_name: 1,
        machine_name: 1,
        dateDifference: {
          $divide: [
            {
              $subtract: ["$end", "$start"],
            },
            1000 * 60,
          ],
        },
      },
    },
    {
      $group: {
        _id: {
          machine_name: "$machine_name",
          stop_name: "$stop_name",
        },
        total: { $sum: "$dateDifference" },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.machine_name",
        details: {
          $push: {
            stop_name: "$_id.stop_name",
            total: "$total",
            count: "$count",
          },
        },
      },
    },
  ]);
  var send_data = [];
  var today = new Date();
  var hour = today.getHours() * 60;
  var minutes = hour + today.getMinutes();
  var data = await CurrentShift();
  var shift = data.CurrentShift;
  var d = data.date;
  var shiftStartTime = data.shiftStartTime;
  var send_data = [];
  stop.forEach((element, i) => {
    element.details.forEach((fault, j) => {
      var machine_filter = send_data.filter((data) => {
        return element._id == data.machine_name;
      });
      if (machine_filter.length == 0) {
        var data = {};
        if (fault.stop_name.match(/^fault/g)) {
          data["machine_name"] = element._id;
          data["details"] = [
            {
              stop_name: "fault",
              total_duration: fault.total,
              total_count: fault.count,
              count_duration_wise: [
                {
                  fault_name:
                    faultDescritions[element._id][fault.stop_name].full,
                  count: fault.count,
                  duration: fault.total,
                },
              ],
            },
          ];
        } else if (fault.stop_name.match(/^waiting_/g)) {
          data["machine_name"] = element._id;
          data["details"] = [
            {
              stop_name: "waiting",
              total_duration: fault.total,
              total_count: fault.count,
              count_duration_wise: [
                {
                  fault_name:
                    faultDescritions[element._id][fault.stop_name].full,
                  count: fault.count,
                  duration: fault.total,
                },
              ],
            },
          ];
        } else {
          data["machine_name"] = element._id;
          data["details"] = [
            {
              stop_name: fault.stop_name,
              count: fault.count,
              duration: fault.total,
            },
          ];
        }
        send_data.push(data);
      } else {
        var stop_name = send_data.find((x) => x.machine_name === element._id);
        if (fault.stop_name.match(/^fault/g)) {
          var fault_name = stop_name.details.find(
            (x) => x.stop_name === "fault"
          );
          if (!fault_name) {
            stop_name.details.push({
              stop_name: "fault",
              total_duration: fault.total,
              total_count: fault.count,
              count_duration_wise: [
                {
                  fault_name:
                    faultDescritions[element._id][fault.stop_name].full,
                  count: fault.count,
                  duration: fault.total,
                },
              ],
            });
          } else {
            fault_name.total_duration += fault.total;
            fault_name.total_count += fault.count;
            fault_name.count_duration_wise.push({
              fault_name: faultDescritions[element._id][fault.stop_name].full,
              count: fault.count,
              duration: fault.total,
            });
          }
        } else if (fault.stop_name.match(/^waiting_/g)) {
          var fault_name = stop_name.details.find(
            (x) => x.stop_name === "waiting"
          );
          if (!fault_name) {
            stop_name.details.push({
              stop_name: "waiting",
              total_duration: fault.total,
              total_count: fault.count,
              count_duration_wise: [
                {
                  fault_name:
                    faultDescritions[element._id][fault.stop_name].full,
                  count: fault.count,
                  duration: fault.total,
                },
              ],
            });
          } else {
            fault_name.total_duration += fault.total;
            fault_name.total_count += fault.count;
            fault_name.count_duration_wise.push({
              fault_name: faultDescritions[element._id][fault.stop_name].full,
              count: fault.count,
              duration: fault.total,
            });
          }
        } else {
          stop_name.details.push({
            stop_name: fault.stop_name,
            count: fault.count,
            duration: fault.total,
          });
        }
      }
    });
  });
  var sku_data = await skuAdd.find({
    sku_end_time: null,
    machine_name: machine,
  });
  sku_data.forEach(async (sku) => {
    var stop_name = send_data.find((x) => x.machine_name === sku.machine_name);
    var temp = await tempGood(sku.machine_name);
    var tempReject = await temprejectGood(sku.machine_name);
    var sku_add = await getSkuTemp(sku.machine_name, "add");
    var sku_reject = await getSkuTemp(sku.machine_name, "reject");
    var total_good_count =
      sku.current_count + temp.current_value - sku_add.sku_start_count;
    var total_reject_count =
      tempReject.current_value - sku_reject.sku_start_count;
    sku.current_count = total_good_count + total_reject_count;
    stop_name["sku_wise"] = sku;
  });
  var project_res = await Project.find({
    shiftName: shift,
    date: d,
    machine_name: machine,
  });
  project_res.forEach(async (project, i) => {
    var machine = project.machine_name;
    var stop_name = send_data.find((x) => x.machine_name === machine);
    var temp = await tempGood(machine);
    var tempReject = await temprejectGood(machine);
    var stop_temp = await Temp.findOne({
      tag_name: /^fault/,
      machine_name: machine,
      current_state: true,
    });
    var pdt_temp = await Temp.findOne({
      tag_name: "pdt",
      machine_name: machine,
    });
    var condition = await getCondition(machine);
    var total_good_count =
      project.goodCount + temp.current_value - temp.shift_Start_count;
    var total_reject_count =
      project.rejected_quantity +
      tempReject.current_value -
      tempReject.shift_Start_count;
    var total_count = total_good_count + total_reject_count;
    if (shift == "Shift B" && minutes < 480) {
      minutes = 1440 + minutes;
    }
    var total_time = Math.abs(shiftStartTime - minutes);
    var fault_time = project.stop;
    var packing_machine = [
      "case_packer",
      "case_erector",
      "weigher",
      "case_sealer",
    ];
    var rated_speed;
    if (packing_machine.indexOf(machine) == -1) {
      rated_speed = 16;
    } else {
      rated_speed = 4;
    }
    var pdt_time = project.pdt;
    if (stop_temp) {
      var stop_timestamp = new Date(stop_temp.timeStamp);
      var cal_minute = new Date().getHours() * 60 + new Date().getMinutes();
      var total_stop_temp = Math.abs(
        minutes - (stop_timestamp.getHours() * 60 + stop_timestamp.getMinutes())
      );
      fault_time += total_stop_temp;
    }
    if (pdt_temp.current_state && pdt_temp) {
      var pdt_timestamp = new Date(pdt_temp.timeStamp);
      var total_pdt_temp = Math.abs(
        minutes - pdt_timestamp.getHours() * 60 + pdt_timestamp.getMinutes()
      );
      pdt_time += total_pdt_temp;
    }
    var working_time = total_time - pdt_time;
    var total_working_time = working_time - fault_time;
    var aviability = (working_time - fault_time) / working_time;
    var performance =
      total_good_count / (rated_speed * (working_time - fault_time));
    var quality = total_good_count / total_count;
    var oee = aviability * performance * quality;
    var mttr;
    if (fault_time > 0) {
      mttr = (fault_time / project.no_of_stop).toFixed(2);
    }
    var mtbf = (total_working_time / project.no_of_stop).toFixed(2);
    if (mtbf < 0 || mtbf == Infinity) {
      mtbf = 0;
    }
    if (mttr < 0 || mttr == Infinity) {
      mttr = 0;
    }
    if (aviability < 0 || aviability == Infinity) {
      aviability = 0;
    }
    if (!oee || oee == Infinity || oee < 0) {
      oee = 0;
    }
    if (oee > 1) {
      oee = 1;
    }
    if (!performance || performance == Infinity || performance < 0) {
      performance = 0;
    }
    if (performance > 1) {
      performance = 1;
    }
    if (!quality || quality == Infinity || quality < 0) {
      quality = 0;
    }
    if (quality > 1) {
      quality = 1;
    }
    if (!mttr) {
      mttr = "N/A";
    }
    if (mtbf == Infinity) {
      mtbf = "N/A";
    }
    if (machine == "siapi") {
      var waiting_temp = await Temp.findOne({
        tag_name: /^waiting_/,
        machine_name: machine,
        current_state: true,
      });
      var blocked_temp = await Temp.findOne({
        tag_name: "blocked",
        machine_name: machine,
      });
      var waiting_time = project.waiting;
      var blocked_time = project.blocked;
      if (waiting_temp) {
        var waiting_timestamp = new Date(waiting_temp.timeStamp);
        var total_waiting_temp = Math.abs(
          minutes -
            (waiting_timestamp.getHours() + waiting_timestamp.getMinutes())
        );
        waiting_time += total_waiting_temp;
      }
      if (blocked_temp.current_state) {
        var blocked_timestamp = new Date(blocked_temp.timeStamp);
        var total_blocked_temp = Math.abs(
          minutes -
            blocked_timestamp.getHours() +
            blocked_timestamp.getMinutes()
        );
        blocked_time += total_blocked_temp;
      }
      var actual_run_time =
        total_time - fault_time - pdt_time - waiting_time - blocked_time;
      var speed_loss = actual_run_time - total_count / rated_speed;
      var time_loss =
        fault_time +
        waiting_time +
        blocked_time +
        speed_loss +
        total_reject_count / rated_speed;
      var bottle_loss = time_loss * rated_speed;
      var send_bottle_loss;
      if (
        bottle_loss > all_max_bottle_loss.bottle_loss ||
        all_max_bottle_loss.bottle_loss == 0
      ) {
        all_max_bottle_loss["bottle_loss"] = bottle_loss;
        send_bottle_loss = bottle_loss;
      } else {
        send_bottle_loss = all_max_bottle_loss.bottle_loss;
      }
      if (all_max_bottle_loss.shift != shift) {
        all_max_bottle_loss["bottle_loss"] = bottle_loss;
        all_max_bottle_loss["shift"] = shift;
        send_bottle_loss = bottle_loss;
      }
      stop_name["shift_data"] = {
        oee: (oee * 100).toFixed(2),
        performance: (performance * 100).toFixed(2),
        total_count: total_good_count,
        quality: (quality * 100).toFixed(2),
        aviability: (aviability * 100).toFixed(2),
        shift: shift,
        total_time: total_time,
        machine: machine,
        bpm: project.bpm,
        mode: project.mode,
        rejected_quantity: total_reject_count,
      };
    } else {
      stop_name["shift_data"] = {
        oee: (oee * 100).toFixed(2),
        performance: (performance * 100).toFixed(2),
        total_count: total_good_count,
        quality: (quality * 100).toFixed(2),
        rejected_quantity: total_reject_count,
        aviability: (aviability * 100).toFixed(2),
        shift: shift,
        bpm: project.bpm,
        machine: machine,
        mttr: mttr,
        mtbf: mtbf,
        no_of_stop: project.no_of_stop,
        condition: condition.current_condition,
        filler_stop: project.critical_machine_off,
        filler_min: project.critical_machine_off_time.toFixed(2),
      };
    }
    if (i == 0) {
      res.send(send_data);
    }
  });
});
//report data
//report data
router.get("/report", async (req, res) => {
  var date = req.query["date"];
  var shift = req.query["shift"];
  var major_minor_duration = 10;
  shiftWiseCalculation(date, shift, (day_wise_response) => {
    var send_data = {};
    var shift_details = {
      shift: day_wise_response.shift,
      //shift_time: day_wise_response.day_start +"-"+ day_wise_response.day_end,
      date: day_wise_response.date,
      operator: day_wise_response.operator_name,
      sku: day_wise_response.sku,
      plant: "Avod",
      line: "MetalNova2",
    };
    var machine_obj = day_wise_response.machine_obj;
    send_data["shift_details"] = shift_details;
    send_data["shift_end_comment"] = day_wise_response.comment;
    var counter = 1;
    var rated_speed = day_wise_response.rated_speed;
    send_data["Bottle_loss"] = {};
    send_data["Bottle_loss"]["Total"] = Math.round(
      day_wise_response.critical_stop.bottle_loss
    );
    send_data["Bottle_loss"]["Availability"] = {};
    send_data["Bottle_loss"]["Availability"]["total"] = 0;
    send_data["Bottle_loss"]["Availability"]["fault"] = {};
    send_data["Bottle_loss"]["Availability"]["fault"]["total"] = 0;
    send_data["Bottle_loss"]["Availability"]["major_fault"] = {};
    send_data["Bottle_loss"]["Availability"]["major_fault"]["total"] = 0;
    send_data["Bottle_loss"]["Availability"]["minor_fault"] = {};
    send_data["Bottle_loss"]["Availability"]["minor_fault"]["total"] = 0;
    send_data["Bottle_loss"]["Performance"] = {};
    send_data["Bottle_loss"]["Performance"]["total"] = 0;
    send_data["Bottle_loss"]["Performance"]["waiting"] = {};
    send_data["Bottle_loss"]["Performance"]["waiting"]["total"] = 0;
    send_data["Bottle_loss"]["Performance"]["blocked"] = {};
    send_data["Bottle_loss"]["Performance"]["blocked"]["total"] = 0;
    send_data["Bottle_loss"]["Performance"]["speed_loss"] = {};
    send_data["Bottle_loss"]["Performance"]["speed_loss"]["total"] = 0;
    send_data["Bottle_loss"]["Quality"] = {};
    send_data["Bottle_loss"]["Quality"]["total"] = 0;
    send_data["Bottle_loss"]["Quality"]["reject"] = {};
    send_data["Bottle_loss"]["Quality"]["reject"]["total"] = 0;
    //calculating paramete
    send_data["oee"] = {};
    send_data["performance"] = {};
    send_data["quality"] = {};
    send_data["aviability"] = {};
    send_data["no_of_stop"] = {};
    send_data["good_count"] = {};
    send_data["rejected_quantity"] = {};
    send_data["manual_rejected_quantity"] = {};
    send_data["rework"] = {};
    send_data["current_sku"] = {};
    send_data["manual_rework"] = {};
    send_data["total_count"] = {};
    send_data["filler_stop"] = {};
    send_data["filler_min"] = {};
    send_data["mttr"] = {};
    send_data["mtbf"] = {};

    //Avaibility Loss
    day_wise_response.critical_stop.stop.forEach((element) => {
      var bottle_loss = Math.round(element.stop_total * rated_speed);
      if (element.stop_total > major_minor_duration) {
        send_data["Bottle_loss"]["Availability"]["major_fault"][
          faultDescritions[day_wise_response.critical_stop.machine_name][
            element.stop_name
          ].full
        ] = bottle_loss;
        send_data["Bottle_loss"]["Availability"]["fault"][
          "total"
        ] += bottle_loss;
        send_data["Bottle_loss"]["Availability"]["major_fault"][
          "total"
        ] += bottle_loss;
        //send_data['Bottle_loss']['Total'] += bottle_loss;
        send_data["Bottle_loss"]["Availability"]["total"] += bottle_loss;
      } else {
        send_data["Bottle_loss"]["Availability"]["minor_fault"][
          faultDescritions[day_wise_response.critical_stop.machine_name][
            element.stop_name
          ].full
        ] = bottle_loss;
        send_data["Bottle_loss"]["Availability"]["minor_fault"][
          "total"
        ] += bottle_loss;
        send_data["Bottle_loss"]["Availability"]["fault"][
          "total"
        ] += bottle_loss;
        //send_data['Bottle_loss']['Total'] += bottle_loss;
        send_data["Bottle_loss"]["Availability"]["total"] += bottle_loss;
      }
    });

    //performance loss
    //waiting loss
    day_wise_response.critical_stop.waiting.forEach((element) => {
      var bottle_loss = Math.round(element.stop_total * rated_speed);
      send_data["Bottle_loss"]["Performance"]["waiting"][
        "total"
      ] += bottle_loss;
      //send_data['Bottle_loss']['Total'] += bottle_loss;
      send_data["Bottle_loss"]["Performance"]["total"] += bottle_loss;
      send_data["Bottle_loss"]["Performance"]["waiting"][
        faultDescritions[day_wise_response.critical_stop.machine_name][
          element.stop_name
        ].full
      ] = bottle_loss;
    });
    //blocked loss
    day_wise_response.critical_stop.blocked.forEach((element) => {
      var bottle_loss = Math.round(element.stop_total * rated_speed);
      send_data["Bottle_loss"]["Performance"]["blocked"][
        "total"
      ] += bottle_loss;
      //send_data['Bottle_loss']['Total'] += bottle_loss;
      send_data["Bottle_loss"]["Performance"]["total"] += bottle_loss;
      send_data["Bottle_loss"]["Performance"]["blocked"][
        faultDescritions[day_wise_response.critical_stop.machine_name][
          element.stop_name
        ].full
      ] = bottle_loss;
    });
    day_wise_response.parameter_wise.forEach((element, i) => {
      if (element._id.match("^fault")) {
        if (element.details.length > 1) {
          element.details.forEach((fault) => {
            if (counter == 1) {
              send_data["fault" + counter] = { ...machine_obj };
              send_data["fault" + counter][fault.machine_name] =
                faultDescritions[fault.machine_name][element._id].full +
                " " +
                fault.count +
                "/" +
                fault.total.toFixed(2);
              counter++;
            } else {
              for (const key in send_data) {
                if (send_data.hasOwnProperty(key)) {
                  if (key.match("^fault")) {
                    if (send_data[key][fault.machine_name] == "-") {
                      send_data[key][fault.machine_name] =
                        faultDescritions[fault.machine_name][element._id].full +
                        " " +
                        fault.count +
                        "/" +
                        fault.total.toFixed(2);
                      return;
                    }
                  }
                }
              }
              if (!send_data["fault" + counter]) {
                send_data["fault" + counter] = { ...machine_obj };
                send_data["fault" + counter][fault.machine_name] =
                  faultDescritions[fault.machine_name][element._id].full +
                  " " +
                  fault.count +
                  "/" +
                  fault.total.toFixed(2);
                counter++;
              }
            }
          });
        } else {
          if (counter == 1) {
            send_data["fault" + counter] = { ...machine_obj };
            send_data["fault" + counter][element.details[0].machine_name] =
              faultDescritions[element.details[0].machine_name][element._id]
                .full +
              " " +
              element.details[0].count +
              "/" +
              element.details[0].total.toFixed(2);
            counter++;
          } else {
            for (const key in send_data) {
              if (send_data.hasOwnProperty(key)) {
                if (key.match("^fault")) {
                  if (send_data[key][element.details[0].machine_name] == "-") {
                    send_data[key][element.details[0].machine_name] =
                      faultDescritions[element.details[0].machine_name][
                        element._id
                      ].full +
                      " " +
                      element.details[0].count +
                      "/" +
                      element.details[0].total.toFixed(2);
                    return;
                  }
                }
              }
            }
            if (!send_data["fault" + counter]) {
              send_data["fault" + counter] = { ...machine_obj };
              send_data["fault" + counter][element.details[0].machine_name] =
                faultDescritions[element.details[0].machine_name][element._id]
                  .full +
                " " +
                element.details[0].count +
                "/" +
                element.details[0].total.toFixed(2);
              counter++;
            }
          }
        }
      } else {
        send_data[element._id] = { ...machine_obj };
        element.details.forEach((machine) => {
          send_data[element._id][machine.machine_name] =
            machine.count + "/" + Math.round(machine.total);
        });
      }
    });
    day_wise_response.project.forEach((data) => {
      //send_data['Bottle_loss']['Total'] += data.manual_rejected_quantity;
      if (data.machine != "vision") {
        send_data["Bottle_loss"]["Quality"]["reject"][data.machine] =
          data.manual_rejected_quantity;
        send_data["Bottle_loss"]["Quality"]["reject"]["total"] +=
          data.manual_rejected_quantity;
        send_data["Bottle_loss"]["Quality"]["total"] +=
          data.manual_rejected_quantity;
      }
      //send_data['Bottle_loss']['Total'] += Math.round(data.critical_machine_off_time * rated_speed);
      // send_data['Bottle_loss']['Performance']['total'] += Math.round(data.critical_machine_off_time * rated_speed);
      //send_data['Bottle_loss']['Performance']['blocked']['total'] += Math.round(data.critical_machine_off_time * rated_speed);
      send_data["Bottle_loss"]["Performance"]["blocked"][
        data.machine
      ] = Math.round(data.critical_machine_off_time * rated_speed);
      send_data["oee"][data.machine] = data.oee;
      send_data["performance"][data.machine] = data.performance;
      send_data["aviability"][data.machine] = data.aviability;
      send_data["quality"][data.machine] = data.quality;
      send_data["no_of_stop"][data.machine] = data.no_of_stop + "/" + data.stop;
      send_data["current_sku"][data.machine] = data.sku;
      send_data["good_count"][data.machine] = data.goodCount;
      send_data["total_count"][[data.machine]] = data.total_count;
      send_data["rejected_quantity"][data.machine] = data.rejected_quantity;
      send_data["manual_rejected_quantity"][data.machine] =
        data.manual_rejected_quantity;
      send_data["rework"][data.machine] = data.rework;
      send_data["manual_rework"][data.machine] = data.manual_rework;
      if (data.machine == day_wise_response.critical_stop.machine_name) {
        send_data["Bottle_loss"]["Performance"]["total"] += data.speed_loss;
        send_data["Bottle_loss"]["Performance"]["speed_loss"]["total"] +=
          data.speed_loss;
        send_data["filler_min"][data.machine] = data.stop;
        send_data["filler_stop"][data.machine] = data.no_of_stop;
      } else {
        send_data["filler_min"][data.machine] = data.critical_machine_off_time;
        send_data["filler_stop"][data.machine] = data.critical_machine_off;
      }
      send_data["mttr"][data.machine] = data.mttr;
      send_data["mtbf"][data.machine] = data.mtbf;
    });
    res.send(send_data);
  });
});

//day wise report
router.get("/dayreport", (req, res) => {
  var start_date = req.query["startDate"];
  var end_date = req.query["endDate"];
  var major_minor_duration = 10;
  var shift_details = {
    plant_name: "Avod",
    line_name: "MetalNova2",
  };
  dayWiseCalculation(start_date, end_date, (day_wise_response) => {
    var send_data = {};
    var machine_obj = day_wise_response.machine_obj;
    send_data["shift_details"] = shift_details;
    var counter = 1;
    var rated_speed = day_wise_response.rated_speed;
    send_data["Bottle_loss"] = {};
    send_data["Bottle_loss"]["Total"] = Math.round(
      day_wise_response.critical_stop.bottle_loss
    );
    send_data["Bottle_loss"]["Availability"] = {};
    send_data["Bottle_loss"]["Availability"]["total"] = 0;
    send_data["Bottle_loss"]["Availability"]["fault"] = {};
    send_data["Bottle_loss"]["Availability"]["fault"]["total"] = 0;
    send_data["Bottle_loss"]["Availability"]["major_fault"] = {};
    send_data["Bottle_loss"]["Availability"]["major_fault"]["total"] = 0;
    send_data["Bottle_loss"]["Availability"]["minor_fault"] = {};
    send_data["Bottle_loss"]["Availability"]["minor_fault"]["total"] = 0;
    send_data["Bottle_loss"]["Performance"] = {};
    send_data["Bottle_loss"]["Performance"]["total"] = 0;
    send_data["Bottle_loss"]["Performance"]["waiting"] = {};
    send_data["Bottle_loss"]["Performance"]["waiting"]["total"] = 0;
    send_data["Bottle_loss"]["Performance"]["blocked"] = {};
    send_data["Bottle_loss"]["Performance"]["blocked"]["total"] = 0;
    send_data["Bottle_loss"]["Performance"]["speed_loss"] = {};
    send_data["Bottle_loss"]["Performance"]["speed_loss"]["total"] = 0;
    send_data["Bottle_loss"]["Quality"] = {};
    send_data["Bottle_loss"]["Quality"]["total"] = 0;
    send_data["Bottle_loss"]["Quality"]["reject"] = {};
    send_data["Bottle_loss"]["Quality"]["reject"]["total"] = 0;
    //calculating paramete
    send_data["oee"] = {};
    send_data["performance"] = {};
    send_data["current_sku"] = {};
    send_data["quality"] = {};
    send_data["aviability"] = {};
    send_data["no_of_stop"] = {};
    send_data["good_count"] = {};
    send_data["rejected_quantity"] = {};
    send_data["manual_rejected_quantity"] = {};
    send_data["rework"] = {};
    send_data["manual_rework"] = {};
    send_data["total_count"] = {};
    send_data["filler_stop"] = {};
    send_data["filler_min"] = {};
    send_data["mttr"] = {};
    send_data["mtbf"] = {};

    //Avaibility Loss
    day_wise_response.critical_stop.stop.forEach((element) => {
      var bottle_loss = Math.round(element.stop_total * rated_speed);
      if (element.stop_total > major_minor_duration) {
        send_data["Bottle_loss"]["Availability"]["major_fault"][
          faultDescritions[day_wise_response.critical_stop.machine_name][
            element.stop_name
          ].full
        ] = bottle_loss;
        send_data["Bottle_loss"]["Availability"]["fault"][
          "total"
        ] += bottle_loss;
        send_data["Bottle_loss"]["Availability"]["major_fault"][
          "total"
        ] += bottle_loss;
        //send_data['Bottle_loss']['Total'] += bottle_loss;
        send_data["Bottle_loss"]["Availability"]["total"] += bottle_loss;
      } else {
        send_data["Bottle_loss"]["Availability"]["minor_fault"][
          faultDescritions[day_wise_response.critical_stop.machine_name][
            element.stop_name
          ].full
        ] = bottle_loss;
        send_data["Bottle_loss"]["Availability"]["minor_fault"][
          "total"
        ] += bottle_loss;
        send_data["Bottle_loss"]["Availability"]["fault"][
          "total"
        ] += bottle_loss;
        //send_data['Bottle_loss']['Total'] += bottle_loss;
        send_data["Bottle_loss"]["Availability"]["total"] += bottle_loss;
      }
    });

    //performance loss
    //waiting loss
    day_wise_response.critical_stop.waiting.forEach((element) => {
      var bottle_loss = Math.round(element.stop_total * rated_speed);
      send_data["Bottle_loss"]["Performance"]["waiting"][
        "total"
      ] += bottle_loss;
      //send_data['Bottle_loss']['Total'] += bottle_loss;
      send_data["Bottle_loss"]["Performance"]["total"] += bottle_loss;
      send_data["Bottle_loss"]["Performance"]["waiting"][
        faultDescritions[day_wise_response.critical_stop.machine_name][
          element.stop_name
        ].full
      ] = bottle_loss;
    });
    //blocked loss
    day_wise_response.critical_stop.blocked.forEach((element) => {
      var bottle_loss = Math.round(element.stop_total * rated_speed);
      send_data["Bottle_loss"]["Performance"]["blocked"][
        "total"
      ] += bottle_loss;
      //send_data['Bottle_loss']['Total'] += bottle_loss;
      send_data["Bottle_loss"]["Performance"]["total"] += bottle_loss;
      send_data["Bottle_loss"]["Performance"]["blocked"][
        faultDescritions[day_wise_response.critical_stop.machine_name][
          element.stop_name
        ].full
      ] = bottle_loss;
    });
    day_wise_response.parameter_wise.forEach((element, i) => {
      if (element._id.match("^fault")) {
        if (element.details.length > 1) {
          element.details.forEach((fault) => {
            if (counter == 1) {
              send_data["fault" + counter] = { ...machine_obj };
              send_data["fault" + counter][fault.machine_name] =
                faultDescritions[fault.machine_name][element._id].full +
                " " +
                fault.count +
                "/" +
                fault.total.toFixed(2);
              counter++;
            } else {
              for (const key in send_data) {
                if (send_data.hasOwnProperty(key)) {
                  if (key.match("^fault")) {
                    if (send_data[key][fault.machine_name] == "-") {
                      send_data[key][fault.machine_name] =
                        faultDescritions[fault.machine_name][element._id].full +
                        " " +
                        fault.count +
                        "/" +
                        fault.total.toFixed(2);
                      return;
                    }
                  }
                }
              }
              if (!send_data["fault" + counter]) {
                send_data["fault" + counter] = { ...machine_obj };
                send_data["fault" + counter][fault.machine_name] =
                  faultDescritions[fault.machine_name][element._id].full +
                  " " +
                  fault.count +
                  "/" +
                  fault.total.toFixed(2);
                counter++;
              }
            }
          });
        } else {
          if (counter == 1) {
            send_data["fault" + counter] = { ...machine_obj };
            send_data["fault" + counter][element.details[0].machine_name] =
              faultDescritions[element.details[0].machine_name][element._id]
                .full +
              " " +
              element.details[0].count +
              "/" +
              element.details[0].total.toFixed(2);
            counter++;
          } else {
            for (const key in send_data) {
              if (send_data.hasOwnProperty(key)) {
                if (key.match("^fault")) {
                  if (send_data[key][element.details[0].machine_name] == "-") {
                    send_data[key][element.details[0].machine_name] =
                      faultDescritions[element.details[0].machine_name][
                        element._id
                      ].full +
                      " " +
                      element.details[0].count +
                      "/" +
                      element.details[0].total.toFixed(2);
                    return;
                  }
                }
              }
            }
            if (!send_data["fault" + counter]) {
              send_data["fault" + counter] = { ...machine_obj };
              send_data["fault" + counter][element.details[0].machine_name] =
                faultDescritions[element.details[0].machine_name][element._id]
                  .full +
                " " +
                element.details[0].count +
                "/" +
                element.details[0].total.toFixed(2);
              counter++;
            }
          }
        }
      } else {
        send_data[element._id] = { ...machine_obj };
        element.details.forEach((machine) => {
          send_data[element._id][machine.machine_name] =
            machine.count + "/" + Math.round(machine.total);
        });
      }
    });
    day_wise_response.project.forEach((data) => {
      //send_data['Bottle_loss']['Total'] += data.manual_rejected_quantity;
      if (data.machine != "vision") {
        send_data["Bottle_loss"]["Quality"]["reject"][data.machine] =
          data.manual_rejected_quantity;
        send_data["Bottle_loss"]["Quality"]["reject"]["total"] +=
          data.manual_rejected_quantity;
        send_data["Bottle_loss"]["Quality"]["total"] +=
          data.manual_rejected_quantity;
      }
      //send_data['Bottle_loss']['Total'] += Math.round(data.critical_machine_off_time * rated_speed);
      send_data["Bottle_loss"]["Performance"]["total"] += Math.round(
        data.critical_machine_off_time * rated_speed
      );
      //send_data['Bottle_loss']['Performance']['blocked']['total'] += Math.round(data.critical_machine_off_time * rated_speed);
      send_data["Bottle_loss"]["Performance"]["blocked"][
        data.machine
      ] = Math.round(data.critical_machine_off_time * rated_speed);
      send_data["oee"][data.machine] = data.oee.toFixed(2);
      send_data["performance"][data.machine] = data.performance.toFixed(2);
      send_data["performance"][data.machine] = data.performance.toFixed(2);
      send_data["aviability"][data.machine] = data.aviability.toFixed(2);
      send_data["quality"][data.machine] = data.quality.toFixed(2);
      send_data["no_of_stop"][data.machine] = data.no_of_stop + "/" + data.stop;
      send_data["good_count"][data.machine] = data.goodCount;
      send_data["total_count"][[data.machine]] =
        data.goodCount + data.manual_rejected_quantity;
      send_data["rejected_quantity"][data.machine] = data.rejected_quantity;
      send_data["manual_rejected_quantity"][data.machine] =
        data.manual_rejected_quantity;
      send_data["rework"][data.machine] = data.rework;
      send_data["manual_rework"][data.machine] = data.manual_rework;
      if (data.machine == day_wise_response.critical_stop.machine_name) {
        send_data["Bottle_loss"]["Performance"]["total"] += data.speed_loss;
        send_data["Bottle_loss"]["Performance"]["speed_loss"]["total"] +=
          data.speed_loss;
        send_data["filler_min"][data.machine] = data.stop;
        send_data["filler_stop"][data.machine] = data.no_of_stop;
      } else {
        send_data["filler_min"][data.machine] = data.critical_machine_off_time;
        send_data["filler_stop"][data.machine] = data.critical_machine_off;
      }
      send_data["mttr"][data.machine] = data.mttr;
      send_data["mtbf"][data.machine] = data.mtbf;
    });
    res.send(send_data);
  });
});
var queryDate = function (query) {
  if (query) {
    var year = Number(query.split("T")[0].split("-")[0]);
    var month = Number(query.split("T")[0].split("-")[1]) - 1;
    var date = Number(query.split("T")[0].split("-")[2]);
    var hour = Number(query.split("T")[1].split(":")[0]);
    var minute = Number(query.split("T")[1].split(":")[1]);
    var secound = Number(query.split("T")[1].split(":")[2]);

    return new Date(year, month, date, hour, minute, secound);
  } else {
    console.log("From wrong date", query);
    return null;
  }
};

var video_url = function (data) {
  var query = JSON.stringify(data);
  var year = query.split("T")[0].split("-")[0].substring(1);
  var month = check_number(Number(query.split("T")[0].split("-")[1]));
  var date = check_number(Number(query.split("T")[0].split("-")[2]));
  var hour = check_number(Number(query.split("T")[1].split(":")[0]));
  var minute = check_number(Number(query.split("T")[1].split(":")[1]));
  var secound = check_number(
    Number(query.split("T")[1].split(":")[2].split(".")[0])
  );
  return video_server + year + month + date + hour + minute + secound;
};

var cal_rated_speed = function (machine, sku) {
  var rated_speed;
  var packing_machine = [
    "tmgcp",
    "weigher_case_sealer",
    "weigher",
    "case_sealer",
    "vertilator",
  ];
  if (packing_machine.indexOf(machine) == -1) {
    if (machine == "palletizer" || machine == "pallet_id") {
      rated_speed = sku.rated_speed / 60 / sku.bpc / sku.cpp;
    } else {
      rated_speed = sku.rated_speed / 60;
    }
  } else {
    rated_speed = sku.rated_speed / 60 / sku.bpc;
  }
  return rated_speed;
};

var check_number = function (number) {
  if (number < 10) {
    return "0" + number;
  } else {
    return number;
  }
};
module.exports = router;
