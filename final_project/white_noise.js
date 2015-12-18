getNoiseBuffer = function() {
	var bufferSize = context.sampleRate;
	var buffer = context.createBuffer(1, bufferSize, context.sampleRate);
	var output = buffer.getChannelData(0);

	for (var i = 0; i < bufferSize; i++) {
		output[i] = Math.random() * 2 - 1;
	}

	return buffer;
};

setup = function() {
	// white noise
	// noise = context.createBufferSource();
	noise.buffer = getNoiseBuffer();
	
	// highpass filter 
	
	noiseFilter.type = 'lowpass';
	noiseFilter.frequency.value = 440;
	noiseFilter.Q.value = 45;
	noise.connect(noiseFilter);
	
	// amp envelop
	noiseFilter.connect(noiseEnvelope);

	return noiseFilter;
	
};