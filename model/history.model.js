var mongoose = require("mongoose");
var moment = require("moment");
var {getShiftDatewiseCount} = require("./project.model")

var histroySchema = new mongoose.Schema({
  shift: {
    type: String,
  },
  date: {
    type: Date,
  },
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
  time_wise: [
    {
      start_timestamp: {
        type: Date,
      },
      end_timestamp: {
        type: Date,
      },
      batch_name: {
        type: String,
      },
      vendor_name: {
        type: String,
      },
      fgex: {},
      data: [
        {
          total_energy: {
            type: Number,
            default: 0,
          },
          machine_name: {
            type: String,
          },
          operator_name: {
            type: String,
          },
          goodcount: {
            type: Number,
          },
          manual_casecount: 
          { 
            type: Number,
          }, 
          reject_count: {
            type: Number,
          },
          cycle_count: {
            type: Number,
          },
          pdt: {
            count: {
              type: Number,
            },
            duration: {
              type: Number,
            },
          },
          updt: {
            count: {
              type: Number,
            },
            duration: {
              type: Number,
            },
          },
          cip: {
            count: {
              type: Number,
            },
            duration: {
              type: Number,
            },
          },
          changeover: {
            count: {
              type: Number,
            },
            duration: {
              type: Number,
            },
          },
          blocked: {
            count: {
              type: Number,
            },
            duration: {
              type: Number,
            },
          },
          waiting: {
            count: {
              type: Number,
            },
            duration: {
              type: Number,
            },
          },
          executing: {
            count: {
              type: Number,
            },
            duration: {
              type: Number,
            },
          },
          ready: {
            count: {
              type: Number,
            },
            duration: {
              type: Number,
            },
          },
          major_fault: {
            count: {
              type: Number,
            },
            duration: {
              type: Number,
            },
          },
          minor_fault: {
            count: {
              type: Number,
            },
            duration: {
              type: Number,
            },
          },
          major_manual_stop: {
            count: {
              type: Number,
            },
            duration: {
              type: Number,
            },
          },
          minor_manual_stop: {
            count: {
              type: Number,
            },
            duration: {
              type: Number,
            },
          },
        },
      ],
    },
  ],
});
histroySchema.index({ shift: 1, date: -1, line_id: 1 });
var History = mongoose.model("history", histroySchema);
var addHistory = async (
  line_id,
  shift,
  date,
  start_timestamp,
  end_timestamp,
  batch_name,
  vendor_name,
  fgex,
  data,
  cb
) => {
  var history = await History.findOne({
    line_id: line_id,
    shift: shift,
    date: date,
  });
  if (!history) {
    var new_history = new History({
      line_id: line_id,
      shift: shift,
      date: date,
      time_wise: [
        {
          start_timestamp: start_timestamp,
          end_timestamp: end_timestamp,
          batch_name: batch_name,
          vendor_name: vendor_name,
          fgex: fgex,
          data: data,
        },
      ],
    });
    var save = await new_history.save();
    cb(save);
  } else {
    history.time_wise.push({
      start_timestamp: start_timestamp,
      end_timestamp: end_timestamp,
      batch_name: batch_name,
      vendor_name: vendor_name,
      fgex: fgex,
      data: data,
    });
    var save = await history.save();
    cb(save);
  }
};
// businessLogic.js
async function adjustMatchCount(line_id, start_date, end_date ) {

  if (!line_id) {
    return res.status(400).json({ error: "line_id, start_date, and end_date are required." });
  }


  if(!start_date || !end_date){
    start_date = moment().local().subtract(4, "days").format("YYYY-MM-DD");
    end_date = moment().local().format("YYYY-MM-DD");
  }
  console.log(start_date,end_date);
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);

  if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
    return res.status(400).json({ error: "Invalid date range." });
  }

  const dateRange = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dateRange.push(new Date(d));
  }

  const fixReport = [];

  for (const date of dateRange) {
    const shiftData = await getShiftDatewiseCount(line_id, date);

    if (!shiftData || shiftData.length === 0) {
      console.warn(`No shift data found for the line: ${line_id} on date: ${date.toISOString()}`);
      continue;
    }

    for (const shift of shiftData) {
      const shiftName = shift._id;
      const machines = shift.raw;

      const history = await History.findOne({ line_id, date, shift: shiftName });

      if (!history || !history.time_wise) {
        console.warn(`No history data found for shift: ${shiftName} on date: ${date.toISOString()}`);
        continue;
      }

      const timeWiseData = [...history.time_wise];

      for (const machine of machines) {
        const machineName = machine._id.machine;
        const shiftCounts = {
          goodcount: machine.good_count,
          reject_count: machine.reject_count,
          cycle_count: machine.cycle_count,
        };

        const hourlySum = timeWiseData.reduce(
          (acc, entry) => {
            const machineData = entry.data.find(
              (data) => data.machine_name === machineName
            );
            if (machineData) {
              acc.goodcount += machineData.goodcount || 0;
              acc.reject_count += machineData.reject_count || 0;
              acc.cycle_count += machineData.cycle_count || 0;
            }
            return acc;
          },
          { goodcount: 0, reject_count: 0, cycle_count: 0 }
        );

        const machineFix = { machine: machineName, counts: [] };

        for (const key of ["goodcount", "reject_count", "cycle_count"]) {
          const difference = shiftCounts[key] - hourlySum[key];
          machineFix.counts.push({
            field: key,
            shift_count: shiftCounts[key],
            hourly_sum: hourlySum[key],
            difference,
          });

          if (difference !== 0) {
            let remainingDiff = difference;

            for (let i = timeWiseData.length - 1; i >= 0 && remainingDiff !== 0; i--) {
              const timeEntry = timeWiseData[i];

              const machineIndex = timeEntry.data.findIndex(
                (data) => data.machine_name === machineName
              );

              if (machineIndex === -1) continue;

              const machineData = timeEntry.data[machineIndex];
              const currentValue = machineData[key.replace("_count", "")] || 0;
              const adjustedValue =
                remainingDiff > 0
                  ? Math.min(currentValue + remainingDiff, shiftCounts[key])
                  : Math.max(currentValue + remainingDiff, 0);

              remainingDiff -= adjustedValue - currentValue;

              timeEntry.data[machineIndex][key.replace("_count", "")] = adjustedValue;

              timeWiseData[i] = timeEntry;

              if (remainingDiff === 0) break;
            }
          }
        }

        fixReport.push(machineFix);
      }

      const updateResult = await History.updateOne(
        { line_id, date, shift: shiftName },
        { $set: { time_wise: timeWiseData } }
      );

    }
  }  
  return {
    message: "Data adjusted successfully for the date range.",
    report: fixReport,
  };
}

module.exports = { adjustMatchCount ,History , addHistory};

