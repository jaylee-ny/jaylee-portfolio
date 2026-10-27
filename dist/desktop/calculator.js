import { PocketCalculator } from "../calculator.js";
import { select, selectAll } from "./dom.js";

const keys = [
  "C",
  "±",
  "%",
  "÷",
  "7",
  "8",
  "9",
  "×",
  "4",
  "5",
  "6",
  "−",
  "1",
  "2",
  "3",
  "+",
  "⌫",
  "0",
  ".",
  "=",
];
const names = {
  C: "Clear",
  "±": "Change sign",
  "%": "Percent",
  "÷": "Divide",
  "×": "Multiply",
  "−": "Subtract",
  "+": "Add",
  "⌫": "Backspace",
  ".": "Decimal point",
  "=": "Equals",
};
const shortcuts = {
  Enter: "=",
  Backspace: "⌫",
  Delete: "C",
  c: "C",
  "*": "×",
  "/": "÷",
  "-": "−",
  ",": ".",
};

export function initializeCalculator(root, host, isActive) {
  const calculator = new PocketCalculator();
  const keypad = select("#calculator-keys", root);
  const display = select("#calculator-display", root);
  const expression = select("#calculation", root);
  function calculate(key) {
    calculator.press(key);
    display.textContent = calculator.display;
    expression.textContent = calculator.expression;
  }
  keypad.innerHTML = keys
    .map(
      (key) =>
        `<button type="button" data-key="${key}" aria-label="${names[key] || key}">${key}</button>`,
    )
    .join("");
  for (const button of selectAll("[data-key]", keypad)) {
    button.addEventListener("click", () => calculate(button.dataset.key));
  }
  host.addEventListener("keydown", (event) => {
    if (
      !isActive() ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.target?.closest("textarea,input,select")
    )
      return;
    const key = shortcuts[event.key] || event.key;
    if (!keys.includes(key)) return;
    event.preventDefault();
    calculate(key);
  });
}
