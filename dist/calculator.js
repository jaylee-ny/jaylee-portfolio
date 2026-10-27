const operators = new Set(["+", "−", "×", "÷"]);

export class PocketCalculator {
  constructor() {
    this.clear();
  }

  clear() {
    this.display = "0";
    this.value = null;
    this.operator = null;
    this.fresh = true;
    this.last = null;
    this.expression = "";
  }

  format(number) {
    return Number.isFinite(number)
      ? String(Number(number.toPrecision(12)))
      : "Error";
  }

  compute(a, b, operator) {
    switch (operator) {
      case "+":
        return a + b;
      case "−":
        return a - b;
      case "×":
        return a * b;
      case "÷":
        return b === 0 ? NaN : a / b;
      default:
        return b;
    }
  }

  enterDigit(key) {
    if (this.fresh) {
      this.display = key === "." ? "0." : key;
      this.fresh = false;
      if (!this.operator) {
        this.last = null;
        this.expression = "";
      }
      return;
    }
    if (key === ".") {
      if (!this.display.includes(".") && !this.display.includes("e"))
        this.display += ".";
      return;
    }
    if (this.display.replace(/[-.]/g, "").length >= 12) return;
    if (this.display === "0") this.display = key;
    else if (this.display === "-0") this.display = "-" + key;
    else this.display += key;
  }

  setOperator(key) {
    if (this.operator && !this.fresh) {
      this.display = this.format(
        this.compute(this.value, Number(this.display), this.operator),
      );
    }
    if (this.display === "Error") {
      this.operator = null;
      this.expression = "";
      return;
    }
    this.value = Number(this.display);
    this.operator = key;
    this.fresh = true;
    this.last = null;
    this.expression = this.display + " " + key;
  }

  equals() {
    const operator = this.operator || this.last?.operator;
    if (!operator) return;
    const right = this.operator ? Number(this.display) : this.last.value;
    const left = this.operator ? this.value : Number(this.display);
    this.expression = `${this.format(left)} ${operator} ${this.format(right)} =`;
    this.display = this.format(this.compute(left, right, operator));
    this.last = { operator, value: right };
    this.operator = null;
    this.value = null;
    this.fresh = true;
  }

  press(key) {
    if (key === "C") {
      this.clear();
      return;
    }
    if (this.display === "Error") this.clear();
    if (/^\d$/.test(key) || key === ".") {
      this.enterDigit(key);
      return;
    }
    if (operators.has(key)) {
      this.setOperator(key);
      return;
    }
    if (key === "=") {
      this.equals();
      return;
    }
    if (key === "⌫" && !this.fresh) {
      this.display = this.display.slice(0, -1);
      if (!this.display || this.display === "-") this.display = "0";
    }
    if (key === "±") {
      if (this.fresh && this.operator) this.display = "0";
      this.display = this.display.startsWith("-")
        ? this.display.slice(1)
        : "-" + this.display;
      this.fresh = false;
      if (!this.operator) {
        this.last = null;
        this.expression = "";
      }
    }
    if (key === "%") {
      this.display = this.format(Number(this.display) / 100);
      this.fresh = true;
      this.last = null;
    }
  }
}
