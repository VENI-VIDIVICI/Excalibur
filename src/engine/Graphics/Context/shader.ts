export interface VertexAttributeDefinition {
  name: string;
  size: number;
  glType: number;
  normalized: boolean;
  location: number;
}

export interface UniformDefinition {
  name: string;
  location: WebGLUniformLocation;
  type: string;
  data: any;
}

/**
 * Create a shader program for the Excalibur WebGL Graphics Context
 */
export class Shader {
  public program!: WebGLProgram;
  private _gl: WebGLRenderingContext;
  public uniforms: { [variableName: string]: UniformDefinition } = {};
  public attributes: { [variableName: string]: VertexAttributeDefinition } = {};
  public layout: VertexAttributeDefinition[] = [];
  private _compiled = false;
  public get compiled() {
    return this._compiled;
  }

  /**
   * Create a shader program in excalibur
   * @param _gl WebGL graphics context
   * @param _vertexSource Vertex shader source as a string
   * @param _fragmentSource Fragment shader source as a string
   */
  constructor(private _vertexSource: string, private _fragmentSource: string) {}

  private _createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = gl.createProgram();
    if (program === null) {
      throw Error('Could not create graphics shader program');
    }

    // attach the shaders.
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    // link the program.
    gl.linkProgram(program);

    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
      throw Error(`Could not link the program: [${gl.getProgramInfoLog(program)}]`);
    }

    return program;
  }

  private _compileShader(gl: WebGLRenderingContext, source: string, type: number): WebGLShader {
    const shader = gl.createShader(type);
    if (shader === null) {
      throw Error(`Could not build shader: [${source}]`);
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
      throw Error(`Could not compile shader [${gl.getShaderInfoLog(shader)}]`);
    }
    return shader;
  }

  /**
   * Specify the order of shader attributes for each vertex in your vertex buffer
   */
  setVertexAttributeLayout(attributes: string[]) {
    // TODO verify compiled
    // TODO specify the vertice layout in the VBO
    // Make sure all the attributes are included
    const allAttributes = new Set(Object.keys(this.attributes));
    for (let attribute of attributes) {
      if (allAttributes.has(attribute)) {
        this.layout.push(this.attributes[attribute]);
        allAttributes.delete(attribute);
      }
    }
    if (allAttributes.size > 0) {
      throw new Error(`Specified vertex layout is missing some attributes that are in the shader source [${Array.from(allAttributes.values()).join(',')}]`)
    }
  }

  /**
   * Verify shader is fully configured
   */
  verify() {
    // uniforms all set
    // attribute layout set
    // throw otherwise with helpful error message
  }

  /**
   * Verify the vertex is in correct size? or can we verify data?
   */
  verifyVertex(_vertex: any[]) {

  }

  getUniforms(gl: WebGLRenderingContext): UniformDefinition[] {
    const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
    const uniforms: UniformDefinition[] = [];
    for (let i = 0; i < uniformCount; i++) {
      const uniform = gl.getActiveUniform(this.program, i);
      const uniformLocation = gl.getUniformLocation(this.program, uniform.name);
      uniforms.push({
        name: uniform.name,
        type: uniform.type.toString(), // TODO this is dubious
        location: uniformLocation,
        data: null
      });
    }
    return uniforms;
  }

  getAttributes(gl: WebGLRenderingContext): VertexAttributeDefinition[] {
    const attributCount = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
    const attributes: VertexAttributeDefinition[] = [];
    for (let i = 0; i < attributCount; i++) {
      const attribute = gl.getActiveAttrib(this.program, i);
      const attributeLocation = gl.getAttribLocation(this.program, attribute.name);
      attributes.push({
        name: attribute.name,
        glType: this.getAttribPointerTypeFromAttributeType(attribute.type),
        size: this.getAttribPointerSizeFromFromAttributeType(attribute.type),
        location: attributeLocation,
        normalized: false
      });
    }
    return attributes;
  }

  /**
   * Compile the current shader against a webgl context
   * @param gl WebGL context
   */
  compile(gl: WebGLRenderingContext): WebGLProgram {
    this._gl = gl;
    const vertexShader = this._compileShader(gl, this._vertexSource, gl.VERTEX_SHADER);
    const fragmentShader = this._compileShader(gl, this._fragmentSource, gl.FRAGMENT_SHADER);
    const program = this._createProgram(gl, vertexShader, fragmentShader);
    
    this.program = program
    const attributes = this.getAttributes(gl);
    for (let attribute of attributes) {
      this.attributes[attribute.name] = attribute;
    }
    const _uniforms = this.getUniforms(gl);
    console.log(_uniforms);
    this._compiled = true;
    return this.program;
  }

  /**
   * Add a uniform [[Matrix]] to the shader
   * @param name Name of the uniform in the shader source
   * @param data (4x4) matrix in column major order
   */
  public addUniformMatrix(name: string, data: Float32Array) {
    if (!data) {
      throw Error(`Shader Uniform Matrix '${name}' was set to null or undefined`);
    }
    const gl = this._gl;
    this.uniforms[name] = {
      name,
      type: 'matrix4fv',
      location: gl.getUniformLocation(this.program, name) ?? Error(`Could not find uniform matrix [${name}]`),
      data: data
    };
  }

  /**
   * Add a uniform array of numbers to the shader
   * @param name Name of the uniform in the shader source
   * @param data List of numbers
   */
  public addUniformIntegerArray(name: string, data: number[]) {
    if (!data) {
      throw Error(`Shader Uniform Integery Array '${name}' was set to null or undefined`);
    }
    const gl = this._gl;
    this.uniforms[name] = {
      name,
      type: '1iv',
      location: gl.getUniformLocation(this.program, name) ?? Error(`Could not find uniform matrix [${name}]`),
      data: data
    };
  }

  public addUniformInteger(name: string, data: number) {
    if (!data) {
      throw Error(`Shader Uniform Integery Array '${name}' was set to null or undefined`);
    }
    const gl = this._gl;
    this.uniforms[name] = {
      name,
      type: '1i',
      location: gl.getUniformLocation(this.program, name) ?? Error(`Could not find uniform [${name}]`),
      data: data
    };
  }


  public addUniformFloat(name: string, float: number = 0) {
    const gl = this._gl;
    this.uniforms[name] = {
      name,
      type: '1f',
      location: gl.getUniformLocation(this.program, name) ?? Error(`Could not find uniform [${name}]`),
      data: float
    };
  }

  public addUniformFloat2(name: string, float1: number = 0, float2: number = 0) {
    const gl = this._gl;
    this.uniforms[name] = {
      name,
      type: '2f',
      location: gl.getUniformLocation(this.program, name) ?? Error(`Could not find uniform [${name}]`),
      data: [float1, float2]
    };
  }

  /**
   * Optionally override attributes parameters
   * @param name Name of the attribute in the shader source
   * @param size The size of the attribute in gl.Type units, for example `vec2 a_pos` would be 2 gl.FLOAT, or 1 gl.FLOAT_VEC2
   * @param glType The gl.Type of the attribute
   * @param normalized Optionally set normalized which means between 0 and 1
   */
  public setAttribute(name: string, size: number, glType: number, normalized = false) {
    const gl = this._gl;
    // TODO needs to be compiled first
    const location = gl.getAttribLocation(this.program, name);
    this.attributes[name] = {
      name,
      size,
      glType,
      normalized,
      location
    };
  }

  /**
   * Number of javascript floats a vertex will take up
   */
  public get vertexAttributeSize(): number {
    let vertexSize = 0;
    for (const vert of this.layout) {
      vertexSize += vert.size;
    }
    return vertexSize;
  }

  /**
   * Total number of bytes that the vertex will take up
   */
  public get totalVertexSizeBytes(): number {
    let vertexSize = 0;
    for (const vert of this.layout) {
      let typeSize = 1;
      switch (vert.glType) {
        case this._gl.FLOAT: {
          typeSize = 4;
          break;
        }
        case this._gl.SHORT: {
          typeSize = 2;
          break;
        }
        default: {
          typeSize = 1;
        }
      }
      vertexSize += typeSize * vert.size;
    }

    return vertexSize;
  }

  public getAttribPointerTypeFromAttributeType(type: number) {
    switch(type) {
      case this._gl.LOW_FLOAT:
      case this._gl.HIGH_FLOAT:
      case this._gl.FLOAT:
      case this._gl.FLOAT_VEC2:
      case this._gl.FLOAT_VEC3:
      case this._gl.FLOAT_VEC4:
      case this._gl.FLOAT_MAT2:
      case this._gl.FLOAT_MAT3:
      case this._gl.FLOAT_MAT4:
        return this._gl.FLOAT;
      case this._gl.BYTE:
        return this._gl.BYTE;
      case this._gl.UNSIGNED_BYTE:
        return this._gl.UNSIGNED_BYTE;
      case this._gl.SHORT:
        return this._gl.SHORT;
      default:
        return this._gl.FLOAT;
    }
  }

  public getAttribPointerSizeFromFromAttributeType(type: number) {
    switch(type) {
      case this._gl.LOW_FLOAT:
      case this._gl.HIGH_FLOAT:
      case this._gl.FLOAT:
        return 1;
      case this._gl.FLOAT_VEC2:
        return 2;
      case this._gl.FLOAT_VEC3:
        return 3;
      case this._gl.FLOAT_VEC4:
        return 4;
      case this._gl.BYTE:
        return 1;
      case this._gl.UNSIGNED_BYTE:
        return 1;
      case this._gl.SHORT:
        return 1;
      default:
        return 1;
    }
  }

  /**
   * Get a previously defined attribute size in bytes
   * @param name
   */
  public getAttributeSize(name: string) {
    let typeSize = 1;
    switch (this.attributes[name].glType) {
      case this._gl.LOW_FLOAT:
      case this._gl.HIGH_FLOAT:
      case this._gl.FLOAT: {
        typeSize = 4; // 32 bit - 4 bytes
        break;
      }
      case this._gl.FLOAT_VEC2: {
        typeSize = 4 * 2;
        break;
      }
      case this._gl.FLOAT_VEC3: {
        typeSize = 4 * 3;
        break;
      }
      case this._gl.FLOAT_VEC4: {
        typeSize = 4 * 4;
        break;
      }
      case this._gl.FLOAT_MAT2: {
        typeSize = 4 * 4; // 2x2 = 4 floats
        break;
      }
      case this._gl.FLOAT_MAT3: {
        typeSize = 4 * 9; // 3x3 = 9 floats
        break;
      }
      case this._gl.FLOAT_MAT4: {
        typeSize = 4 * 16; // 4x4 = 16 floats
        break;
      }
      case this._gl.BYTE: {
        typeSize = 1; //
        break;
      }
      case this._gl.INT: {
        typeSize = 4; //
        break;
      }
      case this._gl.SHORT: {
        typeSize = 2; //
        break;
      }
      case this._gl.INT_VEC2: {
        typeSize = 4 * 2; //
        break;
      }
      case this._gl.INT_VEC3: {
        typeSize = 4 * 3; //
        break;
      }
      case this._gl.INT_VEC4: {
        typeSize = 4 * 3; //
        break;
      }
      case this._gl.UNSIGNED_INT: {
        typeSize = 4; //
        break;
      }
      default: {
        typeSize = 1; // 1 byte
      }
    }
    return typeSize * this.attributes[name].size;
  }

  /**
   * Sets this shader program as the current in the underlying webgl context
   *
   * **Must** specify all attributes and uniforms before calling this
   */
  public use() {
    const gl = this._gl;
    gl.useProgram(this.program);

    // Setup the vertex attribute pointerfor the shader
    let offset = 0;
    for (const vert of this.layout) {
      gl.vertexAttribPointer(vert.location, vert.size, vert.glType, vert.normalized, this.totalVertexSizeBytes, offset);
      gl.enableVertexAttribArray(vert.location);
      offset += this.getAttributeSize(vert.name);
    }
    // TODO all uniform types
    // Setup uniforms for the shader
    for (const key in this.uniforms) {
      const uniform = this.uniforms[key];
      switch (uniform.type) {
        case 'matrix4fv': {
          gl.uniformMatrix4fv(uniform.location, false, uniform.data);
          break;
        }
        case '1iv': {
          gl.uniform1iv(uniform.location, uniform.data);
          break;
        }
        case '1i': {
          gl.uniform1i(uniform.location, uniform.data);
          break;
        }
        case '2f': {
          gl.uniform2f(uniform.location, uniform.data[0], uniform.data[1]);
          break;
        }
        case '1f': {
          gl.uniform1f(uniform.location, uniform.data);
          break;
        }
      }
    }
  }
}
