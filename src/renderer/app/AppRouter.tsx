import { HashRouter as Router } from 'react-router-dom'
import AppShell from './AppShell'

export default function AppRouter(): React.JSX.Element {
  return (
    <Router>
      <AppShell />
    </Router>
  )
}
