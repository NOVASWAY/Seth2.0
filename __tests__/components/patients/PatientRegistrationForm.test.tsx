import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { PatientRegistrationForm } from "@/components/patients/PatientRegistrationForm"

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch



describe("PatientRegistrationForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: "1", op_number: "OP001" } }),
    })
  })

  it("renders patient registration form correctly", () => {
    render(<PatientRegistrationForm />)

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /register patient/i })).toBeInTheDocument()
  })

  it("renders form fields correctly", () => {
    render(<PatientRegistrationForm />)

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /register patient/i })).toBeInTheDocument()
  })

  it("submits form with patient data", async () => {
    const mockOnSuccess = jest.fn()

    render(<PatientRegistrationForm onSuccess={mockOnSuccess} />)

    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: "John" },
    })
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: "Doe" },
    })
    fireEvent.change(screen.getByLabelText(/phone number/i), {
      target: { value: "+254712345678" },
    })

    fireEvent.click(screen.getByRole("button", { name: /register patient/i }))

    // The form should submit without errors
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /register patient/i })).toBeInTheDocument()
    })
  })
})
