const request = require("request");
const dotenv = require("dotenv");
const logger = require("morgan");
const helmet = require("helmet");
const express = require("express");
var moment = require("moment");
var mongoose = require("mongoose");
var cors = require("cors");
var mqtt = require("mqtt");
var fs = require("fs");
var http = require("http");
var https = require("https");
const { Telegraf, Markup } = require("telegraf");


// Load environment variables from.env file, where API keys and passwords are configured.
dotenv.config({ path: "./.env" });


const bot = new Telegraf(process.env.telegram_bot_id);

var {
  updateStopData,
  addLineData,
  addShiftData,
  addMachineData,
  addBatchData,
  updateGoodCount,
  updateMaxBpm,
  batchEnd,
  updateStartupReject,
  updateSetupTime,
  updateCriticalOff,
  getDayWiseReport,
} = require("./model/project.model");

var {
  getCondition,
  updateCondition,
  updateStatusStartupReject,
  resetShiftData,
  resetBatchData,
  resetVendorData,
  Condition,
  getStopMachineOnWaiting,
  getBlockedMachineOnBlocked,
  getStopMachineOnBlocked,
  getWaitingMachineOnWaiting,
  updateStatus,
} = require("./model/status.model");

var { CurrentShift,Shift } = require("./model/shift.model");
var { getFgexFromHmiCode } = require("./model/fgex.model");

var {
  frequentGoodUpdate,
  getTempGood,
  preShift,
  updateChangeoverMode,
  resetLastMachineValue,
  pdtStartInTemp
} = require("./model/goodTemp.model");
var {
  postStop,
  updateLast,
  Stop,
  updateCriticalStop,
} = require("./model/stop.model");

var { getCurrentBatch, Batchskutrigger } = require("./model/batch.model");
var { getshiftWiseRoster, indexoperatorid } = require("./model/roster.model");
var { updateAlarm, updateAlarmStatus } = require("./model/alarm.model");
var { endChecklist } = require("./model/changeover_checklist.model");
var {
  updateChangeOver,
  pushAndUpdateChangeover,
  updatePowerOff,
  getIsNullTrue,
  changeSetupMode,
  getLastChangeover,
} = require("./model/changeover.model");

var { getCurrentCip, endCip, addNewCip } = require("./model/cipmaster.model");
var { updateConnection } = require("./model/connection.model");
var { addHistory,adjustMatchCount } = require("./model/history.model");
var { addTempDataHourly } = require("./model/hourlyTemp.model");
var { addWaterIndgredent } = require("./model/indgredient.model");

var {
  Pdt,
  checkLineFromMqttTopic,
  scheduleMaintanance,
} = require("./model/manualEntry.model");

var {
  addLine,
  MqttLineData,
  updateLineData,
  resetAlert,
} = require("./model/addLine.model");

var {
  vendortrigger,
  getCurrentvendor,
} = require("./model/vendertrigger.model");
var { Addalerts } = require("./model/alerts.model");

//api controller
var shift = require("./controller/shift.controller");
var {
  batchEndMail,
  resetMail,
  mailer,
} = require("./controller/email.controller");
var {
  batch_formed,
  batchChangeOnCip,
} = require("./controller/common.controller");
var sku = require("./controller/sku.controller").router;
var stop = require("./controller/stops.controller");
var connection = require("./controller/connection.controller");
var manual = require("./controller/manualEntry.controller");
var alarm = require("./controller/alarm.controller");
var {
  Changeover,
  ChangeoverFromFunction,
} = require("./controller/changeover.controller");
var type = require("./controller/type.controller");
var report = require("./controller/report.controller");
var trend = require("./controller/trend.controller.js");
var Changeovermaster = require("./controller/changeovermaster.controller");
var fgex = require("./controller/fgex.controller");
var Threshhold = require("./controller/threshold.controller");
var sap = require("./controller/sap.controller");
var sapfgex = require("./controller/sapfgex.controller");
var multiline = require("./controller/multiline.controller").router;
var {
  add15minCache,
  getLiveChartData,
  getLiveChartDataAllMachine,
} = require("./controller/multiline.controller");
var schedule = require("./controller/schedulemantantiance.controller");

var email_sender_obj = {
  alert15min: {
    to: "anup.singh@smartfactoryworx.com",
    cc: "gopal.bhandari@smartfactoryworx.com,eklavya.lodha@smartfactoryworx.com,anshuman.purohit@smartfactoryworx.com",
  },
  alert30min: {
    to: "anup.singh@smartfactoryworx.com",
    cc: "gopal.bhandari@smartfactoryworx.com,eklavya.lodha@smartfactoryworx.com,anshuman.purohit@smartfactoryworx.com",
  },
  alert60min: {
    to: "anup.singh@smartfactoryworx.com",
    cc: "gopal.bhandari@smartfactoryworx.com,eklavya.lodha@smartfactoryworx.com,anshuman.purohit@smartfactoryworx.com",
  },
};
//global variable
const thing_data_map = {};
var last_thing_map = {};
//machine state
const machine_state_obj = {};
var changeover_force_stop_count = 800;
var pdt_force_stop_count = 500;
global.ChangeoverMode = {};
//express app
const app = express();


mongoose
  .connect(process.env.MONGODB_OFFLINE_DB)
  .then((connected) => console.log(`Database connection established`))
  .catch((err) =>
    console.error(
      `There was an error connecting to database, the err is ${err}`
    )
  );
const client = mqtt.connect(`mqtt://${process.env.mqtt_broker_url}:1883`);

//app
app.use(helmet());
//app.use(logger("dev"));

//api
app.use(express.static(__dirname + "/public"));
app.use(express.json());
app.use(cors());
app.get("/", async (req, res) => {
  //res.send("Hello World")
  res.sendFile(__dirname + "/public/index.html");
});
//sap
app.get("/sap", async (req, res) => {
  res.sendFile(__dirname + "/public/sap.html");
});
//overview
app.get("/overview", async (req, res) => {
  res.sendFile(__dirname + "/public/overview.html");
});
//for ssl renew
app.get("/.well-known/acme-challenge/:id", async (req, res) => {
  res.send(
    "tZCWXIPtJ_ymGAwNDdzpDnI71mAHz0D4IoqAmS-aznk.l9RyDsOoPwFuLJjP6L3ThDfbyf5dl9s2pKFN6iUHNX0"
  );
});

app.use("/api/shift", shift);
app.use("/api/sku", sku);
app.use("/api/stops", stop);
app.use("/api/connection", connection);
app.use("/api/manual", manual);
app.use("/api/alarm", alarm);
app.use("/api/report", report);
app.use("/api/changeover", Changeover);
app.use("/api/type", type);
app.use("/api/trend", trend);
app.use("/api/changeovermaster", Changeovermaster);
app.use("/api/fgex", fgex);
app.use("/api/threshold", Threshhold);
app.use("/api/sap", sap);
app.use("/api/sap", sapfgex);
app.use("/api/multiline", multiline);
app.use("/api/schedulemaintenance", schedule);

//Error Handling
app.use((req, res, next) => {
  const error = new Error("Not Found");
  error.status = 404;
  next(error);
});
//global error
app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    status: "error",
    res: error.message,
  });
});
//bot.launch();
var line_ob_obj = {};
//get
async function processFunction() {
  //global shift
  var data = await CurrentShift();
  var shift = data.shift;
  var d = data.date;
  var timestamp = moment().format("YYYY-MM-DDTHH:mm:ss");
  //get all line array
  var line_arr = await addLine.find().populate("line_id");
  //loop on the line
  if (line_arr && line_arr.length > 0) {
    line_arr.forEach(async (line, i) => {
      var line_id = line.line_id._id;
      line_ob_obj[line_id] = line_ob_obj[line_id] || { status: 2 };
      var line_name_full = line.line_id.line_name;
      var current_batch = await getCurrentBatch(
        line_id,
        d,
        moment(d).format("YY"),
        moment(d).dayOfYear(),
        line.line_batch
      );
      if (
        current_batch &&
        current_batch.product_name &&
        String(current_batch.product_name.line_id) == String(line_id) &&
        line.sku && 
        line.sku != current_batch.product_name.sku_code_in_hmi &&
        line_ob_obj[line_id]["status"] == 2 
        ) {
        line_ob_obj[line_id]["status"] = 3;
        var fgex_data = await getFgexFromHmiCode(line_id, line.sku);
        ChangeoverFromFunction(
          line_id,
          fgex_data._id,
          "System",
          null,
          (err, data) => {
            line_ob_obj[line_id]["status"] = 2;
          }
        );
      }
        if(
          line.manual_write_sku != null &&
          line.manual_on_delay != null &&
          line.manual_off_delay != null &&
          line.manual_write_sku != current_batch.product_name.sku_code_in_hmi &&
          line.manual_off_delay != current_batch.product_name.off_delay &&
          line.manual_on_delay != current_batch.product_name.on_delay &&
          current_batch.product_name.sku_topic_write &&
           line_ob_obj[line_id]["status"] == 2
          ){
            writeTagInPlc(
              current_batch.product_name.sku_topic_write,
              `[{ "address": ${current_batch.product_name.off_delay_plc_address}, "data": ${current_batch.product_name.off_delay} },{ "address": ${current_batch.product_name.on_delay_plc_address}, "data": ${current_batch.product_name.on_delay} },{ "address": ${current_batch.product_name.sku_write_plc_address}, "data": ${current_batch.product_name.sku_code_in_hmi} }]`
        );

        }
      var current_vendor = await getCurrentvendor(line_id);
      var current_changeover = await getLastChangeover(line_id);
      var current_cip = await getCurrentCip(line_id, d);
      if (line_ob_obj[line_id]["status"] == 2) {
        line_ob_obj[line_id]["status"] = 4;
        add15minCache(line_id, async (current_api_data) => {
          var vendor = current_vendor._id;
          var batch = current_batch ? current_batch._id : null;
          var changeover_id = current_changeover
            ? current_changeover._id
            : null;
          var cip_id = current_cip ? current_cip._id : null;
          if (batch && changeover_id && !global.ChangeoverMode[line_id]) {
            var operator_roster = await indexoperatorid(d, shift, line_id);
            var pre_shift = await preShift(
              line.critical_machine,
              line_id,
              shift,
              current_batch._id,
              d,
              vendor,
              operator_name,
              changeover_id,
              cip_id
            );
            //end pdt of all lines at once
            if (
              pre_shift.isPdt &&
              pre_shift.current_good_value - pre_shift.pdt_start_good_count >
              pdt_force_stop_count
            ) {
              line_ob_obj[line_id]["status"] = 5;
              endPdtFromCount(line_id, () => {
                frequentGoodUpdate(
                  line.critical_machine,
                  line_id,
                  {
                    isPdt: false,
                  },
                  () => {
                    line_ob_obj[line_id]["status"] = 2;
                  }
                );
              });
              return;
            }
            var operator_name = operator_roster._id;
            if (pre_shift.current_shift != shift || !moment(d).isSame(moment(pre_shift.date))) {
              getLiveChartDataAllMachine(line_id, (chart_api_data) => {
                var timestamp = moment().format("YYYY-MM-DDTHH:mm:ss");
                addTempDataHourly(
                  timestamp,
                  line_id,
                  chart_api_data,
                  (return_arr) => {
                    addShiftData(
                      line_id,
                      d,
                      shift,
                      operator_name,
                      batch,
                      vendor,
                      changeover_id,
                      cip_id,
                      (data) => {
                        scheduleMaintance_calculation(
                          line_id,
                          (schedule_maintance) => {
                            pdt_calculation(line_id, (pdt_data) => {
                              var target = current_batch.batch_size;
                              var global_changeover = line.global_changeover;
                              var global_cip = line.global_cip ? 1 : 0;
                              //console.log(shift,d,pre_shift,thing_data_map)
                              line.machine_wise.forEach((element, m_i) => {
                                //when no shift change
                                var shift_machine_wise_obj = current_api_data.find(
                                  (a) => a.machine_name == element.machine_name
                                );
                                var idle_code =
                                  element.ready && element.ready == 1 ? 1 : 2;
                                //when no shift change
                                addstop(
                                  element.machine_name,
                                  false,
                                  global_changeover,
                                  pdt_data.code,
                                  element.updt,
                                  element.first_fault,
                                  element.blocked,
                                  element.waiting,
                                  element.fault_scroll,
                                  element.manual_stop,
                                  element.executing,
                                  idle_code,
                                  shift,
                                  line_id,
                                  d,
                                  timestamp,
                                  batch,
                                  operator_name,
                                  global_changeover,
                                  vendor,
                                  line.date_change_shift,
                                  line.critical_machine,
                                  line.first_machine_position,
                                  line.last_machine_position,
                                  schedule_maintance.code,
                                  changeover_id,
                                  shift_machine_wise_obj,
                                  pdt_data.id,
                                  global_cip,
                                  line.is15minAlert,
                                  line.is30minAlert,
                                  line.is60minAlert,
                                  cip_id,
                                  line.total_no_of_machine,
                                  line_name_full
                                );
                                goodCount(
                                  element.good_count || 0,
                                  0,
                                  element.machine_name,
                                  element.bpm,
                                  element.machine_mode,
                                  shift,
                                  batch,
                                  d,
                                  line_id,
                                  element.input_count,
                                  operator_roster.operator_name,
                                  operator_name,
                                  global_changeover,
                                  line.critical_machine,
                                  current_batch.batch,
                                  vendor,
                                  changeover_id,
                                  line.last_machine,
                                  line.first_machine,
                                  line.global_setup ? line.global_setup : false,
                                  line.changeoverend_resp_machine,
                                  line.date_change_shift,
                                  line.no_of_batch_from_plc,
                                  line.manual_no_batch,
                                  line.water_use,
                                  line.cip_type ? line.cip_type : 0,
                                  line.line_id.line_type,
                                  cip_id,
                                  global_cip
                                );
                                if (m_i + 1 == line.machine_wise.length) {
                                  line_ob_obj[line_id]["status"] = 2;
                                }
                              });
                            });
                          }
                        );
                      }
                    );
                  });
                });            
            } else {
              scheduleMaintance_calculation(line_id, (schedule_maintance) => {
                pdt_calculation(line_id, (pdt_data) => {
                  var target = current_batch.batch_size;
                  var global_changeover = line.global_changeover;
                  var global_cip = line.global_cip ? 1 : 0;
                  if (pdt_data.code > 0 && !pre_shift.isPdt) {
                    pdtStartInTemp(pre_shift.machine, line_id, () => {
                      line_ob_obj[line_id]["status"] = 2;
                    });
                    return
                  }
                  //console.log(shift,d,pre_shift,thing_data_map)
                  line.machine_wise.forEach((element, m_i) => {
                    var idle_code = element.ready && element.ready == 1 ? 1 : 2;
                    var shift_machine_wise_obj = current_api_data.find(
                      (a) => a.machine_name == element.machine_name
                    );
                    //when no shift change
                    addstop(
                      element.machine_name,
                      false,
                      global_changeover,
                      pdt_data.code,
                      element.updt,
                      element.first_fault,
                      element.blocked,
                      element.waiting,
                      element.fault_scroll,
                      element.manual_stop,
                      element.executing,
                      idle_code,
                      shift,
                      line_id,
                      d,
                      timestamp,
                      batch,
                      operator_name,
                      global_changeover,
                      vendor,
                      line.date_change_shift,
                      line.critical_machine,
                      line.first_machine_position,
                      line.last_machine_position,
                      schedule_maintance.code,
                      changeover_id,
                      shift_machine_wise_obj,
                      pdt_data.id,
                      global_cip,
                      line.is15minAlert,
                      line.is30minAlert,
                      line.is60minAlert,
                      cip_id,
                      line_name_full
                    );
                    goodCount(
                      element.good_count || 0,
                      0,
                      element.machine_name,
                      element.bpm,
                      element.machine_mode,
                      shift,
                      batch,
                      d,
                      line_id,
                      element.input_count,
                      operator_roster.operator_name,
                      operator_name,
                      global_changeover,
                      line.critical_machine,
                      current_batch.batch,
                      vendor,
                      changeover_id,
                      line.last_machine,
                      line.first_machine,
                      line.global_setup ? line.global_setup : false,
                      line.changeoverend_resp_machine,
                      line.date_change_shift,
                      line.no_of_batch_from_plc,
                      line.manual_no_batch,
                      line.water_use,
                      line.cip_type ? line.cip_type : 0,
                      line.line_id.line_type,
                      cip_id,
                      global_cip
                    );
                    //console.log(m_i + 1 ,line.machine_wise.length);
                    if (m_i + 1 == line.machine_wise.length) {
                      line_ob_obj[line_id]["status"] = 2;
                    }
                    if (new Date() - element.last_connected > 180000) {
                      updateConnection(
                        "gateway_error",
                        element.machine_name,
                        line_id,
                        (data) => {
                          if (
                            data &&
                            element.machine_name == line.critical_machine
                          ) {
                            sendTeleMessage(
                              line_name_full + " No Ethernet in the Gateway"
                            );
                          }
                        }
                      );
                    } else if (new Date() - element.gateway_last_connect > 180000) {
                      updateConnection(
                        "ipc_error",
                        element.machine_name,
                        line_id,
                        () => { }
                      );
                    } else if (new Date() - element.plc_timestamp > 180000) {
                      updateConnection(
                        "plc_error",
                        element.machine_name,
                        line_id,
                        () => { }
                      );
                    } else {
                      updateConnection(
                        "ok",
                        element.machine_name,
                        line_id,
                        (data) => {
                          if (
                            data &&
                            element.machine_name == line.critical_machine
                          ) {
                            // sendTeleMessage(
                            //   line_name_full + " Connection Restored"
                            // );
                          }
                        }
                      );
                    }
                  });
                });
              });
            }
          }else{
            //if any error on not find 
            line_ob_obj[line_id]["status"] = 2
          }
        });
      }
    });
  }
}

//add history data every 30 min

setInterval(async () => {
  try {
    const now = moment().local();
    const currentMinutes = now.hours() * 60 + now.minutes();
    const minutes = now.minutes();
    if (minutes === 0) {
      const lineArr = await addLine.find().populate("line_id");
      const shifts = await Shift.find({});

      const shiftMatch = shifts.some(shift => currentMinutes === shift.shiftStartTime);
      if (shiftMatch) {
        return; 
      }
      for (const line of lineArr) {
        const lineId = line.line_id._id;
        const timestamp = moment().format("YYYY-MM-DDTHH:mm:ss");

        // Fetch live data for the line and save hourly data
        getLiveChartDataAllMachine(lineId, async (currentApiData) => {
          await addTempDataHourly(
            timestamp,
            lineId,
            currentApiData,
            (returnArr) => {
              const criticalMachine = returnArr.find(
                mech => mech.machine_name === line.critical_machine
              );

              if (criticalMachine && criticalMachine.shift_total_count > 500) {
                const lastMachine = returnArr.find(
                  mech => mech.machine_name === line.last_machine_count_machine
                );

                if (lastMachine) {
                  const sendHtml = `<b>From</b> ${criticalMachine.last_timestamp} <b>To</b> ${moment(timestamp).local().format("HH:mm")}\n
<b>Line</b>:- ${line.line_id.line_name}
<b>SKU</b>:- ${criticalMachine.sku}
<b>Shift Bottle Production</b>:- ${criticalMachine.shift_total_count}
<b>Final Production</b>:- ${lastMachine.shift_total_count}
<b>Shift Total Down Time</b>:- ${criticalMachine.total_downtime}
<b>Hourly Bottle Production</b>:- ${criticalMachine.goodcount}
<b>Hourly Final Production</b>:- ${lastMachine.goodcount}
<b>Hourly Total Down Time</b>:- ${criticalMachine.hourly_total_downtime}
<b>ME</b>:- ${criticalMachine.me}
<b>SLE</b>:- ${criticalMachine.pe}`;

                  sendTeleMessage(sendHtml);
                }
              }
            }
          );
        });
      }
    }
  } catch (error) {
    console.error("Error in hourly function:", error);
  }
}, 60 * 1000); // Run every minute
var sent_t = false;
// function for good count
async function goodCount(
  good_count,
  reject_count,
  machine,
  bpm,
  mode,
  shift,
  batch,
  d,
  line_id,
  cycle_count,
  operator_name_string,
  operator_name,
  global_changeover,
  critical_machine,
  current_batch_name,
  vendor,
  changover_id,
  last_machine,
  first_machine,
  global_setup,
  changeoverend_resp_machine,
  date_change_shift,
  no_of_batch_from_plc,
  manual_no_batch,
  water_use,
  cip,
  line_type,
  cip_id,
  global_cip
) {
  var temp = await getTempGood(
    machine,
    line_id,
    shift,
    batch,
    good_count,
    reject_count,
    cycle_count,
    d,
    vendor
  );
  // addMachineData(
  //   line_id,
  //   d,
  //   shift,
  //   operator_name,
  //   batch,
  //   machine,
  //   () => {
  //     //can do operation after shift end process
  //   })
  //updateChangeOver('automatic')
  var reset_counter = temp.current_good_value * 0.5;
  var date = d;
  //setup_time()
  //shift change all changes
  if (temp.current_shift != shift || !moment(d).isSame(moment(temp.date))) {
    var pre_shift = temp.current_shift;
    date = temp.date
    // if (pre_shift == date_change_shift) {
    //   var date = moment().local().subtract(1, "days").startOf("day").format();
    //   var split = date.split("+");
    //   date = split[0] + "+00:00";
    // }
    var shift_good = temp.current_good_value - temp.shift_start_good_count;
    var shift_cycle_count =
      temp.current_cycle_count - temp.shift_start_cycle_count;
    var shift_reject = 0;
    var setup_time = temp.setup_mode
      ? (new Date() - new Date(temp.setup_timestamp)) / 1000
      : 0;
    if (!temp.changeover_mode) {
      shift_reject = temp.current_reject_value - temp.shift_start_reject_count;
    } else {
      var changover_reject =
        temp.current_reject_value - temp.shift_start_reject_count;
      updateStartupReject(
        line_id,
        date,
        pre_shift,
        batch,
        machine,
        changover_reject,
        setup_time,
        vendor,
        () => { }
      );
      pushAndUpdateChangeover(
        shift,
        operator_name,
        date,
        temp.setup_mode,
        line_id,
        () => { }
      );
      updateStatusStartupReject(machine, line_id, changover_reject, () => { });
    }

    updateGoodCount(
      line_id,
      date,
      pre_shift,
      temp.currnt_batch,
      vendor,
      machine,
      shift_good,
      shift_reject,
      shift_cycle_count,
      () => {
        batchEnd(line_id, date, pre_shift, (err, data) => {
          //batch count reset at shift A
          if (pre_shift == date_change_shift) {
            frequentGoodUpdate(machine, line_id, {
              shift_start_good_count: temp.current_good_value,
              shift_start_reject_count: temp.current_reject_value,
              shift_start_cycle_count: temp.current_cycle_count,
              current_shift: shift,
              date: d,
              setup_timestamp: temp.setup_mode ? new Date() : null,
              current_operator: operator_name_string,
              currnt_batch: batch,
            });
          } else {
            frequentGoodUpdate(machine, line_id, {
              shift_start_good_count: temp.current_good_value,
              shift_start_reject_count: temp.current_reject_value,
              shift_start_cycle_count: temp.current_cycle_count,
              current_shift: shift,
              date: d,
              setup_timestamp: temp.setup_mode ? new Date() : null,
              current_operator: operator_name_string,
              currnt_batch: batch,
            });
          }
          addMachineData(
            line_id,
            d,
            shift,
            operator_name,
            batch,
            vendor,
            machine,
            changover_id,
            cip_id,
            () => {
              if (!moment(d).isSame(moment(temp.date)) && machine == critical_machine) {
                var pre_date_format = moment()
                  .local()
                  .subtract(1, "days")
                  .format("YYYY-MM-DD");
                setTimeout(() => {
                  getDayWiseReport(line_id, pre_date_format, (data) => {
                    sendTeleMessage(data);
                  });
                  adjustMatchCount(line_id)
                }, 180000);
              }

              //can do operation after shift end process
            }
          );
        });
      }
    );
    return;
  }
  //change machine mode to cip
  if (temp.machine_mode == "production" && global_cip > 0) {
    if (!global_changeover && machine == critical_machine) {
      batchChangeOnCip(
        line_id,
        {
          date: d,
          changeover_id: changover_id,
        },
        () => { }
      );
    }
    frequentGoodUpdate(machine, line_id, {
      bpm: bpm,
      mode: mode,
      current_operator: operator_name_string,
      cip_start_good_count: good_count,
      cip_start_reject_value: reject_count,
      cip_start_cycle_count: cycle_count,
      cip_start_timestamp: new Date(),
      isCipHalfHourDone: false,
      water_use: water_use,
      machine_mode: "cip",
    });
    return;
  }

  //global cip off
  if (
    (global_cip > 0 &&
      temp.current_good_value - temp.batch_start_good_count >
      changeover_force_stop_count) &&
    machine == critical_machine && temp.machine_mode != "production"
  ) {
    updateLineData(line_id, "global_cip", false, () => {
      endCip(line_id, water_use, () => {
        frequentGoodUpdate(machine, line_id, {
          bpm: bpm,
          mode: mode,
          current_operator: operator_name_string,
          water_use: water_use,
          machine_mode: temp.changeover_mode ? "changeover" : "production",
        });
      });
    });
    return;
  }

  //if count is greater than 500 OR changover global is false
  if (
    (!global_changeover ||
      temp.current_good_value - temp.batch_start_good_count >
      changeover_force_stop_count) &&
    temp.changeover_mode &&
    temp.currnt_batch.toString() == batch &&
    machine == critical_machine
  ) {
    var check_changeover = await getIsNullTrue(line_id);
    if (new Date() - new Date(check_changeover.changeover_start_date) > 60000) {
      var changeover_reject = reject_count - temp.shift_start_reject_count;
      var setup_time = temp.setup_mode
        ? (new Date() - new Date(temp.setup_timestamp)) / 1000
        : 0;
      if (
        temp.current_good_value - temp.batch_start_good_count >
        changeover_force_stop_count
      ) {
        updateChangeOver("automatic", line_id, temp, (data) => {
          updateStartupReject(
            line_id,
            d,
            shift,
            batch,
            machine,
            changeover_reject,
            setup_time,
            vendor,
            () => {
              updateLineData(line_id, "global_changeover", false, () => {
                updateLineData(line_id, "global_setup", false, () => {
                  updateStatusStartupReject(
                    machine,
                    line_id,
                    changeover_reject,
                    () => {
                      if (temp.machine_mode != "early_batch_end" && global_cip > 0) {
                        temp.machine_mode = "production";
                      }
                      endChecklist(line_id, () => {
                        temp.changeover_mode = false;
                        temp.shift_start_reject_count = reject_count;
                        temp.batch_start_reject_count = reject_count;
                        temp.bpm = bpm;
                        temp.mode = mode;
                        temp.setup_mode = false;
                        temp.setup_timestamp = null;
                        temp.target_end_plc_write = false;
                        temp.batch_end_message = false;
                        temp.film_end_meassgae = false;
                        temp.target_end_message = false;
                        temp.target_end_timer_message = false;
                        temp.save();
                      });
                    }
                  );
                });
              });
            }
          );
        });
      } else {
        var check_early_end = await Batchskutrigger.findOne({
          _id: temp.currnt_batch,
        });
        if (
          check_early_end.batch_end_type == "early_batch_end" &&
          check_early_end.end_case
        ) {
          updateChangeOver(
            "early_batch_end",
            line_id,
            check_early_end,
            (data) => {
              updateStartupReject(
                line_id,
                d,
                shift,
                batch,
                machine,
                changeover_reject,
                setup_time,
                vendor,
                () => {
                  updateLineData(line_id, "global_changeover", false, () => {
                    updateStatusStartupReject(
                      machine,
                      line_id,
                      changeover_reject,
                      () => {
                        temp.machine_mode = "early_batch_end";
                        temp.changeover_mode = false;
                        temp.shift_start_reject_count =
                          temp.current_reject_value;
                        temp.batch_start_reject_count =
                          temp.current_reject_value;
                        temp.bpm = bpm;
                        temp.mode = mode;
                        temp.setup_mode = false;
                        temp.setup_timestamp = null;
                        temp.target_end_plc_write = false;
                        temp.batch_end_message = false;
                        temp.film_end_meassgae = false;
                        temp.target_end_message = false;
                        temp.target_end_timer_message = false;
                        temp.save();
                      }
                    );
                  });
                }
              );
            }
          );
        }
      }
    }
  }
  //other machine finsih changeover
  if (
    !global_changeover &&
    temp.changeover_mode &&
    temp.currnt_batch.toString() == batch &&
    machine != critical_machine
  ) {
    var changeover_reject = reject_count - temp.shift_start_reject_count;
    var setup_time = temp.setup_mode
      ? (new Date() - new Date(temp.setup_timestamp)) / 1000
      : 0;
    updateStartupReject(
      line_id,
      d,
      shift,
      batch,
      machine,
      changeover_reject,
      setup_time,
      vendor,
      () => {
        updateStatusStartupReject(machine, line_id, changeover_reject, () => {
          if (temp.machine_mode != "early_batch_end" && global_cip > 0) {
            temp.machine_mode = "production";
          }
          temp.changeover_mode = false;
          temp.shift_start_reject_count = temp.current_reject_value;
          temp.batch_start_reject_count = temp.current_reject_value;
          temp.bpm = bpm;
          temp.mode = mode;
          temp.setup_mode = false;
          temp.setup_timestamp = null;
          temp.target_end_plc_write = false;
          temp.batch_end_message = false;
          temp.film_end_meassgae = false;
          temp.target_end_message = false;
          temp.target_end_timer_message = false;
          temp.save();
        });
      }
    );
  }
  //will deliver after 10 min
  //console.log(temp.target_end_timestamp,new Date() - temp.target_end_timestamp,temp.target_end_message,line_id)
  //check for max bpm
  if (bpm > temp.bpm) {
    updateMaxBpm(
      line_id,
      d,
      shift,
      operator_name,
      batch,
      vendor,
      machine,
      bpm,
      () => { }
    );
  }
  //start_setup mode
  if (
    temp.changeover_mode &&
    !temp.setup_mode &&
    temp.current_cycle_count - temp.batch_start_cycle_count > 0 &&
    temp.machine == first_machine &&
    temp.currnt_batch.toString() == batch
  ) {
    updateLineData(line_id, "global_setup", true, () => {
      changeSetupMode(line_id, new Date(), (data) => {
        frequentGoodUpdate(machine, line_id, {
          bpm: bpm,
          mode: mode,
          setup_mode: true,
          setup_timestamp: new Date(),
          current_operator: operator_name_string,
        });
      });
    });
    return;
  }
  //other machine setup
  if (global_setup && !temp.setup_mode && temp.machine != first_machine) {
    frequentGoodUpdate(machine, line_id, {
      bpm: bpm,
      mode: mode,
      setup_mode: true,
      setup_timestamp: new Date(),
      current_operator: operator_name_string,
    });
    return;
  }
  //if bacth change
  if (no_of_batch_from_plc > manual_no_batch) {
    batch_formed(line_id, d, no_of_batch_from_plc, () => { });
  }
  //add water at current batch
  if (
    temp.water_use &&
    temp.water_use > 0 &&
    water_use == 0 &&
    temp.machine == critical_machine
  ) {
    addWaterIndgredent(line_id, batch, temp.water_use, () => {
      frequentGoodUpdate(machine, line_id, {
        bpm: bpm,
        mode: mode,
        current_good_value: good_count,
        current_reject_value: reject_count,
        current_cycle_count: cycle_count,
        current_operator: operator_name_string,
        water_use: water_use,
      });
    });
    return;
  }


  //add cip if machine is in CIP
  if (temp.machine_mode == "changeover" && global_cip > 0) {
    if (temp.machine == critical_machine) {
      addNewCip(line_id, d, () => {

      })
    }

    frequentGoodUpdate(machine, line_id, {
      bpm: bpm,
      mode: mode,
      current_operator: operator_name_string,
      cip_start_good_count: good_count,
      cip_start_reject_value: reject_count,
      cip_start_cycle_count: cycle_count,
      cip_start_timestamp: new Date(),
      isCipHalfHourDone: false,
      water_use: water_use,
      machine_mode: "cip",
    });
    return
  }


  //production mode form cip
  if (
    temp.machine_mode == "cip" &&
    new Date() - temp.cip_start_timestamp > 1800000 &&
    !temp.isCipHalfHourDone
  ) {
    frequentGoodUpdate(machine, line_id, {
      bpm: bpm,
      mode: mode,
      current_operator: operator_name_string,
      water_use: water_use,
      isCipHalfHourDone: true,
    });
    return;
  }
  //if plc value get reset
  if (good_count < reset_counter && good_count > 0) {
    var reset_good_count =
      temp.current_good_value - temp.shift_start_good_count;
    var reset_reject_count =
      temp.current_reject_value - temp.shift_start_reject_count;
    updateGoodCount(
      line_id,
      date,
      shift,
      batch,
      vendor,
      machine,
      reset_good_count,
      reset_reject_count,
      0,
      () => {
        frequentGoodUpdate(machine, line_id, {
          shift_start_good_count: good_count,
          shift_start_reject_count: reject_count,
          //shift_start_cycle_count: cycle_count,
          batch_start_good_count: good_count,
          batch_start_reject_count: reject_count,
          //batch_start_cycle_count: cycle_count,
          current_good_value: good_count,
          pdt_start_good_count: good_count,
          current_reject_value: reject_count,
          current_cycle_count: cycle_count,
        });
      }
    );
    return;
  }
  if (good_count > 0 || line_type == "process") {
    //good_count == cycle_count ? console.log(cycle_count, machine) : "ok";
    frequentGoodUpdate(machine, line_id, {
      bpm: bpm,
      mode: mode,
      current_good_value: good_count,
      current_reject_value: reject_count,
      current_cycle_count: cycle_count,
      current_operator: operator_name_string,
      water_use: water_use,
    });
  }
}

var machine_counter = {};
//add stop function
async function addstop(
  machine,
  not_used,
  changeover,
  pdt,
  updt,
  stop,
  blocked,
  waiting,
  alarm,
  manual_stop,
  execution,
  ready,
  shift,
  line_id,
  d,
  timestamp,
  batch,
  operator_name,
  global_changeover,
  vendor,
  date_change_shift,
  critical_machine,
  first_machine_position,
  last_machine_position,
  schedule_maintance,
  changeover_id,
  current_api_data,
  referanceid,
  cip,
  is15minAlert,
  is30minAlert,
  is60minAlert,
  cip_id,
  line_name
) {
  //console.log(is15minAlert, is30minAlert, is60minAlert);
  var code;
  var current = preference([
    non_zero(schedule_maintance),
    non_zero(pdt),
    non_zero(updt),
    changeover,
    non_zero(cip),
    not_used,
    non_zero(stop),
    manual_stop,
    non_zero(blocked),
    non_zero(waiting),
    execution,
    non_zero(ready),
  ]);
  if (current == "fault") {
    code = `${current}_${stop}`;
    current = "fault";
  } else if (current == "waiting") {
    code = `${current}_${waiting}`;
    current = "waiting";
  } else if (current == "blocked") {
    code = `${current}_${blocked}`;
    current = "blocked";
  } else if (current == "blocked") {
    code = `${current}_${blocked}`;
    current = "blocked";
  } else if (current == "updt") {
    code = `${current}_${updt}`;
    current = "updt";
  } else if (current == "pdt") {
    code = `${current}_${pdt}`;
    current = "pdt";
  } else if (current == "cip") {
    code = `${current}_${cip}`;
    current = "cip";
  } else if (current == "schedule_maintance") {
    code = `${current}_${schedule_maintance}`;
    current = "schedule_maintance";
  } else if (current == "ready") {
    code = `${current}_${ready}`;
    current = "ready";
  } else {
    code = current;
  }
  var live_api_data = { ...current_api_data };

  getCondition(
    machine,
    line_id,
    d,
    shift,
    operator_name,
    batch,
    vendor,
    changeover_id,
    cip_id,
    (status_data) => {
      //if any alarm
      if (stop > 0) {
        updateAlarm(machine, line_id, stop, alarm);
      } else {
        if (alarm > 0) {
          updateAlarm(machine, line_id, 0, alarm);
        } else {
          updateAlarmStatus(machine, line_id);
        }
      }
      //console.log(machine_state_obj[machine])
      //if state change
      if (
        current != status_data.condition &&
        String(status_data.batch) == String(batch) &&
        status_data.shift == shift &&
        moment(d).isSame(moment(status_data.date)) &&
        String(status_data.vendor) == String(vendor)
      ) {
        //if poweroff b/w changeover
        var diff = moment(timestamp).diff(
          moment(status_data.last_update),
          "seconds"
        );
        if (
          (status_data.condition == "updt" || status_data.condition == "pdt") &&
          global_changeover
        ) {
          updatePowerOff(shift, diff, d, line_id, batch, machine, vendor);
        }
        //when machine is critical
        if (machine == critical_machine) {
          //when machine is in waiting
          if (current == "waiting") {
            getStopMachineOnWaiting(
              line_id,
              status_data.machine_position,
              (arr) => {
                //if any machine upstream is in fault
                if (arr.length > 0) {
                  //nearest machine is in fault
                  var critical_machine_off_name = arr[0].machine;
                  updateCriticalStop(
                    line_id,
                    d,
                    shift,
                    critical_machine_off_name,
                    (err, stop) => {
                      if (!err) {
                        updateStatus(machine, line_id, {
                          blocked_machine_id: stop._id,
                          critical_machine_name: critical_machine_off_name,
                          critical_machine_off: true,
                        });
                      }
                    }
                  );
                } else {
                  getWaitingMachineOnWaiting(
                    line_id,
                    status_data.position,
                    (arr) => {
                      if (
                        arr[0] &&
                        arr[0].machine_position != first_machine_position
                      ) {
                        var first_machine_name = arr[0].machine;
                        updateStatus(machine, line_id, {
                          blocked_machine_id: null,
                          critical_machine_name:
                            first_machine_name + "waiting_conveyor",
                          critical_machine_off: true,
                        });
                      }
                    }
                  );
                }
              }
            );
          }
          //when machine is in block
          if (
            current == "blocked" ||
            current == "manual_stop" ||
            current == "ready"
          ) {
            getStopMachineOnBlocked(
              line_id,
              status_data.machine_position,
              (arr) => {
                //if any machine upstream is in fault
                if (arr.length > 0) {
                  //nearest machine is in fault
                  var critical_machine_off_name = arr[0].machine;
                  updateCriticalStop(
                    line_id,
                    d,
                    shift,
                    critical_machine_off_name,
                    (err, stop) => {
                      if (!err) {
                        updateStatus(machine, line_id, {
                          blocked_machine_id: stop._id,
                          critical_machine_name: critical_machine_off_name,
                          critical_machine_off: true,
                        });
                      }
                    }
                  );
                } else {
                  getBlockedMachineOnBlocked(
                    line_id,
                    status_data.machine_position,
                    (arr) => {
                      if (
                        arr[0] &&
                        arr[0].machine_position != last_machine_position
                      ) {
                        var first_machine_name = arr[0].machine;
                        updateStatus(machine, line_id, {
                          blocked_machine_id: null,
                          critical_machine_name:
                            first_machine_name + "blocked_conveyor",
                          critical_machine_off: true,
                        });
                      }
                    }
                  );
                }
              }
            );
          }
          //when previous state is waiting
          if (
            status_data.condition == "waiting" ||
            status_data.condition == "blocked" ||
            status_data.condition == "manual_stop" ||
            status_data.condition == "ready"
          ) {
            if (status_data.critical_machine_name) {
              updateCriticalOff(
                line_id,
                d,
                shift,
                batch,
                vendor,
                machine,
                status_data.critical_machine_name,
                status_data.condition,
                diff,
                status_data.stop_id,
                status_data.blocked_machine_id,
                (pro) => {
                  updateStatus(machine, line_id, {
                    blocked_machine_id: null,
                    critical_machine_name: null,
                    critical_machine_off: false,
                  });
                }
              );
            }
          }
          if (
            status_data.condition == "waiting" ||
            status_data.condition == "blocked" ||
            status_data.condition == "manual_stop" ||
            status_data.condition == "ready" ||
            status_data.condition == "fault"
          ) {
            resetAlert(line_id, () => { });
          }
        }
        //when current changeover the last event should go previous batch
        postStop(
          {
            line_id,
            shift,
            date: d,
            machine_name: machine,
            timestamp,
            batch,
            vendor,
            good_count: live_api_data.total_count,
            fromChange: "from state change",
            referance_id: referanceid,
            parent_stop: current,
            stop_name: code
          },
          (doc) => {
            updateStopData(
              line_id,
              d,
              shift,
              machine,
              status_data.condition,
              status_data.code,
              diff,
              status_data.batch,
              vendor,
              (data) => {
                if (status_data.condition == "fault") {
                  updateCriticalOff(
                    line_id,
                    d,
                    shift,
                    batch,
                    vendor,
                    machine,
                    machine,
                    status_data.condition,
                    diff,
                    status_data.stop_id,
                    status_data.stop_id,
                    (pro) => { }
                  );
                }
              }
            );
            var stop_id = doc ? doc._id : null;
            updateCondition(
              machine,
              line_id,
              current,
              timestamp,
              code,
              diff,
              shift,
              batch,
              stop_id,
              (data) => {
                //console.log(data);
              }
            );
          }
        );
        return;
      } else {
        var diff = moment(timestamp).diff(
          moment(status_data.last_update),
          "seconds"
        );

        if (
          (current == "waiting" ||
            current == "blocked" ||
            current == "manual_stop" ||
            current == "ready" ||
            current == "fault") &&
          machine == critical_machine
        ) {
          var mode_json = {
            executing: "Running",
            ready: "Idle",
            waiting: "Waiting",
            blocked: "Blocked",
            fault: "Fault",
            pdt: "Plant Down Time",
            manual_stop: "Manual Stop",
            updt: "Power Off",
            changeover: "Changeover",
            cip: "CIP",
          };
          if (diff > 15 * 60 && !is15minAlert) {
            Addalerts(
              line_id,
              "15 Min Stop Alert",
              shift,
              d,
              true,
              email_sender_obj.alert15min.to,
              email_sender_obj.alert15min.cc,
              `Critical Machine is in ${mode_json[current]
              } for 15 min since ${moment(status_data.last_update)
                .local()
                .format("YYYY-MM-DDTHH:mm")}`,
              () => {
                updateLineData(line_id, "is15minAlert", true, () => {
                  sendTeleMessage(
                    `${line_name} Line Critical Machine is in ${mode_json[current]
                    } for 15 min since ${moment(status_data.last_update)
                      .local()
                      .format("YYYY-MM-DDTHH:mm")}`
                  );
                  // if (line_type == "filling") {
                  //   mailer(
                  //     "admin@smartfactoryworx.com",
                  //     email_sender_obj.alert15min.to,
                  //     email_sender_obj.alert15min.cc,
                  //     `${critical_machine} is in ${
                  //       mode_json[current]
                  //     } for last 15 Min from ${moment(status_data.last_update)
                  //       .local()
                  //       .format("YYYY-MM-DDTHH:mm")}`,
                  //     `Critical Machine is in ${
                  //       mode_json[current]
                  //     } for 15 min since ${moment(status_data.last_update)
                  //       .local()
                  //       .format("YYYY-MM-DDTHH:mm")}`
                  //   );
                  // }
                });
              }
            );
          }
          if (diff > 30 * 60 && !is30minAlert) {
            Addalerts(
              line_id,
              "30 Min Stop Alert",
              shift,
              d,
              true,
              email_sender_obj.alert30min.to,
              email_sender_obj.alert30min.cc,
              `Critical Machine is in ${mode_json[current]
              } for 30 min since ${moment(status_data.last_update)
                .local()
                .format("YYYY-MM-DDTHH:mm")}`,
              () => {
                updateLineData(line_id, "is30minAlert", true, () => {
                  sendTeleMessage(
                    `${line_name} Line  Critical Machine is in ${mode_json[current]
                    } for 30 min since ${moment(status_data.last_update)
                      .local()
                      .format("YYYY-MM-DDTHH:mm")}`
                  );
                  // if (line_type == "filling") {
                  //   mailer(
                  //     "admin@smartfactoryworx.com",
                  //     email_sender_obj.alert30min.to,
                  //     email_sender_obj.alert30min.cc,
                  //     `${critical_machine} is in ${
                  //       mode_json[current]
                  //     } for last 30 Min from ${moment(status_data.last_update)
                  //       .local()
                  //       .format("YYYY-MM-DDTHH:mm")}`,
                  //     `Critical Machine is in ${
                  //       mode_json[current]
                  //     } for 30 min since ${moment(status_data.last_update)
                  //       .local()
                  //       .format("YYYY-MM-DDTHH:mm")}`
                  //   );
                  // }
                });
              }
            );
          }

          if (diff > 60 * 60 && !is60minAlert) {
            Addalerts(
              line_id,
              "60 Min Stop Alert",
              shift,
              d,
              true,
              email_sender_obj.alert60min.to,
              email_sender_obj.alert60min.cc,
              `Critical Machine is in ${mode_json[current]
              } for 60 min since ${moment(status_data.last_update)
                .local()
                .format("YYYY-MM-DDTHH:mm")}`,
              () => {
                updateLineData(line_id, "is60minAlert", true, () => {
                  sendTeleMessage(
                    `${line_name} Line Critical Machine is in ${mode_json[current]
                    } for 60 min since ${moment(status_data.last_update)
                      .local()
                      .format("YYYY-MM-DDTHH:mm")}`
                  );
                  // if (line_type == "filling") {
                  //   mailer(
                  //     "admin@smartfactoryworx.com",
                  //     email_sender_obj.alert60min.to,
                  //     email_sender_obj.alert60min.cc,
                  //     `${critical_machine} is in ${
                  //       mode_json[current]
                  //     } for last 60 Min from ${moment(status_data.last_update)
                  //       .local()
                  //       .format("YYYY-MM-DDTHH:mm")}`,
                  //     `Critical Machine is in ${
                  //       mode_json[current]
                  //     } for 60 min since ${moment(status_data.last_update)
                  //       .local()
                  //       .format("YYYY-MM-DDTHH:mm")}`
                  //   );
                  // }
                });
              }
            );
          }
        }
      }
      //if batch data will reset
      if (
        String(status_data.batch) != String(batch) &&
        status_data.shift == shift
      ) {
        var diff = moment(timestamp).diff(
          moment(status_data.last_update),
          "seconds"
        );
        postStop(
          {
            line_id,
            shift,
            date: d,
            machine_name: machine,
            timestamp,
            batch,
            vendor,
            good_count: live_api_data.total_count,
            fromChange: "from batch change",
            referance_id: referanceid,
            parent_stop: current,
            stop_name: code
          },
          (doc) => {
            updateStopData(
              line_id,
              status_data.date,
              status_data.shift,
              machine,
              status_data.condition,
              status_data.code,
              diff,
              status_data.batch,
              vendor,
              (data) => {
                var stop_id = doc ? doc._id : null;
                if (
                  status_data.critical_machine_off &&
                  machine == critical_machine
                ) {
                  updateCriticalOff(
                    line_id,
                    status_data.date,
                    shift,
                    status_data.batch,
                    vendor,
                    machine,
                    status_data.critical_machine_name,
                    status_data.condition,
                    diff,
                    status_data.stop_id,
                    status_data.blocked_machine_id,
                    (pro) => { }
                  );
                }
                if (status_data.condition == "fault") {
                  updateCriticalOff(
                    line_id,
                    status_data.date,
                    shift,
                    status_data.batch,
                    vendor,
                    machine,
                    machine,
                    status_data.condition,
                    diff,
                    status_data.stop_id,
                    status_data.stop_id,
                    (pro) => { }
                  );
                }
                updateCondition(
                  machine,
                  line_id,
                  current,
                  timestamp,
                  code,
                  diff,
                  shift,
                  status_data.batch,
                  stop_id,
                  (data) => {
                    resetBatchData(machine, line_id, batch, vendor, () => { });
                  }
                );
              }
            );
          }
        );
      }
      //if vendor data will reset
      if (
        String(status_data.vendor) != String(vendor) &&
        String(status_data.batch) == String(batch)
      ) {
        var diff = moment(timestamp).diff(
          moment(status_data.last_update),
          "seconds"
        );
        postStop(
          {
            line_id,
            shift,
            date: d,
            machine_name: machine,
            timestamp,
            batch,
            vendor,
            good_count: live_api_data.total_count,
            fromChange: "from vendor change",
            referance_id: referanceid,
            parent_stop: current,
            stop_name: code
          },
          (doc) => {
            updateStopData(
              line_id,
              status_data.date,
              shift,
              machine,
              status_data.condition,
              status_data.code,
              diff,
              status_data.batch,
              status_data.vendor,
              (data) => {
                if (
                  status_data.critical_machine_off &&
                  machine == critical_machine
                ) {
                  updateCriticalOff(
                    line_id,
                    status_data.date,
                    shift,
                    batch,
                    status_data.vendor,
                    machine,
                    status_data.critical_machine_name,
                    status_data.condition,
                    diff,
                    status_data.stop_id,
                    status_data.blocked_machine_id,
                    (pro) => { }
                  );
                }
                if (status_data.condition == "fault") {
                  updateCriticalOff(
                    line_id,
                    d,
                    shift,
                    batch,
                    status_data.vendor,
                    machine,
                    machine,
                    status_data.condition,
                    diff,
                    status_data.stop_id,
                    status_data.stop_id,
                    (pro) => { }
                  );
                }
              }
            );
            var stop_id = doc ? doc._id : null;
            updateCondition(
              machine,
              line_id,
              current,
              timestamp,
              code,
              diff,
              shift,
              batch,
              stop_id,
              (data) => {
                resetVendorData(machine, line_id, vendor, () => { });
              }
            );
          }
        );
      }
      //console.log(status_data.shift != shift || !moment(d).isSame(moment(status_data.date)));
      //shift data will reset
      if (status_data.shift != shift || !moment(d).isSame(moment(status_data.date))) {
        var diff = moment(timestamp).diff(
          moment(status_data.last_update),
          "seconds"
        );
        postStop(
          {
            line_id,
            shift,
            date: d,
            machine_name: machine,
            timestamp,
            batch,
            vendor,
            good_count: live_api_data.total_count,
            fromChange: "from shift change",
            referance_id: referanceid,
            parent_stop: current,
            stop_name: code
          },
          (doc) => {
            updateStopData(
              line_id,
              status_data.date,
              status_data.shift,
              machine,
              status_data.condition,
              status_data.code,
              diff,
              status_data.batch,
              vendor,
              (data) => {
                var stop_id = doc ? doc._id : null;
                if (
                  status_data.critical_machine_off &&
                  machine == critical_machine
                ) {
                  updateCriticalOff(
                    line_id,
                    status_data.date,
                    status_data.shift,
                    batch,
                    vendor,
                    machine,
                    status_data.critical_machine_name,
                    status_data.condition,
                    diff,
                    status_data.stop_id,
                    status_data.blocked_machine_id,
                    (pro) => { }
                  );
                }
                if (status_data.condition == "fault") {
                  updateCriticalOff(
                    line_id,
                    status_data.date,
                    status_data.shift,
                    batch,
                    vendor,
                    machine,
                    machine,
                    status_data.condition,
                    diff,
                    status_data.stop_id,
                    status_data.stop_id,
                    (pro) => { }
                  );
                }
                updateCondition(
                  machine,
                  line_id,
                  current,
                  timestamp,
                  code,
                  diff,
                  status_data.shift,
                  batch,
                  stop_id,
                  (data) => {
                    resetShiftData(
                      machine,
                      line_id,
                      shift,
                      d,
                      batch,
                      vendor,
                      () => {
                        // if (status_data.shift == date_change_shift) {
                        //   resetBatchData(
                        //     machine,
                        //     line_id,
                        //     batch,
                        //     vendor,
                        //     () => {}
                        //   );
                        // }
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    }
  );
}

//check value with status
function non_zero(value) {
  var status;
  if (!value || value == 0 || false) {
    status = false;
  } else {
    status = true;
  }
  return status;
}

//mqtt servie
client.on("connect", function () {
  client.subscribe("#", function (err, topic) {
    if (!err) {
      console.log("Connected");
      //client.publish('telegraf', "{name:'Shubham'}")
    } else {
      console.log(err);
    }
  });
});
//telegram
var telegram_group_id = process.env.telegram_group_id;
var mode_json = {
  executing: "Running",
  ready: "Idle",
  waiting: "Waiting",
  blocked: "Blocked",
  stop: "Fault",
  pdt: "Plant Down Time",
  manual_stop: "Manual Stop",
  updt: "Power Off",
  changeover: "Changeover",
  cip: "CIP",
};
//sendTeleMessage("Hello From COke server");
bot.on("text", (ctx) => {
  // Explicit usage
  try {
    var id =
      ctx.message.chat.type == "group" || ctx.message.chat.type == "supergroup"
        ? ctx.message.chat.id
        : ctx.message.from.id;
    if (ctx) {
      add15minCache("6343bbc91b73287f9a134ed8", async (current_api_data, x) => {

        var obj = [];
        x.forEach((e, i) => {
          delete e.raw;
          if (e.machine.isCritical) {
            obj.push(e);
          }
        });
        let critical_obj = {};
        critical_obj.count = "";
        critical_obj.oee = "";
        critical_obj.sle = "";
        critical_obj.me = "";
        critical_obj.rc_count =  "";
        critical_obj.condition =  "";
        critical_obj.downtime = "";
        critical_obj.sku = "";
        obj.forEach(element => {
          critical_obj.rc_count += element.lineName + " Line " + " " + element.shift_reject_count + "\n";
          critical_obj.count += element.lineName + " Line " + " " + element.total_count + "\n";
          critical_obj.sku += element.lineName + " Line " + " " + element.product_id.sku_description + element.product_id.rated_speed  + "\n";
          critical_obj.oee += element.lineName + " Line " + " OEE:- " + element.shift_oee + "%\n";
          critical_obj.sle += element.lineName + " Line " + " SLE:- " + element.shift_sle + "%\n";
          critical_obj.me += element.lineName + " Line " + " ME:- " + element.shift_me + "%\n";
          critical_obj.condition += element.lineName + " Line " + " Status:- " + mode_json[element.condition] + "\n";
          critical_obj.downtime += element.lineName + " Line " + " Downtime:- " +  `
Fault- ${element.total_fault}
Wait- ${element.shift_waiting}
Blocked- ${element.shift_blocked}
Manual Stop- ${element.total_manual_stop}
Idle- ${element.shift_idle}
<b>Total </b>- <b> ${element.total_downtime}</b>
                      ` + "\n";
        });

        var critical = current_api_data.find(
          (machine) => machine.machine.isCritical
        );
        var response = ctx.message.text.toLowerCase();
        ///console.log(id);
        switch (response) {
          case "hello":
          case "hi":
          case "hii":
          case "hiii":
          case "hiiii":
          case "hello sir":
            ctx.telegram.sendMessage(
              id,
              `Hello ${ctx.message.from.first_name}  I'm smartfactory Automated Bot how i can help you or Type help for assistance.`
            );
            break;
          case "thanks":
          case "thank you":
          case "thankyou":
            ctx.telegram.sendMessage(
              id,
              `${ctx.message.from.first_name}  Your welcome,Thank you for using Smart Autobot Service.`
            );
            break;
            case "sku":
            ctx.telegram.sendMessage(
              id,
              critical_obj.sku
            );
            break;
          case "help":
            ctx.telegram.sendMessage(
              id,
              `Type following message for appropriate Help
<b>oee </b>: for current oee
<b>ME </b>: for current ME
<b>SLE </b>: for current SLE
<b>good count </b>: for current good count or GC
<b>reject count </b>: for current reject count or RC
<b>time</b> : for current time
<b>shift</b> : for current shift
<b>condition</b> : for current condition   
<b>downtime</b> : for total downtime with state wise

            `,
              { parse_mode: "HTML" }
            );
            break;
          case "time":
          case "current time":
          case "what is current time":
            ctx.telegram.sendMessage(
              id,
              moment().local().format("MMMM Do YYYY, h:mm:ss a")
            );
            break;
          case "oee":
          case "what is current oee":
          case "current oee":
            ctx.telegram.sendMessage(
              id,
              critical_obj.oee,
              { parse_mode: "HTML" }
            );
            break;
          case "sle":
          case "what is current sle":
          case "current sle":
            ctx.telegram.sendMessage(
              id,
              critical_obj.sle,
              { parse_mode: "HTML" }
            );
            break;

          case "me":
          case "what is current me":
          case "current me":
            ctx.telegram.sendMessage(
              id,
              critical_obj.me,
              { parse_mode: "HTML" }
            );
            break;
          case "shift":
          case "current shift":
            ctx.telegram.sendMessage(
              id,
              `The current shift is <b> ${critical.shift} </b>`,
              { parse_mode: "HTML" }
            );
            break;
          case "good count":
          case "goodcount":
          case "gc":
            ctx.telegram.sendMessage(
              id,
              `The current good count is <b> ${critical_obj.count} </b>`,
              { parse_mode: "HTML" }
            );
            break;
          case "reject count":
          case "rejectcount":
          case "rc":
            ctx.telegram.sendMessage(
              id,
              `The current Reject count is <b> ${critical_obj.rc_count} </b>`,
              { parse_mode: "HTML" }
            );
            break;
          case "count":
          case "production":
            ctx.telegram.sendMessage(
              id,
              `Good Count: <b>${critical_obj.count}</b>
Reject Count: <b>${critical_obj.rc_count}</b>
              `,
              { parse_mode: "HTML" }
            );
            break;
          case "condition":
          case "status":
          case "current condition":
          case "currentcondition":
            ctx.telegram.sendMessage(
              id,
              `The current Condition is <b> ${critical_obj.condition} </b>`,
              { parse_mode: "HTML" }
            );
            break;
          case "downtime":
          case "total downtime":
          case "dt":
            ctx.telegram.sendMessage(
              id,
            critical_obj.downtime,
              { parse_mode: "HTML" }
            );
            break;
          default:
            ctx.telegram.sendMessage(
              id,
              `Sorry ! this feature is not implemented yet.Type following message for appropriate Help
<b>oee </b>: for current oee
<b>ME </b>: for current ME
<b>SLE </b>: for current SLE
<b>good count </b>: for current good count or GC
<b>reject count </b>: for current reject count or RC
<b>time</b> : for current time
<b>shift</b> : for current shift
<b>condition</b> : for current condition   
<b>downtime</b> : for total downtime with state wise `,
              { parse_mode: "HTML" }
            );
        }
      });
    }

  } catch (error) {
    sendTeleMessage("An error occurred while processing your request. Please try again.");
  }
});
function sendTeleMessage(msg) {
  bot.telegram.sendMessage(telegram_group_id, msg, { parse_mode: "HTML" });
}

let mqttQueue = [];
let isMqttProcessing = false; // Flag to track MQTT queue processing
let mqttProcessingLock = false; // Lock to ensure atomic update of isMqttProcessing flag

async function processMqttQueue() {
  // Acquire lock before entering the MQTT processing loop
  if (mqttProcessingLock) {
    return;
  }

  mqttProcessingLock = true; // Set the lock to prevent other invocations
  isMqttProcessing = true; // Set flag to prevent redundant calls

  try {
    while (mqttQueue.length > 0) {
      const queueData = mqttQueue.shift();
      const message = queueData.message;
      var topic = queueData.topic;
      const object_key = Object.keys(message);
      const critical_machine =
        message[
        object_key.find(function (machine) {
          return message[machine].isCritical;
        })
        ];
        // if(!critical_machine){
          
        // }
    
      checkLineFromMqttTopic(
        topic,
        critical_machine.line_name,
        critical_machine.line_name,
        critical_machine.machine_name,
        async (line_data) => {
          for (const element of object_key) {
            //console.log(message[element].isConnected,message[element].line_name,message[element].machine_name);
            if(message[element].isConnected){
              await MqttLineData(line_data._id, element, message[element]);

            }
            
          }
        }
      );
    }
  } catch (err) {
    console.error(err);
    // Handling error here; you may choose to rethrow it or log it accordingly
  } finally {
    isMqttProcessing = false; // Reset flag after processing the MQTT queue
    mqttProcessingLock = false; // Release the lock
  }
}

function handleMqttMessage(obj) {
  mqttQueue.push({ topic: obj.topic, message: obj.message });

  if (!isMqttProcessing) {
    processMqttQueue(); // Start processing only if not already in progress
  }
}

// Assuming client.on("message") is called somewhere
client.on("message", function (topic, message) {
  //console.log(topic, message.toString());
  // message is Buffer
  try {
    // Check if the topic includes the keyword "write"
    if (!topic.includes("write")) {
      message = JSON.parse(message);
      handleMqttMessage({ topic, message });
    }
  } catch (error) {
    console.error("Error parsing MQTT message:", error);
  }
});

//process interva
var interval = 3 * 1000;

setInterval(() => {
  processFunction();
}, interval);

//global write
global.writeTagInPlc = (tag, value, topic) => {
  if (process.env.NODE_ENV == "production") {
    client.publish(
      topic + "/write",
      `[{"id":"${tag}","v":"${value}"}]`,
      {
        qos: 2,
      },
      (err, pkt) => {
        console.log("From Mqtt write", err, pkt);
      }
    );
  }
};
// object filter
function object_filter(obj) {
  var keys = Object.keys(obj);
  var true_filter = keys.filter((key) => {
    return obj[key];
  });
  var result = 0;
  true_filter.forEach((element) => {
    if (Number(element) != 0) {
      result = Number(element);
    }
  });
  return result;
}

//alarm filter
function alarmFilter(obj) {
  var keys = Object.keys(obj);
  var true_filter = keys.filter((key) => {
    return obj[key];
  });
  var result = [];
  true_filter.forEach((element) => {
    if (Number(element) != 0) {
      result.push(Number(element));
    }
  });
  if (result.length > 0) {
    var random = Math.random() * (result.length - 1);
    // console.log(random)
    return result[Math.floor(random)];
  } else {
    return 0;
  }
}
//give stop preference

var arr = [
  "schedule_maintance",
  "pdt",
  "updt",
  "changeover",
  "cip",
  "not_used",
  "fault",
  "manual_stop",
  "blocked",
  "waiting",
  "executing",
  "ready",
];

function preference(array) {
  var return_value;
  var r_data = array.findIndex((data) => {
    return data == true;
  });
  if (r_data == -1) {
    return_value = "ready";
  } else {
    return_value = arr[r_data];
  }
  return return_value;
}

//do request
function doRequest(url) {
  return new Promise(function (resolve, reject) {
    request(url, function (error, res, body) {
      if (!error && res.statusCode == 200) {
        resolve(JSON.parse(body));
      } else {
        reject(error);
      }
    });
  });
}

//pdt
// async function pdt_calculation(line_id, cb) {
//   var now = moment().local();
//   var today = now.hour();
//   var hour = today * 60 + now.minutes();
//   var pdt = await Pdt.findOne({
//     line_id: line_id,
//     pdt_start_time: { $lte: hour },
//     pdt_end_time: { $gte: hour },
//   });
//   if (pdt) {
//     cb({
//       pdt: false,
//       code: pdt.pdt_code,
//     });
//   } else {
//     cb({
//       pdt: false,
//       code: 0,
//     });
//   }
// }
////
async function pdt_calculation(line_id, cb) {
  var time = new Date();
  var now = moment().local();
  var today = now.hour();
  var hour = today * 60 + now.minutes();
  var data = await scheduleMaintanance.findOne({
    line_id: line_id,
    start_time: { $lte: time },
    end_time: { $gte: time },
  });
  if (data) {
    cb({
      schedule_Maintance: true,
      code: data.code,
      id: data._id,
    });
  } else {
    var pdt_data = await Pdt.findOne({
      line_id: line_id,
      pdt_start_time: { $lte: hour },
      pdt_end_time: { $gte: hour },
    });
    if (pdt_data) {
      cb({
        schedule_Maintance: true,
        code: pdt_data.pdt_code,
        id: pdt_data._id,
      });
    } else {
      cb({
        schedule_Maintance: false,
        code: 0,
        id: null,
      });
    }
  }
}

//end PDT

async function endPdtFromCount(line_id, cb) {
  var time = new Date();
  var data = await scheduleMaintanance.findOne({
    line_id: line_id,
    start_time: { $lte: time },
    end_time: { $gte: time },
  });
  if (data) {
    data.end_time = time;
    var save = await data.save();
    cb(save);
  } else {
    cb(null)
  }

}
//check schedule maitanance
async function scheduleMaintance_calculation(line_id, cb) {
  cb({
    schedule_Maintance: false,
    code: 0,
  });
  // var time = new Date();
  // var data = await scheduleMaintanance.findOne({
  //   line_id: line_id,
  //   start_time: { $lte: time },
  //   end_time: { $gte: time },
  // });
  // if (data) {
  //   cb({
  //     schedule_Maintance: true,
  //     code: 1,
  //   });
  // } else {
  //   cb({
  //     schedule_Maintance: false,
  //     code: 0,
  //   });
  // }
}
//function to check value
function checkValueForPlcTime(value) {
  if (value < 10) {
    return `0${value}`;
  } else {
    return value;
  }
}

//function execute on page refresh
async function getExecuteOnFresh() { }

var httpServer = http.createServer(app);

httpServer.listen(80);

async function launchBot() {
  try {
    await bot.launch();
    console.log("Bot started successfully!");
  } catch (error) {
    console.error("Error launching the bot:", error);
    mailer(
      "admin@smartfactoryworx.com",
      email_sender_obj.alert15min.to,
      email_sender_obj.alert15min.cc,
      `Telegram Bot Error in Coke Faizabad`,
      error
    );
  }
}

bot.catch((err, ctx) => {
  mailer(
    "admin@smartfactoryworx.com",
    email_sender_obj.alert15min.to,
    email_sender_obj.alert15min.cc,
    `Telegram Bot Error in Coke Faizabad`,
    `Error encountered for ${ctx.updateType} ,${err}`
  );
  // Handle or log the error here
});

launchBot();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
