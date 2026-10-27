import { pages } from "./pages.js";
import { select, selectAll } from "./dom.js";

const sections = [
  ["about", "About"],
  ["experience", "Experience"],
  ["projects", "Projects"],
  ["contact", "Contact"],
  ["resume", "Résumé"],
];

export function initializeShowcase(root) {
  const navigation = select("#section-list", root);
  const content = select("#showcase-content", root);
  let currentSection = "about";

  function showSection(page) {
    const section = sections.find(([id]) => id === page);
    if (!section) return;
    currentSection = page;
    content.innerHTML = pages[page]();
    content.scrollTop = 0;
    content.setAttribute("aria-label", section[1]);
    for (const button of selectAll("[data-section]", navigation)) {
      if (button.dataset.section === page)
        button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    select("#desktop-status", root).textContent =
      `${section[1]} section opened.`;
  }

  navigation.innerHTML = sections
    .map(
      ([id, label]) =>
        `<button type="button" data-section="${id}">${label}</button>`,
    )
    .join("");
  navigation.addEventListener("click", (event) => {
    const button = event.target.closest("[data-section]");
    if (button) showSection(button.dataset.section);
  });
  content.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (button) showSection(button.dataset.page);
  });
  showSection(currentSection);
  return {
    get currentSection() {
      return currentSection;
    },
  };
}
