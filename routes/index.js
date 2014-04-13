/* GET home page. */
exports.proto1get = function(req, res){
  res.render('index1', { title: 'CS247 Chatroom' });
};

exports.proto2get = function(req, res){
  res.render('index2', { title: 'CS247 Chatroom' });
};