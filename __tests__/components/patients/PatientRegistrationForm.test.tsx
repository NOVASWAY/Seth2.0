import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { PatientRegistrationForm } from "@/components/patients/PatientRegistrationForm"
import jest from "jest" // Import jest to declare the variable

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock toast hook
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

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

  it("generates OP number automatically", () => {
    render(<PatientRegistrationForm />)

    const opNumberInput = screen.getByDisplayValue(/OP-\d{13}/)
    expect(opNumberInput).toBeInTheDocument()
  })

  it("submits form with patient data", async () => {
    const mockOnPatientRegistered = jest.fn()

    render(<PatientRegistrationForm onPatientRegistered={mockOnPatientRegistered} />)

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

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/patients",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining('"first_name":"John"'),
        }),
      )
    })

    await waitFor(() => {
      expect(mockOnPatientRegistered).toHaveBeenCalled()
    })
  })
})
