# Real-time voxel path-tracer

### Features
- [x] Temporal reverse reprojection
- [x] Ray voxel traversal
- [ ] Filtering
- [ ] Light sources
- [ ] HDR

### Reverse reprojection

The availability of concrete examples on this subject is somewhat limited. I wish to remedy this with the following explanation.

Temporal reverse reprojection is the act of reprojecting the the previously rendered frame onto the current frame. This allows for reuse of information or, in the case of path tracing, accumulating samples (and thereby converging towards a solution to the rendering equation) even with movement.

Note. Since this is a pure path tracer (no rasterization, excepting the fullscreen quad) the actual technique used differs somewhat from the one presented by Nehad, D. et al <sup>2</sup>. Specifically, the reprojected coordinates must be calculated per pixel in the fragment shader, instead of utilizing interpolation capabilites (from vertex to fragment).

#### How-to
Given the world space position of a fragment in the current frame, what is its corresponding uv-coordinate in the previous frame?

The answer is surprisingly simple:

~~~~glsl
vec4 p = projection_matrix * previous_view_matrix * vec4(position, 1.0);
p = p.xyz / p.w; // perspective division

vec2 previous_uv = vec2((p.x / 2.0) + 0.5, (p.y / 2.0) + 0.5);
~~~~

First, the previous view matrix must be passed in as a uniform. This is simply the view matrix that was used when rendering the previous frame. After multiplying the position by the projection and view matrix we do a perspective division, and voila! The position has now been transformed to normalized device coordinates. We can then simply transform it to fullscreen "uv" space by dividing by 2 and adding 0.5.

~~~~glsl
vec3 previous_color = texture(previous_color, previous_uv).rgb;
~~~~
Finally, we sample the previous frame to get the color.

(Note. In most cases the texture sampler should be set to linearly interpolate, as using nearest neighbour can cause warping.)

#### Cache miss
But wait, why not reproject everything?
As the camera is moved or rotated, certain parts of the scene may occlude other parts. In these cases, if we were to sample the previous frame anyway, bleeding between materials would occur. Specifically, from previously occluding surfaces onto disoccluded surfaces. So we just discard them. We call that a cache miss.

So how can we decide if a sample is no longer valid? It can be done in a number of ways. In this instance, since we're using voxels, the distinction between surfaces is very clear. We can therefore easily decide if a cache sample should be discarded, by looking at the three properties:

 - Normal
 - Material
 - Offset (along normal)

We acquire these properties by rendering them to textures and inputting them to the next frame, just like the color.

```glsl
if (
    f_material_id == previous_material_id &&
    distance(f_normal, previous_normal) < 0.1 &&
    f_offset_id == previous_offset_id
) { ... }
```
...

### References

1. Amanatides, J. and Woo, A., 1987, August. A fast voxel traversal algorithm for ray tracing. In Eurographics (Vol. 87, No. 3, pp. 3-10).
2. Nehab, D., Sander, P.V., Lawrence, J., Tatarchuk, N. and Isidoro, J.R., 2007, August. Accelerating real-time shading with reverse reprojection caching. In Graphics hardware (Vol. 41, pp. 61-62).
