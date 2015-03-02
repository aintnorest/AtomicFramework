//REQUIRES
var postal = require("postal.js");
var hmacSHA256 = require("crypto-js/hmac-sha256");
var encBase64 = require("crypto-js/enc-base64");
//VARS
var baseURL = "https://legalyak.com/";
var channel = postal.channel("ServerHandler");
var subs = []; //ARRAY OF POSTAL SUBS TO BE CLEANED UP.
//MODEL
var M = {
	que: [], //ARRAY OF REQUESTS TO THE SERVER.
	pageId: _.uniqueId("pageId"),
	sessionId:"",
	sessionToken:"",
	snonce:"",
	cnonce:"",
	initialized:false,
};
//HANDLERS
var errorHandlers = {
	500: function(d){
		var msg = JSON.parse(d.target.response);
		alert("There was an Internal Server Error. Please refrence \nError Code:\n"+ msg.code +"\nError Message:\n"+ msg.message);
	},
	404: function(){
		alert("Page Not Found");
	}
};

function randomString(length, chars) {
    var result = "";
    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}

function createCorsRequest(method, url) {
	 var xhr = new XMLHttpRequest();
    if("withCredentials" in xhr) xhr.open(method, url, true); /* XHR for Chrome/Firefox/Opera/Safari */
    else if(typeof XDomainRequest !== "undefined"){ /* XDomainRequest for IE */
        xhr = new XDomainRequest();
        xhr.open(method,url);
    } else  xhr = null; /* CORS not supported */
    return xhr;
    //
}

function makeCorsRequest(u,type,promise,data,err,pageId){
	var url = baseURL + u;
	//
	function sendRequest(){
		var xhr = createCorsRequest(type,url);
		if(!xhr) return;
		//HEADERS
		xhr.setRequestHeader('X-Session-Id', M.sessionId);
        xhr.setRequestHeader('X-Session-Token', M.sessionToken);
        //HANDLERS
        xhr.addEventListener("load", function(d){
        	if(d.currentTarget.status >= 200 && d.currentTarget.status < 300){
        		if(typeof d.target.response === "string" && d.target.response != "") fullFillPromise(JSON.parse(d.target.response),d);
        		else fullFillPromise(d,d);
        	} else errorHandlers[d.target.status](d);
        }, false);
        xhr.addEventListener("error", function(d){
        	console.log("error", d);
        }, false);
        xhr.addEventListener("abort", function(d){
        	console.log("abort", d);
        }, false);
        //SEND
    	if(type === "GET") xhr.send();
    	else xhr.send(data);

    	function fullFillPromise(d,fullD){
    		if(pageId === undefined) promise(d,fullD);
    		else if(pageId === M.pageId) promise(d,fullD);
    	};
	}
	sendRequest();
}

function ServerHandler(){
	M.cnonce = randomString(32, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
	var cnStrng = JSON.stringify({cnonce: M.cnonce});
	/* Setup the connection */
	makeCorsRequest("commands/v1/connect", "POST", function(e){
		M.sessionToken = e.session_token;
        M.sessionId = e.session_id;
        M.snonce = e.snonce;
        M.initialized = true;
        channel.publish("Login",true);
        runQue();
        console.log("DID I GET A SNONCE,",e)
	}, cnStrng);

	function getHash(d){
		console.log("Fired getHash")
		var hash = hmacSHA256(d.username, d.password);
		var hash_base64 = encBase64.stringify(hash);
		var nonce_hash = hmacSHA256(hash_base64, M.snonce + M.cnonce);
		var nonce_hash_base64 = encBase64.stringify(nonce_hash);
        var req = { user_name: d.username, password: nonce_hash_base64 };
        var r = JSON.stringify(req);
		return r;
	}
	var D;
	var Ready = false;

	var LoginSub = channel.subscribe("Login", function(d){
		/* Ensure Nonce before Login Attempt */
		if(typeof d === "object") D = d;
		if(d === true) Ready = true;
		if(typeof D === "object" && Ready === true){
			var r = getHash(D);
			var count = 0;
			//
			function pollLogin(){
				channel.publish("get",{
					url: "views/v1/session",
					force: false,
					promise: function(e,ext){
						if(count > 5){
							count = 0;
							channel.publish("post",{
								url:"commands/v1/users/auth",
								data: r,
								force: false,
								promise: function(){ pollLogin(); }
							});
						} else {
							if(e.authenticated) console.log("Loged In",e);
							else {
								if(e.auth_message === ""){
									_.delay(pollLogin,250);
									count++;
								} else  console.log("ATTEMPT TO LOGIN FAILED",e);
							}
						}
					}
				});
			}

			channel.publish("post",{
				url:"commands/v1/users/auth",
				data: r,
				force: false,
				promise: function(d){
					console.log("Response from server",d);
					_.delay(pollLogin,3000);
				}
			});
		}
	});
}
//
function fireRequest(data,type){
	console.log("Type: ",type," Url: ",data.url);
	makeCorsRequest(data.url, type, data.promise, data.data, data.err, data.pageId);
}
//
function queRequest(data,type){
	if(M.initialized) fireRequest(data,type);
	else M.que.push({d:data,t:type});
}
//
function runQue(){
	console.log("RUN THE QUE",M.que);
	for(var i = 0; i < M.que.length;i++){
		fireRequest(M.que[i].d, M.que[i].t);
	}
}
//
/*
	serverRequest format:
	{
		url: 		[""] url for request
		promise: 	[=>] gets called on success
		err: 		[=>] gets called on error
		data:  		[{}] data that gets sent on a post
		force: 		[TF] if true it will fire immediatly, if false it will be put on a que if there is one but isn't subject to page clear, if its left undefined it will go on a que if it needs to but is subject to page clear
	}
 */
//
function requestHandler(data, type){
	console.log("GETTING THE REQEST")
	data.type = type;
	if(data.force === undefined){
		console.log("FORCE UNDEFINED");
		if(!data.page) data.page = M.pageId;
		queRequest(data, type);
	} else if(data.force === true) {
		console.log("FORCE TRUE");
		fireRequest(data, type);
	} else if(data.force === false) {
		console.log("FORCE FALSE");
		queRequest(data, type);
	}
}
//
/* LISTENERS */
subs.push( channel.subscribe("get", function(d){ requestHandler(d, "GET"); } ) );
subs.push( channel.subscribe("post", function(d){ requestHandler(d, "POST"); } ) );
subs.push( channel.subscribe("clear", function(){ M.que = []; M.queId = _.uniqueId("queId"); } ) );
subs.push( channel.subscribe("halt", function(){ M.initialized = false; } ) );
subs.push( channel.subscribe("resume", function(){ M.initialized = true; } ) );
//
module.exports = ServerHandler;
//