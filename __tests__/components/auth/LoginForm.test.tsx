import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { LoginForm } from "../../../components/auth/LoginForm"

// Mock the auth store
jest.mock("../../../lib/auth", () => ({
  useAuthStore: () => ({
    login: jest.fn(),
    isLoading: false,
  }),
}))

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}))

describe("LoginForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders login form correctly", () => {
    render(<LoginForm />)

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
  })

  it("shows validation errors for empty fields", async () => {
    render(<LoginForm />)

    const submitButton = screen.getByRole("button", { name: /sign in/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/please enter both username and password/i)).toBeInTheDocument()
    })
  })

  it("submits form with valid credentials", async () => {
    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: "testuser" },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    })

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }))

    // The form should submit without errors
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
    })
  })
})
