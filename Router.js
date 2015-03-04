//REQUIRES
var postal = require("postal.js");
//PAGE GLOBALS
var routeMap = {};
var channel = postal.channel("Router");
var initialized = false;
var defaultOtherwise;
//Open Route
function openRoute(url,lvl,q){
	if(routeMap[lvl][url]){
		if(routeMap[lvl][url].check()){
			routeMap[lvl][url].then(q);
			channel.publish("page."+lvl+".ready");
			console.log("LOADING PAGE: ",url," : ",lvl," | DATA:",q);
		} else if(typeof routeMap[lvl][url].otherwise === "function"){
		 	routeMap[lvl][url].otherwise();
		} else {
			defaultOtherwise();
		}
	}
	else defaultOtherwise();
}
//Handler
function Handler(level){
	var lvl = (level) ? level : 0;
	if(!routeMap[lvl]) routeMap[lvl] = {};
	if(routeMap[lvl].changeSub){
	 	routeMap[lvl].changeSub.unsubscribe();
	 	delete routeMap[lvl];
	 	routeMap[lvl] = {};
	}
	routeMap[lvl].changeSub = channel.subscribe("page." + lvl + ".change",function(data){
		openRoute(data.url,lvl,data.query);
	});
	
	return {
		/*
		addRoute(url,route)
		url		[""] The portion of the url thats triggered.
		route 	[{}] The routing infomation
		{
		[=>]    check: must return true or false. if it returns true it allows the page change
		[=>]     then: a callback for what to fire if it works
		[=>]otherwise: where to redirect if not set it will default to the Router Default which hopefully was set.
		[=>]  cleanup: a function to be called when you want it cleaned up.
		}
		 */
		addRoute: function(url,route){
			if(typeof route.check !== "function") console.log("Check for Route " +url+ " is not a function!!!");
			if(typeof route.then !== "function") console.log("Then for Route " +url+ " is not a function!!!");
			routeMap[lvl][url] = {check:route.check, then:route.then, otherwise:route.otherwise, cleanup:route.cleanup};
			return { removeRoute: function(){ delete routeMap[lvl][url]; } };
		}
	}
}
//
function Init(reRoute){
	defaultOtherwise = (reRoute) ? reRoute : function(){console.log("Setup a Default Otherwise Route")};
	//
	function listenForReady(u,i,pu,q){
		var sub = channel.subscribe("page." + i + ".ready", function(){
			console.log("New Page finished moving to next level",i);
			sub.unsubscribe();
			requestChange(u,i + 1,pu,q);
		});
	}
	// Send a cleanup then send a change then once a ready is received fire next level
	function requestChange(u, i, pu, q){
		if(!u[i]) return;
		if(pu[i]){
			console.log(routeMap,pu,i)
		 	if(routeMap[i][pu[i]]){
		 	 	if(typeof routeMap[i][pu[i]].cleanup === "function")routeMap[i][pu[i]].cleanup();
		 	}
		}
		console.log("THIS IS WHERE IM PUSHING IT THROUGH Q I: ",q,i);
		setTimeout(function(){
			channel.publish("page." + i + ".change",{url:u[i], query:q[i]});
		},1);
		listenForReady(u,i,pu,q);
	}
	//URL ITERATION
	function iterateURL(url, pu){
		var u = url.split("/");
		var q = [];
		var len = u.length;
		var divergencePoint;
		//
		for(var i=0;i < len;i++){
			var splitVersion = u[i].split("?");
			u[i] = splitVersion[0];
			q.push( (splitVersion[1]) ? splitVersion[1] : undefined );
		}
		//
		for(var i = 0; i < len; i++){

			if(pu[i] !== u[i]){
				divergencePoint = i;
				break;
			}
		}
		console.log("u: ",u," p: ",pu);
		if(divergencePoint !== undefined) requestChange(u,divergencePoint,pu,q);
		if(divergencePoint === undefined) requestChange(u,0,pu,q);
		return u;
	}
	//
	if(initialized) return;
	else {
		var prvUrl = [];
		//
		window.onpopstate = function(){
			prvUrl = iterateURL(document.location.hash,prvUrl);
		};
		
		var su = channel.subscribe("setUrl", function(url) {
			history.pushState({}, "", url);
			prvUrl = iterateURL(url,prvUrl);
		});
		/*
		var sou = channel.subscribe("setOldUrl", function(url){
			prvUrl = (url) ? url : [];
		});
		*/
		initialized = true;
	}
}
//
//
module.exports.Handler = Handler;
module.exports.Init = Init;
//