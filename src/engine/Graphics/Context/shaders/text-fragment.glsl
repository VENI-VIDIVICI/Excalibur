
precision mediump float;
varying vec2 v_uv;

uniform sampler2D u_text_sdf;
uniform vec3 u_textColor; //color of the text
uniform float u_smoothing; // smooth step factor .01
uniform float u_buffer; // how "bold" the text is 0.1
uniform float u_opacity;
uniform float u_outlineSize;

void main() {
    float distance = texture2D(u_text_sdf, v_uv).a;
    float alpha = smoothstep(u_buffer - u_smoothing, u_buffer + u_smoothing, distance);
    float border = smoothstep(u_buffer + u_outlineSize - u_smoothing, u_buffer + u_outlineSize + u_smoothing, distance);
    gl_FragColor = vec4(mix(u_outlineColor, u_textColor, border), 1.0) * alpha * opacity;
}