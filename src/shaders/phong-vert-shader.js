export const vertexShaderText =
  `#version 300 es

  precision highp float;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;
  uniform mat4 uNormalMatrix;

  in vec3 aVertexPosition;
  in vec3 aVertexNormal;
  
  // Texture
  out vec2 vTexCoord;

  out vec3 vNormal;
  out vec3 vEyeVector;

  void main(void)
  {
    vTexCoord = aVertexPosition.xy * 0.5 + vec2(0.5);

    vec4 vertex = uModelViewMatrix * vec4(aVertexPosition, 1.0);

    // Calculate the normal vector
    vNormal = vec3(uNormalMatrix * vec4(aVertexNormal, 1.0));
    vEyeVector = -vec3(vertex.xyz);

    gl_Position = uProjectionMatrix * vertex;
  }
`;
