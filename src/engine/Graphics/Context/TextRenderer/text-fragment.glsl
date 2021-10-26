
precision mediump float;
varying vec2 v_uv;
varying vec3 v_textColor; //color of the text

uniform sampler2D u_text_sdf;
uniform float u_smoothing; // smooth step factor .01
uniform float u_buffer; // how "bold" the text is 0.1
uniform float u_opacity;
// uniform float u_outlineSize;

void main() {
    vec3 u_outlineColor = vec3(0.0, 0.0, 1.0);
    float distance = texture2D(u_text_sdf, v_uv).r; // sdf is black and white
    // gl_FragColor = vec4(distance);
    float alpha = smoothstep(u_buffer - u_smoothing, u_buffer + u_smoothing, distance);
    gl_FragColor = vec4(v_textColor.rgb, alpha * u_opacity);
    // float alpha = smoothstep(u_buffer - u_smoothing, u_buffer + u_smoothing, distance);
    // float border = smoothstep(u_buffer + u_outlineSize - u_smoothing, u_buffer + u_outlineSize + u_smoothing, distance);
    // gl_FragColor = vec4(mix(u_outlineColor, v_textColor, border), 1.) * alpha * u_opacity;
}