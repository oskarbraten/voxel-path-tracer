const glsl = x => x.raw[0];

export default glsl`#version 300 es

precision highp float;
precision highp int;
precision highp usampler3D;
precision highp sampler2D;

__DEFINES__

// coordinates:
in vec2 st; // [-1.0, 1.0]
in vec2 uv; // [0.0, 1.0]

// cameras:
in vec3 ray_direction;
in vec3 previous_ray_direction;
in vec3 camera_origin;
in vec3 previous_camera_origin;

out vec4 fColor;

uniform vec2 resolution;
uniform float seed;

// projection:
uniform mat4 projection_matrix;

// reprojection:
uniform bool reproject;
uniform sampler2D previous_frame;
uniform mat4 previous_view_matrix;

uniform usampler3D voxel_data;

struct material {
    vec3 albedo;
    float fuzz;
    float refractive_index;
    int type; /* 0: diffuse, 1: metal, 2: dielectric */
};

layout(std140) uniform Materials {
    material materials[NUMBER_OF_MATERIALS];
};

float rand_seed = 0.0; // assigned in main.

float rand() {
    vec2 seeded = vec2(st.s + rand_seed, st.t + rand_seed);
    rand_seed += 0.01;
    return fract(sin(dot(seeded.st, vec2(12.9898,78.233))) * 43758.5453);
}

vec3 random_in_unit_sphere() {
    vec3 p;
    do {
        p = (2.0 * vec3(rand(), rand(), rand())) - vec3(1.0, 1.0, 1.0);
    } while (dot(p, p) >= 1.0);
    return p;
}

struct hit_record {
    float t;
    float depth;
    vec3 position;
    vec3 normal;
    uint id;
};

struct ray {
    vec3 origin;
    vec3 direction;
};

vec3 point_at(ray r, float t) {
    return r.origin + t * r.direction;
}

float schlick(float cosine, float refractive_index) {
    float r0 = (1.0 - refractive_index) / (1.0 + refractive_index);
    r0 = r0 * r0;
    return r0 + (1.0 - r0) * pow((1.0 - cosine), 5.0);
}

// TODO: use built-in function instead.
bool refract_2(vec3 v, vec3 n, float ni_over_nt, out vec3 refracted) {
    vec3 uv = normalize(v);
    float dt = dot(uv, n);
    float discriminant = 1.0 - ni_over_nt * ni_over_nt*(1.0 - dt * dt);
    if (discriminant > 0.0) {
        refracted = ni_over_nt * (uv - n * dt) - n * sqrt(discriminant);
        return true;
    }
    
    return false;
}

bool scatter(ray r, in hit_record record, out vec3 attenuation, out ray scattered) {

    material s = materials[record.id];

    if (s.type == 1) {
        vec3 reflected = reflect(normalize(r.direction), record.normal);
        scattered = ray(record.position, reflected + s.fuzz * random_in_unit_sphere());
        attenuation = s.albedo;
        return (dot(scattered.direction, record.normal) > 0.0);
    } else if (s.type == 2) {
        vec3 outward_normal;
        vec3 reflected = reflect(normalize(r.direction), record.normal);

        float ni_over_nt;
        attenuation = vec3(1.0, 1.0, 1.0);

        float cosine;

        if (dot(r.direction, record.normal) > 0.0) {
            outward_normal = -record.normal;
            ni_over_nt = s.refractive_index;
            cosine = dot(r.direction, record.normal) / length(r.direction);
            cosine = sqrt(1.0 - s.refractive_index * s.refractive_index * (1.0 - cosine * cosine));
        }
        else {
            outward_normal = record.normal;
            ni_over_nt = 1.0 / s.refractive_index;
            cosine = -dot(r.direction, record.normal) / length(r.direction);
        }

        vec3 refracted;

        float reflect_prob;
        if (refract_2(r.direction, outward_normal, ni_over_nt, refracted)) {
            reflect_prob = schlick(cosine, s.refractive_index);
        }
        else {
            reflect_prob = 1.0;
        }

        if (rand() < reflect_prob) {
            scattered = ray(record.position, reflected);
        }
        else {
            scattered = ray(record.position, refracted);
        }

        return true;
    }
    else {
        vec3 target = record.position + record.normal + random_in_unit_sphere();
        scattered = ray(record.position, target - record.position);
        attenuation = s.albedo;
        return true;
    }
}

// Using a modified version of:
// A Fast Voxel Traversal Algorithm for Ray Tracing, John Amanatides & Andrew Woo. 1987.
bool voxel_traversal(in ray r, out hit_record record) {

    vec3 origin = r.origin;
    vec3 direction = r.direction;

    ivec3 current_voxel = ivec3(floor(origin / VOXEL_SIZE));

    ivec3 step = ivec3(
        (direction.x > 0.0) ? 1 : -1,
        (direction.y > 0.0) ? 1 : -1,
        (direction.z > 0.0) ? 1 : -1
    );

    vec3 next_boundary = vec3(
        float((step.x > 0) ? current_voxel.x + 1 : current_voxel.x) * VOXEL_SIZE,
        float((step.y > 0) ? current_voxel.y + 1 : current_voxel.y) * VOXEL_SIZE,
        float((step.z > 0) ? current_voxel.z + 1 : current_voxel.z) * VOXEL_SIZE
    );

    vec3 t_max = (next_boundary - origin) / direction; // we will move along the axis with the smallest value
    vec3 t_delta = VOXEL_SIZE / direction * vec3(step);

    int i = 0;
    
    do {
        if (t_max.x < t_max.y && t_max.x < t_max.z) {
            record.t = t_max.x;
            record.normal = vec3(float(-step.x), 0.0, 0.0);

            t_max.x += t_delta.x;
            current_voxel.x += step.x;
        } else if (t_max.y < t_max.z) {
            record.t = t_max.y;
            record.normal = vec3(0.0, float(-step.y), 0.0);

            t_max.y += t_delta.y;
            current_voxel.y += step.y;
        } else {
            record.t = t_max.z;
            record.normal = vec3(0.0, 0.0, float(-step.z));

            t_max.z += t_delta.z;
            current_voxel.z += step.z;
        }

        record.id = texelFetch(voxel_data, current_voxel, 0).r;

        if (record.id != 0u) {
            record.position = point_at(r, record.t);
            record.depth = length(direction * record.t);
            return true;
        }

        i += 1;
    } while (i < MAXIMUM_TRAVERSAL_DISTANCE);

    return false;
}

vec3 background(ray r) {
    float t = clamp(0.5 * (normalize(r.direction).y + 1.0), 0.0, 1.0);
    return mix(vec3(1.0, 1.0, 1.0), vec3(0.5, 0.7, 1.0), t);
}

vec3 trace(ray r, out hit_record record) {

    vec3 color = vec3(1.0, 1.0, 1.0);

    ray scattered;
    vec3 attenuation;

    // do first bounce here, so that we may return its record.
    if (voxel_traversal(r, record)) {
        scatter(r, record, attenuation, scattered);
        
		r = scattered;
        color *= attenuation;
    } else {
        return background(r);
    }

    hit_record bounce_record;

    int i = 1; // already did one bounce.
    while ((i < MAXIMUM_DEPTH) && voxel_traversal(r, bounce_record)) {

        scatter(r, bounce_record, attenuation, scattered);
        
		r = scattered;
        color *= attenuation;

        i += 1;
    }

    if (i == MAXIMUM_DEPTH) {
        return vec3(0.0, 0.0, 0.0);
    } else {
        return color * background(r);
    }

}


const float alpha = 0.5/5.0;

vec3 temporal_reverse_reprojection(in hit_record record, vec3 color) {

    // TODO: swap this uniform with a define?
    if (reproject) {

        vec3 origin = previous_camera_origin;
        vec3 direction = normalize(previous_ray_direction);
        ray ray = ray(origin, direction);
    
        hit_record previous_record; // hit_record for the previous frame.
        voxel_traversal(ray, previous_record);
    
        if (record.id != 0u) {
    
            // reverse reprojection:
            vec4 point = projection_matrix * previous_view_matrix * vec4(record.position, 1.0);
            vec3 p = point.xyz / point.w;
    
            vec2 previous_uv = vec2((p.x / 2.0) + 0.5, (p.y / 2.0) + 0.5);
    
            if (
                // within bounds:
                previous_uv.x > 0.0 == true &&
                previous_uv.y > 0.0 == true &&
                previous_uv.x < 1.0 == true &&
                previous_uv.y < 1.0 == true &&
    
                // within depth:
                abs(record.depth - previous_record.depth) <= 0.4
    
            ) {
                vec3 previous_color = texture(previous_frame, previous_uv).rgb;
                return (alpha * color) + (1.0 - alpha) * previous_color;
            }
        }
    }

    return color;
}

void main() {

    rand_seed = seed; // seed the random number generator.

    vec3 origin = camera_origin;
    vec3 direction = normalize(ray_direction);

    float du = (rand() / resolution.x) * 0.02;
    float dv = (rand() / resolution.y) * 0.02;
    vec3 aa = vec3(du, dv, 0.0);

    ray r = ray(origin, direction + aa);

    hit_record record; // get record from first bounce for reprojection later.
    vec3 color = trace(r, record);

    vec3 final_color = temporal_reverse_reprojection(record, color);
    fColor = vec4(final_color, 1.0);
    
}`;