import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import crypto from "node:crypto";

const app=express();
const httpServer=createServer(app);
const io=new Server(httpServer,{cors:{origin:"*",methods:["GET","POST"]}});
const PORT=process.env.PORT||3000;
const rooms=new Map();
const queue=[];
const MAX_PLAYERS=2;

app.get("/",(req,res)=>res.json({name:"RIVALS WEB FPS matchmaking server",status:"online",players:io.engine.clientsCount,rooms:rooms.size}));
app.get("/health",(req,res)=>res.json({ok:true}));

function cleanName(value){return String(value||"Player").replace(/[<>\u0000-\u001f]/g,"").trim().slice(0,18)||"Player";}
function snapshot(room){return Array.from(room.players.values());}
function leaveRoom(socket){
 const roomId=socket.data.roomId;
 if(!roomId)return;
 const room=rooms.get(roomId);
 socket.data.roomId=null;
 if(!room)return;
 room.players.delete(socket.id);
 socket.to(roomId).emit("player:left",{id:socket.id});
 if(room.players.size===0)rooms.delete(roomId);
 else io.to(roomId).emit("room:state",{players:snapshot(room)});
}
function joinRoom(socket,room){
 socket.join(room.id);
 socket.data.roomId=room.id;
 const player={id:socket.id,name:socket.data.name,x:0,y:2,z:12,yaw:0,pitch:0,hp:100,kills:0,weapon:0};
 room.players.set(socket.id,player);
 socket.emit("match:found",{roomId:room.id,players:snapshot(room),status:room.players.size>=MAX_PLAYERS?"ready":"waiting"});
 socket.to(room.id).emit("player:joined",{player});
 if(room.players.size>=MAX_PLAYERS)io.to(room.id).emit("match:ready",{roomId:room.id,players:snapshot(room)});
}
io.on("connection",socket=>{
 socket.data.name="Player";
 socket.on("queue:join",payload=>{
  if(socket.data.roomId)return;
  socket.data.name=cleanName(payload&&payload.name);
  if(!queue.includes(socket.id))queue.push(socket.id);
  socket.emit("queue:status",{status:"searching",position:queue.indexOf(socket.id)+1});
  while(queue.length>=MAX_PLAYERS){
   const ids=queue.splice(0,MAX_PLAYERS);
   const players=ids.map(id=>io.sockets.sockets.get(id)).filter(Boolean);
   if(players.length<MAX_PLAYERS){players.forEach(p=>queue.push(p.id));continue;}
   const room={id:crypto.randomUUID(),players:new Map()};
   rooms.set(room.id,room);
   players.forEach(p=>joinRoom(p,room));
  }
 });
 socket.on("queue:leave",()=>{
  const i=queue.indexOf(socket.id);if(i>=0)queue.splice(i,1);
  socket.emit("queue:status",{status:"idle"});
 });
 socket.on("player:update",data=>{
  const room=rooms.get(socket.data.roomId);
  const p=room&&room.players.get(socket.id);
  if(!p||!data||typeof data!=="object")return;
  ["x","y","z","yaw","pitch"].forEach(key=>{if(Number.isFinite(data[key]))p[key]=Math.max(-1000,Math.min(1000,data[key]));});
  if(Number.isInteger(data.weapon))p.weapon=Math.max(0,Math.min(2,data.weapon));
  socket.to(room.id).volatile.emit("player:update",{id:socket.id,...p});
 });
 socket.on("player:fire",data=>{
  const room=rooms.get(socket.data.roomId);if(!room)return;
  socket.to(room.id).emit("player:fire",{id:socket.id,weapon:Number.isInteger(data&&data.weapon)?Math.max(0,Math.min(2,data.weapon)):0});
 });
 socket.on("disconnect",()=>{
  const i=queue.indexOf(socket.id);if(i>=0)queue.splice(i,1);
  leaveRoom(socket);
 });
});
httpServer.listen(PORT,"0.0.0.0",()=>console.log("RIVALS server listening on "+PORT));
