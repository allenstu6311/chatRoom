const express = require("express")
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const { join } = require('node:path');
const fs = require('fs')
const os = require('os')
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');//隨機產生密鑰
const path = require('path');
const bodyParser = require('body-parser');
const app = express()
const server = createServer(app);



/**
 * 資料區
 */
let roleData = JSON.parse(fs.readFileSync("./data/role.json", 'utf-8'));

module.exports = {
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
    roleData
}
const configureSocket = require('./WebSocket.js');
configureSocket(server)


const indexPath = path.join(__dirname, '../');
app.use(express.static(indexPath));
// 使用 body-parser 中間件來解析 POST 請求的 JSON 內容
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(indexPath, 'index.html'));
});

app.get('/room.html', (req, res) => {
    res.sendFile(path.join(indexPath, 'room.html'));
});

//登入創建
app.post("/login", (req, res) => {
    let selectKey = uuidv4()//製作token
    let userInfo = {
        name: req.body.userName,
        token: selectKey,
        x: 120,
        y: 75,
        scaleX: req.body.scaleX,
        message: '',
        pic: req.body.picUrl
    }

    fs.readFile("./data/role.json", (err, data) => {
        data = JSON.parse(data.toString())
        data.push(userInfo)
        fs.writeFileSync("./data/role.json", JSON.stringify(data))
        res.json(userInfo)
    })
})

//初始化
app.get("/init", (req, res) => {
    let data = fs.readFileSync("./data/role.json","utf-8")
    let chatData = fs.readFileSync("./data/chatRecord.json","utf-8")

    let responseData = {
        roleData:JSON.parse(data),
        chatData:JSON.parse(chatData)
    }

    res.json(responseData)
})


server.listen(3000, () => {
    console.log(`http://localhost:3000`)
})