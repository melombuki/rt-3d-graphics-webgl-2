import { vertexShaderText } from '../shaders/vert-shader';
import { fragmentShaderText } from '../shaders/frag-shader';
import * as dat from 'dat.gui';

export const initProgram = gl => {
  //
  // Create shaders
  // 
  let vertexShader = getShader(gl, vertexShaderText, gl.VERTEX_SHADER);
  let fragmentShader = getShader(gl, fragmentShaderText, gl.FRAGMENT_SHADER);

  //
  // Create program
  let program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('ERROR linking program!', gl.getProgramInfoLog(program));
    return;
  }

  gl.validateProgram(program);
  if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
    console.error('ERROR validating program!', gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  program.aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
  program.aVertexNormal = gl.getAttribLocation(program, 'aVertexNormal');
  program.uProjectionMatrix = gl.getUniformLocation(program, 'uProjectionMatrix');
  program.uModelViewMatrix = gl.getUniformLocation(program, 'uModelViewMatrix');
  program.uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix');
  program.uMaterialDiffuse = gl.getUniformLocation(program, 'uMaterialDiffuse');
  program.uLightDiffuse = gl.getUniformLocation(program, 'uLightDiffuse');
  program.uLightDirection = gl.getUniformLocation(program, 'uLightDirection');

  return program;
}

export const getGLContext = canvas => {
  return canvas.getContext('webgl2') || console.error('WebGL2 is not available in your browser.');
}

export const autoResizeCanvas = canvas => {
  const expandFullScreen = () => {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
  };
  const debounced = debounce(expandFullScreen, 250);

  expandFullScreen();
  window.addEventListener('resize', debounced);
}

export const getShader = (gl, shaderString, shaderType) => {
  let shader = gl.createShader(shaderType);

  gl.shaderSource(shader, shaderString);

  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('ERROR compiling shader!', gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

// Normalize colors from 0-255 to 0-1
export const normalizeColor = (color) => {
  return color.map(c => c / 255);
};

// De-normalize colors from 0-1 to 0-255
export const denormalizeColor = (color) => {
  return color.map(c => c * 255);
};

// Returns computed normals for provided vertices.
// Note: Indices have to be completely defined--NO TRIANGLE_STRIP only TRIANGLES.
export const calculateNormals = (vs, ind) => {
  const
    x = 0,
    y = 1,
    z = 2,
    ns = [];

  // For each vertex, initialize normal x, normal y, normal z
  for (let i = 0; i < vs.length; i += 3) {
    ns[i + x] = 0.0;
    ns[i + y] = 0.0;
    ns[i + z] = 0.0;
  }

  // We work on triads of vertices to calculate
  for (let i = 0; i < ind.length; i += 3) {
    // Normals so i = i+3 (i = indices index)
    const v1 = [], v2 = [], normal = [];

    // p2 - p1
    v1[x] = vs[3 * ind[i + 2] + x] - vs[3 * ind[i + 1] + x];
    v1[y] = vs[3 * ind[i + 2] + y] - vs[3 * ind[i + 1] + y];
    v1[z] = vs[3 * ind[i + 2] + z] - vs[3 * ind[i + 1] + z];

    // p0 - p1
    v2[x] = vs[3 * ind[i] + x] - vs[3 * ind[i + 1] + x];
    v2[y] = vs[3 * ind[i] + y] - vs[3 * ind[i + 1] + y];
    v2[z] = vs[3 * ind[i] + z] - vs[3 * ind[i + 1] + z];

    // Cross product by Sarrus Rule
    normal[x] = v1[y] * v2[z] - v1[z] * v2[y];
    normal[y] = v1[z] * v2[x] - v1[x] * v2[z];
    normal[z] = v1[x] * v2[y] - v1[y] * v2[x];

    // Update the normals of that triangle: sum of vectors
    for (let j = 0; j < 3; j++) {
      ns[3 * ind[i + j] + x] = ns[3 * ind[i + j] + x] + normal[x];
      ns[3 * ind[i + j] + y] = ns[3 * ind[i + j] + y] + normal[y];
      ns[3 * ind[i + j] + z] = ns[3 * ind[i + j] + z] + normal[z];
    }
  }

  // Normalize the result.
  // The increment here is because each vertex occurs.
  for (let i = 0; i < vs.length; i += 3) {
    // With an offset of 3 in the array (due to x, y, z contiguous values)
    const nn = [];
    nn[x] = ns[i + x];
    nn[y] = ns[i + y];
    nn[z] = ns[i + z];

    let len = Math.sqrt((nn[x] * nn[x]) + (nn[y] * nn[y]) + (nn[z] * nn[z]));
    if (len === 0) len = 1.0;

    nn[x] = nn[x] / len;
    nn[y] = nn[y] / len;
    nn[z] = nn[z] / len;

    ns[i + x] = nn[x];
    ns[i + y] = nn[y];
    ns[i + z] = nn[z];
  }

  return ns;
};

// Calculate tangets for a given set of vertices
export const calculateTangents = (vs, tc, ind) => {
  const tangents = [];

  for (let i = 0; i < vs.length / 3; i++) {
    tangents[i] = [0, 0, 0];
  }

  let
    a = [0, 0, 0],
    b = [0, 0, 0],
    triTangent = [0, 0, 0];

  for (let i = 0; i < ind.length; i += 3) {
    const i0 = ind[i];
    const i1 = ind[i + 1];
    const i2 = ind[i + 2];

    const pos0 = [vs[i0 * 3], vs[i0 * 3 + 1], vs[i0 * 3 + 2]];
    const pos1 = [vs[i1 * 3], vs[i1 * 3 + 1], vs[i1 * 3 + 2]];
    const pos2 = [vs[i2 * 3], vs[i2 * 3 + 1], vs[i2 * 3 + 2]];

    const tex0 = [tc[i0 * 2], tc[i0 * 2 + 1]];
    const tex1 = [tc[i1 * 2], tc[i1 * 2 + 1]];
    const tex2 = [tc[i2 * 2], tc[i2 * 2 + 1]];

    vec3.subtract(a, pos1, pos0);
    vec3.subtract(b, pos2, pos0);

    const c2c1b = tex1[1] - tex0[1];
    const c3c1b = tex2[0] - tex0[1];

    triTangent = [c3c1b * a[0] - c2c1b * b[0], c3c1b * a[1] - c2c1b * b[1], c3c1b * a[2] - c2c1b * b[2]];

    vec3.add(triTangent, tangents[i0], triTangent);
    vec3.add(triTangent, tangents[i1], triTangent);
    vec3.add(triTangent, tangents[i2], triTangent);
  }

  // Normalize tangents
  const ts = [];
  tangents.forEach(tan => {
    vec3.normalize(tan, tan);
    ts.push(tan[0]);
    ts.push(tan[1]);
    ts.push(tan[2]);
  });

  return ts;
};

// A simpler API on top of the dat.GUI API, specifically
// designed for this book for a simpler codebase
export const configureControls = (settings, options = { width: 300 }) => {
  // Check if a gui instance is passed in or create one by default
  const gui = options.gui || new dat.GUI(options);
  const state = {};

  const isAction = v => typeof v === 'function';

  const isFolder = v =>
    !isAction(v) &&
    typeof v === 'object' &&
    (v.value === null || v.value === undefined);

  const isColor = v =>
    (typeof v === 'string' && ~v.indexOf('#')) ||
    (Array.isArray(v) && v.length >= 3);

  Object.keys(settings).forEach(key => {
    const settingValue = settings[key];

    if (isAction(settingValue)) {
      state[key] = settingValue;
      return gui.add(state, key);
    }
    if (isFolder(settingValue)) {
      // If it's a folder, recursively call with folder as root settings element
      return utils.configureControls(settingValue, { gui: gui.addFolder(key) });
    }

    const {
      value,
      min,
      max,
      step,
      options,
      onChange = () => null,
    } = settingValue;

    // set state
    state[key] = value;

    let controller;

    // There are many other values we can set on top of the dat.GUI
    // API, but we'll only need a few for our purposes
    if (options) {
      controller = gui.add(state, key, options);
    }
    else if (isColor(value)) {
      controller = gui.addColor(state, key)
    }
    else {
      controller = gui.add(state, key, min, max, step)
    }

    controller.onChange(v => onChange(v, state))
  });
};



// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
const debounce = (func, wait, immediate) => {
  var timeout;
  return function () {
    var context = this, args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};