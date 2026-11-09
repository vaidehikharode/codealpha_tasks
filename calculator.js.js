const display = document.getElementById("display");
const resultOutput = document.getElementById("result");
const message = document.getElementById("message");
const keypad = document.querySelector(".keypad");

let justCalculated = false;

// Convert calculator symbols into operators understood by the parser.
function normaliseExpression(value) {
  return value
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replaceAll("−", "-")
    .replace(/\s+/g, "");
}

// A small arithmetic parser: supports +, -, *, /, %, decimals and parentheses.
// It avoids eval() and Function().
function evaluateExpression(source) {
  let index = 0;

  function peek() {
    return source[index];
  }

  function consume(char) {
    if (peek() === char) {
      index++;
      return true;
    }
    return false;
  }

  function parseExpression() {
    let value = parseTerm();

    while (true) {
      if (consume("+")) {
        value += parseTerm();
      } else if (consume("-")) {
        value -= parseTerm();
      } else {
        break;
      }
    }
    return value;
  }

  function parseTerm() {
    let value = parseUnary();

    while (true) {
      if (consume("*")) {
        value *= parseUnary();
      } else if (consume("/")) {
        const divisor = parseUnary();
        if (divisor === 0) throw new Error("Cannot divide by zero");
        value /= divisor;
      } else if (consume("%")) {
        const divisor = parseUnary();
        if (divisor === 0) throw new Error("Cannot divide by zero");
        value %= divisor;
      } else {
        break;
      }
    }
    return value;
  }

  function parseUnary() {
    if (consume("+")) return parseUnary();
    if (consume("-")) return -parseUnary();
    return parsePrimary();
  }

  function parsePrimary() {
    if (consume("(")) {
      const value = parseExpression();
      if (!consume(")")) throw new Error("Missing closing bracket");
      return value;
    }

    const start = index;
    let hasDigit = false;

    while (/[0-9]/.test(peek() || "")) {
      index++;
      hasDigit = true;
    }

    if (consume(".")) {
      while (/[0-9]/.test(peek() || "")) {
        index++;
        hasDigit = true;
      }
    }

    if (!hasDigit) throw new Error("Enter a valid expression");

    const number = Number(source.slice(start, index));
    if (!Number.isFinite(number)) throw new Error("Invalid number");
    return number;
  }

  if (!source) throw new Error("Type a calculation");

  const result = parseExpression();

  if (index !== source.length) {
    throw new Error("Check the expression");
  }

  if (!Number.isFinite(result)) throw new Error("Result is not finite");
  return result;
}

function formatResult(number) {
  return Number(number.toPrecision(12)).toLocaleString("en-US", {
    maximumFractionDigits: 10,
    useGrouping: false
  });
}

function showPreview() {
  const source = normaliseExpression(display.value);

  if (!source) {
    resultOutput.textContent = "0";
    message.textContent = "Type or tap to calculate";
    message.classList.remove("error");
    return;
  }

  try {
    const answer = evaluateExpression(source);
    resultOutput.textContent = formatResult(answer);
    message.textContent = "Live result";
    message.classList.remove("error");
  } catch (error) {
    resultOutput.textContent = "—";
    message.textContent = error.message;
    message.classList.add("error");
  }
}

function insertValue(value) {
  if (justCalculated && /[0-9.(]/.test(value)) {
    display.value = "";
  }
  justCalculated = false;

  const start = display.selectionStart ?? display.value.length;
  const end = display.selectionEnd ?? display.value.length;
  display.value =
    display.value.slice(0, start) + value + display.value.slice(end);

  const cursor = start + value.length;
  display.focus();
  display.setSelectionRange(cursor, cursor);
  showPreview();
}

function clearDisplay() {
  display.value = "";
  justCalculated = false;
  showPreview();
  display.focus();
}

function deleteLast() {
  const start = display.selectionStart ?? display.value.length;
  const end = display.selectionEnd ?? display.value.length;

  if (start !== end) {
    display.value = display.value.slice(0, start) + display.value.slice(end);
    display.setSelectionRange(start, start);
  } else if (start > 0) {
    display.value =
      display.value.slice(0, start - 1) + display.value.slice(start);
    display.setSelectionRange(start - 1, start - 1);
  }

  justCalculated = false;
  showPreview();
  display.focus();
}

function calculate() {
  try {
    const answer = evaluateExpression(normaliseExpression(display.value));
    const formatted = formatResult(answer);
    display.value = formatted;
    resultOutput.textContent = formatted;
    message.textContent = "Calculation complete";
    message.classList.remove("error");
    justCalculated = true;
    display.focus();
    display.setSelectionRange(display.value.length, display.value.length);
  } catch (error) {
    resultOutput.textContent = "—";
    message.textContent = error.message;
    message.classList.add("error");
  }
}

keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.action === "clear") {
    clearDisplay();
  } else if (button.dataset.action === "delete") {
    deleteLast();
  } else if (button.dataset.action === "equals") {
    calculate();
  } else if (button.dataset.value) {
    insertValue(button.dataset.value);
  }
});

// Typing directly into the display updates the preview.
display.addEventListener("input", () => {
  justCalculated = false;
  showPreview();
});

// Keyboard shortcuts: Enter/= calculate, Escape clear, Backspace delete.
display.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    calculate();
  } else if (event.key === "Escape") {
    event.preventDefault();
    clearDisplay();
  }
});

// Keep keyboard support available even when a keypad button has focus.
document.addEventListener("keydown", (event) => {
  if (event.target === display) return;

  if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    calculate();
  } else if (event.key === "Escape") {
    clearDisplay();
  } else if (event.key === "Backspace") {
    event.preventDefault();
    deleteLast();
  } else if (/^[0-9.+\-*/%()]$/.test(event.key)) {
    insertValue(event.key);
  }
});

showPreview();