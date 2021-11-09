attribute vec2 a_position;
// UV coordinate
attribute vec2 a_texcoord;
varying vec2 v_texcoord;


void main() {
   // Set the vertex position using the ortho transform matrix
   gl_Position = vec4(a_position, 0.0, 1.0);
   // Pass through the UV coord to the fragment shader
   v_texcoord = a_texcoord;
}