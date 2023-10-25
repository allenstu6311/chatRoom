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

            fs.readFile("./data/chatRecord.json", (err, data) => {
                console.log(data)
                data = JSON.parse(data.toString())
                data.push({
                    name: webData.name,
                    message: webData.message
                })

                fs.writeFileSync("./data/chatRecord.json", JSON.stringify(data))

                io.emit("update", { data: data, type: 4 })

               
            })

            fs.writeFileSync("./data/role.json", JSON.stringify(roleData))
            fs.readFile("./data/role.json", (err, data) => {
                data = JSON.parse(data.toString())
                io.emit("update", { data: data, type: 2, token: webData.token })
            })

        })

        socket.on('heartbeat', (webData) => {
            socket.id = webData.token //使用token避免建立出多餘的用戶
            if (!clients[webData.token]) {
                clients[socket.id] = {
                    lastHeartbeat: 10,
                    token: webData.token,
                    name: webData.name
                };
                console.log("創建使用者", clients[socket.id])
                io.emit("notify", { message: webData.name + '已上線' })
                setInterval(checkHeartbeat, 2000);
            } else {
                // 更新客户端的最后心跳时间
                clients[socket.id].lastHeartbeat = 10;
                console.log("回復心律", clients[socket.id].name, "==>", clients[socket.id].lastHeartbeat)
            }

        });

        let player = null
        const checkHeartbeat = () => {
            if (clients[socket.id] && clients[socket.id].lastHeartbeat >= 1) {
                clients[socket.id].lastHeartbeat -= 1
                console.log("倒數", clients[socket.id].name, "==>", clients[socket.id].lastHeartbeat)
                if (clients[socket.id].lastHeartbeat <= 1) {

                    new Promise((resovle, rejct) => {
                        io.emit("update", { data: roleData, type: 3 }, () => {

                            if (clients[socket.id].lastHeartbeat > 0) {
                                resovle()
                            } else {
                                rejct()
                            }
                        })
                    })
                        .then(() => {
                            console.log(clients[socket.id].name + '重新連接')
                        })
                        .catch(() => {
                            console.log('catch')
                            if (clients[socket.id].lastHeartbeat == 0) {
                                fs.readFile("./data/role.json", (err, data) => {
                                    data = JSON.parse(data.toString())
                                    console.log("拿取資料", data)
                                    console.log("clients", clients)
                                    console.log('被刪除', clients[socket.id], "socket id==>", socket.id)
                                    roleData = data

                                    if (clients[socket.id]) {
                                        player = data.find(item => item.token == clients[socket.id].token)
                                    }
                                    // console.log('clients[socket.id]', clients[socket.id], 'player', player, 'roleData', roleData)
                                    if (player) {

                                        console.log(`使用者 ${player.name} 以離線`);
                                        io.emit("notify", { message: player.name + '已離線' })
                                        delete clients[socket.id];
                                        roleData = roleData.filter(item => item.token != player.token)
                                        console.log("剩餘人數", roleData)


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



        // socket.on('disconnect', () => {
        //     // clearInterval(heartbeatIntervalId);
        //     new Promise((resovle, rejct) => {

        //         io.emit("update", { data: roleData, type: 3 }, () => {
        //             setTimeout(() => {
        //                 console.log("call", clients[socket.id])
        //                 if (clients[socket.id] && clients[socket.id].lastHeartbeat != 10) {
        //                     rejct()
        //                 } else {
        //                     resovle()
        //                 }
        //             }, 2000)

        //         })
        //     })
        //         .then(() => {
        //             console.log(clients[socket.id].name + '重新連接')
        //         })
        //         .catch(() => {
        //             if (clients[socket.id].lastHeartbeat == 0) {
        //                 fs.readFile("./data/role.json", (err, data) => {
        //                     data = JSON.parse(data.toString())
        //                     console.log("拿取資料", data)
        //                     console.log("clients", clients)
        //                     console.log('被刪除', clients[socket.id], "socket id==>", socket.id)
        //                     roleData = data

        //                     if (clients[socket.id]) {
        //                         player = data.find(item => item.token == clients[socket.id].token)
        //                     }
        //                     // console.log('clients[socket.id]', clients[socket.id], 'player', player, 'roleData', roleData)
        //                     if (player) {

        //                         console.log(`使用者 ${player.name} 以離線`);
        //                         io.emit("notify", { message: player.name + '已離線' })
        //                         delete clients[socket.id];
        //                         roleData = roleData.filter(item => item.token != player.token)
        //                         console.log("剩餘人數", roleData)


        //                         fs.writeFile("./data/role.json", JSON.stringify(roleData), (err, data) => {
        //                             io.emit("update", { data: roleData, type: 1 })
        //                         })
        //                     }
        //                 })
        //             }
        //         })
        // });
    })
    // console.log(checkHeartbeat)
    // // 定期检查心跳
    // if(checkHeartbeat){
    //     const heartbeatInterval = 2000; // 每 5 秒检查一次心跳
    //     var heartbeatIntervalId = setInterval(checkHeartbeat, heartbeatInterval);
    // }


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