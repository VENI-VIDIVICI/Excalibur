precision mediump float;
attribute vec2 a_position;

attribute vec2 a_uv;
varying vec2 v_uv;

uniform mat4 u_matrix;

void main() {
    v_uv = a_uv;
    gl_Position = u_matrix * a_position;
}