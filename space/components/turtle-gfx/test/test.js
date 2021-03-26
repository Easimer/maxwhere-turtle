/* global describe it */
const assert = require('assert');
const chai = require('chai');
const math = require('../math');

function expectVectorToBeCloseTo(actual, expected, error) {
  chai.expect(actual.x).to.be.closeTo(expected.x, error);
  chai.expect(actual.y).to.be.closeTo(expected.y, error);
  chai.expect(actual.z).to.be.closeTo(expected.z, error);
}

describe('math', () => {
  describe('degreesToRadians', () => {
    it('zero degrees', () => {
      const rot = { yaw: 0, pitch: 0, roll: 0 };
      const result = math.degreesToRadians(rot);
      assert.deepStrictEqual(result, rot);
    });
    it('90 deg yaw', () => {
      const input = { yaw: 90, pitch: 0, roll: 0 };
      const expected = { yaw: Math.PI / 2, pitch: 0, roll: 0 };
      const result = math.degreesToRadians(input);
      assert.deepStrictEqual(result, expected);
    });
    it('90 deg pitch', () => {
      const input = { yaw: 0, pitch: 90, roll: 0 };
      const expected = { yaw: 0, pitch: Math.PI / 2, roll: 0 };
      const result = math.degreesToRadians(input);
      assert.deepStrictEqual(result, expected);
    });
    it('90 deg roll', () => {
      const input = { yaw: 0, pitch: 0, roll: 90 };
      const expected = { yaw: 0, pitch: 0, roll: Math.PI / 2 };
      const result = math.degreesToRadians(input);
      assert.deepStrictEqual(result, expected);
    });
    it('multi', () => {
      const input = { yaw: -180, pitch: 90, roll: 270 };
      const expected = { yaw: -Math.PI, pitch: Math.PI / 2, roll: 3 * Math.PI / 2 };
      const result = math.degreesToRadians(input);
      assert.deepStrictEqual(result, expected);
    });
  });

  describe('eulerToQuaternion', () => {
    it('identity', () => {
      const input = { yaw: 0, pitch: 0, roll: 0 };
      const expected = { w: 1, x: 0, y: 0, z: 0 };
      const result = math.eulerToQuaternion(input);
      assert.deepStrictEqual(expected, result);
    });
    it('yaw 90deg is 90degs around Y-axis', () => {
      const input = { yaw: Math.PI / 2, pitch: 0, roll: 0 };
      const expected = { w: 0.7071067811865476, x: 0, y: 0.7071067811865475, z: 0 };
      const result = math.eulerToQuaternion(input);
      assert.deepStrictEqual(expected, result);
    });
    it('pitch 90deg is 90degs around X-axis', () => {
      const input = { yaw: 0, pitch: Math.PI / 2, roll: 0 };
      const expected = { w: 0.7071067811865476, x: 0.7071067811865475, y: 0, z: 0 };
      const result = math.eulerToQuaternion(input);
      assert.deepStrictEqual(expected, result);
    });
    it('roll 90deg is 90degs around Z-axis', () => {
      const input = { yaw: 0, pitch: 0, roll: Math.PI / 2 };
      const expected = { w: 0.7071067811865476, x: 0, y: 0, z: 0.7071067811865475 };
      const result = math.eulerToQuaternion(input);
      assert.deepStrictEqual(expected, result);
    });
  });

  describe('composeQuat', () => {
    it('identity * identity', () => {
      const lhs = { w: 1, x: 0, y: 0, z: 0 };
      const result = math.composeQuat(lhs, lhs);
      assert.deepStrictEqual(result, lhs);
    });
    it('any * identity', () => {
      const lhs = { w: 0.707, x: 0, y: 0.707, z: 0 };
      const rhs = { w: 1, x: 0, y: 0, z: 0 };
      const result = math.composeQuat(lhs, rhs);
      assert.deepStrictEqual(result, lhs);
    });
    it('any * any', () => {
      const lhs = { w: -1, x: 2, y: -3, z: 4 };
      const rhs = { w: 5, x: -6, y: 7, z: -8 };
      const expected = { w: 60, x: 12, y: -30, z: 24 };
      const result = math.composeQuat(lhs, rhs);
      assert.deepStrictEqual(result, expected);
    });
  });

  describe('getDirectionVector', () => {
    it('identity', () => {
      const input = { yaw: 0, pitch: 0, roll: 0 };
      const expected = { x: 0, y: 0, z: 1 };
      const result = math.getDirectionVector(input);
      expectVectorToBeCloseTo(result, expected, 0.001);
    });
    it('yaw +90', () => {
      const input = { yaw: Math.PI / 2, pitch: 0, roll: 0 };
      const expected = { x: 1, y: 0, z: 0 };
      const result = math.getDirectionVector(input);
      expectVectorToBeCloseTo(result, expected, 0.001);
    });
    it('yaw +180', () => {
      const input = { yaw: Math.PI, pitch: 0, roll: 0 };
      const expected = { x: 0, y: 0, z: -1 };
      const result = math.getDirectionVector(input);
      expectVectorToBeCloseTo(result, expected, 0.001);
    });
    it('pitch +90', () => {
      const input = { yaw: 0, pitch: Math.PI / 2, roll: 0 };
      const expected = { x: 0, y: -1, z: 0 };
      const result = math.getDirectionVector(input);
      expectVectorToBeCloseTo(result, expected, 0.001);
    });
    it('pitch +180', () => {
      const input = { yaw: 0, pitch: Math.PI, roll: 0 };
      const expected = { x: 0, y: 0, z: -1 };
      const result = math.getDirectionVector(input);
      expectVectorToBeCloseTo(result, expected, 0.001);
    });
    it('pitch +90', () => {
      const input = { yaw: 0, pitch: 3 * Math.PI / 2, roll: 0 };
      const expected = { x: 0, y: 1, z: 0 };
      const result = math.getDirectionVector(input);
      expectVectorToBeCloseTo(result, expected, 0.001);
    });
    it('roll does nothing', () => {
      const input = { yaw: 0, pitch: 0, roll: 3 * Math.PI / 2 };
      const expected = { x: 0, y: 0, z: 1 };
      const result = math.getDirectionVector(input);
      expectVectorToBeCloseTo(result, expected, 0.001);
    });
  });
});