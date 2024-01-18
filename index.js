
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

//numCPUs = 1;

if(cluster.isMaster){
    for(var i=0;i<numCPUs;i++){
        cluster.fork();
    }
    cluster.on('death',function(worker){
        console.log('worker'+worker.pid+'died');
        cluster.fork()
    });
}
else{
    const uuid = require('uuid');

    //读取文件夹conf/server.json
    var fs = require('fs');
    var path = require('path');
    var filePath = path.join(__dirname, 'conf/server.json');
    var fileContent = fs.readFileSync(filePath, 'utf-8');
    var serverConfig = JSON.parse(fileContent);
    const serverPort = serverConfig.port;
    const NqueueHost = serverConfig.NqueueHost;
    const NmapHost = serverConfig.NmapHost;

    //express例子
    var express = require('express');
    var app = express();

    app.get('/', function (req, res) {
        res.send('Hello World!');
    });

    app.post('/captcha/create/task', function (req, res) {
        //获取body参数
        req.rawBody = '';
        req.on('data', function(chunk) { 
            req.rawBody += chunk;
        });
        req.on('end', async function() {
            if(req.rawBody.length != 0){
                var request_id = uuid.v4();
                //发送http请求 post http://{{NqueueHost}}/queue/push?type=yzm_api
                var request = require('request');
                var body_json = {
                    content:btoa(req.rawBody),
                    request_id:request_id
                }
                request.post({
                    url: 'http://'+NqueueHost+'/queue/push?type=yzm_api',
                    body: JSON.stringify(body_json)
                }, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                        res.status(200).send({
                            request_id:request_id,
                            status_code:0
                        });
                    }
                    else{
                        res.status(400).send('');
                    }
                });

            }else{
                res.status(400).send('body error');
            }
        });
    });

    app.get('/captcha/get/result', function (req, res) {
        //获取query参数
        var request_id = req.query.request_id;
        if(request_id){
            //发送http请求 get http://{{NmapHost}}/map/get?key={{request_id}}
            var request = require('request');
            request.get({
                url: 'http://'+NmapHost+'/map/get?type=yzm_api&key='+request_id,
            }, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    res.status(200).send(body);
                }
                else{
                    res.status(400).send('');
                }
            });
        }
        else{
            res.status(400).send('request_id error');
        }
    });

    app.listen(serverPort, function () {
        console.log('Example app listening on port '+serverPort+'!');
    });
}