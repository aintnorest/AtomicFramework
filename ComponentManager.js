//REQUIRES
var postal = require("postal.js");
/* COMPONENT MANAGER
	model[{}]: The components Model.
	size [[]]: Array with the size. If you return undefined you will get the window size.
	returns -> ComponentManager Object.
*/
function ComponentManager(options){
	if(typeof options !== "object") options = {};
	this.base = (options.baseLvl) ? true : false;
	this.consolidation = (options.consolidation) ? true: false;
	this.model = {};
	this.view = {
		size:[undefined,undefined],
		layouts:{
			/*
			NameOfLayout:{
				init:function(sizing){
	
				},
				resize:function(sizing){
	
				},
			}
			 */
		},
	};
	this.subComponents = {};
	this.activeSubComponents = [];
	//{0:[NameOfLayout,height1orwidth0], 600:[LoginRC,0], components:[names,of,component,keys,toBe,cleanedup]}
	this.activeLayout = {};
	this.subscriptions = [];
	this.cleanupQueue = [];
	//LISTEN FOR RESIZE
	if(options.resize){
		this.subscriptions.push(postal.subscribe({
			channel : "ComponentManager",
			topic   : "resizeState",
			callback: function(d){
				console.log(this)
				if(this.view.layouts[this.activeLayout[0][0]].resize) this.view.layouts[this.activeLayout[0][0]].resize(grabSize.call(this));
			}.bind(this)
		}));
	}
	//
	return this;
}
//
function Resize(){
	console.log("resize",this)
}
//
function Consolidate(newLayout,oldLayout){
	if(_.isEmpty(oldLayout)) return;
	if(!oldLayout.components || !newLayout.components) return;
	var olcLen = oldLayout.components.length;
	var dif = _.difference(oldLayout.components,newLayout.components);
	var dLen = dif.length;
	for(var i = 0; i < dLen;i++){
		console.log("CLEANING UP: ",dif[i]);
		if(this.subComponents[dif[i]]) {
			if(this.subComponents[dif[i]].cleanup)this.subComponents[dif[i]].cleanup();
			delete this.subComponents[dif[i]];
		}
	}
}
//
function grabSize(){
	return [(this.view.size[0] === undefined) ? window.innerWidth : this.view.size[0],(this.view.size[1] === undefined) ? window.innerHeight : this.view.size[1]];
}
//
ComponentManager.prototype.initialize = function initialize(layout){
	if(this.consolidation)Consolidate.call(this,layout,this.activeLayout);
	this.activeLayout = layout;
	//
	var s = grabSize.call(this);
	//
	_.forOwnRight(this.activeLayout,function(value,key){
		if(key !== "components"){
			key = (typeof key === 'number')? Number(key) : key;
			if(s[value[1]] >= key){
				this.view.layouts[value[0]].init(s);
			}
		}
	}.bind(this));

}
//ADD LAYOUT AND INITSTATE ARE VERY SIMILAR...LETS MERGE
/*
add layout nameOfLayout,[renderers],callback
init state, [[nameOfLayout,0,600],[nameofLayout,0,1200],[nameoflayout,0,undefined]]
VS. Viewsheet
viewsheet has  a initialize view that fires at zero timing so that things start there then the page transitions
into one of the sizes that follows. it will asume you are starting at zero the name of the key is what tells it how far
to take that layout version too.

What it needs to do:
Handle Size,placement,movement,hiding,showing,
combo of sections and sizing.

[[subcomponentKey,subcomponentKey], width or height, size] ||

subComponents work like hide show layout forms should have a show hide on them...
if the sub components are the same they stick around if they aren't it goes away / gets cleaned up.

 */
//
ComponentManager.prototype.toBeCleanedUp = function toBeCleanedUp(f){
	if(f.unsubscribe) this.subscriptions.push(f);
	else this.cleanupQueue.push(f);
};
//
ComponentManager.prototype.cleanup = function cleanup(){
	var cLen = this.cleanupQueue.length;
	var sLen = this.subscriptions.length;
	for(var i = 0; i < cLen; i++){
		if(typeof this.cleanupQueue[i] === "function") this.cleanupQueue[i]();
	}
	for(var i = 0; i < sLen; i++){
		if(typeof this.subscriptions[i].unsubscribe === "function") this.subscriptions[i].unsubscribe();
	}
	_.forOwn(this.subComponents, function(value, key){
		if(typeof this.subComponents[key].cleanup === "function") this.subComponents[key].cleanup();
	}.bind(this));
}
//

//RESIZE LISTENER

function _resizeListener(){
	var _publishResize = _.debounce(function(){
		postal.publish({
			channel: "ComponentManager",
			topic  : "resizeState",
			data   : [document.documentElement.clientWidth,document.documentElement.clientHeight]
		});
	},1250,{'trailing':true,'leading':false});
	//
	window.addEventListener('resize',_publishResize);
}
_resizeListener();

module.exports = ComponentManager;
//