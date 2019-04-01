const glsl = x => x.raw[0];

export default glsl`#version 300 es

precision highp float;
precision highp int;
precision highp usampler3D;
precision highp sampler2D;
precision highp usampler2D;
precision highp isampler2D;

in vec2 uv;
out vec4 f_color;

uniform sampler2D input_color;

uniform sampler2D input_normal;
uniform usampler2D input_material_id;
uniform isampler2D input_offset_id;
uniform sampler2D input_cache_tail;

#define SIGMA 10.0
#define BSIGMA 0.5
#define MSIZE 10

const int kSize = (MSIZE - 1) / 2;

float normpdf(in float x, in float sigma) {
	return 0.39894 * exp(-0.5 * x * x / (sigma * sigma)) / sigma;
}

float normpdf3(in vec3 v, in float sigma) {
	return 0.39894 * exp(-0.5 * dot(v, v) / (sigma * sigma)) / sigma;
}

void main() {

    float cache_tail = texture(input_cache_tail, uv).r;

    // f_color = vec4((cache_tail < 0.3) ? 0.0 : cache_tail);
    // f_color.w = 1.0;

    vec3 color = texture(input_color, uv).rgb;
    // uint material_id = texture(input_material_id, uv).r;

    // if (material_id != 0u && cache_tail > 0.3) {

    //     vec2 resolution = vec2(textureSize(input_color, 0));

    //     vec3 normal = texture(input_normal, uv).rgb;
    //     int offset_id = texture(input_offset_id, uv).r;

    //     float kernel[MSIZE];
    //     for (int j = 0; j <= kSize; ++j) {
    //         kernel[kSize + j] = kernel[kSize - j] = normpdf(float(j), SIGMA);
    //     }

    //     vec3 final_color = vec3(0.0);

    //     vec3 other_color;
    //     vec3 other_normal;
    //     uint other_material_id;
    //     int other_offset_id;

    //     float factor;
    //     float z = 0.0;
    //     float b_z = 1.0 / normpdf(0.0, BSIGMA);

    //     for (int i = -kSize; i <= kSize; ++i) {
    //         for (int j = -kSize; j <= kSize; ++j) {

    //             vec2 other_uv = (gl_FragCoord.xy + vec2(float(i), float(j))) / resolution.xy;

    //             other_color = texture(input_color, other_uv).rgb;
    //             other_normal = texture(input_normal, other_uv).rgb;
    //             other_material_id = texture(input_material_id, other_uv).r;
    //             other_offset_id = texture(input_offset_id, other_uv).r;

    //             if (
    //                 other_material_id != material_id ||
    //                 other_offset_id != offset_id ||
    //                 distance(normal, other_normal) > 0.01
    //             ) {
    //                 continue;
    //             }

    //             factor = normpdf3(other_color - color, BSIGMA) * b_z * kernel[kSize + j] * kernel[kSize + i];

    //             z += factor;
    //             final_color += factor * other_color;

    //         }
    //     }

    //     vec3 c = (cache_tail * (final_color / z)) + ((1.0 - cache_tail) * color);

    //     f_color = vec4(sqrt(c), 1.0); // sqrt for gamma correction.

    // } else {
        f_color = vec4(sqrt(color), 1.0); // sqrt for gamma correction.
    // }

}`;
