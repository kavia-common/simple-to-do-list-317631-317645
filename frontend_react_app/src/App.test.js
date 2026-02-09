import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders to-do header and add input", () => {
  render(<App />);
  expect(screen.getByText(/to-do/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/add a task/i)).toBeInTheDocument();
});
