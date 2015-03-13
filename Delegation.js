//
function Delegation(gestures){
	var g = gestures();

	var eLog = {
		active:false,
		type:'',
		timing:0,

		strPoint:[],
		curPoint:[],

		strTarget:{},
		curTarget:{},

		watch: function(){
			document.addEventListener('mousemove',_pointermove,true);
			document.addEventListener('touchmove',_pointermove,true);
		},
		//
		unwatch: function(){
			document.removeEventListener('mousemove',_pointermove,true);
			document.removeEventListener('touchmove',_pointermove,true);
		},
	};
	//
	function _pointerdown(e){
		e.stopPropagation();
		if(e.target.nodeName !== 'SELECT')e.preventDefault();
		e.target.focus();
		//if(e.target)
		var nT = _check(e);
		var nP = _coordinates(e);
		var tm = Date.now();
		if(nT !== eLog.type && nP[0] === eLog.curPoint[0] && nP[1] === eLog.curPoint[1] && (tm - eLog.timing) < 650) return;
		eLog.active = true;
		eLog.type = nT;
		eLog.timing = tm;
		eLog.curPoint = nP;
		eLog.strPoint = nP;

		eLog.curTarget = _domCrawl(e.target);
		eLog.strTarget = eLog.curTarget;
		if(eLog.strTarget['data-gesture']) _pass('pointerdown',e);
		eLog.watch();

	}
	function _pointerup(e){
		e.stopPropagation();
		var nT = _check(e);
		var nP = _coordinates(e);
		var tm = Date.now();
		if(nT !== eLog.type && nP[0] === eLog.curPoint[0] && nP[1] === eLog.curPoint[1]) return;
		if(eLog.strTarget['data-gesture']) _pass('pointerup',e);
		eLog.active = false;
		eLog.unwatch();
		eLog.timing = 0;
		eLog.type = '';
		eLog.curPoint = nP;
		eLog.curTarget = _domCrawl(e.target);
	}
	function _pointermove(e){
		e.stopPropagation();
		eLog.curPoint = _coordinates(e);
		var cX = (e.clientX !== undefined) ? e.clientX : e.touches[0].clientX;
		var cY = (e.clientY !== undefined) ? e.clientY : e.touches[0].clientY;
		eLog.curTarget = _domCrawl(document.elementFromPoint(cX,cY));
		if(eLog.strTarget['data-gesture']) _pass('pointermove',e);
	}
	function _pointercancel(e){
		e.stopPropagation();
		eLog.active = false;
		eLog.unwatch();
		eLog.timing = 0;
		eLog.type = '';
	}
	//
	// HELPER FUNCTIONS
	function _coordinates(e){
		if(e.targetTouches){
			if(e.targetTouches[0]) return [e.targetTouches[0].clientX|0,e.targetTouches[0].clientY|0];
			else return [0,0];
		}
		else return [e.clientX|0,e.clientY|0];
	}
	//
	function _check(e){
		if(e.targetTouches) return 'touch';
		else return 'mouse';
	}
	//
	function _domCrawl(target){
		if(target === null) return false;
		if(target['data-gesture']) return target;
		else {
			//Check parent's
			var par = target.parentNode;
			while(par !== null){
				if(par['data-gesture']) return target;
				par = par.parentNode;
			}
		}
		return false;
	}
	//
	function _pass(eventType,e){
		if(eLog.curTarget['data-gesture']){
			if(eLog.curTarget['data-gesture'].type === 'pipe'){
				eLog.curTarget = eLog.curTarget['data-gesture'].pipe();
			}
		}
		if(eLog.strTarget['data-gesture'].type === 'pipe' && eventType === 'pointerdown'){
			var pipedTarget = eLog.strTarget['data-gesture'].pipe();
			eLog.strTarget = pipedTarget;
			eLog.curTarget = pipedTarget;
		}
		var t = eLog.strTarget['data-gesture'].type;
		var a = g[t](eLog,eventType);
		for(var i = 0;i < a.length;i++){
			eLog.strTarget['data-gesture'][a[i]](e);
		}
	}
	//
	function keyEvent(e){
		if(e.target['data-keyEvent']) e.target['data-keyEvent'].press(e);
	};
	//
	//
	document.addEventListener('touchstart',_pointerdown,true);
	document.addEventListener('mousedown',_pointerdown,true);
	document.addEventListener('touchend',_pointerup,true);
	document.addEventListener('mouseup',_pointerup,true);
	document.addEventListener('touchcancel',_pointercancel,true);

	document.addEventListener('keyup', keyEvent);
}

module.exports = Delegation;