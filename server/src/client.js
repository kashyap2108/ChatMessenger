const webSocket  = require('ws');

const ws = new webSocket('ws://localhost:3000');

ws.on('open',()=>{
	console.log('Successfully connected!!');
	ws.send('Hello server my name is laslf');
	ws.on('message',(message)=>{
		console.log(message);
	})
})