import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { LoginForm } from "@/components/auth/LoginForm"
import jest from "jest" // Declare the jest variable

// Mock the auth context
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    login: jest.fn(),
    loading: false,
  }),
}))

// Mock toast hook
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
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
      expect(screen.getByText(/username is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it("submits form with valid credentials", async () => {
    const mockLogin = jest.fn().mockResolvedValue({ success: true })

    jest.mocked(require("@/lib/auth").useAuth).mockReturnValue({
      login: mockLogin,
      loading: false,
    })

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: "testuser" },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    })

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("testuser", "password123")
    })
  })
})
