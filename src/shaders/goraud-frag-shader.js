export const fragmentShaderText =
  `#version 300 es

  precision highp float;

  in vec2 vTexCoord;
  in vec4 vVertexColor;
  out vec4 fragmentColor;

  uniform sampler2D image;

  void main()
  {
    fragmentColor = vVertexColor * texture(image, vTexCoord);
    // fragmentColor = vVertexColor;
  }
`;
