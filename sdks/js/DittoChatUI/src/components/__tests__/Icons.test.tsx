import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Icons } from "../Icons";

describe("Icons", () => {
    const iconNames = Object.keys(Icons) as Array<keyof typeof Icons>;

    iconNames.forEach((iconName) => {
        it(`renders ${iconName} icon`, () => {
            const IconComponent = Icons[iconName];
            const { container } = render(<IconComponent className="test-class" />);
            const svg = container.querySelector("svg");
            expect(svg).toBeInTheDocument();
            expect(svg).toHaveClass("test-class");
        });
    });
});
