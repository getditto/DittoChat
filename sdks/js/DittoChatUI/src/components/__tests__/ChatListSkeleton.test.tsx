import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ChatListSkeleton from "../ChatListSkeleton";

describe("ChatListSkeleton", () => {
    it("renders skeleton structure", () => {
        const { container } = render(<ChatListSkeleton />);

        expect(container.firstChild).toHaveClass("animate-pulse");

        expect(container.querySelector("header")).toBeInTheDocument();

        const listItems = container.querySelectorAll(".px-4.py-3");
        expect(listItems).toHaveLength(6);
    });
});
