export const fragmentShaderText =
  `#version 300 es

  precision highp float;

  in vec4 vVertexColor;

  out vec4 fragmentColor;

  void main()
  {
    fragmentColor = vVertexColor;
  }
`;
