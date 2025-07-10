var request = require('request');

var getApi = (url,header,cb)=>{
    console.log(url,header,cb)
    request.get(
        {
          url: url,
          headers: header,
        },function (error, res, body) {
        if (!error && res.statusCode == 200) {
            console.log(res)
          cb(JSON.parse(body));
        } else {
            console.log(error)
          cb(error);
        }
      });
}

module.exports = {
    getApi
}