export const fragmentShaderText =
  `#version 300 es

  precision highp float;

  // Lights
  uniform vec3 uLightDirection;
  uniform vec4 uLightAmbient;
  uniform vec4 uLightDiffuse;
  uniform vec4 uLightSpecular;

  // Materials
  uniform vec4 uMaterialAmbient;
  uniform vec4 uMaterialDiffuse;
  uniform vec4 uMaterialSpecular;
  uniform float uShininess;

  in vec3 vNormal;
  in vec3 vEyeVector;

  out vec4 fragmentColor;

  void main(void)
  {
    // Normalized light direction
    vec3 L = normalize(uLightDirection);

    vec3 N = normalize(vNormal);

    // Dot product of the normal product and negative light direction vector
    float lambertTerm = dot(N, -L);

    // Ambient
    vec4 Ia = uLightAmbient * uMaterialAmbient;
    // Diffuse
    vec4 Id = vec4(0.0, 0.0, 0.0, 1.0);
    // Specular
    vec4 Is = vec4(0.0, 0.0, 0.0, 1.0);

    if (lambertTerm > 0.0) {
      Id = uLightDiffuse * uMaterialDiffuse * lambertTerm;
      vec3 eyeVec = normalize(vEyeVector);
      vec3 E = normalize(eyeVec);
      vec3 R = reflect(L, N);
      float specular = pow(max(dot(R, E), 0.0), uShininess);
      Is = uLightSpecular * uMaterialSpecular * specular;
    }

    // Set the varying to be used inside of the fragment shader
    vec4 vertexColor = vec4(vec3(Ia + Id + Is), 1.0);

    fragmentColor = vertexColor;
  }
`;
