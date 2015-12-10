	var context = new AudioContext()
    settings = {
        id: 'keyboard',
        width: 600,
        height: 150,
        startNote: 'C3',
        whiteNotesColour: '#fff',
        blackNotesColour: '#000',
        borderColour: '#000',
        activeColour: 'yellow',
        octaves: 2
    },
    keyboard = new QwertyHancock(settings);

    var convolver = context.createConvolver();

	/* load impulse response */
	var request = new XMLHttpRequest();
	var url = "st-mary.wav"; //"memchu_ir2.wav";

	request.open('GET', url, true);
	request.responseType = 'arraybuffer';
	request.onload = function() {
	    context.decodeAudioData(request.response, function(buffer) {
			convolver.buffer = buffer;
	    });
	}
	
	request.send();

	var Voice = function(context, frequency, parameters) {
	  this.context = context;

	  // modulator osc
	  this.modulatingOsc = context.createOscillator()
	  this.modulatingOscGain = context.createGain();

	  // carrier osc
	  this.carrierOsc = context.createOscillator();
	  this.carrierOscGain = context.createGain();

	  // lowpass filter 
	  this.lowpassfilter = context.createBiquadFilter();

	  this.convolver = convolver;
	  this.dryGain = context.createGain();
	  this.wetGain = context.createGain();

	  // connect
	  this.modulatingOsc.connect(this.modulatingOscGain);
	  this.modulatingOscGain.connect(this.carrierOsc.frequency);
	  this.carrierOsc.connect(this.carrierOscGain);
	  this.carrierOscGain.connect(this.lowpassfilter);
	  //this.lowpassfilter.connect(context.destination);
	  this.lowpassfilter.connect(this.convolver);
	  this.convolver.connect(this.wetGain);
	  this.carrierOsc.connect(this.dryGain);
	  this.dryGain.connect(context.destination);
	  this.wetGain.connect(context.destination);	
	  // this.convolver.connect(context.destination);

	  

	  // preset parameters 
	  this.modulationIndex = parameters.modulationIndex;
	  this.modulationFrequency = frequency / parameters.carrierModulationRatio;
	  this.IndexAttackTime = parameters.IndexAttackTime;
	  this.IndexDecayTime = parameters.IndexDecayTime;
	  this.IndexSustainLevel = parameters.IndexSustainLevel;
	  this.IndexReleaseTime = parameters.IndexReleaseTime;
	  this.AmpEnvAttackTime = parameters.AmpEnvAttackTime;
	  this.AmpEnvDecayTime = parameters.AmpEnvDecayTime;
	  this.AmpEnvSustainLevel = parameters.AmpEnvSustainLevel;
	  this.AmpEnvReleaseTime = parameters.AmpEnvReleaseTime;
	  this.FilterFreq = parameters.FilterFreq;
	  this.FilterFreqTarget = parameters.FilterFreqTarget;
	  this.FilterFreqDecayTime = parameters.FilterFreqDecayTime;
	  this.wet = reverbRatio.val.value;

	  this.modulatingOsc.frequency.value = this.modulationFrequency;
	  this.carrierOsc.frequency.value = frequency;
	  this.dryGain.gain.value = 1- this.wet;
	  this.wetGain.gain.value = this.wet;

	  this.lowpassfilter.type = 'lowpass';

	  //TODO add knob
	  // wet dry ratio. no bypass
	  
	};

	///////////////////////////////////////////
	Voice.prototype.on = function() {
	  this.modulatingOsc.start();
	  this.carrierOsc.start();
	  this.triggerCarrierEnvelope();
	  this.triggerSpectralEnvelope();
	  this.triggerFilterEnvelope();
	};

	Voice.prototype.triggerCarrierEnvelope = function() {
	  var param = this.carrierOscGain.gain;
	  var now = this.context.currentTime;

	  param.cancelScheduledValues(now);
	  param.setValueAtTime(0, now);

      // brass			  
	  param.linearRampToValueAtTime(1, now + this.AmpEnvAttackTime);
	  param.exponentialRampToValueAtTime(this.AmpEnvSustainLevel, now + this.AmpEnvDecayTime);
	};

	Voice.prototype.triggerSpectralEnvelope = function() {
	  var param = this.modulatingOscGain.gain;
	  var now = this.context.currentTime;
	  var A = this.modulationIndex * this.modulationFrequency;

	  param.cancelScheduledValues(now);
	  param.setValueAtTime(0, now);
	  

	  param.linearRampToValueAtTime(A, now + this.IndexAttackTime);
	  param.exponentialRampToValueAtTime(A * this.IndexSustainLevel, now + this.IndexDecayTime);
	};

	Voice.prototype.triggerFilterEnvelope = function() {
	  var param = this.lowpassfilter.frequency;
	  var now = this.context.currentTime;

	  param.cancelScheduledValues(now);
	  param.setValueAtTime(this.FilterFreq, now);
	  param.exponentialRampToValueAtTime(this.FilterFreqTarget, now + this.FilterFreqDecayTime);
	};
	
	Voice.prototype.off = function() {
  	  var param = this.carrierOscGain.gain;
  	  var now = this.context.currentTime;
	  param.exponentialRampToValueAtTime(0.001, now + this.AmpEnvReleaseTime);
	  this.carrierOsc.stop(now + this.IndexReleaseTime);

	  param = this.modulatingOscGain.gain;
	  param.exponentialRampToValueAtTime(0.001, now + this.IndexReleaseTime);
	  this.modulatingOsc.stop(now + this.AmpEnvReleaseTime);
	};

	var FmSynth = function(context, parameters) {
	  this.context = context;
	  this.voices = {};
	  this.parameters = parameters;
	};

	FmSynth.prototype.noteOn = function(midi_note_number) {
	  var frequency = this.midiNoteNumberToFrequency(midi_note_number);

	  this.voices[midi_note_number] = new Voice(this.context, frequency, this.parameters)
	  this.voices[midi_note_number].on();
	};

	FmSynth.prototype.midiNoteNumberToFrequency = function(midi_note_number) {
	  var f_ref = 440;
	  var n_ref = 57;
	  var a = Math.pow(2, 1/12);
	  var n = midi_note_number - n_ref;
	  var f = f_ref * Math.pow(a, n);

	  return f;
	};

	FmSynth.prototype.noteOff = function(midi_note_number) {
	  this.voices[midi_note_number].off();
	};	

	FmSynth.prototype.setParameter = function(inParam, inValue) {
		if(inParam == "Envelope") {
			this.parameters["AmpEnvAttackTime"] = inValue[0].x;
			this.parameters["AmpEnvDecayTime"] = inValue[1].x;
			this.parameters["AmpEnvSustainLevel"] = inValue[2].x;
			this.parameters["AmpEnvReleaseTime"] = inValue[3].x;
			console.log(inValue)
		}

		// handle dry & wet ratio together
		else if (inParam == "reverbRatio")
			this.parameters["wet"] = inValue;

		else
			this.parameters[inParam] = inValue * scale_param[inParam];              
	}

	function updateReverb() { 	
		// update filter parameters
		dryGain.gain.value = 1-reverb_params.wetdryRatio;
		wetGain.gain.value = reverb_params.wetdryRatio;
		
		loadImpulseResponse(reverb_params.type)
	}

	var scale_param = {
		modulationIndex: 10,
		FilterFreq: 5000,
		FilterFreqTarget: 5000,
		FilterFreqDecayTime: 10,
		AmpEnv: 15
	};               

	var brass_params = {
		presetName: "Brass",
		carrierModulationRatio: 1,
		modulationIndex: 5,
		IndexAttackTime: 0.2,
		IndexDecayTime: 0.3,
		IndexSustainLevel: 0.9,
		IndexReleaseTime: 1,
		AmpEnvAttackTime: 0.2,
		AmpEnvDecayTime: 0.3,
		AmpEnvSustainLevel: 0.9,
		AmpEnvReleaseTime: 0.5,
		FilterFreq: 2000,
		FilterFreqTarget: 500,
		FilterFreqDecayTime: 0.5
	};
	
	// Electroc Piano
	var ep_params = {
		presetName: "Electric Piano",
		carrierModulationRatio: 1/10,
		modulationIndex: 3,
		IndexAttackTime: 0,
		IndexDecayTime: 3,
		IndexSustainLevel: 0.001,
		IndexReleaseTime: 0.1,
		AmpEnvAttackTime: 0,
		AmpEnvDecayTime: 3,
		AmpEnvSustainLevel: 0.001,
		AmpEnvReleaseTime: 0.1,
		FilterFreq: 2000,
		FilterFreqTarget: 500,
		FilterFreqDecayTime: 0.5
	};

	var bell_params = {
		presetName: "Bell",
		carrierModulationRatio: 1/1.4,
		modulationIndex: 2,
		IndexAttackTime: 0,
		IndexDecayTime: 10,
		IndexSustainLevel: 0.001,
		IndexReleaseTime: 3,
		AmpEnvAttackTime: 0,
		AmpEnvDecayTime: 10,
		AmpEnvSustainLevel: 0.001,
		AmpEnvReleaseTime: 3,
		FilterFreq: 5000,
		FilterFreqTarget: 2000,
		FilterFreqDecayTime: 5
	};

	var organ_params = {
		presetName: "organ",
		carrierModulationRatio: 0.5,
		modulationIndex: 0.01,
		IndexAttackTime: 0,
		IndexDecayTime: 10,
		IndexSustainLevel: 0.001,
		IndexReleaseTime: 3,
		AmpEnvAttackTime: 0.1,
		AmpEnvDecayTime: 0.001,
		AmpEnvSustainLevel: 0.001,
		AmpEnvReleaseTime: 5,
		FilterFreq: 4000,
		FilterFreqTarget: 2000,
		FilterFreqDecayTime: 5
	};

	// add presets
	var presets = [];
	presets.push(brass_params);
	presets.push(ep_params);
	presets.push(bell_params);
	presets.push(organ_params);
	
	var synth;
	
	function changePreset(e){
		var presentValue = e.target.value;		
		synth = new FmSynth(context, presets[presentValue]);

		setInitialParam();
	}


	var getMIDINumOfNote = function (note) {
		var notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'],
		key_number,
		octave;

		if (note.length === 3) {
			octave = note.charAt(2);
		} else {
			octave = note.charAt(1);
		}

		key_number = notes.indexOf(note.slice(0, -1));

		if (key_number < 3) {
			key_number = key_number + 12 + ((octave - 1) * 12) + 1;
		} else {
			key_number = key_number + ((octave - 1) * 12) + 1;
		}

		return (key_number+20);
	};
	
	
	// Qwerty-Hancock note on/off handlers	
    keyboard.keyDown = function (note, frequency) {
		
		synth.noteOn(getMIDINumOfNote(note));
		
    };

    keyboard.keyUp = function (note, frequency) {
		
		synth.noteOff(getMIDINumOfNote(note));
    };

	nx.onload = function() {
		var presetSelect = document.getElementById("PresetDropDown");
		for (var i in presets) {
			var option = document.createElement("option");
			option.text = presets[i].presetName;
			option.value = i;
			presetSelect.appendChild(option);
		}
		presetSelect.addEventListener("change", changePreset, false);
		
		// default
		synth = new FmSynth(context, presets[0]);

		/* Event listening  options */
		/*
		 This is the default anyway!
		*/
		nx.sendsTo("js");

		/* 
		this code can be useful for logging any interface events
		*/
		for (var key in nx.widgets) {
			with (nx.widgets[key]) {
				on('*', function(data) {
					// code that will be executed
					if(canvasID == "Envelope")
						synth.setParameter(canvasID, data.points);

					else
						synth.setParameter(canvasID, data.value);
				})
			}
		} 
		
		/* styles */
		nx.colorize("#00CCFF"); // sets accent (default)
	  	nx.colorize("border", "#222222");
	  	nx.colorize("fill", "#222222");
		
		setInitialParam();
	}

	function setInitialParam() {
		/* Set initial value of knobs. */
	  	modulationIndex.val.value = synth.parameters.modulationIndex/scale_param.modulationIndex;
	  	modulationIndex.draw();

	  	var env =synth.parameters.AmpEnvAttackTime/scale_param.AmpEnv;
	  	Envelope.val.points = [{x:env, y:0.8}, 
	  							{x: env += synth.parameters.AmpEnvDecayTime/scale_param.AmpEnv, y:0.5}, 
	  							{x: env += synth.parameters.AmpEnvSustainLevel/scale_param.AmpEnv, y:0.5},
	  							{x: env += synth.parameters.AmpEnvReleaseTime/scale_param.AmpEnv, y:0}];
	  	Envelope.draw();

	  	FilterFreq.val.value = synth.parameters.FilterFreq/scale_param.FilterFreq;
	  	FilterFreq.draw();

	  	FilterFreqTarget.val.value = synth.parameters.FilterFreqTarget/scale_param.FilterFreqTarget;
	  	FilterFreqTarget.draw();

	  	FilterFreqDecayTime.val.value = synth.parameters.FilterFreqDecayTime/scale_param.FilterFreqDecayTime;
	  	FilterFreqDecayTime.draw();
	}