export type Euler3Rad = {
  yaw: number,
  pitch: number,
  roll: number,
};

export type Euler3Deg = {
  yaw: number,
  pitch: number,
  roll: number,
};

export type Euler3 = Euler3Rad;

export interface Quat {
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface Color {
  r: number,
  g: number,
  b: number,
  a: number,
}

export function degreesToRadians(rotation: Euler3Deg): Euler3Rad {
  return {
    yaw: rotation.yaw / 180 * Math.PI,
    pitch: rotation.pitch / 180 * Math.PI,
    roll: rotation.roll / 180 * Math.PI,
  };
}

function normalize(q: Quat): Quat {
  const norm = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);

  return {
    w: q.w / norm,
    x: q.x / norm,
    y: q.y / norm,
    z: q.z / norm
  };
}

export function quaternionFromVectorTo(vecSource: Vec3, vecTarget: Vec3): Quat {
  const d = dot(vecSource, vecTarget);

  if(d >= 0.999) {
    return { w: 1, x: 0, y: 0, z: 0 };
  }

  if(d <= -0.999) {
    return { w: 0, x: 0, y: 1, z: 0 };
  }
  
  const axis = cross(vecSource, vecTarget);
  const w = d + Math.sqrt(vecSource.lengthSq() * vecTarget.lengthSq());

  const Q = {
    w: w,
    x: axis.x,
    y: axis.y,
    z: axis.z
  };

  return normalize(Q);
}

export function eulerToQuaternion(rotation: Euler3Rad): Quat {
  const vecTarget = getDirectionVector(rotation);
  const vecSource = new Vec3(1, 0, 0);

  return quaternionFromVectorTo(vecSource, vecTarget);
}

export function getDirectionVector(rotation: Euler3Rad): Vec3 {
  let cy = Math.cos(rotation.yaw);
  let sy = Math.sin(rotation.yaw);
  let cp = Math.cos(rotation.pitch);
  let sp = Math.sin(rotation.pitch);
  let cr = Math.cos(rotation.roll);
  let sr = Math.sin(rotation.roll);

  let dx = cp * cy;
  let dy = cr*cy*sp - sr*sy;
  let dz = cr*sy + cy*sp*sr;

  return new Vec3(dx, dy, dz);
}

export function composeQuat(l: Quat, r: Quat): Quat {
  let w = l.w * r.w - l.x * r.x - l.y * r.y - l.z * r.z;
  let x = l.w * r.x + l.x * r.w + l.y * r.z - l.z * r.y;
  let y = l.w * r.y - l.x * r.z + l.y * r.w + l.z * r.x;
  let z = l.w * r.z + l.x * r.y - l.y * r.x + l.z * r.w;
  return { w, x, y, z };
}

/**
 * Decodes a hex-encoded color into an RGBA object.
 * @param {string} hexStr Hex-encoded color, like #FF1212 or #FFF.
 * @returns {Color} An RGBA color.
 */
export function decodeHexColor(hexStr: string): Color {
  let R, G, B;

  if(hexStr.length == 4) {
    const pattern = /^#(?<R>[a-z0-9])(?<G>[a-z0-9])(?<B>[a-z0-9])$/gi;
    const result = pattern.exec(hexStr);
    R = parseInt(result.groups.R + result.groups.R, 16);
    G = parseInt(result.groups.G + result.groups.G, 16);
    B = parseInt(result.groups.B + result.groups.B, 16);
  } else if(hexStr.length == 7) {
    const pattern = /^#(?<R>[a-z0-9]{2})(?<G>[a-z0-9]{2})(?<B>[a-z0-9]{2})$/gi;
    const result = pattern.exec(hexStr);
    R = parseInt(result.groups.R, 16);
    G = parseInt(result.groups.G, 16);
    B = parseInt(result.groups.B, 16);
  }

  return { r: R / 255, g: G / 255, b: B / 255, a: 1 };
}

function dot(lhs: Vec3, rhs: Vec3): number {
  return lhs.x * rhs.x + lhs.y * rhs.y + lhs.z * rhs.z;
}

function cross(lhs: Vec3, rhs: Vec3): Vec3 {
  return new Vec3(
    lhs.y * rhs.z - lhs.z * rhs.y,
    lhs.z * rhs.x - lhs.x * rhs.z,
    lhs.x * rhs.y - lhs.y * rhs.x
  );
}

export class Vec3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  scale(scalar: number): Vec3 {
    return new Vec3(scalar * this.x, scalar * this.y, scalar * this.z);
  }

  add(other: Vec3): Vec3 {
    return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  subtract(other: Vec3): Vec3 {
    return new Vec3(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  addScaled(scalar: number, other: Vec3): Vec3 {
    return this.add(other.scale(scalar));
  }

  toObject() {
    return { x: this.x, y: this.y, z: this.z };
  }

  lengthSq() : number {
    return dot(this, this);
  }

  normalized() : Vec3 {
    const norm = Math.sqrt(this.lengthSq());
    return this.scale(1 / norm);
  }

  static fromObject(object: {x: number, y: number, z: number}): Vec3 {
    return new Vec3(object.x, object.y, object.z);
  }
}
