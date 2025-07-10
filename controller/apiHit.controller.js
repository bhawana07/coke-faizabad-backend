var request = require('request');

var getApi = (url,header,cb)=>{
    request.get(
        {
          url: url,
          headers: header,
        },function (error, res, body) {
        if (!error && res.statusCode == 200) {
          cb(JSON.parse(body));
        } else {
          cb(error);
        }
      });
}

module.exports = {
    getApi
}