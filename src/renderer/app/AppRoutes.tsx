import { Navigate, Route, Routes } from 'react-router-dom'
import CreatorPage from '../features/creator/CreatorPage'
import ConsumerPage from '../features/consumer/ConsumerPage'
import SettingsPage from '../features/settings/SettingsPage'
import AboutPage from '../features/about/AboutPage'

export default function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/creator" replace />} />
      <Route path="/creator" element={<CreatorPage />} />
      <Route path="/consumer" element={<ConsumerPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/about" element={<AboutPage />} />
    </Routes>
  )
}
