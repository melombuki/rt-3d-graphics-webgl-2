import { getShader } from './utils';

export default class Program {
  constructor(gl, vertexShaderText, fragmentShaderText) {
    this.gl = gl;
    this.program = gl.createProgram();

    if (!(vertexShaderText && fragmentShaderText)) {
      return console.error('No shaders were provided');
    }

    //
    // Create shaders
    // 
    let vertexShader = getShader(gl, vertexShaderText, gl.VERTEX_SHADER);
    let fragmentShader = getShader(gl, fragmentShaderText, gl.FRAGMENT_SHADER);

    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('ERROR linking program!', gl.getProgramInfoLog(this.program));
      return;
    }

    gl.validateProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.VALIDATE_STATUS)) {
      console.error('ERROR validating program!', gl.getProgramInfoLog(this.program));
      return;
    }

    this.useProgram();
  }

  useProgram() {
    this.gl.useProgram(this.program);
  }

  load(attributes, uniforms) {
    this.useProgram();
    this.setAttributeLocations(attributes);
    this.setUniformLocations(uniforms);
  }

  setAttributeLocations(attributes) {
    attributes.forEach(attribute => {
      this[attribute] = this.gl.getAttribLocation(this.program, attribute);
    });
  }

  setUniformLocations(uniforms) {
    uniforms.forEach(uniform => {
      this[uniform] = this.gl.getUniformLocation(this.program, uniform);
    });
  }

  getUniform(uniformLocation) {
    return this.gl.getUniform(this.program, uniformLocation);
  }
}