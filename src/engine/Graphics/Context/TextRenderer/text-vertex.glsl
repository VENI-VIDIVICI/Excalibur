precision mediump float;
attribute vec2 a_position;

attribute vec3 a_textColor;
varying vec3 v_textColor;

attribute vec2 a_uv;
varying vec2 v_uv;

uniform mat4 u_matrix;
uniform float u_smoothing; // smooth step factor .01
uniform float u_buffer; // how "bold" the text is 0.1
uniform float u_opacity;
uniform float u_outlineSize;

void main() {
    v_uv = a_uv;
    v_textColor = a_textColor;
    gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
}