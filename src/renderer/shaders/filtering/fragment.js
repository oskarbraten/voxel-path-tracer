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

uniform vec2 direction;
uniform vec2 resolution;

uniform sampler2D input_color;
uniform sampler2D input_normal;
uniform usampler2D input_material_id;
uniform isampler2D input_offset_id;
uniform sampler2D input_cache_tail;

vec3 blur13() {

    uint material_id = texture(input_material_id, uv).r;
    vec3 normal = texture(input_normal, uv).rgb;
    int offset_id = texture(input_offset_id, uv).r;

    vec4 color = texture(input_color, uv) * 0.1964825501511404;
    float weight_sum = 0.1964825501511404;

    vec2 off1 = vec2(1.411764705882353) * direction;
    vec2 off2 = vec2(3.2941176470588234) * direction;
    vec2 off3 = vec2(5.176470588235294) * direction;


    // get values:

    vec3 offset_1_normal_p = texture(input_normal, uv + (off1 / resolution)).rgb;
    vec3 offset_1_normal_n = texture(input_normal, uv - (off1 / resolution)).rgb;
    uint offset_1_material_id_p = texture(input_material_id, uv + (off1 / resolution)).r;
    uint offset_1_material_id_n = texture(input_material_id, uv - (off1 / resolution)).r;
    int offset_1_offset_id_p = texture(input_offset_id, uv + (off1 / resolution)).r;
    int offset_1_offset_id_n = texture(input_offset_id, uv - (off1 / resolution)).r;

    vec3 offset_2_normal_p = texture(input_normal, uv + (off2 / resolution)).rgb;
    vec3 offset_2_normal_n = texture(input_normal, uv - (off2 / resolution)).rgb;
    uint offset_2_material_id_p = texture(input_material_id, uv + (off2 / resolution)).r;
    uint offset_2_material_id_n = texture(input_material_id, uv - (off2 / resolution)).r;
    int offset_2_offset_id_p = texture(input_offset_id, uv + (off2 / resolution)).r;
    int offset_2_offset_id_n = texture(input_offset_id, uv - (off2 / resolution)).r;

    vec3 offset_3_normal_p = texture(input_normal, uv + (off3 / resolution)).rgb;
    vec3 offset_3_normal_n = texture(input_normal, uv - (off3 / resolution)).rgb;
    uint offset_3_material_id_p = texture(input_material_id, uv + (off3 / resolution)).r;
    uint offset_3_material_id_n = texture(input_material_id, uv - (off3 / resolution)).r;
    int offset_3_offset_id_p = texture(input_offset_id, uv + (off3 / resolution)).r;
    int offset_3_offset_id_n = texture(input_offset_id, uv - (off3 / resolution)).r;


    // offset #1:
    if (material_id == offset_1_material_id_p && offset_id == offset_1_offset_id_p && distance(normal, offset_1_normal_p) < 0.01) {
        color += texture(input_color, uv + (off1 / resolution)) * 0.2969069646728344;
        weight_sum += 0.2969069646728344;
    }
    if (material_id == offset_1_material_id_n && offset_id == offset_1_offset_id_n && distance(normal, offset_1_normal_n) < 0.01) {
        color += texture(input_color, uv - (off1 / resolution)) * 0.2969069646728344;
        weight_sum += 0.2969069646728344;
    }

    // offset #2:
    if (material_id == offset_2_material_id_p && offset_id == offset_2_offset_id_p && distance(normal, offset_2_normal_p) < 0.01) {
        color += texture(input_color, uv + (off2 / resolution)) * 0.09447039785044732;
        weight_sum += 0.09447039785044732;
    }
    if (material_id == offset_2_material_id_n && offset_id == offset_2_offset_id_n && distance(normal, offset_2_normal_n) < 0.01) {
        color += texture(input_color, uv - (off2 / resolution)) * 0.09447039785044732;
        weight_sum += 0.09447039785044732;
    }

    // offset #3:
    if (material_id == offset_3_material_id_p && offset_id == offset_3_offset_id_p && distance(normal, offset_3_normal_p) < 0.01) {
        color += texture(input_color, uv + (off3 / resolution)) * 0.010381362401148057;
        weight_sum += 0.010381362401148057;
    }
    if (material_id == offset_3_material_id_n && offset_id == offset_3_offset_id_n && distance(normal, offset_3_normal_n) < 0.01) {
        color += texture(input_color, uv - (off3 / resolution)) * 0.010381362401148057;
        weight_sum += 0.010381362401148057;
    }

    return (color.rgb / weight_sum);
}

// vec4 blur(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {

//     uvec2 mn = texture(mn_sampler, uv).rg;

//     if (mn.r == 0u) {
//         return texture(image, uv); // no need to blur air..
//     }

//     int p = texture(p_sampler, uv).r;

//     vec4 sum = vec4(0.0);
//     float weight_sum = 0.0;
    
//     ivec2 center = ivec2(uv * resolution);

//     ivec2 offset_4p = (center + ivec2(4) * ivec2(direction));
//     ivec2 offset_3p = (center + ivec2(3) * ivec2(direction));
//     ivec2 offset_2p = (center + ivec2(2) * ivec2(direction));
//     ivec2 offset_1p = (center + ivec2(1) * ivec2(direction));

//     ivec2 offset_4n = (center + ivec2(-4) * ivec2(direction));
//     ivec2 offset_3n = (center + ivec2(-3) * ivec2(direction));
//     ivec2 offset_2n = (center + ivec2(-2) * ivec2(direction));
//     ivec2 offset_1n = (center + ivec2(-1) * ivec2(direction));

//     if (mn == texelFetch(mn_sampler, offset_4n, 0).rg && p == texelFetch(p_sampler, offset_4n, 0).r) {
//         sum += texelFetch(image, offset_4n, 0) * 0.0162162162;
//         weight_sum += 0.0162162162;
//     }

//     if (mn == texelFetch(mn_sampler, offset_3n, 0).rg && p == texelFetch(p_sampler, offset_3n, 0).r) {
//         sum += texelFetch(image, offset_3n, 0) * 0.0540540541;
//         weight_sum += 0.0540540541;
//     }
    
//     if (mn == texelFetch(mn_sampler, offset_2n, 0).rg && p == texelFetch(p_sampler, offset_2n, 0).r) {
//         sum += texelFetch(image, offset_2n, 0) * 0.1216216216;
//         weight_sum += 0.1216216216;
//     }

//     if (mn == texelFetch(mn_sampler, offset_1n, 0).rg && p == texelFetch(p_sampler, offset_1n, 0).r) {
//         sum += texelFetch(image, offset_1n, 0) * 0.1945945946;
//         weight_sum += 0.1945945946;
//     }
	
//     sum += texelFetch(image, center, 0) * 0.2270270270;
//     weight_sum += 0.2270270270;
    
//     if (mn == texelFetch(mn_sampler, offset_1p, 0).rg && p == texelFetch(p_sampler, offset_1p, 0).r) {
//         sum += texelFetch(image, offset_1p, 0) * 0.1945945946;
//         weight_sum += 0.1945945946;
//     }

//     if (mn == texelFetch(mn_sampler, offset_2p, 0).rg && p == texelFetch(p_sampler, offset_2p, 0).r) {
//         sum += texelFetch(image, offset_2p, 0) * 0.1216216216;
//         weight_sum += 0.1216216216;
//     }

//     if (mn == texelFetch(mn_sampler, offset_3p, 0).rg && p == texelFetch(p_sampler, offset_3p, 0).r) {
//         sum += texelFetch(image, offset_3p, 0) * 0.0540540541;
//         weight_sum += 0.0540540541;
//     }

//     if (mn == texelFetch(mn_sampler, offset_4p, 0).rg && p == texelFetch(p_sampler, offset_4p, 0).r) {
//         sum += texelFetch(image, offset_4p, 0) * 0.0162162162;
//         weight_sum += 0.0162162162;
//     }

// 	return vec4(sum.rgb / weight_sum, 1.0);
// }

// vec4 average(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {

//     vec4 c = texture(image, uv);

//     uvec2 mn = texture(mn_sampler, uv).rg;
//     if (mn.r == 0u) {
//         return c; // no need to blur air..
//     }

//     int p = texture(p_sampler, uv).r;

//     vec4 sum = vec4(0.0);
//     int n = 0;
    
//     ivec2 center = ivec2(uv * resolution);

//     ivec2 offset_5p = (center + ivec2(5) * ivec2(direction));
//     ivec2 offset_4p = (center + ivec2(4) * ivec2(direction));
//     ivec2 offset_3p = (center + ivec2(3) * ivec2(direction));
//     ivec2 offset_2p = (center + ivec2(2) * ivec2(direction));
//     ivec2 offset_1p = (center + ivec2(1) * ivec2(direction));

//     ivec2 offset_5n = (center + ivec2(-5) * ivec2(direction));
//     ivec2 offset_4n = (center + ivec2(-4) * ivec2(direction));
//     ivec2 offset_3n = (center + ivec2(-3) * ivec2(direction));
//     ivec2 offset_2n = (center + ivec2(-2) * ivec2(direction));
//     ivec2 offset_1n = (center + ivec2(-1) * ivec2(direction));

//     if (mn == texelFetch(mn_sampler, offset_5n, 0).rg && p == texelFetch(p_sampler, offset_5n, 0).r) {
//         sum += texelFetch(image, offset_5n, 0);
//         n++;
//     }

//     if (mn == texelFetch(mn_sampler, offset_4n, 0).rg && p == texelFetch(p_sampler, offset_4n, 0).r) {
//         sum += texelFetch(image, offset_4n, 0);
//         n++;
//     }

//     if (mn == texelFetch(mn_sampler, offset_3n, 0).rg && p == texelFetch(p_sampler, offset_3n, 0).r) {
//         sum += texelFetch(image, offset_3n, 0);
//         n++;
//     }
    
//     if (mn == texelFetch(mn_sampler, offset_2n, 0).rg && p == texelFetch(p_sampler, offset_2n, 0).r) {
//         sum += texelFetch(image, offset_2n, 0);
//         n++;
//     }

//     if (mn == texelFetch(mn_sampler, offset_1n, 0).rg && p == texelFetch(p_sampler, offset_1n, 0).r) {
//         sum += texelFetch(image, offset_1n, 0);
//         n++;
//     }
	
//     sum += texelFetch(image, center, 0);
//     n++;
    
//     if (mn == texelFetch(mn_sampler, offset_1p, 0).rg && p == texelFetch(p_sampler, offset_1p, 0).r) {
//         sum += texelFetch(image, offset_1p, 0);
//         n++;
//     }

//     if (mn == texelFetch(mn_sampler, offset_2p, 0).rg && p == texelFetch(p_sampler, offset_2p, 0).r) {
//         sum += texelFetch(image, offset_2p, 0);
//         n++;
//     }

//     if (mn == texelFetch(mn_sampler, offset_3p, 0).rg && p == texelFetch(p_sampler, offset_3p, 0).r) {
//         sum += texelFetch(image, offset_3p, 0);
//         n++;
//     }

//     if (mn == texelFetch(mn_sampler, offset_4p, 0).rg && p == texelFetch(p_sampler, offset_4p, 0).r) {
//         sum += texelFetch(image, offset_4p, 0);
//         n++;
//     }

//     if (mn == texelFetch(mn_sampler, offset_5p, 0).rg && p == texelFetch(p_sampler, offset_5p, 0).r) {
//         sum += texelFetch(image, offset_5p, 0);
//         n++;
//     }

// 	return mix(c, vec4(sum.rgb / float(n), 1.0), 1.0);
// }


void main() {

    float cache_tail = texture(input_cache_tail, uv).r;

    // f_color = vec4((cache_tail < 0.1) ? 0.0 : cache_tail);
    // f_color.w = 1.0;

    vec3 color = texture(input_color, uv).rgb;
    uint material_id = texture(input_material_id, uv).r;

    if (material_id != 0u && cache_tail > 0.2) {

        vec3 color_blurred = blur13();

        // cache blending:
        vec3 c = (cache_tail * color_blurred) + ((1.0 - cache_tail) * color);
        f_color = vec4(c, 1.0); // sqrt for gamma correction.

    } else {
        f_color = vec4(color, 1.0); // sqrt for gamma correction.
    }

}`;
