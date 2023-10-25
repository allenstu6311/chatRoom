const {
    express,
    app,
    server,
    path,
    bodyParser,
    os,
    fs,
    jwt,
    uuidv4,
    Server,
    join,

} = require('./API.js');


let roleData = JSON.parse(fs.readFileSync("./data/role.json", 'utf-8'));
function configureSocket(server) {

    const io = new Server(server);
    const clients = {};

    io.on('connection', (socket) => {
        // let lastHeartbeat = Date.now();
        // 当客户端连接时，设置心跳定时器


        socket.on("move", (webData) => {
            // 更新前端得移動訊
            roleData = webData.roleData

            fs.writeFileSync("./data/role.json", JSON.stringify(roleData))
            fs.readFile("./data/role.json", (err, data) => {
                data = JSON.parse(data.toString())
                io.emit("update", { data: data, type: 1 })
            })

        })


        socket.on("chat", (webData) => {
            let index = roleData.findIndex(item => item.token == webData.token)
            roleData[index].message = webData.message

            fs.writeFileSync("./data/role.json", JSON.stringify(roleData))
            fs.readFile("./data/role.json", (err, data) => {
                data = JSON.parse(data.toString())
                io.emit("update", { data: data, type: 2, token: webData.token })
            })

        })

        socket.on('heartbeat', (webData) => {

            if (!clients[socket.id]) {
                clients[socket.id] = {
                    lastHeartbeat: 10,
                    token: webData.token,
                    name: webData.name
                };
                io.emit("notify", { message: webData.name + '已上線' })
            }

            clients[socket.id].lastHeartbeat = 10;
            console.log("update", clients[socket.id].name, "==>", clients[socket.id].lastHeartbeat)


            // 更新客户端的最后心跳时间
        });

        let player = null
        const checkHeartbeat = () => {
            if (clients[socket.id] && clients[socket.id].lastHeartbeat >= 1) {
                clients[socket.id].lastHeartbeat -= 1
                console.log("倒數", clients[socket.id].name, "==>", clients[socket.id].lastHeartbeat)
                if (clients[socket.id].lastHeartbeat <= 1) {

                    io.emit("update", { data: roleData, type: 3 }, () => {

                        console.log("update", clients[socket.id].name, "==>", clients[socket.id].lastHeartbeat)

                        if (clients[socket.id].lastHeartbeat == 0) {
                            fs.readFile("./data/role.json", (err, data) => {
                                data = JSON.parse(data.toString())
                                roleData = data
                                player = data.find(item => item.token == clients[socket.id].token)

                                // console.log('clients[socket.id]', clients[socket.id], 'player', player, 'roleData', roleData)
                                if (player) {

                                    console.log(`使用者 ${player.name} 以離線`);
                                    io.emit("notify", { message: player.name + '已離線' })
                                    delete clients[socket.id];
                                    roleData = roleData.filter(item => item.token != player.token)


                                    fs.writeFile("./data/role.json", JSON.stringify(roleData), (err, data) => {
                                        io.emit("update", { data: roleData, type: 1 })
                                    })
                                }
                            })
                        }
                    })
                }
            }

        };

        // 定期检查心跳
        const heartbeatInterval = 2000; // 每 5 秒检查一次心跳
        const heartbeatIntervalId = setInterval(checkHeartbeat, heartbeatInterval);

        socket.on('disconnect', () => {
            // clearInterval(heartbeatIntervalId); 
        });
    })

    // function updateWebData(type, webData) {
    //     let roleData = JSON.parse(fs.readFileSync("./data/role.json", 'utf-8'));
    //     let index = roleData.findIndex(item => item.token == webData.token)

    //     switch (type) {
    //         case 1:
    //             roleData[index] = webData.roleData
    //             fs.writeFileSync("./data/role.json", JSON.stringify(roleData))
    //             fs.readFile("./data/role.json", (err, data) => {
    //                 data = JSON.parse(data.toString())
    //                 io.emit("update", { data:data, type: 1, token: webData.token })
    //             })
    //     }


    // }
}

module.exports = configureSocket;