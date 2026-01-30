import { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

interface WrapperProps {
  children: ReactNode
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string
  path?: string
}

function AllProviders({ children }: WrapperProps) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}

export function renderWithRouter(
  ui: ReactElement,
  { route = '/', path = '/', ...renderOptions }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: WrapperProps) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <AllProviders>
          <Routes>
            <Route path={path} element={children} />
          </Routes>
        </AllProviders>
      </MemoryRouter>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

// Re-export useful testing utilities
export {
  screen,
  waitFor,
  fireEvent,
  within,
  act,
  cleanup,
} from '@testing-library/react'
