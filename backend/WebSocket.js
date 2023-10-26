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

    let rolePath = "./data/role.json"
    let chatPath = "./data/chatRecord.json"

    io.on('connection', (socket) => {

        //移動更新相關
        socket.on("move", (webData) => {
            // 更新前端得移動訊
            roleData = webData.roleData

            fs.writeFileSync("./data/role.json", JSON.stringify(roleData))
            fs.readFile("./data/role.json", (err, data) => {
                data = JSON.parse(data.toString())
                io.emit("update", { data: data, type: 1 })
            })

        })

        //聊天相關
        socket.on("chat", (webData) => {
            //更新使用者的聊天訊息
            let index = roleData.findIndex(item => item.token == webData.token)
            roleData[index].message = webData.message

            //儲存聊天室訊息
            if (webData.name) {
                fileRead(chatPath,(readData)=>{
                    readData.push({
                        name: webData.name,
                        message: webData.message
                    })

                    fileWrite(chatPath,readData,(writeData)=>{
                        io.emit("update", { data: writeData, type: 4 })
                    })
                })

            }
            //寫入使用者的message
            fs.writeFileSync("./data/role.json", JSON.stringify(roleData))
            fileRead(rolePath,(readData)=>{
                io.emit("update", { data: readData, type: 2, token: webData.token })
            })
        })

        //監聽使用者是否在線
        socket.on('heartbeat', (webData) => {
            socket.id = webData.token //使用token避免建立出多餘的用戶
            if (!clients[webData.token]) {
                clients[socket.id] = {
                    lastHeartbeat: 10,
                    token: webData.token,
                    name: webData.name
                };
                io.emit("notify", { message: webData.name + '已上線' })
                setInterval(checkHeartbeat, 2000);// 当客户端连接时，设置心跳定时器
            } else {
                // 更新客户端的最后心跳时间
                clients[socket.id].lastHeartbeat = 10;
            }

        });
        
        //判斷玩家是否離開，如果離開就刪除
        let player = null
        const checkHeartbeat = () => {
            if (clients[socket.id] && clients[socket.id].lastHeartbeat >= 1) {
                clients[socket.id].lastHeartbeat -= 1
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
                            console.log(clients[socket.id].name + '連線中')
                        })
                        .catch(() => {
                            if (clients[socket.id].lastHeartbeat == 0) {
                                fileRead(rolePath,(readData)=>{
                                    if (clients[socket.id]) {
                                        player = readData.find(item => item.token == clients[socket.id].token)
                                    }

                                    if(player){
                                        console.log(`使用者 ${player.name} 以離線`);
                                        io.emit("notify", { message: player.name + '已離線' })
                                        delete clients[socket.id];
                                        roleData = readData.filter(item => item.token != player.token)

                                        fileWrite(rolePath,roleData,()=>{
                                            io.emit("update", { data: roleData, type: 1 })
                                        })
                                    }
                                })                     
                            }
                        })
                }
            }

        };

    })
    //閱讀文件操作
    function fileRead(url, callBack) {
        fs.readFile(url, (err, data) => {
            data = JSON.parse(data.toString())

            if (callBack) {
                callBack(data)
            }
        })
    }
    //寫入文件操作
    function fileWrite(url, paramData, callBack) {
        fs.writeFile(url, JSON.stringify(paramData), (err, data) => {
            if(callBack){
                callBack(paramData)
            }
        })
    }

}

module.exports = configureSocket;