import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Avatar from "../Avatar";

// Mock Icons
vi.mock("../Icons", () => ({
    Icons: {
        userProfile: ({ className }: { className?: string }) => <div data-testid="icon-user-profile" className={className} />,
        hashtag: ({ className }: { className?: string }) => <div data-testid="icon-hashtag" className={className} />,
    },
}));

describe("Avatar", () => {
    it("renders image when imageUrl is provided", () => {
        render(<Avatar imageUrl="http://example.com/avatar.png" />);
        const img = screen.getByRole("img");
        expect(img).toHaveAttribute("src", "http://example.com/avatar.png");
        expect(img).toHaveAttribute("alt", "avathar");
    });

    it("renders user icon when isUser is true and no imageUrl", () => {
        render(<Avatar isUser={true} />);
        expect(screen.getByTestId("icon-user-profile")).toBeInTheDocument();
    });

    it("renders hashtag icon when isUser is false and no imageUrl", () => {
        render(<Avatar isUser={false} />);
        expect(screen.getByTestId("icon-hashtag")).toBeInTheDocument();
    });

    it("defaults isUser to false", () => {
        render(<Avatar />);
        expect(screen.getByTestId("icon-hashtag")).toBeInTheDocument();
    });
});
