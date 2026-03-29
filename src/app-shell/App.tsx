import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { EncounterProvider } from '../encounter-state/EncounterProvider';
import BattleMapPage from './BattleMapPage';
import DMPage from './DMPage';

export default function App(): JSX.Element {
  return (
    <EncounterProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<BattleMapPage />} />
          <Route path="/dm" element={<DMPage />} />
        </Routes>
      </BrowserRouter>
    </EncounterProvider>
  );
}