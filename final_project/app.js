nx.onload = function() {
	/* styles */
	nx.colorize("#00CCFF"); // sets accent (default)
	nx.colorize("border", "#222222");
	nx.colorize("fill", "#222222");

	/* Config varialbe. */
	var WIDTH = 1200/4;
	var HEIGHT = 860/4;
	var RIGHT_SPAN = 800/4;

	/* Preview element. */
	var canvas = document.getElementById("preview");

	/* 
	this code can be useful for logging any interface events
	*/
	for (var key in nx.widgets) {
		with (nx.widgets[key]) {
			on('*', function(data) {
				// code that will be executed
				if(canvasID == "Envelope") {
					synth.setParameter(canvasID, data.points);
					synth.noteOn();
				}

				else if(["dialFrequency", "dialQ", "dialGain"].indexOf(canvasID) != -1)
					updateFilter();

				else if(["dialDelay", "dialFeedback"].indexOf(canvasID) != -1)
					updateDelay();

				else if(["dialReverb"].indexOf(canvasID) != -1)
					updateReverb();
			})
		}
	} 

	// select a file 
	var control = document.getElementById("files");
	control.addEventListener("change", fileChanged, false);
	
	// select a filter
	var filterSelect = document.getElementById("switch-delay");
	filterSelect.addEventListener("change", updateDelay, false);


	// select a room impulse response 
	var reverbSelect = document.getElementById("dropDown-reverb");
	for (var i in reverb_types) {
		var option = document.createElement("option");
		option.text = reverb_types[i];
		option.value = reverb_types[i];
		reverbSelect.appendChild(option);
	}
	reverbSelect.addEventListener("change", changeReverbType, false);


	var ctx = canvas.getContext("2d");
	ctx.fillStyle = "#FF0000";
	ctx.strokeStyle = "#00FF00";
	ctx.lineWidth = 5;

	var ctx_right = canvas.getContext("2d");
	ctx_right.fillStyle = "#FF0000";
	ctx_right.strokeStyle = "#00FF00";
	ctx_right.lineWidth = 5;

	var osc = Oscillator();

	console.log("Inintializing");
	var camMotion = CamMotion.Engine({
		canvasBlended: canvas,
		width: WIDTH,
		height: HEIGHT
	});
	console.log(camMotion);
	camMotion.on("error", function (e) {
		console.log("error", e);
	});

	console.log(camMotion);
	camMotion.on("streamInit", function () {
		osc.connect();
	});

	camMotion.on("frame", function () {
		/* Detect hand gesture of left hand(right side of screen). */
		var point = camMotion.getMovementPoint(true,RIGHT_SPAN,0,400/4,HEIGHT);

		/* Detect hand gesture of right hand(left side of screen). */
		var point2 = camMotion.getMovementPoint(true,0,0,600/4,HEIGHT);

		// draw a circle at right side. 
		ctx.beginPath();
		ctx.arc(point.x + RIGHT_SPAN, point.y, 20, 0, Math.PI*2, true);
		ctx.closePath();
		if (camMotion.getAverageMovement(point.x+RIGHT_SPAN-point.r/2, point.y-point.r/2, point.r, point.r)>4) {
			ctx.fill();

			/* Set frequency according to position of hand. */
			osc.setFrequency(440 + point.x*4);
		} 

		// draw a circle at left side. 
		ctx_right.beginPath();
		ctx_right.arc(point2.x, point2.y, 20, 0, Math.PI*2, true);
		ctx_right.closePath();

		/* If movement is bigger than threshold. */
		if (camMotion.getAverageMovement(point2.x-point2.r/2, point2.y-point2.r/2, point2.r, point2.r)>4) {
			ctx_right.fill();

			/* Set volume according to position of hand. */
			osc.setVolume(HEIGHT - point2.y);
		} 
	});

	/* Start detecting. */
	camMotion.start();	
};

function handleFiles(inFile) {
	if (inFile) {
	    var reader = new FileReader();
	    reader.readAsText(inFile[0], "UTF-8");
	    reader.onload = function (evt) {
	    	console.log(evt.target.result);
	    	setInitialParam(JSON.parse(evt.target.result));
	    }
	    reader.onerror = function (evt) {
	        console.log("error reading file");
	    }
	}
}

function setupDownloadLink(link)  {
    link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(getCurrentParam()));
    // link.click();
	console.log(JSON.stringify(getCurrentParam()));
    // document.getElementById('download').src = ;
  };

function fileChanged(e){
	var file = e.target.files[0];
	var fileReader = new FileReader();
	fileReader.onload = fileLoaded;
	fileReader.readAsArrayBuffer(file);
}

function fileLoaded(e){
    context.decodeAudioData(e.target.result, function(buffer) {
    	myAudioBuffer = buffer;
    });
}

function changeFilterType(e){
	var filterName = e.target.value;		
	updateFilter(); 		
}

function changeReverbType(e){
	updateReverb(); 		
}