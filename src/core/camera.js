export default {
    new(node, aspectRatio, yfov = 75, zfar = null, znear = 1.0) {
        return {
            node,
            aspectRatio,
            yfov,
            zfar,
            znear
        };
    }
};