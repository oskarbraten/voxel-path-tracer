const glsl = x => x.raw[0];

export default glsl`#version 300 es

precision highp float;
precision mediump usampler2D;
precision highp isampler2D;

#define SIGMA 15.0
#define BSIGMA 0.6
#define MSIZE 25

__DEFINES__

// precomputed kernel (faster than generating it per pixel)
// TODO: pass as define from javascript.
const float kernel[MSIZE] = float[MSIZE](0.019312659278512, 0.02032541297376156, 0.021296411752700806, 0.022214846685528755, 0.02307012677192688, 0.023852093145251274, 0.02455120161175728, 0.02515873871743679, 0.0256669782102108, 0.026069363579154015, 0.026360638439655304, 0.026536963880062103, 0.02659600041806698, 0.026536963880062103, 0.026360638439655304, 0.026069363579154015, 0.0256669782102108, 0.02515873871743679, 0.02455120161175728, 0.023852093145251274, 0.02307012677192688, 0.022214846685528755, 0.021296411752700806, 0.02032541297376156, 0.019312659278512);
const int kSize = (MSIZE - 1) / 2;

float normpdf(in float x, in float sigma) {
	return 0.39894*exp(-0.5*x*x / (sigma*sigma)) / sigma;
}

float normpdf3(in vec3 v, in float sigma) {
	return 0.39894*exp(-0.5*dot(v,v)/(sigma*sigma))/sigma;
}

in vec2 uv;
out vec4 fColor;

uniform sampler2D trace_pass;

uniform usampler2D material_normal_sampler;
uniform isampler2D plane_sampler;

void main() {
    #ifdef ENABLE_FILTER
    vec2 resolution = vec2(textureSize(trace_pass, 0));

    vec3 c = texture(trace_pass, uv).rgb;

    uvec2 material_normal_id = texture(material_normal_sampler, uv).rg;
    int plane_id = texture(plane_sampler, uv).r;

	//float kernel[MSIZE];
	
	//for (int j = 0; j <= kSize; ++j) {
    //    kernel[kSize + j] = kernel[kSize - j] = normpdf(float(j), SIGMA);
    //}

    vec3 color = vec3(0.0);
    float z = 0.0;
    
    vec3 cc;

    uvec2 cc_material_normal_id;
    int cc_plane_id;

    float factor;
    float b_z = 1.0 / normpdf(0.0, BSIGMA);

    for (int i = -kSize; i <= kSize; ++i) {
        for (int j = -kSize; j <= kSize; ++j) {

            cc = texture(trace_pass, (gl_FragCoord.xy + vec2(float(i), float(j))) / resolution.xy).rgb;
            factor = normpdf3(cc - c, BSIGMA) * b_z * kernel[kSize + j] * kernel[kSize + i];

            cc_material_normal_id = texture(material_normal_sampler, (gl_FragCoord.xy + vec2(float(i), float(j))) / resolution.xy).rg;
            cc_plane_id = texture(plane_sampler, (gl_FragCoord.xy + vec2(float(i), float(j))) / resolution.xy).r;

            if (cc_material_normal_id != material_normal_id || cc_plane_id != plane_id) {
                // factor = 0.0;
                continue;
            }

            z += factor;
            color += factor * cc;

        }
    }

    fColor = vec4(color / z, 1.0);
    #else
    fColor = texture(trace_pass, uv);
    #endif
}`;
