const express = require('express');
const cors = require('cors');
const uuid = require('uuid');
const path = require('path');

const app = express();
const port = process.env.PORT || 9001;

let expiredCodes = [];
let chatRooms = [{
    id:"WORKSHOP",
    code:uuid(),
    messages:[{
        date:Date.now(),
        text:"Welcome to the workshop!",
        owner:{
            name:"Daniel"
        }
    }]
}];

setInterval(function expireCodes(){
    expiredCodes = [...expiredCodes,...chatRooms.map(room=>room.code)].slice(-512);
    chatRooms = chatRooms.map(room=>({
        ...room,
        code:uuid()
    }))
},30000);


app.listen(port,()=>console.info(`Listening on port ${port}`));

app.use(cors());
app.use('*',(req,res,next)=>{
    if (Math.random() < 0.10) {
        return res.status(500).send("Internal server error (Just try again.)");
    }
    next();
});

app.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname+'/index.html'));
});


app.get('/getCode',(req,res)=>{
    let id = req.query.id;
    if (!id) {
        return res.status(400).json({message:"Please specify an ID in your query.",error:"NO_ID_SPECIFIED"});
    }

    let room = chatRooms.find(room=>room.id === id);
    if (!room) {
        return res.status(400).json({message:`There is no room with the specified ID: ${id}`});
    }

    res.status(200).json({code:room.code, id:room.id});
});

app.use(['/getMessages','/postMessage'],(req,res,next)=>{
    let code = req.query.code;

    if (expiredCodes.includes(code)) {
        return res.status(400).json({message:"The code you have specified has expired. Please query the getCode API again for a new code"});
    }
    if (!code) {
        return res.status(400).json({message:"You must specify the code for a chat room in your request parameters. Format: http://[url]?code=CODE"});
    }

    let room = chatRooms.find(room=>room.code === code);

    if (!room) {
        return res.status(400).json({message:`No room was found with the specified code: ${code}`});
    }
    res.locals.room = room;
    next();
});

app.get('/getMessages',(req,res)=>{
    let room = res.locals.room;
    let count = Math.min(100, (req.params.count || 10));
    let messages = room.messages.slice(-count);

    res.status(200).send({
        messages,
        id:room.id
    });
});

app.get('/postMessage',(req,res)=>{
    let room = res.locals.room;
    let text = req.query.text;
    let name = req.query.name;
    if (!text) {
        return res.status(400).send("You must specify text content for the message. Format: http://[url]?text='my text'");
    }

    if (!name) {
        return res.status(400).send("You must specify the name of the speaker of the message. Format: http://[url]?name='Dave'");
    }

    room.messages = [
        ...room.messages,
        {
            owner:{
                name
            },
            text,
            date:Date.now()
        }
    ];

    res.status(200).json({status:"OK"});
});