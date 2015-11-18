	var context = new AudioContext();
	var input;
	var gainNode = context.createGain();

	// Buffer source
	var source = null;
	var myAudioBuffer = null;
	var loopPlayBack = false;
	
	///////////////////////////////////////////
	// Biquad filter default
	var biquad_params = {
		type : "lowpass",
		frequency : 5000,
		Q : 1,
		gain: 4
	}

	var filter_types = [
		"lowpass",
		"highpass",
	    "bandpass",
		"lowshelf",
		"highshelf",
		"peaking",
		"notch",
		"allpass"
	];
	var biquad = context.createBiquadFilter();
	var biquad_bypass = false;

	
	///////////////////////////////////////////
	// Delay effect
	var delay_params = {
		delayTime : 0.5,
		feedbackGain : 0.1
	}
	var delay = context.createDelay();
	var feedbackGain = context.createGain();
	var delay_bypass = false;
		

	///////////////////////////////////////////
	// Reverberation effect
	// convolver
	var reverb_types = [
		"sample1.wav",
		"sample2.wav",
		"sample3.wav",
		//#2. add three more convolver
		"ortf.wav",
		"sportcentre.wav",
		"st-mary.wav"
	];

	var reverb_params = {
		type : "sample1.wav",
		wetdryRatio : 0.2
	}

	var convolver = context.createConvolver();
	var dryGain = context.createGain();
	var wetGain = context.createGain();
	var reverb_bypass = false;
	
	var impulseResponse = null;
	

	///////////////////////////////////////////
	// Amp response plot
	var canvas = null;
	var WIDTH = 512;
	var HEIGHT = 256;
	
	var numFreqs = 200;
	var magResponse = new Float32Array(numFreqs); // magnitude
	var phaseResponse = new Float32Array(numFreqs);  // phase

    var freqBins = new Float32Array(numFreqs);
 
    for(var i = 0; i < numFreqs; ++i) {
       freqBins[i] = context.sampleRate/2*(i+1)/numFreqs;
    }


	///////////////////////////////////////////
	// Initialization

	window.onload=function(){
		// select a filter
		var filterSelect = document.getElementById("filtersDropdown");
		for (var i in filter_types) {
			var option = document.createElement("option");
			option.text = filter_types[i];
			option.value = filter_types[i];
			filterSelect.appendChild(option);
		}
		filterSelect.addEventListener("change", changeFilterType, false);


		// select a room impulse response 
		var reverbSelect = document.getElementById("reverbDropdown");
		for (var i in reverb_types) {
			var option = document.createElement("option");
			option.text = reverb_types[i];
			option.value = reverb_types[i];
			reverbSelect.appendChild(option);
		}
		reverbSelect.addEventListener("change", changeReverbType, false);


		// get convas to plot amp response
		canvas = document.getElementById("amp_response");				
		canvas.width =  WIDTH;
		canvas.height = HEIGHT;
		
		updateFilter();	
		updateDelay();			
		updateReverb();	
	}
	

	///////////////////////////////////////////
	// jQuery-based knob control settings (Biquad-filter)
	$(function() {
		$( ".filter_freq_knob" ).knob({
			change: function (value) {
				biquad_params.frequency = value;		
				updateFilter(); 		
			},
			'min':100,
	    	'max':10000,
			'step': 1
		});
	});
	
	$(function() {
		$( ".filter_Q_knob" ).knob({
			change: function (value) {
				biquad_params.Q = value;		
				updateFilter(); 		
			},
			'min':0.01,
	    	'max': 40,
			'step': 0.1
		});
	});
	
	$(function() {
		$( ".filter_gain_knob" ).knob({
			change: function (value) {
				biquad_params.gain = value;		
				updateFilter(); 		
			},
			'min': -40,
	    	'max': 40,
			'step': 0.1
		});
	});
	
	// jQuery-based knob control settings (Delay)
	$(function() {
		$( ".delay_delay_time" ).knob({
			change: function (value) {
				delay_params.delayTime = value;		
				updateDelay(); 		
			},
			'min': 0,
	    	'max': 2,
			'step': 0.001
		});
	});
	
	$(function() {
		$( ".delay_feedback_gain" ).knob({
			change: function (value) {
				delay_params.feedbackGain = value;		
				updateDelay(); 		
			},
			'min': 0,
	    	'max': 0.99,
			'step': 0.01
		});
	});
	
	// jQuery-based knob control settings (Reverb)
	$(function() {
		$( ".reverb_wet_dry_ratio" ).knob({
			change: function (value) {
				reverb_params.wetdryRatio = value;		
				updateReverb(); 		
			},
			'min': 0,
	    	'max': 0.99,
			'step': 0.01
		});
	});
	

	///////////////////////////////////////////
	// event handlers
	///////////////////////////////////////////
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
		biquad_params.type = filterName;		
		updateFilter(); 		
	}
	
	function changeReverbType(e){
		var reverbName = e.target.value;		
		reverb_params.type = reverbName;		
		updateReverb(); 		
	}
	
	function isFilterBypass(){
		return $("#filterBypass").is( ":checked" );
	}

	function isDelayBypass() {
		return $("#delayBypass").is( ":checked" );
	}
	
	function isReverbBypass() {
		return $("#reverbBypass").is( ":checked" );
	}

	function toggleFilterBypass(){
		if( isFilterBypass() ) {			
			biquad.disconnect();
			console.log("here");		
		}

		cascadeEffect();		
	}
	
	function toggleDelayBypass() {
		if( isDelayBypass() ) {
			delay.disconnect();		
		}

		cascadeEffect();	
	}	

	function toggleReverbBypass() {
		if( isReverbBypass() ) {
			convolver.disconnect();		
		}

		cascadeEffect();	
	}

	function cascadeEffect() {
		// connecting the three audio effects
		var effects = [];
		if (!isFilterBypass()) effects.push(biquad);
		if(!isDelayBypass()) effects.push(delay);
		if(!isReverbBypass()) effects.push(convolver);

		if(effects.length == 0)
			input.connect(gainNode);

		else {
			input.connect(effects[0]);
			for(var i =1;i < effects.length;i++)
				effects[i-1].connect(effects[i]);

			effects[effects.length - 1].connect(gainNode);
		}

		gainNode.connect(context.destination);
	}

	///////////////////////////////////////////
	// update filter parameters
	function updateFilter() {		
		// update filter parameters
		biquad.type = biquad_params.type;
		biquad.frequency.value  = biquad_params.frequency ;
		biquad.Q.value = biquad_params.Q;
		biquad.gain.value = biquad_params.gain;
		
		// update filter plot
		drawFrequencyResponse();		
	}
	
	// update delay parameters
	function updateDelay() { 	
		// update filter parameters
		delay.delayTime.value = delay_params.delayTime;
		feedbackGain.gain.value  = delay_params.feedbackGain ;
	}

	// update convolver parameters
	function updateReverb() { 	
		// update filter parameters
		dryGain.gain.value = 1-reverb_params.wetdryRatio;
		wetGain.gain.value = reverb_params.wetdryRatio;
		
		loadImpulseResponse(reverb_params.type)
	}
	
	
	///////////////////////////////////////////
	//load impulse response
	function loadImpulseResponse(type) {
		var request = new XMLHttpRequest();
		var url = type; //"memchu_ir2.wav";
	  	request.open('GET', url, true);
	  	request.responseType = 'arraybuffer';
	  	request.onload = function() {
	    context.decodeAudioData(request.response, function(buffer) {
			convolver.buffer = buffer;
	    });
	  }
	  request.send();
	}	
	
	
	///////////////////////////////////////////
	// plot amplitude response	  	  
	function drawFrequencyResponse() {
		var drawContext = canvas.getContext("2d");		

		// fill rectangular
		drawContext.fillStyle = 'rgb(200, 200, 200)';
		drawContext.fillRect(0, 0, WIDTH, HEIGHT);
		
	    var barWidth = WIDTH / numFreqs;
    
	    // get magnitude response
		biquad.getFrequencyResponse(freqBins, magResponse, phaseResponse);

	    drawContext.strokeStyle = "black";
	    drawContext.beginPath();
	    for(var frequencyStep = 0; frequencyStep < numFreqs; ++frequencyStep) {
			drawContext.lineTo(frequencyStep * barWidth, HEIGHT - magResponse[frequencyStep]*HEIGHT/2);
	    }
	    drawContext.stroke();
    } 

	if (!navigator.getUserMedia)
		navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
							  
	if (!navigator.getUserMedia)
		alert("Error: getUserMedia not supported!");
						
	// get audio input streaming 				 
	navigator.getUserMedia({audio: true}, onStream, onStreamError)

	// successCallback
	function onStream(stream) {
	    input = context.createMediaStreamSource(stream);

		cascadeEffect();		
	}
	
	// errorCallback			 
	function onStreamError(error) {
		console.error('Error getting microphone', error);
	}
