import testImg from './assets/test.png';
import { vertexShaderText } from './shaders/phong-vert-shader';
import { fragmentShaderText } from './shaders/phong-frag-shader';
import Program from './common/Program';
import {
  getGLContext,
  autoResizeCanvas,
  calculateNormals,
  denormalizeColor,
  normalizeColor,
  configureControls,
  getShader,
} from './common/utils';
import {
  vertices,
  indices
} from './model';
import { mat4 } from 'gl-matrix';

let
  gl,
  program,
  modelViewMatrix = mat4.create(),
  projectionMatrix = mat4.create(),
  normalMatrix = mat4.create(),
  sphereVAO,
  sphereIndicesBuffer,
  lastTime,
  // If set true, we use the `LINES` drawing primitive instead of `TRIANGLES`
  wireframe = false,
  angle = 0,
  shininess = 10,
  clearColor = [0, 0, 0, 1],
  lightColor = [1, 1, 1, 1],
  lightAmbient = [0.03, 0.03, 0.03, 1],
  lightSpecular = [1, 1, 1, 1],
  lightDirection = [-0.25, -0.25, -0.25],
  materialDiffuse = [46 / 256, 99 / 256, 191 / 256, 1],
  materialAmbient = [1, 1, 1, 1],
  materialSpecular = [1, 1, 1, 1],
  image;

const clean = () => {
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
};

const initProgram = () => {
  let canvas = document.getElementById('game-surface');
  autoResizeCanvas(canvas);

  //
  // Set up gl context, and program
  //
  gl = getGLContext(canvas);
  gl.clearColor(...clearColor);
  gl.clearDepth(100);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  program = new Program(gl, vertexShaderText, fragmentShaderText);
  const attributes = [
    'aVertexPosition',
    'aVertexNormal'
  ];

  const uniforms = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uMaterialAmbient',
    'uMaterialDiffuse',
    'uMaterialSpecular',
    'uShininess',
    'uLightAmbient',
    'uLightDiffuse',
    'uLightSpecular',
    'uLightDirection',
  ];

  program.load(attributes, uniforms);
}

const setTexture = (img) => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.pixelStorei(gl.PACK_ALIGNMENT, 8);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.uniform1i(program.image, 0);
}

const initBuffers = () => {
  // Calculate the normals using the `calculateNormals` utility function
  const normals = calculateNormals(vertices, indices);

  // Create VAO
  sphereVAO = gl.createVertexArray();

  // Bind VAO
  gl.bindVertexArray(sphereVAO);

  // Vertices
  const sphereVerticesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVerticesBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // Configure VAO instructions
  gl.enableVertexAttribArray(program.aVertexPosition);
  gl.vertexAttribPointer(program.aVertexPosition, 3, gl.FLOAT, false, 0, 0);

  // Normals
  const sphereNormalsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormalsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

  // Configure VAO instructions
  gl.enableVertexAttribArray(program.aVertexNormal);
  gl.vertexAttribPointer(program.aVertexNormal, 3, gl.FLOAT, false, 0, 0);

  // Indices
  sphereIndicesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndicesBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  clean();
}

const initLights = () => {
  gl.uniform4fv(program.uLightDiffuse, lightColor);
  gl.uniform4fv(program.uLightAmbient, lightAmbient);
  gl.uniform4fv(program.uLightSpecular, lightSpecular);
  gl.uniform3fv(program.uLightDirection, lightDirection);
  gl.uniform4fv(program.uMaterialDiffuse, materialDiffuse);
  gl.uniform4fv(program.uMaterialAmbient, materialAmbient);
  gl.uniform4fv(program.uMaterialSpecular, materialSpecular);
  gl.uniform1f(program.uShininess, shininess);
}

const initControls = () => {
  configureControls({
    'Light Color': {
      value: denormalizeColor(lightColor),
      onChange: v => gl.uniform4fv(program.uLightDiffuse, normalizeColor(v))
    },
    'Light Ambient Term': {
      value: lightAmbient[0],
      min: 0, max: 1, step: 0.01,
      onChange: v => gl.uniform4fv(program.uLightAmbient, [v, v, v, 1])
    },
    'Light Specular Term': {
      value: lightSpecular[0],
      min: 0, max: 1, step: 0.01,
      onChange: v => gl.uniform4fv(program.uLightSpecular, [v, v, v, 1])
    },
    // Spread all values from the reduce onto the controls
    ...['Translate X', 'Translate Y', 'Translate Z'].reduce((result, name, i) => {
      result[name] = {
        value: lightDirection[i],
        min: -10, max: 10, step: -0.1,
        onChange(v, state) {
          gl.uniform3fv(program.uLightDirection, [
            -state['Translate X'],
            -state['Translate Y'],
            state['Translate Z']
          ]);
        }
      };
      return result;
    }, {}),
    'Sphere Color': {
      value: denormalizeColor(materialDiffuse),
      onChange: v => gl.uniform4fv(program.uMaterialDiffuse, normalizeColor(v))
    },
    'Material Ambient Term': {
      value: materialAmbient[0],
      min: 0, max: 1, step: 0.01,
      onChange: v => gl.uniform4fv(program.uMaterialAmbient, [v, v, v, 1])
    },
    'Material Specular Term': {
      value: materialSpecular[0],
      min: 0, max: 1, step: 0.01,
      onChange: v => gl.uniform4fv(program.uMaterialSpecular, [v, v, v, 1])
    },
    Shininess: {
      value: shininess,
      min: 0, max: 50, step: 0.1,
      onChange: v => gl.uniform1f(program.uShininess, v)
    },
    Background: {
      value: denormalizeColor(clearColor),
      onChange: v => gl.clearColor(...normalizeColor(v), 1)
    },
    Wireframe: {
      value: wireframe,
      onChange: v => wireframe = v
    }
  });
};

const draw = () => {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // We will discuss these operations in later chapters
  mat4.perspective(projectionMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 10000);
  mat4.identity(modelViewMatrix);
  mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -1.5]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, angle * Math.PI / 180, [0, 1, 0]);

  mat4.copy(normalMatrix, modelViewMatrix);
  mat4.invert(normalMatrix, normalMatrix);
  mat4.transpose(normalMatrix, normalMatrix);

  gl.uniformMatrix4fv(program.uNormalMatrix, false, normalMatrix);
  gl.uniformMatrix4fv(program.uModelViewMatrix, false, modelViewMatrix);
  gl.uniformMatrix4fv(program.uProjectionMatrix, false, projectionMatrix);

  // We will start using the `try/catch` to capture any errors from our `draw` calls
  try {
    // Bind
    gl.bindVertexArray(sphereVAO);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndicesBuffer);

    // If wireframe is truthy, we draw using `LINES`
    const type = wireframe ? gl.LINES : gl.TRIANGLES;

    // Draw
    gl.drawElements(type, indices.length, gl.UNSIGNED_SHORT, 0);

    clean();
  }
  // We catch the `error` and simply output to the screen for testing/debugging purposes
  catch (error) {
    console.error(error);
  }
};

const animate = () => {
  let timeNow = new Date().getTime();
  if (lastTime) {
    const elapsed = timeNow - lastTime;
    angle += (90 * elapsed) / 10000.0;
  }
  lastTime = timeNow;
};

const render = () => {
  requestAnimationFrame(render);
  animate();
  draw();
}

const init = async () => {
  //
  // Load image
  //
  image = new Image();
  image.src = testImg;
  await new Promise(r => image.onload = r);

  initProgram();
  initBuffers();
  setTexture(image);
  initLights();
  render();

  initControls();
};

window.onload = init;