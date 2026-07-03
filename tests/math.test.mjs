import test from "node:test";
import assert from "node:assert/strict";
import { clamp, circleRectOverlap, distance, rectsOverlap } from "../src/core/math.js";

test("clamp constrains a number to a range", () => {
  assert.equal(clamp(4, 0, 10), 4);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(11, 0, 10), 10);
});

test("distance returns euclidean distance", () => {
  assert.equal(distance(0, 0, 3, 4), 5);
});

test("rectsOverlap detects rectangle collision", () => {
  assert.equal(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 10, h: 10 }), true);
  assert.equal(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 10, h: 10 }), false);
});

test("circleRectOverlap detects pellet-style hits", () => {
  assert.equal(circleRectOverlap(8, 8, 3, { x: 0, y: 0, w: 10, h: 10 }), true);
  assert.equal(circleRectOverlap(30, 30, 3, { x: 0, y: 0, w: 10, h: 10 }), false);
});
