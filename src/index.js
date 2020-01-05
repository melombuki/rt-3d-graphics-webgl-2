import { vertexShaderText } from './shaders/simple-vert-shader';
import { fragmentShaderText } from './shaders/simple-frag-shader';
import Program from './common/Program';
import Clock from './common/Clock';
import Scene from './common/Scene';
import Floor from './common/Floor';
import Axis from './common/Axis';
import { default as cone3 } from './common/models/geometries/cone3';
import {
  getGLContext,
  getCanvas,
  autoResizeCanvas,
  configureControls,
} from './common/utils';
import { mat4 } from 'gl-matrix';

let
  gl, scene, program, clock,
  WORLD_COORDINATES = 'World Coordinates',
  CAMERA_COORDINATES = 'Camera Coordinates',
  coordinates = WORLD_COORDINATES,
  home = [0, -2, -50],
  position = [0, -2, -50],
  rotation = [0, 0, 0],
  cameraMatrix = mat4.create(),
  modelViewMatrix = mat4.create(),
  projectionMatrix = mat4.create(),
  normalMatrix = mat4.create();

const configure = () => {
  // Configure `canvas`
  const canvas = getCanvas('webgl-canvas');
  autoResizeCanvas(canvas);

  // Configure `gl`
  gl = getGLContext(canvas);
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clearDepth(100);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // Configure `clock` which we can subscribe to on every `tick`.
  // We will discuss this in a later chapter, but it's simply a way to
  // abstract away the `requestAnimationFrame` we have been using.
  clock = new Clock();

  // Configure `program`
  program = new Program(gl, vertexShaderText, fragmentShaderText);

  // Uniforms to be set
  const uniforms = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uMaterialDiffuse',
    'uLightAmbient',
    'uLightDiffuse',
    'uLightPosition',
    'uWireframe'
  ];

  // Attributes to be set
  const attributes = [
    'aVertexPosition',
    'aVertexNormal',
    'aVertexColor'
  ];

  // Load uniforms and attributes
  program.load(attributes, uniforms);

  // Configure `scene`. We will discuss this in a later chapter, but
  // this is a simple way to add objects into our scene, rather than
  // maintaining sets of global arrays as we've done in previous chapters.
  scene = new Scene(gl, program);

  // Configure lights
  gl.uniform3fv(program.uLightPosition, [0, 120, 120]);
  gl.uniform4fv(program.uLightAmbient, [0.20, 0.20, 0.20, 1]);
  gl.uniform4fv(program.uLightDiffuse, [1, 1, 1, 1]);
  initTransforms();
};

const load = () => {
  scene.add(new Floor(80, 2));
  scene.add(new Axis(82));
  scene.load(cone3, 'cone');
}

// Initialize the necessary transforms
const initTransforms = () => {
  mat4.identity(modelViewMatrix);
  mat4.translate(modelViewMatrix, modelViewMatrix, home);
  mat4.identity(cameraMatrix);
  mat4.invert(modelViewMatrix, cameraMatrix);
  mat4.identity(projectionMatrix);
  mat4.identity(normalMatrix);
  mat4.copy(normalMatrix, modelViewMatrix);
  mat4.invert(normalMatrix, normalMatrix);
  mat4.transpose(normalMatrix, normalMatrix);
}

// Update transforms
const updateTransforms = () => {
  mat4.perspective(projectionMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 1000);

  if (coordinates === WORLD_COORDINATES) {
    mat4.identity(modelViewMatrix);
    mat4.translate(modelViewMatrix, modelViewMatrix, position);
    mat4.rotateX(modelViewMatrix, modelViewMatrix, rotation[0] * Math.PI / 180);
    mat4.rotateY(modelViewMatrix, modelViewMatrix, rotation[1] * Math.PI / 180);
    mat4.rotateZ(modelViewMatrix, modelViewMatrix, rotation[2] * Math.PI / 180);
  } else {
    mat4.identity(cameraMatrix);
    mat4.translate(cameraMatrix, cameraMatrix, position);
    mat4.rotateX(cameraMatrix, cameraMatrix, rotation[0] * Math.PI / 180);
    mat4.rotateY(cameraMatrix, cameraMatrix, rotation[1] * Math.PI / 180);
    mat4.rotateZ(cameraMatrix, cameraMatrix, rotation[2] * Math.PI / 180);
  }
};

// Set the matrix uniforms
const setMatrixUniforms = () => {
  if (coordinates === WORLD_COORDINATES) {
    mat4.invert(cameraMatrix, modelViewMatrix);
    gl.uniformMatrix4fv(program.uModelViewMatrix, false, modelViewMatrix);
  }
  else {
    mat4.invert(modelViewMatrix, cameraMatrix);
  }
  gl.uniformMatrix4fv(program.uProjectionMatrix, false, projectionMatrix);
  gl.uniformMatrix4fv(program.uModelViewMatrix, false, modelViewMatrix);
  mat4.transpose(normalMatrix, cameraMatrix);
  gl.uniformMatrix4fv(program.uNormalMatrix, false, normalMatrix);
}

const clean = () => {
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
};

const initControls = () => {
  // DOM element to change values
  const coordinatesElement = document.getElementById('coordinates');
  configureControls({
    Coordinates: {
      value: coordinates,
      options: [WORLD_COORDINATES, CAMERA_COORDINATES],
      onChange: v => {
        coordinates = v;
        coordinatesElement.innerText = coordinates;
        vec3.copy(home, position);
        rotation = [0, 0, 0];
        if (coordinates === CAMERA_COORDINATES) {
          vec3.negate(position, position);
        }
      }
    },
    Position: {
      ...['Translate X', 'Translate Y', 'Translate Z'].reduce((result, name, i) => {
        result[name] = {
          value: position[i],
          min: -100, max: 100, step: -0.1,
          onChange(v, state) {
            position = [
              state['Translate X'],
              state['Translate Y'],
              state['Translate Z']
            ];
          }
        };
        return result;
      }, {}),
    },
    Rotation: {
      ...['Rotate X', 'Rotate Y', 'Rotate Z'].reduce((result, name, i) => {
        result[name] = {
          value: rotation[i],
          min: -180, max: 180, step: 0.1,
          onChange(v, state) {
            rotation = [
              state['Rotate X'],
              state['Rotate Y'],
              state['Rotate Z']
            ];
          }
        };
        return result;
      }, {}),
    }
  });
  // On every `tick` (i.e. requestAnimationFrame cycle), invoke callback
  clock.on('tick', () => {
    // Update the values in the DOM
    const matrix = (coordinates === WORLD_COORDINATES) ? modelViewMatrix : cameraMatrix;
    matrix.forEach((data, i) => {
      document.getElementById(`m${i}`).innerText = data.toFixed(1);
    });
  });
};

const draw = () => {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  try {
    updateTransforms();
    setMatrixUniforms();

    // Iterate over every object in the scene
    scene.traverse(object => {
      gl.uniform4fv(program.uMaterialDiffuse, object.diffuse);
      gl.uniform1i(program.uWireframe, object.wireframe);

      // Bind
      gl.bindVertexArray(object.vao);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      // Draw
      if (object.wireframe) {
        gl.drawElements(gl.LINES, object.indices.length, gl.UNSIGNED_SHORT, 0);
      } else {
        gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT, 0);
      }

      clean();
    });
  } catch (error) {
    console.error(error);
  }
};

const init = async () => {
  configure();
  load();
  clock.on('tick', draw);

  initControls();
};

window.onload = init;