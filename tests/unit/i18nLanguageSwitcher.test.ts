import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { I18nProvider, LanguageSwitcher } from "@/lib/i18n";

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("locale", "zh");
  });

  it("exposes the locale select with an accessible name", () => {
    render(createElement(I18nProvider, {}, createElement(LanguageSwitcher)));

    expect(screen.getByRole("combobox", { name: "语言" })).toBeInTheDocument();
  });
});
