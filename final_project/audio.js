/* js for audio APIs. */

var context = new AudioContext();

var convolver = context.createConvolver();
var biquad = context.createBiquadFilter();
var delay = context.createDelay();
var feedbackGain = context.createGain();
var dryGain = context.createGain();
var wetGain = context.createGain();

/* noise object */
var noiseFilter = context.createBiquadFilter();
var noiseEnvelope = context.createGain();
var synth;

var reverb_types = [
	//#2. add three more convolver
	"ortf.wav",
	"sportcentre.wav",
	"st-mary.wav"
];

/* load impulse response */
function loadImpulseResponse(inType) {
	var request = new XMLHttpRequest();
	var url = "resources/" + inType; //"memchu_ir2.wav";

	request.open('GET', url, true);
	request.responseType = 'arraybuffer';
	request.onload = function() {
	    context.decodeAudioData(request.response, function(buffer) {
			convolver.buffer = buffer;
	    });
	}

	request.send();
}


/* Oscillator object. */
function Oscillator() {
	//var context = new AudioContext();
	oscillator = context.createOscillator();
	// Create a volume (gain) node
	volumeNode = context.createGain();

	function setWaveType(type) {
		oscillator.type = type;
	}

	function setFrequency(freq) {
		console.log("freq" + freq);
		oscillator.frequency.value = freq;
		showNote(noteStrings[noteFromPitch(freq)%12]);
	}

	function getVolume() {
		return volumeNode.gain.value;
	}

	function setVolume(vol) {
		console.log("vol" + vol);
		if(vol <= 30) volumeNode.gain.value = 0;
		else volumeNode.gain.value = vol / 10;
	}

	function connect() {
		biquad.buffer = getNoiseBuffer();
		noiseFilter.type = 'lowpass';
		noiseFilter.frequency.value = 440;
		noiseFilter.Q.value = 45;
		noiseEnvelope.gain = 0.5;

		oscillator.connect(biquad);
		biquad.connect(noiseFilter);

		// amp envelop
		noiseFilter.connect(noiseEnvelope);	

		volumeNode.gain.value = 0;	

		if(isDelayOn()) {
			noiseEnvelope.connect(delay);
			delay.connect(volumeNode);
		}

		else {
			noiseEnvelope.connect(volumeNode);
		}
		
		
		volumeNode.connect(convolver);
		volumeNode.connect(dryGain);

		convolver.connect(wetGain);
		wetGain.connect(context.destination);
		dryGain.connect(context.destination);
		
		// volumeNode.connect(context.destination);
		oscillator.start(0);
		oscillator.noteOn && oscillator.noteOn(0);
		// this method doesn't seem to exist, though it's in the docs?		

		setInitialParam();
	}

	function disconnect() {
		oscillator.disconnect();
	}

	return {
		setWaveType: setWaveType,
		setFrequency: setFrequency,
		getVolume: getVolume,
		setVolume: setVolume,
		connect: connect,
		disconnect: disconnect
	};
}

var DefaultParam = {
	frequency: 5000,
	Q: 1,
	gain: 4,
	delay: 0.02,
	feedback: 0.01,
	wet: 0.1
};

var MaxParam = {
	frequency: 10000,
	Q: 20,
	gain: 10,
	delay: 2,
	feedback: 1,
	wet: 1
};

var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteFromPitch( frequency ) {
	var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
	return Math.round( noteNum ) + 69;
}

// get note
function showNote(inNote) {
	document.getElementById("note").innerHTML = inNote;
}

function setInitialParam(inParam) {
	inParam = inParam || DefaultParam;

	/* Set initial value of knobs. */
	// dialFrequency.val.value = inParam.frequency / MaxParam.frequency;
	// dialFrequency.draw();

	// dialQ.val.value = inParam.Q / MaxParam.Q;
	// dialQ.draw();

	// dialGain.val.value = inParam.gain / MaxParam.gain;
	// dialGain.draw();

	dialDelay.val.value = inParam["delay"] / MaxParam.delay;
	dialDelay.draw();

	dialFeedback.val.value = inParam["feedback"] /MaxParam.feedback;
	dialFeedback.draw();

	dialReverb.val.value = inParam["wet"] / MaxParam.wet;
	dialReverb.draw(); 

	// updateFilter();
	updateDelay();
	updateReverb();
  	// modulationIndex.val.value = synth.parameters.modulationIndex/scale_param.modulationIndex;
  	// modulationIndex.draw();

  	// /* Set amplitude envelope. */
  	// var env = synth.parameters.AmpEnvAttackTime/scale_param.AmpEnv;
  	// Envelope.val.points = [{x:env, y:0.8}, 
  	// 						{x: env += synth.parameters.AmpEnvDecayTime/scale_param.AmpEnv, y:0.5}, 
  	// 						{x: env += synth.parameters.AmpEnvSustainLevel/scale_param.AmpEnv, y:0.5},
  	// 						{x: env += synth.parameters.AmpEnvReleaseTime/scale_param.AmpEnv, y:0}];
  	// Envelope.draw();

  	// FilterFreq.val.value = synth.parameters.FilterFreq/scale_param.FilterFreq;
  	// FilterFreq.draw();

  	// FilterFreqTarget.val.value = synth.parameters.FilterFreqTarget/scale_param.FilterFreqTarget;
  	// FilterFreqTarget.draw();

  	// FilterFreqDecayTime.val.value = synth.parameters.FilterFreqDecayTime/scale_param.FilterFreqDecayTime;
  	// FilterFreqDecayTime.draw();
}

function getCurrentParam() {
	return {
		"name": "Preset of web Theremin",
		"delay": dialDelay.val.value * MaxParam.delay,
		"feedback": dialFeedback.val.value * MaxParam.feedback,
		"wet": dialReverb.val.value * MaxParam.wet,
		"reverb-type": $("#dropDown-reverb").val()
	};
}

function isFilterBypass(){
	return $("#switch-filter").is( ":checked" );
}

function isDelayOn() {
	return $("#switch-delay").is( ":checked" );
}

function isReverbBypass() {
	return $("#switch-reverb").is( ":checked" );
}

// update filter parameters
function updateFilter() {		
	// update filter parameters
	biquad.type = 'lowpass';
	biquad.frequency.value  = 440;
	biquad.Q.value = 45;
	biquad.gain.value = 1;	
}

// update delay parameters
function updateDelay() { 	
	// update filter parameters
	delay.delayTime.value = dialDelay.val.value
	feedbackGain.gain.value  = dialFeedback.val.value;
}

// update convolver parameters
function updateReverb() { 	
	// update filter parameters
	dryGain.gain.value = 1 - dialReverb.val.value + 0.001;
	wetGain.gain.value = dialReverb.val.value + 0.001;
	
	loadImpulseResponse($("#dropDown-reverb").val());
}