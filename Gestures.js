
function Gestures(){
	var Gestures = {
		types:['click','select'],
		click: function(e,type){
			if(type === 'pointerdown') {
				e.active = true;
				return [];
			} else if(type === 'pointerup'){
				if(e.curTarget === e.strTarget) return ['click'];
			}
			return [];
		},
		select: function(e,type){
			if(type === 'pointerdown') {
				return ['inBounds'];
			} else if(type === 'pointerup'){
				if(e.curTarget === e.strTarget && e.active) return ['outBounds','select'];
				else return [];
			} else if(type === 'pointermove'){
				if(e.active){
					if(e.curTarget !== e.strTarget){
						e.active = false;
						return ['outBounds'];
					} else return [];
				} else {
					if(e.curTarget === e.strTarget){
						e.active = true;
						return ['inBounds'];
					} else return [];
				}

			} else return [];
		},
	};

	return Gestures;
}

module.exports = Gestures;