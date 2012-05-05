(function() {
  var amqp, app, express, io, querystring, redis, services, socket_io, util;

  express = require('express');

  socket_io = require('socket.io');

  querystring = require('querystring');

  util = require('util');

  amqp = require('./services/amqp/main');

  redis = require('./services/redis/main');

  app = module.exports = express.createServer();

  process.on('uncaughtException', function(err) {
    return console.log("Caught exception: " + err.message + "\n" + err.stack);
  });

  app.configure(function() {
    app.set('views', __dirname + '/../views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    return app.use(express.static(__dirname + '/../public'));
  });

  app.configure('development', function() {
    return app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
    }));
  });

  app.configure('production', function() {
    return app.use(express.errorHandler());
  });

  services = {
    amqp: {
      name: 'AMQP',
      module: amqp
    },
    redis: {
      name: 'redis',
      module: redis
    }
  };

  app.get('/', function(req, res) {
    return res.render('index', {
      title: 'Qurl',
      services: services,
      service: '-'
    });
  });

  app.get('/:service/publisher', function(req, res) {
    var service;
    service = req.params.service;
    return res.render("s/" + service + "/publisher", {
      title: "Qurl - " + services[service].name + " - Publisher",
      services: services,
      service: service
    });
  });

  app.get('/:service/subscriber', function(req, res) {
    var service;
    service = req.params.service;
    return res.render("s/" + service + "/subscriber", {
      title: "Qurl - " + services[service].name + " - Subscriber",
      services: services,
      service: service
    });
  });

  io = socket_io.listen(app);

  io.sockets.on('connection', function(socket) {
    var endpoint;
    endpoint = null;
    socket.on('configure', function(message) {
      endpoint = new services[message.service].module[message.endpoint]();
      endpoint.configure(message.configuration);
      return endpoint.connect(socket);
    });
    socket.on('message', function(message) {
      return endpoint.publish(message.data);
    });
    return socket.on('disconnect', function(message) {
      return endpoint.disconnect();
    });
  });

  app.listen(3000);

  console.log("Express server listening on port %d", app.address().port);

}).call(this);