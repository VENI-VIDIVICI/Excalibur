precision mediump float;

// UV coord
varying vec2 v_texcoord;
// Textures in the current draw
uniform sampler2D u_texture;

void main() {
   gl_FragColor = texture2D(u_texture, v_texcoord);
}