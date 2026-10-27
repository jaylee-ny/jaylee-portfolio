import test from "node:test";
import assert from "node:assert/strict";
import { PocketCalculator } from "../dist/calculator.js";

function calculate(keys) {
  const calculator = new PocketCalculator();
  for (const key of keys) calculator.press(key);
  return calculator.display;
}

test("calculator handles decimal precision, errors, repeated equals and fresh input", () => {
  assert.equal(calculate(["0", ".", "1", "+", "0", ".", "2", "="]), "0.3");
  assert.equal(calculate(["9", "÷", "0", "="]), "Error");
  assert.equal(calculate(["9", "÷", "0", "=", "4"]), "4");
  assert.equal(calculate(["2", "+", "3", "=", "=", "="]), "11");
  assert.equal(calculate(["2", "+", "3", "=", "4", "="]), "4");
  assert.equal(calculate(["2", "×", "±", "3", "="]), "-6");
  assert.equal(calculate(["±", "0", ".", "5", "+", "1", "="]), "0.5");
  assert.equal(
    calculate(["0", ".", "0", "0", "0", "0", "0", "1", "%", "5"]),
    "5",
  );
  assert.equal(calculate(["2", "+", "3", "×", "4", "="]), "20");
  assert.equal(calculate(["8", "+", "−", "3", "="]), "5");
});
