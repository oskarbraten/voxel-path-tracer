const glsl = x => x.raw[0];

export default glsl`#version 300 es

precision highp float;

#define SIGMA 10.0
#define BSIGMA 0.8
#define MSIZE 4

__DEFINES__

// precomputed kernel (faster than generating it per pixel)
//const float kernel[MSIZE] = float[MSIZE](0.031225216, 0.033322271, 0.035206333, 0.036826804, 0.038138565, 0.039104044, 0.039695028, 0.039894000, 0.039695028, 0.039104044, 0.038138565, 0.036826804, 0.035206333, 0.033322271, 0.031225216);
//const int kSize = (MSIZE - 1) / 2;

float normpdf(in float x, in float sigma) {
	return 0.39894*exp(-0.5*x*x/(sigma*sigma))/sigma;
}

float normpdf3(in vec3 v, in float sigma) {
	return 0.39894*exp(-0.5*dot(v,v)/(sigma*sigma))/sigma;
}

in vec2 uv;
out vec4 fColor;

uniform sampler2D frame;

void main() {
    #ifdef ENABLE_FILTER
    vec2 resolution = vec2(textureSize(frame, 0));
    vec3 c = texture(frame, uv).rgb;

    const int kSize = (MSIZE-1)/2;
	float kernel[MSIZE];
	
	for (int j = 0; j <= kSize; ++j) {
        kernel[kSize + j] = kernel[kSize - j] = normpdf(float(j), SIGMA);
    }

    vec3 color = vec3(0.0);
    float z = 0.0;
    
    vec3 cc;
    float factor;
    float b_z = 1.0 / normpdf(0.0, BSIGMA);

    for (int i = -kSize; i <= kSize; ++i) {
        for (int j = -kSize; j <= kSize; ++j) {

            cc = texture(frame, (gl_FragCoord.xy + vec2(float(i), float(j))) / resolution.xy).rgb;
            factor = normpdf3(cc - c, BSIGMA) * b_z * kernel[kSize + j] * kernel[kSize + i];
            z += factor;
            color += factor * cc;

        }
    }

    fColor = vec4(color / z, 1.0);
    #else
    fColor = texture(frame, uv);
    #endif
}`;
