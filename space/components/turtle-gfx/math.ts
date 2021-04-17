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
};

function degreesToRadians(rotation: Euler3Deg): Euler3Rad {
  return {
    yaw: rotation.yaw / 180 * Math.PI,
    pitch: rotation.pitch / 180 * Math.PI,
    roll: rotation.roll / 180 * Math.PI,
  };
}

function eulerToQuaternion(rotation: Euler3Rad): Quat {
  let yaw = rotation.yaw;
  let pitch = rotation.pitch;
  let roll = rotation.roll;

  let cy = Math.cos(yaw * 0.5);
  let sy = Math.sin(yaw * 0.5);
  let cp = Math.cos(pitch * 0.5);
  let sp = Math.sin(pitch * 0.5);
  let cr = Math.cos(roll * 0.5);
  let sr = Math.sin(roll * 0.5);

  let w = cp * cr * cy + sp * sr * sy;
  let x = -cp * sr * sy + cr * cy * sp;
  let y = cp * cr * sy + cy * sp * sr;
  let z = cp * cy * sr - cr * sp * sy;

  return { w, x, y, z };
}

function getDirectionVector(rotation: Euler3Rad): Vec3 {
  let cy = Math.cos(rotation.yaw);
  let sy = Math.sin(rotation.yaw);
  let cp = Math.cos(rotation.pitch);
  let sp = Math.sin(rotation.pitch);
  let cr = Math.cos(rotation.roll);
  let sr = Math.sin(rotation.roll);

  let dx = cr * sy + cy * sp * sr;
  let dy = -cr * cy * sp + sr * sy;
  let dz = cp * cy;

  return new Vec3(dx, dy, dz);
}

function composeQuat(l: Quat, r: Quat): Quat {
  let w = l.w * r.w - l.x * r.x - l.y * r.y - l.z * r.z;
  let x = l.w * r.x + l.x * r.w + l.y * r.z - l.z * r.y;
  let y = l.w * r.y - l.x * r.z + l.y * r.w + l.z * r.x;
  let z = l.w * r.z + l.x * r.y - l.y * r.x + l.z * r.w;
  return { w, x, y, z };
}

class Vec3 {
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

  addScaled(scalar: number, other: Vec3): Vec3 {
    return this.add(other.scale(scalar));
  }

  toObject() {
    return { x: this.x, y: this.y, z: this.z };
  }
}

module.exports = {
  degreesToRadians,
  eulerToQuaternion,
  getDirectionVector,
  composeQuat,
  Vec3,
};