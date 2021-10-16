#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
precision mediump float;

// UV coord
varying vec2 v_texcoord;

// Color coord to blend with image
varying lowp vec4 v_color;

// Stroke color if used
varying lowp vec4 v_strokeColor;

// Stroke thickness if used
varying lowp float v_strokeThickness;

// Opacity
varying float v_opacity;

void main() {
  vec4 color = v_color;
  vec2 uv = v_texcoord * 2.0 - 1.0;
  // vec2 uv = fragCoord.xy / iResolution.xy * 2.0 - 1.0;
  // uv.x *= iResolution.x /iResolution.y;

  // vec4 v_color = vec4(0.2, 0.2, 0.9, 1.0);
  // vec4 v_strokeColor = vec4(0.9, 0.1, 0.1, 1.0);
  // float v_strokeThickness = 0.1;

  float fade = 0.005;

  // dist is > 0 when inside the circle 
  float dist = 1.0 - length(uv);
  // if dist is greater than 0 step to 1;
  vec3 fill = vec3(smoothstep(0.0, fade, dist));

  // if dist is greater than the stroke thickness step to 1
  float stroke = smoothstep(v_strokeThickness + fade, v_strokeThickness, dist);
  vec3 strokeStart = vec3(stroke);
  vec3 strokeEnd = vec3(1.0 - stroke);

  v_strokeColor.rgb *= fill * strokeStart;
  v_color.rgb *= fill * strokeEnd;

  fragColor = v_color + v_strokeColor;

  gl_FragColor = color;
}