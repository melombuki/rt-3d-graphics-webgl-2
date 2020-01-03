export const fragmentShaderText =
  `#version 300 es

  precision highp float;

  in vec4 vVertexColor;
  in vec2 vTexCoord;

  uniform sampler2D image;

  out vec4 fragmentColor;

  void main()
  {
    fragmentColor = vVertexColor * vec4(texture(image, vTexCoord));
  }
`;
