var mongoose = require("mongoose");
var employeeschema = new mongoose.Schema(
  {
    // employeeId:{
    //     type:String,
    //     required:true,
    // },
    empName:{
        type:String,
        required:true,
    },
    empCode:{
        type:String,
        required:true,
    },
    empDegination:{
        type:String,
        required:true,
    },
    dateOfLeaving:{
        type:Date,
       // required:true
    },
  },
  { timestamps: true }
);
var Employee = mongoose.model("Employe", employeeschema);
module.exports.Employee = Employee;
