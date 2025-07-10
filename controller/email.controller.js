var nodemailer = require("nodemailer");
var moment = require("moment");
var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "admin@smartfactoryworx.com",
    pass: "admin@2020",
  },
});

var mailer = (from, to, cc, subject, body) => {
  // Setup email
  var mailOptions = {
    from: from,
    to: to,
    cc: cc,
    //cc: "gopal.bhandari@smartfactoryworx.com,eklavya.lodha@smartfactoryworx.com,anshuman.purohit@smartfactoryworx.com",
    subject: subject,
    html: body,
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function (error, response) {
    if (error) console.log(error);
    else console.log("Message sent: " + response.message);
    // shut down the connection pool, no more messages
    transporter.close();
  });
};

//after shift reminder
var batchEndMail = async function (
  band,
  next_machine_state,
  low_product,
  film_end,
  good_count,
  target,
  subject
) {
  var body = `Condition are <br> 
    <table style='border-collapse: collapse;border: 1px solid black'>
    <tr style='border: 1px solid black'>
     <td  style='border: 1px solid black'><strong>Batch Target Achieved </strong> </td>
     <td  style='border: 1px solid black;padding-left:20px;'>${(
       band * 100
     ).toFixed(2)} %</td>
    </tr>
    <tr style='border: 1px solid black'>
     <td  style='border: 1px solid black'><strong>Good Count </strong> </td>
     <td  style='border: 1px solid black;padding-left:20px;'>${good_count}</td>
    </tr>
    <tr style='border: 1px solid black'>
     <td  style='border: 1px solid black'><strong>Target</strong> </td>
     <td  style='border: 1px solid black;padding-left:20px;'>${target} </td>
    </tr>
    <tr style='border: 1px solid black'>
     <td  style='border: 1px solid black'><strong>T200 Machine Status</strong></td>
     <td  style='border: 1px solid black;padding-left:20px;'>Manual Stop </td>
    </tr>
    <tr style='border: 1px solid black'>
    <td  style='border: 1px solid black'><strong>Blister Machine Status</strong></td>
    <td  style='border: 1px solid black;padding-left:20px;'>Manual Stop </td>
   </tr>
    <tr style='border: 1px solid black'>
     <td  style='border: 1px solid black'><strong>Low Product</strong></td>
     <td  style='border: 1px solid black;padding-left:20px;'>${low_product} </td>
    </tr>
    <tr style='border: 1px solid black'>
    <td  style='border: 1px solid black'><strong>Film End</strong></td>
    <td  style='border: 1px solid black;padding-left:20px;'>${film_end} </td>
   </tr>
    </table>
    `;
  mailer(
    "sfwreports@gmail.com",
    "gopal.bhandari@smartfactoryworx.com",
    subject,
    body
  );
};
// mailer(
//   "sfwreports@gmail.com",
//   "gopal.bhandari@smartfactoryworx.com",
//   "Filler is in Blocked in 60 Min",
//   "Critical Machine is in Blocked for 60 min since" + new Date()
// );
module.exports.batchEndMail = batchEndMail;
module.exports.mailer = mailer;
