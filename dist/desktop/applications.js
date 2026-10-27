const svg = (paths) =>
  `<svg viewBox="0 0 32 32" aria-hidden="true" shape-rendering="crispEdges">${paths}</svg>`;
export const applications = {
  showcase: {
    name: "Showcase",
    width: 910,
    height: 690,
    icon: svg(
      '<path d="M3 7h12l3 4h11v17H3z" fill="#dcae56" stroke="#354039" stroke-width="2"/><path d="M7 4h17v20H7z" fill="#fff7da" stroke="#354039"/><path d="M3 13h27l-3 15H3z" fill="#ebc572" stroke="#354039"/><path d="M10 8h10M10 11h7" stroke="#71888b"/>',
    ),
  },
  calculator: {
    name: "Calculator",
    width: 310,
    height: 430,
    icon: svg(
      '<path d="M6 2h21v28H6z" fill="#d6d7c5" stroke="#354039" stroke-width="2"/><path d="M9 5h15v7H9z" fill="#94af93" stroke="#354039"/><path d="M9 15h3v3H9zm6 0h3v3h-3zm6 0h3v3h-3zM9 21h3v3H9zm6 0h3v3h-3z" fill="#446f87"/><path d="M21 21h3v6h-3z" fill="#bc7165"/>',
    ),
  },
  paint: {
    name: "Paint",
    width: 780,
    height: 570,
    icon: svg(
      '<path d="M4 5h23v24H4z" fill="#fff7da" stroke="#354039" stroke-width="2"/><path d="M7 20h16v5H7z" fill="#8fae9b"/><path d="M6 12h9v6H6z" fill="#da9e72"/><path d="m12 22 2-7L26 2l4 4-13 13z" fill="#d7aa60" stroke="#354039"/><path d="m12 22 2-7 4 4z" fill="#345d80"/>',
    ),
  },
  notepad: {
    name: "Notepad",
    width: 610,
    height: 490,
    icon: svg(
      '<path d="M7 3h21v26H7z" fill="#fff5cd" stroke="#354039" stroke-width="2"/><path d="M5 7h5M5 12h5M5 17h5M5 22h5" stroke="#82948a" stroke-width="2"/><path d="M13 10h11M13 15h11M13 20h8" stroke="#7b9baf"/><path d="M7 3h21v3H7z" fill="#b76f60"/>',
    ),
  },
};
